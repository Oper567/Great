"use server";

import prisma, { queryRawPg } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/session";
import { sanitizeErrorMessage, sanitizeMediaUrl, validateUploadedFile } from "@/lib/security";

export interface ManualQuestionItem {
  questionText: string;
  options: string[]; // ["Option A", "Option B", "Option C", "Option D"]
  correctAnswer: string; // "A" | "B" | "C" | "D"
  points: number;
  imageUrl?: string | null;
  questionType?: "objective" | "theory";
  maxScore?: number;
  instructions?: string;
}

/**
 * Teacher: Save Question Draft or Submit Final Question Paper
 */
export async function submitTeacherQuestionsAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  submissionId?: number;
  isDraft?: boolean;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const session = auth.session;

  const teacherName =
    session.role === "TEACHER"
      ? session.fullName || "Class Teacher"
      : (formData.get("teacherName") as string)?.trim() || session.fullName || "Class Teacher";
  const teacherEmail =
    session.role === "TEACHER"
      ? session.email
      : (formData.get("teacherEmail") as string)?.trim() || session.email;
  const subject = (formData.get("subject") as string)?.trim();
  const targetClass = (formData.get("targetClass") as string)?.trim() || "SS 1";
  const submissionType = ((formData.get("submissionType") as string)?.trim().toUpperCase() || "MANUAL") as "MANUAL" | "IMAGE" | "PDF";
  const durationMinutes = Math.max(parseInt((formData.get("durationMinutes") as string) || "60", 10), 10);
  const totalMarks = Math.max(parseInt((formData.get("totalMarks") as string) || "100", 10), 1);
  const instructions = (formData.get("instructions") as string)?.trim() || null;
  const rawQuestionsJson = formData.get("questionsJson") as string;
  const imageFile = formData.get("imageFile") as File | null;
  const existingImageUrl = (formData.get("imageUrl") as string)?.trim();
  const isDraft = formData.get("isDraft") === "true";
  const draftIdRaw = formData.get("draftId") as string;
  const draftId = draftIdRaw ? parseInt(draftIdRaw, 10) : undefined;

  if (!subject) {
    return { success: false, error: "Subject is required to save or submit questions." };
  }

  // If final submission (not draft), validate targetClass and questions
  if (!isDraft) {
    if (!targetClass) {
      return { success: false, error: "Target Class is required for final submission." };
    }
  }

  const allowPdfUpload = submissionType === "PDF";
  let finalImageUrl: string | null = sanitizeMediaUrl(existingImageUrl, { allowPdf: allowPdfUpload });

  // Strictly validate uploaded file magic bytes and size (blocks SVG/HTML stored XSS)
  if ((submissionType === "IMAGE" || submissionType === "PDF") && imageFile && imageFile.size > 0) {
    const validated = await validateUploadedFile(imageFile, {
      allowPdf: allowPdfUpload,
      maxBytes: 8 * 1024 * 1024,
    });
    if (!validated.ok) {
      return { success: false, error: validated.error };
    }
    finalImageUrl = validated.dataUrl;
  }

  if (!isDraft) {
    if ((submissionType === "IMAGE" || submissionType === "PDF") && !finalImageUrl) {
      return { success: false, error: "Please select an image or PDF file of your question paper." };
    }
    if (submissionType === "MANUAL" && !rawQuestionsJson) {
      return { success: false, error: "Please add at least one question to your manual submission." };
    }
  }

  try {
    // Auto-heal table if not created yet
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "teacher_question_submissions" (
        "id" SERIAL PRIMARY KEY,
        "teacher_name" TEXT NOT NULL,
        "teacher_email" TEXT,
        "subject" TEXT NOT NULL,
        "target_class" TEXT NOT NULL,
        "submission_type" TEXT NOT NULL DEFAULT 'MANUAL',
        "duration_minutes" INTEGER NOT NULL DEFAULT 60,
        "total_marks" INTEGER NOT NULL DEFAULT 100,
        "question_data" TEXT,
        "image_url" TEXT,
        "instructions" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "admin_feedback" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    const targetStatus = isDraft ? "DRAFT" : "PENDING";
    let finalSubmissionId = draftId;

    if (draftId && !isNaN(draftId)) {
      const existing = await prisma.teacherQuestionSubmission.findUnique({ where: { id: draftId } });
      if (!existing) {
        return { success: false, error: "Question submission not found." };
      }
      if (
        session.role === "TEACHER" &&
        (!existing.teacherEmail || existing.teacherEmail.toLowerCase() !== session.email.toLowerCase())
      ) {
        return { success: false, error: "Unauthorized: You can only edit your own question drafts." };
      }

      await prisma.teacherQuestionSubmission.update({
        where: { id: draftId },
        data: {
          teacherName,
          teacherEmail,
          subject,
          targetClass,
          submissionType,
          durationMinutes,
          totalMarks,
          questionData: submissionType === "MANUAL" ? (rawQuestionsJson || existing?.questionData || null) : null,
          imageUrl: finalImageUrl,
          instructions,
          status: targetStatus,
        },
      });
    } else {
      const record = await prisma.teacherQuestionSubmission.create({
        data: {
          teacherName,
          teacherEmail,
          subject,
          targetClass,
          submissionType,
          durationMinutes,
          totalMarks,
          questionData: submissionType === "MANUAL" ? (rawQuestionsJson || null) : null,
          imageUrl: finalImageUrl,
          instructions,
          status: targetStatus,
        },
      });
      finalSubmissionId = record.id;
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return { success: true, submissionId: finalSubmissionId, isDraft };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to save teacher questions.") };
  }
}

/**
 * Super Admin & Teacher: Fetch question submissions
 * - If user is a TEACHER, strictly restrict to their own submissions for privacy
 * - If user is SUPER_ADMIN, show all or filtered by status
 */
export async function getTeacherSubmissionsAction(statusFilter?: string, teacherEmail?: string): Promise<{
  success: boolean;
  error?: string;
  submissions: any[];
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error, submissions: [] };
    }
    const session = auth.session;

    // Enforce teacher privacy: a TEACHER can NEVER view submissions belonging to other teachers!
    let effectiveEmail = session.role === "TEACHER" ? session.email : teacherEmail;

    const whereObj: any = {};
    if (statusFilter && statusFilter !== "ALL") {
      whereObj.status = statusFilter;
    }
    if (effectiveEmail) {
      whereObj.teacherEmail = effectiveEmail;
    }

    const submissions = await prisma.teacherQuestionSubmission.findMany({
      where: Object.keys(whereObj).length > 0 ? whereObj : undefined,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, submissions };
  } catch (err: any) {
    console.error("Get teacher submissions error:", err);
    return { success: false, error: "Failed to load teacher submissions.", submissions: [] };
  }
}

/**
 * Super Admin: Review Submission (Approve, Reject, provide feedback)
 */
export async function reviewTeacherSubmissionAction(
  submissionId: number,
  status: "APPROVED" | "REJECTED" | "PENDING",
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    await prisma.teacherQuestionSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        adminFeedback: feedback || null,
      },
    });

    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return { success: true };
  } catch (err: any) {
    console.error("Review submission error:", err);
    return { success: false, error: "Failed to update submission review status." };
  }
}

/**
 * Super Admin: 1-Click Convert an Approved Manual Submission into a live CBT Exam
 */
export async function convertTeacherSubmissionToCbtExamAction(submissionId: number): Promise<{
  success: boolean;
  error?: string;
  examId?: number;
  exam?: any;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const submission = await prisma.teacherQuestionSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return { success: false, error: "Submission not found." };
    }

    if (submission.status === "DRAFT") {
      return {
        success: false,
        error: "This paper is currently saved as a DRAFT by the teacher and has not been finalized or submitted yet.",
      };
    }

    // Parse manual questions if present
    let parsedQuestions: ManualQuestionItem[] = [];
    if (submission.questionData) {
      try {
        parsedQuestions = JSON.parse(submission.questionData);
      } catch (err) {
        console.error("Error parsing submission question data:", err);
      }
    }

    const hasAnyTheory = parsedQuestions.some((q) => q.questionType === "theory");

    // Auto-heal column if not migrated yet (run individually to adhere to PostgreSQL extended query protocol)
    await queryRawPg('ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "created_by" TEXT').catch(() => {});
    await queryRawPg('ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT').catch(() => {});
    await queryRawPg('ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT').catch(() => {});

    // Create the exam - linked to teacher who created/uploaded it
    const exam = await prisma.exam.create({
      data: {
        title: `${submission.subject} (${submission.targetClass}) Examination`,
        subject: submission.subject,
        targetClass: submission.targetClass,
        examDate: new Date(),
        durationMinutes: submission.durationMinutes || 60,
        hasTheory: hasAnyTheory,
        isActive: true,
        createdBy: submission.teacherEmail || null,
      },
    });

    // Populate questions
    let theoryCounter = 1;
    for (const q of parsedQuestions) {
      if (q.questionType === "theory") {
        await prisma.theoryQuestion.create({
          data: {
            examId: exam.id,
            questionNum: theoryCounter++,
            questionText: q.questionText,
            maxScore: q.maxScore || q.points || 10,
            instructions: q.instructions || null,
            imageUrl: q.imageUrl || null,
          },
        });
      } else {
        await prisma.objectiveQuestion.create({
          data: {
            examId: exam.id,
            questionText: q.questionText,
            options: JSON.stringify(q.options || []),
            correctAnswer: q.correctAnswer || "A",
            points: q.points != null ? Number(q.points) : 0.5,
            imageUrl: q.imageUrl || null,
          },
        });
      }
    }

    // Mark submission as APPROVED
    await prisma.teacherQuestionSubmission.update({
      where: { id: submissionId },
      data: {
        status: "APPROVED",
        adminFeedback: `Converted into live CBT Exam ID #${exam.id}`,
      },
    });

    const objCount = parsedQuestions.filter((q) => q.questionType !== "theory").length;
    const theoryCount = parsedQuestions.filter((q) => q.questionType === "theory").length;

    const fullExam = {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      targetClass: exam.targetClass,
      examDate: exam.examDate,
      durationMinutes: exam.durationMinutes,
      isActive: exam.isActive,
      hasTheory: exam.hasTheory,
      createdBy: exam.createdBy,
      _count: {
        objectiveQuestions: objCount,
        theoryQuestions: theoryCount,
        attempts: 0,
      },
    };

    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    revalidatePath("/staff");
    return { success: true, examId: exam.id, exam: fullExam };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to convert submission to CBT exam.") };
  }
}

/**
 * Super Admin & Teacher: Delete Question Submission / Draft
 */
export async function deleteTeacherSubmissionAction(submissionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    if (session.role === "TEACHER") {
      const sub = await prisma.teacherQuestionSubmission.findUnique({ where: { id: submissionId } });
      if (!sub) {
        return { success: false, error: "Submission not found." };
      }
      if (!sub.teacherEmail || sub.teacherEmail.toLowerCase() !== session.email.toLowerCase()) {
        return { success: false, error: "Unauthorized: You can only delete your own question drafts and submissions." };
      }
    }

    await prisma.teacherQuestionSubmission.delete({
      where: { id: submissionId },
    });
    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return { success: true };
  } catch (err: any) {
    console.error("Delete teacher submission error:", err);
    return { success: false, error: "Failed to delete question submission." };
  }
}

/**
 * Super Admin: Modify / Correct Questions, Time & Marks in a Teacher Submission
 */
export async function updateTeacherSubmissionQuestionsAction(
  submissionId: number,
  questions: ManualQuestionItem[],
  durationMinutes?: number,
  totalMarks?: number
): Promise<{
  success: boolean;
  error?: string;
  updatedQuestions?: ManualQuestionItem[];
  durationMinutes?: number;
  totalMarks?: number;
}> {
  try {
    if (!submissionId) {
      return { success: false, error: "Valid submission ID is required." };
    }
    if (!Array.isArray(questions)) {
      return { success: false, error: "Questions must be provided as an array." };
    }

    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    if (session.role === "TEACHER") {
      const sub = await prisma.teacherQuestionSubmission.findUnique({ where: { id: submissionId } });
      if (!sub) {
        return { success: false, error: "Submission not found." };
      }
      if (!sub.teacherEmail || sub.teacherEmail.toLowerCase() !== session.email.toLowerCase()) {
        return { success: false, error: "Unauthorized: You can only edit questions in your own drafts." };
      }
    }

    // Sanitize question items to ensure valid points and safe image URLs
    const sanitized = questions.map((q) => ({
      ...q,
      imageUrl: sanitizeMediaUrl(q.imageUrl),
      points: q.points != null ? Number(q.points) : (q.questionType === "theory" ? 10 : 0.5),
      maxScore: q.maxScore != null ? Number(q.maxScore) : (q.questionType === "theory" ? 10 : undefined),
    }));

    const jsonString = JSON.stringify(sanitized);

    const updatePayload: any = {
      questionData: jsonString,
    };

    if (typeof durationMinutes === "number" && !isNaN(durationMinutes) && durationMinutes > 0) {
      updatePayload.durationMinutes = Math.round(durationMinutes);
    }
    if (typeof totalMarks === "number" && !isNaN(totalMarks) && totalMarks > 0) {
      updatePayload.totalMarks = Math.round(totalMarks);
    }

    const updated = await prisma.teacherQuestionSubmission.update({
      where: { id: submissionId },
      data: updatePayload,
    });

    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return {
      success: true,
      updatedQuestions: sanitized,
      durationMinutes: updated.durationMinutes,
      totalMarks: updated.totalMarks,
    };
  } catch (err: any) {
    console.error("Update teacher submission questions error:", err);
    return { success: false, error: err?.message || "Failed to update questions." };
  }
}

/**
 * Super Admin: Quick Update Allocated Time (Mins) & Total Marks for Any Question Submission
 */
export async function updateTeacherSubmissionMetadataAction(
  submissionId: number,
  durationMinutes: number,
  totalMarks: number
): Promise<{
  success: boolean;
  error?: string;
  durationMinutes?: number;
  totalMarks?: number;
}> {
  try {
    if (!submissionId) {
      return { success: false, error: "Valid submission ID is required." };
    }

    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    if (auth.session.role === "TEACHER") {
      const sub = await prisma.teacherQuestionSubmission.findUnique({ where: { id: submissionId } });
      if (!sub || !sub.teacherEmail || sub.teacherEmail.toLowerCase() !== auth.session.email.toLowerCase()) {
        return { success: false, error: "Unauthorized: You can only modify your own submission metadata." };
      }
    }

    const parsedDuration = parseInt(String(durationMinutes), 10);
    const parsedMarks = parseInt(String(totalMarks), 10);

    if (isNaN(parsedDuration) || parsedDuration < 1) {
      return { success: false, error: "Duration must be at least 1 minute." };
    }
    if (isNaN(parsedMarks) || parsedMarks < 1) {
      return { success: false, error: "Total marks must be at least 1." };
    }

    const updated = await prisma.teacherQuestionSubmission.update({
      where: { id: submissionId },
      data: {
        durationMinutes: parsedDuration,
        totalMarks: parsedMarks,
      },
    });

    revalidatePath("/admin/cbt");
    revalidatePath("/staff");

    return {
      success: true,
      durationMinutes: updated.durationMinutes,
      totalMarks: updated.totalMarks,
    };
  } catch (err: any) {
    console.error("Update teacher submission metadata error:", err);
    return { success: false, error: err?.message || "Failed to update time and marks." };
  }
}


