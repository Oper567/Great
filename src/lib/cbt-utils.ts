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
