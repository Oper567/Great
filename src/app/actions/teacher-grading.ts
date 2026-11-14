"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/session";

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
  submittedAt: Date | null;
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
    const session = await getAdminSession().catch(() => null);
    let effectiveEmail = teacherEmail;
    if (session?.role === "TEACHER") {
      effectiveEmail = session.email;
    }

    // Auto-heal table columns if missing
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "is_transmitted_to_admin" BOOLEAN DEFAULT false;
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT;
      ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "graded_by_teacher_name" TEXT;
    `).catch(() => {});

    // If teacher role or effectiveEmail is present:
    // Strictly find the exams that this teacher uploaded/created!
    let teacherExamIds: number[] | null = null;
    if (session?.role === "TEACHER" || effectiveEmail) {
      const emailToMatch = (effectiveEmail || session?.email || "").trim();
      if (!emailToMatch) {
        return { success: true, attempts: [] };
      }
      const uploadedExams = await prisma.exam.findMany({
        where: {
          createdBy: { equals: emailToMatch, mode: "insensitive" },
        } as any,
        select: { id: true },
      });

      teacherExamIds = uploadedExams.map((e: any) => e.id);

      // If this teacher has not uploaded any courses yet, return empty list!
      if (teacherExamIds.length === 0) {
        return { success: true, attempts: [] };
      }
    }

    const attempts = await prisma.examAttempt.findMany({
      where: {
        isCompleted: true,
        ...(teacherExamIds !== null
          ? { examId: { in: teacherExamIds } }
          : teacherSubject && teacherSubject !== "All Subjects" && teacherSubject !== "General"
          ? { exam: { subject: { contains: teacherSubject, mode: "insensitive" } } }
          : {}),
        ...(teacherClass && teacherClass !== "All Classes"
          ? { exam: { targetClass: { contains: teacherClass, mode: "insensitive" } } }
          : {}),
      },
      include: {
        student: true,
        exam: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    const rows: TeacherGradingRow[] = attempts.map((att: any) => ({
      id: att.id,
      studentId: att.studentId,
      studentAdmNo: att.student?.admNo || "Unknown",
      studentFullName: att.student?.fullName || "Student",
      studentClass: att.student?.currentClass || "SS",
      examId: att.examId,
      examTitle: att.exam?.title || "Exam",
      examSubject: att.exam?.subject || "General",
      targetClass: att.exam?.targetClass || "SS",
      examCreatedBy: att.exam?.createdBy || null,
      hasTheory: Boolean(att.exam?.hasTheory),
      objectiveScore: att.objectiveScore ?? 0,
      theoryScore: att.theoryScore !== null && att.theoryScore !== undefined ? att.theoryScore : null,
      totalScore: att.totalScore ?? 0,
      isCompleted: Boolean(att.isCompleted),
      submittedAt: att.submittedAt,
      isTransmittedToAdmin: Boolean(att.isTransmittedToAdmin),
      teacherComment: att.teacherComment || null,
      gradedByTeacherName: att.gradedByTeacherName || null,
    }));

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
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true, student: true },
    });

    if (!attempt) {
      return { success: false, error: "Exam attempt record not found." };
    }

    const validatedTheoryScore = Math.max(0, theoryScore);
    const newTotalScore = attempt.objectiveScore + validatedTheoryScore;

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

    const studentAdmNo = updated.student?.admNo || attempt.student?.admNo || "Student";
    const studentFullName = updated.student?.fullName || attempt.student?.fullName || "Student";
    const studentClass = updated.student?.currentClass || attempt.student?.currentClass || updated.exam?.targetClass || "SS";
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
        objectiveScore: updated.objectiveScore ?? 0,
        theoryScore: updated.theoryScore ?? 0,
        totalScore: updated.totalScore ?? 0,
        isCompleted: updated.isCompleted,
        submittedAt: updated.submittedAt,
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
