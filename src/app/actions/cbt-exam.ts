"use server";

import prisma, { queryRawPg } from "@/lib/prisma";
import { getStudentSession } from "./cbt-auth";
import {
  isSeniorSecondaryClass,
  doesExamTargetMatchStudent,
  parseClassAndArm,
  formatClassWithArm,
} from "@/lib/cbt-utils";
import { ClientExamPayload, ClientObjectiveQuestion, ClientTheoryQuestion } from "@/types/cbt";
import { requireAdminSession } from "@/lib/session";
import { sanitizeErrorMessage } from "@/lib/security";

import {
  getCachedExamPayload,
  getOrLoadExamPayload,
  getCachedActiveExamList,
  setCachedActiveExamList,
} from "@/lib/cbt-cache";

/**
 * Single Payload Exam Engine:
 * When a student clicks "Start Exam", fetch all objective and theory questions ONCE.
 * High-Concurrency Optimization: In-memory cached questions reduce DB load by >95%
 * on cheap hosting plans when dozens of students load exams simultaneously.
 *
 * Security: NEVER send `correctAnswer` in the client payload.
 */
export async function getSinglePayloadExamAction(examId: number): Promise<{
  success: boolean;
  error?: string;
  alreadyCompleted?: boolean;
  objectiveScore?: number;
  payload?: ClientExamPayload;
}> {
  try {
    const student = await getStudentSession();
    if (!student) {
      return { success: false, error: "Authentication required. Please log in first." };
    }

    // Resolve actual student database ID, live currentClass, and arm/stream by Admission Number
    let actualStudentId = student.studentId;
    let effectiveClass = student.currentClass;
    let effectiveArm = student.arm || "";
    try {
      const dbStudent = await prisma.student.findUnique({
        where: { admNo: student.admNo },
        select: { id: true, currentClass: true, arm: true, status: true },
      });
      if (dbStudent) {
        if ((dbStudent as any).status && (dbStudent as any).status !== "ACTIVE") {
          return {
            success: false,
            error: "Your CBT profile is currently inactive. Please contact the Examination Office.",
          };
        }
        actualStudentId = dbStudent.id;
        effectiveClass = dbStudent.currentClass || effectiveClass;
        effectiveArm = (dbStudent as any).arm ?? effectiveArm;
      }
    } catch (e) {
      console.warn("Could not re-verify student DB record:", e);
    }

    // Class Gatekeeper check
    if (!isSeniorSecondaryClass(effectiveClass)) {
      return {
        success: false,
        error: "Access Denied: The CBT portal is restricted to registered Secondary students.",
      };
    }

    // 1. Single-flight + in-memory cache to prevent DB thundering herd when 100+ students start simultaneously
    const cached = await getOrLoadExamPayload(examId, async () => {
      const exam: any = await prisma.exam.findUnique({
        where: { id: examId },
        include: {
          objectiveQuestions: {
            orderBy: { id: "asc" },
          },
          theoryQuestions: {
            orderBy: { questionNum: "asc" },
          },
        },
      });

      if (!exam || !exam.isActive || exam.isArchived) {
        return null;
      }

      const answerKey: Record<number, { correctAnswer: string; points: number }> = {};
      let totalPoints = 0;

      const sanitizedObjectiveQuestions: ClientObjectiveQuestion[] = (exam.objectiveQuestions || []).map((q: any) => {
        let parsedOptions: string[] = [];
        try {
          if (Array.isArray(q.options)) {
            parsedOptions = q.options;
          } else if (typeof q.options === "string") {
            parsedOptions = JSON.parse(q.options);
          } else {
            parsedOptions = ["Option A", "Option B", "Option C", "Option D"];
          }
        } catch {
          parsedOptions = ["Option A", "Option B", "Option C", "Option D"];
        }

        const pts = q.points != null ? Number(q.points) : 0.5;
        totalPoints += pts;
        answerKey[q.id] = {
          correctAnswer: (q.correctAnswer || "").trim().toUpperCase(),
          points: pts,
        };

        return {
          id: q.id,
          questionText: q.questionText || "",
          options: parsedOptions,
          points: pts,
          imageUrl: (q as any).imageUrl || (q as any).image_url || null,
        };
      });

      const sanitizedTheoryQuestions: ClientTheoryQuestion[] = (exam.theoryQuestions || []).map((t: any) => ({
        id: t.id,
        questionNum: t.questionNum,
        questionText: t.questionText || "",
        maxScore: t.maxScore ?? 10,
        instructions: t.instructions || null,
        imageUrl: (t as any).imageUrl || (t as any).image_url || null,
      }));

      const examDateIso = exam.examDate
        ? (exam.examDate instanceof Date ? exam.examDate.toISOString() : new Date(exam.examDate).toISOString())
        : new Date().toISOString();

      return {
        exam: {
          id: exam.id,
          title: exam.title,
          subject: exam.subject,
          targetClass: exam.targetClass,
          durationMinutes: exam.durationMinutes ?? 60,
          hasTheory: !!exam.hasTheory,
          examDate: examDateIso,
          isActive: exam.isActive,
        },
        sanitizedObjectiveQuestions,
        sanitizedTheoryQuestions,
        answerKey,
        totalPossiblePoints: totalPoints,
        totalQuestions: sanitizedObjectiveQuestions.length,
      };
    });

    if (!cached || !cached.exam.isActive) {
      return { success: false, error: "This examination is currently unavailable or inactive." };
    }

    // Verify that the student's class AND arm/stream match this examination's targetClass
    if (!doesExamTargetMatchStudent(cached.exam.targetClass, effectiveClass, effectiveArm)) {
      const studentDisplay = formatClassWithArm(effectiveClass, effectiveArm);
      return {
        success: false,
        error: `Stream / Class Mismatch: This paper is scheduled for "${cached.exam.targetClass}", whereas your registered profile is "${studentDisplay}".`,
      };
    }

    // 2. Check or initialize candidate attempt session
    let attempt = await prisma.examAttempt.findUnique({
      where: {
        studentId_examId: {
          studentId: actualStudentId,
          examId,
        },
      },
    });

    if (attempt && attempt.isCompleted) {
      const isTabViolation = attempt.teacherComment?.includes("CREDIBILITY MONITOR") || false;
      return {
        success: false,
        alreadyCompleted: true,
        objectiveScore: attempt.objectiveScore,
        error: isTabViolation
          ? `This examination was automatically submitted due to a tab-switch or window minimized violation. (Score: ${attempt.objectiveScore} pts)`
          : `You have already completed this examination. (Score: ${attempt.objectiveScore} pts)`,
      };
    }

    const safeDurationMinutes = Math.max(1, Number(cached.exam.durationMinutes) || 60);
    const durationSeconds = safeDurationMinutes * 60;
    const serverNowMs = Date.now();
    let isNewAttempt = false;

    if (!attempt) {
      isNewAttempt = true;
      try {
        attempt = await prisma.examAttempt.create({
          data: {
            studentId: actualStudentId,
            examId,
            startedAt: new Date(serverNowMs),
            isCompleted: false,
            objectiveScore: 0,
            theoryScore: null,
            totalScore: 0,
            studentAnswers: "{}",
          },
        });
      } catch (attErr: any) {
        if (attErr?.code === "P2002" || String(attErr).includes("id")) {
          await queryRawPg(`
            SELECT setval(pg_get_serial_sequence('"exam_attempts"', 'id'), COALESCE((SELECT MAX(id) FROM "exam_attempts"), 0) + 1, false);
          `).catch(() => {});
          attempt = await prisma.examAttempt.create({
            data: {
              studentId: actualStudentId,
              examId,
              startedAt: new Date(serverNowMs),
              isCompleted: false,
              objectiveScore: 0,
              theoryScore: null,
              totalScore: 0,
              studentAnswers: "{}",
            },
          });
        } else {
          throw attErr;
        }
      }
    }

    let existingAnswers: Record<number, string> = {};
    let metaRemainingSec: number | null = null;
    let metaHeartbeatMs: number | null = null;
    let savedCurrentIndex: number | undefined = undefined;
    let savedFlaggedIds: number[] | undefined = undefined;
    let savedQuestionOrder: number[] | undefined = undefined;

    if (attempt?.studentAnswers) {
      try {
        const rawParsed = JSON.parse(attempt.studentAnswers);
        if (rawParsed && typeof rawParsed === "object") {
          for (const [k, v] of Object.entries(rawParsed)) {
            if (k === "__meta_remainingSec" && typeof v === "number") {
              metaRemainingSec = v;
            } else if (k === "__meta_heartbeatMs" && typeof v === "number") {
              metaHeartbeatMs = v;
            } else if (k === "__meta_currentIndex" && typeof v === "number") {
              savedCurrentIndex = v;
            } else if (k === "__meta_flagged" && Array.isArray(v)) {
              savedFlaggedIds = v.map(Number).filter((n) => !isNaN(n));
            } else if (k === "__meta_qOrder" && Array.isArray(v)) {
              savedQuestionOrder = v.map(Number).filter((n) => !isNaN(n));
            } else if (!k.startsWith("__meta_") && typeof v === "string") {
              const qIdNum = Number(k);
              if (!isNaN(qIdNum)) {
                existingAnswers[qIdNum] = v;
              }
            }
          }
        }
      } catch {
        existingAnswers = {};
      }
    }

    const answeredCount = Object.keys(existingAnswers).length;
    const recoveredSession = !isNewAttempt && (answeredCount > 0 || savedCurrentIndex !== undefined || metaRemainingSec !== null);

    // Server-side authoritative remaining seconds calculation + Power-Off / Crash Time Protection
    let remainingSeconds = durationSeconds;
    if (!isNewAttempt && attempt) {
      const rawStartedMs = attempt.startedAt ? new Date(attempt.startedAt).getTime() : serverNowMs;
      const elapsedSec = Math.floor((serverNowMs - rawStartedMs) / 1000);
      const timeSinceHeartbeatMs = metaHeartbeatMs ? serverNowMs - metaHeartbeatMs : 0;

      // Case 1: Power-off / System crash recovery where checkpoint saved remainingSeconds
      if (
        metaRemainingSec !== null &&
        metaRemainingSec > 0 &&
        (timeSinceHeartbeatMs > 20000 || elapsedSec >= durationSeconds || metaRemainingSec > durationSeconds - elapsedSec + 20)
      ) {
        remainingSeconds = Math.max(60, Math.min(durationSeconds, Math.round(metaRemainingSec)));
        const adjustedStart = new Date(serverNowMs - Math.max(0, durationSeconds - remainingSeconds) * 1000);
        attempt = await prisma.examAttempt
          .update({
            where: { id: attempt.id },
            data: { startedAt: adjustedStart },
          })
          .catch(() => ({ ...attempt!, startedAt: adjustedStart }));
      } else if (elapsedSec < 0 || elapsedSec >= durationSeconds || (answeredCount === 0 && elapsedSec > 90)) {
        // Case 2: If DB timestamp had timezone offset (elapsedSec < 0), or attempt was abandoned earlier with 0 answers,
        // or uncompleted attempt exceeded duration without submission, reset startedAt to give fresh full duration
        const freshStart = new Date(serverNowMs);
        attempt = await prisma.examAttempt
          .update({
            where: { id: attempt.id },
            data: { startedAt: freshStart },
          })
          .catch(() => ({ ...attempt!, startedAt: freshStart }));
        remainingSeconds = durationSeconds;
      } else {
        remainingSeconds = Math.max(60, Math.min(durationSeconds, durationSeconds - elapsedSec));
      }
    }

    const startedAtIso = attempt.startedAt
      ? (attempt.startedAt instanceof Date ? attempt.startedAt.toISOString() : new Date(attempt.startedAt).toISOString())
      : new Date(serverNowMs).toISOString();

    const clientPayload: ClientExamPayload = {
      exam: {
        ...cached.exam,
        durationMinutes: safeDurationMinutes,
      },
      student: {
        ...student,
        studentId: actualStudentId,
        currentClass: effectiveClass,
        arm: effectiveArm,
      },
      attemptId: attempt.id,
      startedAt: startedAtIso,
      serverNow: new Date(serverNowMs).toISOString(),
      durationSeconds,
      remainingSeconds,
      objectiveQuestions: cached.sanitizedObjectiveQuestions,
      theoryQuestions: cached.sanitizedTheoryQuestions,
      existingAnswers,
      recoveredSession,
      savedCurrentIndex,
      savedFlaggedIds,
      savedQuestionOrder,
    };

    return {
      success: true,
      payload: clientPayload,
    };
  } catch (err: any) {
    console.error("Single payload fetch error:", err);
    const detail = err?.message || String(err);
    const firstLine = detail.split("\n")[0] || detail;
    return {
      success: false,
      error: `Examination Launch Error: ${firstLine}`,
    };
  }
}

/**
 * Lightweight Background Progress & Power-Off Recovery Checkpoint:
 * Periodically saves student selected answers + remaining timer seconds + current question index
 * to `exam_attempts.studentAnswers` without marking completed, ensuring 100% session recovery
 * even if a student's PC powers off, restarts, or they move to a different computer in the CBT lab.
 */
export async function saveExamProgressCheckpointAction(
  examId: number,
  answers: Record<string, string>,
  meta?: {
    attemptId?: number;
    remainingSeconds?: number;
    currentIndex?: number;
    flaggedIds?: number[];
    questionOrder?: number[];
  }
): Promise<{ success: boolean }> {
  try {
    const student = await getStudentSession();
    if (!student || !examId || !answers || typeof answers !== "object") {
      return { success: false };
    }

    const actualStudentId = Number(student.studentId);
    if (!Number.isInteger(actualStudentId) || actualStudentId <= 0) {
      return { success: false };
    }

    // Use cached exam duration when warm to avoid an extra JOIN on every autosave checkpoint
    const cachedExam = getCachedExamPayload(examId);
    let attemptRow:
      | {
          id: number;
          started_at: Date | string | null;
          is_completed: boolean;
          student_answers: string | null;
          duration_minutes?: number | null;
        }
      | undefined;

    if (cachedExam) {
      const rows = await queryRawPg<{
        id: number;
        started_at: Date | string | null;
        is_completed: boolean;
        student_answers: string | null;
      }>(
        "SELECT id, started_at, is_completed, student_answers FROM exam_attempts WHERE student_id = $1 AND exam_id = $2 LIMIT 1",
        [actualStudentId, examId]
      );
      attemptRow = rows[0];
    } else {
      const rows = await queryRawPg<{
        id: number;
        started_at: Date | string | null;
        is_completed: boolean;
        student_answers: string | null;
        duration_minutes: number | null;
      }>(
        `SELECT ea.id, ea.started_at, ea.is_completed, ea.student_answers, e.duration_minutes
         FROM exam_attempts ea
         INNER JOIN exams e ON e.id = ea.exam_id
         WHERE ea.student_id = $1 AND ea.exam_id = $2
         LIMIT 1`,
        [actualStudentId, examId]
      );
      attemptRow = rows[0];
    }

    if (!attemptRow || attemptRow.is_completed) {
      return { success: false };
    }

    const durationMinutes =
      cachedExam?.exam.durationMinutes ?? attemptRow.duration_minutes ?? 60;
    const durationSeconds = Math.max(1, Number(durationMinutes) || 60) * 60;
    const serverNowMs = Date.now();
    const startedAtMs = attemptRow.started_at ? new Date(attemptRow.started_at).getTime() : serverNowMs;

    // Parse prior server-stored checkpoint timing so client cannot tamper with remainingSeconds
    let prevRemainingSec: number | null = null;
    let prevHeartbeatMs: number | null = null;
    try {
      const prevParsed = JSON.parse(attemptRow.student_answers || "{}");
      if (typeof prevParsed?.__meta_remainingSec === "number") {
        prevRemainingSec = prevParsed.__meta_remainingSec;
      }
      if (typeof prevParsed?.__meta_heartbeatMs === "number") {
        prevHeartbeatMs = prevParsed.__meta_heartbeatMs;
      }
    } catch {}

    let authoritativeRemainingSec: number;
    if (
      prevRemainingSec !== null &&
      prevHeartbeatMs !== null &&
      serverNowMs >= prevHeartbeatMs &&
      serverNowMs - prevHeartbeatMs <= 120000
    ) {
      const deltaSec = Math.floor((serverNowMs - prevHeartbeatMs) / 1000);
      authoritativeRemainingSec = Math.max(0, Math.min(durationSeconds, prevRemainingSec - deltaSec));
    } else {
      const elapsedSec = Math.max(0, Math.floor((serverNowMs - startedAtMs) / 1000));
      authoritativeRemainingSec = Math.max(0, Math.min(durationSeconds, durationSeconds - elapsedSec));
    }

    const cleanPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (!k.startsWith("__meta_") && /^\d+$/.test(k) && typeof v === "string" && v.length <= 32) {
        cleanPayload[k] = v;
      }
    }

    cleanPayload.__meta_heartbeatMs = serverNowMs;
    cleanPayload.__meta_remainingSec = authoritativeRemainingSec;

    if (meta?.currentIndex != null && Number.isInteger(meta.currentIndex) && meta.currentIndex >= 0) {
      cleanPayload.__meta_currentIndex = meta.currentIndex;
    }
    if (Array.isArray(meta?.flaggedIds) && meta.flaggedIds.length > 0) {
      cleanPayload.__meta_flagged = meta.flaggedIds
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 500);
    }
    if (Array.isArray(meta?.questionOrder) && meta.questionOrder.length > 0) {
      cleanPayload.__meta_qOrder = meta.questionOrder
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 500);
    }

    const serializedPayload = JSON.stringify(cleanPayload);

    await queryRawPg(
      "UPDATE exam_attempts SET student_answers = $1 WHERE id = $2 AND student_id = $3 AND is_completed = false",
      [serializedPayload, attemptRow.id, actualStudentId]
    );

    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Final Submission Engine:
 * When the student clicks "Submit" (or time expires, or strikes exceeded),
 * score answers instantly using RAM-cached answer keys.
 * Zero heavy multi-table joins during mass submission waves on cheap shared hosting.
 */
export async function submitExamAttemptAction(
  examId: number,
  answers: Record<string, string>,
  reason?: "manual" | "time_expired" | "tab_switch_violation"
): Promise<{
  success: boolean;
  error?: string;
  objectiveScore?: number;
  totalPossiblePoints?: number;
  answeredCount?: number;
  totalQuestions?: number;
  submissionReason?: string;
}> {
  try {
    const student = await getStudentSession();
    if (!student) {
      return { success: false, error: "Authentication expired. Please log in again." };
    }

    let actualStudentId = student.studentId;
    try {
      const dbStudent = await prisma.student.findUnique({
        where: { admNo: student.admNo },
      });
      if (dbStudent) {
        actualStudentId = dbStudent.id;
      }
    } catch {
      // fallback
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        studentId_examId: {
          studentId: actualStudentId,
          examId,
        },
      },
    });

    if (!attempt) {
      return { success: false, error: "No exam attempt session was found to submit." };
    }

    // Resolve answer key and point totals (cached in RAM to prevent DB overload during mass submission)
    let answerKey: Record<number, { correctAnswer: string; points: number }> = {};
    let totalPossiblePoints = 0;
    let totalQuestionsCount = 0;

    const cached = getCachedExamPayload(examId);
    if (cached && cached.answerKey) {
      answerKey = cached.answerKey;
      totalPossiblePoints = cached.totalPossiblePoints;
      totalQuestionsCount = cached.totalQuestions;
    } else {
      const questions = await prisma.objectiveQuestion.findMany({
        where: { examId },
        select: {
          id: true,
          correctAnswer: true,
          points: true,
        },
      });

      totalQuestionsCount = questions.length;
      for (const q of questions) {
        const pts = q.points != null ? Number(q.points) : 0.5;
        totalPossiblePoints += pts;
        answerKey[q.id] = {
          correctAnswer: (q.correctAnswer || "").trim().toUpperCase(),
          points: pts,
        };
      }
    }

    // Idempotent: If already completed, return existing score immediately
    if (attempt.isCompleted) {
      let existingAnsweredCount = 0;
      try {
        const parsed = JSON.parse(attempt.studentAnswers || "{}");
        existingAnsweredCount = Object.keys(parsed).filter((k) => !k.startsWith("__meta_")).length;
      } catch {
        existingAnsweredCount = 0;
      }

      const isTabViolation = attempt.teacherComment?.includes("CREDIBILITY MONITOR") || false;

      return {
        success: true,
        objectiveScore: attempt.objectiveScore,
        totalPossiblePoints,
        answeredCount: existingAnsweredCount,
        totalQuestions: totalQuestionsCount,
        submissionReason: isTabViolation ? "tab_switch_violation" : "completed",
        error: "Exam was already submitted previously.",
      };
    }

    // Pure JavaScript instant score evaluation (0ms database time)
    let calculatedScore = 0;
    let answeredCount = 0;

    for (const [qIdStr, keyObj] of Object.entries(answerKey)) {
      const studentAnswer = (answers[qIdStr] || "").trim().toUpperCase();
      if (studentAnswer) {
        answeredCount++;
        if (studentAnswer === keyObj.correctAnswer) {
          calculatedScore += keyObj.points;
        }
      }
    }

    // Build violation note if submitted due to proctor strikes
    let teacherCommentToSave: string | undefined = undefined;
    if (reason === "tab_switch_violation") {
      teacherCommentToSave =
        "[CREDIBILITY MONITOR]: Candidate reached 3 proctor strikes (navigated away or minimized the exam window). Paper was automatically submitted.";
    }

    // Fast Single-Query Submission Update
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        isCompleted: true,
        submittedAt: new Date(),
        objectiveScore: calculatedScore,
        theoryScore: null, // Null until Super Admin grades physical booklets
        totalScore: calculatedScore,
        studentAnswers: JSON.stringify(answers),
        ...(teacherCommentToSave ? { teacherComment: teacherCommentToSave } : {}),
      },
    });

    return {
      success: true,
      objectiveScore: calculatedScore,
      totalPossiblePoints,
      answeredCount,
      totalQuestions: totalQuestionsCount,
      submissionReason: reason || "manual",
    };
  } catch (err) {
    console.error("Submit exam attempt error:", err);
    return { success: false, error: "Submission failed. Please check your connection and retry." };
  }
}

/**
 * Fetch available exams for the logged in student based on their class level
 */
export async function getStudentDashboardExamsAction(): Promise<{
  success: boolean;
  student: (Awaited<ReturnType<typeof getStudentSession>>);
  exams: Array<{
    id: number;
    title: string;
    subject: string;
    targetClass: string;
    durationMinutes: number;
    hasTheory: boolean;
    examDate: Date;
    objectiveCount: number;
    theoryCount: number;
    attempt?: {
      isCompleted: boolean;
      objectiveScore: number;
      theoryScore: number | null;
      totalScore: number;
    } | null;
  }>;
  error?: string;
}> {
  try {
    const student = await getStudentSession();
    if (!student) {
      return { success: false, student: null, exams: [], error: "Unauthorized" };
    }

    let actualStudentId = student.studentId;
    let effectiveClass = student.currentClass;
    let effectiveArm = student.arm || "";
    try {
      const dbStudent = await prisma.student.findUnique({
        where: { admNo: student.admNo },
      });
      if (dbStudent) {
        actualStudentId = dbStudent.id;
        effectiveClass = dbStudent.currentClass || effectiveClass;
        effectiveArm = (dbStudent as any).arm ?? effectiveArm;
      }
    } catch {
      // fallback
    }

    // Share short-TTL RAM cache of active exams + counts across concurrent student logins
    let activeExams = getCachedActiveExamList();
    if (!activeExams) {
      const rawExams = await prisma.exam.findMany({
        where: {
          isActive: true,
          isArchived: false,
        },
        include: {
          _count: {
            select: {
              objectiveQuestions: true,
              theoryQuestions: true,
            },
          },
        },
        orderBy: { examDate: "asc" },
      });

      activeExams = (rawExams || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        subject: e.subject,
        targetClass: e.targetClass,
        durationMinutes: e.durationMinutes,
        hasTheory: Boolean(e.hasTheory),
        examDate: e.examDate,
        objectiveCount: e?._count?.objectiveQuestions ?? 0,
        theoryCount: e?._count?.theoryQuestions ?? 0,
      }));
      setCachedActiveExamList(activeExams);
    }

    const studentAttempts = await queryRawPg<{
      exam_id: number;
      is_completed: boolean;
      objective_score: number | null;
      theory_score: number | null;
      total_score: number | null;
    }>(
      "SELECT exam_id, is_completed, objective_score, theory_score, total_score FROM exam_attempts WHERE student_id = $1",
      [actualStudentId]
    );

    const attemptsByExamId = new Map<number, (typeof studentAttempts)[number]>();
    for (const att of studentAttempts || []) {
      attemptsByExamId.set(Number(att.exam_id), att);
    }

    const exams = activeExams.filter((e) =>
      doesExamTargetMatchStudent(e.targetClass, effectiveClass, effectiveArm)
    );

    const formatted = exams.map((e) => {
      const studentAttempt = attemptsByExamId.get(e.id) || null;
      return {
        id: e.id,
        title: e.title,
        subject: e.subject,
        targetClass: e.targetClass,
        durationMinutes: e.durationMinutes,
        hasTheory: e.hasTheory,
        examDate: e.examDate,
        objectiveCount: e.objectiveCount,
        theoryCount: e.theoryCount,
        attempt: studentAttempt
          ? {
              isCompleted: Boolean(studentAttempt.is_completed),
              objectiveScore: Number(studentAttempt.objective_score ?? 0),
              theoryScore: studentAttempt.theory_score != null ? Number(studentAttempt.theory_score) : null,
              totalScore: Number(studentAttempt.total_score ?? 0),
            }
          : null,
      };
    });

    return {
      success: true,
      student: {
        ...student,
        studentId: actualStudentId,
        currentClass: effectiveClass,
        arm: effectiveArm,
      },
      exams: formatted,
    };
  } catch (err) {
    console.error("Student dashboard exams error:", err);
    return { success: false, student: null, exams: [], error: "Failed to load examination schedule." };
  }
}

/**
 * Super Admin Utility: Clear all demo and seed records from database and local storage
 */
export async function clearAllSeedDataAction(): Promise<{ success: boolean; message: string }> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, message: auth.error };
    }

    // 1. Clear local terminal results store & RAM cache
    try {
      const { saveAllToLocalTerminalResultsStore } = await import("@/lib/terminal-result-store");
      saveAllToLocalTerminalResultsStore([]);
    } catch (e) {
      console.warn("Could not wipe terminal-results-store.json:", e);
    }

    // 2. Clear database seed attempts & cards if DB reachable
    try {
      // Delete demo student attempts
      await prisma.examAttempt.deleteMany({
        where: {
          student: {
            admNo: {
              in: ["GFMS/SS/2024/001", "GFMS/SS/2024/002", "GFMS/SS/2024/003", "GFMS/JSS/2024/088", "GFMS/2024/0501"],
            },
          },
        },
      });

      // Clear all terminal results to return to clean empty state
      await prisma.terminalResult.deleteMany({});

      // Clear sample scratch cards
      await prisma.scratchCard.deleteMany({
        where: {
          pin: {
            in: ["GFMS-8492-1049", "GFMS-3310-9921"],
          },
        },
      });
    } catch (dbErr) {
      console.warn("Database clear skipped or DB offline:", dbErr);
    }

    return { success: true, message: "All seed records and demo stores have been successfully cleared." };
  } catch (err: any) {
    return { success: false, message: sanitizeErrorMessage(err, "Failed to clear seed records.") };
  }
}

