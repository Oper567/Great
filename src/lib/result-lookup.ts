import prisma from "@/lib/prisma";
import {
  findInLocalTerminalResultsStore,
  getStudentUploadedTermsFromStore,
  normalizeSession,
  normalizeTerm,
} from "@/lib/terminal-result-store";
import { parseClassAndArm } from "@/lib/cbt-utils";
import { PreparedResultPayload, DEFAULT_PREPARED_FEE, DEFAULT_PREPARED_SKILLS, DEFAULT_PREPARED_BEHAVIOUR } from "@/types/report-card";

/**
 * Server-only internal lookup for published terminal results.
 * Intentionally kept outside `"use server"` modules so it cannot be invoked as an unauthenticated Server Action.
 */
export async function findPublishedResultForLookup(
  admNo: string,
  session?: string,
  term?: string
): Promise<{
  success: boolean;
  result: PreparedResultPayload | null;
  availableTerms: string[];
  source: "DATABASE" | "MOCK";
}> {
  const cleanAdmNo = admNo.trim().toUpperCase();
  const targetNormTerm = normalizeTerm(term);
  const targetNormSession = normalizeSession(session);

  const localMatch = findInLocalTerminalResultsStore(cleanAdmNo, session, term);
  const localUploaded = getStudentUploadedTermsFromStore(cleanAdmNo);
  const availableTermsSet = new Set<string>(localUploaded.map((u) => u.term));

  let record: any = null;
  let fallbackDbPhotoUrl: string | undefined;
  try {
    const allDbRecords = await prisma.terminalResult.findMany({
      where: {
        admNo: { equals: cleanAdmNo, mode: "insensitive" } as any,
        isPublished: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    for (const rec of allDbRecords) {
      if (rec.term) availableTermsSet.add(rec.term);
      if (!fallbackDbPhotoUrl && rec.resultPayload) {
        try {
          const p = JSON.parse(rec.resultPayload);
          if (p?.studentPhotoUrl) fallbackDbPhotoUrl = p.studentPhotoUrl;
        } catch {}
      }
    }

    if (targetNormTerm) {
      record = allDbRecords.find((r: any) => {
        const sessMatch = targetNormSession ? normalizeSession(r.session) === targetNormSession : true;
        const termMatch = normalizeTerm(r.term) === targetNormTerm;
        return sessMatch && termMatch;
      });
    } else {
      record = allDbRecords[0] || null;
    }
  } catch {
    // Fallback to local store
  }

  const availableTerms = Array.from(availableTermsSet);

  if (record && record.resultPayload) {
    try {
      const payload: PreparedResultPayload = JSON.parse(record.resultPayload);
      payload.studentName = payload.studentName || record.studentName;
      payload.admNo = payload.admNo || record.admNo;
      payload.className = payload.className || record.className;
      const parsedArm = parseClassAndArm(payload.className, payload.arm).arm;
      if (parsedArm) payload.arm = parsedArm;
      payload.session = payload.session || record.session;
      payload.term = payload.term || record.term;
      payload.termLabel = payload.termLabel || record.termLabel || `${record.term} (${record.session})`;
      payload.position = payload.position || record.position || 1;
      payload.numberInClass = payload.numberInClass || record.numberInClass || 35;
      payload.daysOpened = payload.daysOpened ?? record.daysOpened ?? 115;
      payload.daysPresent = payload.daysPresent ?? record.daysPresent ?? 112;
      payload.daysAbsent = payload.daysAbsent ?? record.daysAbsent ?? 3;
      payload.nextClass = payload.nextClass || record.nextClass || "Next Class";
      payload.nextTermBegins = payload.nextTermBegins || record.nextTermBegins || "Monday, 14th September 2026";
      payload.decision = payload.decision || record.decision || "PROMOTED";
      payload.teacherRemark = payload.teacherRemark || record.teacherRemark || "An attentive and hardworking scholar.";
      payload.principalRemark = payload.principalRemark || record.principalRemark || "Commendable distinction. Keep up the good work!";
      payload.formMasterName = payload.formMasterName || "Mr. Emmanuel Eze (B.Sc Ed)";
      payload.principalName = payload.principalName || "Hon Okolie Peter Isioma JP MCArb (Director)";
      payload.classAverage =
        payload.classAverage &&
        Math.abs(payload.classAverage - 68.5) > 0.05 &&
        Math.abs(payload.classAverage - 68.45) > 0.05
          ? payload.classAverage
          : record.average || 0;
      payload.feeInfo = payload.feeInfo || { ...DEFAULT_PREPARED_FEE };
      if (payload.feeInfo && payload.feeInfo.accountNumber === "1014529088") {
        payload.feeInfo.accountNumber = "";
      }
      if (payload.feeInfo && payload.feeInfo.bankName === "Zenith Bank PLC" && !payload.feeInfo.accountNumber) {
        payload.feeInfo.bankName = "";
      }
      payload.skills = payload.skills || DEFAULT_PREPARED_SKILLS;
      payload.behaviour = payload.behaviour || DEFAULT_PREPARED_BEHAVIOUR;
      if (!payload.studentPhotoUrl && fallbackDbPhotoUrl) {
        payload.studentPhotoUrl = fallbackDbPhotoUrl;
      }

      return {
        success: true,
        result: payload,
        availableTerms,
        source: "DATABASE",
      };
    } catch {
      // Fall through to local store match
    }
  }

  if (localMatch) {
    if (localMatch.feeInfo && localMatch.feeInfo.accountNumber === "1014529088") {
      localMatch.feeInfo.accountNumber = "";
    }
    if (!localMatch.studentPhotoUrl && fallbackDbPhotoUrl) {
      localMatch.studentPhotoUrl = fallbackDbPhotoUrl;
    }
    return {
      success: true,
      result: localMatch,
      availableTerms,
      source: "DATABASE",
    };
  }

  return {
    success: true,
    result: null,
    availableTerms,
    source: "DATABASE",
  };
}
