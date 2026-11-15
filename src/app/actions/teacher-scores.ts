"use server";

import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  PreparedSubjectScore,
  PreparedResultPayload,
  DEFAULT_PREPARED_SKILLS,
  DEFAULT_PREPARED_BEHAVIOUR,
  DEFAULT_PREPARED_FEE,
} from "@/types/report-card";
import {
  getLocalTerminalResultsStore,
  saveToLocalTerminalResultsStore,
  saveAllToLocalTerminalResultsStore,
} from "@/lib/terminal-result-store";
import { autoRankCohortPositionsAction } from "@/app/actions/terminal-result-admin";
import { requireAdminSession } from "@/lib/session";
import { sanitizeErrorMessage } from "@/lib/security";
import {
  parseClassAndArm,
  formatClassWithArm,
  doesStudentMatchClassFilter,
  doesExamTargetMatchStudent,
} from "@/lib/cbt-utils";

export interface DelegatedScoreRow {
  admNo: string;
  studentName?: string;
  caTotal?: number;            // 0 - 30 (combined 1st CA + 2nd CA)
  ca1: number;                 // 0 - 15 (1st CA)
  ca2: number;                 // 0 - 15 (2nd CA)
  exam: number | null;         // 0 - 70 (null when saving CA draft pending exam)
  isExamPending?: boolean;     // true when CA is uploaded as draft pending exam total score
  totalScore?: number;
  grade?: string;
  remark?: string;
}

export interface SyncDelegatedSubjectScoresInput {
  className: string;
  subjectName: string;
  subjectCode?: string;
  category?: string;
  session?: string;
  term?: string;
  teacherName?: string;
  teacherEmail?: string;
  publishImmediately?: boolean; // Only honored for SUPER_ADMIN; teacher uploads always remain in DRAFT pending Admin finalization
  scores: DelegatedScoreRow[];
}

export interface TeacherUploadedCourse {
  key: string; // normalized `${subject}::${targetClass}`
  subject: string;
  targetClass: string;
  source: "CBT_EXAM" | "QUESTION_SUBMISSION";
  status: string;
  title?: string;
  examId?: number;
  submissionId?: number;
  updatedAt?: string;
}

export interface StoredSubjectDraftRecord {
  draftKey: string;
  className: string;
  subjectName: string;
  session: string;
  term: string;
  teacherEmail?: string;
  teacherName?: string;
  status:
    | "CA_DRAFT_PENDING_EXAM"
    | "DRAFT_PENDING_ADMIN"
    | "DRAFT_COMPLETE"
    | "PUBLISHED";
  scores: DelegatedScoreRow[];
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "database");
const DRAFTS_STORE_PATH = path.join(DATA_DIR, "teacher-ca-score-drafts.json");

function buildDraftKey(className: string, subjectName: string, session: string, term: string): string {
  return [
    (className || "").trim().toLowerCase(),
    (subjectName || "").trim().toLowerCase(),
    (session || "2025/2026").trim().toLowerCase(),
    (term || "Third Term").trim().toLowerCase(),
  ].join("::");
}

function readLocalScoreDrafts(): StoredSubjectDraftRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DRAFTS_STORE_PATH)) {
      fs.writeFileSync(DRAFTS_STORE_PATH, "[]", "utf-8");
      return [];
    }
    const raw = fs.readFileSync(DRAFTS_STORE_PATH, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Could not read local CA score drafts:", err);
    return [];
  }
}

function writeLocalScoreDraft(record: StoredSubjectDraftRecord): void {
  try {
    const all = readLocalScoreDrafts();
    const idx = all.findIndex((d) => d.draftKey === record.draftKey);
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.unshift(record);
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DRAFTS_STORE_PATH, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write local CA score draft:", err);
  }
}

let draftTableEnsured = false;
async function ensureDraftTableExists() {
  if (draftTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "teacher_ca_score_drafts" (
        "draft_key" TEXT PRIMARY KEY,
        "class_name" TEXT NOT NULL,
        "subject_name" TEXT NOT NULL,
        "session" TEXT NOT NULL,
        "term" TEXT NOT NULL,
        "teacher_email" TEXT,
        "teacher_name" TEXT,
        "status" TEXT NOT NULL DEFAULT 'CA_DRAFT_PENDING_EXAM',
        "scores_json" TEXT NOT NULL,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    draftTableEnsured = true;
  } catch {
    // Fallback to local JSON store if DB disallows DDL
  }
}

/**
 * Standard subject category resolver
 */
function resolveSubjectCategory(subject: string): { code: string; category: string } {
  const s = (subject || "").trim().toLowerCase();
  if (s.includes("math")) return { code: "MTH", category: "Mathematical Sciences" };
  if (s.includes("eng") || s.includes("lit")) return { code: "ENG", category: "Language & Humanities" };
  if (s.includes("chem")) return { code: "CHM", category: "Pure & Applied Sciences" };
  if (s.includes("phys")) return { code: "PHY", category: "Pure & Applied Sciences" };
  if (s.includes("bio")) return { code: "BIO", category: "Biological Sciences" };
  if (s.includes("basic sci")) return { code: "BST", category: "Basic Sciences" };
  if (s.includes("civic")) return { code: "CIV", category: "National Values" };
  if (s.includes("social")) return { code: "SOS", category: "National Values" };
  if (s.includes("bus")) return { code: "BUS", category: "Vocational & Commercial" };
  if (s.includes("comp") || s.includes("ict")) return { code: "ICT", category: "Information Technology" };
  if (s.includes("agric")) return { code: "AGR", category: "Vocational Studies" };
  if (s.includes("crk") || s.includes("crs")) return { code: "CRK", category: "Religion & National Values" };
  if (s.includes("french")) return { code: "FRE", category: "Foreign Languages" };
  if (s.includes("econ")) return { code: "ECN", category: "Commercial Sciences" };
  if (s.includes("gov")) return { code: "GOV", category: "Humanities" };
  if (s.includes("geog")) return { code: "GEO", category: "Social Sciences" };
  if (s.includes("account")) return { code: "ACC", category: "Commercial Sciences" };
  if (s.includes("comm")) return { code: "COM", category: "Commercial Sciences" };
  if (s.includes("yoruba") || s.includes("igbo") || s.includes("hausa")) return { code: "NIG", category: "Indigenous Languages" };

  const code = (subject || "SUB").replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "SUB";
  return { code, category: "General Curriculum" };
}

/**
 * Normalizes 1st CA (0-15), 2nd CA (0-15), CA Total (0-30), and Exam (0-70)
 */
function normalizeCaAndExamScores(row: DelegatedScoreRow): {
  caTotal: number;
  ca1: number;
  ca2: number;
  exam: number;
  isExamPending: boolean;
  subTotal: number;
  grade: string;
  remark: string;
} {
  const rawCa1 = Math.max(0, Math.min(15, Math.round(Number(row.ca1) || 0)));
  const rawCa2 = Math.max(0, Math.min(15, Math.round(Number(row.ca2) || 0)));
  let ca1 = rawCa1;
  let ca2 = rawCa2;
  let caTotal = Math.max(0, Math.min(30, rawCa1 + rawCa2));

  if (row.caTotal !== undefined && row.caTotal !== null && !isNaN(Number(row.caTotal))) {
    const explicitTotal = Math.max(0, Math.min(30, Math.round(Number(row.caTotal))));
    if (ca1 + ca2 !== explicitTotal) {
      caTotal = explicitTotal;
      ca1 = Math.min(15, explicitTotal);
      ca2 = Math.max(0, Math.min(15, explicitTotal - 15));
    }
  }

  const isExamPending =
    Boolean(row.isExamPending) ||
    row.exam === null ||
    row.exam === undefined ||
    String(row.exam).trim() === "";

  const exam = isExamPending
    ? 0
    : Math.max(0, Math.min(70, Math.round(Number(row.exam) || 0)));

  const subTotal = Math.max(0, Math.min(100, caTotal + exam));

  let grade = "C";
  let remark = "Credit";
  if (subTotal >= 75) {
    grade = "A";
    remark = "Distinction";
  } else if (subTotal >= 65) {
    grade = "B";
    remark = "Very Good";
  } else if (subTotal >= 50) {
    grade = "C";
    remark = "Credit";
  } else if (subTotal >= 40) {
    grade = "D";
    remark = "Pass";
  } else {
    grade = "F";
    remark = "Fail";
  }

  return { caTotal, ca1, ca2, exam, isExamPending, subTotal, grade, remark };
}

/**
 * Fetches the exact courses (Subject + Target Class) uploaded by a specific teacher
 * via CBT Exams (`Exam.createdBy`) or Question Desk Submissions (`TeacherQuestionSubmission.teacherEmail`).
 * Teachers are strictly restricted to uploading 1st CA, 2nd CA, and Exam scores for these courses only.
 */
export async function getTeacherUploadedCoursesAction(
  teacherEmailParam?: string
): Promise<{
  success: boolean;
  courses: TeacherUploadedCourse[];
  error?: string;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, courses: [], error: auth.error };
    }
    const session = auth.session;

    const effectiveEmail = (
      session.role === "TEACHER"
        ? session.email
        : teacherEmailParam || session.email || ""
    )
      .trim()
      .toLowerCase();

    if (!effectiveEmail) {
      return { success: true, courses: [] };
    }

    const [exams, submissions] = await Promise.all([
      prisma.exam
        .findMany({
          where: {
            createdBy: { equals: effectiveEmail, mode: "insensitive" },
          },
          select: {
            id: true,
            title: true,
            subject: true,
            targetClass: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => []),
      prisma.teacherQuestionSubmission
        .findMany({
          where: {
            teacherEmail: { equals: effectiveEmail, mode: "insensitive" },
          },
          select: {
            id: true,
            subject: true,
            targetClass: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
        .catch(() => []),
    ]);

    const courseMap = new Map<string, TeacherUploadedCourse>();

    for (const ex of exams) {
      const subject = (ex.subject || "").trim();
      const targetClass = (ex.targetClass || "").trim();
      if (!subject || !targetClass) continue;
      const key = `${subject.toLowerCase()}::${targetClass.toLowerCase()}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          key: `${subject}::${targetClass}`,
          subject,
          targetClass,
          source: "CBT_EXAM",
          status: ex.isActive ? "ACTIVE_CBT_EXAM" : "CBT_EXAM_CREATED",
          title: ex.title,
          examId: ex.id,
          updatedAt: ex.createdAt ? new Date(ex.createdAt).toISOString() : undefined,
        });
      }
    }

    for (const sub of submissions) {
      const subject = (sub.subject || "").trim();
      const targetClass = (sub.targetClass || "").trim();
      if (!subject || !targetClass) continue;
      const key = `${subject.toLowerCase()}::${targetClass.toLowerCase()}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          key: `${subject}::${targetClass}`,
          subject,
          targetClass,
          source: "QUESTION_SUBMISSION",
          status: sub.status || "SUBMITTED",
          title: `${subject} (${targetClass}) Question Paper`,
          submissionId: sub.id,
          updatedAt: sub.createdAt ? new Date(sub.createdAt).toISOString() : undefined,
        });
      }
    }

    return {
      success: true,
      courses: Array.from(courseMap.values()),
    };
  } catch (err: any) {
    console.error("getTeacherUploadedCoursesAction error:", err);
    return {
      success: false,
      courses: [],
      error: sanitizeErrorMessage(err, "Failed to load teacher uploaded courses."),
    };
  }
}

/**
 * Verifies that a teacher actually uploaded the course (Subject + Class)
 * before allowing them to input 1st CA, 2nd CA, or Exam scores.
 * Super Admins bypass this restriction.
 */
async function verifyTeacherCourseOwnership(
  subjectName: string,
  className: string,
  _fallbackTeacherEmail?: string
): Promise<{
  allowed: boolean;
  isSuperAdmin: boolean;
  sessionEmail?: string;
  sessionName?: string;
  error?: string;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
  if (!auth.ok) {
    return {
      allowed: false,
      isSuperAdmin: false,
      error: "Unauthorized: Please sign in with your Staff or Administrator credentials.",
    };
  }
  const session = auth.session;
  if (session.role === "SUPER_ADMIN") {
    return {
      allowed: true,
      isSuperAdmin: true,
      sessionEmail: session.email,
      sessionName: session.fullName,
    };
  }

  const teacherEmail = (session.email || "").trim().toLowerCase();
  if (!teacherEmail) {
    return {
      allowed: false,
      isSuperAdmin: false,
      error: "Unauthorized: Please sign in with your Teacher credentials.",
    };
  }

  const { courses } = await getTeacherUploadedCoursesAction(teacherEmail);
  const targetSub = subjectName.trim().toLowerCase();
  const targetCls = className.trim().toLowerCase();

  const isOwned = courses.some(
    (c) =>
      c.subject.trim().toLowerCase() === targetSub &&
      c.targetClass.trim().toLowerCase() === targetCls
  );

  if (!isOwned) {
    return {
      allowed: false,
      isSuperAdmin: false,
      error: `Access Restricted: You can only input 1st CA, 2nd CA, and Exam scores for courses (Subject & Class) that you personally uploaded. "${subjectName} (${className})" was not found in your uploaded courses.`,
    };
  }

  return {
    allowed: true,
    isSuperAdmin: false,
    sessionEmail: teacherEmail,
    sessionName: session.fullName,
  };
}

/**
 * Internal helper: Merges a course's scores (1st CA, 2nd CA, Exam) into each student's
 * TerminalResult dossier.
 * When `shouldPublish` is false (the default for all teacher uploads), the student's
 * TerminalResult dossier stays in DRAFT (`isPublished: false`) pending Admin final finishing!
 */
async function mergeCourseScoresIntoStudentDossiers(
  payload: SyncDelegatedSubjectScoresInput,
  shouldPublish: boolean
): Promise<{ updatedCount: number; classAverage?: number }> {
  const {
    className,
    subjectName,
    session = "2025/2026",
    term = "Third Term",
    scores,
  } = payload;

  const { code: autoCode, category: autoCategory } = resolveSubjectCategory(subjectName);
  const effectiveSubjectCode = payload.subjectCode || autoCode;
  const effectiveCategory = payload.category || autoCategory;
  const cleanSession = session.trim();
  const cleanTerm = term.trim();
  const cleanClassName = className.trim();
  const isThirdTerm = cleanTerm.toLowerCase().includes("third");

  const registeredStudents = await prisma.student
    .findMany({
      select: { admNo: true, fullName: true, currentClass: true, arm: true, gender: true },
    })
    .catch(() => []);

  const studentMap = new Map<string, { fullName: string; currentClass: string; arm?: string; gender?: string }>();
  registeredStudents.forEach((s: any) => {
    studentMap.set(s.admNo.trim().toUpperCase(), {
      fullName: s.fullName,
      currentClass: s.currentClass,
      arm: s.arm || "",
      gender: s.gender || "MALE",
    });
  });

  const courseParsed = parseClassAndArm(cleanClassName);
  const touchedStudentClasses = new Set<string>([cleanClassName]);

  const localStore = getLocalTerminalResultsStore();
  let updatedCount = 0;
  let totalSubmittedSum = 0;

  for (const row of scores) {
    const admNo = (row.admNo || "").trim().toUpperCase();
    if (!admNo) continue;

    const registered = studentMap.get(admNo);
    const studentName = (row.studentName || registered?.fullName || `Student (${admNo})`).trim();
    const studentGender = (registered?.gender || "FEMALE") as "MALE" | "FEMALE";
    const division =
      cleanClassName.toUpperCase().startsWith("SS") || cleanClassName.toUpperCase().startsWith("JSS")
        ? "SECONDARY"
        : "PRIMARY";

    const { ca1, ca2, exam, subTotal, grade, remark } = normalizeCaAndExamScores(row);
    totalSubmittedSum += subTotal;

    const existingPrismaResult = await prisma.terminalResult
      .findFirst({
        where: {
          admNo,
          session: cleanSession,
          term: cleanTerm,
        },
      })
      .catch(() => null);

    let existingPayload: PreparedResultPayload | null = null;
    let existingIsPublished = false;

    if (existingPrismaResult?.resultPayload) {
      existingIsPublished = Boolean(existingPrismaResult.isPublished);
      try {
        existingPayload = JSON.parse(existingPrismaResult.resultPayload);
      } catch {}
    }

    if (!existingPayload) {
      const localItem = localStore.find(
        (i) =>
          i.admNo.trim().toUpperCase() === admNo &&
          i.session.trim().toUpperCase() === cleanSession.toUpperCase() &&
          i.term.trim().toUpperCase() === cleanTerm.toUpperCase()
      );
      if (localItem?.resultPayload) {
        existingIsPublished = Boolean(localItem.isPublished);
        try {
          existingPayload = JSON.parse(localItem.resultPayload);
        } catch {}
      }
    }

    // Resolve canonical class & arm for this student so uploading a general subject (e.g. "SS 2" Maths)
    // never overwrites or strips a student's specific stream (e.g. "SS 2 (Science)")!
    const existingParsed = parseClassAndArm(existingPayload?.className, existingPayload?.arm);
    const regParsed = parseClassAndArm(registered?.currentClass, registered?.arm);
    const resolvedBaseLevel =
      courseParsed.baseLevel || regParsed.baseLevel || existingParsed.baseLevel || cleanClassName;
    const resolvedArm =
      regParsed.arm || existingParsed.arm || courseParsed.arm || "";
    const resolvedStudentClassName = formatClassWithArm(resolvedBaseLevel, resolvedArm) || cleanClassName;
    touchedStudentClasses.add(resolvedStudentClassName);

    // If the student was registered without an arm, and this course has an explicit arm (e.g. "Science"),
    // auto-backfill the student's arm in the registry so future lookups know their stream!
    if (registered && !regParsed.arm && courseParsed.arm) {
      prisma.student
        .update({
          where: { admNo },
          data: { arm: courseParsed.arm },
        })
        .catch(() => {});
    }

    // If shouldPublish is true (Admin explicitly publishing), set true; otherwise keep in Draft (false) unless Admin already published
    const targetIsPublished = shouldPublish ? true : false;

    const newSubjectItem: PreparedSubjectScore = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      subjectName: subjectName.trim(),
      subjectCode: effectiveSubjectCode,
      category: effectiveCategory,
      ca1,
      ca2,
      exam,
      totalScore: subTotal,
      term3Total: isThirdTerm ? subTotal : undefined,
      grade,
      remark,
    };

    if (existingPayload && Array.isArray(existingPayload.subjects)) {
      const subjects = [...existingPayload.subjects];
      const existingSubIndex = subjects.findIndex(
        (s) => s.subjectName.trim().toLowerCase() === subjectName.trim().toLowerCase()
      );

      if (existingSubIndex >= 0) {
        subjects[existingSubIndex] = {
          ...subjects[existingSubIndex],
          ca1,
          ca2,
          exam,
          totalScore: subTotal,
          grade,
          remark,
          term3Total: isThirdTerm ? subTotal : subjects[existingSubIndex].term3Total,
        };
      } else {
        subjects.push(newSubjectItem);
      }

      const totalScore = subjects.reduce((sum, s) => sum + (s.totalScore || 0), 0);
      const totalPossible = subjects.length * 100;
      const average = subjects.length > 0 ? parseFloat((totalScore / subjects.length).toFixed(2)) : 0;
      const decision =
        average >= 50
          ? isThirdTerm
            ? `PROMOTED TO ${existingPayload.nextClass || "NEXT CLASS"}`
            : "PASSED"
          : "ADVISED TO REPEAT";

      const updatedPayload: PreparedResultPayload = {
        ...existingPayload,
        studentName: studentName || existingPayload.studentName,
        className: resolvedStudentClassName,
        arm: resolvedArm || existingPayload.arm || undefined,
        subjects,
        decision: existingPayload.decision || decision,
      };

      saveToLocalTerminalResultsStore(updatedPayload, { isPublished: targetIsPublished });

      await prisma.terminalResult
        .upsert({
          where: {
            admNo_session_term: {
              admNo,
              session: cleanSession,
              term: cleanTerm,
            },
          },
          update: {
            studentName,
            className: resolvedStudentClassName,
            totalScore,
            totalPossible,
            average,
            resultPayload: JSON.stringify(updatedPayload),
            isPublished: targetIsPublished,
            updatedAt: new Date(),
          },
          create: {
            admNo,
            studentName,
            className: resolvedStudentClassName,
            session: cleanSession,
            term: cleanTerm,
            termLabel: `${cleanTerm} (${cleanSession})`,
            totalScore,
            totalPossible,
            average,
            position: existingPayload.position || 1,
            numberInClass: existingPayload.numberInClass || scores.length,
            nextClass: existingPayload.nextClass || "Next Class",
            nextTermBegins: existingPayload.nextTermBegins || "Monday, 14th September 2026",
            decision,
            teacherRemark: existingPayload.teacherRemark || "Commendable dedication.",
            principalRemark: existingPayload.principalRemark || "Promoted with distinction.",
            resultPayload: JSON.stringify(updatedPayload),
            isPublished: targetIsPublished,
          },
        })
        .catch((err) => {
          console.warn("Prisma upsert warning (local store preserved):", err.message);
        });
    } else {
      const subjects = [newSubjectItem];
      const totalScore = subTotal;
      const totalPossible = 100;
      const average = subTotal;
      const decision = average >= 50 ? (isThirdTerm ? "PROMOTED" : "PASSED") : "ADVISED TO REPEAT";

      const initialPayload: PreparedResultPayload = {
        studentName,
        admNo,
        className: resolvedStudentClassName,
        arm: resolvedArm || undefined,
        session: cleanSession,
        term: cleanTerm,
        termLabel: `${cleanTerm} (${cleanSession})`,
        gender: studentGender,
        division,
        numberInClass: scores.length,
        position: 1,
        daysOpened: 115,
        daysPresent: 112,
        daysAbsent: 3,
        decision,
        nextClass: "Next Class",
        nextTermBegins: "Monday, 14th September 2026",
        teacherRemark: "Good performance in continuous assessments and exams.",
        principalRemark: "Commendable academic effort. Keep it up!",
        formMasterName: payload.teacherName || "Subject Teacher",
        principalName: "Hon Okolie Peter Isioma JP MCArb (Director)",
        skills: DEFAULT_PREPARED_SKILLS,
        behaviour: DEFAULT_PREPARED_BEHAVIOUR,
        feeInfo: DEFAULT_PREPARED_FEE,
        subjects,
      };

      saveToLocalTerminalResultsStore(initialPayload, { isPublished: targetIsPublished });

      await prisma.terminalResult
        .upsert({
          where: {
            admNo_session_term: {
              admNo,
              session: cleanSession,
              term: cleanTerm,
            },
          },
          update: {
            studentName,
            className: resolvedStudentClassName,
            totalScore,
            totalPossible,
            average,
            resultPayload: JSON.stringify(initialPayload),
            isPublished: targetIsPublished,
            updatedAt: new Date(),
          },
          create: {
            admNo,
            studentName,
            className: resolvedStudentClassName,
            session: cleanSession,
            term: cleanTerm,
            termLabel: `${cleanTerm} (${cleanSession})`,
            totalScore,
            totalPossible,
            average,
            position: 1,
            numberInClass: scores.length,
            nextClass: "Next Class",
            nextTermBegins: "Monday, 14th September 2026",
            decision,
            teacherRemark: initialPayload.teacherRemark,
            principalRemark: initialPayload.principalRemark,
            resultPayload: JSON.stringify(initialPayload),
            isPublished: targetIsPublished,
          },
        })
        .catch((err) => {
          console.warn("Prisma create warning (local store preserved):", err.message);
        });
    }

    updatedCount++;
  }

  try {
    for (const cls of Array.from(touchedStudentClasses)) {
      await autoRankCohortPositionsAction(cls, cleanSession, cleanTerm);
    }
  } catch (e) {
    console.warn("Auto-ranking warning:", e);
  }

  const classAverage =
    updatedCount > 0 ? parseFloat((totalSubmittedSum / updatedCount).toFixed(1)) : undefined;

  return { updatedCount, classAverage };
}

/**
 * Save 1st CA, 2nd CA, and/or Exam Scores as a Draft (Pending Exam or Pending Admin Final Finishing)
 * Also compiles the scores into the students' Draft TerminalResult dossiers (`isPublished: false`)
 * so Super Admin can see and finalize all subjects effortlessly in the Result Preparation Desk.
 */
export async function saveTeacherSubjectDraftAction(
  payload: SyncDelegatedSubjectScoresInput
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  savedCount: number;
  pendingExamCount: number;
  updatedAt?: string;
}> {
  try {
    const {
      className,
      subjectName,
      session = "2025/2026",
      term = "Third Term",
      teacherName,
      teacherEmail,
      scores,
    } = payload;

    if (!className || !className.trim()) {
      return { success: false, error: "Target Class is required.", savedCount: 0, pendingExamCount: 0 };
    }
    if (!subjectName || !subjectName.trim()) {
      return { success: false, error: "Subject Name is required.", savedCount: 0, pendingExamCount: 0 };
    }
    if (!Array.isArray(scores) || scores.length === 0) {
      return { success: false, error: "Please enter at least one student score (1st CA, 2nd CA, or Exam) before saving draft.", savedCount: 0, pendingExamCount: 0 };
    }

    // Verify course ownership for teachers
    const ownership = await verifyTeacherCourseOwnership(subjectName, className, teacherEmail);
    if (!ownership.allowed) {
      return {
        success: false,
        error: ownership.error,
        savedCount: 0,
        pendingExamCount: 0,
      };
    }

    const cleanClassName = className.trim();
    const cleanSubjectName = subjectName.trim();
    const cleanSession = session.trim();
    const cleanTerm = term.trim();
    const draftKey = buildDraftKey(cleanClassName, cleanSubjectName, cleanSession, cleanTerm);

    let pendingExamCount = 0;
    const normalizedScores: DelegatedScoreRow[] = [];

    for (const row of scores) {
      const admNo = (row.admNo || "").trim().toUpperCase();
      if (!admNo) continue;

      const norm = normalizeCaAndExamScores(row);
      if (norm.isExamPending) {
        pendingExamCount++;
      }

      normalizedScores.push({
        admNo,
        studentName: (row.studentName || "").trim(),
        caTotal: norm.caTotal,
        ca1: norm.ca1,
        ca2: norm.ca2,
        exam: norm.isExamPending ? null : norm.exam,
        isExamPending: norm.isExamPending,
        totalScore: norm.subTotal,
        grade: norm.grade,
        remark: norm.remark,
      });
    }

    const status: StoredSubjectDraftRecord["status"] =
      pendingExamCount > 0 ? "CA_DRAFT_PENDING_EXAM" : "DRAFT_PENDING_ADMIN";
    const nowIso = new Date().toISOString();

    const verifiedTeacherEmail = ownership.isSuperAdmin
      ? teacherEmail || ownership.sessionEmail
      : ownership.sessionEmail;
    const verifiedTeacherName = ownership.isSuperAdmin
      ? teacherName || ownership.sessionName
      : ownership.sessionName;

    const record: StoredSubjectDraftRecord = {
      draftKey,
      className: cleanClassName,
      subjectName: cleanSubjectName,
      session: cleanSession,
      term: cleanTerm,
      teacherEmail: verifiedTeacherEmail,
      teacherName: verifiedTeacherName,
      status,
      scores: normalizedScores,
      updatedAt: nowIso,
    };

    // 1. Save to Local JSON Store
    writeLocalScoreDraft(record);

    // 2. Save to PostgreSQL auto-healed table
    await ensureDraftTableExists();
    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "teacher_ca_score_drafts" (
          "draft_key", "class_name", "subject_name", "session", "term",
          "teacher_email", "teacher_name", "status", "scores_json", "updated_at"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT ("draft_key") DO UPDATE SET
          "class_name" = EXCLUDED."class_name",
          "subject_name" = EXCLUDED."subject_name",
          "teacher_email" = EXCLUDED."teacher_email",
          "teacher_name" = EXCLUDED."teacher_name",
          "status" = EXCLUDED."status",
          "scores_json" = EXCLUDED."scores_json",
          "updated_at" = NOW();
        `,
        draftKey,
        cleanClassName,
        cleanSubjectName,
        cleanSession,
        cleanTerm,
        verifiedTeacherEmail || null,
        verifiedTeacherName || null,
        status,
        JSON.stringify(normalizedScores)
      );
    } catch (dbErr) {
      console.warn("Draft saved to local store (DB table fallback):", dbErr);
    }

    // 3. Also compile into students' Draft TerminalResult dossiers (`isPublished: false`)
    // so Admin sees all teacher drafts pre-assembled in the Result Preparation Desk!
    await mergeCourseScoresIntoStudentDossiers(
      {
        ...payload,
        scores: normalizedScores,
      },
      false // Keep in DRAFT pending Admin finalization
    );

    revalidatePath("/staff");
    revalidatePath("/admin");
    revalidatePath("/admin/cbt");

    return {
      success: true,
      savedCount: normalizedScores.length,
      pendingExamCount,
      updatedAt: nowIso,
      message:
        pendingExamCount > 0
          ? `1st CA / 2nd CA Draft saved for ${normalizedScores.length} student(s) in ${cleanSubjectName} (${cleanClassName}) — ${pendingExamCount} pending Exam score. Pre-staged in Admin Result Preparation Desk as Draft.`
          : `1st CA, 2nd CA & Exam Draft saved for ${normalizedScores.length} student(s) in ${cleanSubjectName} (${cleanClassName}) — Pending Admin final finishing!`,
    };
  } catch (err: any) {
    console.error("saveTeacherSubjectDraftAction error:", err);
    return {
      success: false,
      savedCount: 0,
      pendingExamCount: 0,
      error: sanitizeErrorMessage(err, "Failed to save draft."),
    };
  }
}

/**
 * Loads saved 1st CA, 2nd CA & Exam Draft scores (or published scores) for a course
 * so teachers can seamlessly resume entering 2nd CA or Exam scores later.
 */
export async function getTeacherSubjectDraftOrPublishedScoresAction(params: {
  className: string;
  subjectName: string;
  session?: string;
  term?: string;
}): Promise<{
  success: boolean;
  hasDraft: boolean;
  status?:
    | "CA_DRAFT_PENDING_EXAM"
    | "DRAFT_PENDING_ADMIN"
    | "DRAFT_COMPLETE"
    | "PUBLISHED"
    | "NONE";
  updatedAt?: string;
  scores: DelegatedScoreRow[];
}> {
  try {
    const cleanClassName = (params.className || "").trim();
    const cleanSubjectName = (params.subjectName || "").trim();
    const cleanSession = (params.session || "2025/2026").trim();
    const cleanTerm = (params.term || "Third Term").trim();

    if (!cleanClassName || !cleanSubjectName) {
      return { success: true, hasDraft: false, status: "NONE", scores: [] };
    }

    const ownership = await verifyTeacherCourseOwnership(cleanSubjectName, cleanClassName);
    if (!ownership.allowed) {
      return { success: false, hasDraft: false, status: "NONE", scores: [] };
    }

    const draftKey = buildDraftKey(cleanClassName, cleanSubjectName, cleanSession, cleanTerm);

    // 1. Check PostgreSQL draft table first
    await ensureDraftTableExists();
    let dbDraft: StoredSubjectDraftRecord | null = null;
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "teacher_ca_score_drafts" WHERE "draft_key" = $1 LIMIT 1`,
        draftKey
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        dbDraft = {
          draftKey: r.draft_key,
          className: r.class_name,
          subjectName: r.subject_name,
          session: r.session,
          term: r.term,
          teacherEmail: r.teacher_email,
          teacherName: r.teacher_name,
          status: r.status || "CA_DRAFT_PENDING_EXAM",
          scores: JSON.parse(r.scores_json || "[]"),
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        };
      }
    } catch {
      // Fallback to local JSON store
    }

    // 2. Check Local JSON Store
    const localDrafts = readLocalScoreDrafts();
    const localDraft = localDrafts.find((d) => d.draftKey === draftKey) || null;

    const activeDraft = dbDraft || localDraft;
    if (activeDraft && Array.isArray(activeDraft.scores) && activeDraft.scores.length > 0) {
      return {
        success: true,
        hasDraft: true,
        status: activeDraft.status,
        updatedAt: activeDraft.updatedAt,
        scores: activeDraft.scores,
      };
    }

    // 3. If no draft exists, check if scores exist in TerminalResult (Draft or Published) for this class/subject
    const existingRows: DelegatedScoreRow[] = [];
    let anyPublished = false;
    const prismaResults = await prisma.terminalResult
      .findMany({
        where: {
          session: cleanSession,
          term: cleanTerm,
        },
        select: {
          admNo: true,
          studentName: true,
          className: true,
          resultPayload: true,
          isPublished: true,
        },
      })
      .catch(() => []);

    const filteredPrismaResults = prismaResults.filter((r) =>
      doesStudentMatchClassFilter(r.className, undefined, cleanClassName)
    );

    const sourceList =
      filteredPrismaResults.length > 0
        ? filteredPrismaResults
        : getLocalTerminalResultsStore().filter(
            (r) =>
              doesStudentMatchClassFilter(r.className, undefined, cleanClassName) &&
              r.session.trim().toLowerCase() === cleanSession.toLowerCase() &&
              r.term.trim().toLowerCase() === cleanTerm.toLowerCase()
          );

    for (const item of sourceList) {
      if (!item.resultPayload) continue;
      if (item.isPublished !== false) anyPublished = true;
      try {
        const parsed: PreparedResultPayload = JSON.parse(item.resultPayload);
        const sub = (parsed.subjects || []).find(
          (s) => s.subjectName.trim().toLowerCase() === cleanSubjectName.toLowerCase()
        );
        if (sub) {
          const ca1 = Number(sub.ca1) || 0;
          const ca2 = Number(sub.ca2) || 0;
          const exam = Number(sub.exam) || 0;
          existingRows.push({
            admNo: item.admNo.trim().toUpperCase(),
            studentName: item.studentName,
            caTotal: ca1 + ca2,
            ca1,
            ca2,
            exam,
            isExamPending: false,
            totalScore: sub.totalScore || ca1 + ca2 + exam,
            grade: sub.grade || "C",
            remark: sub.remark || "Credit",
          });
        }
      } catch {}
    }

    if (existingRows.length > 0) {
      return {
        success: true,
        hasDraft: true,
        status: anyPublished ? "PUBLISHED" : "DRAFT_PENDING_ADMIN",
        scores: existingRows,
      };
    }

    return {
      success: true,
      hasDraft: false,
      status: "NONE",
      scores: [],
    };
  } catch (err) {
    console.error("getTeacherSubjectDraftOrPublishedScoresAction error:", err);
    return {
      success: false,
      hasDraft: false,
      status: "NONE",
      scores: [],
    };
  }
}

/**
 * Delegated Subject Scores Sync:
 * - When called by a TEACHER: Submits 1st CA, 2nd CA, and Exam scores into the students'
 *   TerminalResult dossiers as a DRAFT (`isPublished: false`) pending Admin final finishing!
 * - When called by SUPER_ADMIN: Saves as Draft or Publishes immediately (`publishImmediately: true`).
 */
export async function syncTeacherSubjectScoresAction(
  payload: SyncDelegatedSubjectScoresInput
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  updatedCount: number;
  classAverage?: number;
  isDraftPendingAdmin?: boolean;
}> {
  try {
    const {
      className,
      subjectName,
      session = "2025/2026",
      term = "Third Term",
      scores,
    } = payload;

    if (!className || !className.trim()) {
      return { success: false, error: "Target Class is required.", updatedCount: 0 };
    }
    if (!subjectName || !subjectName.trim()) {
      return { success: false, error: "Subject Name is required.", updatedCount: 0 };
    }
    if (!Array.isArray(scores) || scores.length === 0) {
      return { success: false, error: "No student score records provided.", updatedCount: 0 };
    }

    // Strict Course Ownership check for Teachers
    const ownership = await verifyTeacherCourseOwnership(subjectName, className, payload.teacherEmail);
    if (!ownership.allowed) {
      return {
        success: false,
        error: ownership.error,
        updatedCount: 0,
      };
    }

    // Teachers ALWAYS submit as Draft pending Admin finalization; only Super Admin can publish immediately
    const shouldPublish = ownership.isSuperAdmin && payload.publishImmediately === true;

    const cleanClassName = className.trim();
    const cleanSubjectName = subjectName.trim();
    const cleanSession = session.trim();
    const cleanTerm = term.trim();

    // 1. Merge scores into student TerminalResult dossiers (as Draft if teacher, or Published if Admin requested)
    const { updatedCount, classAverage } = await mergeCourseScoresIntoStudentDossiers(
      payload,
      shouldPublish
    );

    // 2. Save/update the course draft record status
    const draftKey = buildDraftKey(cleanClassName, cleanSubjectName, cleanSession, cleanTerm);
    const normalizedScores: DelegatedScoreRow[] = scores.map((r) => {
      const norm = normalizeCaAndExamScores(r);
      return {
        admNo: (r.admNo || "").trim().toUpperCase(),
        studentName: (r.studentName || "").trim(),
        caTotal: norm.caTotal,
        ca1: norm.ca1,
        ca2: norm.ca2,
        exam: norm.isExamPending ? null : norm.exam,
        isExamPending: norm.isExamPending,
        totalScore: norm.subTotal,
        grade: norm.grade,
        remark: norm.remark,
      };
    });

    const newStatus: StoredSubjectDraftRecord["status"] = shouldPublish
      ? "PUBLISHED"
      : normalizedScores.some((s) => s.isExamPending)
      ? "CA_DRAFT_PENDING_EXAM"
      : "DRAFT_PENDING_ADMIN";

    const verifiedTeacherEmail = ownership.isSuperAdmin
      ? payload.teacherEmail || ownership.sessionEmail
      : ownership.sessionEmail;
    const verifiedTeacherName = ownership.isSuperAdmin
      ? payload.teacherName || ownership.sessionName
      : ownership.sessionName;

    const draftRecord: StoredSubjectDraftRecord = {
      draftKey,
      className: cleanClassName,
      subjectName: cleanSubjectName,
      session: cleanSession,
      term: cleanTerm,
      teacherEmail: verifiedTeacherEmail,
      teacherName: verifiedTeacherName,
      status: newStatus,
      scores: normalizedScores,
      updatedAt: new Date().toISOString(),
    };

    writeLocalScoreDraft(draftRecord);
    await ensureDraftTableExists();
    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "teacher_ca_score_drafts" (
          "draft_key", "class_name", "subject_name", "session", "term",
          "teacher_email", "teacher_name", "status", "scores_json", "updated_at"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT ("draft_key") DO UPDATE SET
          "status" = EXCLUDED."status",
          "scores_json" = EXCLUDED."scores_json",
          "updated_at" = NOW();
        `,
        draftKey,
        cleanClassName,
        cleanSubjectName,
        cleanSession,
        cleanTerm,
        verifiedTeacherEmail || null,
        verifiedTeacherName || null,
        newStatus,
        JSON.stringify(normalizedScores)
      );
    } catch {}

    revalidatePath("/admin");
    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    revalidatePath("/result");

    return {
      success: true,
      updatedCount,
      classAverage,
      isDraftPendingAdmin: !shouldPublish,
      message: shouldPublish
        ? `Successfully finalized & published ${cleanSubjectName} (1st CA, 2nd CA & Exam) scores for ${updatedCount} students in ${cleanClassName}!`
        : `Successfully submitted ${cleanSubjectName} (1st CA, 2nd CA & Exam) scores for ${updatedCount} students in ${cleanClassName} as a DRAFT pending Admin final finishing!`,
    };
  } catch (err: any) {
    console.error("Sync delegated subject scores error:", err);
    return {
      success: false,
      updatedCount: 0,
      error: sanitizeErrorMessage(err, "Failed to sync scores."),
    };
  }
}

/**
 * Super Admin: Fetch all teacher-uploaded course drafts across classes & subjects
 * so Admin can inspect teacher progress (1st CA, 2nd CA, Exam) and finalize in 1 click.
 */
export async function getAllTeacherCourseDraftsForAdminAction(params?: {
  className?: string;
  session?: string;
  term?: string;
}): Promise<{
  success: boolean;
  drafts: Array<
    StoredSubjectDraftRecord & {
      ca1Count: number;
      ca2Count: number;
      examCount: number;
    }
  >;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, drafts: [] };
    }

    await ensureDraftTableExists();
    const map = new Map<string, StoredSubjectDraftRecord>();

    // 1. Read from local store
    for (const d of readLocalScoreDrafts()) {
      map.set(d.draftKey, d);
    }

    // 2. Read from DB table
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "teacher_ca_score_drafts" ORDER BY "updated_at" DESC`
      );
      for (const r of rows || []) {
        map.set(r.draft_key, {
          draftKey: r.draft_key,
          className: r.class_name,
          subjectName: r.subject_name,
          session: r.session,
          term: r.term,
          teacherEmail: r.teacher_email,
          teacherName: r.teacher_name,
          status: r.status || "DRAFT_PENDING_ADMIN",
          scores: JSON.parse(r.scores_json || "[]"),
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        });
      }
    } catch {}

    let list = Array.from(map.values());
    if (params?.className && params.className !== "ALL") {
      const targetFilter = params.className.trim();
      list = list.filter(
        (d) =>
          doesStudentMatchClassFilter(d.className, undefined, targetFilter) ||
          doesExamTargetMatchStudent(d.className, targetFilter)
      );
    }
    if (params?.session) {
      const targetSess = params.session.trim().toLowerCase();
      list = list.filter((d) => d.session.trim().toLowerCase() === targetSess);
    }
    if (params?.term) {
      const targetTerm = params.term.trim().toLowerCase();
      list = list.filter((d) => d.term.trim().toLowerCase() === targetTerm);
    }

    const enriched = list.map((d) => {
      const scores = Array.isArray(d.scores) ? d.scores : [];
      const ca1Count = scores.filter((s) => Number(s.ca1) > 0).length;
      const ca2Count = scores.filter((s) => Number(s.ca2) > 0).length;
      const examCount = scores.filter((s) => !s.isExamPending && s.exam !== null && s.exam !== undefined).length;
      return {
        ...d,
        ca1Count,
        ca2Count,
        examCount,
      };
    });

    return { success: true, drafts: enriched };
  } catch (err) {
    console.error("getAllTeacherCourseDraftsForAdminAction error:", err);
    return { success: false, drafts: [] };
  }
}

/**
 * Super Admin: 1-Click Finalize & Publish Draft Results
 * Compiles any pending teacher course drafts into student dossiers, auto-ranks positions,
 * and marks all matching student TerminalResult dossiers as Published (`isPublished: true`).
 */
export async function finalizeAndPublishClassDraftResultsAction(params: {
  className?: string;
  session?: string;
  term?: string;
  admNos?: string[];
}): Promise<{
  success: boolean;
  publishedCount: number;
  message?: string;
  error?: string;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, publishedCount: 0, error: auth.error };
    }

    const cleanClass = params.className && params.className !== "ALL" ? params.className.trim() : "";
    const cleanSession = (params.session || "2025/2026").trim();
    const cleanTerm = (params.term || "Third Term").trim();
    const targetAdmSet =
      Array.isArray(params.admNos) && params.admNos.length > 0
        ? new Set(params.admNos.map((a) => a.trim().toUpperCase()))
        : null;

    // 1. Ensure all teacher course drafts for this filter are merged into student dossiers
    const { drafts } = await getAllTeacherCourseDraftsForAdminAction({
      className: cleanClass || undefined,
      session: cleanSession,
      term: cleanTerm,
    });

    for (const draft of drafts) {
      if (draft.scores && draft.scores.length > 0) {
        await mergeCourseScoresIntoStudentDossiers(
          {
            className: draft.className,
            subjectName: draft.subjectName,
            session: draft.session,
            term: draft.term,
            teacherName: draft.teacherName,
            teacherEmail: draft.teacherEmail,
            scores: draft.scores,
          },
          true
        );
      }
    }

    // 2. Flip `isPublished = true` on all matching records in Local Store
    const localItems = getLocalTerminalResultsStore();
    const touchedClasses = new Set<string>();
    let publishedCount = 0;

    for (const item of localItems) {
      let itemArm: string | undefined = undefined;
      try {
        if (item.resultPayload) {
          const p = JSON.parse(item.resultPayload);
          itemArm = p?.student?.arm;
        }
      } catch {}
      const classMatches =
        !cleanClass || doesStudentMatchClassFilter(item.className, itemArm, cleanClass);
      const sessMatches =
        !cleanSession || item.session.trim().toLowerCase() === cleanSession.toLowerCase();
      const termMatches =
        !cleanTerm || item.term.trim().toLowerCase() === cleanTerm.toLowerCase();
      const admMatches =
        !targetAdmSet || targetAdmSet.has(item.admNo.trim().toUpperCase());

      if (classMatches && sessMatches && termMatches && admMatches) {
        item.isPublished = true;
        item.updatedAt = new Date().toISOString();
        touchedClasses.add(`${item.className}|||${item.session}|||${item.term}`);
        publishedCount++;
      }
    }
    saveAllToLocalTerminalResultsStore(localItems);

    // 3. Flip `isPublished = true` in PostgreSQL
    try {
      const dbRecords = await prisma.terminalResult.findMany({
        where: {
          ...(cleanSession ? { session: { equals: cleanSession, mode: "insensitive" } } : {}),
          ...(cleanTerm ? { term: { equals: cleanTerm, mode: "insensitive" } } : {}),
        },
      });

      let matchedDbCount = 0;
      for (const rec of dbRecords) {
        if (cleanClass && !doesStudentMatchClassFilter(rec.className, undefined, cleanClass)) {
          continue;
        }
        if (targetAdmSet && !targetAdmSet.has(rec.admNo.trim().toUpperCase())) {
          continue;
        }
        matchedDbCount++;
        touchedClasses.add(`${rec.className}|||${rec.session}|||${rec.term}`);
        await prisma.terminalResult.update({
          where: { id: rec.id },
          data: { isPublished: true, updatedAt: new Date() },
        });
      }
      if (matchedDbCount > publishedCount) {
        publishedCount = matchedDbCount;
      }
    } catch {}

    // 4. Auto-rank positions for all touched classes
    for (const cohortKey of Array.from(touchedClasses)) {
      const [cls, sess, trm] = cohortKey.split("|||");
      await autoRankCohortPositionsAction(cls, sess, trm).catch(() => {});
    }

    // 5. Mark matching teacher course drafts as PUBLISHED
    for (const draft of drafts) {
      if (!targetAdmSet) {
        const updatedDraft: StoredSubjectDraftRecord = {
          ...draft,
          status: "PUBLISHED",
          updatedAt: new Date().toISOString(),
        };
        writeLocalScoreDraft(updatedDraft);
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "teacher_ca_score_drafts" SET "status" = 'PUBLISHED', "updated_at" = NOW() WHERE "draft_key" = $1`,
            draft.draftKey
          );
        } catch {}
      }
    }

    revalidatePath("/admin");
    revalidatePath("/admin/cbt");
    revalidatePath("/staff");
    revalidatePath("/result");

    return {
      success: true,
      publishedCount,
      message: `Successfully finalized and published ${publishedCount} student terminal result dossier(s)! Class positions have been ranked and report cards are now live.`,
    };
  } catch (err: any) {
    console.error("finalizeAndPublishClassDraftResultsAction error:", err);
    return {
      success: false,
      publishedCount: 0,
      error: sanitizeErrorMessage(err, "Failed to finalize and publish draft results."),
    };
  }
}

/**
 * Fetch students for a specific class to generate the pre-filled template
 */
export async function getClassStudentsForDelegationAction(
  className: string
): Promise<{
  success: boolean;
  students: Array<{ admNo: string; fullName: string; currentClass: string; arm?: string; gender?: string }>;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, students: [] };
    }

    const cleanClass = (className || "").trim();
    const parsedTarget = parseClassAndArm(cleanClass);
    const allStudents = await prisma.student.findMany({
      where:
        parsedTarget.baseLevel && cleanClass.toLowerCase() !== "all"
          ? { currentClass: { contains: parsedTarget.baseLevel, mode: "insensitive" } }
          : {},
      select: { admNo: true, fullName: true, currentClass: true, arm: true, gender: true },
      orderBy: { fullName: "asc" },
    });

    let matched = allStudents.filter((s) =>
      doesStudentMatchClassFilter(s.currentClass, s.arm, cleanClass)
    );

    // Graceful fallback: if a stream-specific class is selected (e.g. "SS 2 (Science)")
    // and no students have been tagged with "Science" yet, include unassigned students of that base level ("SS 2")
    // while still excluding students explicitly tagged in another stream (e.g. "Art").
    if (matched.length === 0 && parsedTarget.arm && parsedTarget.baseLevel) {
      matched = allStudents.filter((s) => {
        const p = parseClassAndArm(s.currentClass, s.arm);
        return p.baseLevel === parsedTarget.baseLevel && !p.arm;
      });
    }

    return {
      success: true,
      students: matched.map((s) => {
        const parsed = parseClassAndArm(s.currentClass, s.arm);
        return {
          admNo: s.admNo,
          fullName: s.fullName,
          currentClass: formatClassWithArm(s.currentClass, s.arm),
          arm: parsed.arm || undefined,
          gender: s.gender || undefined,
        };
      }),
    };
  } catch {
    const localStore = getLocalTerminalResultsStore();
    const map = new Map<string, { admNo: string; fullName: string; currentClass: string; arm?: string }>();
    localStore.forEach((r) => {
      if (!className || doesStudentMatchClassFilter(r.className, undefined, className)) {
        const parsed = parseClassAndArm(r.className);
        map.set(r.admNo.toUpperCase(), {
          admNo: r.admNo,
          fullName: r.studentName,
          currentClass: formatClassWithArm(r.className),
          arm: parsed.arm || undefined,
        });
      }
    });

    return { success: true, students: Array.from(map.values()) };
  }
}

/**
 * Auto-Import CBT Exam Scores:
 * Fetches completed CBT exam attempts for a specific class and subject,
 * allowing teachers to auto-populate their CA or Exam marks by Student Reg Number.
 */
export async function fetchCbtExamAttemptsForSubjectAction(params: {
  className: string;
  subjectName: string;
}): Promise<{
  success: boolean;
  exams: Array<{ id: number; title: string; subject: string; targetClass: string; attemptsCount: number }>;
  attempts: Array<{
    admNo: string;
    studentName: string;
    examId: number;
    examTitle: string;
    objectiveScore: number;
    theoryScore: number | null;
    totalScore: number;
  }>;
  error?: string;
}> {
  try {
    const cleanClass = (params.className || "").trim();
    const parsedTarget = parseClassAndArm(cleanClass);
    const baseLevelToken = parsedTarget.baseLevel || cleanClass;
    const cleanSubject = (params.subjectName || "").trim().toLowerCase();

    const ownership = await verifyTeacherCourseOwnership(params.subjectName || "", cleanClass);
    if (!ownership.allowed) {
      return {
        success: false,
        exams: [],
        attempts: [],
        error: ownership.error,
      };
    }

    const candidateExams = await prisma.exam.findMany({
      where:
        baseLevelToken && baseLevelToken.toLowerCase() !== "all"
          ? {
              targetClass: { contains: baseLevelToken, mode: "insensitive" },
              ...(cleanSubject
                ? { subject: { contains: cleanSubject.substring(0, 4), mode: "insensitive" } }
                : {}),
            }
          : {},
      select: {
        id: true,
        title: true,
        subject: true,
        targetClass: true,
        _count: {
          select: { attempts: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const matchingExams = candidateExams.filter(
      (e) =>
        !cleanClass ||
        cleanClass.toLowerCase() === "all" ||
        doesExamTargetMatchStudent(e.targetClass, parsedTarget.baseLevel || cleanClass, parsedTarget.arm) ||
        doesStudentMatchClassFilter(e.targetClass, undefined, cleanClass)
    );

    const examIds = matchingExams.map((e) => e.id);

    if (examIds.length === 0) {
      return {
        success: true,
        exams: [],
        attempts: [],
      };
    }

    const attempts = await prisma.examAttempt.findMany({
      where: {
        isCompleted: true,
        examId: { in: examIds },
      },
      include: {
        student: true,
        exam: true,
      },
      orderBy: { totalScore: "desc" },
    });

    const mappedAttempts = attempts.map((att) => ({
      admNo: (att.student?.admNo || "").trim().toUpperCase(),
      studentName: att.student?.fullName || "Student",
      examId: att.examId,
      examTitle: att.exam?.title || "Exam Paper",
      objectiveScore: att.objectiveScore || 0,
      theoryScore: att.theoryScore !== null ? att.theoryScore : null,
      totalScore: att.totalScore || 0,
    }));

    return {
      success: true,
      exams: matchingExams.map((e) => ({
        id: e.id,
        title: e.title,
        subject: e.subject,
        targetClass: e.targetClass,
        attemptsCount: e._count.attempts,
      })),
      attempts: mappedAttempts,
    };
  } catch (err: any) {
    console.error("Fetch CBT exam attempts for subject error:", err);
    return {
      success: false,
      exams: [],
      attempts: [],
      error: `Could not fetch CBT scores: ${err?.message || "Unknown error"}`,
    };
  }
}
