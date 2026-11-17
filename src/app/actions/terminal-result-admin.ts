"use server";

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
  findInLocalTerminalResultsStore,
  deleteFromLocalTerminalResultsStore,
  normalizeTerm,
  normalizeSession,
  getStudentUploadedTermsFromStore,
} from "@/lib/terminal-result-store";
import {
  getAdminSession,
  getResultAccessSession,
  requireAdminSession,
} from "@/lib/session";
import { findPublishedResultForLookup } from "@/lib/result-lookup";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_WINDOW_MS,
  sanitizeErrorMessage,
} from "@/lib/security";
import {
  parseClassAndArm,
  formatClassWithArm,
  doesStudentMatchClassFilter,
} from "@/lib/cbt-utils";
import {
  PerformanceRemarkTemplateTier,
  resolvePerformanceRemark,
} from "@/lib/remark-templates";
import {
  getServerRemarkTemplates,
  saveServerRemarkTemplates,
} from "@/lib/remark-template-store";

function findExistingStudentPhotoInStore(targetAdmNo: string): string | undefined {
  if (!targetAdmNo) return undefined;
  const clean = targetAdmNo.trim().toUpperCase();
  try {
    const items = getLocalTerminalResultsStore();
    for (const item of items) {
      if (item.admNo?.trim().toUpperCase() === clean && item.resultPayload) {
        try {
          const parsed = JSON.parse(item.resultPayload);
          if (parsed?.studentPhotoUrl) return parsed.studentPhotoUrl;
        } catch {}
      }
    }
  } catch {}
  return undefined;
}

/**
 * Super Admin: Save or Update a Student's Terminal Result Dossier
 */
export async function saveTerminalResultAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  resultId?: number;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN"]);
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const admNo = (formData.get("admNo") as string)?.trim().toUpperCase();
  const studentName = (formData.get("studentName") as string)?.trim();
  const rawClassName = (formData.get("className") as string)?.trim();
  const rawArm = (formData.get("arm") as string)?.trim() || "";
  const parsedClass = parseClassAndArm(rawClassName, rawArm);
  const resolvedArm = parsedClass.arm || undefined;
  const className = formatClassWithArm(rawClassName, resolvedArm) || rawClassName;
  const session = (formData.get("session") as string)?.trim() || "2025/2026";
  const term = (formData.get("term") as string)?.trim() || "Third Term";
  const termLabel = (formData.get("termLabel") as string)?.trim() || `${term} (${session})`;
  const position = parseInt((formData.get("position") as string) || "1", 10);
  const isPositionManual = formData.get("isPositionManual") === "true";
  const numberInClass = parseInt((formData.get("numberInClass") as string) || "35", 10);
  const daysOpened = parseInt((formData.get("daysOpened") as string) || "115", 10);
  const daysPresent = parseInt((formData.get("daysPresent") as string) || "112", 10);
  const daysAbsent = Math.max(daysOpened - daysPresent, 0);
  const decision = (formData.get("decision") as string)?.trim() || "PROMOTED";
  const nextClass = (formData.get("nextClass") as string)?.trim() || "";
  const nextTermBegins = (formData.get("nextTermBegins") as string)?.trim() || "Monday, 14th September 2026";
  const rawTeacherRemark = (formData.get("teacherRemark") as string)?.trim() || "";
  const rawPrincipalRemark = (formData.get("principalRemark") as string)?.trim() || "";
  const formMasterName = (formData.get("formMasterName") as string)?.trim() || "Mr. Emmanuel Eze (B.Sc Ed)";
  const principalName = (formData.get("principalName") as string)?.trim() || "Hon Okolie Peter Isioma JP MCArb (Director)";
  const gender = ((formData.get("gender") as string)?.trim() || "FEMALE") as "MALE" | "FEMALE";
  const division = (className.toUpperCase().startsWith("SS") || className.toUpperCase().startsWith("JSS")) ? "SECONDARY" : "PRIMARY";
  const classAvgInput = parseFloat((formData.get("classAverage") as string) || "0");
  let studentPhotoUrl = (formData.get("studentPhotoUrl") as string)?.trim() || undefined;
  if (!studentPhotoUrl && admNo) {
    studentPhotoUrl = findExistingStudentPhotoInStore(admNo);
  }
  const isPublished = (formData.get("isPublished") as string) !== "false";

  const rawSubjectsJson = formData.get("subjectsJson") as string;
  const rawSkillsJson = formData.get("skillsJson") as string;
  const rawBehaviourJson = formData.get("behaviourJson") as string;
  const rawFeeJson = formData.get("feeInfoJson") as string;

  if (!admNo || !studentName || !className) {
    return { success: false, error: "Student Admission Number, Name, and Class are required." };
  }

  let subjects: PreparedSubjectScore[] = [];
  try {
    if (rawSubjectsJson) {
      const parsed = JSON.parse(rawSubjectsJson);
      if (Array.isArray(parsed)) {
        subjects = parsed.map((s: any, idx: number) => {
          const ca1 = Math.min(Math.max(Number(s.ca1) || 0, 0), 15);
          const ca2 = Math.min(Math.max(Number(s.ca2) || 0, 0), 15);
          const exam = Math.min(Math.max(Number(s.exam) || 0, 0), 70);
          const totalScore = Math.min(Math.max(Math.round((ca1 + ca2 + exam) * 10) / 10, 0), 100);
          return {
            ...s,
            id: s.id || `subj-${idx + 1}`,
            subjectName: String(s.subjectName || "Subject").trim(),
            ca1,
            ca2,
            exam,
            totalScore,
          };
        });
      }
    }
  } catch {
    return { success: false, error: "Invalid subject score data payload." };
  }

  let skills = DEFAULT_PREPARED_SKILLS;
  try {
    if (rawSkillsJson) {
      skills = { ...DEFAULT_PREPARED_SKILLS, ...JSON.parse(rawSkillsJson) };
    }
  } catch {}

  let behaviour = DEFAULT_PREPARED_BEHAVIOUR;
  try {
    if (rawBehaviourJson) {
      behaviour = { ...DEFAULT_PREPARED_BEHAVIOUR, ...JSON.parse(rawBehaviourJson) };
    }
  } catch {}

  let feeInfo = { ...DEFAULT_PREPARED_FEE };
  try {
    if (rawFeeJson) {
      feeInfo = { ...DEFAULT_PREPARED_FEE, ...JSON.parse(rawFeeJson) };
    }
  } catch {}

  // Strip legacy dummy account number if present
  if (feeInfo.accountNumber === "1014529088") {
    feeInfo.accountNumber = "";
  }
  if (feeInfo.bankName === "Zenith Bank PLC" && !feeInfo.accountNumber) {
    feeInfo.bankName = "";
  }

  // Calculate totals and averages dynamically based on scores
  const totalScore = subjects.reduce((sum, s) => sum + (s.totalScore || 0), 0);
  const totalPossible = subjects.length * 100;
  const isThirdTerm = term.toLowerCase().includes("third");
  const hasCumulative = isThirdTerm && subjects.some((s) => s.cumulativeScore !== undefined || (s.term1Score !== undefined && s.term1Score !== null) || (s.term2Score !== undefined && s.term2Score !== null));
  const cumulativeTotal = hasCumulative
    ? subjects.reduce((sum, s) => {
        const thirdTot = s.term3Total ?? s.totalScore ?? 0;
        const hasT1 = s.term1Score !== undefined && s.term1Score !== null;
        const hasT2 = s.term2Score !== undefined && s.term2Score !== null;
        const cum = s.cumulativeScore !== undefined
          ? Number(s.cumulativeScore)
          : (hasT1 || hasT2)
          ? Math.round((((Number(s.term1Score) || 0) + (Number(s.term2Score) || 0) + thirdTot) / 3) * 10) / 10
          : thirdTot;
        return sum + cum;
      }, 0)
    : totalScore;

  const average = subjects.length > 0
    ? parseFloat(((hasCumulative ? cumulativeTotal : totalScore) / subjects.length).toFixed(2))
    : 0;

  let teacherRemark = rawTeacherRemark;
  let principalRemark = rawPrincipalRemark;
  if (!teacherRemark || !principalRemark) {
    const activeTemplates = await getServerRemarkTemplates();
    const resolvedRemarks = resolvePerformanceRemark(average, activeTemplates, {
      studentName,
      className,
    });
    if (!teacherRemark) teacherRemark = resolvedRemarks.teacherRemark;
    if (!principalRemark) principalRemark = resolvedRemarks.principalRemark;
  }

  // Dynamically calculate class average across cohort if not explicitly provided or legacy dummy
  let finalClassAverage = classAvgInput;
  if (isNaN(finalClassAverage) || finalClassAverage <= 0 || Math.abs(finalClassAverage - 68.5) < 0.05 || Math.abs(finalClassAverage - 68.45) < 0.05) {
    try {
      const allRecords = getLocalTerminalResultsStore();
      const cohort = allRecords.filter(
        (r) =>
          doesStudentMatchClassFilter(r.className, undefined, className) &&
          r.session.trim().toUpperCase() === session.trim().toUpperCase() &&
          r.term.trim().toUpperCase() === term.trim().toUpperCase() &&
          r.admNo.trim().toUpperCase() !== admNo.trim().toUpperCase()
      );
      const cohortAverages = cohort
        .map((r) => r.average)
        .filter((a) => a > 0 && Math.abs(a - 68.5) > 0.05 && Math.abs(a - 68.45) > 0.05);
      if (average > 0) cohortAverages.push(average);
      finalClassAverage = cohortAverages.length > 0
        ? parseFloat((cohortAverages.reduce((a, b) => a + b, 0) / cohortAverages.length).toFixed(1))
        : average;
    } catch {
      finalClassAverage = average;
    }
  }

  const fullPayload: PreparedResultPayload = {
    studentName,
    admNo,
    className,
    arm: resolvedArm,
    session,
    term,
    termLabel,
    gender,
    division,
    studentPhotoUrl,
    numberInClass,
    position,
    isPositionManual,
    daysOpened,
    daysPresent,
    daysAbsent,
    decision,
    nextClass,
    nextTermBegins,
    teacherRemark,
    principalRemark,
    formMasterName,
    principalName,
    classAverage: finalClassAverage,
    feeInfo,
    skills,
    behaviour,
    subjects,
  };

  try {
    // Always save to persistent local store (ensures immediate local dev persistence & offline resilience)
    const localSaved = saveToLocalTerminalResultsStore(fullPayload, { isPublished });

    let dbRecordId: number = localSaved.id;

    try {
      // Sync student's arm in Student Registry if resolvedArm is provided
      if (resolvedArm) {
        await prisma.student
          .updateMany({
            where: { admNo },
            data: { arm: resolvedArm },
          })
          .catch(() => {});
      }
      // Auto-heal table if needed
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "terminal_results" (
          "id" SERIAL PRIMARY KEY,
          "adm_no" TEXT NOT NULL,
          "student_name" TEXT NOT NULL,
          "class_name" TEXT NOT NULL,
          "session" TEXT NOT NULL,
          "term" TEXT NOT NULL,
          "term_label" TEXT,
          "total_score" INTEGER NOT NULL DEFAULT 0,
          "total_possible" INTEGER NOT NULL DEFAULT 0,
          "average" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "position" INTEGER,
          "number_in_class" INTEGER,
          "next_class" TEXT,
          "next_term_begins" TEXT,
          "days_present" INTEGER DEFAULT 0,
          "days_opened" INTEGER DEFAULT 0,
          "days_absent" INTEGER DEFAULT 0,
          "decision" TEXT DEFAULT 'PASSED',
          "teacher_remark" TEXT,
          "principal_remark" TEXT,
          "result_payload" TEXT NOT NULL,
          "is_published" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "terminal_results_adm_no_session_term_key" UNIQUE ("adm_no", "session", "term")
        );
        CREATE INDEX IF NOT EXISTS "terminal_results_adm_no_idx" ON "terminal_results"("adm_no");
      `).catch(() => {});

      const record = await prisma.terminalResult.upsert({
        where: {
          admNo_session_term: {
            admNo,
            session,
            term,
          },
        },
        update: {
          studentName,
          className,
          termLabel,
          totalScore,
          totalPossible,
          average,
          position,
          numberInClass,
          nextClass,
          nextTermBegins,
          daysPresent,
          daysOpened,
          daysAbsent,
          decision,
          teacherRemark,
          principalRemark,
          resultPayload: JSON.stringify(fullPayload),
          isPublished,
        },
        create: {
          admNo,
          studentName,
          className,
          session,
          term,
          termLabel,
          totalScore,
          totalPossible,
          average,
          position,
          numberInClass,
          nextClass,
          nextTermBegins,
          daysPresent,
          daysOpened,
          daysAbsent,
          decision,
          teacherRemark,
          principalRemark,
          resultPayload: JSON.stringify(fullPayload),
          isPublished,
        },
      });
      if (record?.id) {
        dbRecordId = record.id;
      }
    } catch (dbErr: any) {
      console.warn("Database storage warning (persisted locally):", dbErr?.message || dbErr);
    }

    if (!isPositionManual) {
      await autoRankCohortPositionsAction(className, session, term, false).catch(() => {});
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    revalidatePath(`/result/${encodeURIComponent(admNo)}`);
    return { success: true, resultId: dbRecordId };
  } catch (err: any) {
    console.error("Save terminal result error:", err);
    return { success: false, error: `Failed to save terminal result: ${err?.message || "Unknown error"}` };
  }
}

export interface BatchResultInputItem {
  admNo: string;
  studentName: string;
  className: string;
  arm?: string;
  session?: string;
  term?: string;
  gender?: "MALE" | "FEMALE";
  studentPhotoUrl?: string;
  position?: number;
  numberInClass?: number;
  daysOpened?: number;
  daysPresent?: number;
  decision?: string;
  nextClass?: string;
  nextTermBegins?: string;
  teacherRemark?: string;
  principalRemark?: string;
  formMasterName?: string;
  principalName?: string;
  classAverage?: number;
  totalScore?: number;
  average?: number;
  subjects?: PreparedSubjectScore[];
  feeInfo?: any;
  skills?: any;
  behaviour?: any;
}

/**
 * Super Admin: Save or Update a Batch of Student Results (Upload Small-Small)
 * Allows incremental uploading (e.g. 5, 10, or 20 students at a time) with smart auto-ranking.
 */
export async function saveBatchTerminalResultsAction(batch: BatchResultInputItem[]): Promise<{
  success: boolean;
  savedCount: number;
  results: any[];
  error?: string;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN"]);
  if (!auth.ok) {
    return { success: false, savedCount: 0, results: [], error: auth.error };
  }

  if (!Array.isArray(batch) || batch.length === 0) {
    return { success: false, savedCount: 0, results: [], error: "No student result records provided." };
  }

  const savedList: any[] = [];
  const errors: string[] = [];
  const activeRemarkTemplates = await getServerRemarkTemplates();

  for (const item of batch) {
    const admNo = (item.admNo || "").trim().toUpperCase();
    const studentName = (item.studentName || "").trim();
    const rawClassName = (item.className || "").trim();
    const parsedClass = parseClassAndArm(rawClassName, item.arm);
    const resolvedArm = parsedClass.arm || undefined;
    const className = formatClassWithArm(rawClassName, resolvedArm) || rawClassName;
    const session = (item.session || "").trim() || "2025/2026";
    const term = (item.term || "").trim() || "Third Term";
    const termLabel = `${term} (${session})`;

    if (!admNo || !studentName || !className) {
      continue;
    }

    let subjects: PreparedSubjectScore[] = Array.isArray(item.subjects) ? item.subjects : [];

    // If individual subject scores were not provided, generate balanced curriculum scores matching stream/arm
    if (subjects.length === 0) {
      const armLower = (resolvedArm || "").toLowerCase();
      const defaultSubs =
        armLower === "science"
          ? [
              { name: "English Language", code: "ENG", category: "Languages" },
              { name: "Mathematics", code: "MTH", category: "Mathematical Sciences" },
              { name: "Physics", code: "PHY", category: "Science" },
              { name: "Chemistry", code: "CHM", category: "Science" },
              { name: "Biology", code: "BIO", category: "Science" },
              { name: "Further Mathematics", code: "FMT", category: "Mathematical Sciences" },
              { name: "Economics", code: "ECO", category: "Social Sciences" },
              { name: "Civic Education", code: "CIV", category: "National Values" },
              { name: "Data Processing", code: "DP", category: "Technology" },
              { name: "Agricultural Science", code: "AGR", category: "Vocational" },
            ]
          : armLower === "art"
          ? [
              { name: "English Language", code: "ENG", category: "Languages" },
              { name: "Mathematics", code: "MTH", category: "Mathematical Sciences" },
              { name: "Literature in English", code: "LIT", category: "Humanities" },
              { name: "Government", code: "GOV", category: "Humanities" },
              { name: "Christian Religious Studies", code: "CRS", category: "Humanities" },
              { name: "Economics", code: "ECO", category: "Social Sciences" },
              { name: "Civic Education", code: "CIV", category: "National Values" },
              { name: "Biology", code: "BIO", category: "Science" },
              { name: "Igbo Language", code: "IGB", category: "Languages" },
            ]
          : armLower === "commercial"
          ? [
              { name: "English Language", code: "ENG", category: "Languages" },
              { name: "Mathematics", code: "MTH", category: "Mathematical Sciences" },
              { name: "Financial Accounting", code: "ACC", category: "Commercial" },
              { name: "Commerce", code: "COM", category: "Commercial" },
              { name: "Economics", code: "ECO", category: "Social Sciences" },
              { name: "Government", code: "GOV", category: "Humanities" },
              { name: "Civic Education", code: "CIV", category: "National Values" },
              { name: "Data Processing", code: "DP", category: "Technology" },
            ]
          : [
              { name: "English Studies", code: "ENG", category: "Language" },
              { name: "Mathematics", code: "MTH", category: "Mathematical Sciences" },
              { name: "Basic Science & Technology", code: "BST", category: "Basic Science" },
              { name: "Civic Education", code: "CIV", category: "National Values" },
              { name: "Social Studies", code: "SOS", category: "National Values" },
              { name: "Business Studies", code: "BUS", category: "Vocational" },
              { name: "Computer Studies / ICT", code: "ICT", category: "Basic Science" },
              { name: "Agricultural Science", code: "AGR", category: "Vocational" },
              { name: "Christian Religious Knowledge", code: "CRK", category: "Humanities" },
              { name: "French Language", code: "FRE", category: "Language" },
            ];

      const targetAvg = typeof item.average === "number" && item.average > 0
        ? Math.min(100, Math.max(0, item.average))
        : typeof item.totalScore === "number" && item.totalScore > 0
        ? Math.min(100, Math.max(0, parseFloat((item.totalScore / defaultSubs.length).toFixed(1))))
        : 68;

      subjects = defaultSubs.map((sub, idx) => {
        const variance = (idx % 3 === 0 ? 3 : idx % 2 === 0 ? -2 : 1);
        const subTotal = Math.min(100, Math.max(20, Math.round(targetAvg + variance)));
        const ca1 = Math.min(15, Math.round(subTotal * 0.15));
        const ca2 = Math.min(15, Math.round(subTotal * 0.15));
        const exam = subTotal - ca1 - ca2;
        let grade = "C";
        let remark = "Credit";
        if (subTotal >= 75) { grade = "A"; remark = "Distinction"; }
        else if (subTotal >= 65) { grade = "B"; remark = "Very Good"; }
        else if (subTotal >= 50) { grade = "C"; remark = "Credit"; }
        else if (subTotal >= 40) { grade = "D"; remark = "Pass"; }
        else { grade = "F"; remark = "Fail"; }

        return {
          id: `sub_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          subjectName: sub.name,
          subjectCode: sub.code,
          category: sub.category,
          ca1,
          ca2,
          exam,
          totalScore: subTotal,
          grade,
          remark,
        };
      });
    }

    const totalScore = subjects.reduce((sum, s) => sum + (s.totalScore || 0), 0);
    const totalPossible = subjects.length * 100;
    const average = subjects.length > 0
      ? parseFloat((totalScore / subjects.length).toFixed(2))
      : (item.average || 0);

    const position = item.position || 1;
    const numberInClass = item.numberInClass || 35;
    const daysOpened = item.daysOpened ?? 115;
    const daysPresent = item.daysPresent ?? 112;
    const daysAbsent = Math.max(daysOpened - daysPresent, 0);

    const isThirdTerm = term.toLowerCase().includes("third");
    const decision = item.decision || (isThirdTerm ? (average >= 40 ? "PROMOTED" : "ADVISED TO REPEAT") : "PASSED");
    const nextClass = item.nextClass || (isThirdTerm ? (className.includes("JSS 1") ? "JSS 2 Diamond" : className.includes("JSS 2") ? "JSS 3 Platinum" : className.includes("SS 1") ? "SS 2" : className.includes("SS 2") ? "SS 3" : "GRADUATED") : "");
    const nextTermBegins = item.nextTermBegins || "Monday, 14th September 2026";

    const resolvedRemarks = resolvePerformanceRemark(average, activeRemarkTemplates, {
      studentName,
      className,
    });
    const teacherRemark = (item.teacherRemark || "").trim() || resolvedRemarks.teacherRemark;
    const principalRemark = (item.principalRemark || "").trim() || resolvedRemarks.principalRemark;

    const formMasterName = item.formMasterName || "Mr. Emmanuel Eze (B.Sc Ed)";
    const principalName = item.principalName || "Hon Okolie Peter Isioma JP MCArb (Director)";
    const gender = item.gender || "FEMALE";
    const division = (className.toUpperCase().startsWith("SS") || className.toUpperCase().startsWith("JSS")) ? "SECONDARY" : "PRIMARY";
    const classAvg = item.classAverage && item.classAverage > 0 ? item.classAverage : average;

    const fullPayload: PreparedResultPayload = {
      studentName,
      admNo,
      className,
      arm: resolvedArm,
      session,
      term,
      termLabel,
      gender,
      division,
      studentPhotoUrl: item.studentPhotoUrl,
      numberInClass,
      position,
      daysOpened,
      daysPresent,
      daysAbsent,
      decision,
      nextClass,
      nextTermBegins,
      teacherRemark,
      principalRemark,
      formMasterName,
      principalName,
      classAverage: classAvg,
      feeInfo: item.feeInfo || DEFAULT_PREPARED_FEE,
      skills: item.skills || DEFAULT_PREPARED_SKILLS,
      behaviour: item.behaviour || DEFAULT_PREPARED_BEHAVIOUR,
      subjects,
    };

    try {
      const localSaved = saveToLocalTerminalResultsStore(fullPayload);
      let dbId = localSaved.id;

      try {
        if (resolvedArm) {
          await prisma.student
            .updateMany({
              where: { admNo },
              data: { arm: resolvedArm },
            })
            .catch(() => {});
        }
        const record = await prisma.terminalResult.upsert({
          where: {
            admNo_session_term: {
              admNo,
              session,
              term,
            },
          },
          update: {
            studentName,
            className,
            termLabel,
            totalScore,
            totalPossible,
            average,
            position,
            numberInClass,
            nextClass,
            nextTermBegins,
            daysPresent,
            daysOpened,
            daysAbsent,
            decision,
            teacherRemark,
            principalRemark,
            resultPayload: JSON.stringify(fullPayload),
            isPublished: true,
          },
          create: {
            admNo,
            studentName,
            className,
            session,
            term,
            termLabel,
            totalScore,
            totalPossible,
            average,
            position,
            numberInClass,
            nextClass,
            nextTermBegins,
            daysPresent,
            daysOpened,
            daysAbsent,
            decision,
            teacherRemark,
            principalRemark,
            resultPayload: JSON.stringify(fullPayload),
            isPublished: true,
          },
        });
        if (record?.id) dbId = record.id;
      } catch (dbErr: any) {
        console.warn("Database storage warning in batch (saved locally):", dbErr?.message || dbErr);
      }

      savedList.push({
        id: dbId,
        admNo,
        studentName,
        className,
        arm: resolvedArm,
        session,
        term,
        position,
        totalScore,
        average,
        resultPayload: JSON.stringify(fullPayload),
      });
    } catch (e: any) {
      errors.push(`Failed for ${admNo}: ${e?.message || e}`);
    }
  }

  // Auto-rank cohorts for all distinct classes present in this batch
  const distinctCohorts = new Set<string>();
  for (const item of batch) {
    if (item.className) {
      const formattedCls = formatClassWithArm(item.className, item.arm) || item.className;
      const sess = item.session || "2025/2026";
      const trm = item.term || "Third Term";
      distinctCohorts.add(`${formattedCls}|||${sess}|||${trm}`);
    }
  }
  for (const cohortKey of Array.from(distinctCohorts)) {
    const [cls, sess, trm] = cohortKey.split("|||");
    await autoRankCohortPositionsAction(cls, sess, trm).catch(() => {});
  }

  revalidatePath("/admin/cbt");
  revalidatePath("/result");
  return { success: true, savedCount: savedList.length, results: savedList };
}

/**
 * Super Admin: Automatically rank all students in a cohort (class + session + term) by overall average / total score
 */
export async function autoRankCohortPositionsAction(
  className: string,
  session: string,
  term: string,
  forceOverrideManual = false
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, count: 0, error: auth.error };
    }

    const cleanClass = formatClassWithArm(className || "").trim();
    const cleanSession = (session || "").trim().toUpperCase();
    const cleanTerm = (term || "").trim().toUpperCase();

    // 1. Fetch matching from persistent local store
    const localItems = getLocalTerminalResultsStore();
    const cohort = localItems.filter(
      (i) =>
        formatClassWithArm(i.className).toUpperCase() === cleanClass.toUpperCase() &&
        (!cleanSession || i.session.trim().toUpperCase().includes(cleanSession)) &&
        (!cleanTerm || i.term.trim().toUpperCase().includes(cleanTerm))
    );

    if (cohort.length === 0) {
      return { success: true, count: 0 };
    }

    // Sort descending by average, then totalScore
    cohort.sort((a, b) => (b.average || 0) - (a.average || 0) || (b.totalScore || 0) - (a.totalScore || 0));

    const totalStudents = cohort.length;
    for (let i = 0; i < cohort.length; i++) {
      const rank = i + 1;
      try {
        const payload: PreparedResultPayload = JSON.parse(cohort[i].resultPayload);
        const keepManual = !forceOverrideManual && payload.isPositionManual && payload.position > 0;
        const effectiveRank = keepManual ? payload.position : rank;
        cohort[i].position = effectiveRank;
        cohort[i].numberInClass = totalStudents;
        payload.position = effectiveRank;
        payload.numberInClass = totalStudents;
        if (forceOverrideManual) {
          payload.isPositionManual = false;
        }
        cohort[i].resultPayload = JSON.stringify(payload);
      } catch {
        cohort[i].position = rank;
        cohort[i].numberInClass = totalStudents;
      }
      cohort[i].updatedAt = new Date().toISOString();
    }
    saveAllToLocalTerminalResultsStore(localItems);

    // 2. Update PostgreSQL database
    try {
      for (const item of cohort) {
        await prisma.terminalResult.update({
          where: { id: item.id },
          data: {
            position: item.position,
            numberInClass: item.numberInClass,
            resultPayload: item.resultPayload,
          },
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Database ranking warning:", e);
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    return { success: true, count: cohort.length };
  } catch (err: any) {
    console.error("Auto rank cohort error:", err);
    return { success: false, count: 0, error: err?.message || "Failed to auto-rank cohort" };
  }
}

/**
 * Super Admin: Fetch all prepared results
 */
export async function getAllTerminalResultsAction(): Promise<{
  success: boolean;
  error?: string;
  results: any[];
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, error: auth.error, results: [] };
    }

    let dbResults: any[] = [];
    try {
      dbResults = await prisma.terminalResult.findMany({
        orderBy: { updatedAt: "desc" },
      });
    } catch {
      // Prisma offline or table query failed
    }

    const localStore = getLocalTerminalResultsStore() || [];
    const mergedMap = new Map<string, any>();

    for (const r of dbResults) {
      const k = `${(r.admNo || "").trim().toUpperCase()}::${(r.session || "").trim().toLowerCase()}::${(r.term || "").trim().toLowerCase()}`;
      mergedMap.set(k, r);
    }

    for (const l of localStore) {
      const k = `${(l.admNo || "").trim().toUpperCase()}::${(l.session || "").trim().toLowerCase()}::${(l.term || "").trim().toLowerCase()}`;
      if (!mergedMap.has(k)) {
        mergedMap.set(k, l);
      } else {
        const existing = mergedMap.get(k);
        const dbTime = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const localTime = l?.updatedAt ? new Date(l.updatedAt).getTime() : 0;
        if (localTime > dbTime) {
          mergedMap.set(k, { ...existing, ...l, id: existing.id || l.id });
        }
      }
    }

    return { success: true, results: Array.from(mergedMap.values()) };
  } catch (err: any) {
    console.error("Get terminal results error:", err);
    return { success: true, results: getLocalTerminalResultsStore() || [] };
  }
}

/**
 * Super Admin: Delete a prepared terminal result
 */
export async function deleteTerminalResultAction(resultId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    deleteFromLocalTerminalResultsStore(resultId);
    await prisma.terminalResult.delete({
      where: { id: resultId },
    }).catch(() => {});
    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    return { success: true };
  } catch (err: any) {
    console.error("Delete terminal result error:", err);
    return { success: true };
  }
}

/**
 * Super Admin / Teacher: Manually update class position and number in class for a prepared report card
 */
export async function updateResultPositionAction(
  admNo: string,
  session: string,
  term: string,
  position: number,
  numberInClass: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const cleanAdmNo = admNo.trim().toUpperCase();
    const cleanSession = (session || "").trim().toUpperCase();
    const cleanTerm = (term || "").trim().toUpperCase();

    // 1. Update in persistent local store
    const localItems = getLocalTerminalResultsStore();
    const matchIdx = localItems.findIndex(
      (i) =>
        i.admNo.trim().toUpperCase() === cleanAdmNo &&
        (!cleanSession || i.session.trim().toUpperCase().includes(cleanSession)) &&
        (!cleanTerm || i.term.trim().toUpperCase().includes(cleanTerm))
    );

    if (matchIdx >= 0) {
      const item = localItems[matchIdx];
      item.position = position;
      item.numberInClass = numberInClass;
      try {
        const payload: PreparedResultPayload = JSON.parse(item.resultPayload);
        payload.position = position;
        payload.numberInClass = numberInClass;
        item.resultPayload = JSON.stringify(payload);
      } catch {}
      item.updatedAt = new Date().toISOString();
      saveAllToLocalTerminalResultsStore(localItems);
    }

    // 2. Update in PostgreSQL database
    try {
      const records = await prisma.terminalResult.findMany({
        where: {
          admNo: { equals: cleanAdmNo, mode: "insensitive" } as any,
          ...(session ? { session: { contains: session.trim(), mode: "insensitive" } as any } : {}),
          ...(term ? { term: { contains: term.trim(), mode: "insensitive" } as any } : {}),
        },
      });

      for (const rec of records) {
        let updatedPayload = rec.resultPayload;
        try {
          const parsed = JSON.parse(rec.resultPayload);
          parsed.position = position;
          parsed.numberInClass = numberInClass;
          updatedPayload = JSON.stringify(parsed);
        } catch {}

        await prisma.terminalResult.update({
          where: { id: rec.id },
          data: {
            position,
            numberInClass,
            resultPayload: updatedPayload,
          },
        });
      }
    } catch (dbErr) {
      console.warn("Database position update warning (saved to local store):", dbErr);
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    revalidatePath(`/result/${encodeURIComponent(admNo)}`);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update result position:", err);
    return { success: false, error: sanitizeErrorMessage(err, "Failed to update position.") };
  }
}

/**
 * Public / Student: Fetch prepared report card by admission number, session, and term.
 * If a term is provided, it strictly checks that term so that if e.g. 2nd term is unreleased,
 * it returns result: null along with any availableTerms that ARE uploaded.
 */
export async function getStudentPreparedResultAction(
  admNo: string,
  session?: string,
  term?: string
): Promise<{
  success: boolean;
  result?: PreparedResultPayload | null;
  availableTerms?: string[];
  source: "DATABASE" | "MOCK";
}> {
  try {
    const cleanAdmNo = admNo.trim().toUpperCase();
    const [adminSession, resultAccess] = await Promise.all([
      getAdminSession().catch(() => null),
      getResultAccessSession(cleanAdmNo, session, term).catch(() => null),
    ]);

    if (!adminSession && !resultAccess) {
      return { success: false, result: null, availableTerms: [], source: "DATABASE" };
    }

    const lookup = await findPublishedResultForLookup(cleanAdmNo, session, term);

    // Pending-only scratch-card tokens must never disclose full result dossiers
    if (!adminSession && resultAccess?.pendingOnly) {
      return {
        success: true,
        result: null,
        availableTerms: lookup.availableTerms,
        source: "DATABASE",
      };
    }

    return lookup;
  } catch (err) {
    console.error("Get student prepared result error:", err);
    return { success: false, result: null, source: "DATABASE" };
  }
}

/**
 * Super Admin / Public: Get all terms that have uploaded results for a given student
 */
export async function getStudentAvailableTermsAction(
  admNo: string
): Promise<{
  success: boolean;
  terms: { session: string; term: string }[];
  studentName?: string;
  className?: string;
}> {
  try {
    const adminSession = await getAdminSession().catch(() => null);
    if (!adminSession) {
      const ip = getClientIp();
      const rl = checkRateLimit(`avail-terms:ip:${ip}`, 30, RATE_LIMIT_WINDOW_MS);
      if (!rl.allowed) {
        return { success: false, terms: [] };
      }
    }

    const cleanAdmNo = admNo.trim().toUpperCase();
    const termsMap = new Map<string, { session: string; term: string }>();
    let studentName = "";
    let className = "";

    // 1. From local store
    const localUploaded = getStudentUploadedTermsFromStore(cleanAdmNo);
    for (const u of localUploaded) {
      const key = `${normalizeSession(u.session)}_${normalizeTerm(u.term)}`;
      termsMap.set(key, u);
    }

    // 2. From database
    try {
      const records = await prisma.terminalResult.findMany({
        where: {
          admNo: { equals: cleanAdmNo, mode: "insensitive" } as any,
          isPublished: true,
        },
        select: {
          session: true,
          term: true,
          studentName: true,
          className: true,
        },
      });

      for (const r of records) {
        const key = `${normalizeSession(r.session)}_${normalizeTerm(r.term)}`;
        if (!termsMap.has(key)) {
          termsMap.set(key, { session: r.session, term: r.term });
        }
        if (!studentName && r.studentName) studentName = r.studentName;
        if (!className && r.className) className = r.className;
      }
    } catch {}

    return {
      success: true,
      terms: Array.from(termsMap.values()),
      studentName: adminSession ? studentName : undefined,
      className: adminSession ? className : undefined,
    };
  } catch (err) {
    console.error("Get student available terms error:", err);
    return { success: false, terms: [] };
  }
}

/**
 * Super Admin: Purge only a specific term's terminal results (optional session filter)
 * so other terms in the academic session remain 100% intact.
 */
export async function purgeTermTerminalResultsAction(
  term: string,
  session?: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, message: auth.error };
    }

    const targetTerm = normalizeTerm(term);
    const targetSession = session && session !== "ALL" ? session.trim() : null;

    // 1. Filter local store to keep all OTHER terms/sessions untouched
    const existingLocal = getLocalTerminalResultsStore();
    const keptLocal = existingLocal.filter((r) => {
      const sameTerm = normalizeTerm(r.term) === targetTerm;
      const sameSession = !targetSession || (r.session || "").trim() === targetSession;
      return !(sameTerm && sameSession);
    });
    saveAllToLocalTerminalResultsStore(keptLocal);

    // 2. Delete matching term records from database if reachable
    try {
      await prisma.terminalResult.deleteMany({
        where: {
          term: targetTerm,
          ...(targetSession ? { session: targetSession } : {}),
        },
      });
    } catch (e) {
      console.warn("Could not delete term results from prisma terminalResult:", e);
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    return {
      success: true,
      message: `Cleared ${targetTerm}${targetSession ? ` (${targetSession})` : ""} results. All other terms in the session remain safely preserved.`,
    };
  } catch (err: any) {
    console.error("Purge term results error:", err);
    return {
      success: false,
      message: `Failed to clear ${term} results: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Super Admin: Purge all terminal results from database and local storage to restore empty state
 */
export async function purgeAllTerminalResultsAction(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, message: auth.error };
    }

    // 1. Clear local store
    saveAllToLocalTerminalResultsStore([]);

    // 2. Clear database table if reachable
    try {
      await prisma.terminalResult.deleteMany({});
    } catch (e) {
      console.warn("Could not delete from prisma terminalResult (may be offline or already empty):", e);
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    return {
      success: true,
      message: "All student terminal results have been successfully purged. Result portal is now in an empty state.",
    };
  } catch (err: any) {
    console.error("Purge error:", err);
    return {
      success: false,
      message: `Failed to purge results: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Seed comprehensive initial terminal results for all key demo students
 */
export async function seedDefaultInstitutionalResultsAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const auth = await requireAdminSession(["SUPER_ADMIN"]);
    if (!auth.ok) {
      return { success: false, message: auth.error };
    }

    const demoProfiles = [
      {
        admNo: "GFMS/2026/0501",
        studentName: "Okeke, Somtochukwu Grace",
        className: "JSS 2 Diamond",
        session: "2025/2026",
        term: "Third Term",
        gender: "FEMALE" as const,
        position: 1,
        numberInClass: 42,
        decision: "PROMOTED TO JSS 3 PLATINUM",
        nextClass: "JSS 3 Platinum",
        nextTermBegins: "Monday, 14th September 2026",
        teacherRemark: "Somtochukwu is an exceptionally disciplined, diligent, and intellectually gifted student. Outstanding academic mastery.",
        principalRemark: "Remarkable distinction and exemplary conduct. Promoted to JSS 3 with highest honours!",
        subjects: [
          { id: "cg-civ", subjectName: "Civic Education", subjectCode: "CIV", category: "National Values", ca1: 15, ca2: 13, exam: 63, totalScore: 91, grade: "A", remark: "Distinction" },
          { id: "cg-sos", subjectName: "Social Studies", subjectCode: "SOS", category: "National Values", ca1: 14, ca2: 14, exam: 61, totalScore: 89, grade: "A", remark: "Distinction" },
          { id: "cg-sec", subjectName: "Security Education", subjectCode: "SEC", category: "National Values", ca1: 15, ca2: 14, exam: 64, totalScore: 93, grade: "A", remark: "Distinction" },
          { id: "cg-bsc", subjectName: "Basic Science", subjectCode: "BSC", category: "Basic Science & Technology", ca1: 13, ca2: 13, exam: 59, totalScore: 85, grade: "A", remark: "Distinction" },
          { id: "cg-btech", subjectName: "Basic Technology", subjectCode: "BTECH", category: "Basic Science & Technology", ca1: 12, ca2: 12, exam: 57, totalScore: 81, grade: "A", remark: "Distinction" },
          { id: "cg-ict", subjectName: "Computer Studies (ICT)", subjectCode: "ICT", category: "Basic Science & Technology", ca1: 15, ca2: 15, exam: 65, totalScore: 95, grade: "A", remark: "Distinction" },
          { id: "cg-phe", subjectName: "Physical & Health Education", subjectCode: "PHE", category: "Basic Science & Technology", ca1: 14, ca2: 13, exam: 60, totalScore: 87, grade: "A", remark: "Distinction" },
          { id: "cg-eng", subjectName: "English Language", subjectCode: "ENG", category: "Languages", ca1: 14, ca2: 13, exam: 60, totalScore: 87, grade: "A", remark: "Distinction" },
          { id: "cg-lit", subjectName: "Literature in English", subjectCode: "LIT", category: "Languages", ca1: 14, ca2: 13, exam: 60, totalScore: 87, grade: "A", remark: "Distinction" },
          { id: "cg-fre", subjectName: "French Language", subjectCode: "FRE", category: "Languages", ca1: 12, ca2: 12, exam: 55, totalScore: 79, grade: "B", remark: "Very Good" },
          { id: "cg-igb", subjectName: "Igbo Language", subjectCode: "IGB", category: "Languages", ca1: 13, ca2: 13, exam: 58, totalScore: 84, grade: "A", remark: "Distinction" },
          { id: "cg-mth", subjectName: "Mathematics", subjectCode: "MTH", category: "Mathematical Sciences", ca1: 15, ca2: 14, exam: 64, totalScore: 93, grade: "A", remark: "Distinction" },
          { id: "cg-agr", subjectName: "Agricultural Science", subjectCode: "AGR", category: "Pre-Vocational Studies", ca1: 14, ca2: 13, exam: 59, totalScore: 86, grade: "A", remark: "Distinction" },
          { id: "cg-hec", subjectName: "Home Economics", subjectCode: "HEC", category: "Pre-Vocational Studies", ca1: 13, ca2: 13, exam: 58, totalScore: 84, grade: "A", remark: "Distinction" },
          { id: "cg-bus", subjectName: "Business Studies", subjectCode: "BUS", category: "Business & Humanities", ca1: 14, ca2: 13, exam: 61, totalScore: 88, grade: "A", remark: "Distinction" },
          { id: "cg-crs", subjectName: "Christian Religious Studies", subjectCode: "CRS", category: "Business & Humanities", ca1: 15, ca2: 15, exam: 65, totalScore: 95, grade: "A", remark: "Distinction" },
          { id: "cg-cca", subjectName: "Cultural & Creative Arts (CCA)", subjectCode: "CCA", category: "Business & Humanities", ca1: 13, ca2: 13, exam: 59, totalScore: 85, grade: "A", remark: "Distinction" },
        ],
      },
      {
        admNo: "GFMS/SS/2024/001",
        studentName: "Somtochukwu Grace Okeke",
        className: "SS 2A",
        session: "2025/2026",
        term: "Third Term",
        gender: "FEMALE" as const,
        position: 1,
        numberInClass: 38,
        decision: "PROMOTED TO SS 3 SCIENCE",
        nextClass: "SS 3 Science",
        nextTermBegins: "Monday, 14th September 2026",
        teacherRemark: "Extraordinary brilliance and unwavering focus. High distinction across sciences and humanities.",
        principalRemark: "Top rank in SS 2 Science cohort. Excellent leadership trajectory.",
        subjects: [
          { id: "ss-eng", subjectName: "English Language", subjectCode: "ENG", category: "Languages", ca1: 15, ca2: 13, exam: 63, totalScore: 91, grade: "A", remark: "Distinction" },
          { id: "ss-mth", subjectName: "Mathematics", subjectCode: "MTH", category: "Mathematical Sciences", ca1: 15, ca2: 15, exam: 66, totalScore: 96, grade: "A", remark: "Distinction" },
          { id: "ss-phy", subjectName: "Physics", subjectCode: "PHY", category: "Science", ca1: 14, ca2: 13, exam: 61, totalScore: 88, grade: "A", remark: "Distinction" },
          { id: "ss-chm", subjectName: "Chemistry", subjectCode: "CHM", category: "Science", ca1: 14, ca2: 14, exam: 62, totalScore: 90, grade: "A", remark: "Distinction" },
          { id: "ss-bio", subjectName: "Biology", subjectCode: "BIO", category: "Science", ca1: 14, ca2: 14, exam: 60, totalScore: 88, grade: "A", remark: "Distinction" },
          { id: "ss-eco", subjectName: "Economics", subjectCode: "ECO", category: "Social Sciences", ca1: 14, ca2: 13, exam: 61, totalScore: 88, grade: "A", remark: "Distinction" },
          { id: "ss-civ", subjectName: "Civic Education", subjectCode: "CIV", category: "National Values", ca1: 15, ca2: 15, exam: 64, totalScore: 94, grade: "A", remark: "Distinction" },
          { id: "ss-dp", subjectName: "Data Processing", subjectCode: "DP", category: "Technology", ca1: 15, ca2: 14, exam: 65, totalScore: 94, grade: "A", remark: "Distinction" },
        ],
      },
      {
        admNo: "GFMS/SS/2024/002",
        studentName: "Chidubem Emmanuel Eze",
        className: "SS 1B",
        session: "2025/2026",
        term: "Third Term",
        gender: "MALE" as const,
        position: 3,
        numberInClass: 40,
        decision: "PROMOTED TO SS 2B",
        nextClass: "SS 2B",
        nextTermBegins: "Monday, 14th September 2026",
        teacherRemark: "Very hardworking and methodical scholar. Outstanding grasp of technical principles.",
        principalRemark: "Commendable distinction. Keep up the high academic tempo.",
        subjects: [
          { id: "s1-eng", subjectName: "English Language", subjectCode: "ENG", category: "Languages", ca1: 13, ca2: 12, exam: 57, totalScore: 82, grade: "A", remark: "Distinction" },
          { id: "s1-mth", subjectName: "Mathematics", subjectCode: "MTH", category: "Mathematical Sciences", ca1: 14, ca2: 14, exam: 61, totalScore: 89, grade: "A", remark: "Distinction" },
          { id: "s1-phy", subjectName: "Physics", subjectCode: "PHY", category: "Science", ca1: 13, ca2: 13, exam: 56, totalScore: 82, grade: "A", remark: "Distinction" },
          { id: "s1-chm", subjectName: "Chemistry", subjectCode: "CHM", category: "Science", ca1: 13, ca2: 12, exam: 54, totalScore: 79, grade: "B", remark: "Very Good" },
          { id: "s1-td", subjectName: "Technical Drawing", subjectCode: "TD", category: "Technology", ca1: 14, ca2: 14, exam: 62, totalScore: 90, grade: "A", remark: "Distinction" },
          { id: "s1-civ", subjectName: "Civic Education", subjectCode: "CIV", category: "National Values", ca1: 14, ca2: 13, exam: 59, totalScore: 86, grade: "A", remark: "Distinction" },
          { id: "s1-eco", subjectName: "Economics", subjectCode: "ECO", category: "Social Sciences", ca1: 13, ca2: 12, exam: 56, totalScore: 81, grade: "A", remark: "Distinction" },
        ],
      },
      {
        admNo: "GFMS/SS/2024/003",
        studentName: "Aisha Fatima Bello",
        className: "SS 3 Science",
        session: "2025/2026",
        term: "Third Term",
        gender: "FEMALE" as const,
        position: 2,
        numberInClass: 36,
        decision: "GRADUATING - WAEC DISTINCTION CLEARANCE",
        nextClass: "University / Tertiary Transition",
        nextTermBegins: "Graduation Convocation: 28th July 2026",
        teacherRemark: "An extraordinary academic leader and valedictory contender. Outstanding mastery across all subjects.",
        principalRemark: "Exemplary scholar. We celebrate your distinction and predict a stellar career.",
        subjects: [
          { id: "s3-eng", subjectName: "English Language", subjectCode: "ENG", category: "Languages", ca1: 15, ca2: 14, exam: 64, totalScore: 93, grade: "A", remark: "Distinction" },
          { id: "s3-mth", subjectName: "Mathematics", subjectCode: "MTH", category: "Mathematical Sciences", ca1: 15, ca2: 15, exam: 68, totalScore: 98, grade: "A", remark: "Distinction" },
          { id: "s3-fm", subjectName: "Further Mathematics", subjectCode: "FMT", category: "Mathematical Sciences", ca1: 15, ca2: 14, exam: 65, totalScore: 94, grade: "A", remark: "Distinction" },
          { id: "s3-phy", subjectName: "Physics", subjectCode: "PHY", category: "Science", ca1: 14, ca2: 14, exam: 63, totalScore: 91, grade: "A", remark: "Distinction" },
          { id: "s3-chm", subjectName: "Chemistry", subjectCode: "CHM", category: "Science", ca1: 15, ca2: 14, exam: 64, totalScore: 93, grade: "A", remark: "Distinction" },
          { id: "s3-bio", subjectName: "Biology", subjectCode: "BIO", category: "Science", ca1: 14, ca2: 14, exam: 61, totalScore: 89, grade: "A", remark: "Distinction" },
          { id: "s3-civ", subjectName: "Civic Education", subjectCode: "CIV", category: "National Values", ca1: 15, ca2: 15, exam: 65, totalScore: 95, grade: "A", remark: "Distinction" },
        ],
      },
    ];

    for (const p of demoProfiles) {
      const totalScore = p.subjects.reduce((sum, s) => sum + s.totalScore, 0);
      const totalPossible = p.subjects.length * 100;
      const average = parseFloat((totalScore / p.subjects.length).toFixed(2));

      const payload: PreparedResultPayload = {
        studentName: p.studentName,
        admNo: p.admNo,
        className: p.className,
        session: p.session,
        term: p.term,
        termLabel: `${p.term} (${p.session})`,
        gender: p.gender,
        division: "SECONDARY",
        numberInClass: p.numberInClass,
        position: p.position,
        daysOpened: 115,
        daysPresent: 112,
        daysAbsent: 3,
        decision: p.decision,
        nextClass: p.nextClass,
        nextTermBegins: p.nextTermBegins,
        teacherRemark: p.teacherRemark,
        principalRemark: p.principalRemark,
        formMasterName: "Mr. Emmanuel Eze (B.Sc Ed)",
        principalName: "Hon Okolie Peter Isioma JP MCArb (Director)",
        classAverage: average,
        feeInfo: DEFAULT_PREPARED_FEE,
        skills: DEFAULT_PREPARED_SKILLS,
        behaviour: DEFAULT_PREPARED_BEHAVIOUR,
        subjects: p.subjects,
      };

      saveToLocalTerminalResultsStore(payload);

      await prisma.terminalResult.upsert({
        where: {
          admNo_session_term: {
            admNo: p.admNo,
            session: p.session,
            term: p.term,
          },
        },
        update: {
          studentName: p.studentName,
          className: p.className,
          termLabel: payload.termLabel,
          totalScore,
          totalPossible,
          average,
          position: p.position,
          numberInClass: p.numberInClass,
          nextClass: p.nextClass,
          nextTermBegins: p.nextTermBegins,
          daysPresent: 112,
          daysOpened: 115,
          daysAbsent: 3,
          decision: p.decision,
          teacherRemark: p.teacherRemark,
          principalRemark: p.principalRemark,
          resultPayload: JSON.stringify(payload),
          isPublished: true,
        },
        create: {
          admNo: p.admNo,
          studentName: p.studentName,
          className: p.className,
          session: p.session,
          term: p.term,
          termLabel: payload.termLabel,
          totalScore,
          totalPossible,
          average,
          position: p.position,
          numberInClass: p.numberInClass,
          nextClass: p.nextClass,
          nextTermBegins: p.nextTermBegins,
          daysPresent: 112,
          daysOpened: 115,
          daysAbsent: 3,
          decision: p.decision,
          teacherRemark: p.teacherRemark,
          principalRemark: p.principalRemark,
          resultPayload: JSON.stringify(payload),
          isPublished: true,
        },
      }).catch(() => {});
    }

    revalidatePath("/admin/cbt");
    revalidatePath("/result");
    return { success: true, message: `Successfully seeded ${demoProfiles.length} institutional terminal results.` };
  } catch (err: any) {
    console.error("Seed default results error:", err);
    return { success: false, message: `Failed to seed results: ${err?.message || "Unknown error"}` };
  }
}

/**
 * Staff / Super Admin: Fetch Performance Remark Templates (Excellent Result, Very Good, Good, Fair, Pass).
 */
export async function getRemarkTemplatesAction(): Promise<{
  success: boolean;
  templates: PerformanceRemarkTemplateTier[];
  error?: string;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN", "TEACHER"]);
  if (!auth.ok) {
    return { success: false, templates: [], error: auth.error };
  }
  const templates = await getServerRemarkTemplates();
  return { success: true, templates };
}

/**
 * Super Admin: Save & persist edited Performance Remark Templates across sessions.
 */
export async function saveRemarkTemplatesAction(
  templates: PerformanceRemarkTemplateTier[]
): Promise<{
  success: boolean;
  templates: PerformanceRemarkTemplateTier[];
  error?: string;
}> {
  const auth = await requireAdminSession(["SUPER_ADMIN"]);
  if (!auth.ok) {
    return { success: false, templates: [], error: auth.error };
  }
  try {
    const saved = await saveServerRemarkTemplates(templates);
    revalidatePath("/admin/cbt");
    return { success: true, templates: saved };
  } catch (err: any) {
    return {
      success: false,
      templates: [],
      error: sanitizeErrorMessage(err, "Failed to save remark templates."),
    };
  }
}
