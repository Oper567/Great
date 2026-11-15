"use server";

import prisma, { queryRawPg } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";
import { sanitizeErrorMessage, sanitizeMediaUrl, validateUploadedFile } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { AttemptGradingRow } from "@/types/cbt";
import { invalidateExamCache } from "@/lib/cbt-cache";
import { formatClassWithArm } from "@/lib/cbt-utils";

/**
 * Security Gatekeeper: Ensure teachers can ONLY access exams & questions for their assigned subject or created by them.
 */
async function isTeacherAuthorizedForExam(examId: number, session: any): Promise<boolean> {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN") return true;
  if (session.role !== "TEACHER") return false;

  const targetExam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!targetExam) return false;

  const assigned = session.assignedSubject?.trim() || "";
  if (!assigned || assigned.toLowerCase() === "all" || assigned.toLowerCase() === "all subjects") {
    return true;
  }

  if (session.email && targetExam.createdBy && targetExam.createdBy.toLowerCase() === session.email.toLowerCase()) {
    return true;
  }

  return (
    targetExam.subject.toLowerCase().includes(assigned.toLowerCase()) ||
    assigned.toLowerCase().includes(targetExam.subject.toLowerCase())
  );
}

/**
 * Super Admin & Teacher: Create a new exam
 */
export async function createExamAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  examId?: number;
  exam?: any;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const session = auth.session;

  const title = (formData.get("title") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const targetClass = (formData.get("targetClass") as string)?.trim();
  const examDateStr = (formData.get("examDate") as string)?.trim();
  const durationMinutes = parseInt((formData.get("durationMinutes") as string) || "60", 10);
  const hasTheory = formData.get("hasTheory") === "true" || formData.get("hasTheory") === "on";
  const isActive = formData.get("isActive") !== "false";

  if (!title || !subject || !targetClass || !examDateStr) {
    return { success: false, error: "Please provide exam title, subject, target class, and exam date." };
  }

  // Teacher subject restriction: Teachers can only create exams for their assigned subject
  if (session.role === "TEACHER") {
    const assigned = session.assignedSubject?.trim() || "";
    const isAll = !assigned || assigned.toLowerCase() === "all" || assigned.toLowerCase() === "all subjects";
    const isMatch = subject.toLowerCase().includes(assigned.toLowerCase()) || assigned.toLowerCase().includes(subject.toLowerCase());
    if (!isAll && !isMatch) {
      return { success: false, error: `Unauthorized: As a subject teacher, you can only create exams for your assigned subject (${assigned}).` };
    }
  }

  try {
    const examDate = new Date(examDateStr);
    let exam;
    const createdByEmail = session.email || null;

    try {
      exam = await prisma.exam.create({
        data: {
          title,
          subject,
          targetClass,
          examDate,
          durationMinutes: isNaN(durationMinutes) ? 60 : durationMinutes,
          hasTheory,
          isActive,
          createdBy: createdByEmail,
        },
      });
    } catch (createErr: any) {
      // If sequence error on id or P2002 occurs, resync exams_id_seq and retry
      if (createErr?.code === "P2002" || String(createErr).includes("id")) {
        console.warn("[createExamAction] Sequence collision detected on exams.id. Resyncing sequence...");
        await queryRawPg(`
          SELECT setval(pg_get_serial_sequence('"exams"', 'id'), COALESCE((SELECT MAX(id) FROM "exams"), 0) + 1, false);
        `).catch(() => {});
        exam = await prisma.exam.create({
          data: {
            title,
            subject,
            targetClass,
            examDate,
            durationMinutes: isNaN(durationMinutes) ? 60 : durationMinutes,
            hasTheory,
            isActive,
            createdBy: createdByEmail,
          },
        });
      } else {
        throw createErr;
      }
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return {
      success: true,
      examId: exam.id,
      exam: {
        ...exam,
        _count: {
          objectiveQuestions: 0,
          theoryQuestions: 0,
          attempts: 0,
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to create examination record.") };
  }
}

/**
 * Super Admin: Toggle Exam Active Status
 */
export async function toggleExamStatusAction(examId: number, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    if (auth.session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(examId, auth.session))) {
        return { success: false, error: "Unauthorized: You can only toggle exams belonging to your assigned subject." };
      }
    }

    await prisma.exam.update({
      where: { id: examId },
      data: { isActive },
    });
    invalidateExamCache(examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to update exam status.") };
  }
}

/**
 * Super Admin & Teacher: Add Objective Question
 */
export async function addObjectiveQuestionAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const session = auth.session;

  const examId = parseInt((formData.get("examId") as string) || "0", 10);
  const questionText = (formData.get("questionText") as string)?.trim();
  const optA = (formData.get("optA") as string)?.trim();
  const optB = (formData.get("optB") as string)?.trim();
  const optC = (formData.get("optC") as string)?.trim();
  const optD = (formData.get("optD") as string)?.trim();
  const correctAnswer = ((formData.get("correctAnswer") as string)?.trim() || "").toUpperCase();
  const points = parseFloat((formData.get("points") as string) || "0.5");
  const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
  const imageFile = formData.get("imageFile") as File | null;

  if (!examId || !questionText || !optA || !optB || !optC || !optD || !correctAnswer) {
    return { success: false, error: "All fields including 4 options and the correct answer key (A-D) are required." };
  }

  if (!["A", "B", "C", "D"].includes(correctAnswer)) {
    return { success: false, error: "Correct answer must be one of A, B, C, or D." };
  }

  if (session.role === "TEACHER" && !(await isTeacherAuthorizedForExam(examId, session))) {
    return { success: false, error: "Unauthorized: You can only upload questions to exams in your assigned subject." };
  }

  let finalImageUrl: string | null = sanitizeMediaUrl(rawImageUrl);
  if (imageFile && imageFile.size > 0) {
    const validated = await validateUploadedFile(imageFile, { allowPdf: false, maxBytes: 5 * 1024 * 1024 });
    if (!validated.ok) {
      return { success: false, error: validated.error };
    }
    finalImageUrl = validated.dataUrl;
  }

  try {
    const optionsJson = JSON.stringify([optA, optB, optC, optD]);

    await prisma.objectiveQuestion.create({
      data: {
        examId,
        questionText,
        options: optionsJson,
        correctAnswer,
        points: isNaN(points) || points <= 0 ? 0.5 : points,
        imageUrl: finalImageUrl,
      },
    });

    invalidateExamCache(examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    console.error("Add objective question error:", err);
    return { success: false, error: "Failed to save objective question." };
  }
}

/**
 * Super Admin & Teacher: Add Theory Question
 */
export async function addTheoryQuestionAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const session = auth.session;

  const examId = parseInt((formData.get("examId") as string) || "0", 10);
  const questionNum = parseInt((formData.get("questionNum") as string) || "1", 10);
  const questionText = (formData.get("questionText") as string)?.trim();
  const maxScore = parseInt((formData.get("maxScore") as string) || "10", 10);
  const instructions = (formData.get("instructions") as string)?.trim() || null;
  const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
  const imageFile = formData.get("imageFile") as File | null;

  if (!examId || !questionText) {
    return { success: false, error: "Question prompt and valid exam selection are required." };
  }

  if (session.role === "TEACHER" && !(await isTeacherAuthorizedForExam(examId, session))) {
    return { success: false, error: "Unauthorized: You can only upload theory questions to exams in your assigned subject." };
  }

  let finalImageUrl: string | null = sanitizeMediaUrl(rawImageUrl);
  if (imageFile && imageFile.size > 0) {
    const validated = await validateUploadedFile(imageFile, { allowPdf: false, maxBytes: 5 * 1024 * 1024 });
    if (!validated.ok) {
      return { success: false, error: validated.error };
    }
    finalImageUrl = validated.dataUrl;
  }

  try {
    await prisma.theoryQuestion.create({
      data: {
        examId,
        questionNum: isNaN(questionNum) ? 1 : questionNum,
        questionText,
        maxScore: isNaN(maxScore) ? 10 : maxScore,
        instructions,
        imageUrl: finalImageUrl,
      },
    });

    invalidateExamCache(examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    console.error("Add theory question error:", err);
    return { success: false, error: "Failed to save theory question." };
  }
}

/**
 * Super Admin & Teacher: Delete a Question
 */
export async function deleteQuestionAction(
  type: "objective" | "theory",
  questionId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    let parentExamId: number | null = null;
    if (type === "objective") {
      const q = await prisma.objectiveQuestion.findUnique({ where: { id: questionId } });
      parentExamId = q?.examId || null;
    } else {
      const q = await prisma.theoryQuestion.findUnique({ where: { id: questionId } });
      parentExamId = q?.examId || null;
    }

    if (session.role === "TEACHER") {
      if (!parentExamId || !(await isTeacherAuthorizedForExam(parentExamId, session))) {
        return { success: false, error: "Unauthorized: You cannot delete questions from another subject's exam." };
      }
    }

    if (type === "objective") {
      await prisma.objectiveQuestion.delete({ where: { id: questionId } });
    } else {
      await prisma.theoryQuestion.delete({ where: { id: questionId } });
    }

    if (parentExamId) invalidateExamCache(parentExamId);
    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to delete question.") };
  }
}

/**
 * Super Admin & Teacher: Update / Modify an Objective Question
 */
export async function updateObjectiveQuestionAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    const questionId = parseInt((formData.get("questionId") as string) || "0", 10);
    const examId = parseInt((formData.get("examId") as string) || "0", 10);
    const questionText = (formData.get("questionText") as string)?.trim();
    const optionA = (formData.get("optionA") as string)?.trim() ?? "";
    const optionB = (formData.get("optionB") as string)?.trim() ?? "";
    const optionC = (formData.get("optionC") as string)?.trim() ?? "";
    const optionD = (formData.get("optionD") as string)?.trim() ?? "";
    const correctAnswer = (formData.get("correctAnswer") as string)?.trim()?.toUpperCase() || "A";
    const pointsRaw = formData.get("points") as string;
    const parsedPoints = parseFloat(pointsRaw);
    const points = isNaN(parsedPoints) || parsedPoints <= 0 ? 0.5 : parsedPoints;
    const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
    const imageFile = formData.get("imageFile") as File | null;
    const removeImage = formData.get("removeImage") === "true";

    if (!questionId || !questionText) {
      return { success: false, error: "Question prompt and valid question ID are required." };
    }

    let effectiveExamId = examId;
    if (!effectiveExamId) {
      const existing = await prisma.objectiveQuestion.findUnique({ where: { id: questionId } });
      effectiveExamId = existing?.examId || 0;
    }

    if (session.role === "TEACHER") {
      if (!effectiveExamId || !(await isTeacherAuthorizedForExam(effectiveExamId, session))) {
        return { success: false, error: "Unauthorized: You can only edit questions in your assigned subject." };
      }
    }

    let finalImageUrl: string | null = removeImage ? null : sanitizeMediaUrl(rawImageUrl);
    if (imageFile && imageFile.size > 0) {
      const validated = await validateUploadedFile(imageFile, { allowPdf: false, maxBytes: 5 * 1024 * 1024 });
      if (!validated.ok) {
        return { success: false, error: validated.error };
      }
      finalImageUrl = validated.dataUrl;
    }

    await prisma.objectiveQuestion.update({
      where: { id: questionId },
      data: {
        questionText,
        options: JSON.stringify([optionA, optionB, optionC, optionD]),
        correctAnswer,
        points,
        imageUrl: finalImageUrl,
      },
    });

    if (effectiveExamId) invalidateExamCache(effectiveExamId);
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    revalidatePath("/staff");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to update objective question.") };
  }
}

/**
 * Super Admin & Teacher: Update / Modify a Theory Question
 */
export async function updateTheoryQuestionAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    const questionId = parseInt((formData.get("questionId") as string) || "0", 10);
    const examId = parseInt((formData.get("examId") as string) || "0", 10);
    const questionNum = parseInt((formData.get("questionNum") as string) || "1", 10);
    const questionText = (formData.get("questionText") as string)?.trim();
    const maxScore = parseInt((formData.get("maxScore") as string) || "10", 10);
    const instructions = (formData.get("instructions") as string)?.trim() || null;
    const rawImageUrl = (formData.get("imageUrl") as string)?.trim() || null;
    const imageFile = formData.get("imageFile") as File | null;
    const removeImage = formData.get("removeImage") === "true";

    if (!questionId || !questionText) {
      return { success: false, error: "Question prompt and valid question ID are required." };
    }

    let effectiveExamId = examId;
    if (!effectiveExamId) {
      const existing = await prisma.theoryQuestion.findUnique({ where: { id: questionId } });
      effectiveExamId = existing?.examId || 0;
    }

    if (session.role === "TEACHER") {
      if (!effectiveExamId || !(await isTeacherAuthorizedForExam(effectiveExamId, session))) {
        return { success: false, error: "Unauthorized: You can only edit questions in your assigned subject." };
      }
    }

    let finalImageUrl: string | null = removeImage ? null : sanitizeMediaUrl(rawImageUrl);
    if (imageFile && imageFile.size > 0) {
      const validated = await validateUploadedFile(imageFile, { allowPdf: false, maxBytes: 5 * 1024 * 1024 });
      if (!validated.ok) {
        return { success: false, error: validated.error };
      }
      finalImageUrl = validated.dataUrl;
    }

    await prisma.theoryQuestion.update({
      where: { id: questionId },
      data: {
        questionNum: isNaN(questionNum) ? 1 : questionNum,
        questionText,
        maxScore: isNaN(maxScore) ? 10 : maxScore,
        instructions,
        imageUrl: finalImageUrl,
      },
    });

    if (effectiveExamId) invalidateExamCache(effectiveExamId);
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    revalidatePath("/staff");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to update theory question.") };
  }
}

/**
 * Super Admin & Teacher: Safely Delete an Examination Paper / Course
 * - If students have already written the course (attempts exist), safely soft-delete / archive
 *   so it is removed from the CBT active exam page without deleting student gradings!
 * - If no students have written it, clean deletion is performed.
 */
export async function deleteExamAction(
  examId: number,
  forcePermanent = false
): Promise<{ success: boolean; error?: string; isArchived?: boolean; message?: string }> {
  try {
    if (!examId) {
      return { success: false, error: "Valid exam ID is required." };
    }

    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    if (session.role === "TEACHER") {
      if (forcePermanent) {
        return { success: false, error: "Forbidden: Only Super Admins can permanently purge an exam with attempts." };
      }
      if (!(await isTeacherAuthorizedForExam(examId, session))) {
        return { success: false, error: "Unauthorized: You can only delete examination courses belonging to your assigned subject." };
      }
    }

    // Auto-heal column if not already present
    await queryRawPg('ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false').catch(() => {});

    // Check if any student attempts / gradings exist for this exam
    let attemptsCount = 0;
    try {
      const rows = await queryRawPg("SELECT COUNT(*)::int as cnt FROM exam_attempts WHERE exam_id = $1", [examId]);
      attemptsCount = parseInt(rows[0]?.cnt, 10) || 0;
    } catch {
      attemptsCount = await prisma.examAttempt.count({ where: { examId } }).catch(() => 0);
    }

    // If students have written this course, safely archive it to remove it from the CBT page without losing student gradings!
    if (attemptsCount > 0 && !forcePermanent) {
      await prisma.exam.update({
        where: { id: examId },
        data: {
          isArchived: true,
          isActive: false,
        },
      });

      invalidateExamCache(examId);
      revalidatePath("/admin/cbt");
      revalidatePath("/cbt/dashboard");
      revalidatePath("/cbt");
      revalidatePath("/staff");

      return {
        success: true,
        isArchived: true,
        message: `Course safely removed from active CBT page. All ${attemptsCount} student grading(s) and results remain preserved!`,
      };
    }

    // If zero student attempts OR admin explicitly requested permanent deletion (e.g. from Safely Removed Courses)
    if (attemptsCount === 0 || forcePermanent) {
      await prisma.objectiveQuestion.deleteMany({ where: { examId } }).catch(() => {});
      await prisma.theoryQuestion.deleteMany({ where: { examId } }).catch(() => {});
      await prisma.examAttempt.deleteMany({ where: { examId } }).catch(() => {});
      await prisma.exam.delete({ where: { id: examId } });
    } else {
      await prisma.exam.update({
        where: { id: examId },
        data: {
          isArchived: true,
          isActive: false,
        },
      });
    }

    invalidateExamCache(examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    revalidatePath("/cbt");
    revalidatePath("/staff");
    return {
      success: true,
      isArchived: !forcePermanent && attemptsCount > 0,
      message: forcePermanent
        ? "Course and all associated questions/attempts permanently deleted."
        : undefined,
    };
  } catch (err: any) {
    console.error("Delete exam error:", err);
    return { success: false, error: err?.message || "Failed to delete examination course." };
  }
}

/**
 * Super Admin: Restore an Archived Examination Paper
 */
export async function restoreArchivedExamAction(examId: number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!examId) return { success: false, error: "Valid exam ID required." };
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) return { success: false, error: auth.error };
    const session = auth.session;

    if (session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(examId, session))) {
        return { success: false, error: "Unauthorized: You can only restore your assigned subject's exam." };
      }
    }
    await prisma.exam.update({
      where: { id: examId },
      data: {
        isArchived: false,
        isActive: true,
      },
    });
    invalidateExamCache(examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    revalidatePath("/staff");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to restore course.") };
  }
}

/**
 * Super Admin & Teacher: Clear All Questions for an Exam Paper
 */
export async function clearAllExamQuestionsAction(examId: number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!examId) {
      return { success: false, error: "Valid exam ID is required." };
    }

    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) return { success: false, error: auth.error };
    const session = auth.session;

    if (session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(examId, session))) {
        return { success: false, error: "Unauthorized: You can only clear questions from your assigned subject's exam." };
      }
    }

    await prisma.objectiveQuestion.deleteMany({ where: { examId } });
    await prisma.theoryQuestion.deleteMany({ where: { examId } });

    invalidateExamCache(examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to clear questions for this exam.") };
  }
}

/**
 * Super Admin & Teacher: Fetch all Exams with stats
 * - If user is a TEACHER, strictly filters to only exams matching their assigned subject or created by them
 * - If user is SUPER_ADMIN, returns all exams
 */
export async function getAllAdminExamsAction() {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, exams: [], error: auth.error };
    }
    const session = auth.session;
    let whereClause: any = undefined;

    if (session.role === "TEACHER") {
      const teacherEmail = (session.email || "").trim();
      if (!teacherEmail) {
        return { success: true, exams: [] };
      }
      whereClause = {
        createdBy: { equals: teacherEmail, mode: "insensitive" },
      };
    }

    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            objectiveQuestions: true,
            theoryQuestions: true,
            attempts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, exams };
  } catch (err) {
    console.error("Fetch admin exams error:", err);
    return { success: false, exams: [] };
  }
}

/**
 * Super Admin & Teacher: Fetch specific Exam with questions for preview/management
 * - Protects against question leakage: Teachers can only inspect questions for their assigned subject
 */
export async function getAdminExamWithQuestionsAction(examId: number) {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, exam: null, error: auth.error };
    }
    const session = auth.session;

    // Gatekeeper: prevent question and answer key leakage across teachers
    if (session.role === "TEACHER") {
      const isAuth = await isTeacherAuthorizedForExam(examId, session);
      if (!isAuth) {
        return {
          success: false,
          exam: null,
          error: "Access Denied: Subject teachers are restricted to viewing and managing questions for their assigned subject only.",
        };
      }
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        objectiveQuestions: { orderBy: { id: "asc" } },
        theoryQuestions: { orderBy: { questionNum: "asc" } },
      },
    });
    return { success: true, exam };
  } catch (err: any) {
    console.error("Get exam with questions error:", err);
    // If column image_url is missing, auto-heal and retry
    if (err?.code === "P2022" || String(err).includes("image_url") || String(err).includes("does not exist")) {
      try {
        console.warn("[getAdminExamWithQuestionsAction] Auto-healing image_url columns and retrying...");
        await queryRawPg(`
          ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
          ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
        `).catch(() => {});
        const exam = await prisma.exam.findUnique({
          where: { id: examId },
          include: {
            objectiveQuestions: { orderBy: { id: "asc" } },
            theoryQuestions: { orderBy: { questionNum: "asc" } },
          },
        });
        return { success: true, exam };
      } catch (retryErr) {
        console.error("Retry get exam with questions error:", retryErr);
      }
    }
    return { success: false, exam: null };
  }
}

/**
 * Super Admin Physical Grading & Live Power-Off Recovery Desk:
 * Fetch all ExamAttempt records (both completed and in-progress/interrupted) for a selected Exam.
 */
export async function getExamGradingAttemptsAction(examId: number): Promise<{
  success: boolean;
  error?: string;
  attempts: AttemptGradingRow[];
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error, attempts: [] };
    }
    if (auth.session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(examId, auth.session))) {
        return { success: false, error: "Unauthorized for this subject.", attempts: [] };
      }
    }

    const [attempts, questions] = await Promise.all([
      prisma.examAttempt.findMany({
        where: {
          examId,
        },
        include: {
          student: true,
        },
        orderBy: [{ isCompleted: "asc" }, { submittedAt: "desc" }, { startedAt: "desc" }],
      }),
      prisma.objectiveQuestion.findMany({
        where: { examId },
        select: { id: true, correctAnswer: true, points: true },
      }),
    ]);

    const answerKey = new Map<number, { correct: string; points: number }>();
    for (const q of questions) {
      answerKey.set(q.id, {
        correct: (q.correctAnswer || "").trim().toUpperCase(),
        points: q.points != null ? Number(q.points) : 0.5,
      });
    }

    const rows: AttemptGradingRow[] = attempts.map((att: any) => {
      let answeredCount = 0;
      let remainingSeconds: number | null = null;
      let lastSavedAt: string | null = null;
      let liveObjScore = att.objectiveScore ?? 0;

      if (att.studentAnswers) {
        try {
          const parsed = JSON.parse(att.studentAnswers);
          if (parsed && typeof parsed === "object") {
            let calcLive = 0;
            for (const [k, v] of Object.entries(parsed)) {
              if (k === "__meta_remainingSec" && typeof v === "number") {
                remainingSeconds = v;
              } else if (k === "__meta_heartbeatMs" && typeof v === "number") {
                lastSavedAt = new Date(v).toISOString();
              } else if (!k.startsWith("__meta_") && typeof v === "string" && v.trim()) {
                answeredCount++;
                const qInfo = answerKey.get(Number(k));
                if (qInfo && v.trim().toUpperCase() === qInfo.correct) {
                  calcLive += qInfo.points;
                }
              }
            }
            if (!att.isCompleted) {
              liveObjScore = calcLive;
            }
          }
        } catch {
          // ignore
        }
      }

      const theoryScore = att.theoryScore ?? 0;
      const totalScore = att.isCompleted ? (att.totalScore ?? liveObjScore + theoryScore) : liveObjScore + theoryScore;

      return {
        id: att.id,
        studentId: att.studentId,
        studentAdmNo: att.student?.admNo || "Unknown",
        studentFullName: att.student?.fullName || "Student",
        studentClass: formatClassWithArm(att.student?.currentClass || "SS", (att.student as any)?.arm),
        studentArm: (att.student as any)?.arm || "",
        examId: att.examId,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        isCompleted: Boolean(att.isCompleted),
        objectiveScore: liveObjScore,
        theoryScore,
        totalScore,
        answeredCount,
        remainingSeconds,
        lastSavedAt,
      };
    });

    return { success: true, attempts: rows };
  } catch (err) {
    console.error("Get exam grading attempts error:", err);
    return { success: false, error: "Failed to load submitted attempts.", attempts: [] };
  }
}

/**
 * Super Admin Physical Grading Desk:
 * Inline number input for Theory Score. When the admin saves the theory score,
 * trigger a Server Action that updates the attempt, sets totalScore = objectiveScore + theoryScore,
 * and saves to the DB.
 */
export async function saveTheoryScoreAction(
  attemptId: number,
  theoryScore: number
): Promise<{
  success: boolean;
  error?: string;
  updatedAttempt?: {
    id: number;
    objectiveScore: number;
    theoryScore: number;
    totalScore: number;
  };
}> {
  if (isNaN(theoryScore) || theoryScore < 0) {
    return { success: false, error: "Theory score must be a valid positive number or zero." };
  }

  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      return { success: false, error: "Exam attempt record not found." };
    }

    if (auth.session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(attempt.examId, auth.session))) {
        return { success: false, error: "Unauthorized for this subject." };
      }
    }

    const totalScore = attempt.objectiveScore + theoryScore;

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        theoryScore,
        totalScore,
      },
    });

    revalidatePath("/admin/cbt");
    return {
      success: true,
      updatedAttempt: {
        id: updated.id,
        objectiveScore: updated.objectiveScore,
        theoryScore: updated.theoryScore ?? 0,
        totalScore: updated.totalScore,
      },
    };
  } catch (err) {
    console.error("Save theory score error:", err);
    return { success: false, error: "Failed to save theory score." };
  }
}

/**
 * Super Admin Physical Grading Desk:
 * Clear all completed ExamAttempts for an exam.
 */
export async function clearExamAttemptsAction(examId: number): Promise<{
  success: boolean;
  error?: string;
  count?: number;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const deleted = await prisma.examAttempt.deleteMany({
      where: { examId },
    });
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    return { success: true, count: deleted.count };
  } catch (err) {
    console.error("Clear exam attempts error:", err);
    return { success: false, error: "Failed to clear student attempts." };
  }
}

/**
 * Super Admin Physical Grading Desk:
 * Delete a single student ExamAttempt.
 */
export async function deleteExamAttemptAction(attemptId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    await prisma.examAttempt.delete({
      where: { id: attemptId },
    });
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Delete exam attempt error:", err);
    return { success: false, error: "Failed to delete student attempt." };
  }
}

/**
 * Super Admin: Update Exam details (Time/Duration, Subject, Class, Title, etc.)
 */
export async function updateExamAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  exam?: any;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    const examId = parseInt((formData.get("examId") as string) || "0", 10);
    const title = (formData.get("title") as string)?.trim();
    const subject = (formData.get("subject") as string)?.trim();
    const targetClass = (formData.get("targetClass") as string)?.trim();
    const durationMinutes = parseInt((formData.get("durationMinutes") as string) || "60", 10);
    const hasTheory = formData.get("hasTheory") === "true" || formData.get("hasTheory") === "on";
    const isActive = formData.get("isActive") !== "false";

    if (!examId || !title || !subject || !targetClass) {
      return { success: false, error: "Exam ID, Title, Subject, and Class are required." };
    }

    if (isNaN(durationMinutes) || durationMinutes < 1) {
      return { success: false, error: "Duration must be at least 1 minute." };
    }

    if (session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(examId, session))) {
        return { success: false, error: "Unauthorized: You can only edit exams in your assigned subject/class." };
      }
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: {
        title,
        subject,
        targetClass,
        durationMinutes,
        hasTheory,
        isActive,
      },
    });

    // Reset start time on any uncompleted attempts so active/resuming students receive the updated duration accurately
    await prisma.examAttempt.updateMany({
      where: { examId, isCompleted: false },
      data: { startedAt: new Date() },
    }).catch(() => {});

    invalidateExamCache(examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    revalidatePath("/staff");

    return { success: true, exam: updated };
  } catch (err: any) {
    console.error("Update exam action error:", err);
    return { success: false, error: sanitizeErrorMessage(err, "Failed to update exam details.") };
  }
}

/**
 * Super Admin: Quick Update Exam Duration (Allocated Time in Minutes)
 */
export async function updateExamDurationAction(
  examId: number,
  durationMinutes: number
): Promise<{
  success: boolean;
  error?: string;
  durationMinutes?: number;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    if (!examId || isNaN(durationMinutes) || durationMinutes < 1) {
      return { success: false, error: "Invalid duration or exam ID." };
    }

    if (session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(examId, session))) {
        return { success: false, error: "Unauthorized." };
      }
    }

    const updated = await prisma.exam.update({
      where: { id: examId },
      data: { durationMinutes: Math.round(durationMinutes) },
    });

    // Reset start time on any uncompleted attempts so active/resuming students receive the updated duration accurately
    await prisma.examAttempt.updateMany({
      where: { examId, isCompleted: false },
      data: { startedAt: new Date() },
    }).catch(() => {});

    invalidateExamCache(examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    revalidatePath("/staff");

    return { success: true, durationMinutes: updated.durationMinutes };
  } catch (err: any) {
    console.error("Update exam duration error:", err);
    return { success: false, error: sanitizeErrorMessage(err, "Failed to update duration.") };
  }
}

/**
 * Super Admin & Teacher Power-Off Recovery Action:
 * Re-open a student's completed or interrupted ExamAttempt while keeping all their saved answers,
 * granting them additional minutes (default +15m) so they can log back in and resume smoothly.
 */
export async function reopenStudentExamAttemptAction(
  attemptId: number,
  extraMinutes = 15
): Promise<{
  success: boolean;
  error?: string;
  remainingSeconds?: number;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });
    if (!attempt) {
      return { success: false, error: "Exam attempt not found." };
    }

    if (session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(attempt.examId, session))) {
        return { success: false, error: "Unauthorized for this subject." };
      }
    }

    const durationSec = Math.max(1, Number(attempt.exam?.durationMinutes) || 60) * 60;
    const extraSec = Math.max(5, Number(extraMinutes) || 15) * 60;

    let parsedAnswers: Record<string, any> = {};
    try {
      parsedAnswers = JSON.parse(attempt.studentAnswers || "{}");
    } catch {
      parsedAnswers = {};
    }

    const existingRem =
      typeof parsedAnswers.__meta_remainingSec === "number" && parsedAnswers.__meta_remainingSec > 0
        ? parsedAnswers.__meta_remainingSec
        : 0;

    const newRemainingSec = Math.min(durationSec, Math.max(extraSec, existingRem + extraSec));
    const nowMs = Date.now();
    parsedAnswers.__meta_remainingSec = newRemainingSec;
    parsedAnswers.__meta_heartbeatMs = nowMs;

    const adjustedStartedAt = new Date(nowMs - Math.max(0, durationSec - newRemainingSec) * 1000);

    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isCompleted: false,
        submittedAt: null,
        teacherComment: null,
        startedAt: adjustedStartedAt,
        studentAnswers: JSON.stringify(parsedAnswers),
      },
    });

    invalidateExamCache(attempt.examId);
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    revalidatePath(`/cbt/exam/${attempt.examId}`);

    return { success: true, remainingSeconds: newRemainingSec };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to re-open student exam attempt.") };
  }
}

/**
 * Super Admin & Teacher Power-Off Recovery Action:
 * Force-grade and submit an interrupted/unsubmitted attempt using the student's auto-saved answers.
 */
export async function forceSubmitInterruptedAttemptAction(
  attemptId: number
): Promise<{
  success: boolean;
  error?: string;
  objectiveScore?: number;
  totalScore?: number;
  answeredCount?: number;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) {
      return { success: false, error: "Exam attempt not found." };
    }

    if (session.role === "TEACHER") {
      if (!(await isTeacherAuthorizedForExam(attempt.examId, session))) {
        return { success: false, error: "Unauthorized for this subject." };
      }
    }

    const questions = await prisma.objectiveQuestion.findMany({
      where: { examId: attempt.examId },
      select: { id: true, correctAnswer: true, points: true },
    });

    let parsedAnswers: Record<string, any> = {};
    try {
      parsedAnswers = JSON.parse(attempt.studentAnswers || "{}");
    } catch {
      parsedAnswers = {};
    }

    let calculatedScore = 0;
    let answeredCount = 0;
    for (const q of questions) {
      const ans = String(parsedAnswers[String(q.id)] || "").trim().toUpperCase();
      if (ans) {
        answeredCount++;
        const pts = q.points != null ? Number(q.points) : 0.5;
        if (ans === (q.correctAnswer || "").trim().toUpperCase()) {
          calculatedScore += pts;
        }
      }
    }

    const theoryScore = attempt.theoryScore ?? 0;
    const totalScore = calculatedScore + theoryScore;

    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        objectiveScore: calculatedScore,
        totalScore,
        teacherComment: "[ADMIN RECOVERY]: Auto-saved progress finalized and graded by administrator after power/system interruption.",
      },
    });

    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");
    return {
      success: true,
      objectiveScore: calculatedScore,
      totalScore,
      answeredCount,
    };
  } catch (err: any) {
    return { success: false, error: sanitizeErrorMessage(err, "Failed to finalize interrupted attempt.") };
  }
}


