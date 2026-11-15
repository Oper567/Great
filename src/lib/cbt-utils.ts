/**
 * Gatekeeper helper: CBT access is open to Secondary students (JSS 1-3 and SS 1-3).
 * Rejects Primary/Nursery students.
 */
export function isSeniorSecondaryClass(currentClass: string): boolean {
  if (!currentClass) return false;
  const clean = currentClass.trim();
  const secPattern = /\b(JSS|SS)\s*[123](?![0-9])/i;
  return secPattern.test(clean);
}

/**
 * Normalizes a student or class Arm / Stream name into canonical institutional form.
 * Examples:
 * - "sci", "science", "sciences", "Science Stream" -> "Science"
 * - "art", "arts", "Art / Arts", "Humanities" -> "Art"
 * - "comm", "commerce", "commercial" -> "Commercial"
 * - "diamond" -> "Diamond", "platinum" -> "Platinum", "gold" -> "Gold"
 * - "NONE", "General", "All", "All Streams", "" -> ""
 */
export function normalizeArmName(rawArm?: string | null): string {
  if (!rawArm) return "";
  let clean = String(rawArm)
    .trim()
    .replace(/^[\(\[\-\s]+|[\)\]\-\s]+$/g, "")
    .trim();

  if (!clean) return "";

  // Strip trailing student count annotations like "Science - 29 Students" or "Art - 35 Pupils"
  clean = clean.replace(/\s*-\s*\d+\s*(students?|pupils?|candidates?)?.*$/i, "").trim();

  const lower = clean.toLowerCase();
  if (
    lower === "none" ||
    lower === "general" ||
    lower === "all" ||
    lower.startsWith("all stream") ||
    lower.startsWith("all ") ||
    lower.includes("optional") ||
    lower === "null" ||
    lower === "undefined" ||
    lower === "--"
  ) {
    return "";
  }

  if (/^sci(ence|ences)?(\s+stream)?$/i.test(clean)) return "Science";
  if (/^(art|arts|art\s*\/\s*arts|humanities)(\s+stream)?$/i.test(clean)) return "Art";
  if (/^comm(erce|ercial)?(\s+stream)?$/i.test(clean)) return "Commercial";
  if (/^diamond$/i.test(clean)) return "Diamond";
  if (/^platinum$/i.test(clean)) return "Platinum";
  if (/^gold$/i.test(clean)) return "Gold";
  if (/^silver$/i.test(clean)) return "Silver";

  // Preserve short arm codes like "A", "B", "C" or title-case custom arms
  if (clean.length === 1) return clean.toUpperCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Parses a class string and optional explicit arm into:
 * - `baseLevel`: e.g. "SS 2", "SS 3", "JSS 1"
 * - `arm`: e.g. "Science", "Art", "Commercial", "Diamond", ""
 * - `displayLabel`: canonical combined label e.g. "SS 2 (Science)", "JSS 1 Diamond", "SS 1"
 */
export function parseClassAndArm(
  rawClass?: string | null,
  explicitArm?: string | null
): {
  baseLevel: string;
  arm: string;
  displayLabel: string;
} {
  const cleanRaw = (rawClass || "").trim();
  const normExplicitArm = normalizeArmName(explicitArm);

  if (!cleanRaw) {
    return {
      baseLevel: "",
      arm: normExplicitArm,
      displayLabel: normExplicitArm ? `(${normExplicitArm})` : "",
    };
  }

  let baseLevel = cleanRaw;
  let embeddedArm = "";

  // 1. Extract parenthetical stream if present, e.g. "SS 2 (Science)" or "SS 2 (Science - 29 Students)"
  const parenMatch = cleanRaw.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    embeddedArm = normalizeArmName(parenMatch[1]);
  }

  const withoutParens = cleanRaw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

  // 2. Match JSS 1-3 or SS 1-3 or Primary/Basic/Nursery
  const jssMatch = withoutParens.match(/\bJSS\s*([1-3])\s*(.*)$/i);
  const ssMatch = !jssMatch ? withoutParens.match(/(?<![A-Za-z])SS\s*([1-3])\s*(.*)$/i) : null;
  const priMatch = !jssMatch && !ssMatch ? withoutParens.match(/\b(?:Primary|Basic|Grade)\s*([1-6])\s*(.*)$/i) : null;
  const nurMatch = !jssMatch && !ssMatch && !priMatch ? withoutParens.match(/\bNursery\s*([1-3])\s*(.*)$/i) : null;

  if (jssMatch) {
    baseLevel = `JSS ${jssMatch[1]}`;
    if (!embeddedArm && jssMatch[2]) {
      embeddedArm = normalizeArmName(jssMatch[2]);
    }
  } else if (ssMatch) {
    baseLevel = `SS ${ssMatch[1]}`;
    if (!embeddedArm && ssMatch[2]) {
      embeddedArm = normalizeArmName(ssMatch[2]);
    }
  } else if (priMatch) {
    baseLevel = `Primary ${priMatch[1]}`;
    if (!embeddedArm && priMatch[2]) {
      embeddedArm = normalizeArmName(priMatch[2]);
    }
  } else if (nurMatch) {
    baseLevel = `Nursery ${nurMatch[1]}`;
    if (!embeddedArm && nurMatch[2]) {
      embeddedArm = normalizeArmName(nurMatch[2]);
    }
  } else {
    baseLevel = withoutParens;
  }

  const finalArm = normExplicitArm || embeddedArm;

  let displayLabel = baseLevel;
  if (finalArm) {
    if (
      baseLevel.startsWith("JSS") &&
      ["Diamond", "Platinum", "Gold", "Silver"].includes(finalArm)
    ) {
      displayLabel = `${baseLevel} ${finalArm}`;
    } else {
      displayLabel = `${baseLevel} (${finalArm})`;
    }
  }

  return {
    baseLevel,
    arm: finalArm,
    displayLabel,
  };
}

/**
 * Formats a student's class and arm into a clean institutional label.
 * e.g. ("SS 2", "Science") -> "SS 2 (Science)"
 *      ("SS 2 (Science)", "Science") -> "SS 2 (Science)"
 *      ("JSS 1", "Diamond") -> "JSS 1 Diamond"
 */
export function formatClassWithArm(rawClass?: string | null, explicitArm?: string | null): string {
  return parseClassAndArm(rawClass, explicitArm).displayLabel;
}

/**
 * Determines whether a CBT Exam's `targetClass` applies to a student with `(studentClass, studentArm)`.
 * - General level exams (e.g. `targetClass = "SS 2"`) apply to ALL arms in SS 2 (Science, Art, Commercial, etc.).
 * - Stream-specific exams (e.g. `targetClass = "SS 2 (Science)"`) apply ONLY to SS 2 students in Science
 *   (or SS 2 students who have no arm assigned yet).
 * - Multi-level targets like `"SS 1 - SS 3"` or `"All"` match their respective division.
 */
export function doesExamTargetMatchStudent(
  examTargetClass: string,
  studentClass: string,
  studentArm?: string | null
): boolean {
  const cleanTarget = (examTargetClass || "").trim();
  if (!cleanTarget) return false;

  const student = parseClassAndArm(studentClass, studentArm);
  if (!student.baseLevel) return false;

  const lowerTarget = cleanTarget.toLowerCase();
  if (lowerTarget === "all" || lowerTarget === "all secondary" || lowerTarget === "all classes") {
    return true;
  }
  if (
    lowerTarget.includes("ss 1 - ss 3") ||
    lowerTarget.includes("all senior") ||
    lowerTarget === "ss"
  ) {
    return student.baseLevel.startsWith("SS ");
  }
  if (
    lowerTarget.includes("jss 1 - jss 3") ||
    lowerTarget.includes("all junior") ||
    lowerTarget === "jss"
  ) {
    return student.baseLevel.startsWith("JSS ");
  }

  const exam = parseClassAndArm(cleanTarget);
  if (exam.baseLevel.toUpperCase() !== student.baseLevel.toUpperCase()) {
    return false;
  }

  // If the exam targets the entire class level (e.g. "SS 2" general paper like Maths/English),
  // every arm/stream in that level takes it.
  if (!exam.arm) {
    return true;
  }

  // If the exam targets a specific stream/arm (e.g. "SS 2 (Science)" Physics):
  // If the student has an assigned arm, it must match the exam's arm.
  if (student.arm) {
    return exam.arm.toLowerCase() === student.arm.toLowerCase();
  }

  // If the student has no arm assigned yet, allow access so unassigned candidates aren't locked out
  return true;
}

/**
 * Determines whether a student record `(studentClass, studentArm)` matches a class filter
 * (such as `"ALL"`, `"SS 2"`, `"SS 2 (Science)"`, `"JSS 1 Diamond"`) and optional arm filter.
 */
export function doesStudentMatchClassFilter(
  studentClass?: string | null,
  studentArm?: string | null,
  filterClass?: string | null,
  filterArm?: string | null
): boolean {
  const student = parseClassAndArm(studentClass, studentArm);

  // Check explicit arm filter if provided
  if (filterArm && filterArm !== "ALL") {
    if (filterArm === "NONE") {
      if (student.arm !== "") return false;
    } else {
      const targetArm = normalizeArmName(filterArm);
      if (student.arm.toLowerCase() !== targetArm.toLowerCase()) return false;
    }
  }

  const cleanFilterClass = (filterClass || "").trim();
  if (!cleanFilterClass || cleanFilterClass.toUpperCase() === "ALL") {
    return true;
  }

  const target = parseClassAndArm(cleanFilterClass);
  if (student.baseLevel.toUpperCase() !== target.baseLevel.toUpperCase()) {
    return false;
  }

  // If filter is just the base class (e.g. "SS 2"), it matches all arms in SS 2 (Science, Art, Commercial, etc.)
  if (!target.arm) {
    return true;
  }

  // If filter specifies an arm (e.g. "SS 2 (Science)" or "JSS 1 Diamond"):
  if (student.arm) {
    return student.arm.toLowerCase() === target.arm.toLowerCase();
  }

  // Special case: In JSS where standard class names are "JSS 1 Diamond", "JSS 2 Diamond", "JSS 3 Platinum",
  // a student registered simply as "JSS 1" with no arm belongs to that default JSS cohort.
  if (
    student.baseLevel.startsWith("JSS") &&
    ["Diamond", "Platinum"].includes(target.arm)
  ) {
    return true;
  }

  return false;
}

/**
 * Deterministic PRNG seeded by string (Mulberry32 algorithm)
 * Guarantees every candidate receives a personalized, unique question sequence
 * that stays 100% consistent across browser reloads, pauses, and network reconnects.
 */
export function createSeededRandom(seedStr: string): () => number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (Math.imul(31, hash) + seedStr.charCodeAt(i)) | 0;
  }
  let a = hash >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * High-performance Fisher-Yates shuffle with seeded PRNG
 */
export function shuffleArrayWithSeed<T>(array: T[], seed: string): T[] {
  if (!array || array.length <= 1) return array ? [...array] : [];
  const copy = [...array];
  const rand = createSeededRandom(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Checks whether a teacher's assigned subject is unrestricted ("All Subjects", "General", etc.).
 */
export function isUnrestrictedSubject(subject?: string | null): boolean {
  const clean = (subject || "").trim().toLowerCase();
  return (
    !clean ||
    clean === "all" ||
    clean === "all subjects" ||
    clean === "all courses" ||
    clean === "general"
  );
}

/**
 * Checks whether a teacher's assigned class is unrestricted ("All Classes", "All", etc.).
 */
export function isUnrestrictedClass(cls?: string | null): boolean {
  const clean = (cls || "").trim().toLowerCase();
  return (
    !clean ||
    clean === "all" ||
    clean === "all classes" ||
    clean === "all secondary" ||
    clean === "general"
  );
}

/**
 * Normalizes a subject name or token for flexible course matching
 * (e.g. "Maths" <-> "Mathematics", "Agric" <-> "Agricultural Science").
 */
function normalizeSubjectToken(raw: string): string {
  const lower = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (lower === "math" || lower === "maths") return "mathematics";
  if (lower === "agric" || lower === "agric science") return "agricultural science";
  if (lower === "english") return "english language";
  if (lower === "crs") return "christian religious studies";
  if (lower === "irs") return "islamic religious studies";
  return lower;
}

/**
 * Matches a teacher's `assignedSubject` (supports comma/semicolon lists) against an exam's `subject`.
 */
export function doesSubjectMatch(
  assignedSubject?: string | null,
  examSubject?: string | null
): boolean {
  if (isUnrestrictedSubject(assignedSubject)) return true;
  const targetRaw = (examSubject || "").trim().toLowerCase();
  if (!targetRaw) return false;

  const targetNorm = normalizeSubjectToken(targetRaw);
  const tokens = (assignedSubject || "")
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return tokens.some((tok) => {
    const tokLower = tok.toLowerCase();
    const tokNorm = normalizeSubjectToken(tok);
    return (
      targetRaw === tokLower ||
      targetNorm === tokNorm ||
      targetRaw.includes(tokLower) ||
      tokLower.includes(targetRaw) ||
      targetNorm.includes(tokNorm) ||
      tokNorm.includes(targetNorm)
    );
  });
}

/**
 * Single source of truth for teacher ownership / authorization on an Exam:
 * - SUPER_ADMIN can view and grade any exam.
 * - TEACHER can view and grade an exam if they created it (`createdBy === email`),
 *   OR if their `assignedSubject` matches `exam.subject` (or their `assignedClass` matches
 *   when `assignedSubject` is "General" / "All Subjects").
 */
export function doesTeacherMatchExam(
  teacher:
    | {
        role?: string | null;
        email?: string | null;
        assignedSubject?: string | null;
        assignedClass?: string | null;
      }
    | null
    | undefined,
  exam:
    | {
        createdBy?: string | null;
        subject?: string | null;
        targetClass?: string | null;
      }
    | null
    | undefined
): boolean {
  if (!teacher || !exam) return false;
  if (teacher.role === "SUPER_ADMIN") return true;
  if (teacher.role && teacher.role !== "TEACHER") return false;

  const teacherEmail = (teacher.email || "").trim().toLowerCase();
  const examCreator = (exam.createdBy || "").trim().toLowerCase();
  if (teacherEmail && examCreator && teacherEmail === examCreator) {
    return true;
  }

  if (!isUnrestrictedSubject(teacher.assignedSubject)) {
    return doesSubjectMatch(teacher.assignedSubject, exam.subject);
  }

  // Unrestricted / General subject: scope by assignedClass if one is specified
  if (!isUnrestrictedClass(teacher.assignedClass) && exam.targetClass) {
    return (
      doesExamTargetMatchStudent(exam.targetClass, teacher.assignedClass!) ||
      doesExamTargetMatchStudent(teacher.assignedClass!, exam.targetClass)
    );
  }

  return true;
}

/**
 * Consistently determines whether a completed student CBT attempt still needs manual theory grading.
 * Handles both `theoryScore === null` and legacy/interrupted rows where `theory_score` was
 * initialized to `0` while still untransmitted and without any `gradedByTeacherName`.
 */
export function isAttemptAwaitingTheory(attempt: {
  isCompleted?: boolean | null;
  theoryScore?: number | null;
  isTransmittedToAdmin?: boolean | null;
  gradedByTeacherName?: string | null;
}): boolean {
  if (!attempt || attempt.isCompleted === false) return false;
  if (attempt.isTransmittedToAdmin) return false;
  if (attempt.theoryScore === null || attempt.theoryScore === undefined) return true;
  return Number(attempt.theoryScore) === 0 && !(attempt.gradedByTeacherName || "").trim();
}

export interface ParsedStudentAnswersPayload {
  answers: Record<string, string>;
  answeredCount: number;
  flaggedQuestionIds: number[];
  questionOrder: number[];
  remainingSeconds: number | null;
  lastSavedAt: string | null;
  currentIndex: number | null;
}

function normalizePositiveIntArray(value: unknown, limit = 500): number[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of value) {
    const num = Number(raw);
    if (Number.isInteger(num) && num > 0 && !seen.has(num)) {
      seen.add(num);
      out.push(num);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * Safely parses `exam_attempts.student_answers` JSON and separates numeric question responses
 * from internal `__meta_*` tracking fields (`__meta_flagged`, `__meta_qOrder`, timing heartbeats).
 */
export function parseStudentAnswersPayload(
  raw: string | null | undefined
): ParsedStudentAnswersPayload {
  const empty: ParsedStudentAnswersPayload = {
    answers: {},
    answeredCount: 0,
    flaggedQuestionIds: [],
    questionOrder: [],
    remainingSeconds: null,
    lastSavedAt: null,
    currentIndex: null,
  };
  if (!raw || typeof raw !== "string") return empty;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return empty;

    const answers: Record<string, string> = {};
    let answeredCount = 0;
    for (const [k, v] of Object.entries(parsed)) {
      if (!k.startsWith("__meta_") && typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed) {
          answers[k] = trimmed;
          answeredCount++;
        }
      }
    }

    const remainingSeconds =
      typeof (parsed as any).__meta_remainingSec === "number" &&
      Number.isFinite((parsed as any).__meta_remainingSec)
        ? (parsed as any).__meta_remainingSec
        : null;

    const lastSavedAt =
      typeof (parsed as any).__meta_heartbeatMs === "number" &&
      Number.isFinite((parsed as any).__meta_heartbeatMs)
        ? new Date((parsed as any).__meta_heartbeatMs).toISOString()
        : null;

    const currentIndex =
      typeof (parsed as any).__meta_currentIndex === "number" &&
      Number.isInteger((parsed as any).__meta_currentIndex) &&
      (parsed as any).__meta_currentIndex >= 0
        ? (parsed as any).__meta_currentIndex
        : null;

    return {
      answers,
      answeredCount,
      flaggedQuestionIds: normalizePositiveIntArray((parsed as any).__meta_flagged),
      questionOrder: normalizePositiveIntArray((parsed as any).__meta_qOrder),
      remainingSeconds,
      lastSavedAt,
      currentIndex,
    };
  } catch {
    return empty;
  }
}

/**
 * Serializes `student_answers` safely for final submission or checkpoints while preserving
 * flagged question IDs and randomized question order unless explicitly overridden.
 */
export function buildStudentAnswersPayload(
  answers: Record<string, string>,
  existingRaw?: string | null,
  overrides?: {
    flaggedIds?: number[];
    questionOrder?: number[];
    remainingSeconds?: number;
    heartbeatMs?: number;
    currentIndex?: number;
  }
): string {
  const existing = parseStudentAnswersPayload(existingRaw);
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(answers || {})) {
    if (!k.startsWith("__meta_") && /^\d+$/.test(k) && typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed && trimmed.length <= 32) {
        out[k] = trimmed;
      }
    }
  }

  const effectiveFlags =
    overrides?.flaggedIds !== undefined
      ? normalizePositiveIntArray(overrides.flaggedIds)
      : existing.flaggedQuestionIds;
  if (effectiveFlags.length > 0) {
    out.__meta_flagged = effectiveFlags;
  }

  const effectiveOrder =
    overrides?.questionOrder !== undefined
      ? normalizePositiveIntArray(overrides.questionOrder)
      : existing.questionOrder;
  if (effectiveOrder.length > 0) {
    out.__meta_qOrder = effectiveOrder;
  }

  if (typeof overrides?.heartbeatMs === "number" && Number.isFinite(overrides.heartbeatMs)) {
    out.__meta_heartbeatMs = overrides.heartbeatMs;
  }
  if (typeof overrides?.remainingSeconds === "number" && Number.isFinite(overrides.remainingSeconds)) {
    out.__meta_remainingSec = overrides.remainingSeconds;
  }
  if (typeof overrides?.currentIndex === "number" && Number.isInteger(overrides.currentIndex) && overrides.currentIndex >= 0) {
    out.__meta_currentIndex = overrides.currentIndex;
  }

  return JSON.stringify(out);
}
