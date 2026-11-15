"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/session";
import { sanitizeErrorMessage } from "@/lib/security";
import {
  doesTeacherMatchExam,
  formatClassWithArm,
  isAttemptAwaitingTheory,
  parseStudentAnswersPayload,
} from "@/lib/cbt-utils";

export interface TeacherGradingRow {
  id: number;
  studentId: number;
  studentAdmNo: string;
  studentFullName: string;
  studentClass: string;
  examId: number;
  examTitle: string;
  examSubject: string;
  targetClass: string;
  examCreatedBy?: string | null;
  hasTheory: boolean;
  objectiveScore: number;
  theoryScore: number | null;
  totalScore: number;
  isCompleted: boolean;
  startedAt?: Date | null;
  submittedAt: Date | null;
  answeredCount?: number;
  flaggedQuestionIds: number[];
  isTransmittedToAdmin: boolean;
  teacherComment: string | null;
  gradedByTeacherName: string | null;
}

/**
 * Teacher / HOD: Fetch student exam attempts awaiting theory scoring or completed
 * Strictly shows only attempts for courses/exams uploaded by the logged-in teacher
 */
export async function getTeacherGradingAttemptsAction(
  teacherSubject?: string,
  teacherClass?: string,
  teacherEmail?: string
): Promise<{
  success: boolean;
  error?: string;
  attempts: TeacherGradingRow[];
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error, attempts: [] };
    }
    const session = auth.session;

    let effectiveEmail = session.role === "TEACHER" ? session.email : teacherEmail;

    // Auto-heal table columns if missing
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "is_transmitted_to_admin" BOOLEAN DEFAULT false;
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT;
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "graded_by_teacher_name" TEXT;
    `).catch(() => {});

    // Resolve exams this staff member is authorized to grade:
    // - TEACHER: exams created by them OR matching their assignedSubject (or assignedClass if subject is General/All)
    // - SUPER_ADMIN: all exams (unless explicitly filtered by caller)
    let targetExamIds: number[] | null = null;
    if (session.role === "TEACHER") {
      const allExams = await prisma.exam.findMany({
        orderBy: { createdAt: "desc" },
      });
      const authorizedExams = allExams.filter((exam: any) => doesTeacherMatchExam(session, exam));
      targetExamIds = authorizedExams.map((e: any) => e.id);

      if (targetExamIds.length === 0) {
        return { success: true, attempts: [] };
      }
    } else if (
      effectiveEmail ||
      (teacherSubject && teacherSubject !== "All Subjects" && teacherSubject !== "General")
    ) {
      const allExams = await prisma.exam.findMany({
        orderBy: { createdAt: "desc" },
      });
      const scopedProfile = {
        role: "TEACHER" as const,
        email: effectiveEmail || null,
        assignedSubject: teacherSubject || null,
        assignedClass: teacherClass || null,
      };
      const scopedExams = allExams.filter((exam: any) => doesTeacherMatchExam(scopedProfile, exam));
      targetExamIds = scopedExams.map((e: any) => e.id);
      if (targetExamIds.length === 0) {
        return { success: true, attempts: [] };
      }
    }

    const attempts = await prisma.examAttempt.findMany({
      where: targetExamIds !== null ? { examId: { in: targetExamIds } } : undefined,
      include: {
        student: true,
        exam: true,
      },
      orderBy: [{ isCompleted: "desc" }, { submittedAt: "desc" }],
    });

    const rows: TeacherGradingRow[] = attempts.map((att: any) => {
      const parsedPayload = parseStudentAnswersPayload(att.studentAnswers);
      const answeredCount = parsedPayload.answeredCount;

      const objScore = att.objectiveScore != null ? Number(att.objectiveScore) : 0;
      const thScore =
        att.theoryScore !== null && att.theoryScore !== undefined && att.theoryScore !== ""
          ? Number(att.theoryScore)
          : null;
      const totScore = att.totalScore != null ? Number(att.totalScore) : objScore + (thScore ?? 0);

      return {
        id: att.id,
        studentId: att.studentId,
        studentAdmNo: att.student?.admNo || "Unknown",
        studentFullName: att.student?.fullName || "Student",
        studentClass: formatClassWithArm(att.student?.currentClass || att.exam?.targetClass || "SS", att.student?.arm),
        examId: att.examId,
        examTitle: att.exam?.title || "Exam",
        examSubject: att.exam?.subject || "General",
        targetClass: att.exam?.targetClass || "SS",
        examCreatedBy: att.exam?.createdBy || null,
        hasTheory: Boolean(att.exam?.hasTheory),
        objectiveScore: Number.isNaN(objScore) ? 0 : objScore,
        theoryScore: thScore !== null && !Number.isNaN(thScore) ? thScore : null,
        totalScore: Number.isNaN(totScore) ? 0 : totScore,
        isCompleted: Boolean(att.isCompleted),
        startedAt: att.startedAt || null,
        submittedAt: att.submittedAt || null,
        answeredCount,
        flaggedQuestionIds: parsedPayload.flaggedQuestionIds,
        isTransmittedToAdmin: Boolean(att.isTransmittedToAdmin),
        teacherComment: att.teacherComment || null,
        gradedByTeacherName: att.gradedByTeacherName || null,
      };
    });

    // Prioritize awaiting-theory completed attempts first, then newly submitted, then in-progress
    rows.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? -1 : 1;
      const aAwaiting = isAttemptAwaitingTheory(a);
      const bAwaiting = isAttemptAwaitingTheory(b);
      if (aAwaiting !== bAwaiting) return aAwaiting ? -1 : 1;
      const aTime = new Date(a.submittedAt || a.startedAt || 0).getTime();
      const bTime = new Date(b.submittedAt || b.startedAt || 0).getTime();
      return bTime - aTime;
    });

    return { success: true, attempts: rows };
  } catch (err: any) {
    console.error("Get teacher grading attempts error:", err);
    return { success: false, error: "Failed to load student exam attempts.", attempts: [] };
  }
}

/**
 * Teacher: Save Theory Score and Transmit Graded Result to Super Admin
 */
export async function saveAndTransmitTheoryScoreAction(
  attemptId: number,
  theoryScore: number,
  teacherComment?: string,
  teacherName?: string
): Promise<{
  success: boolean;
  error?: string;
  updatedAttempt?: TeacherGradingRow;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const session = auth.session;

    if (typeof theoryScore !== "number" || isNaN(theoryScore) || theoryScore < 0) {
      return { success: false, error: "Theory score must be a valid non-negative number." };
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true, student: true },
    });

    if (!attempt) {
      return { success: false, error: "Exam attempt record not found." };
    }

    // Ownership check for TEACHER role: can grade/transmit exams created by them OR matching their assigned subject
    if (session.role === "TEACHER" && !doesTeacherMatchExam(session, attempt.exam)) {
      return {
        success: false,
        error: "Unauthorized: You can only grade attempts belonging to your assigned subject or uploaded exam.",
      };
    }

    if (!attempt.isCompleted) {
      return {
        success: false,
        error: "This student's CBT attempt is still in progress. Finalize or await submission before saving theory score.",
      };
    }

    const validatedTheoryScore = Math.max(0, Number(theoryScore) || 0);
    const currentObjectiveScore = Number(attempt.objectiveScore || 0);
    const newTotalScore = currentObjectiveScore + validatedTheoryScore;

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "is_transmitted_to_admin" BOOLEAN DEFAULT false;
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT;
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "graded_by_teacher_name" TEXT;
    `).catch(() => {});

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        theoryScore: validatedTheoryScore,
        totalScore: newTotalScore,
        isTransmittedToAdmin: true,
        teacherComment: teacherComment || "Scored and certified by subject examiner.",
        gradedByTeacherName: teacherName || "Subject Teacher",
      },
      include: {
        student: true,
        exam: true,
      },
    });

    revalidatePath("/staff");
    revalidatePath("/admin/cbt");
    revalidatePath("/cbt/dashboard");

    const studentAdmNo = updated.student?.admNo || attempt.student?.admNo || "Student";
    const studentFullName = updated.student?.fullName || attempt.student?.fullName || "Student";
    const studentClass = formatClassWithArm(
      updated.student?.currentClass || attempt.student?.currentClass || updated.exam?.targetClass || "SS",
      updated.student?.arm || attempt.student?.arm
    );
    const examTitle = updated.exam?.title || attempt.exam?.title || "Exam Paper";
    const examSubject = updated.exam?.subject || attempt.exam?.subject || "General";
    const targetClass = updated.exam?.targetClass || attempt.exam?.targetClass || "SS";
    const hasTheory = Boolean(updated.exam?.hasTheory ?? attempt.exam?.hasTheory);

    return {
      success: true,
      updatedAttempt: {
        id: updated.id,
        studentId: updated.studentId,
        studentAdmNo,
        studentFullName,
        studentClass,
        examId: updated.examId,
        examTitle,
        examSubject,
        targetClass,
        hasTheory,
        objectiveScore: Number(updated.objectiveScore ?? 0),
        theoryScore:
          updated.theoryScore !== null && updated.theoryScore !== undefined
            ? Number(updated.theoryScore)
            : 0,
        totalScore: Number(updated.totalScore ?? 0),
        isCompleted: Boolean(updated.isCompleted),
        submittedAt: updated.submittedAt,
        flaggedQuestionIds: parseStudentAnswersPayload(updated.studentAnswers).flaggedQuestionIds,
        isTransmittedToAdmin: true,
        teacherComment: (updated as any).teacherComment,
        gradedByTeacherName: (updated as any).gradedByTeacherName,
      },
    };
  } catch (err: any) {
    console.error("Save & transmit theory score error:", err);
    return {
      success: false,
      error: `Failed to transmit score: ${err?.message || "Unknown error"}`,
    };
  }
}
