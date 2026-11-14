"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  Copy,
  Sliders,
  X,
  Save,
  Clock,
  Lock,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import {
  syncTeacherSubjectScoresAction,
  saveTeacherSubjectDraftAction,
  getTeacherSubjectDraftOrPublishedScoresAction,
  getTeacherUploadedCoursesAction,
  getClassStudentsForDelegationAction,
  fetchCbtExamAttemptsForSubjectAction,
  DelegatedScoreRow,
  TeacherUploadedCourse,
} from "@/app/actions/teacher-scores";
import { STANDARD_CLASSES } from "@/components/admin/TerminalResultPreparationTab";
import { downloadExamScoresPdf } from "@/lib/pdf-score-export";
import { doesStudentMatchClassFilter, parseClassAndArm } from "@/lib/cbt-utils";

const POPULAR_SUBJECTS = [
  "Mathematics",
  "English Studies",
  "Basic Science & Technology",
  "Civic Education",
  "Social Studies",
  "Business Studies",
  "Computer Studies / ICT",
  "Agricultural Science",
  "Christian Religious Knowledge",
  "French Language",
  "Biology",
  "Chemistry",
  "Physics",
  "Economics",
  "Literature in English",
  "Government",
  "Financial Accounting",
  "Commerce",
  "Further Mathematics",
  "Visual Arts / Cultural & Creative Arts",
  "Home Economics / Food & Nutrition",
];

interface Props {
  userRole?: "TEACHER" | "SUPER_ADMIN";
  teacherName?: string;
  teacherEmail?: string;
  defaultClass?: string;
  defaultSubject?: string;
  defaultSession?: string;
  defaultTerm?: string;
  initialStudents?: any[];
  uploadedCourses?: TeacherUploadedCourse[];
  onNavigateToQuestionDesk?: () => void;
  onSyncComplete?: (summary: any) => void;
}

interface EditableScoreRow {
  id: string;
  admNo: string;
  studentName: string;
  arm?: string;
  caTotal: number | string; // 0 - 30
  ca1: number | string;     // 0 - 15
  ca2: number | string;     // 0 - 15
  exam: number | string;    // 0 - 70 ("" when pending exam)
  totalScore: number;
  grade: string;
  remark: string;
  isCustom?: boolean;
}

function calculateGradeAndRemark(total: number): { grade: string; remark: string } {
  if (total >= 75) return { grade: "A", remark: "Distinction" };
  if (total >= 65) return { grade: "B", remark: "Very Good" };
  if (total >= 50) return { grade: "C", remark: "Credit" };
  if (total >= 40) return { grade: "D", remark: "Pass" };
  return { grade: "F", remark: "Fail" };
}

export default function DelegatedSubjectScoreUploader({
  userRole = "TEACHER",
  teacherName = "Subject Teacher",
  teacherEmail,
  defaultClass = "JSS 1 Diamond",
  defaultSubject = "Mathematics",
  defaultSession = "2025/2026",
  defaultTerm = "Third Term",
  initialStudents = [],
  uploadedCourses: initialUploadedCourses,
  onNavigateToQuestionDesk,
  onSyncComplete,
}: Props) {
  const isTeacher = userRole === "TEACHER";

  // Teacher's strictly owned/uploaded courses
  const [teacherCourses, setTeacherCourses] = useState<TeacherUploadedCourse[]>(
    initialUploadedCourses || []
  );
  const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(
    isTeacher && (!initialUploadedCourses || initialUploadedCourses.length === 0)
  );

  const [selectedClass, setSelectedClass] = useState<string>(
    initialUploadedCourses && initialUploadedCourses.length > 0
      ? initialUploadedCourses[0].targetClass
      : defaultClass
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialUploadedCourses && initialUploadedCourses.length > 0
      ? initialUploadedCourses[0].subject
      : defaultSubject
  );
  const [customSubject, setCustomSubject] = useState<string>("");
  const [session, setSession] = useState<string>(defaultSession);
  const [term, setTerm] = useState<string>(defaultTerm);

  useEffect(() => {
    if (defaultSession) setSession(defaultSession);
  }, [defaultSession]);

  useEffect(() => {
    if (defaultTerm) setTerm(defaultTerm);
  }, [defaultTerm]);

  // CA Entry Mode: "split" (1st CA 15 + 2nd CA 15 - default) vs "total" (Single CA Total out of 30 Marks)
  const [caEntryMode, setCaEntryMode] = useState<"total" | "split">("split");

  const [inputMode, setInputMode] = useState<"grid" | "paste">("grid");
  const [pastedText, setPastedText] = useState<string>("");
  const [rows, setRows] = useState<EditableScoreRow[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(false);

  // Draft & Publish Status
  const [loadedRecordStatus, setLoadedRecordStatus] = useState<
    "NONE" | "CA_DRAFT_PENDING_EXAM" | "DRAFT_PENDING_ADMIN" | "DRAFT_COMPLETE" | "PUBLISHED"
  >("NONE");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);

  const [syncStatus, setSyncStatus] = useState<{
    type: "idle" | "draft_saved" | "success" | "error";
    message?: string;
    count?: number;
    pendingExamCount?: number;
    classAverage?: number;
  }>({ type: "idle" });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedArmFilter, setSelectedArmFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  const effectiveSubject =
    !isTeacher && selectedSubject === "CUSTOM" && customSubject.trim()
      ? customSubject.trim()
      : selectedSubject;

  // Fetch or sync teacher's uploaded courses when in TEACHER mode
  useEffect(() => {
    if (!isTeacher) return;

    if (initialUploadedCourses && initialUploadedCourses.length > 0) {
      setTeacherCourses(initialUploadedCourses);
      const currentValid = initialUploadedCourses.some(
        (c) =>
          c.subject.trim().toLowerCase() === selectedSubject.trim().toLowerCase() &&
          c.targetClass.trim().toLowerCase() === selectedClass.trim().toLowerCase()
      );
      if (!currentValid) {
        setSelectedSubject(initialUploadedCourses[0].subject);
        setSelectedClass(initialUploadedCourses[0].targetClass);
      }
      setIsLoadingCourses(false);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await getTeacherUploadedCoursesAction(teacherEmail);
        if (!cancelled && res.success) {
          // Merge with initialUploadedCourses if any
          const mergedMap = new Map<string, TeacherUploadedCourse>();
          for (const c of [...res.courses, ...(initialUploadedCourses || [])]) {
            const k = `${c.subject.trim().toLowerCase()}::${c.targetClass.trim().toLowerCase()}`;
            if (!mergedMap.has(k)) {
              mergedMap.set(k, c);
            }
          }
          const finalCourses = Array.from(mergedMap.values());
          setTeacherCourses(finalCourses);
          if (finalCourses.length > 0) {
            const matchesCurrent = finalCourses.some(
              (c) =>
                c.subject.trim().toLowerCase() === selectedSubject.trim().toLowerCase() &&
                c.targetClass.trim().toLowerCase() === selectedClass.trim().toLowerCase()
            );
            if (!matchesCurrent) {
              setSelectedSubject(finalCourses[0].subject);
              setSelectedClass(finalCourses[0].targetClass);
            }
          }
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setIsLoadingCourses(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isTeacher, teacherEmail, initialUploadedCourses]);

  // CBT Score Auto-Import State
  const [isCbtImportModalOpen, setIsCbtImportModalOpen] = useState<boolean>(false);
  const [cbtExams, setCbtExams] = useState<any[]>([]);
  const [cbtAttempts, setCbtAttempts] = useState<any[]>([]);
  const [selectedCbtExamId, setSelectedCbtExamId] = useState<number | null>(null);
  const [cbtTargetColumn, setCbtTargetColumn] = useState<
    "exam_scaled_70" | "exam_direct" | "ca_total_scaled_30" | "ca1_scaled_15" | "ca2_scaled_15"
  >("exam_scaled_70");
  const [isLoadingCbt, setIsLoadingCbt] = useState<boolean>(false);
  const [cbtImportFeedback, setCbtImportFeedback] = useState<string | null>(null);

  // Open CBT import dialog and fetch matching exams
  const handleOpenCbtImport = async () => {
    setIsCbtImportModalOpen(true);
    setIsLoadingCbt(true);
    setCbtImportFeedback(null);
    try {
      const res = await fetchCbtExamAttemptsForSubjectAction({
        className: selectedClass,
        subjectName: effectiveSubject,
      });
      if (res.success) {
        setCbtExams(res.exams);
        setCbtAttempts(res.attempts);
        if (res.exams.length > 0) {
          setSelectedCbtExamId(res.exams[0].id);
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingCbt(false);
    }
  };

  // Apply selected CBT scores to the current roster
  const handleApplyCbtScores = () => {
    if (!selectedCbtExamId) return;
    const matchingAttempts = cbtAttempts.filter((a) => a.examId === selectedCbtExamId);
    if (matchingAttempts.length === 0) {
      alert("No completed student attempts found for this exam.");
      return;
    }

    const attemptMap = new Map<string, number>();
    matchingAttempts.forEach((a) => {
      attemptMap.set(a.admNo.toUpperCase(), a.totalScore);
    });

    let appliedCount = 0;
    setRows((prev) => {
      return prev.map((row) => {
        const cbtScore = attemptMap.get(row.admNo.toUpperCase());
        if (cbtScore === undefined) return row;

        let newCaTotal = row.caTotal;
        let newCa1 = row.ca1;
        let newCa2 = row.ca2;
        let newExam = row.exam;

        if (cbtTargetColumn === "exam_scaled_70") {
          newExam = Math.max(0, Math.min(70, Math.round((cbtScore / 100) * 70)));
        } else if (cbtTargetColumn === "exam_direct") {
          newExam = Math.max(0, Math.min(70, Math.round(cbtScore)));
        } else if (cbtTargetColumn === "ca_total_scaled_30") {
          const scaledCa = Math.max(0, Math.min(30, Math.round((cbtScore / 100) * 30)));
          newCaTotal = scaledCa;
          newCa1 = Math.min(15, scaledCa);
          newCa2 = Math.max(0, Math.min(15, scaledCa - 15));
        } else if (cbtTargetColumn === "ca1_scaled_15") {
          newCa1 = Math.max(0, Math.min(15, Math.round((cbtScore / 100) * 15)));
          const c2Val = typeof newCa2 === "number" ? newCa2 : Number(newCa2) || 0;
          newCaTotal = newCa1 + c2Val;
        } else if (cbtTargetColumn === "ca2_scaled_15") {
          newCa2 = Math.max(0, Math.min(15, Math.round((cbtScore / 100) * 15)));
          const c1Val = typeof newCa1 === "number" ? newCa1 : Number(newCa1) || 0;
          newCaTotal = c1Val + newCa2;
        }

        const caTotNum =
          newCaTotal !== ""
            ? Number(newCaTotal) || 0
            : (Number(newCa1) || 0) + (Number(newCa2) || 0);
        const exNum = newExam !== "" ? Number(newExam) || 0 : 0;
        const total = caTotNum + exNum;
        const { grade, remark } = calculateGradeAndRemark(total);

        appliedCount++;
        return {
          ...row,
          caTotal: newCaTotal !== "" ? caTotNum : "",
          ca1: newCa1,
          ca2: newCa2,
          exam: newExam,
          totalScore: total,
          grade,
          remark,
        };
      });
    });

    setIsCbtImportModalOpen(false);
    setCbtImportFeedback(
      `Successfully pulled CBT scores for ${appliedCount} student(s)! Combined with your CA scores automatically.`
    );
  };

  // Load class student roster + any saved CA Draft or Published scores for (className, subjectName, session, term)
  const loadClassStudentsAndScores = useCallback(
    async (targetClass: string, targetSubject: string, targetSession: string, targetTerm: string) => {
      if (!targetClass || !targetSubject) return;
      setIsLoadingStudents(true);
      setSyncStatus({ type: "idle" });

      try {
        // 1. Fetch class students (stream-aware matching)
        const parsedTarget = parseClassAndArm(targetClass);
        let matched = initialStudents.filter((s) =>
          doesStudentMatchClassFilter(s.currentClass || s.className || "", s.arm, targetClass)
        );

        // Graceful fallback if a stream-specific class is selected and no students have that stream tagged yet
        if (matched.length === 0 && parsedTarget.arm && parsedTarget.baseLevel) {
          matched = initialStudents.filter((s) => {
            const p = parseClassAndArm(s.currentClass || s.className || "", s.arm);
            return p.baseLevel === parsedTarget.baseLevel && !p.arm;
          });
        }

        if (matched.length === 0) {
          const res = await getClassStudentsForDelegationAction(targetClass);
          if (res.success && res.students.length > 0) {
            matched = res.students;
          }
        }

        // 2. Fetch saved CA Draft or Published scores from server
        const savedRes = await getTeacherSubjectDraftOrPublishedScoresAction({
          className: targetClass,
          subjectName: targetSubject,
          session: targetSession,
          term: targetTerm,
        });

        const savedMap = new Map<string, DelegatedScoreRow>();
        if (savedRes.success && savedRes.hasDraft && savedRes.scores.length > 0) {
          setLoadedRecordStatus(savedRes.status || "CA_DRAFT_PENDING_EXAM");
          setLastSavedAt(savedRes.updatedAt || null);
          for (const s of savedRes.scores) {
            savedMap.set(s.admNo.trim().toUpperCase(), s);
          }
        } else {
          setLoadedRecordStatus("NONE");
          setLastSavedAt(null);
        }

        const baseRows: EditableScoreRow[] =
          matched.length > 0
            ? matched.map((s, idx) => {
                const admNo = (
                  s.admNo ||
                  s.admissionNumber ||
                  `GFMS/2025/${String(idx + 1).padStart(3, "0")}`
                )
                  .trim()
                  .toUpperCase();
                const name = (
                  s.fullName ||
                  s.studentName ||
                  `${s.surname || ""} ${s.firstName || ""}`
                ).trim();
                const resolvedArm =
                  parseClassAndArm(s.currentClass || s.className || "", s.arm).arm ||
                  parsedTarget.arm ||
                  undefined;
                return {
                  id: `row_${admNo}_${idx}`,
                  admNo,
                  studentName: name || `Student ${idx + 1}`,
                  arm: resolvedArm,
                  caTotal: "",
                  ca1: "",
                  ca2: "",
                  exam: "",
                  totalScore: 0,
                  grade: "-",
                  remark: "-",
                };
              })
            : [
                {
                  id: "1",
                  admNo: "GFMS/2025/001",
                  studentName: "Adebayo Samuel",
                  caTotal: "",
                  ca1: "",
                  ca2: "",
                  exam: "",
                  totalScore: 0,
                  grade: "-",
                  remark: "-",
                },
                {
                  id: "2",
                  admNo: "GFMS/2025/002",
                  studentName: "Chukwuma David",
                  caTotal: "",
                  ca1: "",
                  ca2: "",
                  exam: "",
                  totalScore: 0,
                  grade: "-",
                  remark: "-",
                },
                {
                  id: "3",
                  admNo: "GFMS/2025/003",
                  studentName: "Ibrahim Fatima",
                  caTotal: "",
                  ca1: "",
                  ca2: "",
                  exam: "",
                  totalScore: 0,
                  grade: "-",
                  remark: "-",
                },
                {
                  id: "4",
                  admNo: "GFMS/2025/004",
                  studentName: "Okonkwo Praise",
                  caTotal: "",
                  ca1: "",
                  ca2: "",
                  exam: "",
                  totalScore: 0,
                  grade: "-",
                  remark: "-",
                },
                {
                  id: "5",
                  admNo: "GFMS/2025/005",
                  studentName: "Williams Victoria",
                  caTotal: "",
                  ca1: "",
                  ca2: "",
                  exam: "",
                  totalScore: 0,
                  grade: "-",
                  remark: "-",
                },
              ];

        // 3. Merge saved draft / published scores into the roster
        if (savedMap.size > 0) {
          const seenAdmNos = new Set<string>();
          const merged = baseRows.map((row) => {
            const key = row.admNo.toUpperCase();
            const saved = savedMap.get(key);
            if (!saved) return row;
            seenAdmNos.add(key);

            const ca1Num = Number(saved.ca1) || 0;
            const ca2Num = Number(saved.ca2) || 0;
            const caTotNum =
              saved.caTotal !== undefined ? Number(saved.caTotal) : ca1Num + ca2Num;
            const isPendingExam =
              Boolean(saved.isExamPending) ||
              saved.exam === null ||
              saved.exam === undefined;
            const examVal: number | string = isPendingExam ? "" : Number(saved.exam) || 0;
            const total = caTotNum + (typeof examVal === "number" ? examVal : 0);
            const { grade, remark } = calculateGradeAndRemark(total);

            return {
              ...row,
              studentName: saved.studentName || row.studentName,
              caTotal: caTotNum,
              ca1: ca1Num,
              ca2: ca2Num,
              exam: examVal,
              totalScore: total,
              grade,
              remark,
            };
          });

          // Append any custom students that were saved in the draft
          savedMap.forEach((saved, key) => {
            if (!seenAdmNos.has(key)) {
              const ca1Num = Number(saved.ca1) || 0;
              const ca2Num = Number(saved.ca2) || 0;
              const caTotNum =
                saved.caTotal !== undefined ? Number(saved.caTotal) : ca1Num + ca2Num;
              const isPendingExam =
                Boolean(saved.isExamPending) ||
                saved.exam === null ||
                saved.exam === undefined;
              const examVal: number | string = isPendingExam ? "" : Number(saved.exam) || 0;
              const total = caTotNum + (typeof examVal === "number" ? examVal : 0);
              const { grade, remark } = calculateGradeAndRemark(total);

              merged.push({
                id: `saved_${key}`,
                admNo: key,
                studentName: saved.studentName || `Student (${key})`,
                caTotal: caTotNum,
                ca1: ca1Num,
                ca2: ca2Num,
                exam: examVal,
                totalScore: total,
                grade,
                remark,
                isCustom: true,
              });
            }
          });

          setRows(merged);
        } else {
          setRows(baseRows);
        }
      } catch {
        // Ignored
      } finally {
        setIsLoadingStudents(false);
      }
    },
    [initialStudents]
  );

  useEffect(() => {
    if (isTeacher && teacherCourses.length === 0 && !isLoadingCourses) {
      return;
    }
    loadClassStudentsAndScores(selectedClass, effectiveSubject, session, term);
  }, [selectedClass, effectiveSubject, session, term, isTeacher, teacherCourses.length, isLoadingCourses, loadClassStudentsAndScores]);

  // Update a single row's score (supports Single CA Total (0-30), Split CA1 (0-15) / CA2 (0-15), and Exam (0-70))
  const handleScoreChange = (
    index: number,
    field: "caTotal" | "ca1" | "ca2" | "exam",
    val: string
  ) => {
    setRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      let numVal: number | string = val.trim() === "" ? "" : Number(val);
      if (typeof numVal === "number" && !isNaN(numVal)) {
        if (field === "caTotal") numVal = Math.max(0, Math.min(30, numVal));
        if (field === "ca1") numVal = Math.max(0, Math.min(15, numVal));
        if (field === "ca2") numVal = Math.max(0, Math.min(15, numVal));
        if (field === "exam") numVal = Math.max(0, Math.min(70, numVal));
      }

      if (field === "caTotal") {
        target.caTotal = numVal;
        if (numVal === "") {
          target.ca1 = "";
          target.ca2 = "";
        } else {
          const tot = Number(numVal) || 0;
          target.ca1 = Math.min(15, tot);
          target.ca2 = Math.max(0, Math.min(15, tot - 15));
        }
      } else if (field === "ca1" || field === "ca2") {
        target[field] = numVal;
        const hasCa1 = target.ca1 !== "";
        const hasCa2 = target.ca2 !== "";
        if (!hasCa1 && !hasCa2) {
          target.caTotal = "";
        } else {
          const c1 = typeof target.ca1 === "number" ? target.ca1 : Number(target.ca1) || 0;
          const c2 = typeof target.ca2 === "number" ? target.ca2 : Number(target.ca2) || 0;
          target.caTotal = Math.min(30, c1 + c2);
        }
      } else {
        target.exam = numVal;
      }

      const caTot =
        target.caTotal !== ""
          ? Number(target.caTotal) || 0
          : (Number(target.ca1) || 0) + (Number(target.ca2) || 0);
      const ex = target.exam !== "" ? Number(target.exam) || 0 : 0;
      const hasAnyScore =
        target.caTotal !== "" || target.ca1 !== "" || target.ca2 !== "" || target.exam !== "";

      if (hasAnyScore) {
        target.totalScore = caTot + ex;
        const { grade, remark } = calculateGradeAndRemark(target.totalScore);
        target.grade = grade;
        target.remark = remark;
      } else {
        target.totalScore = 0;
        target.grade = "-";
        target.remark = "-";
      }

      updated[index] = target;
      return updated;
    });
  };

  // Add new student row
  const handleAddRow = () => {
    const nextIdx = rows.length + 1;
    const newRow: EditableScoreRow = {
      id: `new_${Date.now()}`,
      admNo: `GFMS/2025/${String(nextIdx).padStart(3, "0")}`,
      studentName: "",
      caTotal: "",
      ca1: "",
      ca2: "",
      exam: "",
      totalScore: 0,
      grade: "-",
      remark: "-",
      isCustom: true,
    };
    setRows((prev) => [...prev, newRow]);
  };

  // Remove a row
  const handleRemoveRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Prefill realistic demo CA scores (pending exam) or full scores
  const handlePrefillDemoCaOnly = () => {
    setRows((prev) =>
      prev.map((r, i) => {
        const caTot = Math.min(30, 18 + ((i * 3) % 11));
        const c1 = Math.min(15, Math.ceil(caTot / 2));
        const c2 = Math.min(15, caTot - c1);
        const ex = r.exam !== "" ? Number(r.exam) || 0 : 0;
        const total = caTot + ex;
        const { grade, remark } = calculateGradeAndRemark(total);
        return {
          ...r,
          caTotal: caTot,
          ca1: c1,
          ca2: c2,
          totalScore: total,
          grade,
          remark,
        };
      })
    );
  };

  // Clear all scores
  const handleClearScores = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        caTotal: "",
        ca1: "",
        ca2: "",
        exam: "",
        totalScore: 0,
        grade: "-",
        remark: "-",
      }))
    );
  };

  // Download A4 PDF Score Sheet
  const handleDownloadPdfScores = () => {
    downloadExamScoresPdf({
      examTitle: `${term} (${session}) Assessment`,
      subject: effectiveSubject,
      targetClass: selectedClass,
      rows: rows.map((r) => ({
        studentFullName: r.studentName,
        studentAdmNo: r.admNo,
        studentClass: selectedClass,
        objectiveScore:
          r.caTotal !== ""
            ? Number(r.caTotal) || 0
            : (Number(r.ca1) || 0) + (Number(r.ca2) || 0),
        theoryScore: r.exam !== "" ? Number(r.exam) : null,
        totalScore: r.totalScore || 0,
      })),
      mode: "full",
      examinerName: teacherName,
      customColumnLabels: {
        obj: "CA TOTAL (30)",
        theory: "EXAM (70)",
        total: "TOTAL",
      },
    });
  };

  // Export selected CBT exam OBJ scores as PDF from the CBT Import modal
  const handleExportSelectedCbtPdf = () => {
    if (!selectedCbtExamId) return;
    const selectedExam = cbtExams.find((e) => e.id === selectedCbtExamId);
    const matchingAttempts = cbtAttempts.filter((a) => a.examId === selectedCbtExamId);
    downloadExamScoresPdf({
      examTitle: selectedExam?.title || "CBT Examination",
      subject: selectedExam?.subject || effectiveSubject,
      targetClass: selectedExam?.targetClass || selectedClass,
      rows: matchingAttempts.map((a) => ({
        studentFullName: a.studentName,
        studentAdmNo: a.admNo,
        studentClass: selectedExam?.targetClass || selectedClass,
        objectiveScore: a.objectiveScore,
        theoryScore: a.theoryScore,
        totalScore: a.totalScore,
      })),
      mode: "obj_only",
      examinerName: teacherName,
    });
  };

  // Download prefilled CSV Template
  const handleDownloadCsvTemplate = () => {
    const headers =
      caEntryMode === "total"
        ? "RegNumber,StudentName,CA_Total_Max30,Exam_Max70_Optional,Total_Max100"
        : "RegNumber,StudentName,CA1_Max15,CA2_Max15,Exam_Max70_Optional,Total_Max100";

    const dataLines = rows.map((r) => {
      const caTot = r.caTotal !== "" ? r.caTotal : "";
      const c1 = r.ca1 !== "" ? r.ca1 : "";
      const c2 = r.ca2 !== "" ? r.ca2 : "";
      const ex = r.exam !== "" ? r.exam : "";
      const tot = r.totalScore > 0 ? r.totalScore : "";
      return caEntryMode === "total"
        ? `"${r.admNo}","${r.studentName.replace(/"/g, '""')}",${caTot},${ex},${tot}`
        : `"${r.admNo}","${r.studentName.replace(/"/g, '""')}",${c1},${c2},${ex},${tot}`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...dataLines].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const cleanClass = selectedClass.replace(/[^a-zA-Z0-9]/g, "_");
    const cleanSub = effectiveSubject.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GFMS_${cleanClass}_${cleanSub}_Scores_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy template text to clipboard
  const handleCopyClipboard = () => {
    const header =
      caEntryMode === "total"
        ? "RegNumber\tStudentName\tCA_Total_Max30\tExam_Max70\n"
        : "RegNumber\tStudentName\tCA1\tCA2\tExam\n";
    const text = rows
      .map((r) =>
        caEntryMode === "total"
          ? `${r.admNo}\t${r.studentName}\t${r.caTotal}\t${r.exam}`
          : `${r.admNo}\t${r.studentName}\t${r.ca1}\t${r.ca2}\t${r.exam}`
      )
      .join("\n");
    navigator.clipboard.writeText(header + text);
    alert("Template copied to clipboard! You can paste it directly into Excel.");
  };

  // Parse pasted Excel or CSV rows (supports CA-only rows, CA_Total + Exam rows, or CA1 + CA2 + Exam rows)
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const updatedRows = [...rows];
    let matchedCount = 0;

    for (const line of lines) {
      const parts = line.includes("\t")
        ? line.split("\t").map((p) => p.trim())
        : line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));

      if (parts.length < 2) continue;

      if (parts[0].toLowerCase().includes("reg") || parts[0].toLowerCase().includes("adm")) {
        continue;
      }

      const admNo = parts[0].toUpperCase();
      let caTotal = 0;
      let ca1 = 0;
      let ca2 = 0;
      let exam: number | string = "";
      let studentName = "";

      if (parts.length === 2) {
        // [admNo, caTotal] -> CA-only paste!
        caTotal = Math.max(0, Math.min(30, Number(parts[1]) || 0));
        ca1 = Math.min(15, Math.ceil(caTotal / 2));
        ca2 = Math.min(15, caTotal - ca1);
        exam = "";
      } else if (parts.length === 3) {
        // [admNo, name, caTotal] OR [admNo, caTotal, exam]
        if (isNaN(Number(parts[1]))) {
          studentName = parts[1];
          caTotal = Math.max(0, Math.min(30, Number(parts[2]) || 0));
          ca1 = Math.min(15, Math.ceil(caTotal / 2));
          ca2 = Math.min(15, caTotal - ca1);
          exam = "";
        } else {
          caTotal = Math.max(0, Math.min(30, Number(parts[1]) || 0));
          ca1 = Math.min(15, Math.ceil(caTotal / 2));
          ca2 = Math.min(15, caTotal - ca1);
          exam = parts[2] === "" ? "" : Math.max(0, Math.min(70, Number(parts[2]) || 0));
        }
      } else if (parts.length === 4) {
        // [admNo, name, caTotal, exam] OR [admNo, ca1, ca2, exam]
        if (isNaN(Number(parts[1]))) {
          studentName = parts[1];
          caTotal = Math.max(0, Math.min(30, Number(parts[2]) || 0));
          ca1 = Math.min(15, Math.ceil(caTotal / 2));
          ca2 = Math.min(15, caTotal - ca1);
          exam = parts[3] === "" ? "" : Math.max(0, Math.min(70, Number(parts[3]) || 0));
        } else {
          ca1 = Math.max(0, Math.min(15, Number(parts[1]) || 0));
          ca2 = Math.max(0, Math.min(15, Number(parts[2]) || 0));
          caTotal = ca1 + ca2;
          exam = parts[3] === "" ? "" : Math.max(0, Math.min(70, Number(parts[3]) || 0));
        }
      } else if (parts.length >= 5) {
        // [admNo, name, ca1, ca2, exam, ...]
        studentName = parts[1];
        ca1 = Math.max(0, Math.min(15, Number(parts[2]) || 0));
        ca2 = Math.max(0, Math.min(15, Number(parts[3]) || 0));
        caTotal = ca1 + ca2;
        exam = parts[4] === "" ? "" : Math.max(0, Math.min(70, Number(parts[4]) || 0));
      }

      const exNum = typeof exam === "number" ? exam : 0;
      const total = caTotal + exNum;
      const { grade, remark } = calculateGradeAndRemark(total);

      const targetIdx = updatedRows.findIndex((r) => r.admNo.toUpperCase() === admNo);
      if (targetIdx >= 0) {
        updatedRows[targetIdx] = {
          ...updatedRows[targetIdx],
          studentName: studentName || updatedRows[targetIdx].studentName,
          caTotal,
          ca1,
          ca2,
          exam: exam !== "" ? exam : updatedRows[targetIdx].exam,
          totalScore:
            caTotal +
            (exam !== ""
              ? Number(exam)
              : Number(updatedRows[targetIdx].exam) || 0),
          grade,
          remark,
        };
        matchedCount++;
      } else {
        updatedRows.push({
          id: `pasted_${admNo}_${Date.now()}`,
          admNo,
          studentName: studentName || `Student (${admNo})`,
          caTotal,
          ca1,
          ca2,
          exam,
          totalScore: total,
          grade,
          remark,
          isCustom: true,
        });
        matchedCount++;
      }
    }

    setRows(updatedRows);
    setInputMode("grid");
    setPastedText("");
    alert(`Successfully parsed and loaded scores for ${matchedCount} student(s)!`);
  };

  // Helper to build DelegatedScoreRow[] from current grid rows
  const buildScorePayloadRows = (): DelegatedScoreRow[] => {
    return rows
      .filter((r) => r.caTotal !== "" || r.ca1 !== "" || r.ca2 !== "" || r.exam !== "")
      .map((r) => {
        const caTot =
          r.caTotal !== ""
            ? Math.max(0, Math.min(30, Number(r.caTotal) || 0))
            : Math.max(0, Math.min(30, (Number(r.ca1) || 0) + (Number(r.ca2) || 0)));
        const c1 = r.ca1 !== "" ? Number(r.ca1) || 0 : Math.min(15, Math.ceil(caTot / 2));
        const c2 = r.ca2 !== "" ? Number(r.ca2) || 0 : Math.min(15, caTot - c1);
        const isPendingExam = r.exam === "" || r.exam === null || r.exam === undefined;

        return {
          admNo: r.admNo.trim().toUpperCase(),
          studentName: r.studentName.trim(),
          caTotal: caTot,
          ca1: c1,
          ca2: c2,
          exam: isPendingExam ? null : Number(r.exam) || 0,
          isExamPending: isPendingExam,
          totalScore: r.totalScore,
          grade: r.grade,
          remark: r.remark,
        };
      });
  };

  // Action 1: Save CA / Scores as Draft (Pending Exam Total Score)
  const handleSaveAsDraft = async () => {
    const scoresToSave = buildScorePayloadRows();
    if (scoresToSave.length === 0) {
      alert("Please enter at least one student's CA score before saving a draft.");
      return;
    }

    setIsSavingDraft(true);
    setSyncStatus({ type: "idle" });

    try {
      const res = await saveTeacherSubjectDraftAction({
        className: selectedClass,
        subjectName: effectiveSubject,
        session,
        term,
        teacherName,
        teacherEmail,
        scores: scoresToSave,
      });

      if (res.success) {
        setLoadedRecordStatus(
          res.pendingExamCount > 0 ? "CA_DRAFT_PENDING_EXAM" : "DRAFT_PENDING_ADMIN"
        );
        setLastSavedAt(res.updatedAt || new Date().toISOString());
        setSyncStatus({
          type: "draft_saved",
          message: res.message,
          count: res.savedCount,
          pendingExamCount: res.pendingExamCount,
        });
        if (onSyncComplete) onSyncComplete(res);
      } else {
        setSyncStatus({
          type: "error",
          message: res.error || "Failed to save CA score draft.",
        });
      }
    } catch (err: any) {
      setSyncStatus({
        type: "error",
        message: err?.message || "Failed to save CA score draft.",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Action 2: Submit Course Scores (For Teachers: Saves as Complete Draft Pending Admin Finalization; For Admin: Publishes)
  const handleSyncToTerminalResults = () => {
    const scoresToSubmit = buildScorePayloadRows();

    if (scoresToSubmit.length === 0) {
      alert("Please enter at least one score (1st CA, 2nd CA, or Exam) before submitting!");
      return;
    }

    const pendingExamRows = scoresToSubmit.filter((r) => r.isExamPending);
    if (!isTeacher && pendingExamRows.length > 0) {
      const proceed = window.confirm(
        `${pendingExamRows.length} student(s) currently have only CA scores entered (their Exam score is still blank/pending).\n\n` +
          `• Click CANCEL if you want to use "Save as Draft (Pending Exam)" and add Exam scores later.\n` +
          `• Click OK if you want to publish these scores to Master Report Cards right now with Exam = 0.`
      );
      if (!proceed) return;
    }

    setSyncStatus({ type: "idle" });

    startTransition(async () => {
      const res = await syncTeacherSubjectScoresAction({
        className: selectedClass,
        subjectName: effectiveSubject,
        session,
        term,
        teacherName,
        teacherEmail,
        publishImmediately: !isTeacher,
        scores: scoresToSubmit,
      });

      if (res.success) {
        setLoadedRecordStatus(res.isDraftPendingAdmin ? "DRAFT_PENDING_ADMIN" : "PUBLISHED");
        setLastSavedAt(new Date().toISOString());
        setSyncStatus({
          type: res.isDraftPendingAdmin ? "draft_saved" : "success",
          message: res.message,
          count: res.updatedCount,
          classAverage: res.classAverage,
        });
        if (onSyncComplete) onSyncComplete(res);
      } else {
        setSyncStatus({
          type: "error",
          message: res.error || "Failed to synchronize scores.",
        });
      }
    });
  };

  // Distinct streams/arms present in the current class roster
  const availableArmsInRoster = Array.from(
    new Set(rows.map((r) => (r.arm || "").trim()).filter(Boolean))
  );

  // Filtered rows for search and stream/arm
  const filteredRows = rows.filter((r) => {
    if (selectedArmFilter !== "ALL") {
      if ((r.arm || "").toLowerCase() !== selectedArmFilter.toLowerCase()) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.admNo.toLowerCase().includes(q) ||
      r.studentName.toLowerCase().includes(q) ||
      (r.arm || "").toLowerCase().includes(q)
    );
  });

  // Calculate live stats
  const scoredRows = rows.filter(
    (r) => r.caTotal !== "" || r.ca1 !== "" || r.ca2 !== "" || r.exam !== ""
  );
  const scoredCount = scoredRows.length;
  const caDraftOnlyCount = scoredRows.filter((r) => r.exam === "").length;
  const completedExamCount = scoredRows.filter((r) => r.exam !== "").length;
  const totalMarksSum = rows.reduce((sum, r) => sum + (r.totalScore || 0), 0);
  const liveAverage = scoredCount > 0 ? (totalMarksSum / scoredCount).toFixed(1) : "0.0";

  // Empty state if a Teacher has NOT uploaded any course questions yet
  if (isTeacher && !isLoadingCourses && teacherCourses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950 mb-2">
            <Lock className="w-3 h-3" />
            <span>Strict Course Ownership Policy</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            CA &amp; Exam Score Uploader (Course-Verified)
          </h2>
          <p className="text-xs text-slate-200 max-w-2xl mt-1 leading-relaxed">
            To keep institutional results clean and accurate, teachers can only input CA Total scores (30 Marks) and Exam scores (70 Marks) for the specific courses they uploaded.
          </p>
        </div>

        <div className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            No Uploaded Courses Found Under Your Profile Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            You have not uploaded any course question papers yet. Once you upload a course (Subject &amp; Class) in the <strong>Question Upload Desk</strong>, that course will automatically unlock here so you can input and save your <strong>CA Total Scores as a Draft</strong> pending the terminal exam.
          </p>
          {onNavigateToQuestionDesk && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToQuestionDesk}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95"
              >
                <span>Go to Question Upload Desk</span>
                <ArrowRight className="w-4 h-4 text-yellow-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3.5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950">
              <Sparkles className="w-3 h-3" />
              <span>
                {isTeacher
                  ? "Verified Course CA & Exam Uploader"
                  : "Delegated Subject Score Uploader"}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
              1st CA, 2nd CA &amp; Examination Course Score Upload
            </h2>
            <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
              {isTeacher
                ? "Select from the courses you uploaded, enter 1st CA (15), 2nd CA (15), and Exam (70) scores. All teacher submissions remain in Draft pending Super Admin final finishing."
                : "Upload 1st CA (15), 2nd CA (15), and Exam (70) scores by Student Reg Number as Draft or publish directly to report cards."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdfScores}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm border border-emerald-400/30"
              title="Export A4 PDF Score Sheet with Student Name and Scores"
            >
              <Download className="w-3.5 h-3.5 text-yellow-300" />
              <span className="sm:hidden">Export PDF</span>
              <span className="hidden sm:inline">Export Scores PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition active:scale-95 border border-white/20"
              title="Download pre-filled CSV template for this course"
            >
              <Download className="w-3.5 h-3.5 text-yellow-400" />
              <span className="sm:hidden">Template CSV</span>
              <span className="hidden sm:inline">Download Excel/CSV Template</span>
            </button>
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-black transition active:scale-95 shadow-sm"
              title="Copy empty table format for Excel"
            >
              <Copy className="w-3.5 h-3.5 text-slate-950" />
              <span className="sm:hidden">Copy Table</span>
              <span className="hidden sm:inline">Copy Table Format</span>
            </button>
          </div>
        </div>

        {/* Breakdown & Workflow Indicator Badges */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-2 pt-3 sm:pt-4 text-[10px] sm:text-[11px] text-slate-300 border-t border-white/10 mt-3 sm:mt-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
              <strong className="text-yellow-400">1st CA:</strong> 15 Marks
            </div>
            <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
              <strong className="text-yellow-400">2nd CA:</strong> 15 Marks (CA Total = 30)
            </div>
            <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
              <strong className="text-amber-300">Exam:</strong> 70 Marks
            </div>
            <div className="bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-400/30 text-emerald-200">
              <strong className="text-emerald-300">Workflow:</strong> Saved as Draft &rarr; Admin Final Finishing
            </div>
          </div>

          {/* Toggle Split 1st CA(15)+2nd CA(15) vs Single CA Total (30) */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/15 self-end">
            <button
              type="button"
              onClick={() => setCaEntryMode("split")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                caEntryMode === "split"
                  ? "bg-yellow-400 text-slate-950 shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              1st CA (15) + 2nd CA (15)
            </button>
            <button
              type="button"
              onClick={() => setCaEntryMode("total")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                caEntryMode === "total"
                  ? "bg-yellow-400 text-slate-950 shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Combined CA Total (30)
            </button>
          </div>
        </div>
      </div>

      {/* Course Selection & Term Configuration Controls */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-4">
        {/* Prominent Term Category Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-blue-950/5 border border-blue-900/15">
          <div className="space-y-0.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
              <span>Academic Term Category</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Active: {term} ({session})
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Scores uploaded under <strong>{term}</strong> are stored in their own term category and will never delete or overwrite other terms in the session.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
            {(["First Term", "Second Term", "Third Term"] as const).map((tItem) => {
              const active = term === tItem;
              return (
                <button
                  key={tItem}
                  type="button"
                  onClick={() => setTerm(tItem)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                    active
                      ? "bg-blue-900 text-yellow-300 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tItem}
                </button>
              );
            })}
          </div>
        </div>

        {isTeacher ? (
          /* TEACHER VIEW: Strict Uploaded Courses Selector Only (Not Random / All) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Select Your Uploaded Course (Subject &amp; Class)</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {teacherCourses.length} Uploaded Course{teacherCourses.length === 1 ? "" : "s"}
                </span>
              </label>
              <select
                value={`${selectedSubject}::${selectedClass}`}
                onChange={(e) => {
                  const [sub, cls] = e.target.value.split("::");
                  if (sub && cls) {
                    setSelectedSubject(sub);
                    setSelectedClass(cls);
                  }
                }}
                className="w-full text-xs font-black bg-white border-2 border-emerald-600/40 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
              >
                {teacherCourses.map((course) => (
                  <option key={course.key} value={`${course.subject}::${course.targetClass}`}>
                    {course.subject} — {course.targetClass} (
                    {course.source === "CBT_EXAM" ? "CBT Exam Uploaded" : "Question Paper Uploaded"}
                    )
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Only courses you uploaded in the Question Desk appear here. Random or unassigned courses are blocked.
              </p>
            </div>

            {/* Session */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
              >
                <option value="2025/2026">2025/2026 Session</option>
                <option value="2024/2025">2024/2025 Session</option>
              </select>
            </div>

            {/* Term */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
              >
                <option value="Third Term">Third Term (Promotional)</option>
                <option value="Second Term">Second Term</option>
                <option value="First Term">First Term</option>
              </select>
            </div>
          </div>
        ) : (
          /* SUPER ADMIN VIEW: Full Class & Subject Selection */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
              >
                {STANDARD_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
                <option value="Basic 1">Basic 1</option>
                <option value="Basic 2">Basic 2</option>
                <option value="Basic 3">Basic 3</option>
                <option value="Basic 4">Basic 4</option>
                <option value="Basic 5">Basic 5</option>
                <option value="Basic 6">Basic 6</option>
                <option value="Nursery 1">Nursery 1</option>
                <option value="Nursery 2">Nursery 2</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Subject <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setCustomSubject("");
                }}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
              >
                {defaultSubject && (
                  <option value={defaultSubject}>★ {defaultSubject}</option>
                )}
                {POPULAR_SUBJECTS.filter((sub) => sub !== defaultSubject).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
                <option value="CUSTOM">-- Type Custom Subject --</option>
              </select>
              {selectedSubject === "CUSTOM" && (
                <input
                  type="text"
                  placeholder="Type Subject Name..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="mt-1.5 w-full text-xs bg-white border border-blue-400 rounded-lg px-2.5 py-1.5 text-slate-900"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
              >
                <option value="2025/2026">2025/2026 Session</option>
                <option value="2024/2025">2024/2025 Session</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
              >
                <option value="Third Term">Third Term (Promotional)</option>
                <option value="Second Term">Second Term</option>
                <option value="First Term">First Term</option>
              </select>
            </div>
          </div>
        )}

        {/* Saved Draft / Published Status Indicator Bar */}
        {loadedRecordStatus !== "NONE" && (
          <div
            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
              loadedRecordStatus === "CA_DRAFT_PENDING_EXAM"
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : loadedRecordStatus === "DRAFT_COMPLETE" || loadedRecordStatus === "DRAFT_PENDING_ADMIN"
                ? "bg-indigo-50 border-indigo-300 text-indigo-950"
                : "bg-emerald-50 border-emerald-300 text-emerald-950"
            }`}
          >
            <div className="flex items-center gap-2">
              {loadedRecordStatus === "CA_DRAFT_PENDING_EXAM" ? (
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              ) : loadedRecordStatus === "DRAFT_PENDING_ADMIN" || loadedRecordStatus === "DRAFT_COMPLETE" ? (
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <span className="font-black">
                  {loadedRecordStatus === "CA_DRAFT_PENDING_EXAM"
                    ? "1st CA / 2nd CA Draft Loaded (Pending Exam Score)"
                    : loadedRecordStatus === "DRAFT_PENDING_ADMIN"
                    ? "Course Draft Submitted — Pending Admin Final Finishing"
                    : loadedRecordStatus === "DRAFT_COMPLETE"
                    ? "Complete Score Draft Loaded (1st CA + 2nd CA + Exam)"
                    : "Finalized & Published on Student Report Cards"}
                </span>
                <span className="block sm:inline sm:ml-2 text-[11px] opacity-85">
                  {loadedRecordStatus === "CA_DRAFT_PENDING_EXAM"
                    ? "Your saved 1st CA and 2nd CA scores are restored below. Add or pull Exam scores (70 Marks) anytime."
                    : loadedRecordStatus === "DRAFT_PENDING_ADMIN"
                    ? "Your 1st CA, 2nd CA, and Exam scores are compiled into student draft report cards awaiting Super Admin finalization."
                    : loadedRecordStatus === "DRAFT_COMPLETE"
                    ? "All 1st CA, 2nd CA, and Exam marks are in draft pending Admin finalization."
                    : "These scores have been finalized and published by the Admin."}
                </span>
              </div>
            </div>
            {lastSavedAt && (
              <span className="text-[10px] font-mono font-bold opacity-75 shrink-0">
                Updated: {new Date(lastSavedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Input Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setInputMode("grid")}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                inputMode === "grid"
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="sm:hidden">Grid ({rows.length})</span>
              <span className="hidden sm:inline">Spreadsheet Grid ({rows.length} Students)</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                inputMode === "paste"
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="sm:hidden">Paste Excel</span>
              <span className="hidden sm:inline">Fast Paste from Excel / CSV</span>
            </button>
          </div>

          {/* Quick Action Helpers */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              onClick={() =>
                loadClassStudentsAndScores(selectedClass, effectiveSubject, session, term)
              }
              disabled={isLoadingStudents}
              className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition"
              title="Reload student registry and saved draft for this course"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingStudents ? "animate-spin" : ""}`} />
              <span>Reload Roster</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCbtImport}
              className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-300 hover:border-indigo-400 rounded-lg text-xs font-bold text-indigo-900 flex items-center justify-center gap-1.5 transition shadow-xs"
              title="Automatically pull completed CBT exam scores directly into this roster"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
              <span className="sm:hidden">⚡ CBT Import</span>
              <span className="hidden sm:inline">⚡ Pull Exam from CBT</span>
            </button>
            <button
              type="button"
              onClick={handlePrefillDemoCaOnly}
              className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg text-xs font-semibold text-amber-900 flex items-center gap-1 transition"
              title="Prefill sample CA scores out of 30 for testing"
            >
              <Sparkles className="w-3 h-3 text-amber-700" />
              <span>Sample CA (30)</span>
            </button>
            <button
              type="button"
              onClick={handleClearScores}
              className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-1 transition"
              title="Clear all entered scores in the grid"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Draft Saved Feedback Banner */}
      {syncStatus.type === "draft_saved" && (
        <div className="m-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
          <Save className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">1st CA / 2nd CA / Exam Progress Saved as Draft!</h4>
            <p className="text-xs text-amber-900 leading-relaxed">{syncStatus.message}</p>
            <p className="text-[11px] text-amber-800 font-semibold">
              Your scores are safely compiled in draft pending Admin final finishing. You can update 1st CA, 2nd CA, or Exam anytime before Admin finalization.
            </p>
          </div>
        </div>
      )}

      {/* Final Submit / Publish Feedback Banner */}
      {syncStatus.type === "success" && (
        <div className="m-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">
              {isTeacher
                ? "Course Scores Compiled into Student Drafts (Pending Admin Finalizing)!"
                : "Final Scores Published to Terminal Results!"}
            </h4>
            <p className="text-xs text-emerald-800 leading-relaxed">{syncStatus.message}</p>
            {syncStatus.classAverage !== undefined && (
              <div className="text-xs font-bold text-emerald-950 pt-1">
                Updated Cohort Class Average: {syncStatus.classAverage}%
              </div>
            )}
          </div>
        </div>
      )}

      {syncStatus.type === "error" && (
        <div className="m-4 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Could Not Save / Synchronize Scores</h4>
            <p className="text-xs text-rose-800 leading-relaxed">{syncStatus.message}</p>
          </div>
        </div>
      )}

      {/* CBT Import Feedback Banner */}
      {cbtImportFeedback && (
        <div className="m-4 p-4 rounded-xl bg-indigo-50 border border-indigo-300 text-indigo-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold">{cbtImportFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setCbtImportFeedback(null)}
            className="text-indigo-600 hover:text-indigo-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode 1: Interactive Spreadsheet Grid */}
      {inputMode === "grid" && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Search, Stream Filter & Stats Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative max-w-xs w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, Reg No or Stream..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
                />
              </div>

              {availableArmsInRoster.length > 0 && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedArmFilter("ALL")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                      selectedArmFilter === "ALL"
                        ? "bg-blue-900 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Streams ({rows.length})
                  </button>
                  {availableArmsInRoster.map((arm) => {
                    const count = rows.filter(
                      (r) => (r.arm || "").toLowerCase() === arm.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={arm}
                        type="button"
                        onClick={() => setSelectedArmFilter(arm)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                          selectedArmFilter.toLowerCase() === arm.toLowerCase()
                            ? "bg-indigo-700 text-white shadow-2xs"
                            : "text-slate-700 hover:bg-white"
                        }`}
                      >
                        {arm} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                Students: <strong className="text-slate-900">{rows.length}</strong>
              </span>
              <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg">
                CA Draft (Pending Exam): <strong className="text-amber-950">{caDraftOnlyCount}</strong>
              </span>
              <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-lg">
                CA + Exam Complete: <strong className="text-blue-950">{completedExamCount}</strong>
              </span>
              <span className="bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg">
                Average: <strong className="text-emerald-950">{liveAverage}%</strong>
              </span>
            </div>
          </div>

          {/* Mobile Touch-Friendly Score Cards View (< md) */}
          <div className="md:hidden space-y-3">
            {filteredRows.map((row, index) => {
              const actualIdx = rows.findIndex((r) => r.id === row.id);
              const hasCa = row.caTotal !== "" || row.ca1 !== "" || row.ca2 !== "";
              const hasExam = row.exam !== "";
              const isScored = hasCa || hasExam;

              return (
                <div
                  key={row.id}
                  className="p-3.5 space-y-3 bg-white rounded-xl border border-slate-200 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          #{index + 1}
                        </span>
                        {row.isCustom ? (
                          <input
                            type="text"
                            value={row.admNo}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setRows((prev) => {
                                const u = [...prev];
                                u[actualIdx].admNo = val;
                                return u;
                              });
                            }}
                            placeholder="REG NO"
                            className="text-xs text-slate-900 font-mono font-bold uppercase px-2 py-0.5 bg-slate-50 border border-slate-300 rounded max-w-[130px]"
                          />
                        ) : (
                          <span className="font-mono font-bold text-blue-900 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                            {row.admNo}
                          </span>
                        )}
                        {row.arm && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {row.arm}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 text-xs mt-1 truncate">
                        {row.isCustom ? (
                          <input
                            type="text"
                            placeholder="Student Name..."
                            value={row.studentName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRows((prev) => {
                                const u = [...prev];
                                u[actualIdx].studentName = val;
                                return u;
                              });
                            }}
                            className="w-full text-xs text-slate-900 font-semibold px-2 py-0.5 bg-slate-50 border border-slate-300 rounded mt-0.5"
                          />
                        ) : (
                          row.studentName
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-right">
                      {hasCa && !hasExam ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          CA: {row.caTotal}/30 (Pending Exam)
                        </span>
                      ) : (
                        <span
                          className={`font-black text-xs px-2 py-0.5 rounded-full ${
                            row.totalScore >= 75
                              ? "bg-emerald-100 text-emerald-800"
                              : row.totalScore >= 60
                              ? "bg-blue-100 text-blue-800"
                              : row.totalScore >= 50
                              ? "bg-yellow-100 text-yellow-800"
                              : row.totalScore > 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {isScored ? `${row.totalScore}%` : "0%"}
                        </span>
                      )}
                      {hasExam && row.grade !== "-" && (
                        <span className="font-black text-xs text-slate-700 min-w-[18px] text-center">
                          {row.grade}
                        </span>
                      )}
                      {row.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(actualIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1 active:scale-95"
                          title="Remove Row"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile Score Inputs */}
                  {caEntryMode === "total" ? (
                    <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-blue-900 block mb-1">
                          CA Total (Max 30)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          placeholder="0 - 30"
                          value={row.caTotal}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleScoreChange(actualIdx, "caTotal", e.target.value)}
                          className="w-full text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-sm py-1.5 px-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-amber-900 block mb-1">
                          Exam (70 • Optional)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={70}
                          placeholder="Pending"
                          value={row.exam}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleScoreChange(actualIdx, "exam", e.target.value)}
                          className="w-full text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-sm py-1.5 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-blue-900 block mb-1">
                          1st CA (15)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={15}
                          placeholder="0 - 15"
                          value={row.ca1}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleScoreChange(actualIdx, "ca1", e.target.value)}
                          className="w-full text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-sm py-1.5 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-indigo-900 block mb-1">
                          2nd CA (15)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={15}
                          placeholder="0 - 15"
                          value={row.ca2}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleScoreChange(actualIdx, "ca2", e.target.value)}
                          className="w-full text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-sm py-1.5 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-amber-900 block mb-1">
                          Exam (70)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={70}
                          placeholder="0 - 70"
                          value={row.exam}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleScoreChange(actualIdx, "exam", e.target.value)}
                          className="w-full text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-sm py-1.5 px-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredRows.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                No students found matching your search.
              </div>
            )}
          </div>

          {/* Desktop Table Container (hidden on mobile, visible on >= md) */}
          <div className="hidden md:block border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-300 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-36">Reg Number</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Student Full Name</th>
                  {caEntryMode === "total" ? (
                    <th className="py-2.5 px-3 w-36 text-center bg-blue-50/80 text-blue-950">
                      CA Total Score{" "}
                      <span className="text-[10px] text-blue-700 block">(Max 30 Marks)</span>
                    </th>
                  ) : (
                    <>
                      <th className="py-2.5 px-3 w-28 text-center bg-blue-50/70 text-blue-950">
                        1st CA <span className="text-[10px] text-blue-600 block">(Max 15)</span>
                      </th>
                      <th className="py-2.5 px-3 w-28 text-center bg-indigo-50/70 text-indigo-950">
                        2nd CA <span className="text-[10px] text-indigo-600 block">(Max 15)</span>
                      </th>
                      <th className="py-2.5 px-2 w-24 text-center bg-slate-200/60 text-slate-800">
                        CA Total <span className="text-[10px] text-slate-600 block">(/30)</span>
                      </th>
                    </>
                  )}
                  <th className="py-2.5 px-3 w-36 text-center bg-amber-50/70 text-amber-950">
                    Exam Score{" "}
                    <span className="text-[10px] text-amber-700 block">
                      (Max 70 • Optional)
                    </span>
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center bg-emerald-50 text-emerald-950">
                    Total <span className="text-[10px] text-emerald-700 block">(100%)</span>
                  </th>
                  <th className="py-2.5 px-3 w-36 text-center">Draft / Grade</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredRows.map((row, index) => {
                  const actualIdx = rows.findIndex((r) => r.id === row.id);
                  const hasCa = row.caTotal !== "" || row.ca1 !== "" || row.ca2 !== "";
                  const hasExam = row.exam !== "";
                  const isScored = hasCa || hasExam;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isScored ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-bold text-[11px]">
                        {index + 1}
                      </td>

                      <td className="py-2 px-3">
                        {row.isCustom ? (
                          <input
                            type="text"
                            value={row.admNo}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setRows((prev) => {
                                const u = [...prev];
                                u[actualIdx].admNo = val;
                                return u;
                              });
                            }}
                            className="w-full text-xs text-slate-900 font-mono font-bold uppercase px-2 py-1 bg-white border border-slate-300 rounded"
                          />
                        ) : (
                          <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {row.admNo}
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        {row.isCustom ? (
                          <input
                            type="text"
                            placeholder="Student Name..."
                            value={row.studentName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRows((prev) => {
                                const u = [...prev];
                                u[actualIdx].studentName = val;
                                return u;
                              });
                            }}
                            className="w-full text-xs text-slate-900 font-medium px-2 py-1 bg-white border border-slate-300 rounded"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs">
                              {row.studentName}
                            </span>
                            {row.arm && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                                {row.arm}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* CA Input(s) */}
                      {caEntryMode === "total" ? (
                        <td className="py-1.5 px-2 text-center bg-blue-50/25">
                          <input
                            type="number"
                            min={0}
                            max={30}
                            placeholder="0 - 30"
                            value={row.caTotal}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleScoreChange(actualIdx, "caTotal", e.target.value)
                            }
                            className="w-24 mx-auto text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-xs py-1.5 px-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                          />
                        </td>
                      ) : (
                        <>
                          <td className="py-1.5 px-2 text-center bg-blue-50/20">
                            <input
                              type="number"
                              min={0}
                              max={15}
                              placeholder="0 - 15"
                              value={row.ca1}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                handleScoreChange(actualIdx, "ca1", e.target.value)
                              }
                              className="w-20 mx-auto text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-xs py-1.5 px-1.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono placeholder:text-[10px] placeholder:font-normal"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center bg-indigo-50/20">
                            <input
                              type="number"
                              min={0}
                              max={15}
                              placeholder="0 - 15"
                              value={row.ca2}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) =>
                                handleScoreChange(actualIdx, "ca2", e.target.value)
                              }
                              className="w-20 mx-auto text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-xs py-1.5 px-1.5 bg-white border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none font-mono placeholder:text-[10px] placeholder:font-normal"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center bg-slate-50">
                            <span className="font-mono font-black text-xs text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md">
                              {hasCa ? `${row.caTotal}/30` : "-"}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Exam (Optional for CA Draft) */}
                      <td className="py-1.5 px-2 text-center bg-amber-50/20">
                        <input
                          type="number"
                          min={0}
                          max={70}
                          placeholder="0 - 70"
                          value={row.exam}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleScoreChange(actualIdx, "exam", e.target.value)}
                          className="w-24 mx-auto text-center font-extrabold text-slate-900 placeholder:text-slate-400 text-xs py-1.5 px-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none font-mono placeholder:text-[10px] placeholder:font-normal"
                        />
                      </td>

                      {/* Total */}
                      <td className="py-2 px-3 text-center bg-emerald-50/40">
                        {hasCa && !hasExam ? (
                          <span className="font-black text-[11px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            {row.caTotal} / 30
                          </span>
                        ) : (
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-full ${
                              row.totalScore >= 75
                                ? "bg-emerald-100 text-emerald-800"
                                : row.totalScore >= 60
                                ? "bg-blue-100 text-blue-800"
                                : row.totalScore >= 50
                                ? "bg-yellow-100 text-yellow-800"
                                : row.totalScore > 0
                                ? "bg-rose-100 text-rose-800"
                                : "text-slate-400"
                            }`}
                          >
                            {isScored ? `${row.totalScore}%` : "-"}
                          </span>
                        )}
                      </td>

                      {/* Status / Grade */}
                      <td className="py-2 px-3 text-center">
                        {hasCa && !hasExam ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>CA Draft</span>
                          </span>
                        ) : isScored ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`font-black text-xs ${
                                row.grade === "A"
                                  ? "text-emerald-700"
                                  : row.grade === "B"
                                  ? "text-blue-700"
                                  : row.grade === "C"
                                  ? "text-yellow-700"
                                  : row.grade === "D"
                                  ? "text-amber-700"
                                  : row.grade === "F"
                                  ? "text-rose-700"
                                  : "text-slate-300"
                              }`}
                            >
                              {row.grade} ({row.remark})
                            </span>
                            {loadedRecordStatus !== "PUBLISHED" && (
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                                Draft • Pending Admin
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center">
                        {row.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(actualIdx)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      No students found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student by Reg Number</span>
            </button>

            <span className="text-[11px] text-slate-500">
              Tip: Add 1st CA, 2nd CA, and Exam based on your uploaded course — all saved in draft pending Admin final finishing.
            </span>
          </div>
        </div>
      )}

      {/* Mode 2: Fast Paste from Excel / CSV */}
      {inputMode === "paste" && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-700" />
              <span>Paste Directly from Excel or CSV Spreadsheet</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Copy columns from Excel and paste here. Supports CA-only drafts or full CA + Exam rows:
              <br />
              &bull; CA Draft Only:{" "}
              <strong className="text-slate-800 font-mono">
                RegNumber &bull; StudentName &bull; CA_Total_Max30
              </strong>
              <br />
              &bull; CA Total + Exam:{" "}
              <strong className="text-slate-800 font-mono">
                RegNumber &bull; StudentName &bull; CA_Total_Max30 &bull; Exam_Max70
              </strong>
              <br />
              &bull; Split CA1 + CA2 + Exam:{" "}
              <strong className="text-slate-800 font-mono">
                RegNumber &bull; StudentName &bull; CA1 &bull; CA2 &bull; Exam
              </strong>
            </p>
          </div>

          <textarea
            rows={10}
            placeholder={`GFMS/2025/001\tAdebayo Samuel\t25\t54\nGFMS/2025/002\tChukwuma David\t22\t48\nGFMS/2025/003\tIbrahim Fatima\t27\t`}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setInputMode("grid")}
              className="text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Cancel &amp; Back to Grid
            </button>

            <button
              type="button"
              onClick={handleParsePastedText}
              disabled={!pastedText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Parse &amp; Load into Score Grid</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Footer: Save CA Draft vs Publish Final Scores */}
      <div className="p-3.5 sm:p-5 bg-slate-100 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="text-xs text-slate-600 space-y-0.5">
          <div>
            Course: <strong className="text-blue-950 font-bold">{effectiveSubject}</strong> &bull;{" "}
            Class: <strong className="text-blue-950 font-bold">{selectedClass}</strong> &bull; (
            {scoredCount} scored of {rows.length})
          </div>
          {caDraftOnlyCount > 0 && (
            <div className="text-[11px] text-amber-800 font-semibold">
              {caDraftOnlyCount} student(s) have CA scores entered pending Exam Total Score.
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Button 1: Save CA / Course Progress as Draft */}
          <button
            type="button"
            onClick={handleSaveAsDraft}
            disabled={isSavingDraft || isPending || scoredCount === 0}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {isSavingDraft ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Saving Draft...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-slate-950" />
                <span>
                  {isTeacher
                    ? "Save Progress (1st CA / 2nd CA Draft)"
                    : "Save as Draft (Pending Finalizing)"}
                </span>
              </>
            )}
          </button>

          {/* Button 2: Submit Course Draft (Teachers) or Finalize & Publish (Admin) */}
          <button
            type="button"
            onClick={handleSyncToTerminalResults}
            disabled={isPending || isSavingDraft || scoredCount === 0}
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 hover:from-blue-800 hover:to-slate-800 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-yellow-400" />
                <span>
                  {isTeacher ? "Compiling Draft for Admin..." : "Publishing & Ranking Class..."}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                <span className="sm:hidden">
                  {isTeacher ? "Submit Course Draft" : "Publish Final Scores"}
                </span>
                <span className="hidden sm:inline">
                  {isTeacher
                    ? "Submit Course Draft (1st CA + 2nd CA + Exam)"
                    : "Finalize & Publish Scores to Report Cards"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CBT Import Modal */}
      {isCbtImportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setIsCbtImportModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-blue-950 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Auto-Import Scores from CBT Examination
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Target: {selectedClass} &bull; {effectiveSubject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCbtImportModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {isLoadingCbt ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs font-semibold">Scanning CBT examination attempts...</p>
                </div>
              ) : cbtExams.length === 0 ? (
                <div className="py-6 text-center text-slate-500 space-y-2 bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <AlertCircle className="w-6 h-6 mx-auto text-amber-500" />
                  <p className="text-xs font-bold text-slate-800">
                    No CBT Examinations Found for {selectedClass} &bull; {effectiveSubject}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Students have not submitted CBT attempts for this course yet. You can save your CA scores as a draft now and pull CBT Exam scores once the exam is taken!
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Select CBT Exam Paper ({cbtExams.length} found)
                    </label>
                    <select
                      value={selectedCbtExamId || ""}
                      onChange={(e) => setSelectedCbtExamId(Number(e.target.value))}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      {cbtExams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.title} &bull; {ex.targetClass} ({ex.attemptsCount} student submissions)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Import Destination &amp; Score Scaling
                    </label>
                    <select
                      value={cbtTargetColumn}
                      onChange={(e: any) => setCbtTargetColumn(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="exam_scaled_70">
                        Terminal Exam Column &bull; Proportional Scale to 70 Marks (e.g. 100% → 70)
                      </option>
                      <option value="exam_direct">
                        Terminal Exam Column &bull; Direct Raw Mark (Max 70)
                      </option>
                      <option value="ca_total_scaled_30">
                        CA Total Column &bull; Proportional Scale to 30 Marks (e.g. 100% → 30)
                      </option>
                      <option value="ca1_scaled_15">
                        CA 1 Column &bull; Proportional Scale to 15 Marks (e.g. 100% → 15)
                      </option>
                      <option value="ca2_scaled_15">
                        CA 2 Column &bull; Proportional Scale to 15 Marks (e.g. 100% → 15)
                      </option>
                    </select>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-700" />
                      <span>Merges Automatically with Saved CA Drafts</span>
                    </div>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      Matches {cbtAttempts.filter((a) => a.examId === selectedCbtExamId).length}{" "}
                      student attempts by Registration Number and adds them to your saved CA Total scores automatically.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsCbtImportModalOpen(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {cbtExams.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportSelectedCbtPdf}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5"
                    title="Download A4 PDF Score Sheet with Student Name and OBJ Scores"
                  >
                    <Download className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Export OBJ PDF</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApplyCbtScores}
                  disabled={isLoadingCbt || cbtExams.length === 0}
                  className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Apply CBT Scores to Roster</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
