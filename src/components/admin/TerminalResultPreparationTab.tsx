"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  GraduationCap,
  PlusCircle,
  Search,
  Trash2,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Award,
  Calendar,
  Layers,
  ChevronRight,
  UserCheck,
  Percent,
  TrendingUp,
  X,
  Sparkles,
  Save,
  Upload,
  Camera,
  CheckSquare,
  Square,
  Users,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  ListOrdered,
  Download,
  ChevronLeft,
  Clock,
} from "lucide-react";
import {
  saveTerminalResultAction,
  deleteTerminalResultAction,
  purgeAllTerminalResultsAction,
  getAllTerminalResultsAction,
  saveBatchTerminalResultsAction,
  autoRankCohortPositionsAction,
  BatchResultInputItem,
} from "@/app/actions/terminal-result-admin";
import {
  getAllTeacherCourseDraftsForAdminAction,
  finalizeAndPublishClassDraftResultsAction,
} from "@/app/actions/teacher-scores";
import {
  DEFAULT_PREPARED_SKILLS,
  DEFAULT_PREPARED_BEHAVIOUR,
  DEFAULT_PREPARED_FEE,
  PreparedSubjectScore,
  getOrdinalSuffix,
} from "@/types/report-card";
import DelegatedSubjectScoreUploader from "@/components/results/DelegatedSubjectScoreUploader";
import {
  parseClassAndArm,
  formatClassWithArm,
  doesStudentMatchClassFilter,
} from "@/lib/cbt-utils";

export interface PrefillStudentTarget {
  admNo: string;
  studentName?: string;
  className?: string;
  arm?: string;
  gender?: string;
  token?: number;
}

interface Props {
  initialResults: any[];
  initialStudents?: any[];
  prefillTarget?: PrefillStudentTarget | null;
  onClearPrefill?: () => void;
}

export const STANDARD_CLASSES = [
  "JSS 1 Diamond",
  "JSS 1",
  "JSS 2 Diamond",
  "JSS 2",
  "JSS 3 Platinum",
  "JSS 3",
  "SS 1 (Science)",
  "SS 1 (Art)",
  "SS 1 (Commercial)",
  "SS 1",
  "SS 2 (Science)",
  "SS 2 (Art)",
  "SS 2 (Commercial)",
  "SS 2",
  "SS 3 (Science)",
  "SS 3 (Art)",
  "SS 3 (Commercial)",
  "SS 3",
];

export interface ParsedBatchRow {
  admNo: string;
  studentName: string;
  className: string;
  average: number;
  totalScore: number;
  decision: string;
  isValid: boolean;
  error?: string;
  isUploaded?: boolean;
}

export function parsePastedResultRows(
  text: string,
  targetClass: string,
  initialStudents: any[] = [],
  existingResults: any[] = []
): ParsedBatchRow[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const rows: ParsedBatchRow[] = [];

  const studentMapByAdm = new Map<string, { name: string; currentClass?: string }>();
  initialStudents.forEach((s) => {
    const a = (s.admNo || s.admissionNumber || s.adm_no || "").trim().toUpperCase();
    const name = (s.fullName || s.full_name || `${s.surname || ""} ${s.firstName || ""}`).trim();
    const c = formatClassWithArm(s.currentClass || s.current_class || "", s.arm);
    if (a && name) studentMapByAdm.set(a, { name, currentClass: c });
  });
  existingResults.forEach((r) => {
    const a = (r.admNo || r.adm_no || "").trim().toUpperCase();
    const name = (r.studentName || r.student_name || "").trim();
    const c = (r.className || r.class_name || "").trim();
    if (a && name && !studentMapByAdm.has(a)) studentMapByAdm.set(a, { name, currentClass: c });
  });

  for (const line of lines) {
    const lower = line.toLowerCase();
    // Skip headers like Admission No, Name, Class, Average, Decision
    if (
      (lower.includes("adm") || lower.includes("reg") || lower.includes("s/n") || lower.includes("serial") || lower.includes("student_id") || lower.includes("admission_number")) &&
      (lower.includes("name") || lower.includes("score") || lower.includes("average") || lower.includes("class") || lower.includes("total"))
    ) {
      continue;
    }

    let tokens: string[] = [];
    if (line.includes("\t")) {
      tokens = line.split("\t").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else if (line.includes(",")) {
      // Regex CSV splitter that respects quoted strings like "Okonkwo, Adaobi"
      const csvMatches = line.match(/(?:[^\s,"]|"(?:\\.|[^"])*")+/g);
      tokens = csvMatches ? csvMatches.map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean) : line.split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else if (line.includes(";")) {
      tokens = line.split(";").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else if (line.includes("|")) {
      tokens = line.split("|").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else {
      tokens = line.split(/\s{2,}|\t/).map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      if (tokens.length <= 1) {
        tokens = line.split(/\s+/).map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      }
    }

    if (tokens.length === 0) continue;

    // Remove index numbers (e.g. 1, 1., #1)
    if (/^#?\d+[\.\)]?$/.test(tokens[0]) && tokens.length > 1) {
      tokens.shift();
    }

    let admNo = "";
    let scoreNum: number | null = null;
    let name = "";
    let decision = "";
    let detectedClass = "";

    // 1. Detect Class token if present in row (e.g. "JSS 1", "JSS 2 Diamond", "SS 2 (Science)")
    const classIdx = tokens.findIndex((t) => {
      const tl = t.toLowerCase();
      return (
        /^(jss\s*[1-3]|ss\s*[1-3]|basic\s*\d|primary\s*\d|grade\s*\d|nursery|creche)/i.test(t) ||
        STANDARD_CLASSES.some((sc) => sc.toLowerCase() === tl || tl.includes(sc.toLowerCase()))
      );
    });
    if (classIdx !== -1) {
      detectedClass = tokens[classIdx];
      tokens.splice(classIdx, 1);
    }

    // 2. Find admission number token
    let admIndex = tokens.findIndex((t) => /GFMS|\/|\b\d{4}\/\d{3,}\b/i.test(t));
    if (admIndex === -1) {
      admIndex = tokens.findIndex((t) => studentMapByAdm.has(t.toUpperCase()));
    }
    if (admIndex === -1 && /^[A-Za-z0-9\/-]{4,20}$/.test(tokens[0]) && /\d/.test(tokens[0])) {
      admIndex = 0;
    }

    if (admIndex !== -1) {
      admNo = tokens[admIndex].toUpperCase();
      tokens.splice(admIndex, 1);
    }

    // 3. Find score token
    const scoreIndex = tokens.findIndex((t) => {
      const clean = t.replace("%", "").trim();
      const n = parseFloat(clean);
      return !isNaN(n) && n >= 0 && n <= 1000;
    });

    if (scoreIndex !== -1) {
      const clean = tokens[scoreIndex].replace("%", "").trim();
      scoreNum = parseFloat(clean);
      tokens.splice(scoreIndex, 1);
    }

    // 4. Remaining is name & decision
    const remaining = tokens.join(" ").trim();
    if (remaining) {
      const match = remaining.match(/\b(promoted\s+on\s+trial|promoted|passed|advised to repeat|repeat|withdrawn)\b/i);
      if (match) {
        decision = match[0].toUpperCase();
        name = remaining.replace(match[0], "").trim();
      } else {
        name = remaining;
      }
    }

    // Auto-resolve name & class if missing
    if (admNo && studentMapByAdm.has(admNo)) {
      const stInfo = studentMapByAdm.get(admNo)!;
      if (!name) name = stInfo.name;
      if (!detectedClass && stInfo.currentClass) detectedClass = stInfo.currentClass;
    }

    // Auto-resolve admNo if missing
    if (!admNo && name) {
      const found = initialStudents.find(
        (s) =>
          (s.fullName || s.full_name || "").toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes((s.fullName || s.full_name || "").toLowerCase())
      );
      if (found) {
        admNo = (found.admNo || found.admissionNumber || found.adm_no || "").toUpperCase();
        if (!detectedClass && (found.currentClass || found.current_class)) {
          detectedClass = found.currentClass || found.current_class;
        }
      }
    }

    let avg = 70;
    let tot = 700;
    if (scoreNum !== null) {
      if (scoreNum > 100) {
        tot = Math.round(scoreNum);
        avg = parseFloat((scoreNum / 10).toFixed(1));
      } else {
        avg = parseFloat(scoreNum.toFixed(1));
        tot = Math.round(scoreNum * 10);
      }
    }

    const rowFinalClass = (detectedClass || targetClass || "JSS 1 Diamond").trim();
    const isValid = Boolean(admNo && name);
    rows.push({
      admNo: admNo || "UNKNOWN",
      studentName: name || "Student Name Missing",
      className: rowFinalClass,
      average: avg,
      totalScore: tot,
      decision: decision || (avg >= 40 ? "PROMOTED" : "ADVISED TO REPEAT"),
      isValid,
      error: !admNo ? "Missing Adm No" : !name ? "Missing Name" : undefined,
      isUploaded: false,
    });
  }

  return rows;
}

const DEFAULT_SUBJECTS: { name: string; code: string; category: string }[] = [
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

const SCIENCE_STREAM_SUBJECTS: { name: string; code: string; category: string }[] = [
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
];

const ART_STREAM_SUBJECTS: { name: string; code: string; category: string }[] = [
  { name: "English Language", code: "ENG", category: "Languages" },
  { name: "Mathematics", code: "MTH", category: "Mathematical Sciences" },
  { name: "Literature in English", code: "LIT", category: "Humanities" },
  { name: "Government", code: "GOV", category: "Humanities" },
  { name: "Christian Religious Studies", code: "CRS", category: "Humanities" },
  { name: "Economics", code: "ECO", category: "Social Sciences" },
  { name: "Civic Education", code: "CIV", category: "National Values" },
  { name: "Biology", code: "BIO", category: "Science" },
  { name: "Igbo Language", code: "IGB", category: "Languages" },
  { name: "Visual Arts / CCA", code: "CCA", category: "Humanities" },
];

const COMMERCIAL_STREAM_SUBJECTS: { name: string; code: string; category: string }[] = [
  { name: "English Language", code: "ENG", category: "Languages" },
  { name: "Mathematics", code: "MTH", category: "Mathematical Sciences" },
  { name: "Financial Accounting", code: "ACC", category: "Commercial" },
  { name: "Commerce", code: "COM", category: "Commercial" },
  { name: "Economics", code: "ECO", category: "Social Sciences" },
  { name: "Government", code: "GOV", category: "Humanities" },
  { name: "Civic Education", code: "CIV", category: "National Values" },
  { name: "Data Processing", code: "DP", category: "Technology" },
  { name: "Biology", code: "BIO", category: "Science" },
];

export interface GradeStandardTier {
  id: string;
  minScore: number;
  maxScore: number;
  grade: string;
  remark: string;
}

export const DEFAULT_GRADE_STANDARDS: GradeStandardTier[] = [
  { id: "tier-1", minScore: 75, maxScore: 100, grade: "A", remark: "Distinction" },
  { id: "tier-2", minScore: 65, maxScore: 74, grade: "B", remark: "Very Good" },
  { id: "tier-3", minScore: 50, maxScore: 64, grade: "C", remark: "Credit" },
  { id: "tier-4", minScore: 40, maxScore: 49, grade: "D", remark: "Pass" },
  { id: "tier-5", minScore: 0, maxScore: 39, grade: "F", remark: "Fail" },
];

export const PRESET_STANDARDS: { name: string; description: string; tiers: GradeStandardTier[] }[] = [
  {
    name: "GFMS / Nigerian Basic (Default)",
    description: "A (75-100), B (65-74), C (50-64), D (40-49), F (0-39)",
    tiers: [
      { id: "gfms-1", minScore: 75, maxScore: 100, grade: "A", remark: "Distinction" },
      { id: "gfms-2", minScore: 65, maxScore: 74, grade: "B", remark: "Very Good" },
      { id: "gfms-3", minScore: 50, maxScore: 64, grade: "C", remark: "Credit" },
      { id: "gfms-4", minScore: 40, maxScore: 49, grade: "D", remark: "Pass" },
      { id: "gfms-5", minScore: 0, maxScore: 39, grade: "F", remark: "Fail" },
    ],
  },
  {
    name: "WAEC / WASSCE 9-Point Standard",
    description: "A1 (75-100), B2 (70-74), B3 (65-69), C4 (60-64), C5 (55-59), C6 (50-54), D7 (45-49), E8 (40-44), F9 (0-39)",
    tiers: [
      { id: "waec-1", minScore: 75, maxScore: 100, grade: "A1", remark: "Excellent" },
      { id: "waec-2", minScore: 70, maxScore: 74, grade: "B2", remark: "Very Good" },
      { id: "waec-3", minScore: 65, maxScore: 69, grade: "B3", remark: "Good" },
      { id: "waec-4", minScore: 60, maxScore: 64, grade: "C4", remark: "Credit" },
      { id: "waec-5", minScore: 55, maxScore: 59, grade: "C5", remark: "Credit" },
      { id: "waec-6", minScore: 50, maxScore: 54, grade: "C6", remark: "Credit" },
      { id: "waec-7", minScore: 45, maxScore: 49, grade: "D7", remark: "Pass" },
      { id: "waec-8", minScore: 40, maxScore: 44, grade: "E8", remark: "Pass" },
      { id: "waec-9", minScore: 0, maxScore: 39, grade: "F9", remark: "Fail" },
    ],
  },
  {
    name: "Montessori Honors Scale",
    description: "A+ (85-100), A (75-84), B+ (65-74), B (55-64), C (45-54), F (0-44)",
    tiers: [
      { id: "honors-1", minScore: 85, maxScore: 100, grade: "A+", remark: "Outstanding" },
      { id: "honors-2", minScore: 75, maxScore: 84, grade: "A", remark: "Distinction" },
      { id: "honors-3", minScore: 65, maxScore: 74, grade: "B+", remark: "Very Good" },
      { id: "honors-4", minScore: 55, maxScore: 64, grade: "B", remark: "Good" },
      { id: "honors-5", minScore: 45, maxScore: 54, grade: "C", remark: "Credit" },
      { id: "honors-6", minScore: 0, maxScore: 44, grade: "F", remark: "Needs Improvement" },
    ],
  },
];

export function computeGradeAndRemark(total: number, standards: GradeStandardTier[]): { grade: string; remark: string } {
  if (!standards || standards.length === 0) {
    if (total >= 75) return { grade: "A", remark: "Distinction" };
    if (total >= 65) return { grade: "B", remark: "Very Good" };
    if (total >= 50) return { grade: "C", remark: "Credit" };
    if (total >= 40) return { grade: "D", remark: "Pass" };
    return { grade: "F", remark: "Fail" };
  }
  const score = Math.round(Number(total) || 0);
  // 1. Check exact range match (minScore <= score <= maxScore)
  for (const tier of standards) {
    const min = Number(tier.minScore ?? 0);
    const max = tier.maxScore !== undefined && tier.maxScore !== null ? Number(tier.maxScore) : 100;
    if (score >= min && score <= max) {
      return { grade: tier.grade, remark: tier.remark };
    }
  }
  // 2. Fallback: descending minScore check
  const sorted = [...standards].sort((a, b) => (Number(b.minScore) || 0) - (Number(a.minScore) || 0));
  for (const tier of sorted) {
    if (score >= Number(tier.minScore || 0)) {
      return { grade: tier.grade, remark: tier.remark };
    }
  }
  const fallback = sorted[sorted.length - 1];
  return { grade: fallback?.grade || "F", remark: fallback?.remark || "Fail" };
}

export default function TerminalResultPreparationTab({
  initialResults,
  initialStudents = [],
  prefillTarget,
  onClearPrefill,
}: Props) {
  const [results, setResults] = useState<any[]>(initialResults);

  useEffect(() => {
    setResults(initialResults);
  }, [initialResults]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [teacherCourseDrafts, setTeacherCourseDrafts] = useState<any[]>([]);
  const [isFinalizingDrafts, setIsFinalizingDrafts] = useState(false);
  const [finalizeFeedback, setFinalizeFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const refreshResultsAndDrafts = useCallback(async () => {
    try {
      const [resList, draftsRes] = await Promise.all([
        getAllTerminalResultsAction().catch(() => null),
        getAllTeacherCourseDraftsForAdminAction().catch(() => null),
      ]);
      if (resList?.success && Array.isArray(resList.results)) {
        setResults(resList.results);
      }
      if (draftsRes?.success && Array.isArray(draftsRes.drafts)) {
        setTeacherCourseDrafts(draftsRes.drafts);
      }
    } catch (err) {
      console.error("Failed to refresh results and teacher drafts:", err);
    }
  }, []);

  useEffect(() => {
    refreshResultsAndDrafts();
  }, [refreshResultsAndDrafts]);

  const handleFinalizeDrafts = async (targetClassName?: string, targetAdmNos?: string[]) => {
    if (isFinalizingDrafts) return;
    setIsFinalizingDrafts(true);
    setFinalizeFeedback(null);
    try {
      const res = await finalizeAndPublishClassDraftResultsAction({
        className: targetClassName && targetClassName !== "ALL" ? targetClassName : undefined,
        admNos: targetAdmNos,
      });
      if (res.success) {
        setFinalizeFeedback({
          type: "success",
          text: res.message || "Draft results finalized and published successfully!",
        });
        await refreshResultsAndDrafts();
      } else {
        setFinalizeFeedback({ type: "error", text: res.message || "Failed to finalize draft results." });
      }
    } catch (err: any) {
      setFinalizeFeedback({ type: "error", text: err?.message || "Failed to finalize draft results." });
    } finally {
      setIsFinalizingDrafts(false);
    }
  };

  // Delegated Subject Uploader Modal State
  const [isDelegatedSubjectOpen, setIsDelegatedSubjectOpen] = useState(false);

  // Small-Small Batch Modal State
  const [isSmallSmallOpen, setIsSmallSmallOpen] = useState(false);
  const [smallSmallMode, setSmallSmallMode] = useState<"roster" | "paste">("roster");
  const [batchClass, setBatchClass] = useState("JSS 2 Diamond");
  const [batchSession, setBatchSession] = useState("2025/2026");
  const [batchTerm, setBatchTerm] = useState("Third Term");

  // Shared Term Defaults
  const [batchNextTermBegins, setBatchNextTermBegins] = useState("Monday, 14th September 2026");
  const [batchPrincipalName, setBatchPrincipalName] = useState("Hon Okolie Peter Isioma JP MCArb (Director)");
  const [batchFormMasterName, setBatchFormMasterName] = useState("Mr. Emmanuel Eze (B.Sc Ed)");
  const [batchDaysOpened, setBatchDaysOpened] = useState(115);
  const [batchDaysPresent, setBatchDaysPresent] = useState(112);
  const [isSharedSettingsOpen, setIsSharedSettingsOpen] = useState(false);

  // Roster Mode State
  const [selectedRosterAdmNos, setSelectedRosterAdmNos] = useState<Set<string>>(new Set());
  const [rosterInputs, setRosterInputs] = useState<Record<string, { average?: string; decision?: string; remark?: string }>>({});
  const [quickFillAverage, setQuickFillAverage] = useState("");

  // Paste & File Upload Mode State (Optimized for 1,000+ Students)
  const [pasteRawText, setPasteRawText] = useState("");
  const [pasteChunkSize, setPasteChunkSize] = useState<number>(50);
  const [pasteCurrentChunkIndex, setPasteCurrentChunkIndex] = useState<number>(0);
  const [uploadedPasteAdmNos, setUploadedPasteAdmNos] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [pasteSearchQuery, setPasteSearchQuery] = useState("");
  const [pasteClassFilter, setPasteClassFilter] = useState("ALL");
  const [pasteStatusFilter, setPasteStatusFilter] = useState<"ALL" | "UPLOADED" | "PENDING">("ALL");
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; percent: number } | null>(null);

  // Batch Processing Status
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isRankingCohort, setIsRankingCohort] = useState(false);

  // Dynamic Grading System State
  const [gradeStandards, setGradeStandards] = useState<GradeStandardTier[]>(DEFAULT_GRADE_STANDARDS);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [editingStandards, setEditingStandards] = useState<GradeStandardTier[]>(DEFAULT_GRADE_STANDARDS);
  const [standardsFeedback, setStandardsFeedback] = useState<string | null>(null);

  // Load custom standards on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("gfms_custom_grading_standards");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize tiers in case legacy stored ones had only minScore
          const normalized: GradeStandardTier[] = parsed.map((t: any, idx: number, arr: any[]) => {
            const min = Number(t.minScore ?? 0);
            let max = t.maxScore !== undefined && t.maxScore !== null ? Number(t.maxScore) : 100;
            if (t.maxScore === undefined || t.maxScore === null) {
              const higherTier = arr[idx - 1];
              max = higherTier && higherTier.minScore !== undefined ? Math.max(min, Number(higherTier.minScore) - 1) : 100;
            }
            return {
              id: t.id || `tier-${idx + 1}`,
              minScore: min,
              maxScore: max,
              grade: t.grade || "C",
              remark: t.remark || "Credit",
            };
          });
          setGradeStandards(normalized);
          setEditingStandards(normalized);
        }
      }
    } catch (err) {
      console.error("Failed to load stored grading standards:", err);
    }
  }, []);

  // Form State
  const [admNo, setAdmNo] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPhotoUrl, setStudentPhotoUrl] = useState("");
  const [className, setClassName] = useState("JSS 2 Diamond");
  const [session, setSession] = useState("2025/2026");
  const [term, setTerm] = useState("Third Term");
  const [position, setPosition] = useState<string | number>(1);
  const [isPositionManual, setIsPositionManual] = useState(false);
  const [numberInClass, setNumberInClass] = useState<string | number>(35);
  const [daysOpened, setDaysOpened] = useState<string | number>(115);
  const [daysPresent, setDaysPresent] = useState<string | number>(112);
  const [decision, setDecision] = useState("PROMOTED");
  const [nextClass, setNextClass] = useState("JSS 3 Platinum");
  const [nextTermBegins, setNextTermBegins] = useState("Monday, 14th September 2026");
  const [teacherRemark, setTeacherRemark] = useState("An exceptionally diligent scholar with commendable character.");
  const [principalRemark, setPrincipalRemark] = useState("Distinguished academic performance. Keep soaring higher!");
  const [formMasterName, setFormMasterName] = useState("Mr. Emmanuel Eze (B.Sc Ed)");
  const [principalName, setPrincipalName] = useState("Hon Okolie Peter Isioma JP MCArb (Director)");
  const [gender, setGender] = useState<"FEMALE" | "MALE">("FEMALE");
  const [classAverage, setClassAverage] = useState(0);
  const [isClassAverageManual, setIsClassAverageManual] = useState(false);
  const [termFeeAmount, setTermFeeAmount] = useState("");
  const [feeStatus, setFeeStatus] = useState<"PAID" | "PARTIALLY_PAID" | "OUTSTANDING">("PAID");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [feeDueDate, setFeeDueDate] = useState("Monday, 14th September 2026");
  const [skills, setSkills] = useState<Record<string, number>>(DEFAULT_PREPARED_SKILLS);
  const [behaviour, setBehaviour] = useState<Record<string, number>>(DEFAULT_PREPARED_BEHAVIOUR);
  const [isPurging, setIsPurging] = useState(false);

  // Dynamic Subjects State - Starts empty by default
  const [subjects, setSubjects] = useState<PreparedSubjectScore[]>([]);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Calculations - Dynamic Average based on scores
  const totalScore = subjects.reduce((sum, s) => sum + (s.totalScore || 0), 0);
  const totalPossible = subjects.length * 100;
  const overallAverage = subjects.length > 0 ? (totalScore / subjects.length).toFixed(1) : "0.0";

  // Dynamic 3rd term cumulative annual average
  const hasCumulative = term === "Third Term" && subjects.some((s) => s.cumulativeScore !== undefined || (s.term1Score !== undefined && s.term1Score !== null) || (s.term2Score !== undefined && s.term2Score !== null));
  const cumulativeTotal = hasCumulative
    ? subjects.reduce((sum, s) => {
        const thirdTot = (s.ca1 || 0) + (s.ca2 || 0) + (s.exam || 0);
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
  const overallCumulativeAverage = subjects.length > 0 ? (cumulativeTotal / subjects.length).toFixed(1) : "0.0";

  // Dynamic cohort class average calculation (stream-aware)
  const computeDynamicClassAverage = useCallback(
    (targetClass: string, targetSession: string, targetTerm: string, studentAvg: number) => {
      const cohort = results.filter((r) => {
        const c = (r.className || r.class_name || "").trim();
        const s = (r.session || "").trim().toUpperCase();
        const t = (r.term || "").trim().toUpperCase();
        return (
          doesStudentMatchClassFilter(c, undefined, targetClass) &&
          s === targetSession.trim().toUpperCase() &&
          t === targetTerm.trim().toUpperCase()
        );
      });

      const cohortAverages = cohort
        .map((r) => Number(r.average || 0))
        .filter((a) => a > 0 && Math.abs(a - 68.5) > 0.05 && Math.abs(a - 68.45) > 0.05);

      if (studentAvg > 0) {
        cohortAverages.push(studentAvg);
      }

      if (cohortAverages.length === 0) return studentAvg > 0 ? studentAvg : 0;
      const sum = cohortAverages.reduce((a, b) => a + b, 0);
      return parseFloat((sum / cohortAverages.length).toFixed(1));
    },
    [results]
  );

  // Automatically update classAverage dynamically when scores or class change unless manually overridden
  useEffect(() => {
    if (!isClassAverageManual) {
      const activeAvg = parseFloat(hasCumulative ? overallCumulativeAverage : overallAverage);
      const computed = computeDynamicClassAverage(className, session, term, activeAvg);
      setClassAverage(computed);
    }
  }, [overallAverage, overallCumulativeAverage, className, session, term, isClassAverageManual, hasCumulative, computeDynamicClassAverage]);

  // Dynamic cohort position & class roll calculation based on student average (stream-aware)
  const computeDynamicCohortPosition = useCallback(
    (
      targetClass: string,
      targetSession: string,
      targetTerm: string,
      currentAdmNo: string,
      studentAvg: number,
      studentTot: number
    ) => {
      const cleanTargetClass = (targetClass || "").trim();
      const cleanTargetSess = (targetSession || "").trim().toUpperCase();
      const cleanTargetTerm = (targetTerm || "").trim().toUpperCase();
      const cleanCurrentAdm = (currentAdmNo || "").trim().toUpperCase();

      const otherCohortResults = results.filter((r) => {
        const c = (r.className || r.class_name || "").trim();
        const s = (r.session || "").trim().toUpperCase();
        const t = (r.term || "").trim().toUpperCase();
        const a = (r.admNo || r.adm_no || "").trim().toUpperCase();
        return (
          doesStudentMatchClassFilter(c, undefined, cleanTargetClass) &&
          (!cleanTargetSess || s === cleanTargetSess) &&
          (!cleanTargetTerm || t === cleanTargetTerm) &&
          a !== cleanCurrentAdm
        );
      });

      const registeredInClassCount = initialStudents.filter((st) =>
        doesStudentMatchClassFilter(
          st.currentClass || st.current_class || "",
          st.arm,
          cleanTargetClass
        )
      ).length;

      const combined = [
        ...otherCohortResults.map((r) => ({
          isCurrent: false,
          avg: Number(r.average || 0),
          tot: Number(r.totalScore || r.total_score || 0),
        })),
        {
          isCurrent: true,
          avg: studentAvg,
          tot: studentTot,
        },
      ];

      combined.sort((a, b) => b.avg - a.avg || b.tot - a.tot);

      const rankIndex = combined.findIndex((item) => item.isCurrent);
      const rank = rankIndex >= 0 ? rankIndex + 1 : 1;
      const totalInClass = Math.max(combined.length, registeredInClassCount, 1);

      return { rank, totalInClass };
    },
    [results, initialStudents]
  );

  // Automatically update position dynamically when scores, average, or class change unless manually tweaked by admin
  useEffect(() => {
    if (!isPositionManual) {
      const activeAvg = parseFloat(hasCumulative ? overallCumulativeAverage : overallAverage) || 0;
      const { rank, totalInClass } = computeDynamicCohortPosition(
        className,
        session,
        term,
        admNo,
        activeAvg,
        totalScore
      );
      setPosition(rank);
      setNumberInClass(totalInClass);
    }
  }, [
    overallAverage,
    overallCumulativeAverage,
    totalScore,
    className,
    session,
    term,
    admNo,
    isPositionManual,
    hasCumulative,
    computeDynamicCohortPosition,
  ]);

  // Memoized available classes across standard, registered students, and published results
  const availableClasses = React.useMemo(() => {
    const set = new Set<string>(STANDARD_CLASSES);
    initialStudents.forEach((s) => {
      const formatted = formatClassWithArm(s.currentClass || s.current_class || "", s.arm);
      if (formatted) set.add(formatted);
    });
    results.forEach((r) => {
      const c = (r.className || r.class_name || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set);
  }, [initialStudents, results]);

  // Cohort students for the active batch class (stream-aware)
  const cohortStudents = React.useMemo(() => {
    const map = new Map<string, { admNo: string; fullName: string; currentClass: string; arm?: string; gender: string }>();

    initialStudents.forEach((s) => {
      const c = (s.currentClass || s.current_class || "").trim();
      if (doesStudentMatchClassFilter(c, s.arm, batchClass)) {
        const aNo = (s.admNo || s.admissionNumber || s.adm_no || "").trim().toUpperCase();
        if (aNo) {
          const name = (s.fullName || s.full_name || `${s.surname || ""} ${s.firstName || ""}`).trim();
          const parsed = parseClassAndArm(c, s.arm);
          map.set(aNo, {
            admNo: aNo,
            fullName: name || aNo,
            currentClass: formatClassWithArm(c, s.arm) || c,
            arm: parsed.arm || undefined,
            gender: (s.gender && s.gender.toUpperCase() === "MALE") ? "MALE" : "FEMALE",
          });
        }
      }
    });

    results.forEach((r) => {
      const c = (r.className || r.class_name || "").trim();
      if (doesStudentMatchClassFilter(c, undefined, batchClass)) {
        const aNo = (r.admNo || r.adm_no || "").trim().toUpperCase();
        if (aNo && !map.has(aNo)) {
          const parsed = parseClassAndArm(c);
          map.set(aNo, {
            admNo: aNo,
            fullName: r.studentName || r.student_name || aNo,
            currentClass: formatClassWithArm(c) || c,
            arm: parsed.arm || undefined,
            gender: "FEMALE",
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [initialStudents, results, batchClass]);

  const pendingStudents = React.useMemo(() => {
    return cohortStudents.filter(
      (st) =>
        !results.some(
          (r) =>
            (r.admNo || r.adm_no)?.trim().toUpperCase() === st.admNo &&
            r.session === batchSession &&
            r.term === batchTerm
        )
    );
  }, [cohortStudents, results, batchSession, batchTerm]);

  const publishedCount = cohortStudents.length - pendingStudents.length;

  const parsedPasteRows = React.useMemo(() => {
    return parsePastedResultRows(pasteRawText, batchClass, initialStudents, results);
  }, [pasteRawText, batchClass, initialStudents, results]);

  const detectedClassesMap = React.useMemo(() => {
    const map = new Map<string, number>();
    parsedPasteRows.forEach((r) => {
      const c = r.className || batchClass;
      map.set(c, (map.get(c) || 0) + 1);
    });
    return map;
  }, [parsedPasteRows, batchClass]);

  const filteredPasteRows = React.useMemo(() => {
    return parsedPasteRows.filter((r) => {
      if (pasteClassFilter !== "ALL" && (r.className || batchClass) !== pasteClassFilter) {
        return false;
      }
      if (pasteStatusFilter === "UPLOADED" && !uploadedPasteAdmNos.has(r.admNo)) {
        return false;
      }
      if (pasteStatusFilter === "PENDING" && uploadedPasteAdmNos.has(r.admNo)) {
        return false;
      }
      if (pasteSearchQuery.trim()) {
        const q = pasteSearchQuery.toLowerCase();
        const matchAdm = r.admNo.toLowerCase().includes(q);
        const matchName = r.studentName.toLowerCase().includes(q);
        const matchClass = (r.className || "").toLowerCase().includes(q);
        if (!matchAdm && !matchName && !matchClass) return false;
      }
      return true;
    });
  }, [parsedPasteRows, pasteClassFilter, pasteStatusFilter, pasteSearchQuery, batchClass, uploadedPasteAdmNos]);

  const downloadSampleCsv = () => {
    const csvContent = [
      "Admission Number,Student Name,Class,Average Score,Total Score,Decision",
      "GFMS/2024/001,Adaobi Okonkwo,JSS 1 Diamond,84.5,845,PROMOTED",
      "GFMS/2024/002,Chinedu Eze,JSS 1 Diamond,72.0,720,PROMOTED",
      "GFMS/2024/003,Fatima Bello,JSS 1 Diamond,91.0,910,PROMOTED",
      "GFMS/2024/004,David Adeleke,JSS 2 Diamond,68.5,685,PROMOTED",
      "GFMS/2024/005,Zainab Abubakar,JSS 2 Diamond,77.0,770,PROMOTED",
      "GFMS/2024/006,Oluwaseun Balogun,JSS 2 Diamond,59.0,590,PROMOTED",
      "GFMS/2024/007,Blessing Nnamdi,JSS 3 Platinum,88.0,880,PROMOTED",
      "GFMS/2024/008,Tunde Bakare,JSS 3 Platinum,63.5,635,PROMOTED",
      "GFMS/2024/009,Amina Yakubu,SS 1,79.5,795,PROMOTED",
      "GFMS/2024/010,Emmanuel Okafor,SS 1,65.0,650,PROMOTED",
      "GFMS/2024/011,Khadijah Usman,SS 2 (Science),82.0,820,PROMOTED",
      "GFMS/2024/012,Samuel Johnson,SS 2 (Art),74.0,740,PROMOTED",
      "GFMS/2024/013,Chioma Okoro,SS 3 (Science),92.5,925,PROMOTED",
      "GFMS/2024/014,Ibrahim Danjuma,SS 3 (Art),71.0,710,PROMOTED",
      "GFMS/2024/015,Grace Chukwuma,JSS 1 Diamond,38.5,385,ADVISED TO REPEAT",
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "gfms_1000_students_result_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setPasteRawText(text);
        setPasteCurrentChunkIndex(0);
        setUploadedPasteAdmNos(new Set());
        setPreviewPage(1);
        setBatchFeedback({
          type: "info",
          text: `Loaded file "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready to preview and upload!`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handlePickNextPending = (count: number) => {
    const unselectedPending = pendingStudents.filter((st) => !selectedRosterAdmNos.has(st.admNo));
    const toPick = unselectedPending.slice(0, count);
    if (toPick.length === 0) {
      if (pendingStudents.length === 0) {
        alert("All registered students in this class already have published results for this term!");
      } else {
        alert("All pending students are already selected!");
      }
      return;
    }
    setSelectedRosterAdmNos((prev) => {
      const next = new Set(prev);
      toPick.forEach((st) => next.add(st.admNo));
      return next;
    });
  };

  const handleSelectAllPending = () => {
    setSelectedRosterAdmNos((prev) => {
      const next = new Set(prev);
      pendingStudents.forEach((st) => next.add(st.admNo));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedRosterAdmNos(new Set());
  };

  const handleApplyQuickFillAverage = () => {
    const val = parseFloat(quickFillAverage);
    if (isNaN(val) || val < 0 || val > 100) {
      alert("Please enter a valid average between 0 and 100.");
      return;
    }
    if (selectedRosterAdmNos.size === 0) {
      alert("Please select at least one student first.");
      return;
    }
    setRosterInputs((prev) => {
      const updated = { ...prev };
      selectedRosterAdmNos.forEach((adm) => {
        updated[adm] = {
          ...(updated[adm] || {}),
          average: String(val),
        };
      });
      return updated;
    });
  };

  const handleUploadRosterBatch = async () => {
    if (selectedRosterAdmNos.size === 0 || isBatchProcessing) return;

    const toUpload = cohortStudents.filter((st) => selectedRosterAdmNos.has(st.admNo));
    if (toUpload.length === 0) return;

    setIsBatchProcessing(true);
    setBatchFeedback({ type: "info", text: `Uploading batch of ${toUpload.length} students...` });

    const isThird = batchTerm === "Third Term";
    const batchItems: BatchResultInputItem[] = toUpload.map((st) => {
      const custom = rosterInputs[st.admNo] || {};
      const avgNum = parseFloat(custom.average || "") || 70;
      return {
        admNo: st.admNo,
        studentName: st.fullName,
        className: st.currentClass || batchClass,
        arm: st.arm || parseClassAndArm(batchClass).arm || undefined,
        session: batchSession,
        term: batchTerm,
        gender: (st.gender === "MALE" ? "MALE" : "FEMALE") as "MALE" | "FEMALE",
        average: avgNum,
        totalScore: Math.round(avgNum * 10),
        daysOpened: batchDaysOpened,
        daysPresent: batchDaysPresent,
        decision: custom.decision || (isThird ? (avgNum >= 40 ? "PROMOTED" : "ADVISED TO REPEAT") : "PASSED"),
        nextClass: isThird
          ? batchClass.includes("JSS 1")
            ? "JSS 2 Diamond"
            : batchClass.includes("JSS 2")
            ? "JSS 3 Platinum"
            : batchClass.includes("SS 1")
            ? "SS 2"
            : batchClass.includes("SS 2")
            ? "SS 3"
            : "GRADUATED"
          : "",
        nextTermBegins: batchNextTermBegins,
        formMasterName: batchFormMasterName,
        principalName: batchPrincipalName,
        teacherRemark: custom.remark || (avgNum >= 75 ? "An exceptionally diligent scholar with commendable character." : avgNum >= 60 ? "Good academic progress shown this term." : "Needs more disciplined focus in core subjects."),
        principalRemark: avgNum >= 75 ? "Distinguished academic performance. Keep soaring higher!" : avgNum >= 60 ? "Very commendable result. Maintain this momentum." : "Can achieve higher grades with sustained diligence.",
      };
    });

    try {
      const res = await saveBatchTerminalResultsAction(batchItems);
      if (res.success) {
        const all = await getAllTerminalResultsAction().catch(() => null);
        if (all?.results) {
          setResults(all.results);
        } else if (res.results) {
          setResults((prev) => {
            const map = new Map(prev.map((r) => [`${(r.admNo || r.adm_no)?.toUpperCase()}_${r.session}_${r.term}`, r]));
            res.results.forEach((s: any) => {
              map.set(`${s.admNo?.toUpperCase()}_${s.session}_${s.term}`, s);
            });
            return Array.from(map.values());
          });
        }

        setSelectedRosterAdmNos((prev) => {
          const next = new Set(prev);
          toUpload.forEach((s) => next.delete(s.admNo));
          return next;
        });

        setBatchFeedback({
          type: "success",
          text: `🎉 Successfully uploaded ${res.savedCount} student result dossiers! (Class positions automatically re-ranked)`,
        });
      } else {
        setBatchFeedback({
          type: "error",
          text: res.error || "Failed to upload batch.",
        });
      }
    } catch (err: any) {
      setBatchFeedback({
        type: "error",
        text: `Batch upload error: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleUploadPasteChunk = async (chunkIndex: number) => {
    if (isBatchProcessing) return;
    const validRows = parsedPasteRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    const chunkSize = pasteChunkSize === -1 ? validRows.length : pasteChunkSize;
    const start = chunkIndex * chunkSize;
    const chunkRows = validRows.slice(start, start + chunkSize);

    if (chunkRows.length === 0) return;

    setIsBatchProcessing(true);
    setBatchFeedback({
      type: "info",
      text: `Uploading Chunk ${chunkIndex + 1} (${chunkRows.length} students)...`,
    });

    const isThird = batchTerm === "Third Term";
    const batchItems: BatchResultInputItem[] = chunkRows.map((r) => {
      const rowClass = (r.className || batchClass).trim();
      return {
        admNo: r.admNo,
        studentName: r.studentName,
        className: rowClass,
        session: batchSession,
        term: batchTerm,
        gender: "FEMALE",
        average: r.average,
        totalScore: r.totalScore,
        daysOpened: batchDaysOpened,
        daysPresent: batchDaysPresent,
        decision: r.decision || (isThird ? (r.average >= 40 ? "PROMOTED" : "ADVISED TO REPEAT") : "PASSED"),
        nextClass: isThird
          ? rowClass.includes("JSS 1")
            ? "JSS 2 Diamond"
            : rowClass.includes("JSS 2")
            ? "JSS 3 Platinum"
            : rowClass.includes("SS 1")
            ? "SS 2"
            : rowClass.includes("SS 2")
            ? "SS 3"
            : "GRADUATED"
          : "",
        nextTermBegins: batchNextTermBegins,
        formMasterName: batchFormMasterName,
        principalName: batchPrincipalName,
        teacherRemark: r.average >= 75 ? "An exceptionally diligent scholar with commendable character." : r.average >= 60 ? "Good academic progress shown this term." : "Needs more disciplined focus in core subjects.",
        principalRemark: r.average >= 75 ? "Distinguished academic performance. Keep soaring higher!" : r.average >= 60 ? "Very commendable result. Maintain this momentum." : "Can achieve higher grades with sustained diligence.",
      };
    });

    try {
      const res = await saveBatchTerminalResultsAction(batchItems);
      if (res.success) {
        const uploadedSet = new Set(uploadedPasteAdmNos);
        chunkRows.forEach((r) => uploadedSet.add(r.admNo));
        setUploadedPasteAdmNos(uploadedSet);

        const all = await getAllTerminalResultsAction().catch(() => null);
        if (all?.results) {
          setResults(all.results);
        }

        const nextChunk = chunkIndex + 1;
        const totalChunks = Math.ceil(validRows.length / chunkSize);
        if (nextChunk < totalChunks) {
          setPasteCurrentChunkIndex(nextChunk);
          setBatchFeedback({
            type: "success",
            text: `✓ Chunk ${chunkIndex + 1} (${chunkRows.length} students) uploaded! Ready for Chunk ${nextChunk + 1} of ${totalChunks}.`,
          });
        } else {
          setBatchFeedback({
            type: "success",
            text: `🎉 All ${validRows.length} student results uploaded successfully! All cohort positions re-ranked.`,
          });
        }
      } else {
        setBatchFeedback({
          type: "error",
          text: res.error || "Chunk upload failed.",
        });
      }
    } catch (err: any) {
      setBatchFeedback({
        type: "error",
        text: `Upload error: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleUploadAllChunksSequentially = async () => {
    if (isBatchProcessing) return;
    const validRows = parsedPasteRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    const chunkSize = pasteChunkSize === -1 ? validRows.length : pasteChunkSize;
    const totalChunks = Math.ceil(validRows.length / chunkSize);
    const totalStudents = validRows.length;

    setIsBatchProcessing(true);
    let successfullyUploaded = validRows.filter((r) => uploadedPasteAdmNos.has(r.admNo)).length;

    for (let c = 0; c < totalChunks; c++) {
      const start = c * chunkSize;
      const chunkRows = validRows.slice(start, start + chunkSize);
      if (chunkRows.every((r) => uploadedPasteAdmNos.has(r.admNo))) {
        continue;
      }

      setBatchFeedback({
        type: "info",
        text: `Uploading Chunk ${c + 1} of ${totalChunks} (${chunkRows.length} students)...`,
      });

      const isThird = batchTerm === "Third Term";
      const batchItems: BatchResultInputItem[] = chunkRows.map((r) => {
        const rowClass = (r.className || batchClass).trim();
        return {
          admNo: r.admNo,
          studentName: r.studentName,
          className: rowClass,
          session: batchSession,
          term: batchTerm,
          gender: "FEMALE",
          average: r.average,
          totalScore: r.totalScore,
          daysOpened: batchDaysOpened,
          daysPresent: batchDaysPresent,
          decision: r.decision || (isThird ? (r.average >= 40 ? "PROMOTED" : "ADVISED TO REPEAT") : "PASSED"),
          nextClass: isThird
            ? rowClass.includes("JSS 1")
              ? "JSS 2 Diamond"
              : rowClass.includes("JSS 2")
              ? "JSS 3 Platinum"
              : rowClass.includes("SS 1")
              ? "SS 2"
              : rowClass.includes("SS 2")
              ? "SS 3"
              : "GRADUATED"
            : "",
          nextTermBegins: batchNextTermBegins,
          formMasterName: batchFormMasterName,
          principalName: batchPrincipalName,
          teacherRemark: r.average >= 75 ? "An exceptionally diligent scholar with commendable character." : r.average >= 60 ? "Good academic progress shown this term." : "Needs more disciplined focus.",
          principalRemark: r.average >= 75 ? "Distinguished academic performance. Keep soaring higher!" : r.average >= 60 ? "Very commendable result. Maintain this momentum." : "Can achieve higher grades.",
        };
      });

      const res = await saveBatchTerminalResultsAction(batchItems).catch(() => null);
      if (res?.success) {
        successfullyUploaded += chunkRows.length;
        setUploadedPasteAdmNos((prev) => {
          const next = new Set(prev);
          chunkRows.forEach((r) => next.add(r.admNo));
          return next;
        });
        setUploadProgress({
          current: successfullyUploaded,
          total: totalStudents,
          percent: Math.min(100, Math.round((successfullyUploaded / totalStudents) * 100)),
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const all = await getAllTerminalResultsAction().catch(() => null);
    if (all?.results) {
      setResults(all.results);
    }

    setIsBatchProcessing(false);
    setUploadProgress(null);
    setBatchFeedback({
      type: "success",
      text: `🎉 Sequential batch upload complete! All ${totalStudents} students uploaded safely without server strain. All class cohorts auto-ranked.`,
    });
  };

  const handleAutoRankCohort = async () => {
    if (isRankingCohort) return;
    setIsRankingCohort(true);
    try {
      const res = await autoRankCohortPositionsAction(batchClass, batchSession, batchTerm);
      if (res.success) {
        const all = await getAllTerminalResultsAction().catch(() => null);
        if (all?.results) {
          setResults(all.results);
        }
        setBatchFeedback({
          type: "success",
          text: `🏆 Cohort ranked successfully! Updated positions (1st, 2nd, 3rd) for ${res.count} students in ${batchClass}.`,
        });
      } else {
        setBatchFeedback({
          type: "error",
          text: res.error || "Failed to auto-rank cohort.",
        });
      }
    } catch (err: any) {
      setBatchFeedback({
        type: "error",
        text: `Ranking error: ${err?.message || "Unknown error"}`,
      });
    } finally {
      setIsRankingCohort(false);
    }
  };

  // Handle Subject Score Input Change
  const updateSubjectScore = (
    id: string,
    field: "ca1" | "ca2" | "exam" | "subjectName" | "category" | "term1Score" | "term2Score",
    val: string | number
  ) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;

        const updated = { ...s };
        if (field === "subjectName") updated.subjectName = String(val);
        else if (field === "category") updated.category = String(val);
        else {
          const numVal = Math.max(0, parseInt(String(val) || "0", 10));
          if (field === "term1Score") updated.term1Score = Math.min(numVal, 100);
          if (field === "term2Score") updated.term2Score = Math.min(numVal, 100);
          if (field === "ca1") updated.ca1 = Math.min(numVal, 15);
          if (field === "ca2") updated.ca2 = Math.min(numVal, 15);
          if (field === "exam") updated.exam = Math.min(numVal, 70);

          updated.totalScore = (updated.ca1 || 0) + (updated.ca2 || 0) + (updated.exam || 0);
          updated.term3Total = updated.totalScore;

          if (term === "Third Term") {
            const hasT1 = updated.term1Score !== undefined && updated.term1Score !== null;
            const hasT2 = updated.term2Score !== undefined && updated.term2Score !== null;
            if (hasT1 || hasT2) {
              const cum = Math.round((((Number(updated.term1Score) || 0) + (Number(updated.term2Score) || 0) + updated.totalScore) / 3) * 10) / 10;
              updated.cumulativeScore = cum;
              const { grade, remark } = computeGradeAndRemark(cum, gradeStandards);
              updated.grade = grade;
              updated.remark = remark;
            } else {
              updated.cumulativeScore = updated.totalScore;
              const { grade, remark } = computeGradeAndRemark(updated.totalScore, gradeStandards);
              updated.grade = grade;
              updated.remark = remark;
            }
          } else {
            const { grade, remark } = computeGradeAndRemark(updated.totalScore, gradeStandards);
            updated.grade = grade;
            updated.remark = remark;
          }
        }
        return updated;
      })
    );
  };

  const addCustomSubject = () => {
    const newId = `subj-${Date.now()}`;
    const ca1 = 0;
    const ca2 = 0;
    const exam = 0;
    const total = 0;
    const { grade, remark } = computeGradeAndRemark(total, gradeStandards);
    setSubjects((prev) => [
      ...prev,
      {
        id: newId,
        subjectName: "",
        subjectCode: "",
        category: "General",
        ca1,
        ca2,
        exam,
        totalScore: total,
        grade,
        remark,
      },
    ]);
  };

  const loadDefaultSubjects = (preset?: "SCIENCE" | "ART" | "COMMERCIAL" | "JSS" | "AUTO") => {
    let source = DEFAULT_SUBJECTS;
    const mode = preset && preset !== "AUTO" ? preset : (() => {
      const p = parseClassAndArm(className);
      const armLower = (p.arm || "").toLowerCase();
      if (p.baseLevel.startsWith("SS")) {
        if (armLower === "science") return "SCIENCE";
        if (armLower === "art") return "ART";
        if (armLower === "commercial") return "COMMERCIAL";
      }
      return "JSS";
    })();
    if (mode === "SCIENCE") source = SCIENCE_STREAM_SUBJECTS;
    else if (mode === "ART") source = ART_STREAM_SUBJECTS;
    else if (mode === "COMMERCIAL") source = COMMERCIAL_STREAM_SUBJECTS;

    const loaded = source.map((s, idx) => {
      const ca1 = 0;
      const ca2 = 0;
      const exam = 0;
      const total = 0;
      const { grade, remark } = computeGradeAndRemark(total, gradeStandards);
      return {
        id: `subj-${Date.now()}-${idx + 1}`,
        subjectName: s.name,
        subjectCode: s.code,
        category: s.category,
        ca1,
        ca2,
        exam,
        totalScore: total,
        grade,
        remark,
      };
    });
    setSubjects(loaded);
  };

  const clearAllSubjects = () => {
    setSubjects([]);
  };

  const removeSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const handleApplyStandards = (standardsToApply: GradeStandardTier[]) => {
    const sorted = [...standardsToApply].sort((a, b) => b.minScore - a.minScore);
    setGradeStandards(sorted);
    try {
      localStorage.setItem("gfms_custom_grading_standards", JSON.stringify(sorted));
    } catch (e) {
      console.error("Failed to persist grading standards:", e);
    }
    // Dynamically update currently loaded subject scores
    setSubjects((prev) =>
      prev.map((sub) => {
        const total = (sub.ca1 || 0) + (sub.ca2 || 0) + (sub.exam || 0);
        const { grade, remark } = computeGradeAndRemark(total, sorted);
        return {
          ...sub,
          totalScore: total,
          grade,
          remark,
        };
      })
    );
    setStandardsFeedback("Grading standards saved & applied to current dossier!");
    setTimeout(() => {
      setStandardsFeedback(null);
      setIsGradingModalOpen(false);
    }, 1100);
  };

  const openNewResultModal = () => {
    setEditingId(null);
    setAdmNo(`GFMS/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`);
    setStudentName("");
    setClassName("JSS 2 Diamond");
    setPosition(1);
    setIsPositionManual(false);
    setNumberInClass(35);
    setDaysOpened(115);
    setDaysPresent(112);
    setDecision(term === "Third Term" ? "PROMOTED" : "");
    setNextClass(term === "Third Term" ? "JSS 3 Platinum" : "");
    setNextTermBegins("Monday, 14th September 2026");
    setTeacherRemark("An exceptionally diligent scholar with commendable character.");
    setPrincipalRemark("Distinguished academic performance. Keep soaring higher!");
    setFormMasterName("Mr. Emmanuel Eze (B.Sc Ed)");
    setPrincipalName("Hon Okolie Peter Isioma JP MCArb (Director)");
    setGender("FEMALE");
    setIsClassAverageManual(false);
    setClassAverage(0);
    setTermFeeAmount("");
    setFeeStatus("PAID");
    setBankName("");
    setAccountNumber("");
    setAccountName("");
    setFeeDueDate("Monday, 14th September 2026");
    setSkills(DEFAULT_PREPARED_SKILLS);
    setBehaviour(DEFAULT_PREPARED_BEHAVIOUR);
    setStudentPhotoUrl("");
    setFeedback(null);
    setSubjects([]);
    setIsModalOpen(true);
  };

  const handleEditResult = (resItem: any) => {
    const loadedTerm = resItem.term || "Third Term";
    setEditingId(resItem.id);
    setAdmNo(resItem.admNo || resItem.adm_no);
    setStudentName(resItem.studentName || resItem.student_name);
    {
      let payloadArm: string | undefined;
      try {
        payloadArm = JSON.parse(resItem.resultPayload || resItem.result_payload || "{}")?.arm;
      } catch {}
      const rawCls = resItem.className || resItem.class_name || "";
      setClassName(formatClassWithArm(rawCls, payloadArm) || rawCls);
    }
    setSession(resItem.session || "2025/2026");
    setTerm(loadedTerm);
    setPosition(resItem.position || 1);
    setNumberInClass(resItem.numberInClass || resItem.number_in_class || 35);
    setDaysOpened(resItem.daysOpened || resItem.days_opened || 115);
    setDaysPresent(resItem.daysPresent || resItem.days_present || 112);
    setDecision(loadedTerm === "Third Term" ? (resItem.decision || "PROMOTED") : "");
    setNextClass(loadedTerm === "Third Term" ? (resItem.nextClass || resItem.next_class || "JSS 3 Platinum") : "");
    setNextTermBegins(resItem.nextTermBegins || resItem.next_term_begins || "Monday, 14th September 2026");
    setTeacherRemark(resItem.teacherRemark || resItem.teacher_remark || "Diligent scholar.");
    setPrincipalRemark(resItem.principalRemark || resItem.principal_remark || "Commendable distinction.");

    try {
      const payload = JSON.parse(resItem.resultPayload || resItem.result_payload || "{}");
      if (payload.studentPhotoUrl) {
        setStudentPhotoUrl(payload.studentPhotoUrl);
      } else {
        setStudentPhotoUrl("");
      }
      if (payload.subjects && Array.isArray(payload.subjects) && payload.subjects.length > 0) {
        setSubjects(payload.subjects);
      } else {
        setSubjects([]);
      }
      if (payload.gender) setGender(payload.gender);
      if (payload.formMasterName) setFormMasterName(payload.formMasterName);
      if (payload.principalName) setPrincipalName(payload.principalName);
      if (payload.isPositionManual) {
        setIsPositionManual(true);
        setPosition(payload.position || resItem.position || 1);
      } else {
        setIsPositionManual(false);
        const { rank, totalInClass } = computeDynamicCohortPosition(
          resItem.className || resItem.class_name || "JSS 2 Diamond",
          resItem.session || "2025/2026",
          loadedTerm,
          resItem.admNo || resItem.adm_no || "",
          Number(resItem.average || 0),
          Number(resItem.totalScore || resItem.total_score || 0)
        );
        setPosition(resItem.position || rank);
        setNumberInClass(resItem.numberInClass || resItem.number_in_class || totalInClass);
      }
      if (payload.classAverage && Math.abs(payload.classAverage - 68.5) > 0.05 && Math.abs(payload.classAverage - 68.45) > 0.05) {
        setClassAverage(payload.classAverage);
        setIsClassAverageManual(true);
      } else {
        setIsClassAverageManual(false);
        const computed = computeDynamicClassAverage(
          resItem.className || resItem.class_name || "JSS 2 Diamond",
          resItem.session || "2025/2026",
          loadedTerm,
          Number(resItem.average || 0)
        );
        setClassAverage(computed);
      }
      if (payload.feeInfo) {
        setTermFeeAmount(payload.feeInfo.termFeeAmount || "");
        const rawAcc = payload.feeInfo.accountNumber || "";
        setAccountNumber(rawAcc === "1014529088" ? "" : rawAcc);
        const rawBank = payload.feeInfo.bankName || "";
        setBankName(rawBank === "Zenith Bank PLC" && rawAcc === "1014529088" ? "" : rawBank);
        setAccountName(payload.feeInfo.accountName || "");
        setFeeDueDate(payload.feeInfo.dueDate || "Monday, 14th September 2026");
        if (payload.feeInfo.status) setFeeStatus(payload.feeInfo.status);
      } else {
        setTermFeeAmount("");
        setAccountNumber("");
        setBankName("");
        setAccountName("");
        setFeeDueDate("Monday, 14th September 2026");
        setFeeStatus("PAID");
      }
      if (payload.skills) setSkills(payload.skills);
      if (payload.behaviour) setBehaviour(payload.behaviour);
    } catch {
      // keep defaults
    }

    setFeedback(null);
    setIsModalOpen(true);
  };

  // React to prefill request from Student Registry Tab
  useEffect(() => {
    if (!prefillTarget || !prefillTarget.admNo) return;

    const targetAdmNo = prefillTarget.admNo.trim().toUpperCase();
    const existing = results.find(
      (r) => (r.admNo || r.adm_no)?.trim().toUpperCase() === targetAdmNo
    );

    if (existing) {
      handleEditResult(existing);
    } else {
      setEditingId(null);
      setAdmNo(targetAdmNo);
      setStudentName(prefillTarget.studentName || "");
      setClassName(
        formatClassWithArm(prefillTarget.className || "JSS 2 Diamond", prefillTarget.arm) ||
          prefillTarget.className ||
          "JSS 2 Diamond"
      );
      setGender(
        prefillTarget.gender && prefillTarget.gender.toUpperCase() === "MALE"
          ? "MALE"
          : "FEMALE"
      );
      setPosition(1);
      setIsPositionManual(false);
      setNumberInClass(35);
      setDaysOpened(115);
      setDaysPresent(112);
      setDecision(term === "Third Term" ? "PROMOTED" : "");
      setNextClass(term === "Third Term" ? "JSS 3 Platinum" : "");
      setNextTermBegins("Monday, 14th September 2026");
      setTeacherRemark("An exceptionally diligent scholar with commendable character.");
      setPrincipalRemark("Distinguished academic performance. Keep soaring higher!");
      setFormMasterName("Mr. Emmanuel Eze (B.Sc Ed)");
      setPrincipalName("Hon Okolie Peter Isioma JP MCArb (Director)");
      setIsClassAverageManual(false);
      setClassAverage(0);
      setTermFeeAmount("");
      setFeeStatus("PAID");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      setFeeDueDate("Monday, 14th September 2026");
      setSkills(DEFAULT_PREPARED_SKILLS);
      setBehaviour(DEFAULT_PREPARED_BEHAVIOUR);
      setStudentPhotoUrl("");
      setFeedback(null);
      setSubjects([]);
      setIsModalOpen(true);
    }

    setSearchQuery(targetAdmNo);
    onClearPrefill?.();
  }, [prefillTarget, results, term]);

  const handlePurgeAllResults = () => {
    if (isPurging) return;
    if (!confirm("⚠️ PURGE ALL TERMINAL RESULTS?\n\nThis will remove ALL student terminal results from the system and restore the results portal to a clean empty state until you officially prepare and upload new results.\n\nAre you sure you want to proceed?")) return;
    setIsPurging(true);
    startTransition(async () => {
      const res = await purgeAllTerminalResultsAction();
      if (res.success) {
        setResults([]);
        alert("✓ Results Purged: The portal is now in a clean empty state for all students.");
      } else {
        alert(res.message || "Failed to purge results.");
      }
      setIsPurging(false);
    });
  };

  const handleDeleteResult = (id: number) => {
    if (!confirm("Are you sure you want to delete this prepared student result dossier?")) return;
    startTransition(async () => {
      const res = await deleteTerminalResultAction(id);
      if (res.success) {
        setResults((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(res.error || "Failed to delete result.");
      }
    });
  };

  const handleSaveResultWithOption = (
    e: React.FormEvent,
    loadNext: boolean = false,
    publishNow: boolean = true
  ) => {
    e.preventDefault();
    setFeedback(null);

    const safePosition = Math.max(1, parseInt(String(position), 10) || 1);
    const safeNumberInClass = Math.max(1, parseInt(String(numberInClass), 10) || 35);
    const safeDaysOpened = Math.max(0, parseInt(String(daysOpened), 10) || 115);
    const safeDaysPresent = Math.max(0, parseInt(String(daysPresent), 10) || 112);

    const formData = new FormData();
    formData.append("admNo", admNo);
    formData.append("studentName", studentName);
    formData.append("className", className);
    formData.append("arm", parseClassAndArm(className).arm || "");
    formData.append("session", session);
    formData.append("term", term);
    formData.append("termLabel", `${term} (${session})`);
    formData.append("position", String(safePosition));
    formData.append("isPositionManual", isPositionManual ? "true" : "false");
    formData.append("numberInClass", String(safeNumberInClass));
    formData.append("daysOpened", String(safeDaysOpened));
    formData.append("daysPresent", String(safeDaysPresent));
    const isThirdTerm = term === "Third Term";
    formData.append("decision", isThirdTerm ? decision : "");
    formData.append("nextClass", isThirdTerm ? nextClass : "");
    formData.append("nextTermBegins", nextTermBegins);
    formData.append("teacherRemark", teacherRemark);
    formData.append("principalRemark", principalRemark);
    formData.append("formMasterName", formMasterName);
    formData.append("principalName", principalName);
    formData.append("gender", gender);
    formData.append("isPublished", publishNow ? "true" : "false");
    if (studentPhotoUrl) {
      formData.append("studentPhotoUrl", studentPhotoUrl);
    }
    formData.append("classAverage", String(classAverage));
    formData.append(
      "feeInfoJson",
      JSON.stringify({
        termFeeAmount,
        dueDate: feeDueDate,
        bankName,
        accountNumber: accountNumber.trim(),
        accountName,
        status: feeStatus,
      })
    );
    formData.append("skillsJson", JSON.stringify(skills));
    formData.append("behaviourJson", JSON.stringify(behaviour));
    formData.append("subjectsJson", JSON.stringify(subjects));

    startTransition(async () => {
      const res = await saveTerminalResultAction(formData);
      if (!res.success) {
        setFeedback({ type: "error", text: res.error || "Failed to save result." });
      } else {
        const updatedItem = {
          id: res.resultId || Date.now(),
          admNo,
          studentName,
          className,
          session,
          term,
          position: safePosition,
          totalScore,
          average: parseFloat(overallAverage),
          isPublished: publishNow,
          resultPayload: JSON.stringify({
            studentName,
            admNo,
            className,
            session,
            term,
            gender,
            studentPhotoUrl,
            position: safePosition,
            isPositionManual,
            numberInClass: safeNumberInClass,
            formMasterName,
            principalName,
            classAverage,
            feeInfo: {
              termFeeAmount,
              dueDate: feeDueDate,
              bankName,
              accountNumber: accountNumber.trim(),
              accountName,
              status: feeStatus,
            },
            skills,
            behaviour,
            subjects,
          }),
          updatedAt: new Date().toISOString(),
        };

        setResults((prev) => {
          const exists = prev.some((r) => r.admNo === admNo && r.session === session && r.term === term);
          if (exists) {
            return prev.map((r) =>
              r.admNo === admNo && r.session === session && r.term === term ? { ...r, ...updatedItem } : r
            );
          }
          return [updatedItem, ...prev];
        });

        if (loadNext) {
          const nextStudent = initialStudents.find((s) => {
            const sClass = (s.currentClass || s.current_class || "").trim().toLowerCase();
            const sAdm = (s.admNo || s.admissionNumber || s.adm_no || "").trim().toUpperCase();
            if (!sAdm || sAdm === admNo.trim().toUpperCase()) return false;
            if (!doesStudentMatchClassFilter(sClass, s.arm, className)) return false;
            const hasRes = results.some(
              (r) => (r.admNo || r.adm_no)?.trim().toUpperCase() === sAdm && r.session === session && r.term === term
            );
            return !hasRes;
          });

          if (nextStudent) {
            const nextAdm = (nextStudent.admNo || nextStudent.admissionNumber || nextStudent.adm_no || "").trim().toUpperCase();
            const nextName = (nextStudent.fullName || nextStudent.full_name || `${nextStudent.surname || ""} ${nextStudent.firstName || ""}`).trim();
            setEditingId(null);
            setAdmNo(nextAdm);
            setStudentName(nextName);
            setGender((nextStudent.gender && nextStudent.gender.toUpperCase() === "MALE") ? "MALE" : "FEMALE");
            setIsPositionManual(false);
            setPosition((prev) => (Number(prev) || 1) + 1);
            setSubjects([]);
            setFeedback({ type: "success", text: `✓ Result saved! Loaded next student: ${nextName}` });
          } else {
            setFeedback({ type: "success", text: "✓ Saved! All pending students in this class have been prepared." });
            setTimeout(() => {
              setIsModalOpen(false);
              setFeedback(null);
            }, 1200);
          }
        } else {
          setFeedback({
            type: "success",
            text: publishNow
              ? "Terminal result dossier finalized and published to student portal!"
              : "Result dossier saved as Draft (Pending Admin Finalization).",
          });
          setTimeout(() => {
            setIsModalOpen(false);
            setFeedback(null);
          }, 1200);
        }
      }
    });
  };

  const handleSaveResult = (e: React.FormEvent) => handleSaveResultWithOption(e, false, true);

  const draftDossiersCount = results.filter(
    (r) => r.isPublished === false || r.is_published === false
  ).length;
  const publishedDossiersCount = results.length - draftDossiersCount;

  // Filtered List
  const filteredResults = results.filter((r) => {
    const sName = (r.studentName || r.student_name || "").toLowerCase();
    const aNo = (r.admNo || r.adm_no || "").toLowerCase();
    const cName = r.className || r.class_name || "";
    const isDraft = r.isPublished === false || r.is_published === false;
    const matchesSearch = sName.includes(searchQuery.toLowerCase()) || aNo.includes(searchQuery.toLowerCase());
    const matchesClass =
      selectedClassFilter === "ALL" || doesStudentMatchClassFilter(cName, undefined, selectedClassFilter);
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "DRAFT" && isDraft) ||
      (statusFilter === "PUBLISHED" && !isDraft);
    return matchesSearch && matchesClass && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg sm:text-xl font-black text-white">
              Terminal Result Preparation Desk
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Super Admin command center to review teacher-uploaded course drafts (1st CA, 2nd CA &amp; Exam), finalize student academic dossiers, and publish official report cards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handlePurgeAllResults}
            disabled={isPurging}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-rose-950/40 border border-rose-800/80 hover:border-rose-600 text-rose-300 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            title="Purge all terminal results from database and local storage to restore empty state"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="sm:hidden">{isPurging ? "Purging..." : "Purge All"}</span>
            <span className="hidden sm:inline">{isPurging ? "Purging Results..." : "Purge All Results (Empty State)"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingStandards([...gradeStandards]);
              setStandardsFeedback(null);
              setIsGradingModalOpen(true);
            }}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-400 font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition"
            title="Configure custom dynamic grading boundaries, grade letters, and remarks"
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span className="sm:hidden">Grading</span>
            <span className="hidden sm:inline">Grading Standards</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBatchFeedback(null);
              setIsSmallSmallOpen(true);
            }}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 transition active:scale-95"
            title="Fast result uploader - effortlessly handles 1,000+ students via Drag & Drop CSV, Excel, or clipboard paste"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span className="sm:hidden">⚡ Bulk Upload</span>
            <span className="hidden sm:inline">⚡ Bulk Upload (1,000+ Students CSV / Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDelegatedSubjectOpen(true)}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-700 to-indigo-800 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95"
            title="Upload 1st CA, 2nd CA and Exam scores for a specific subject & class by Student Reg Number"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-yellow-300" />
            <span className="sm:hidden">Subject CA &amp; Exam</span>
            <span className="hidden sm:inline">Subject CA &amp; Exam Upload</span>
          </button>

          <button
            onClick={openNewResultModal}
            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="sm:hidden">+ New Result</span>
            <span className="hidden sm:inline">Prepare New Student Result</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Total Dossiers</div>
            <div className="text-base sm:text-lg font-black text-white truncate">{results.length}</div>
          </div>
        </div>

        <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-900/40 border border-amber-600 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-amber-300/80 font-medium truncate">Pending Finalizing</div>
            <div className="text-xs sm:text-lg font-black text-amber-400 truncate">
              {draftDossiersCount} Draft{draftDossiersCount === 1 ? "" : "s"} ({teacherCourseDrafts.length} Courses)
            </div>
          </div>
        </div>

        <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-emerald-300/80 font-medium truncate">Published Live</div>
            <div className="text-xs sm:text-lg font-black text-emerald-400 truncate">{publishedDossiersCount}</div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-400 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">Breakdown</div>
            <div className="text-xs sm:text-sm font-black text-yellow-400 truncate">CA1(15) + CA2(15) + Ex(70)</div>
          </div>
        </div>
      </div>

      {/* Teacher Uploaded Course Drafts & 1-Click Admin Final Finishing Command Bar */}
      {(draftDossiersCount > 0 || teacherCourseDrafts.length > 0 || finalizeFeedback) && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-slate-950 to-amber-950/40 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  Admin Final Finishing Desk
                </span>
                <h3 className="text-sm font-black text-white">
                  Teacher Course Submissions (1st CA, 2nd CA &amp; Exam) Ready in Draft
                </h3>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl">
                Teachers have uploaded scores for <strong className="text-amber-300">{teacherCourseDrafts.length} course(s)</strong>, automatically compiling{" "}
                <strong className="text-amber-300">{draftDossiersCount} student report card dossier(s)</strong> in Draft mode. You can review/edit any student below or click{" "}
                <strong className="text-emerald-300">Finalize &amp; Publish</strong> to auto-rank positions and publish to the student portal in one click.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={refreshResultsAndDrafts}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Refresh Drafts</span>
              </button>

              <button
                type="button"
                disabled={isFinalizingDrafts || (draftDossiersCount === 0 && teacherCourseDrafts.length === 0)}
                onClick={() => handleFinalizeDrafts(selectedClassFilter)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                {isFinalizingDrafts ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Finalizing &amp; Ranking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>
                      {selectedClassFilter !== "ALL"
                        ? `🚀 Finalize & Publish ${selectedClassFilter} Drafts`
                        : `🚀 1-Click Finalize & Publish All Drafts (${draftDossiersCount || teacherCourseDrafts.length})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Teacher Course Draft Pills */}
          {teacherCourseDrafts.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Uploaded Course Drafts by Subject Teachers ({teacherCourseDrafts.length}):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {teacherCourseDrafts.slice(0, 9).map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">
                        {d.subject} <span className="text-yellow-400">&bull; {d.className}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        By {d.teacherName} &bull; 1st CA: {d.ca1Count} | 2nd CA: {d.ca2Count} | Exam: {d.examCount}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFinalizeDrafts(d.className)}
                      disabled={isFinalizingDrafts}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold shrink-0 transition"
                      title={`Finalize and publish all draft dossiers for ${d.className}`}
                    >
                      Finalize Class
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {finalizeFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                finalizeFeedback.type === "success"
                  ? "bg-emerald-950/70 border-emerald-700 text-emerald-300"
                  : "bg-rose-950/70 border-rose-700 text-rose-300"
              }`}
            >
              <span>{finalizeFeedback.text}</span>
              <button
                type="button"
                onClick={() => setFinalizeFeedback(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or admission number (e.g. GFMS/2024/0501)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
          />
        </div>

        {/* Status Filter Tabs (All | Drafts Pending Admin | Published) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === "ALL"
                ? "bg-blue-700 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("DRAFT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              statusFilter === "DRAFT"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-amber-400/80 hover:text-amber-300"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Drafts Pending Admin ({draftDossiersCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PUBLISHED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              statusFilter === "PUBLISHED"
                ? "bg-emerald-600 text-white shadow"
                : "text-emerald-400/80 hover:text-emerald-300"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Published ({publishedDossiersCount})</span>
          </button>
        </div>

        <select
          value={selectedClassFilter}
          onChange={(e) => setSelectedClassFilter(e.target.value)}
          className="w-full lg:w-48 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-yellow-500"
        >
          <option value="ALL">All Classes</option>
          {availableClasses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Results & Draft Dossiers Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Student Result Dossiers ({filteredResults.length})</span>
            {draftDossiersCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {draftDossiersCount} Draft Pending Finalizing
              </span>
            )}
          </h3>
          <span className="text-[11px] text-slate-400">
            Click &ldquo;Edit / Finish&rdquo; to review teacher-compiled subjects or &ldquo;Finalize&rdquo; to publish
          </span>
        </div>

        {filteredResults.length === 0 ? (
          <div className="p-10 text-center text-slate-500 space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-300">No Matching Student Dossiers Found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                When teachers upload 1st CA, 2nd CA, and Exam scores for their courses, student draft dossiers appear here automatically for your final finishing.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBatchFeedback(null);
                  setIsSmallSmallOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>⚡ Bulk Upload (1,000+ Students CSV / Excel)</span>
              </button>

              <button
                onClick={openNewResultModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-md transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span>Prepare New Student Result</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (md:hidden) */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {filteredResults.map((r) => {
                const aNo = r.admNo || r.adm_no;
                const sName = r.studentName || r.student_name;
                const cName = r.className || r.class_name;
                const sess = r.session || "2025/2026";
                const trm = r.term || "Third Term";
                const pos = r.position || 1;
                const avg = r.average ? Number(r.average).toFixed(1) : "0.0";
                const tot = r.totalScore || r.total_score || 0;
                const isDraft = r.isPublished === false || r.is_published === false;
                let subjCount = 0;
                try {
                  subjCount = JSON.parse(r.resultPayload || r.result_payload || "{}")?.subjects?.length || 0;
                } catch {}

                return (
                  <div key={r.id || `${aNo}-${sess}-${trm}`} className="p-3.5 space-y-3 bg-slate-950/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-sm truncate">{sName}</div>
                        <div className="text-xs font-mono text-yellow-400 font-semibold truncate">{aNo}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {cName} &bull; {sess} ({trm}) &bull; {subjCount} Subject{subjCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-blue-900/60 text-blue-300 border border-blue-700 shrink-0">
                        #{pos} of {r.numberInClass || r.number_in_class || 35}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Total</span>
                        <span className="font-mono font-bold text-white text-sm">{tot}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Average</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">{avg}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Status</span>
                        {isDraft ? (
                          <span className="inline-block text-[10px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded-full border border-amber-700 mt-0.5">
                            Draft (Pending)
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded-full border border-emerald-800 mt-0.5">
                            Published
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {isDraft ? (
                        <button
                          type="button"
                          onClick={() => handleFinalizeDrafts(cName, [aNo])}
                          disabled={isFinalizingDrafts}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow transition active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Finalize &amp; Publish</span>
                        </button>
                      ) : (
                        <Link
                          href={`/result/${encodeURIComponent(aNo)}?name=${encodeURIComponent(
                            sName
                          )}&session=${encodeURIComponent(sess)}&term=${encodeURIComponent(trm)}`}
                          target="_blank"
                          className="flex-1 py-2 px-3 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition active:scale-95"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Card</span>
                        </Link>
                      )}

                      <button
                        onClick={() => handleEditResult(r)}
                        className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 border border-slate-700"
                        title="Review / Finish Student Result Dossier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isDraft ? "Finish" : "Edit"}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteResult(r.id)}
                        className="py-2 px-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 border border-rose-800"
                        title="Delete Result"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="p-3 font-semibold">Student &amp; Admission No</th>
                    <th className="p-3 font-semibold">Class / Session</th>
                    <th className="p-3 font-semibold text-center">Position</th>
                    <th className="p-3 font-semibold text-center">Compiled Subjects</th>
                    <th className="p-3 font-semibold text-center">Total / Avg</th>
                    <th className="p-3 font-semibold text-center">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredResults.map((r) => {
                    const aNo = r.admNo || r.adm_no;
                    const sName = r.studentName || r.student_name;
                    const cName = r.className || r.class_name;
                    const sess = r.session || "2025/2026";
                    const trm = r.term || "Third Term";
                    const pos = r.position || 1;
                    const avg = r.average ? Number(r.average).toFixed(1) : "0.0";
                    const tot = r.totalScore || r.total_score || 0;
                    const isDraft = r.isPublished === false || r.is_published === false;
                    let subjCount = 0;
                    try {
                      subjCount = JSON.parse(r.resultPayload || r.result_payload || "{}")?.subjects?.length || 0;
                    } catch {}

                    return (
                      <tr key={r.id || `${aNo}-${sess}-${trm}`} className="hover:bg-slate-900/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-white">{sName}</div>
                          <div className="text-[11px] font-mono text-yellow-400">{aNo}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-200">{cName}</div>
                          <div className="text-[10px] text-slate-400">
                            {sess} &bull; {trm}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-900/50 text-blue-300 border border-blue-700">
                            #{pos} of {r.numberInClass || r.number_in_class || 35}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-900 text-slate-200 border border-slate-700">
                            {subjCount} Subject{subjCount === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="font-mono font-bold text-white">{tot} pts</div>
                          <div className="text-[11px] font-bold text-emerald-400">{avg}%</div>
                        </td>
                        <td className="p-3 text-center">
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/70 px-2.5 py-0.5 rounded-full border border-amber-700">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Draft • Pending Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Published</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isDraft && (
                              <button
                                type="button"
                                onClick={() => handleFinalizeDrafts(cName, [aNo])}
                                disabled={isFinalizingDrafts}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 transition shadow-xs"
                                title="Finalize and publish this student's report card"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Finalize</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleEditResult(r)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition border border-slate-700"
                              title="Review / Finish Student Result Dossier"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-yellow-400" />
                              <span>{isDraft ? "Finish" : "Edit"}</span>
                            </button>

                            <Link
                              href={`/result/${encodeURIComponent(aNo)}?name=${encodeURIComponent(
                                sName
                              )}&session=${encodeURIComponent(sess)}&term=${encodeURIComponent(trm)}`}
                              target="_blank"
                              className="p-1.5 bg-blue-900/50 hover:bg-blue-800 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                              title="Preview Report Card"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleDeleteResult(r.id)}
                              className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg transition"
                              title="Delete Result"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ================================================================== */}
      {/* MODAL: PREPARE / EDIT RESULT DOSSIER                              */}
      {/* ================================================================== */}
      {isModalOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="sheet-panel sheet-flush bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-900/60 border border-blue-700 text-yellow-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingId ? "Edit Student Terminal Dossier" : "Prepare New Student Terminal Dossier"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Comprehensive Continuous Assessment & Terminal Examination Grading
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveResult} className="flex-1 overflow-y-auto p-6 space-y-6">
              {feedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                    feedback.type === "success"
                      ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                      : "bg-rose-950/80 border-rose-700 text-rose-300"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Section 1: Student Demographics */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>1. Student Biodata & Academic Session</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Okeke, Somtochukwu Grace"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Admission Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GFMS/2024/0501"
                      value={admNo}
                      onChange={(e) => setAdmNo(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-yellow-400 font-mono focus:border-yellow-500 focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Class Name &amp; Arm / Stream *
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        required
                        list="gfms-class-options"
                        placeholder="e.g. SS 2 (Science)"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        className="w-full min-w-0 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                      <select
                        value={parseClassAndArm(className).arm || ""}
                        onChange={(e) => {
                          const base = parseClassAndArm(className).baseLevel || className;
                          setClassName(formatClassWithArm(base, e.target.value) || base);
                        }}
                        className="shrink-0 w-28 px-2 py-2 bg-slate-900 border border-indigo-700/70 rounded-xl text-xs text-indigo-200 focus:border-yellow-500 focus:outline-none"
                        title="Arm / Stream (used for cohort ranking, class average and report card)"
                      >
                        <option value="">General</option>
                        {parseClassAndArm(className).baseLevel.startsWith("JSS") ? (
                          <>
                            <option value="Diamond">Diamond</option>
                            <option value="Platinum">Platinum</option>
                            <option value="Gold">Gold</option>
                          </>
                        ) : (
                          <>
                            <option value="Science">Science</option>
                            <option value="Art">Art</option>
                            <option value="Commercial">Commercial</option>
                          </>
                        )}
                      </select>
                    </div>
                    <datalist id="gfms-class-options">
                      {availableClasses.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Position &amp; class average are ranked within this class + stream.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Academic Session
                    </label>
                    <input
                      type="text"
                      required
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Academic Term *
                    </label>
                    <select
                      value={term}
                      onChange={(e) => {
                        const newTerm = e.target.value;
                        setTerm(newTerm);
                        if (newTerm !== "Third Term") {
                          setDecision("");
                          setNextClass("");
                        } else {
                          if (!decision) setDecision("PROMOTED");
                          if (!nextClass) setNextClass("JSS 3 Platinum");
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white focus:border-yellow-500 focus:outline-none"
                    >
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term (Promotional Term)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between gap-1">
                      <span>Class Position &amp; Roll</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (isPositionManual) {
                            setIsPositionManual(false);
                            const activeAvg = parseFloat(hasCumulative ? overallCumulativeAverage : overallAverage) || 0;
                            const { rank, totalInClass } = computeDynamicCohortPosition(
                              className,
                              session,
                              term,
                              admNo,
                              activeAvg,
                              totalScore
                            );
                            setPosition(rank);
                            setNumberInClass(totalInClass);
                          } else {
                            setIsPositionManual(true);
                          }
                        }}
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border transition cursor-pointer flex items-center gap-1 ${
                          isPositionManual
                            ? "text-amber-300 bg-amber-950/80 border-amber-700/60 hover:bg-amber-900"
                            : "text-emerald-300 bg-emerald-950/80 border-emerald-700/60 hover:bg-emerald-900"
                        }`}
                        title={
                          isPositionManual
                            ? "Click to switch back to Dynamic Auto-Rank based on Student Average"
                            : "Auto-ranked dynamically from Student Average. Click or type below to manually tweak!"
                        }
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>{isPositionManual ? "Manual Tweak (Click for Auto)" : "Dynamic by Average"}</span>
                      </button>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-1/2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">
                          Position ({isPositionManual ? "Manual" : "Auto"}):
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={position}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            setIsPositionManual(true);
                            setPosition(e.target.value);
                          }}
                          onBlur={() => {
                            if (String(position).trim() === "") {
                              const activeAvg = parseFloat(hasCumulative ? overallCumulativeAverage : overallAverage) || 0;
                              const { rank } = computeDynamicCohortPosition(className, session, term, admNo, activeAvg, totalScore);
                              setPosition(rank);
                            } else {
                              setPosition(Math.max(1, parseInt(String(position), 10) || 1));
                            }
                          }}
                          className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-base sm:text-xs text-white font-mono focus:outline-none ${
                            isPositionManual
                              ? "border-amber-500/80 focus:border-amber-400"
                              : "border-emerald-700/70 focus:border-yellow-500"
                          }`}
                          placeholder="Position (1)"
                        />
                      </div>
                      <span className="text-slate-500 text-sm font-bold mt-3">/</span>
                      <div className="w-1/2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Total in Class:</span>
                        <input
                          type="number"
                          min="1"
                          value={numberInClass}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setNumberInClass(e.target.value)}
                          onBlur={() => {
                            if (String(numberInClass).trim() === "") {
                              setNumberInClass(35);
                            } else {
                              setNumberInClass(Math.max(1, parseInt(String(numberInClass), 10) || 35));
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                          placeholder="Class Size (35)"
                        />
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        {isPositionManual ? "Admin Manual Tweak:" : `Ranked on ${overallAverage}% Avg:`}
                      </span>
                      <span className="font-bold text-yellow-400 font-mono">
                        {Number(position) || 1}
                        {getOrdinalSuffix(Number(position) || 1)} of {Number(numberInClass) || 35} pupils
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student Certified Passport Photograph */}
                <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-14 h-18 rounded border-2 border-yellow-500/80 bg-slate-950 overflow-hidden flex items-center justify-center relative shadow-md">
                      {studentPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={studentPhotoUrl}
                          alt="Student Passport Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center text-slate-500">
                          <Camera className="w-5 h-5 mb-0.5 text-slate-400" />
                          <span className="text-[7.5px] font-bold uppercase">No Photo</span>
                        </div>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-blue-900/95 text-[6px] font-bold text-center text-white uppercase py-0.5 tracking-tight">
                        PASSPORT
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-slate-200">
                        Student Passport Photograph (A4 Report Card)
                      </label>
                      {studentPhotoUrl && (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                          Photo Attached
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Certified photograph to print on the official terminal report card. Upload from device or paste an image URL.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert("Image exceeds 2MB limit. Please upload a smaller passport photo.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === "string") {
                                  setStudentPhotoUrl(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      <input
                        type="text"
                        placeholder="Or enter image URL (e.g. /assets/images/...)"
                        value={studentPhotoUrl}
                        onChange={(e) => setStudentPhotoUrl(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-yellow-500 focus:outline-none"
                      />

                      {studentPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setStudentPhotoUrl("")}
                          className="px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-semibold transition"
                          title="Remove attached photo"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Attendance (Days Present / Opened)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={daysPresent}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDaysPresent(e.target.value)}
                        onBlur={() => {
                          if (String(daysPresent).trim() === "") setDaysPresent(0);
                        }}
                        className="w-1/2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                        placeholder="Present"
                      />
                      <span className="text-slate-500 text-xs">/</span>
                      <input
                        type="number"
                        min="0"
                        value={daysOpened}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDaysOpened(e.target.value)}
                        onBlur={() => {
                          if (String(daysOpened).trim() === "") setDaysOpened(115);
                        }}
                        className="w-1/2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                        placeholder="Opened"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Promotion Decision</span>
                      {term !== "Third Term" && (
                        <span className="text-[10px] text-amber-400 font-bold">3rd Term Only</span>
                      )}
                    </label>
                    {term === "Third Term" ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={decision}
                          onChange={(e) => setDecision(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white focus:border-yellow-500 focus:outline-none font-bold text-emerald-400"
                          placeholder="e.g. PROMOTED TO JSS 3"
                        />
                        <div className="flex flex-wrap gap-1">
                          {["PROMOTED", "PROMOTED ON TRIAL", "TO REPEAT", "PASSED"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setDecision(preset)}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition ${
                                decision === preset
                                  ? "bg-yellow-400 text-slate-950 shadow-xs"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-500 italic flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        <span>Disabled (Awarded exclusively in Third Term)</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Next Term Resumes
                    </label>
                    <input
                      type="text"
                      value={nextTermBegins}
                      onChange={(e) => setNextTermBegins(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white focus:border-yellow-500 focus:outline-none"
                      placeholder="e.g. Monday, 14th September 2026"
                    />
                  </div>
                </div>

                {/* Additional Demographics & Fee Row */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Student Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white focus:border-yellow-500 focus:outline-none"
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Promoted To Class</span>
                      {term !== "Third Term" && (
                        <span className="text-[10px] text-amber-400 font-bold">3rd Term Only</span>
                      )}
                    </label>
                    {term === "Third Term" ? (
                      <input
                        type="text"
                        value={nextClass}
                        onChange={(e) => setNextClass(e.target.value)}
                        placeholder="e.g. JSS 3 Platinum"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-500 italic flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        <span>N/A in {term}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Class Average %
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsClassAverageManual(false);
                          const activeAvg = parseFloat(hasCumulative ? overallCumulativeAverage : overallAverage);
                          const computed = computeDynamicClassAverage(className, session, term, activeAvg);
                          setClassAverage(computed);
                        }}
                        className="text-[10px] text-yellow-400 hover:text-yellow-300 underline font-medium"
                        title="Auto-calculate dynamically from class scores"
                      >
                        Auto-Calculate
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={classAverage}
                      onChange={(e) => {
                        setIsClassAverageManual(true);
                        setClassAverage(parseFloat(e.target.value || "0"));
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Next Term Fee Amount
                    </label>
                    <input
                      type="text"
                      value={termFeeAmount}
                      onChange={(e) => setTermFeeAmount(e.target.value)}
                      placeholder="e.g. ₦185,000 (optional)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Fee Status
                    </label>
                    <select
                      value={feeStatus}
                      onChange={(e) => setFeeStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                    >
                      <option value="PAID">PAID</option>
                      <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                      <option value="OUTSTANDING">OUTSTANDING</option>
                    </select>
                  </div>
                </div>

                {/* Official Bank Account Clearance (Admin controlled only - no dummy values) */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-yellow-400">
                      Official School Bank Details for Report Card (Admin Controlled)
                    </label>
                    <span className="text-[10px] text-slate-400 italic">
                      Dummy account removed &bull; Only included if entered by admin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Bank Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. Zenith Bank PLC"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Account Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g. 1012345678"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-yellow-400 font-mono focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Account Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="e.g. Great-Favour Montessori School"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Fee Payment Due Date
                      </label>
                      <input
                        type="text"
                        value={feeDueDate}
                        onChange={(e) => setFeeDueDate(e.target.value)}
                        placeholder="e.g. Monday, 14th September 2026"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Subject Scores Table (CA1 + CA2 + Exam / 3rd Term Compilation) */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-4 h-4" />
                      <span>2. Subject Continuous Assessment & Exam Scores</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {term === "Third Term"
                        ? "3rd Term Promotional Compilation: 1st Term (100) + 2nd Term (100) + 3rd CA1(15) + 3rd CA2(15) + 3rd Exam(70) → Cumulative Average %"
                        : "Continuous Assessment: CA 1 (Max 15) + CA 2 (Max 15) + Terminal Exam (Max 70) = 100%"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {subjects.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllSubjects}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0"
                        title="Clear all subjects"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Clear All</span>
                      </button>
                    )}
                    {subjects.length === 0 && (
                      <button
                        type="button"
                        onClick={() => loadDefaultSubjects("AUTO")}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0"
                        title="Load curriculum subjects matching this student's class & stream"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-yellow-400" />
                        <span>
                          Load {parseClassAndArm(className).arm && parseClassAndArm(className).baseLevel.startsWith("SS")
                            ? `${parseClassAndArm(className).arm} Stream`
                            : "Standard"} Subjects
                        </span>
                      </button>
                    )}
                    {subjects.length === 0 && parseClassAndArm(className).baseLevel.startsWith("SS") && (
                      <div className="flex items-center gap-1">
                        {(["SCIENCE", "ART", "COMMERCIAL"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => loadDefaultSubjects(p)}
                            className="px-2 py-1 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 rounded-lg text-[10px] font-bold transition"
                            title={`Load ${p.toLowerCase()} stream subjects`}
                          >
                            {p === "SCIENCE" ? "Science" : p === "ART" ? "Art" : "Commercial"}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={addCustomSubject}
                      className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-300 border border-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Subject</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                        <th className="p-2 font-semibold min-w-[130px]">Subject Name</th>
                        <th className="p-2 font-semibold min-w-[90px]">Category</th>
                        {term === "Third Term" ? (
                          <>
                            <th className="p-2 font-semibold text-center w-14" title="1st Term Total Score / 100">1st (100)</th>
                            <th className="p-2 font-semibold text-center w-14" title="2nd Term Total Score / 100">2nd (100)</th>
                            <th className="p-2 font-semibold text-center w-12" title="3rd Term Continuous Assessment 1 / 15">3rd CA1</th>
                            <th className="p-2 font-semibold text-center w-12" title="3rd Term Continuous Assessment 2 / 15">3rd CA2</th>
                            <th className="p-2 font-semibold text-center w-14" title="3rd Term Terminal Examination / 70">3rd Exam</th>
                            <th className="p-2 font-semibold text-center w-14" title="3rd Term Total Score / 100">3rd Tot</th>
                            <th className="p-2 font-semibold text-center w-16 bg-yellow-950/40 text-yellow-300 font-bold" title="Cumulative Annual Average %">Cum Avg%</th>
                          </>
                        ) : (
                          <>
                            <th className="p-2 font-semibold text-center w-16">CA 1 (15)</th>
                            <th className="p-2 font-semibold text-center w-16">CA 2 (15)</th>
                            <th className="p-2 font-semibold text-center w-20">Exam (70)</th>
                            <th className="p-2 font-semibold text-center w-20">Total (100)</th>
                          </>
                        )}
                        <th className="p-2 font-semibold text-center w-14">Grade</th>
                        <th className="p-2 font-semibold w-24">Remark</th>
                        <th className="p-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {subjects.length === 0 ? (
                        <tr>
                          <td
                            colSpan={term === "Third Term" ? 10 : 7}
                            className="p-8 text-center bg-slate-900/30 rounded-xl"
                          >
                            <div className="flex flex-col items-center justify-center gap-2 py-4">
                              <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-yellow-400">
                                <Percent className="w-5 h-5" />
                              </div>
                              <p className="text-sm font-bold text-slate-200">
                                No Subjects Added Yet
                              </p>
                              <p className="text-xs text-slate-400 max-w-md">
                                Subject scores start empty. Click below to add a subject manually or populate the 10 Nigerian basic subjects.
                              </p>
                              <div className="flex items-center gap-2.5 mt-2">
                                <button
                                  type="button"
                                  onClick={addCustomSubject}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>+ Add Custom Subject</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => loadDefaultSubjects("AUTO")}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>Load Standard 10</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        subjects.map((sub) => {
                          const thirdTotal = (sub.ca1 || 0) + (sub.ca2 || 0) + (sub.exam || 0);
                          const hasT1 = sub.term1Score !== undefined && sub.term1Score !== null;
                          const hasT2 = sub.term2Score !== undefined && sub.term2Score !== null;
                          const cumScore = sub.cumulativeScore !== undefined
                            ? sub.cumulativeScore
                            : (hasT1 || hasT2)
                            ? Math.round((((Number(sub.term1Score) || 0) + (Number(sub.term2Score) || 0) + thirdTotal) / 3) * 10) / 10
                            : thirdTotal;

                          return (
                            <tr key={sub.id} className="hover:bg-slate-900/30">
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={sub.subjectName}
                                  placeholder="e.g. Mathematics"
                                  onChange={(e) => updateSubjectScore(sub.id, "subjectName", e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-base sm:text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={sub.category}
                                  placeholder="General"
                                  onChange={(e) => updateSubjectScore(sub.id, "category", e.target.value)}
                                  className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-base sm:text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-yellow-500"
                                />
                              </td>
                              {term === "Third Term" ? (
                                <>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={sub.term1Score ?? ""}
                                      placeholder="-"
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateSubjectScore(sub.id, "term1Score", e.target.value)}
                                      className="w-14 px-1 py-1 bg-slate-900 border border-slate-700 rounded text-center text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                                      title="1st Term Total Score / 100"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={sub.term2Score ?? ""}
                                      placeholder="-"
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateSubjectScore(sub.id, "term2Score", e.target.value)}
                                      className="w-14 px-1 py-1 bg-slate-900 border border-slate-700 rounded text-center text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                                      title="2nd Term Total Score / 100"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="15"
                                      value={sub.ca1}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateSubjectScore(sub.id, "ca1", e.target.value)}
                                      className="w-12 px-1 py-1 bg-slate-900 border border-slate-700 rounded text-center text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                                      title="3rd Term 1st CA / 15"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="15"
                                      value={sub.ca2}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateSubjectScore(sub.id, "ca2", e.target.value)}
                                      className="w-12 px-1 py-1 bg-slate-900 border border-slate-700 rounded text-center text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                                      title="3rd Term 2nd CA / 15"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="70"
                                      value={sub.exam}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateSubjectScore(sub.id, "exam", e.target.value)}
                                      className="w-14 px-1 py-1 bg-slate-900 border border-slate-700 rounded text-center text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                                      title="3rd Term Terminal Exam / 70"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center font-bold text-white font-mono">
                                    {thirdTotal}
                                  </td>
                                  <td className="p-1.5 text-center font-black text-yellow-400 font-mono bg-yellow-950/20">
                                    {cumScore}%
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="15"
                                      value={sub.ca1}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateSubjectScore(sub.id, "ca1", e.target.value)}
                                      className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-center text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="15"
                                      value={sub.ca2}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateSubjectScore(sub.id, "ca2", e.target.value)}
                                      className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-center text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="70"
                                      value={sub.exam}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateSubjectScore(sub.id, "exam", e.target.value)}
                                      className="w-16 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-center text-base sm:text-xs text-white font-mono focus:border-yellow-500 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center font-bold text-white font-mono">
                                    {sub.totalScore}
                                  </td>
                                </>
                              )}
                              <td className="p-1.5 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded font-black text-[10px] ${
                                    sub.grade === "A"
                                      ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
                                      : sub.grade === "B"
                                      ? "bg-blue-900/60 text-blue-300 border border-blue-700"
                                      : sub.grade === "C"
                                      ? "bg-yellow-900/60 text-yellow-300 border border-yellow-700"
                                      : "bg-rose-900/60 text-rose-300 border border-rose-700"
                                  }`}
                                >
                                  {sub.grade}
                                </span>
                              </td>
                              <td className="p-1.5 text-slate-300 text-[11px] font-medium">
                                {sub.remark}
                              </td>
                              <td className="p-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeSubject(sub.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                                  title="Remove Subject"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Live Scores Summary Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-slate-400">Total Score: </span>
                      <strong className="text-white font-mono">{totalScore}</strong>
                      <span className="text-slate-500 font-mono"> / {totalPossible}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {term === "Third Term" ? "3rd Term Average: " : "Computed Average: "}
                      </span>
                      <strong className="text-emerald-400 font-mono">{overallAverage}%</strong>
                    </div>
                    {term === "Third Term" && (
                      <div>
                        <span className="text-slate-400">Annual Cum Average: </span>
                        <strong className="text-yellow-400 font-mono">{overallCumulativeAverage}%</strong>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {term === "Third Term" ? "Dynamic 3rd term & cumulative promotional averages" : "Dynamic average computed automatically from scores"}
                  </span>
                </div>
              </div>

              {/* Section 3: Teacher & Principal Remarks */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4" />
                  <span>3. Teacher & Principal Appraisal Remarks</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Class Teacher&apos;s Remark
                    </label>
                    <textarea
                      rows={2}
                      value={teacherRemark}
                      onChange={(e) => setTeacherRemark(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Director / Principal&apos;s Remark
                    </label>
                    <textarea
                      rows={2}
                      value={principalRemark}
                      onChange={(e) => setPrincipalRemark(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Form Master Official Signatory Name
                    </label>
                    <input
                      type="text"
                      value={formMasterName}
                      onChange={(e) => setFormMasterName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Principal / Director Official Signatory Name
                    </label>
                    <input
                      type="text"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-yellow-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Psychomotor & Affective Traits Profile */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>4. Psychomotor &amp; Affective Appraisal Profile</span>
                  </h4>

                  {/* 1-Click Preset Buttons */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-400">Apply Preset:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const s5 = Object.keys(skills).reduce((acc, k) => ({ ...acc, [k]: 5 }), {});
                        const b5 = Object.keys(behaviour).reduce((acc, k) => ({ ...acc, [k]: 5 }), {});
                        setSkills(s5);
                        setBehaviour(b5);
                      }}
                      className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded hover:bg-yellow-500/30 font-bold"
                    >
                      All Distinction (5.0)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSkills(DEFAULT_PREPARED_SKILLS);
                        setBehaviour(DEFAULT_PREPARED_BEHAVIOUR);
                      }}
                      className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded hover:bg-blue-500/30 font-bold"
                    >
                      Standard High (4-5)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Psychomotor Skills */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="text-[11px] font-bold text-slate-300 flex justify-between">
                      <span>Part 2: Psychomotor Skills (9 Traits)</span>
                      <span className="text-yellow-400">Scale 1 - 5</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      {Object.keys(skills).map((k) => (
                        <div key={k} className="flex items-center justify-between bg-slate-950 px-1.5 py-1 rounded border border-slate-800">
                          <span className="text-slate-400 capitalize truncate pr-1">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <select
                            value={skills[k] || 5}
                            onChange={(e) => setSkills((prev) => ({ ...prev, [k]: parseInt(e.target.value, 10) }))}
                            className="bg-slate-900 text-yellow-400 font-bold text-[10px] rounded px-1 py-0.2 focus:outline-none"
                          >
                            {[5, 4, 3, 2, 1].map((num) => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Affective Behaviour */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="text-[11px] font-bold text-slate-300 flex justify-between">
                      <span>Part 3: Affective Behaviour (12 Traits)</span>
                      <span className="text-emerald-400">Scale 1 - 5</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      {Object.keys(behaviour).map((k) => (
                        <div key={k} className="flex items-center justify-between bg-slate-950 px-1.5 py-1 rounded border border-slate-800">
                          <span className="text-slate-400 capitalize truncate pr-1">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <select
                            value={behaviour[k] || 5}
                            onChange={(e) => setBehaviour((prev) => ({ ...prev, [k]: parseInt(e.target.value, 10) }))}
                            className="bg-slate-900 text-emerald-400 font-bold text-[10px] rounded px-1 py-0.2 focus:outline-none"
                          >
                            {[5, 4, 3, 2, 1].map((num) => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons (Sticky at bottom for mobile convenience) */}
              <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-md -mx-6 -mb-6 p-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2.5 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => handleSaveResultWithOption(e, false, false)}
                  className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 active:scale-95"
                  title="Save this student dossier in Draft mode pending final publication"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={(e) => handleSaveResultWithOption(e, true, true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition disabled:opacity-50 active:scale-95"
                  title="Save & publish this result and automatically load the next pending student in this class"
                >
                  <span>Finalize &amp; Next Student</span>
                  <ArrowRight className="w-3.5 h-3.5 text-yellow-300" />
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition disabled:opacity-50 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-yellow-300" />
                  <span>{isPending ? "Finalizing Dossier..." : "Finalize & Publish Dossier"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Grading Scale Configuration Modal */}
      {isGradingModalOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sheet-panel bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700 flex items-center justify-center text-emerald-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dynamic Grading Standards Desk</h3>
                  <p className="text-[11px] text-slate-400">
                    Set customized grading scales, cutoffs, letter grades, and academic appraisal remarks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGradingModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {standardsFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{standardsFeedback}</span>
              </div>
            )}

            {/* Presets Quick Picker */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Quick Institutional Presets:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESET_STANDARDS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setEditingStandards(preset.tiers)}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition group"
                  >
                    <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Standards Tiers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Active Grading Scale Tiers:</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingStandards((prev) => [
                      ...prev,
                      {
                        id: `tier-${Date.now()}`,
                        minScore: 10,
                        maxScore: 30,
                        grade: "E",
                        remark: "Pass",
                      },
                    ])
                  }
                  className="px-2.5 py-1 bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Tier (Range)</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-400 px-1">
                  <div className="col-span-5 sm:col-span-4">Score Range (%) [Min – Max]</div>
                  <div className="col-span-2 sm:col-span-2 text-center">Grade</div>
                  <div className="col-span-4 sm:col-span-5">Official Remark</div>
                  <div className="col-span-1 text-right">Del</div>
                </div>

                {editingStandards.map((tier, tIdx) => (
                  <div
                    key={tier.id || tIdx}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-2 rounded-xl border border-slate-800"
                  >
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tier.minScore}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setEditingStandards((prev) => {
                            const copy = [...prev];
                            copy[tIdx] = { ...copy[tIdx], minScore: isNaN(val) ? 0 : val };
                            return copy;
                          });
                        }}
                        className="w-1/2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500 text-center"
                        placeholder="Min"
                        title="Minimum Score (e.g. 10)"
                      />
                      <span className="text-slate-400 text-xs font-bold shrink-0">–</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={tier.maxScore !== undefined && tier.maxScore !== null ? tier.maxScore : 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setEditingStandards((prev) => {
                            const copy = [...prev];
                            copy[tIdx] = { ...copy[tIdx], maxScore: isNaN(val) ? 100 : val };
                            return copy;
                          });
                        }}
                        className="w-1/2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500 text-center"
                        placeholder="Max"
                        title="Maximum Score (e.g. 30)"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-2">
                      <input
                        type="text"
                        value={tier.grade}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingStandards((prev) => {
                            const copy = [...prev];
                            copy[tIdx] = { ...copy[tIdx], grade: val };
                            return copy;
                          });
                        }}
                        placeholder="e.g. A"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-yellow-400 focus:outline-none focus:border-emerald-500 text-center uppercase"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-5">
                      <input
                        type="text"
                        value={tier.remark}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingStandards((prev) => {
                            const copy = [...prev];
                            copy[tIdx] = { ...copy[tIdx], remark: val };
                            return copy;
                          });
                        }}
                        placeholder="e.g. Distinction"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingStandards.length <= 2) return;
                          setEditingStandards((prev) => prev.filter((_, i) => i !== tIdx));
                        }}
                        disabled={editingStandards.length <= 2}
                        className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingStandards(DEFAULT_GRADE_STANDARDS)}
                className="text-xs text-slate-400 hover:text-white transition font-medium"
              >
                Reset to Default Standards
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGradingModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyStandards(editingStandards)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save &amp; Apply Standards</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: DELEGATED SUBJECT CA & EXAM UPLOADER                       */}
      {/* ================================================================== */}
      {isDelegatedSubjectOpen && (
        <div
          className="sheet-overlay fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setIsDelegatedSubjectOpen(false)}
        >
          <div
            className="sheet-panel sheet-flush bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-inner">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Super Admin: Delegated Subject CA &amp; Exam Score Upload
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload Continuous Assessment (CA 1, CA 2) and Terminal Exam scores by Student Reg Number. Automatically merges into master terminal results and updates class ranks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDelegatedSubjectOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-80px)]">
              <DelegatedSubjectScoreUploader
                userRole="SUPER_ADMIN"
                teacherName="Super Administrator"
                initialStudents={initialStudents}
                onSyncComplete={async () => {
                  await refreshResultsAndDrafts();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: UPLOAD SMALL-SMALL (EASY BATCH DESK)                       */}
      {/* ================================================================== */}
      {isSmallSmallOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="sheet-panel sheet-flush bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      ⚡ High-Capacity Result Uploader (1,000+ Students)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Multi-Class & CSV Ready
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Zero Timeouts Guaranteed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Upload results for 1,000+ students via Drag & Drop CSV / Excel files, clipboard paste, or class roster selection with auto-ranking.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSmallSmallOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation & Controls Header */}
            <div className="bg-slate-950/70 border-b border-slate-800 px-6 py-3 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Mode Selector Tabs */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSmallSmallMode("roster");
                      setBatchFeedback(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                      smallSmallMode === "roster"
                        ? "bg-amber-500 text-slate-950 shadow-md font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Class Roster Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSmallSmallMode("paste");
                      setBatchFeedback(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
                      smallSmallMode === "paste"
                        ? "bg-amber-500 text-slate-950 shadow-md font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>⚡ CSV / Excel / Paste (1,000+ Students)</span>
                  </button>
                </div>

                {/* Cohort Selectors & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={batchClass}
                    onChange={(e) => {
                      setBatchClass(e.target.value);
                      setSelectedRosterAdmNos(new Set());
                      setBatchFeedback(null);
                    }}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none font-semibold"
                  >
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        Class: {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={batchSession}
                    onChange={(e) => {
                      setBatchSession(e.target.value);
                      setSelectedRosterAdmNos(new Set());
                    }}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="2025/2026">2025/2026 Session</option>
                    <option value="2024/2025">2024/2025 Session</option>
                    <option value="2026/2027">2026/2027 Session</option>
                  </select>

                  <select
                    value={batchTerm}
                    onChange={(e) => {
                      setBatchTerm(e.target.value);
                      setSelectedRosterAdmNos(new Set());
                    }}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Third Term">Third Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="First Term">First Term</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAutoRankCohort}
                    disabled={isRankingCohort || isBatchProcessing}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-yellow-500/40 text-yellow-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                    title="Automatically calculate and re-order student positions (1st, 2nd, 3rd) based on overall average"
                  >
                    {isRankingCohort ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                    ) : (
                      <Award className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                    <span>{isRankingCohort ? "Ranking..." : "Auto-Rank Positions"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSharedSettingsOpen(!isSharedSettingsOpen)}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition"
                    title="Configure Next Term Date, Form Master, and Principal remarks for this batch"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span>Shared Details</span>
                  </button>
                </div>
              </div>

              {/* Shared Settings Collapsible Drawer */}
              {isSharedSettingsOpen && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Next Term Resumption
                    </label>
                    <input
                      type="text"
                      value={batchNextTermBegins}
                      onChange={(e) => setBatchNextTermBegins(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Form Master Name
                    </label>
                    <input
                      type="text"
                      value={batchFormMasterName}
                      onChange={(e) => setBatchFormMasterName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Principal Name
                    </label>
                    <input
                      type="text"
                      value={batchPrincipalName}
                      onChange={(e) => setBatchPrincipalName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Days Opened
                      </label>
                      <input
                        type="number"
                        value={batchDaysOpened}
                        onChange={(e) => setBatchDaysOpened(parseInt(e.target.value, 10) || 115)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Days Present
                      </label>
                      <input
                        type="number"
                        value={batchDaysPresent}
                        onChange={(e) => setBatchDaysPresent(parseInt(e.target.value, 10) || 112)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Feedback Alert */}
              {batchFeedback && (
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold ${
                    batchFeedback.type === "success"
                      ? "bg-emerald-950/80 border-emerald-700 text-emerald-200"
                      : batchFeedback.type === "error"
                      ? "bg-rose-950/80 border-rose-700 text-rose-200"
                      : "bg-blue-950/80 border-blue-700 text-blue-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {batchFeedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : batchFeedback.type === "error" ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
                    )}
                    <span>{batchFeedback.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBatchFeedback(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ========================================================== */}
              {/* TAB 1: ROSTER SPREADSHEET MODE                             */}
              {/* ========================================================== */}
              {smallSmallMode === "roster" && (
                <div className="space-y-4">
                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 font-medium">Class Roster</div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {cohortStudents.length} Students
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-emerald-900/40 rounded-xl p-3">
                      <div className="text-[10px] text-emerald-400 font-medium">Already Published</div>
                      <div className="text-lg font-black text-emerald-400 mt-0.5">
                        {publishedCount} Uploaded
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-amber-900/40 rounded-xl p-3">
                      <div className="text-[10px] text-amber-400 font-medium">Pending Upload</div>
                      <div className="text-lg font-black text-amber-400 mt-0.5">
                        {pendingStudents.length} Remaining
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-blue-900/40 rounded-xl p-3">
                      <div className="text-[10px] text-blue-400 font-medium">Selected for Batch</div>
                      <div className="text-lg font-black text-blue-400 mt-0.5">
                        {selectedRosterAdmNos.size} Selected
                      </div>
                    </div>
                  </div>

                  {/* Pick Small-Small Action Toolbar */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 mr-1">
                        ⚡ Quick Select:
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePickNextPending(5)}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
                      >
                        <span>Pick Next 5 Pending</span>
                        <span className="bg-slate-950/30 text-slate-950 text-[10px] px-1.5 py-0.2 rounded font-mono">
                          +5
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePickNextPending(10)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
                      >
                        <span>Pick Next 10 Pending</span>
                        <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded font-mono">
                          +10
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSelectAllPending}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition"
                      >
                        Select All Pending ({pendingStudents.length})
                      </button>

                      {selectedRosterAdmNos.size > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="px-2 py-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium transition"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    {/* Batch Score Setter */}
                    <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        Batch Fill Average:
                      </span>
                      <input
                        type="number"
                        placeholder="e.g. 75"
                        min={0}
                        max={100}
                        value={quickFillAverage}
                        onChange={(e) => setQuickFillAverage(e.target.value)}
                        className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white text-center font-bold focus:border-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplyQuickFillAverage}
                        className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-300 font-bold text-xs rounded-lg transition"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Student Roster Table */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                    <div className="max-h-[50vh] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                          <tr>
                            <th className="p-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  cohortStudents.length > 0 &&
                                  cohortStudents.every((s) => selectedRosterAdmNos.has(s.admNo))
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRosterAdmNos(new Set(cohortStudents.map((s) => s.admNo)));
                                  } else {
                                    setSelectedRosterAdmNos(new Set());
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                              />
                            </th>
                            <th className="p-3 w-12 text-center">#</th>
                            <th className="p-3">Admission No</th>
                            <th className="p-3">Student Name</th>
                            <th className="p-3 text-center">Current Status</th>
                            <th className="p-3 w-36 text-center">Overall Average %</th>
                            <th className="p-3 w-36 text-center">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {cohortStudents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-500">
                                No registered students found for {batchClass}. You can register students in the
                                Student Registry tab or use the &ldquo;Paste from Excel&rdquo; tab above.
                              </td>
                            </tr>
                          ) : (
                            cohortStudents.map((st, idx) => {
                              const isSelected = selectedRosterAdmNos.has(st.admNo);
                              const existing = results.find(
                                (r) =>
                                  (r.admNo || r.adm_no)?.trim().toUpperCase() === st.admNo &&
                                  r.session === batchSession &&
                                  r.term === batchTerm
                              );
                              const isUploaded = Boolean(existing);
                              const currentVal = rosterInputs[st.admNo]?.average ?? (isUploaded ? String(existing?.average || "") : "");
                              const numAvg = parseFloat(currentVal);
                              const gradeInfo = !isNaN(numAvg) ? computeGradeAndRemark(numAvg, gradeStandards) : null;

                              return (
                                <tr
                                  key={st.admNo}
                                  className={`transition hover:bg-slate-900/60 ${
                                    isSelected
                                      ? "bg-amber-950/20"
                                      : isUploaded
                                      ? "bg-slate-950/40"
                                      : "bg-slate-950"
                                  }`}
                                >
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        setSelectedRosterAdmNos((prev) => {
                                          const next = new Set(prev);
                                          if (e.target.checked) next.add(st.admNo);
                                          else next.delete(st.admNo);
                                          return next;
                                        });
                                      }}
                                      className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-yellow-400">
                                    {st.admNo}
                                  </td>
                                  <td className="p-3 font-bold text-white">
                                    <div className="flex items-center gap-2">
                                      <span>{st.fullName}</span>
                                      <span className="text-[10px] text-slate-500 font-normal">
                                        ({st.gender === "MALE" ? "M" : "F"})
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    {isUploaded ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>
                                          Published ({existing?.average}%, {existing?.position ? getOrdinalSuffix(existing.position) : "-"})
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/70 border border-amber-800 px-2 py-0.5 rounded-full">
                                        <Calendar className="w-3 h-3 text-amber-400" />
                                        <span>Pending</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <input
                                        type="number"
                                        placeholder={isUploaded ? String(existing?.average || "") : "70"}
                                        min={0}
                                        max={100}
                                        value={rosterInputs[st.admNo]?.average ?? (isUploaded ? String(existing?.average || "") : "")}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setRosterInputs((prev) => ({
                                            ...prev,
                                            [st.admNo]: {
                                              ...(prev[st.admNo] || {}),
                                              average: val,
                                            },
                                          }));
                                          if (!selectedRosterAdmNos.has(st.admNo)) {
                                            setSelectedRosterAdmNos((prev) => new Set(prev).add(st.admNo));
                                          }
                                        }}
                                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white text-center focus:border-amber-500 focus:outline-none"
                                      />
                                      {gradeInfo && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                          {gradeInfo.grade}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <select
                                      value={
                                        rosterInputs[st.admNo]?.decision ||
                                        (isUploaded ? existing?.decision || "PROMOTED" : "PROMOTED")
                                      }
                                      onChange={(e) => {
                                        const d = e.target.value;
                                        setRosterInputs((prev) => ({
                                          ...prev,
                                          [st.admNo]: {
                                            ...(prev[st.admNo] || {}),
                                            decision: d,
                                          },
                                        }));
                                      }}
                                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-300 focus:border-amber-500 focus:outline-none"
                                    >
                                      <option value="PROMOTED">Promoted</option>
                                      <option value="ADVISED TO REPEAT">Advised to Repeat</option>
                                      <option value="PASSED">Passed</option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================== */}
              {/* TAB 2: PASTE EXCEL / WHATSAPP MODE                        */}
              {/* ========================================================== */}
              {/* ========================================================== */}
              {/* TAB 2: HIGH-CAPACITY CSV / EXCEL / PASTE MODE (1,000+ STU) */}
              {/* ========================================================== */}
              {smallSmallMode === "paste" && (
                <div className="space-y-4">
                  {/* Drag & Drop File Zone and Sample Template */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Drag & Drop Card */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className={`lg:col-span-2 border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition cursor-pointer relative overflow-hidden ${
                        isDragOver
                          ? "border-amber-400 bg-amber-500/10 shadow-lg"
                          : "border-slate-800 hover:border-slate-700 bg-slate-950/70"
                      }`}
                    >
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt,.xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-white mb-1">
                        {uploadedFileName ? (
                          <span className="text-amber-300">File Selected: {uploadedFileName}</span>
                        ) : (
                          <span>Drop 1,000-Student CSV / Excel / TXT File Here</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Drag and drop your spreadsheet or <strong className="text-amber-400 underline">click to browse computer</strong>. Supports multi-class rosters.
                      </p>
                    </div>

                    {/* Sample Template & Format Card */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-white font-bold text-xs mb-1">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          <span>Need the Excel / CSV Format?</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Download a pre-formatted template with 15 example students across multiple classes.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={downloadSampleCsv}
                        className="w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>📥 Download Sample CSV Template</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual Paste Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <span>Or Paste Rows Directly (Clipboard / WhatsApp / Excel):</span>
                      </label>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {pasteRawText && (
                          <button
                            type="button"
                            onClick={() => {
                              setPasteRawText("");
                              setUploadedFileName(null);
                              setUploadedPasteAdmNos(new Set());
                              setPreviewPage(1);
                              setBatchFeedback(null);
                            }}
                            className="text-red-400 hover:text-red-300 underline"
                          >
                            Clear Text
                          </button>
                        )}
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {parsedPasteRows.length} total rows parsed ({parsedPasteRows.filter((r) => r.isValid).length} valid)
                        </span>
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      value={pasteRawText}
                      onChange={(e) => {
                        setPasteRawText(e.target.value);
                        setPasteCurrentChunkIndex(0);
                        setUploadedPasteAdmNos(new Set());
                        setPreviewPage(1);
                        setBatchFeedback(null);
                      }}
                      placeholder={`Admission No, Student Name, Class, Average Score, Total Score, Decision\nGFMS/2024/001, Adaobi Okonkwo, JSS 1 Diamond, 84.5, 845, PROMOTED\nGFMS/2024/002, Chinedu Eze, JSS 2 Diamond, 72.0, 720, PROMOTED\nGFMS/2024/003, Fatima Bello, SS 1, 91.0, 910, PROMOTED`}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Multi-Class Breakdown Bar */}
                  {detectedClassesMap.size > 0 && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>Detected Classes ({detectedClassesMap.size}):</span>
                      </span>
                      {Array.from(detectedClassesMap.entries()).map(([cls, cnt]) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setPasteClassFilter(pasteClassFilter === cls ? "ALL" : cls);
                            setPreviewPage(1);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 border ${
                            pasteClassFilter === cls
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                              : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <span>{cls}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                            pasteClassFilter === cls ? "bg-slate-950 text-amber-300" : "bg-slate-800 text-slate-400"
                          }`}>
                            {cnt}
                          </span>
                        </button>
                      ))}
                      {pasteClassFilter !== "ALL" && (
                        <button
                          type="button"
                          onClick={() => {
                            setPasteClassFilter("ALL");
                            setPreviewPage(1);
                          }}
                          className="text-[10px] text-amber-400 underline hover:text-amber-300 ml-1"
                        >
                          Show All Classes
                        </button>
                      )}
                    </div>
                  )}

                  {/* Chunk Configuration & Animated Progress Card */}
                  {parsedPasteRows.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-300">Chunk Size:</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[25, 50, 100, 250, -1].map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => {
                                  setPasteChunkSize(size);
                                  setPasteCurrentChunkIndex(0);
                                  setPreviewPage(1);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                                  pasteChunkSize === size
                                    ? "bg-amber-500 text-slate-950 font-black shadow"
                                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                                }`}
                              >
                                {size === -1 ? "All at Once" : size === 50 ? "50 (Recommended)" : `${size} / chunk`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Upload Statistics */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">
                            Uploaded:{" "}
                            <strong className="text-emerald-400">
                              {parsedPasteRows.filter((r) => uploadedPasteAdmNos.has(r.admNo)).length}
                            </strong>{" "}
                            / {parsedPasteRows.filter((r) => r.isValid).length}
                          </span>
                        </div>
                      </div>

                      {/* Animated Upload Progress Bar */}
                      {(() => {
                        const validTotal = parsedPasteRows.filter((r) => r.isValid).length;
                        const uploadedCount = parsedPasteRows.filter((r) => uploadedPasteAdmNos.has(r.admNo)).length;
                        const percent = validTotal > 0 ? Math.round((uploadedCount / validTotal) * 100) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-mono">
                                {isBatchProcessing
                                  ? `🚀 Processing... ${uploadProgress ? `(${uploadProgress.current} of ${uploadProgress.total} students)` : ""}`
                                  : percent === 100
                                  ? "✅ 100% Upload Completed"
                                  : "Ready to upload in sequential chunks"}
                              </span>
                              <span className="font-bold text-amber-400 font-mono">{percent}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-400 transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Live Parsed Preview Table with Filters & Pagination */}
                  {parsedPasteRows.length > 0 && (
                    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 space-y-0">
                      {/* Search & Filter Bar */}
                      <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Filter by Name, Adm No, Class..."
                            value={pasteSearchQuery}
                            onChange={(e) => {
                              setPasteSearchQuery(e.target.value);
                              setPreviewPage(1);
                            }}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={pasteStatusFilter}
                            onChange={(e: any) => {
                              setPasteStatusFilter(e.target.value);
                              setPreviewPage(1);
                            }}
                            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                          >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending Only</option>
                            <option value="UPLOADED">Uploaded Only</option>
                          </select>

                          {/* Pagination Controls */}
                          {(() => {
                            const totalPages = Math.ceil(filteredPasteRows.length / 50) || 1;
                            return (
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                <button
                                  type="button"
                                  disabled={previewPage <= 1}
                                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                                  className="p-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[11px]">
                                  {previewPage} / {totalPages}
                                </span>
                                <button
                                  type="button"
                                  disabled={previewPage >= totalPages}
                                  onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                                  className="p-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Paginated Rows Table */}
                      <div className="max-h-[38vh] overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                            <tr>
                              <th className="p-3 w-12 text-center">#</th>
                              <th className="p-3">Admission No</th>
                              <th className="p-3">Student Name</th>
                              <th className="p-3">Class</th>
                              <th className="p-3 text-center">Average %</th>
                              <th className="p-3 text-center">Decision</th>
                              <th className="p-3 text-center">Chunk</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {(() => {
                              const pageSize = 50;
                              const startIndex = (previewPage - 1) * pageSize;
                              const currentSlice = filteredPasteRows.slice(startIndex, startIndex + pageSize);

                              if (currentSlice.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={8} className="p-6 text-center text-slate-500 text-xs">
                                      No students match the current filter.
                                    </td>
                                  </tr>
                                );
                              }

                              return currentSlice.map((r, sliceIdx) => {
                                const realIdx = startIndex + sliceIdx;
                                const isUploaded = uploadedPasteAdmNos.has(r.admNo);
                                const chunkSize = pasteChunkSize === -1 ? parsedPasteRows.length : pasteChunkSize;
                                const chunkIdx = Math.floor(realIdx / chunkSize);
                                const isCurrentChunk = chunkIdx === pasteCurrentChunkIndex;

                                return (
                                  <tr
                                    key={realIdx}
                                    className={`transition ${
                                      isUploaded
                                        ? "bg-emerald-950/20"
                                        : isCurrentChunk
                                        ? "bg-amber-950/20"
                                        : "bg-slate-950"
                                    }`}
                                  >
                                    <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                                      {realIdx + 1}
                                    </td>
                                    <td className="p-3 font-mono font-bold text-yellow-400">
                                      {r.admNo}
                                    </td>
                                    <td className="p-3 font-bold text-white">
                                      {r.studentName}
                                    </td>
                                    <td className="p-3 text-slate-300 font-medium">
                                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                                        {r.className || batchClass}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center font-bold text-emerald-400">
                                      {r.average}%
                                    </td>
                                    <td className="p-3 text-center text-slate-300">
                                      {r.decision}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                          isCurrentChunk
                                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                            : "bg-slate-900 text-slate-400 border border-slate-800"
                                        }`}
                                      >
                                        Chunk {chunkIdx + 1}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      {isUploaded ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded-full">
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span>Uploaded</span>
                                        </span>
                                      ) : isCurrentChunk ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/70 border border-amber-800 px-2 py-0.5 rounded-full">
                                          <span>Ready</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-500">Waiting</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Sticky Bottom Action Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                {smallSmallMode === "roster" ? (
                  <span>
                    Selected: <strong className="text-amber-400">{selectedRosterAdmNos.size}</strong> of{" "}
                    {cohortStudents.length} students in <strong className="text-white">{batchClass}</strong>
                  </span>
                ) : (
                  <span>
                    Parsed:{" "}
                    <strong className="text-emerald-400">
                      {parsedPasteRows.filter((r) => r.isValid).length}
                    </strong>{" "}
                    valid rows ready •{" "}
                    <strong className="text-amber-400">
                      {parsedPasteRows.filter((r) => r.isValid && !uploadedPasteAdmNos.has(r.admNo)).length}
                    </strong>{" "}
                    pending upload
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSmallSmallOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  Close
                </button>

                {smallSmallMode === "roster" ? (
                  <button
                    type="button"
                    disabled={selectedRosterAdmNos.size === 0 || isBatchProcessing}
                    onClick={handleUploadRosterBatch}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-50 active:scale-95"
                  >
                    {isBatchProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-950" />
                    )}
                    <span>
                      {isBatchProcessing
                        ? "Uploading Selected..."
                        : `Upload Selected (${selectedRosterAdmNos.size} Students)`}
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={parsedPasteRows.filter((r) => r.isValid).length === 0 || isBatchProcessing}
                      onClick={() => handleUploadPasteChunk(pasteCurrentChunkIndex)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition disabled:opacity-50 active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Upload Chunk {pasteCurrentChunkIndex + 1} (
                        {pasteChunkSize === -1
                          ? parsedPasteRows.filter((r) => r.isValid).length
                          : Math.min(
                              pasteChunkSize,
                              parsedPasteRows.filter((r) => r.isValid).length -
                                pasteCurrentChunkIndex * pasteChunkSize
                            )}{" "}
                        Students)
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={parsedPasteRows.filter((r) => r.isValid).length === 0 || isBatchProcessing}
                      onClick={handleUploadAllChunksSequentially}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-50 active:scale-95 animate-pulse hover:animate-none"
                      title="Sequentially upload each chunk in background with safe delays between requests"
                    >
                      {isBatchProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-slate-950" />
                      )}
                      <span>
                        {isBatchProcessing
                          ? "Uploading All Chunks..."
                          : `🚀 1-Click Upload All (${parsedPasteRows.filter((r) => r.isValid).length} Students)`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
