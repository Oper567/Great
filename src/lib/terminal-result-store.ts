import fs from "fs";
import path from "path";
import {
  PreparedResultPayload,
  DEFAULT_PREPARED_SKILLS,
  DEFAULT_PREPARED_BEHAVIOUR,
  DEFAULT_PREPARED_FEE,
} from "@/types/report-card";

const DATA_DIR = path.join(process.cwd(), "database");
const STORE_PATH = path.join(DATA_DIR, "terminal-results-store.json");

declare global {
  // eslint-disable-next-line no-var
  var __gfmsTerminalResultsCache: StoredTerminalResultItem[] | undefined;
}

// Institutional Default Seed Data (Empty by default until uploaded by admin)
const INITIAL_INSTITUTIONAL_RESULTS: PreparedResultPayload[] = [];

export interface StoredTerminalResultItem {
  id: number;
  admNo: string;
  studentName: string;
  className: string;
  session: string;
  term: string;
  termLabel: string;
  totalScore: number;
  totalPossible: number;
  average: number;
  position: number;
  numberInClass: number;
  nextClass: string;
  nextTermBegins: string;
  daysPresent: number;
  daysOpened: number;
  daysAbsent: number;
  decision: string;
  teacherRemark: string;
  principalRemark: string;
  resultPayload: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

function persistStoreToDisk(items: StoredTerminalResultItem[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  global.__gfmsTerminalResultsCache = [...items];
  fs.writeFileSync(STORE_PATH, JSON.stringify(items), "utf-8");
}

/**
 * Ensures the store exists and returns all records (cached in RAM to prevent sync disk bottlenecks)
 */
export function getLocalTerminalResultsStore(): StoredTerminalResultItem[] {
  if (Array.isArray(global.__gfmsTerminalResultsCache)) {
    return [...global.__gfmsTerminalResultsCache];
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, "[]", "utf-8");
      global.__gfmsTerminalResultsCache = [];
      return [];
    }

    const data = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = data.trim() ? (JSON.parse(data) as StoredTerminalResultItem[]) : [];
    global.__gfmsTerminalResultsCache = Array.isArray(parsed) ? parsed : [];
    return [...global.__gfmsTerminalResultsCache];
  } catch (err) {
    console.error("Failed to read local terminal results store:", err);
    return [];
  }
}

/**
 * Overwrite all items in the local store
 */
export function saveAllToLocalTerminalResultsStore(items: StoredTerminalResultItem[]): void {
  try {
    persistStoreToDisk(items);
  } catch (err) {
    console.error("Failed to write to local terminal results store:", err);
  }
}

/**
 * Saves or updates a result in the local JSON store.
 * Supports saving as Draft (`isPublished: false`) for teacher submissions pending Admin finalization,
 * or Published (`isPublished: true`) when finalized by Super Admin.
 */
export function saveToLocalTerminalResultsStore(
  payload: PreparedResultPayload,
  options?: { isPublished?: boolean }
): StoredTerminalResultItem {
  const items = getLocalTerminalResultsStore();
  const cleanAdmNo = payload.admNo.trim().toUpperCase();
  const cleanSession = payload.session.trim().toUpperCase();
  const cleanTerm = payload.term.trim().toUpperCase();

  const totalScore = payload.subjects.reduce((sum, s) => sum + (s.totalScore || 0), 0);
  const totalPossible = payload.subjects.length * 100;
  const isThirdTerm = (payload.term || "").toLowerCase().includes("third");
  const hasCumulative = isThirdTerm && payload.subjects.some((s) => s.cumulativeScore !== undefined || (s.term1Score !== undefined && s.term1Score !== null) || (s.term2Score !== undefined && s.term2Score !== null));
  const cumulativeTotal = hasCumulative
    ? payload.subjects.reduce((sum, s) => {
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
  const average = payload.subjects.length > 0 ? parseFloat(((hasCumulative ? cumulativeTotal : totalScore) / payload.subjects.length).toFixed(2)) : 0;

  const existingIdx = items.findIndex(
    (i) =>
      i.admNo.trim().toUpperCase() === cleanAdmNo &&
      i.session.trim().toUpperCase() === cleanSession &&
      i.term.trim().toUpperCase() === cleanTerm
  );

  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const existing = items[existingIdx];
    const effectivePublished =
      options?.isPublished !== undefined
        ? options.isPublished
        : existing.isPublished ?? true;

    const updated: StoredTerminalResultItem = {
      ...existing,
      studentName: payload.studentName,
      className: payload.className,
      session: payload.session,
      term: payload.term,
      termLabel: payload.termLabel || `${payload.term} (${payload.session})`,
      totalScore,
      totalPossible,
      average,
      position: payload.position,
      numberInClass: payload.numberInClass,
      nextClass: payload.nextClass,
      nextTermBegins: payload.nextTermBegins,
      daysPresent: payload.daysPresent,
      daysOpened: payload.daysOpened,
      daysAbsent: payload.daysAbsent,
      decision: payload.decision,
      teacherRemark: payload.teacherRemark,
      principalRemark: payload.principalRemark,
      resultPayload: JSON.stringify(payload),
      isPublished: effectivePublished,
      updatedAt: now,
    };
    items[existingIdx] = updated;
    persistStoreToDisk(items);
    return updated;
  } else {
    const effectivePublished =
      options?.isPublished !== undefined ? options.isPublished : true;
    const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id || 0)) + 1 : 1;
    const newItem: StoredTerminalResultItem = {
      id: nextId,
      admNo: payload.admNo,
      studentName: payload.studentName,
      className: payload.className,
      session: payload.session,
      term: payload.term,
      termLabel: payload.termLabel || `${payload.term} (${payload.session})`,
      totalScore,
      totalPossible,
      average,
      position: payload.position,
      numberInClass: payload.numberInClass,
      nextClass: payload.nextClass,
      nextTermBegins: payload.nextTermBegins,
      daysPresent: payload.daysPresent,
      daysOpened: payload.daysOpened,
      daysAbsent: payload.daysAbsent,
      decision: payload.decision,
      teacherRemark: payload.teacherRemark,
      principalRemark: payload.principalRemark,
      resultPayload: JSON.stringify(payload),
      isPublished: effectivePublished,
      createdAt: now,
      updatedAt: now,
    };
    items.unshift(newItem);
    persistStoreToDisk(items);
    return newItem;
  }
}

/**
 * Normalizes term string for robust comparison:
 * e.g. "Third Term", "3rd Term", "Third", "3rd" -> "third"
 * "Second Term", "2nd Term", "Second", "2nd" -> "second"
 * "First Term", "1st Term", "First", "1st" -> "first"
 */
export function normalizeTerm(term?: string | null): string {
  if (!term) return "";
  const lower = term.toLowerCase().trim();
  if (lower.includes("third") || lower.includes("3rd") || lower === "3") return "third";
  if (lower.includes("second") || lower.includes("2nd") || lower === "2") return "second";
  if (lower.includes("first") || lower.includes("1st") || lower === "1") return "first";
  return lower;
}

export function normalizeSession(session?: string | null): string {
  if (!session) return "";
  return session.replace(/\s+/g, "").toLowerCase();
}

/**
 * Finds all uploaded terms for a student from local JSON store
 */
export function getStudentUploadedTermsFromStore(
  admNo: string,
  includeDrafts: boolean = false
): { session: string; term: string }[] {
  const items = getLocalTerminalResultsStore();
  const cleanAdmNo = admNo.trim().toUpperCase();
  const matches = items.filter(
    (i) =>
      i.admNo.trim().toUpperCase() === cleanAdmNo &&
      (includeDrafts || i.isPublished !== false)
  );
  return matches.map((m) => ({ session: m.session, term: m.term }));
}

/**
 * Finds a result by admNo and optional session/term from local JSON store.
 * If a specific term is requested, it strictly returns that term and NEVER falls back
 * to a different term (so if 2nd term is unreleased, it correctly returns null).
 */
export function findInLocalTerminalResultsStore(
  admNo: string,
  session?: string,
  term?: string,
  includeDrafts: boolean = false
): PreparedResultPayload | null {
  const items = getLocalTerminalResultsStore().filter(
    (i) => includeDrafts || i.isPublished !== false
  );
  const cleanAdmNo = admNo.trim().toUpperCase();
  const targetNormTerm = normalizeTerm(term);
  const targetNormSession = normalizeSession(session);

  // If a specific term was requested, strictly match it!
  if (targetNormTerm) {
    const found = items.find((i) => {
      const admMatch = i.admNo.trim().toUpperCase() === cleanAdmNo;
      const sessMatch = targetNormSession ? normalizeSession(i.session) === targetNormSession : true;
      const termMatch = normalizeTerm(i.term) === targetNormTerm;
      return admMatch && sessMatch && termMatch;
    });

    if (found && found.resultPayload) {
      try {
        return JSON.parse(found.resultPayload) as PreparedResultPayload;
      } catch {
        return null;
      }
    }
    // Strict: Do NOT fall back to another term if a specific term was selected!
    return null;
  }

  // Only if NO specific term was requested (e.g. general lookup), match latest by admNo
  let found = items.find((i) => {
    const admMatch = i.admNo.trim().toUpperCase() === cleanAdmNo;
    const sessMatch = targetNormSession ? normalizeSession(i.session) === targetNormSession : true;
    return admMatch && sessMatch;
  });

  if (!found) {
    found = items.find((i) => i.admNo.trim().toUpperCase() === cleanAdmNo);
  }

  if (found && found.resultPayload) {
    try {
      return JSON.parse(found.resultPayload) as PreparedResultPayload;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Deletes a result from local JSON store
 */
export function deleteFromLocalTerminalResultsStore(idOrAdmNo: number | string): boolean {
  try {
    const items = getLocalTerminalResultsStore();
    const filtered = items.filter((i) => {
      if (typeof idOrAdmNo === "number") {
        return i.id !== idOrAdmNo;
      }
      return i.admNo.trim().toUpperCase() !== String(idOrAdmNo).trim().toUpperCase();
    });
    persistStoreToDisk(filtered);
    return true;
  } catch (err) {
    console.error("Failed to delete from local store:", err);
    return false;
  }
}
