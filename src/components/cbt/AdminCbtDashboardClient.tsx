"use client";

import React, { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  PlusCircle,
  FileQuestion,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  Save,
  Trash2,
  Layers,
  ChevronRight,
  ChevronDown,
  LogOut,
  Sparkles,
  Lock,
  Search,
  ExternalLink,
  Edit3,
  GraduationCap,
  CreditCard,
  Inbox,
  Users,
  UserCheck,
  X,
  Upload,
  ImageIcon,
  ZoomIn,
  LayoutGrid,
  RotateCcw,
  Archive,
  Award,
  Download,
} from "lucide-react";
import { AdminSession, AttemptGradingRow } from "@/types/cbt";
import { downloadExamScoresPdf } from "@/lib/pdf-score-export";
import { adminLoginAction, adminLogoutAction } from "@/app/actions/cbt-auth";
import {
  createExamAction,
  toggleExamStatusAction,
  addObjectiveQuestionAction,
  addTheoryQuestionAction,
  deleteQuestionAction,
  deleteExamAction,
  clearAllExamQuestionsAction,
  getAdminExamWithQuestionsAction,
  getExamGradingAttemptsAction,
  saveTheoryScoreAction,
  clearExamAttemptsAction,
  deleteExamAttemptAction,
  updateObjectiveQuestionAction,
  updateTheoryQuestionAction,
  restoreArchivedExamAction,
  updateExamAction,
  updateExamDurationAction,
  reopenStudentExamAttemptAction,
  forceSubmitInterruptedAttemptAction,
} from "@/app/actions/cbt-admin";
import TeacherSubmissionsTab from "@/components/admin/TeacherSubmissionsTab";
import TerminalResultPreparationTab from "@/components/admin/TerminalResultPreparationTab";
import ScratchCardGeneratorTab from "@/components/admin/ScratchCardGeneratorTab";
import StudentRegistryTab from "@/components/admin/StudentRegistryTab";
import StaffManagementTab from "@/components/admin/StaffManagementTab";
import { MathToolbar, FloatingMathButton } from "./MathToolbar";
import { FormattedMathText } from "./FormattedMathText";

type AdminTabId =
  | "exams"
  | "questions"
  | "submissions"
  | "students"
  | "staff"
  | "grading"
  | "results"
  | "cards";

interface AdminTabDef {
  id: AdminTabId;
  label: string;
  short: string;
  icon: React.ElementType;
  count?: number;
  badge?: string;
  badgeClass?: string;
  activeClass?: string;
  iconClass?: string;
  superOnly?: boolean;
}

// Tabs pinned to the mobile bottom bar; everything else lives in the "More" sheet.
const MOBILE_PRIMARY_TABS: AdminTabId[] = ["exams", "questions", "submissions", "grading"];

interface ExamCountItem {
  id: number;
  title: string;
  subject: string;
  targetClass: string;
  examDate: Date;
  durationMinutes: number;
  isActive: boolean;
  isArchived?: boolean;
  hasTheory: boolean;
  _count: {
    objectiveQuestions: number;
    theoryQuestions: number;
    attempts: number;
  };
}

interface Props {
  admin: AdminSession | null;
  initialExams: ExamCountItem[];
  initialSubmissions?: any[];
  initialResults?: any[];
  initialCardsData?: any;
  initialStudents?: any[];
  initialTeachers?: any[];
}

export default function AdminCbtDashboardClient({
  admin,
  initialExams,
  initialSubmissions = [],
  initialResults = [],
  initialCardsData = { cards: [], stats: null },
  initialStudents = [],
  initialTeachers = [],
}: Props) {
  const router = useRouter();

  // Active Admin Tab: "exams" | "questions" | "submissions" | "students" | "staff" | "grading" | "results" | "cards"
  const [activeTab, setActiveTab] = useState<AdminTabId>("exams");
  // Mobile "More" workspace sheet (bottom navigation overflow)
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (!isMoreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMoreOpen]);
  const [exams, setExams] = useState<ExamCountItem[]>(initialExams);

  useEffect(() => {
    setExams(initialExams);
  }, [initialExams]);

  useEffect(() => {
    if (admin?.role === "TEACHER" && ["students", "staff", "results", "cards"].includes(activeTab)) {
      setActiveTab("exams");
    }
  }, [admin?.role, activeTab]);

  // Prefill target when navigating from Student Registry to Result Preparation
  const [prefillResultTarget, setPrefillResultTarget] = useState<{
    admNo: string;
    studentName?: string;
    className?: string;
    arm?: string;
    gender?: string;
    token?: number;
  } | null>(null);

  const handlePrepareResultFromRegistry = (student: {
    admNo: string;
    fullName?: string;
    currentClass?: string;
    arm?: string;
    gender?: string;
  }) => {
    setPrefillResultTarget({
      admNo: student.admNo,
      studentName: student.fullName,
      className: student.currentClass,
      arm: student.arm,
      gender: student.gender,
      token: Date.now(),
    });
    selectTab("results");
  };

  // Transitions
  const [isPending, startTransition] = useTransition();

  // --------------------------------------------------------------------------
  // Admin Login State (If not authenticated)
  // --------------------------------------------------------------------------
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await adminLoginAction(formData);
      if (!res.success) {
        setLoginError(res.error || "Login failed.");
      } else {
        window.location.reload();
      }
    });
  };

  const handleAdminLogout = () => {
    startTransition(async () => {
      await adminLogoutAction();
      window.location.reload();
    });
  };

  // --------------------------------------------------------------------------
  // TAB 1: Exam Creator State & Safe Archive Filter
  // --------------------------------------------------------------------------
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [examFormError, setExamFormError] = useState<string | null>(null);
  const [examFilterTab, setExamFilterTab] = useState<"active" | "archived">("active");
  const [editingObjectiveQuestion, setEditingObjectiveQuestion] = useState<any | null>(null);
  const [editingTheoryQuestion, setEditingTheoryQuestion] = useState<any | null>(null);
  const [editingExamForSettings, setEditingExamForSettings] = useState<ExamCountItem | null>(null);
  const [inlineExamDuration, setInlineExamDuration] = useState<string | number>(60);
  const [isSavingExamDuration, setIsSavingExamDuration] = useState<boolean>(false);
  const [editObjectiveImagePreview, setEditObjectiveImagePreview] = useState<string | null>(null);
  const [editTheoryImagePreview, setEditTheoryImagePreview] = useState<string | null>(null);

  const handleCreateExam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setExamFormError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await createExamAction(formData);
        if (!res || !res.success) {
          setExamFormError(res?.error || "Failed to create exam.");
        } else {
          const newExamId = res.examId;
          const newSubject = (formData.get("subject") as string)?.trim() || "";
          const newTitle = (formData.get("title") as string)?.trim() || "";
          const newClass = (formData.get("targetClass") as string)?.trim() || "";
          const newDuration = parseInt((formData.get("durationMinutes") as string) || "60", 10);
          const hasTheory = formData.get("hasTheory") === "true" || formData.get("hasTheory") === "on";
          const isActive = formData.get("isActive") !== "false";

          if (newExamId) {
            const newExamItem: ExamCountItem = {
              id: newExamId,
              title: newTitle,
              subject: newSubject,
              targetClass: newClass,
              examDate: new Date((formData.get("examDate") as string) || Date.now()),
              durationMinutes: newDuration,
              isActive: isActive,
              hasTheory: hasTheory,
              _count: {
                objectiveQuestions: 0,
                theoryQuestions: 0,
                attempts: 0,
              },
            };

            setExams((prev) => [newExamItem, ...prev.filter((ex) => ex.id !== newExamId)]);
            setSelectedExamIdForQuestions(newExamId);
          }

          form.reset();
          setIsCreateExamOpen(false);
          router.refresh();
        }
      } catch (err: any) {
        setExamFormError(err?.message || "Connection error creating exam.");
      }
    });
  };

  const handleToggleStatus = (examId: number, currentStatus: boolean) => {
    startTransition(async () => {
      await toggleExamStatusAction(examId, !currentStatus);
      setExams((prev) =>
        prev.map((ex) => (ex.id === examId ? { ...ex, isActive: !currentStatus } : ex))
      );
    });
  };

  // --------------------------------------------------------------------------
  // TAB 2: Question Uploader State
  // --------------------------------------------------------------------------
  const [selectedExamIdForQuestions, setSelectedExamIdForQuestions] = useState<number>(
    initialExams[0]?.id || 0
  );
  const [questionType, setQuestionType] = useState<"objective" | "theory">("objective");
  const [questionFormError, setQuestionFormError] = useState<string | null>(null);
  const [questionSuccess, setQuestionSuccess] = useState<string | null>(null);
  const [examQuestionsPreview, setExamQuestionsPreview] = useState<any>(null);

  useEffect(() => {
    const currentExam = exams.find((e) => e.id === selectedExamIdForQuestions);
    if (currentExam) {
      setInlineExamDuration(currentExam.durationMinutes || 60);
    }
  }, [selectedExamIdForQuestions, exams]);

  // Question Image Upload & Lightbox States
  const [objectiveImagePreview, setObjectiveImagePreview] = useState<string | null>(null);
  const [theoryImagePreview, setTheoryImagePreview] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [adminObjQuestionText, setAdminObjQuestionText] = useState("");
  const [adminTheoryQuestionText, setAdminTheoryQuestionText] = useState("");
  const [isAdminMathOpen, setIsAdminMathOpen] = useState(false);
  const [adminMathTargetId, setAdminMathTargetId] = useState("admin-objective-question-textarea");

  const handleImageFileSelect = (
    file: File,
    setPreview: (url: string | null) => void
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        setPreview(compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Quick Custom Subject Creator State in Question Uploader
  const [isQuickSubjectModalOpen, setIsQuickSubjectModalOpen] = useState(false);
  const [quickSubjectFormError, setQuickSubjectFormError] = useState<string | null>(null);

  const handleCreateQuickSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuickSubjectFormError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createExamAction(formData);
      if (!res.success) {
        setQuickSubjectFormError(res.error || "Failed to create subject paper.");
      } else if (res.examId) {
        const newExamId = res.examId;
        const newSubject = (formData.get("subject") as string)?.trim();
        const newTitle = (formData.get("title") as string)?.trim();
        const newClass = (formData.get("targetClass") as string)?.trim();
        const newDuration = parseInt((formData.get("durationMinutes") as string) || "60", 10);
        
        const newExamItem: ExamCountItem = {
          id: newExamId,
          title: newTitle,
          subject: newSubject,
          targetClass: newClass,
          examDate: new Date(),
          durationMinutes: newDuration,
          isActive: true,
          hasTheory: true,
          _count: {
            objectiveQuestions: 0,
            theoryQuestions: 0,
            attempts: 0,
          },
        };

        setExams((prev) => [newExamItem, ...prev]);
        setSelectedExamIdForQuestions(newExamId);
        setIsQuickSubjectModalOpen(false);
        form.reset();
        setQuestionSuccess(`Created custom subject "${newSubject}"! You can author questions for it below.`);
      }
    });
  };

  // Load questions for selected exam
  const loadExamQuestions = async (examId: number) => {
    if (!examId) return;
    try {
      const res = await getAdminExamWithQuestionsAction(examId);
      if (res?.success && res?.exam) {
        setExamQuestionsPreview(res.exam);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (selectedExamIdForQuestions) {
      loadExamQuestions(selectedExamIdForQuestions);
    }
  }, [selectedExamIdForQuestions]);

  const handleAddObjective = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuestionFormError(null);
    setQuestionSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("examId", selectedExamIdForQuestions.toString());
    if (objectiveImagePreview) {
      formData.set("imageUrl", objectiveImagePreview);
    }

    startTransition(async () => {
      try {
        const res = await addObjectiveQuestionAction(formData);
        if (!res || !res.success) {
          setQuestionFormError(res?.error || "Failed to save question. Please check server connection.");
        } else {
          setQuestionSuccess("Objective question added successfully!");
          setObjectiveImagePreview(null);
          setAdminObjQuestionText("");
          form.reset();
          loadExamQuestions(selectedExamIdForQuestions);
          setExams((prev) =>
            prev.map((ex) =>
              ex.id === selectedExamIdForQuestions
                ? {
                    ...ex,
                    _count: {
                      ...ex._count,
                      objectiveQuestions: ex._count.objectiveQuestions + 1,
                    },
                  }
                : ex
            )
          );
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Failed to save question due to a connection error.");
      }
    });
  };

  const handleAddTheory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuestionFormError(null);
    setQuestionSuccess(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("examId", selectedExamIdForQuestions.toString());
    if (theoryImagePreview) {
      formData.set("imageUrl", theoryImagePreview);
    }

    startTransition(async () => {
      try {
        const res = await addTheoryQuestionAction(formData);
        if (!res || !res.success) {
          setQuestionFormError(res?.error || "Failed to save theory question. Please check server connection.");
        } else {
          setQuestionSuccess("Theory prompt added successfully!");
          setTheoryImagePreview(null);
          setAdminTheoryQuestionText("");
          form.reset();
          loadExamQuestions(selectedExamIdForQuestions);
          setExams((prev) =>
            prev.map((ex) =>
              ex.id === selectedExamIdForQuestions
                ? {
                    ...ex,
                    _count: {
                      ...ex._count,
                      theoryQuestions: ex._count.theoryQuestions + 1,
                    },
                  }
                : ex
            )
          );
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Failed to save theory question due to a connection error.");
      }
    });
  };

  const handleDeleteQuestion = (type: "objective" | "theory", qId: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    startTransition(async () => {
      await deleteQuestionAction(type, qId);
      loadExamQuestions(selectedExamIdForQuestions);
      setExams((prev) =>
        prev.map((ex) => {
          if (ex.id === selectedExamIdForQuestions) {
            return {
              ...ex,
              _count: {
                ...ex._count,
                objectiveQuestions:
                  type === "objective"
                    ? Math.max(0, ex._count.objectiveQuestions - 1)
                    : ex._count.objectiveQuestions,
                theoryQuestions:
                  type === "theory"
                    ? Math.max(0, ex._count.theoryQuestions - 1)
                    : ex._count.theoryQuestions,
              },
            };
          }
          return ex;
        })
      );
    });
  };

  const handleDeleteExam = (examId: number, examSubject?: string, attemptsCount = 0) => {
    const label = examSubject ? `"${examSubject}"` : "this exam paper";
    const hasAttempts = attemptsCount > 0;
    const confirmMessage = hasAttempts
      ? `⚠️ SAFE REMOVAL NOTICE FOR ${label}:\n\nThis course paper has ${attemptsCount} student submission(s) and written grading(s).\n\nIf you proceed, this course will be SAFELY REMOVED from the active CBT exam dashboard and student portal so students will NOT see it ("Deleted from page"), BUT all student exam attempts, scores, and gradings will remain 100% PRESERVED in the database and report records!\n\nDo you want to safely remove this course from the CBT page?`
      : `Are you sure you want to delete ${label}?\n\nThis will remove the course paper so students will not see it on their CBT portal.`;

    if (!confirm(confirmMessage)) return;

    startTransition(async () => {
      try {
        const res = await deleteExamAction(examId);
        if (!res || !res.success) {
          setQuestionFormError(res?.error || "Failed to remove exam course.");
        } else {
          setExams((prev) =>
            prev.map((ex) => (ex.id === examId ? { ...ex, isArchived: true, isActive: false } : ex))
          );
          setQuestionSuccess(
            res.isArchived
              ? `Examination course ${label} safely removed from the active CBT page. All ${attemptsCount} student grading(s) remain intact and preserved!`
              : `Examination course ${label} deleted successfully!`
          );
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Error removing exam course.");
      }
    });
  };

  const handleRestoreExam = (examId: number, examSubject?: string) => {
    const label = examSubject ? `"${examSubject}"` : "this exam paper";
    startTransition(async () => {
      try {
        const res = await restoreArchivedExamAction(examId);
        if (!res || !res.success) {
          setQuestionFormError(res?.error || "Failed to restore exam course.");
        } else {
          setExams((prev) =>
            prev.map((ex) => (ex.id === examId ? { ...ex, isArchived: false, isActive: true } : ex))
          );
          setQuestionSuccess(`Examination course ${label} restored to active CBT page!`);
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Error restoring exam course.");
      }
    });
  };

  const handlePermanentDeleteExam = (examId: number, examSubject?: string, attemptsCount = 0) => {
    const label = examSubject ? `"${examSubject}"` : "this removed course";
    const confirmMsg =
      attemptsCount > 0
        ? `⚠️ PERMANENT DELETION WARNING FOR ${label}:\n\nThis will PERMANENTLY DELETE this course, all its uploaded questions, AND all ${attemptsCount} recorded student attempt(s)/scores from the database forever.\n\nThis action cannot be undone. Are you sure you want to permanently delete it?`
        : `Are you sure you want to PERMANENTLY DELETE ${label} and all its questions forever? This action cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        const res = await deleteExamAction(examId, true);
        if (!res || !res.success) {
          setQuestionFormError(res?.error || "Failed to permanently delete course.");
        } else {
          setExams((prev) => prev.filter((ex) => ex.id !== examId));
          setQuestionSuccess(`Course ${label} has been permanently deleted from the system.`);
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Error permanently deleting course.");
      }
    });
  };

  const handleStartEditObjective = (q: any) => {
    let opts = ["", "", "", ""];
    try {
      opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    } catch {
      opts = ["", "", "", ""];
    }
    setEditingObjectiveQuestion({
      ...q,
      parsedOptions: opts,
    });
    setEditObjectiveImagePreview(q.imageUrl || null);
  };

  const handleSaveEditObjective = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingObjectiveQuestion) return;
    setQuestionFormError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await updateObjectiveQuestionAction(formData);
        if (!res.success) {
          setQuestionFormError(res.error || "Failed to update objective question.");
        } else {
          setQuestionSuccess("Objective question updated and corrected successfully!");
          setEditingObjectiveQuestion(null);
          setEditObjectiveImagePreview(null);
          loadExamQuestions(selectedExamIdForQuestions);
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Failed to save question changes.");
      }
    });
  };

  const handleStartEditTheory = (tq: any) => {
    setEditingTheoryQuestion(tq);
    setEditTheoryImagePreview(tq.imageUrl || null);
  };

  const handleSaveEditTheory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTheoryQuestion) return;
    setQuestionFormError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await updateTheoryQuestionAction(formData);
        if (!res.success) {
          setQuestionFormError(res.error || "Failed to update theory question.");
        } else {
          setQuestionSuccess("Theory prompt updated and corrected successfully!");
          setEditingTheoryQuestion(null);
          setEditTheoryImagePreview(null);
          loadExamQuestions(selectedExamIdForQuestions);
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Failed to save theory changes.");
      }
    });
  };

  const handleSaveExamDuration = (examId: number, rawDuration: string | number) => {
    const duration = Math.max(1, parseInt(String(rawDuration), 10) || 60);
    if (!examId || isNaN(duration) || duration < 1) return;
    setInlineExamDuration(duration);
    setIsSavingExamDuration(true);
    startTransition(async () => {
      try {
        const res = await updateExamDurationAction(examId, duration);
        if (!res.success) {
          setQuestionFormError(res.error || "Failed to update exam duration.");
        } else {
          const newDuration = res.durationMinutes || duration;
          setExams((prev) =>
            prev.map((e) => (e.id === examId ? { ...e, durationMinutes: newDuration } : e))
          );
          if (examQuestionsPreview && examQuestionsPreview.id === examId) {
            setExamQuestionsPreview((prev: any) => ({ ...prev, durationMinutes: newDuration }));
          }
          setQuestionSuccess(`Exam allocated time updated to ${newDuration} minutes successfully!`);
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Failed to save exam duration.");
      } finally {
        setIsSavingExamDuration(false);
      }
    });
  };

  const handleSaveExamSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExamForSettings) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        const res = await updateExamAction(formData);
        if (!res.success) {
          alert(res.error || "Failed to update examination.");
        } else {
          const updated = res.exam;
          setExams((prev) =>
            prev.map((e) =>
              e.id === updated.id
                ? {
                    ...e,
                    title: updated.title,
                    subject: updated.subject,
                    targetClass: updated.targetClass,
                    durationMinutes: updated.durationMinutes,
                    hasTheory: updated.hasTheory,
                    isActive: updated.isActive,
                  }
                : e
            )
          );
          if (examQuestionsPreview && examQuestionsPreview.id === updated.id) {
            setExamQuestionsPreview((prev: any) => ({
              ...prev,
              title: updated.title,
              subject: updated.subject,
              targetClass: updated.targetClass,
              durationMinutes: updated.durationMinutes,
              hasTheory: updated.hasTheory,
            }));
          }
          setEditingExamForSettings(null);
          setQuestionSuccess(`Exam "${updated.subject}" settings updated successfully!`);
          router.refresh();
        }
      } catch (err: any) {
        alert(err?.message || "Error saving exam settings.");
      }
    });
  };

  const handleClearAllQuestions = (examId: number) => {
    if (
      !confirm(
        "Are you sure you want to CLEAR ALL questions (both Objective and Theory) from this course paper? This will reset all questions for this exam."
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await clearAllExamQuestionsAction(examId);
        if (!res || !res.success) {
          setQuestionFormError(res?.error || "Failed to clear questions.");
        } else {
          setQuestionSuccess("All questions for this course paper have been cleared.");
          loadExamQuestions(examId);
          setExams((prev) =>
            prev.map((ex) =>
              ex.id === examId
                ? {
                    ...ex,
                    _count: {
                      ...ex._count,
                      objectiveQuestions: 0,
                      theoryQuestions: 0,
                    },
                  }
                : ex
            )
          );
          router.refresh();
        }
      } catch (err: any) {
        setQuestionFormError(err?.message || "Error clearing questions.");
      }
    });
  };

  // --------------------------------------------------------------------------
  // TAB 3: Physical Grading Desk State
  // --------------------------------------------------------------------------
  const [selectedExamIdForGrading, setSelectedExamIdForGrading] = useState<number>(
    initialExams[0]?.id || 0
  );
  const [gradingAttempts, setGradingAttempts] = useState<AttemptGradingRow[]>([]);
  const [gradingScores, setGradingScores] = useState<Record<number, string | number>>({});
  const [savingAttemptId, setSavingAttemptId] = useState<number | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<Record<number, boolean>>({});
  const [recoveringAttemptId, setRecoveringAttemptId] = useState<number | null>(null);

  const loadGradingAttempts = async (examId: number) => {
    if (!examId) return;
    const res = await getExamGradingAttemptsAction(examId);
    if (res.success) {
      setGradingAttempts(res.attempts);
      const initialScores: Record<number, string | number> = {};
      res.attempts.forEach((att) => {
        initialScores[att.id] = att.theoryScore ?? 0;
      });
      setGradingScores(initialScores);
    }
  };

  useEffect(() => {
    if (selectedExamIdForGrading) {
      loadGradingAttempts(selectedExamIdForGrading);
    }
  }, [selectedExamIdForGrading]);

  const handleSaveTheoryScore = async (attemptId: number) => {
    const rawVal = gradingScores[attemptId];
    const scoreVal = Math.max(0, parseInt(String(rawVal ?? 0), 10) || 0);
    setGradingScores((prev) => ({ ...prev, [attemptId]: scoreVal }));
    setSavingAttemptId(attemptId);

    const res = await saveTheoryScoreAction(attemptId, scoreVal);
    setSavingAttemptId(null);

    if (res.success && res.updatedAttempt) {
      setGradingAttempts((prev) =>
        prev.map((a) =>
          a.id === attemptId
            ? {
                ...a,
                theoryScore: res.updatedAttempt!.theoryScore,
                totalScore: res.updatedAttempt!.totalScore,
              }
            : a
        )
      );
      setSaveSuccessMsg((prev) => ({ ...prev, [attemptId]: true }));
      setTimeout(() => {
        setSaveSuccessMsg((prev) => ({ ...prev, [attemptId]: false }));
      }, 2500);
    } else {
      alert(res.error || "Failed to update theory score.");
    }
  };

  const handleReopenAttempt = async (attemptId: number, studentName: string) => {
    const minsStr = window.prompt(
      `POWER-OFF / SESSION RECOVERY FOR ${studentName}:\n\nHow many extra minutes should be added to their remaining time so they can log back in and continue from their saved answers?`,
      "15"
    );
    if (minsStr === null) return;
    const extraMins = Math.max(5, parseInt(minsStr, 10) || 15);

    setRecoveringAttemptId(attemptId);
    try {
      const res = await reopenStudentExamAttemptAction(attemptId, extraMins);
      if (res.success) {
        await loadGradingAttempts(selectedExamIdForGrading);
        setGradingFeedback({
          type: "success",
          text: `✓ Session re-opened for ${studentName} (+${extraMins} mins added, all saved answers preserved). They can now log in and continue!`,
        });
        setTimeout(() => setGradingFeedback(null), 5000);
      } else {
        setGradingFeedback({
          type: "error",
          text: res.error || "Failed to re-open student session.",
        });
      }
    } finally {
      setRecoveringAttemptId(null);
    }
  };

  const handleForceSubmitInterrupted = async (attemptId: number, studentName: string, answeredCount = 0) => {
    if (
      !window.confirm(
        `FINALIZE & GRADE SAVED PROGRESS FOR ${studentName}?\n\nThis will mark their interrupted session as Completed and grade all ${answeredCount} auto-saved answer(s) immediately.`
      )
    ) {
      return;
    }

    setRecoveringAttemptId(attemptId);
    try {
      const res = await forceSubmitInterruptedAttemptAction(attemptId);
      if (res.success) {
        await loadGradingAttempts(selectedExamIdForGrading);
        setGradingFeedback({
          type: "success",
          text: `✓ Finalized & graded ${res.answeredCount ?? answeredCount} saved answer(s) for ${studentName} (OBJ Score: ${res.objectiveScore} pts).`,
        });
        setTimeout(() => setGradingFeedback(null), 5000);
      } else {
        setGradingFeedback({
          type: "error",
          text: res.error || "Failed to finalize interrupted attempt.",
        });
      }
    } finally {
      setRecoveringAttemptId(null);
    }
  };

  const [isClearingGrading, setIsClearingGrading] = useState(false);
  const [isClearingId, setIsClearingId] = useState<number | null>(null);
  const [gradingFeedback, setGradingFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exportingPdfExamId, setExportingPdfExamId] = useState<number | null>(null);

  const handleExportGradingPdf = (mode: "obj_only" | "full" = "obj_only") => {
    const currentExam = exams.find((e) => e.id === selectedExamIdForGrading);
    const rows = gradingAttempts.map((att) => {
      const rawTheory = gradingScores[att.id] !== undefined ? gradingScores[att.id] : (att.theoryScore ?? 0);
      const currentTheory = Number(rawTheory) || 0;
      return {
        studentFullName: att.studentFullName,
        studentAdmNo: att.studentAdmNo,
        studentClass: att.studentClass,
        objectiveScore: att.objectiveScore,
        theoryScore: currentTheory,
        totalScore: att.objectiveScore + currentTheory,
        submittedAt: att.submittedAt,
      };
    });

    downloadExamScoresPdf({
      examTitle: currentExam?.title || "CBT Examination",
      subject: currentExam?.subject || "General Subject",
      targetClass: currentExam?.targetClass || "Senior Secondary",
      rows,
      mode,
      examinerName: admin?.fullName || "Super Admin",
    });

    setGradingFeedback({
      type: "success",
      text: `Exported ${rows.length} student ${mode === "obj_only" ? "OBJ" : "Full"} score(s) to PDF for ${currentExam?.subject || "selected exam"}.`,
    });
    setTimeout(() => setGradingFeedback(null), 3500);
  };

  const handleExportExamPdfFromList = async (ex: ExamCountItem, mode: "obj_only" | "full" = "obj_only") => {
    setExportingPdfExamId(ex.id);
    try {
      const res = await getExamGradingAttemptsAction(ex.id);
      if (!res.success) {
        alert(res.error || "Failed to load exam scores for PDF export.");
        return;
      }
      downloadExamScoresPdf({
        examTitle: ex.title,
        subject: ex.subject,
        targetClass: ex.targetClass,
        rows: res.attempts.map((att) => ({
          studentFullName: att.studentFullName,
          studentAdmNo: att.studentAdmNo,
          studentClass: att.studentClass,
          objectiveScore: att.objectiveScore,
          theoryScore: att.theoryScore,
          totalScore: att.totalScore,
          submittedAt: att.submittedAt,
        })),
        mode,
        examinerName: admin?.fullName || "Super Admin",
      });
    } catch (err: any) {
      alert(err?.message || "Failed to export PDF scores.");
    } finally {
      setExportingPdfExamId(null);
    }
  };

  const handleClearAllGradingAttempts = async () => {
    if (!selectedExamIdForGrading) return;
    const currentExam = exams.find((e) => e.id === selectedExamIdForGrading);
    const paperName = currentExam ? `${currentExam.subject} (${currentExam.targetClass})` : "this paper";
    const confirmed = window.confirm(
      `Are you sure you want to clear ALL ${gradingAttempts.length} student submission(s) for ${paperName}?\n\nThis will remove their recorded test attempts so the grading desk is cleared or students can retake.`
    );
    if (!confirmed) return;

    setIsClearingGrading(true);
    const res = await clearExamAttemptsAction(selectedExamIdForGrading);
    setIsClearingGrading(false);

    if (res.success) {
      setGradingAttempts([]);
      setGradingScores({});
      setExams((prev) =>
        prev.map((e) =>
          e.id === selectedExamIdForGrading
            ? { ...e, _count: { ...e._count, attempts: 0 } }
            : e
        )
      );
      setGradingFeedback({
        type: "success",
        text: `Successfully cleared ${res.count || 0} student attempt(s) for ${paperName}.`,
      });
      setTimeout(() => setGradingFeedback(null), 3500);
      router.refresh();
    } else {
      setGradingFeedback({
        type: "error",
        text: res.error || "Failed to clear student attempts.",
      });
      setTimeout(() => setGradingFeedback(null), 4000);
    }
  };

  const handleClearSingleAttempt = async (attemptId: number, studentName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to clear the submitted attempt for ${studentName}?\n\nThis will permanently delete this student's recorded exam attempt.`
    );
    if (!confirmed) return;

    setIsClearingId(attemptId);
    const res = await deleteExamAttemptAction(attemptId);
    setIsClearingId(null);

    if (res.success) {
      setGradingAttempts((prev) => prev.filter((a) => a.id !== attemptId));
      setGradingScores((prev) => {
        const next = { ...prev };
        delete next[attemptId];
        return next;
      });
      setExams((prev) =>
        prev.map((e) =>
          e.id === selectedExamIdForGrading
            ? { ...e, _count: { ...e._count, attempts: Math.max(0, e._count.attempts - 1) } }
            : e
        )
      );
      setGradingFeedback({
        type: "success",
        text: `Cleared attempt for ${studentName}.`,
      });
      setTimeout(() => setGradingFeedback(null), 3000);
      router.refresh();
    } else {
      setGradingFeedback({
        type: "error",
        text: res.error || "Failed to delete attempt.",
      });
      setTimeout(() => setGradingFeedback(null), 4000);
    }
  };

  // --------------------------------------------------------------------------
  // If Not Authenticated as Admin
  // --------------------------------------------------------------------------
  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-blue-900/60 border border-blue-600 text-yellow-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-950">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">
              Super Admin CBT Portal
            </h2>
            <p className="text-xs text-slate-400">
              Great-Favour Montessori School (GFMS) • Examination Desk
            </p>
          </div>

          {loginError && (
            <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Admin Email
              </label>
              <input
                type="email"
                name="email"
                required
                defaultValue="admin@gfms.edu.ng"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                defaultValue="admin123"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-sm text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isPending ? "Authenticating..." : "Enter Admin Portal"}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Main Authenticated Admin View
  // --------------------------------------------------------------------------
  const totalAttemptsCount = exams.reduce((acc, e) => acc + e._count.attempts, 0);
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  const allAdminTabs: AdminTabDef[] = [
    { id: "exams", label: "Exams & Creator", short: "Exams", icon: BookOpen, count: exams.length },
    { id: "questions", label: "Question Uploader", short: "Questions", icon: FileQuestion },
    {
      id: "submissions",
      label: "Teacher Submissions",
      short: "Inbox",
      icon: Inbox,
      count: initialSubmissions.length,
      badgeClass: "bg-yellow-500 text-slate-950 font-black",
    },
    { id: "students", label: "Students & RegNos", short: "Students", icon: Users, count: initialStudents.length, superOnly: true },
    { id: "staff", label: "Staff & Teachers", short: "Staff", icon: UserCheck, count: initialTeachers.length, superOnly: true },
    {
      id: "grading",
      label: "Physical Grading",
      short: "Grading",
      icon: ClipboardList,
      count: totalAttemptsCount,
      activeClass: "bg-yellow-500 text-slate-950 font-black shadow",
      iconClass: "",
      badgeClass: "bg-slate-950 text-white",
    },
    { id: "results", label: "Result Preparation", short: "Results", icon: GraduationCap, count: initialResults.length, superOnly: true },
    {
      id: "cards",
      label: "Scratch Cards",
      short: "Cards",
      icon: CreditCard,
      badge: "3-Check Max",
      badgeClass: "bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold",
      superOnly: true,
    },
  ];
  const adminTabs = allAdminTabs.filter((t) => !t.superOnly || isSuperAdmin);
  const bottomNavTabs = adminTabs.filter((t) => MOBILE_PRIMARY_TABS.includes(t.id));
  const overflowTabs = adminTabs.filter((t) => !MOBILE_PRIMARY_TABS.includes(t.id));
  const activeTabDef = adminTabs.find((t) => t.id === activeTab);
  const isOverflowActive = overflowTabs.some((t) => t.id === activeTab);

  const selectTab = (id: AdminTabId) => {
    setActiveTab(id);
    setIsMoreOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="dash-mobile min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-yellow-500 selection:text-blue-950 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Sticky top chrome: header + desktop tab rail share one sticky wrapper so offsets never drift */}
      <div className="sticky top-0 z-30 no-print">
        {/* Top Super Admin Navbar */}
        <header className="px-2.5 sm:px-8 py-2 sm:py-3.5 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-1.5 sm:gap-3 shadow-md">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white p-0.5 flex items-center justify-center shadow shrink-0 ring-2 ring-yellow-500/30">
              <Image
                src="/assets/images/school-logo.jpg"
                alt="GFMS Logo"
                width={32}
                height={32}
                className="rounded-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="font-black text-xs sm:text-base text-white tracking-tight truncate">
                  <span className="sm:hidden">
                    <span className="xs:hidden">GFMS Admin</span>
                    <span className="hidden xs:inline">GFMS Admin Desk</span>
                  </span>
                  <span className="hidden sm:inline">GFMS CBT Super Admin Desk</span>
                </h1>
                <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0">
                  {admin.role === "SUPER_ADMIN" ? (
                    <>
                      <span className="sm:hidden">Super</span>
                      <span className="hidden sm:inline">{admin.role}</span>
                    </>
                  ) : (
                    admin.role
                  )}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                <span className="md:hidden text-yellow-400/90 font-semibold">
                  {activeTabDef?.label || "Workspace"}
                </span>
                <span className="hidden md:inline">
                  Logged in as <strong className="text-white">{admin.fullName}</strong>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={handleAdminLogout}
              className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl sm:rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition active:scale-95"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-400 sm:text-slate-300" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Desktop / Tablet Tabs Navigation Rail (>= md). Phones use the bottom tab bar. */}
        <div className="hidden md:block bg-slate-950/90 border-b border-slate-800 px-8 py-2 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 pt-0.5 max-w-full scrollbar-none">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const showBadge =
                  !!tab.badge || (tab.count !== undefined && (tab.id !== "submissions" || tab.count > 0));
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                      isActive
                        ? tab.activeClass || "bg-blue-700 text-white shadow"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${tab.iconClass ?? "text-yellow-400"}`} />
                    <span>{tab.label}</span>
                    {showBadge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab.badgeClass || "bg-slate-950/80"}`}>
                        {tab.badge ?? tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-400 font-mono hidden lg:block shrink-0">
              Senior Secondary Engine • SS 1, SS 2, SS 3
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar (< md) */}
      <nav
        aria-label="Admin workspaces"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.7)] pb-safe"
      >
        <div
          className="grid h-16"
          style={{
            gridTemplateColumns: `repeat(${bottomNavTabs.length + (overflowTabs.length > 0 ? 1 : 0)}, minmax(0, 1fr))`,
          }}
        >
          {bottomNavTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const alertCount = tab.id === "submissions" ? tab.count || 0 : 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                  isActive ? "text-yellow-400" : "text-slate-400"
                }`}
              >
                <span
                  className={`absolute top-0 h-0.5 w-8 rounded-full transition-all ${
                    isActive ? "bg-yellow-400 opacity-100" : "opacity-0"
                  }`}
                />
                <span
                  className={`relative flex items-center justify-center w-11 h-7 rounded-full transition ${
                    isActive ? "bg-yellow-500/15" : ""
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {alertCount > 0 && (
                    <span className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-slate-950">
                      {alertCount > 99 ? "99+" : alertCount}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] leading-none ${isActive ? "font-black" : "font-semibold"}`}>
                  {tab.short}
                </span>
              </button>
            );
          })}

          {overflowTabs.length > 0 && (
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isMoreOpen}
              className={`relative flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                isOverflowActive ? "text-yellow-400" : "text-slate-400"
              }`}
            >
              <span
                className={`absolute top-0 h-0.5 w-8 rounded-full transition-all ${
                  isOverflowActive ? "bg-yellow-400 opacity-100" : "opacity-0"
                }`}
              />
              <span
                className={`flex items-center justify-center w-11 h-7 rounded-full transition ${
                  isOverflowActive ? "bg-yellow-500/15" : ""
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </span>
              <span className={`text-[10px] leading-none truncate max-w-full px-1 ${isOverflowActive ? "font-black" : "font-semibold"}`}>
                {isOverflowActive ? activeTabDef?.short : "More"}
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile "More" Workspaces Sheet */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="All admin workspaces">
          <button
            type="button"
            aria-label="Close workspace menu"
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm animate-dash-fade"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="relative w-full max-h-[85dvh] overflow-y-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl animate-sheet-up pb-safe">
            <div className="pt-2.5 pb-1 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-slate-700" />
            </div>
            <div className="px-4 pt-1 pb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-extrabold text-yellow-400">All Workspaces</p>
                <p className="text-base font-black text-white">Jump to any desk</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center active:scale-95"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 px-3 sm:px-4">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border text-left transition active:scale-[0.97] min-w-0 overflow-hidden ${
                      isActive
                        ? "bg-blue-900/50 border-blue-500/70 shadow-lg shadow-blue-950/50"
                        : "bg-slate-950/70 border-slate-800"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? "bg-yellow-400 text-slate-950" : "bg-slate-800 text-yellow-400"
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </span>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="block text-xs font-bold text-white leading-tight truncate">{tab.label}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 truncate">
                        {tab.badge ?? (tab.count !== undefined ? `${tab.count} records` : "Open desk")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="m-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Signed in as</p>
                <p className="text-sm font-bold text-white truncate">{admin.fullName}</p>
              </div>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content Container - Optimized Mobile Padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* ================================================================== */}
        {/* TAB 1: EXAM CREATOR & MANAGER */}
        {/* ================================================================== */}
        {activeTab === "exams" && (
          <div className="space-y-6">
            {/* Header / Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Senior Secondary Examinations
                </h2>
                <p className="text-xs text-slate-400">
                  Configure active tests, duration limits, and target classes.
                </p>
              </div>

              <button
                onClick={() => setIsCreateExamOpen(!isCreateExamOpen)}
                className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-yellow-300" />
                <span>{isCreateExamOpen ? "Close Creator" : "Create New Examination"}</span>
              </button>
            </div>

            {/* Exam Creator Form Modal / Collapsible */}
            {isCreateExamOpen && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Define Examination Paper
                  </h3>
                  <span className="text-xs text-slate-500">All fields required</span>
                </div>

                {examFormError && (
                  <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-3 text-xs text-rose-300">
                    {examFormError}
                  </div>
                )}

                <form onSubmit={handleCreateExam} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      required
                      placeholder="e.g. Mathematics, English Language, Physics"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Exam Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. First Term Examination"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Target Senior Secondary Class
                    </label>
                    <select
                      name="targetClass"
                      required
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500"
                    >
                      <option value="SS 1">SS 1 (All Streams)</option>
                      <option value="SS 1 (Science)">SS 1 (Science)</option>
                      <option value="SS 1 (Art)">SS 1 (Art)</option>
                      <option value="SS 1 (Commercial)">SS 1 (Commercial)</option>
                      <option value="SS 2">SS 2 (All Streams - 64 Students)</option>
                      <option value="SS 2 (Science)">SS 2 (Science - 29 Students)</option>
                      <option value="SS 2 (Art)">SS 2 (Art - 35 Students)</option>
                      <option value="SS 2 (Commercial)">SS 2 (Commercial)</option>
                      <option value="SS 3">SS 3 (All Streams - 74 Students)</option>
                      <option value="SS 3 (Science)">SS 3 (Science - 37 Students)</option>
                      <option value="SS 3 (Art)">SS 3 (Art - 37 Students)</option>
                      <option value="SS 3 (Commercial)">SS 3 (Commercial)</option>
                      <option value="JSS 1">JSS 1 (Diamond)</option>
                      <option value="JSS 2">JSS 2 (Diamond)</option>
                      <option value="JSS 3">JSS 3 (Platinum)</option>
                      <option value="SS 1 - SS 3">All Senior Secondary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Exam Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="examDate"
                      required
                      defaultValue={new Date().toISOString().slice(0, 16)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      name="durationMinutes"
                      required
                      min={5}
                      max={240}
                      defaultValue={60}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                      <input
                        type="checkbox"
                        name="hasTheory"
                        defaultChecked
                        className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                      />
                      <span>Includes Physical Theory</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700"
                      />
                      <span>Active Immediately</span>
                    </label>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateExamOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isPending ? "Saving Exam..." : "Save Examination Paper"}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Exams Table / Cards */}
            {(() => {
              const activeExams = exams.filter((e) => !e.isArchived);
              const archivedExams = exams.filter((e) => !!e.isArchived);
              const displayedExams = examFilterTab === "archived" ? archivedExams : activeExams;

              return (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setExamFilterTab("active")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          examFilterTab === "active"
                            ? "bg-blue-600 text-white shadow"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>Active Courses</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-950 text-blue-200 text-[10px]">
                          {activeExams.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExamFilterTab("archived")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          examFilterTab === "archived"
                            ? "bg-amber-600 text-white shadow"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                        title="Courses safely removed from CBT page (all student scores and gradings preserved)"
                      >
                        <Archive className="w-3.5 h-3.5 text-amber-300" />
                        <span>Safely Removed Courses</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-200 text-[10px]">
                          {archivedExams.length}
                        </span>
                      </button>
                    </div>

                    <span className="text-xs text-slate-500">
                      {displayedExams.length} {examFilterTab === "archived" ? "past / removed papers" : "active papers"}
                    </span>
                  </div>

                  {displayedExams.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                      {examFilterTab === "archived" ? (
                        <>
                          <Archive className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                          <p>No safely removed courses yet.</p>
                          <p className="text-slate-500 text-[11px]">When you safely remove a written course from the CBT active page, it appears here with all student gradings preserved.</p>
                        </>
                      ) : (
                        <>
                          <p>No active exams found.</p>
                          <p className="text-slate-500 text-[11px]">Click &quot;Create New Examination&quot; above to set up a new paper.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Mobile Cards View (Visible on small screens) */}
                      <div className="md:hidden divide-y divide-slate-800">
                        {displayedExams.map((ex) => (
                          <div key={ex.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-white text-sm">{ex.subject}</span>
                                  <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-yellow-400 font-mono font-bold text-[10px]">
                                    {ex.targetClass}
                                  </span>
                                </div>
                                <div className="text-slate-400 text-xs mt-0.5">{ex.title}</div>
                              </div>
                              {ex.isArchived ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-950 border border-amber-700 text-amber-300">
                                  Removed (Scores Kept)
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(ex.id, ex.isActive)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition shrink-0 ${
                                    ex.isActive
                                      ? "bg-emerald-950 border border-emerald-700 text-emerald-300"
                                      : "bg-slate-800 border border-slate-700 text-slate-400"
                                  }`}
                                >
                                  {ex.isActive ? "Active" : "Inactive"}
                                </button>
                              )}
                            </div>

                            {/* Metric stats grid */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-center text-[11px]">
                              <div>
                                <div className="text-slate-500 text-[10px] font-bold uppercase">Time</div>
                                <div className="font-mono text-slate-200 font-bold">{ex.durationMinutes}m</div>
                              </div>
                              <div>
                                <div className="text-slate-500 text-[10px] font-bold uppercase">Questions</div>
                                <div className="text-white font-bold">{ex._count.objectiveQuestions} Obj</div>
                                <div className="text-[9px] text-slate-400">{ex.hasTheory ? `${ex._count.theoryQuestions} Th` : "No Th"}</div>
                              </div>
                              <div>
                                <div className="text-slate-500 text-[10px] font-bold uppercase">Attempts</div>
                                <div className="font-mono text-emerald-400 font-bold">{ex._count.attempts}</div>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1.5 pt-1">
                              {ex.isArchived ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedExamIdForGrading(ex.id);
                                      selectTab("grading");
                                    }}
                                    className="flex-1 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-xl text-xs font-bold transition text-center active:scale-95 flex items-center justify-center gap-1"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Gradings ({ex._count.attempts})</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExportExamPdfFromList(ex, "obj_only")}
                                    disabled={exportingPdfExamId === ex.id}
                                    className="px-3 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
                                    title="Download PDF Score Sheet with Student Name and OBJ Scores"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{exportingPdfExamId === ex.id ? "..." : "PDF"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreExam(ex.id, ex.subject)}
                                    disabled={isPending}
                                    className="px-3 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
                                    title="Restore back to active CBT exam list"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restore</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePermanentDeleteExam(ex.id, ex.subject, ex._count.attempts)}
                                    disabled={isPending}
                                    className="px-2.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 shrink-0"
                                    title="Permanently delete this removed course and all its data forever"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Delete Forever</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedExamIdForQuestions(ex.id);
                                      selectTab("questions");
                                    }}
                                    className="flex-1 py-2 bg-blue-900/60 hover:bg-blue-800 text-blue-200 rounded-xl text-xs font-bold transition text-center active:scale-95"
                                  >
                                    Questions
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedExamIdForGrading(ex.id);
                                      selectTab("grading");
                                    }}
                                    className="flex-1 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-xl text-xs font-bold transition text-center active:scale-95"
                                  >
                                    Grading
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExportExamPdfFromList(ex, "obj_only")}
                                    disabled={exportingPdfExamId === ex.id}
                                    className="px-2.5 py-2 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 shrink-0"
                                    title="Download PDF Score Sheet with Student Name and OBJ Scores"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{exportingPdfExamId === ex.id ? "..." : "PDF"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingExamForSettings(ex)}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl transition active:scale-95 shrink-0"
                                    title="Edit exam duration (time), title, and details"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExam(ex.id, ex.subject, ex._count.attempts)}
                                    disabled={isPending}
                                    className="p-2 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl transition active:scale-95 shrink-0"
                                    title={
                                      ex._count.attempts > 0
                                        ? "Safely remove from CBT page (preserves all student gradings)"
                                        : "Delete exam"
                                    }
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop Table View (Hidden on mobile) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
                              <th className="p-3.5">Subject & Title</th>
                              <th className="p-3.5">Target Class</th>
                              <th className="p-3.5">Duration</th>
                              <th className="p-3.5">Questions</th>
                              <th className="p-3.5">Submissions</th>
                              <th className="p-3.5">Status</th>
                              <th className="p-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {displayedExams.map((ex) => (
                              <tr key={ex.id} className="hover:bg-slate-900/50 transition">
                                <td className="p-3.5">
                                  <div className="font-bold text-white text-sm">{ex.subject}</div>
                                  <div className="text-slate-400 text-[11px]">{ex.title}</div>
                                </td>
                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-yellow-400 font-mono font-bold">
                                    {ex.targetClass}
                                  </span>
                                </td>
                                <td className="p-3.5 font-mono text-slate-300">
                                  {ex.durationMinutes} mins
                                </td>
                                <td className="p-3.5 space-y-0.5">
                                  <div className="text-white">
                                    {ex._count.objectiveQuestions} Objective
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {ex.hasTheory ? `${ex._count.theoryQuestions} Theory` : "No Theory"}
                                  </div>
                                </td>
                                <td className="p-3.5 font-mono text-emerald-400 font-bold">
                                  {ex._count.attempts} Submitted
                                </td>
                                <td className="p-3.5">
                                  {ex.isArchived ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-950 border border-amber-700 text-amber-300 inline-flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                                      <span>Removed (Scores Kept)</span>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleStatus(ex.id, ex.isActive)}
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                                        ex.isActive
                                          ? "bg-emerald-950 border border-emerald-700 text-emerald-300"
                                          : "bg-slate-800 border border-slate-700 text-slate-400"
                                      }`}
                                    >
                                      {ex.isActive ? "Active" : "Inactive"}
                                    </button>
                                  )}
                                </td>
                                <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                                  {ex.isArchived ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedExamIdForGrading(ex.id);
                                          selectTab("grading");
                                        }}
                                        className="px-2.5 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Grading Desk ({ex._count.attempts})</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleExportExamPdfFromList(ex, "obj_only")}
                                        disabled={exportingPdfExamId === ex.id}
                                        className="px-2.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 active:scale-95"
                                        title="Export PDF Score Sheet with Student Name and OBJ Scores"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>{exportingPdfExamId === ex.id ? "Exporting..." : "Export OBJ PDF"}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreExam(ex.id, ex.subject)}
                                        disabled={isPending}
                                        className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 active:scale-95"
                                        title="Restore back to active CBT exam catalog"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Restore to Active</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePermanentDeleteExam(ex.id, ex.subject, ex._count.attempts)}
                                        disabled={isPending}
                                        className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 active:scale-95"
                                        title="Permanently delete this removed course forever"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                        <span>Permanent Delete</span>
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedExamIdForQuestions(ex.id);
                                          selectTab("questions");
                                        }}
                                        className="px-2.5 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 rounded-lg text-xs font-semibold transition"
                                      >
                                        Manage Questions
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedExamIdForGrading(ex.id);
                                          selectTab("grading");
                                        }}
                                        className="px-2.5 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-lg text-xs font-semibold transition"
                                      >
                                        Grading Desk
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleExportExamPdfFromList(ex, "obj_only")}
                                        disabled={exportingPdfExamId === ex.id}
                                        className="px-2.5 py-1.5 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 active:scale-95"
                                        title="Export PDF Score Sheet with Student Name and OBJ Scores"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>{exportingPdfExamId === ex.id ? "Exporting..." : "Export OBJ PDF"}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingExamForSettings(ex)}
                                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 active:scale-95"
                                        title="Edit exam duration (time), title, class, and settings"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Edit Exam</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteExam(ex.id, ex.subject, ex._count.attempts)}
                                        disabled={isPending}
                                        className="px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 active:scale-95"
                                        title={
                                          ex._count.attempts > 0
                                            ? "Safely remove from CBT page (preserves all student attempts and gradings)"
                                            : "Delete exam"
                                        }
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                        <span>Delete</span>
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: QUESTION UPLOADER & PREVIEW */}
        {/* ================================================================== */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            {/* Header Title & Subtitle */}
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Question Uploader &amp; Question Bank
              </h2>
              <p className="text-xs text-slate-400">
                Manually author Objective (A-D) and Theory questions for your examination.
              </p>
            </div>

            {/* Target Paper Selector & Action Bar - Fully Decongested */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
              {/* Target Paper Dropdown */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Target Paper:
                  </span>
                </div>
                {exams.length > 0 ? (
                  <select
                    value={selectedExamIdForQuestions}
                    onChange={(e) => setSelectedExamIdForQuestions(parseInt(e.target.value, 10))}
                    className="w-full flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-yellow-500 transition shadow-inner"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.subject} ({ex.targetClass}) — {ex.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-amber-400 font-semibold bg-amber-950/60 px-3 py-2 rounded-lg border border-amber-800">
                    No active courses found. Click "+ Custom Subject" to create one.
                  </span>
                )}
              </div>

              {/* Action Buttons: Custom Subject & Delete Course Paper */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => setIsQuickSubjectModalOpen(true)}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow active:scale-95"
                  title="Create custom subject or examination paper"
                >
                  <PlusCircle className="w-4 h-4 text-white" />
                  <span>+ Custom Subject</span>
                </button>
                {selectedExamIdForQuestions > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentExam = exams.find((e) => e.id === selectedExamIdForQuestions);
                      handleDeleteExam(selectedExamIdForQuestions, currentExam?.subject);
                    }}
                    disabled={isPending}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-rose-950/90 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow active:scale-95"
                    title="Permanently delete this entire question course so students will not see it tomorrow"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span className="sm:hidden">Delete Paper</span>
                    <span className="hidden sm:inline">Delete Course Paper</span>
                  </button>
                )}
              </div>
            </div>

            {/* Paper Settings & Live Metrics: Time & Marks */}
            {selectedExamIdForQuestions > 0 && (() => {
              const currentExam = exams.find((e) => e.id === selectedExamIdForQuestions);
              if (!currentExam) return null;
              const objQuestions = examQuestionsPreview?.objectiveQuestions || [];
              const thQuestions = examQuestionsPreview?.theoryQuestions || [];
              const objMarks = Math.round(objQuestions.reduce((acc: number, q: any) => acc + (q.points != null ? Number(q.points) : 0.5), 0) * 10) / 10;
              const thMarks = Math.round(thQuestions.reduce((acc: number, tq: any) => acc + (tq.maxScore != null ? Number(tq.maxScore) : 10), 0) * 10) / 10;
              const totalPaperMarks = Math.round((objMarks + thMarks) * 10) / 10;
              const numericInlineDuration = parseInt(String(inlineExamDuration), 10) || currentExam.durationMinutes;
              const hasUnsavedDuration =
                String(inlineExamDuration).trim() !== "" && numericInlineDuration !== currentExam.durationMinutes;

              return (
                <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <span>Paper Examination Settings</span>
                          <span className="text-[10px] font-mono text-secondary-400 font-bold px-2 py-0.5 rounded-full bg-secondary-400/15 border border-secondary-400/30">
                            {currentExam.targetClass}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Configure allocated CBT duration (time) &amp; review total calculated marks for this paper
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingExamForSettings(currentExam)}
                      className="self-start sm:self-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
                      title="Edit full paper settings (Title, Subject, Class, Duration)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Exam Details</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                    {/* Time (Duration) Quick Editor */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-secondary-400" />
                            Allocated Exam Time
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Current: <strong className="text-white font-mono">{currentExam.durationMinutes} mins</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="relative w-24">
                            <input
                              type="number"
                              min="5"
                              max="360"
                              value={inlineExamDuration}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setInlineExamDuration(e.target.value)}
                              onBlur={() => {
                                if (String(inlineExamDuration).trim() === "") {
                                  setInlineExamDuration(currentExam.durationMinutes);
                                }
                              }}
                              className="w-full pl-2.5 pr-8 py-1.5 bg-slate-900 border border-slate-700 focus:border-secondary-400 rounded-lg text-white font-mono font-bold text-xs focus:outline-none"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-bold">m</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveExamDuration(currentExam.id, inlineExamDuration)}
                            disabled={isSavingExamDuration || !hasUnsavedDuration}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              hasUnsavedDuration
                                ? "bg-secondary-400 hover:bg-secondary-300 text-slate-950 shadow active:scale-95 cursor-pointer font-black"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                            }`}
                            title="Save new allocated exam time in minutes"
                          >
                            <Save className="w-3 h-3" />
                            <span>{isSavingExamDuration ? "..." : "Save Time"}</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-900">
                        <span className="text-[10px] text-slate-500 font-semibold mr-1">Quick Set:</span>
                        {[30, 45, 60, 90, 120].map((presetMin) => (
                          <button
                            key={presetMin}
                            type="button"
                            onClick={() => {
                              setInlineExamDuration(presetMin);
                              handleSaveExamDuration(currentExam.id, presetMin);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                              Number(inlineExamDuration) === presetMin
                                ? "bg-secondary-400 text-slate-950"
                                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                            }`}
                          >
                            {presetMin}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Total Marks Calculator & Breakdown */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-secondary-400" />
                          Total Paper Marks
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Sum of all questions in this paper
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-base font-black text-secondary-400">
                          {totalPaperMarks} <span className="text-xs font-normal text-slate-300">Marks</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 justify-end">
                          <span className="text-blue-300 font-medium">{objMarks} Obj</span>
                          <span>+</span>
                          <span className="text-yellow-300 font-medium">{thMarks} Th</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Question Type Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setQuestionType("objective")}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  questionType === "objective"
                    ? "bg-blue-700 text-white shadow"
                    : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                }`}
              >
                <span className="sm:hidden">+ Objective (CBT A-D)</span>
                <span className="hidden sm:inline">+ Add Objective Question (Radio A-D)</span>
              </button>
              <button
                onClick={() => setQuestionType("theory")}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  questionType === "theory"
                    ? "bg-yellow-500 text-slate-950 font-black shadow"
                    : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                }`}
              >
                <span className="sm:hidden">+ Theory (Booklet)</span>
                <span className="hidden sm:inline">+ Add Theory Question (Physical Booklet)</span>
              </button>
            </div>

            {questionFormError && (
              <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-3 text-xs text-rose-300">
                {questionFormError}
              </div>
            )}

            {questionSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-800 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{questionSuccess}</span>
              </div>
            )}

            {/* Objective Authoring Form */}
            {questionType === "objective" && (
              <form onSubmit={handleAddObjective} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  New Objective Question
                </h3>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Question Text / Problem Statement
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminMathTargetId("admin-objective-question-textarea");
                        setIsAdminMathOpen(true);
                      }}
                      className="text-[11px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-lg border border-amber-500/30 transition active:scale-95 shadow-sm"
                      title="Open Floating Math & Formula Keyboard"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="hidden xs:inline">Insert Math / Symbol</span>
                      <span className="xs:hidden">Math</span>
                    </button>
                  </div>
                  <textarea
                    id="admin-objective-question-textarea"
                    name="questionText"
                    required
                    rows={3}
                    value={adminObjQuestionText}
                    onChange={(e) => setAdminObjQuestionText(e.target.value)}
                    placeholder="Enter the question prompt here (e.g. Solve for x: 3x² + 4x - 7 = 0)..."
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 font-sans"
                  />
                </div>

                {/* Optional Question Diagram / Image */}
                <div className="bg-slate-900/90 border border-dashed border-slate-700/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Question Diagram / Figure / Image (Optional)</span>
                    </label>
                    {objectiveImagePreview && (
                      <button
                        type="button"
                        onClick={() => setObjectiveImagePreview(null)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Image</span>
                      </button>
                    )}
                  </div>

                  {objectiveImagePreview ? (
                    <div className="relative inline-block border border-slate-700 rounded-lg overflow-hidden bg-slate-950 p-1">
                      <img
                        src={objectiveImagePreview}
                        alt="Question preview"
                        className="max-h-40 w-auto object-contain rounded cursor-pointer hover:opacity-95"
                        onClick={() => setLightboxImageUrl(objectiveImagePreview)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition flex items-center gap-1.5 active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Upload Diagram / Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageFileSelect(file, setObjectiveImagePreview);
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-slate-500">Attach diagrams for science, maths, or technical figures</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {(["optA", "optB", "optC", "optD"] as const).map((optField, idx) => {
                    const optLabel = ["Option A", "Option B", "Option C", "Option D"][idx];
                    const optPlaceholder = [
                      "Choice A text (e.g. 1011₂)",
                      "Choice B text (e.g. 347₈)",
                      "Choice C text (e.g. 19₁₆)",
                      "Choice D text (e.g. 100₅)",
                    ][idx];

                    return (
                      <div key={optField} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                            {optLabel}
                          </label>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {["x²", "₂", "₈", "₁₀", "₁₆", "₅"].map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => {
                                  const el = document.querySelector(`input[name="${optField}"]`) as HTMLInputElement;
                                  if (el) {
                                    el.value += b === "x²" ? "²" : b;
                                    el.dispatchEvent(new Event("input", { bubbles: true }));
                                  }
                                }}
                                className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 active:scale-95"
                                title={`Add ${b}`}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          name={optField}
                          required
                          placeholder={optPlaceholder}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 font-sans min-w-0"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Correct Answer Key
                    </label>
                    <select
                      name="correctAnswer"
                      required
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 font-bold"
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Points / Marks
                    </label>
                    <select
                      name="points"
                      required
                      defaultValue="0.5"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 font-bold"
                    >
                      <option value="0.5">1/2 Point (0.5 mark)</option>
                      <option value="1">1 Point (1 mark)</option>
                      <option value="1.5">1 1/2 Points (1.5 marks)</option>
                      <option value="2">2 Points (2 marks)</option>
                      <option value="2.5">2 1/2 Points (2.5 marks)</option>
                      <option value="3">3 Points (3 marks)</option>
                      <option value="4">4 Points (4 marks)</option>
                      <option value="5">5 Points (5 marks)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4 text-yellow-300" />
                    <span>{isPending ? "Saving..." : "Add Objective Question"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Theory Authoring Form */}
            {questionType === "theory" && (
              <form onSubmit={handleAddTheory} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  New Theory Question Prompt
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Question Number
                    </label>
                    <input
                      type="number"
                      name="questionNum"
                      required
                      defaultValue={(examQuestionsPreview?.theoryQuestions?.length || 0) + 1}
                      min={1}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Maximum Marks Allocation
                    </label>
                    <input
                      type="number"
                      name="maxScore"
                      required
                      defaultValue={10}
                      min={1}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Question Prompt
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminMathTargetId("admin-theory-question-textarea");
                        setIsAdminMathOpen(true);
                      }}
                      className="text-[11px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-lg border border-amber-500/30 transition active:scale-95 shadow-sm"
                      title="Open Floating Math & Formula Keyboard"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="hidden xs:inline">Insert Math / Symbol</span>
                      <span className="xs:hidden">Math</span>
                    </button>
                  </div>
                  <textarea
                    id="admin-theory-question-textarea"
                    name="questionText"
                    required
                    rows={4}
                    value={adminTheoryQuestionText}
                    onChange={(e) => setAdminTheoryQuestionText(e.target.value)}
                    placeholder="e.g. State Ohm's Law and derive the formula for electrical resistance..."
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 font-sans"
                  />
                </div>

                {/* Optional Theory Question Diagram / Image */}
                <div className="bg-slate-900/90 border border-dashed border-slate-700/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Theory Diagram / Figure / Image (Optional)</span>
                    </label>
                    {theoryImagePreview && (
                      <button
                        type="button"
                        onClick={() => setTheoryImagePreview(null)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Image</span>
                      </button>
                    )}
                  </div>

                  {theoryImagePreview ? (
                    <div className="relative inline-block border border-slate-700 rounded-lg overflow-hidden bg-slate-950 p-1">
                      <img
                        src={theoryImagePreview}
                        alt="Theory preview"
                        className="max-h-40 w-auto object-contain rounded cursor-pointer hover:opacity-95"
                        onClick={() => setLightboxImageUrl(theoryImagePreview)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition flex items-center gap-1.5 active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Upload Diagram / Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageFileSelect(file, setTheoryImagePreview);
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-slate-500">e.g. geometric shapes, circuit diagrams, anatomical charts</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Special Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    name="instructions"
                    placeholder="e.g. Answer all parts. Include neat circuit diagrams."
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isPending ? "Saving..." : "Add Theory Prompt"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Questions Preview for selected exam */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span>Existing Questions for Selected Exam</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    {examQuestionsPreview?.objectiveQuestions?.length || 0} Objective •{" "}
                    {examQuestionsPreview?.theoryQuestions?.length || 0} Theory
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(examQuestionsPreview?.objectiveQuestions?.length > 0 ||
                    examQuestionsPreview?.theoryQuestions?.length > 0) && (
                    <button
                      type="button"
                      onClick={() => handleClearAllQuestions(selectedExamIdForQuestions)}
                      disabled={isPending}
                      className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-900 border border-amber-800/80 text-amber-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 active:scale-95"
                      title="Clear all questions from this paper"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Clear All Questions</span>
                    </button>
                  )}

                  {selectedExamIdForQuestions > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentExam = exams.find((e) => e.id === selectedExamIdForQuestions);
                        handleDeleteExam(selectedExamIdForQuestions, currentExam?.subject, currentExam?._count?.attempts ?? 0);
                      }}
                      disabled={isPending}
                      className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 active:scale-95"
                      title="Safely remove this course paper from CBT page"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remove Course</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Objective Preview */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-400 uppercase">Objective Questions:</h4>
                {examQuestionsPreview?.objectiveQuestions?.length === 0 ? (
                  <p className="text-xs text-slate-500">No objective questions added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {examQuestionsPreview?.objectiveQuestions?.map((q: any, i: number) => {
                      let opts: string[] = [];
                      try {
                        opts = JSON.parse(q.options);
                      } catch {
                        opts = [];
                      }
                      return (
                        <div
                          key={q.id}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-yellow-400">Q{i + 1}.</span>
                              <span className="text-white font-medium">
                                <FormattedMathText text={q.questionText} />
                              </span>
                              <span className="text-slate-500">({q.points === 0.5 ? "1/2" : q.points} pt)</span>
                            </div>
                            {q.imageUrl && (
                              <div className="mt-2 relative inline-block group">
                                <img
                                  src={q.imageUrl}
                                  alt="Diagram thumbnail"
                                  className="h-20 w-auto max-w-xs object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-90 transition"
                                  onClick={() => setLightboxImageUrl(q.imageUrl)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setLightboxImageUrl(q.imageUrl)}
                                  className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-950/85 hover:bg-slate-900 rounded text-yellow-400 text-[10px] font-bold flex items-center gap-1 shadow"
                                >
                                  <ZoomIn className="w-3 h-3" />
                                  <span>Zoom</span>
                                </button>
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 flex flex-wrap gap-2 pt-1">
                              {opts.map((op, idx) => {
                                const letter = ["A", "B", "C", "D"][idx];
                                const isCorrect = letter === q.correctAnswer;
                                return (
                                  <span
                                    key={letter}
                                    className={`px-2 py-0.5 rounded ${
                                      isCorrect
                                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold"
                                        : "bg-slate-950 text-slate-400"
                                    }`}
                                  >
                                    {letter}: <FormattedMathText text={op} />
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditObjective(q)}
                              className="text-slate-400 hover:text-yellow-400 p-1.5 hover:bg-slate-800 rounded-lg transition"
                              title="Edit question prompt, options, answer key, or points"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion("objective", q.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-slate-800 rounded-lg transition"
                              title="Delete question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Theory Preview */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold text-yellow-400 uppercase">Theory Prompts:</h4>
                {examQuestionsPreview?.theoryQuestions?.length === 0 ? (
                  <p className="text-xs text-slate-500">No theory prompts added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {examQuestionsPreview?.theoryQuestions?.map((tq: any) => (
                      <div
                        key={tq.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-yellow-400">
                              Prompt {tq.questionNum}:
                            </span>
                            <span className="text-white font-medium">
                              <FormattedMathText text={tq.questionText} />
                            </span>
                            <span className="text-slate-400">({tq.maxScore} marks)</span>
                          </div>
                          {tq.imageUrl && (
                            <div className="mt-2 relative inline-block group">
                              <img
                                src={tq.imageUrl}
                                alt="Theory Diagram thumbnail"
                                className="h-24 w-auto max-w-xs object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-90 transition"
                                onClick={() => setLightboxImageUrl(tq.imageUrl)}
                              />
                              <button
                                type="button"
                                onClick={() => setLightboxImageUrl(tq.imageUrl)}
                                className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-950/85 hover:bg-slate-900 rounded text-yellow-400 text-[10px] font-bold flex items-center gap-1 shadow"
                              >
                                <ZoomIn className="w-3 h-3" />
                                <span>Zoom</span>
                              </button>
                            </div>
                          )}
                          {tq.instructions && (
                            <p className="text-[11px] text-blue-300">
                              <em>Instructions:</em> {tq.instructions}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditTheory(tq)}
                            className="text-slate-400 hover:text-yellow-400 p-1.5 hover:bg-slate-800 rounded-lg transition"
                            title="Edit theory prompt, max score, or instructions"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion("theory", tq.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-slate-800 rounded-lg transition"
                            title="Delete theory prompt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal: Edit / Modify Objective Question */}
            {editingObjectiveQuestion && (
              <div className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="sheet-panel bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-yellow-400" />
                      <h3 className="text-base font-bold text-white">
                        Edit Objective Question #{editingObjectiveQuestion.id}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingObjectiveQuestion(null);
                        setEditObjectiveImagePreview(null);
                      }}
                      className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg"
                    >
                      Close
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditObjective} className="space-y-4">
                    <input type="hidden" name="questionId" value={editingObjectiveQuestion.id} />
                    <input type="hidden" name="examId" value={editingObjectiveQuestion.examId} />

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Question Prompt
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminMathTargetId("admin-edit-obj-question-textarea");
                            setIsAdminMathOpen(true);
                          }}
                          className="text-[11px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded-lg border border-amber-500/30 transition"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Insert Math</span>
                        </button>
                      </div>
                      <textarea
                        id="admin-edit-obj-question-textarea"
                        name="questionText"
                        required
                        rows={3}
                        value={editingObjectiveQuestion.questionText || ""}
                        onChange={(e) =>
                          setEditingObjectiveQuestion((prev: any) =>
                            prev ? { ...prev, questionText: e.target.value } : prev
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500"
                      />
                      {editingObjectiveQuestion.questionText && (
                        <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-200">
                          <span className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">Live Preview:</span>
                          <FormattedMathText text={editingObjectiveQuestion.questionText} />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(["A", "B", "C", "D"] as const).map((letter, idx) => {
                        const inputId = `admin-edit-obj-opt-${letter}`;
                        return (
                          <div key={letter}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-bold text-slate-300">Option {letter}</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setAdminMathTargetId(inputId);
                                  setIsAdminMathOpen(true);
                                }}
                                className="text-[10px] text-amber-300 hover:text-amber-200 font-bold"
                              >
                                + Math
                              </button>
                            </div>
                            <input
                              id={inputId}
                              type="text"
                              name={`option${letter}`}
                              required
                              value={editingObjectiveQuestion.parsedOptions?.[idx] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingObjectiveQuestion((prev: any) => {
                                  if (!prev) return prev;
                                  const nextOpts = [...(prev.parsedOptions || ["", "", "", ""])];
                                  nextOpts[idx] = val;
                                  return { ...prev, parsedOptions: nextOpts };
                                });
                              }}
                              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Correct Answer</label>
                        <select
                          name="correctAnswer"
                          required
                          value={editingObjectiveQuestion.correctAnswer || "A"}
                          onChange={(e) =>
                            setEditingObjectiveQuestion((prev: any) =>
                              prev ? { ...prev, correctAnswer: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500 font-bold"
                        >
                          <option value="A">Option A</option>
                          <option value="B">Option B</option>
                          <option value="C">Option C</option>
                          <option value="D">Option D</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-300">Points / Marks</label>
                          <span className="text-[10px] text-secondary-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Exam Time: {exams.find((e) => e.id === editingObjectiveQuestion.examId)?.durationMinutes || 60}m</span>
                          </span>
                        </div>
                        <select
                          name="points"
                          required
                          value={String(editingObjectiveQuestion.points ?? 0.5)}
                          onChange={(e) =>
                            setEditingObjectiveQuestion((prev: any) =>
                              prev ? { ...prev, points: parseFloat(e.target.value) || 0.5 } : prev
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500 font-bold"
                        >
                          <option value="0.25">1/4 Point (0.25 mark)</option>
                          <option value="0.5">1/2 Point (0.5 mark)</option>
                          <option value="1">1 Point (1 mark)</option>
                          <option value="1.5">1 1/2 Points (1.5 marks)</option>
                          <option value="2">2 Points (2 marks)</option>
                          <option value="2.5">2 1/2 Points (2.5 marks)</option>
                          <option value="3">3 Points (3 marks)</option>
                          <option value="4">4 Points (4 marks)</option>
                          <option value="5">5 Points (5 marks)</option>
                          <option value="10">10 Points (10 marks)</option>
                          <option value="15">15 Points (15 marks)</option>
                          <option value="20">20 Points (20 marks)</option>
                          {editingObjectiveQuestion.points &&
                            ![0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 10, 15, 20].includes(Number(editingObjectiveQuestion.points)) && (
                              <option value={String(editingObjectiveQuestion.points)}>
                                Custom ({editingObjectiveQuestion.points} marks)
                              </option>
                            )}
                        </select>
                      </div>
                    </div>

                    {/* Diagram preview / upload */}
                    <div className="bg-slate-950 border border-dashed border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Question Diagram (Optional)</span>
                        </label>
                        {editObjectiveImagePreview && (
                          <button
                            type="button"
                            onClick={() => setEditObjectiveImagePreview(null)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Diagram</span>
                          </button>
                        )}
                      </div>

                      {editObjectiveImagePreview ? (
                        <div className="relative inline-block border border-slate-700 rounded-lg overflow-hidden bg-slate-900 p-1">
                          <img
                            src={editObjectiveImagePreview}
                            alt="Question diagram preview"
                            className="max-h-32 w-auto object-contain rounded"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition flex items-center gap-1.5 active:scale-95">
                            <Upload className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Upload / Replace Diagram</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFileSelect(file, setEditObjectiveImagePreview);
                              }}
                            />
                          </label>
                        </div>
                      )}
                      <input
                        type="hidden"
                        name="imageUrl"
                        value={editObjectiveImagePreview || ""}
                      />
                      <input
                        type="hidden"
                        name="removeImage"
                        value={!editObjectiveImagePreview ? "true" : "false"}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingObjectiveQuestion(null);
                          setEditObjectiveImagePreview(null);
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isPending ? "Saving..." : "Save Question Changes"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit / Modify Theory Question */}
            {editingTheoryQuestion && (
              <div className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="sheet-panel bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-yellow-400" />
                      <h3 className="text-base font-bold text-white">
                        Edit Theory Prompt #{editingTheoryQuestion.id}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTheoryQuestion(null);
                        setEditTheoryImagePreview(null);
                      }}
                      className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg"
                    >
                      Close
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditTheory} className="space-y-4">
                    <input type="hidden" name="questionId" value={editingTheoryQuestion.id} />
                    <input type="hidden" name="examId" value={editingTheoryQuestion.examId} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Prompt Number</label>
                        <input
                          type="number"
                          name="questionNum"
                          required
                          value={editingTheoryQuestion.questionNum ?? ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setEditingTheoryQuestion((prev: any) =>
                              prev ? { ...prev, questionNum: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Max Score Allocation</label>
                        <input
                          type="number"
                          name="maxScore"
                          required
                          value={editingTheoryQuestion.maxScore ?? ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setEditingTheoryQuestion((prev: any) =>
                              prev ? { ...prev, maxScore: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Question Prompt
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAdminMathTargetId("admin-edit-theory-question-textarea");
                            setIsAdminMathOpen(true);
                          }}
                          className="text-[11px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 rounded-lg border border-amber-500/30 transition"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Insert Math</span>
                        </button>
                      </div>
                      <textarea
                        id="admin-edit-theory-question-textarea"
                        name="questionText"
                        required
                        rows={3}
                        value={editingTheoryQuestion.questionText || ""}
                        onChange={(e) =>
                          setEditingTheoryQuestion((prev: any) =>
                            prev ? { ...prev, questionText: e.target.value } : prev
                          )
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500 font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Special Instructions (Optional)</label>
                      <input
                        type="text"
                        name="instructions"
                        value={editingTheoryQuestion.instructions || ""}
                        onChange={(e) =>
                          setEditingTheoryQuestion((prev: any) =>
                            prev ? { ...prev, instructions: e.target.value } : prev
                          )
                        }
                        placeholder="e.g. Answer any 2 parts..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    {/* Diagram preview / upload */}
                    <div className="bg-slate-950 border border-dashed border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Theory Diagram (Optional)</span>
                        </label>
                        {editTheoryImagePreview && (
                          <button
                            type="button"
                            onClick={() => setEditTheoryImagePreview(null)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Diagram</span>
                          </button>
                        )}
                      </div>

                      {editTheoryImagePreview ? (
                        <div className="relative inline-block border border-slate-700 rounded-lg overflow-hidden bg-slate-900 p-1">
                          <img
                            src={editTheoryImagePreview}
                            alt="Theory diagram preview"
                            className="max-h-32 w-auto object-contain rounded"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition flex items-center gap-1.5 active:scale-95">
                            <Upload className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Upload / Replace Diagram</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFileSelect(file, setEditTheoryImagePreview);
                              }}
                            />
                          </label>
                        </div>
                      )}
                      <input
                        type="hidden"
                        name="imageUrl"
                        value={editTheoryImagePreview || ""}
                      />
                      <input
                        type="hidden"
                        name="removeImage"
                        value={!editTheoryImagePreview ? "true" : "false"}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTheoryQuestion(null);
                          setEditTheoryImagePreview(null);
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isPending ? "Saving..." : "Save Prompt Changes"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: PHYSICAL GRADING DESK */}
        {/* ================================================================== */}
        {activeTab === "grading" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-yellow-400" />
                  <span>Physical Theory Grading Desk</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Review student objective marks and input physical theory marks from test booklets.
                </p>
              </div>

              {/* Exam Selector & Clear All Submissions */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                  <span className="text-xs font-bold text-slate-400 shrink-0">Select Paper:</span>
                  <select
                    value={selectedExamIdForGrading}
                    onChange={(e) => setSelectedExamIdForGrading(parseInt(e.target.value, 10))}
                    className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-yellow-500"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.subject} ({ex.targetClass})
                      </option>
                    ))}
                  </select>
                </div>

                {gradingAttempts.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExportGradingPdf("obj_only")}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow active:scale-95 shrink-0"
                      title="Export A4 PDF Score Sheet with Student Name and OBJ Scores"
                    >
                      <Download className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Export OBJ Scores (PDF)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportGradingPdf("full")}
                      className="px-3 py-2 bg-blue-900/80 hover:bg-blue-800 border border-blue-700 text-blue-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow active:scale-95 shrink-0"
                      title="Export Full A4 PDF Score Sheet (OBJ + Theory + Total)"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-300" />
                      <span>Full Scores (PDF)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAllGradingAttempts}
                      disabled={isClearingGrading}
                      className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow active:scale-95 shrink-0"
                      title="Clear all completed student submissions for this paper so desk is clean or students can retake"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isClearingGrading ? "Clearing..." : "Clear All Submissions"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {gradingFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  gradingFeedback.type === "success"
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                    : "bg-rose-950/60 border-rose-800 text-rose-300"
                }`}
              >
                {gradingFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{gradingFeedback.text}</span>
              </div>
            )}

            {/* Grading Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Completed Submissions for Selected Examination
                </h3>
                <div className="flex items-center gap-3">
                  {gradingAttempts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleExportGradingPdf("obj_only")}
                      className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-bold rounded-lg transition inline-flex items-center gap-1.5 active:scale-95"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>Download OBJ Score Sheet (PDF)</span>
                    </button>
                  )}
                  <span className="text-xs text-slate-500">
                    {gradingAttempts.length} students submitted
                  </span>
                </div>
              </div>

              {gradingAttempts.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-white">No Submitted Attempts Yet</div>
                  <p className="max-w-sm mx-auto text-slate-500">
                    When Senior Secondary students complete their test, their attempts will appear here for physical booklet grading.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Grading Cards View (Visible on small screens) */}
                  <div className="md:hidden divide-y divide-slate-800">
                    {gradingAttempts.map((att) => {
                      const isSaving = savingAttemptId === att.id;
                      const isSaved = saveSuccessMsg[att.id];
                      const currentTheoryInput = Number(gradingScores[att.id] ?? 0) || 0;
                      const dynamicTotal = att.objectiveScore + currentTheoryInput;

                      return (
                        <div key={att.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-2">
                                <span>{att.studentFullName}</span>
                                {!att.isCompleted && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-[9px] font-extrabold uppercase">
                                    Interrupted / In Progress ({att.answeredCount ?? 0} Ans)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-yellow-400">
                                {att.studentAdmNo}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-yellow-400 font-mono font-bold text-[10px]">
                              {att.studentClass}
                            </span>
                          </div>

                          {/* Scores summary row */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-center text-[11px]">
                            <div>
                              <div className="text-slate-500 text-[10px] font-bold uppercase">Status</div>
                              <div className="text-slate-300 font-mono text-[10px]">
                                {att.isCompleted && att.submittedAt
                                  ? new Date(att.submittedAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : `Saved (${att.answeredCount ?? 0} Ans)`}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[10px] font-bold uppercase">Obj Score</div>
                              <div className="text-blue-300 font-bold font-mono">{att.objectiveScore} pts</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[10px] font-bold uppercase">Exam Total</div>
                              <div className="text-emerald-400 font-black font-mono">{dynamicTotal} pts</div>
                            </div>
                          </div>

                          {/* Power-Off Recovery Controls */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleReopenAttempt(att.id, att.studentFullName)}
                              disabled={recoveringAttemptId === att.id}
                              className="flex-1 py-1.5 px-2.5 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition"
                              title="Re-open exam and add extra time while preserving all student answers"
                            >
                              <RotateCcw className="w-3 h-3 text-cyan-400" />
                              <span>Resume (+Time, Keep Ans)</span>
                            </button>
                            {!att.isCompleted && (
                              <button
                                type="button"
                                onClick={() => handleForceSubmitInterrupted(att.id, att.studentFullName, att.answeredCount)}
                                disabled={recoveringAttemptId === att.id}
                                className="flex-1 py-1.5 px-2.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition"
                                title="Finalize and grade the student's auto-saved answers"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Grade Saved ({att.answeredCount ?? 0})</span>
                              </button>
                            )}
                          </div>

                          {/* Theory input and action buttons */}
                          <div className="flex items-center gap-2 pt-1">
                            <div className="flex-1 flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                              <span className="text-[11px] font-bold text-slate-400 shrink-0">Theory:</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={gradingScores[att.id] ?? ""}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setGradingScores((prev) => ({
                                    ...prev,
                                    [att.id]: raw === "" ? "" : Math.max(0, parseInt(raw, 10) || 0),
                                  }));
                                }}
                                onBlur={() => {
                                  if (gradingScores[att.id] === "") {
                                    setGradingScores((prev) => ({ ...prev, [att.id]: 0 }));
                                  }
                                }}
                                className="w-full bg-transparent text-white font-mono font-bold text-base focus:outline-none"
                                placeholder="0"
                              />
                              {att.theoryScore === null && (
                                <span className="text-[9px] text-yellow-400/90 font-medium shrink-0">
                                  Pending
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleSaveTheoryScore(att.id)}
                              disabled={isSaving}
                              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                                isSaved
                                  ? "bg-emerald-600 text-white"
                                  : "bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow"
                              }`}
                            >
                              {isSaving ? (
                                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                              ) : isSaved ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Saved</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleClearSingleAttempt(att.id, att.studentFullName)}
                              disabled={isClearingId === att.id}
                              className="p-2.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-900 text-rose-300 rounded-xl transition flex items-center justify-center active:scale-95 shrink-0"
                              title={`Clear attempt for ${att.studentFullName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Grading Table View (Hidden on mobile) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
                          <th className="p-3.5">Candidate Details</th>
                          <th className="p-3.5">Class</th>
                          <th className="p-3.5">Status / Recovery</th>
                          <th className="p-3.5">Auto Objective Score</th>
                          <th className="p-3.5">Physical Theory Score</th>
                          <th className="p-3.5">Total Examination Score</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {gradingAttempts.map((att) => {
                          const isSaving = savingAttemptId === att.id;
                          const isSaved = saveSuccessMsg[att.id];
                          const currentTheoryInput = Number(gradingScores[att.id] ?? 0) || 0;
                          const dynamicTotal = att.objectiveScore + currentTheoryInput;

                          return (
                            <tr key={att.id} className="hover:bg-slate-900/40 transition">
                              <td className="p-3.5">
                                <div className="font-bold text-white text-sm">
                                  {att.studentFullName}
                                </div>
                                <div className="text-[11px] font-mono text-yellow-400">
                                  {att.studentAdmNo}
                                </div>
                              </td>

                              <td className="p-3.5 font-bold text-slate-300">
                                {att.studentClass}
                              </td>

                              <td className="p-3.5 text-[11px]">
                                {att.isCompleted ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Submitted ({att.answeredCount ?? 0} Ans)</span>
                                    </span>
                                    {att.submittedAt && (
                                      <div className="text-slate-400 font-mono text-[10px]">
                                        {new Date(att.submittedAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-[10px] font-bold">
                                      <Clock className="w-3 h-3" />
                                      <span>In Progress / System Off ({att.answeredCount ?? 0} Ans Saved)</span>
                                    </span>
                                    {att.remainingSeconds != null && (
                                      <div className="text-cyan-300 font-mono text-[10px]">
                                        Checkpoint Time Left: {Math.ceil(att.remainingSeconds / 60)}m
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="p-3.5">
                                <span className="px-2.5 py-1 rounded-md bg-blue-950 border border-blue-800 text-blue-300 font-bold font-mono">
                                  {att.objectiveScore} pts
                                </span>
                              </td>

                              {/* Inline Theory Input */}
                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={gradingScores[att.id] ?? ""}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      setGradingScores((prev) => ({
                                        ...prev,
                                        [att.id]: raw === "" ? "" : Math.max(0, parseInt(raw, 10) || 0),
                                      }));
                                    }}
                                    onBlur={() => {
                                      if (gradingScores[att.id] === "") {
                                        setGradingScores((prev) => ({ ...prev, [att.id]: 0 }));
                                      }
                                    }}
                                    className="w-20 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-yellow-500 text-center"
                                  />
                                  {att.theoryScore === null && (
                                    <span className="text-[10px] text-yellow-400/90 font-medium">
                                      (Pending)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Total Score */}
                              <td className="p-3.5">
                                <span className="text-sm font-black text-emerald-400 font-mono">
                                  {dynamicTotal} pts
                                </span>
                              </td>

                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => handleSaveTheoryScore(att.id)}
                                    disabled={isSaving}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                      isSaved
                                        ? "bg-emerald-600 text-white"
                                        : "bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow"
                                    }`}
                                  >
                                    {isSaving ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                        <span>Saving</span>
                                      </>
                                    ) : isSaved ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Saved!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Save Mark</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleReopenAttempt(att.id, att.studentFullName)}
                                    disabled={recoveringAttemptId === att.id}
                                    className="px-2.5 py-1.5 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                                    title="Power-Off Recovery: Re-open student exam with extra time while keeping all saved answers"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Resume (+Time)</span>
                                  </button>

                                  {!att.isCompleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleForceSubmitInterrupted(att.id, att.studentFullName, att.answeredCount)}
                                      disabled={recoveringAttemptId === att.id}
                                      className="px-2.5 py-1.5 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                                      title="Finalize and grade the student's auto-saved answers"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Grade Saved</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleClearSingleAttempt(att.id, att.studentFullName)}
                                    disabled={isClearingId === att.id}
                                    className="p-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-900 text-rose-300 rounded-lg text-xs transition flex items-center gap-1 active:scale-95"
                                    title={`Clear attempt for ${att.studentFullName}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                    <span className="hidden lg:inline">Clear</span>
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
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: TEACHER QUESTION SUBMISSIONS REVIEW                         */}
        {/* ================================================================== */}
        {activeTab === "submissions" && (
          <TeacherSubmissionsTab
            initialSubmissions={initialSubmissions}
            onExamCreated={(newExam) => {
              if (newExam) {
                setExams((prev) => [newExam, ...prev.filter((e) => e.id !== newExam.id)]);
                setSelectedExamIdForQuestions(newExam.id);
              }
              router.refresh();
            }}
          />
        )}

        {/* ================================================================== */}
        {/* TAB 5: STUDENT REGISTRATION & REGNO COMMAND DESK                   */}
        {/* ================================================================== */}
        {activeTab === "students" && (
          <StudentRegistryTab
            initialStudents={initialStudents}
            onPrepareResult={handlePrepareResultFromRegistry}
          />
        )}

        {/* ================================================================== */}
        {/* TAB 6: STAFF & TEACHER ACCOUNTS DESK                               */}
        {/* ================================================================== */}
        {activeTab === "staff" && (
          <StaffManagementTab initialTeachers={initialTeachers} />
        )}

        {/* ================================================================== */}
        {/* TAB 7: TERMINAL RESULT PREPARATION DESK                            */}
        {/* ================================================================== */}
        {activeTab === "results" && (
          <TerminalResultPreparationTab
            initialResults={initialResults}
            initialStudents={initialStudents}
            prefillTarget={prefillResultTarget}
            onClearPrefill={() => setPrefillResultTarget(null)}
          />
        )}

        {/* ================================================================== */}
        {/* TAB 8: SCRATCH CARD GENERATOR DESK                                 */}
        {/* ================================================================== */}
        {activeTab === "cards" && (
          <ScratchCardGeneratorTab initialCardsData={initialCardsData} />
        )}

        {/* Modal: Edit Exam Paper Settings (Time, Subject, Class, Title) */}
        {editingExamForSettings && (
          <div className="sheet-overlay fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="sheet-panel bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Edit Exam Course Settings</h3>
                    <p className="text-[11px] text-slate-400">
                      Update allocated time, subject, target class and publishing status
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingExamForSettings(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveExamSettings} className="space-y-3.5">
                <input type="hidden" name="examId" value={editingExamForSettings.id} />

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Exam Title / Label
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingExamForSettings.title}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-yellow-500"
                    placeholder="e.g. First Term Examination"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Subject Name
                    </label>
                    <input
                      type="text"
                      name="subject"
                      required
                      defaultValue={editingExamForSettings.subject}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-yellow-500"
                      placeholder="e.g. Mathematics"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Target Class
                    </label>
                    <input
                      type="text"
                      name="targetClass"
                      required
                      defaultValue={editingExamForSettings.targetClass}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-yellow-500"
                      placeholder="e.g. SS 1, JSS 2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-secondary-400" />
                    Allocated Duration / Exam Time (Minutes)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="durationMinutes"
                      required
                      min="5"
                      max="360"
                      defaultValue={editingExamForSettings.durationMinutes || 60}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-yellow-500"
                      placeholder="e.g. 60"
                    />
                    <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-bold">mins</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Duration countdown timer allotted for students in the CBT examination engine
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-white block">Has Theory Questions?</span>
                    <span className="text-[10px] text-slate-400">Enable physical theory prompt booklet section</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="hasTheory"
                      defaultChecked={editingExamForSettings.hasTheory}
                      className="w-4 h-4 rounded text-secondary-400 bg-slate-900 border-slate-700"
                    />
                    <span className="text-secondary-400 font-bold text-xs">Enabled</span>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-white block">Active / Published</span>
                    <span className="text-[10px] text-slate-400">Make this exam visible for student login</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={editingExamForSettings.isActive}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-emerald-400 font-bold text-xs">Active</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingExamForSettings(null)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-secondary-400 hover:bg-secondary-300 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow active:scale-95 cursor-pointer font-black"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isPending ? "Saving..." : "Save Exam Settings"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Custom Subject Creator Modal */}
        {isQuickSubjectModalOpen && (
          <div className="sheet-overlay fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="sheet-panel bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Create Custom Subject Paper</h3>
                    <p className="text-[11px] text-slate-400">Define a new subject or exam for the Question Uploader</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickSubjectModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {quickSubjectFormError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                  {quickSubjectFormError}
                </div>
              )}

              <form onSubmit={handleCreateQuickSubject} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Subject Name (Type custom or select standard)
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    list="gfms-standard-subjects"
                    placeholder="e.g. Further Mathematics, Robotics, Civic Education"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  <datalist id="gfms-standard-subjects">
                    <option value="Mathematics" />
                    <option value="English Language" />
                    <option value="Biology" />
                    <option value="Chemistry" />
                    <option value="Physics" />
                    <option value="Further Mathematics" />
                    <option value="Economics" />
                    <option value="Government" />
                    <option value="Literature in English" />
                    <option value="Agricultural Science" />
                    <option value="Civic Education" />
                    <option value="Computer Studies / ICT" />
                    <option value="Commerce" />
                    <option value="Financial Accounting" />
                    <option value="Christian Religious Knowledge (CRK)" />
                    <option value="Geography" />
                    <option value="Technical Drawing" />
                    <option value="Data Processing" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Paper Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue="First Term Examination"
                    placeholder="e.g. First Term Examination"
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Target Class
                    </label>
                    <select
                      name="targetClass"
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="SS 1">SS 1 (All Streams)</option>
                      <option value="SS 1 (Science)">SS 1 (Science)</option>
                      <option value="SS 1 (Art)">SS 1 (Art)</option>
                      <option value="SS 1 (Commercial)">SS 1 (Commercial)</option>
                      <option value="SS 2">SS 2 (All - 64)</option>
                      <option value="SS 2 (Science)">SS 2 (Science - 29)</option>
                      <option value="SS 2 (Art)">SS 2 (Art - 35)</option>
                      <option value="SS 2 (Commercial)">SS 2 (Commercial)</option>
                      <option value="SS 3">SS 3 (All - 74)</option>
                      <option value="SS 3 (Science)">SS 3 (Science - 37)</option>
                      <option value="SS 3 (Art)">SS 3 (Art - 37)</option>
                      <option value="SS 3 (Commercial)">SS 3 (Commercial)</option>
                      <option value="JSS 1">JSS 1 (Diamond)</option>
                      <option value="JSS 2">JSS 2 (Diamond)</option>
                      <option value="JSS 3">JSS 3 (Platinum)</option>
                      <option value="SS 1 - SS 3">All Senior Secondary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      name="durationMinutes"
                      required
                      min={10}
                      max={240}
                      defaultValue={60}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <input type="hidden" name="examDate" value={new Date().toISOString().slice(0, 16)} />
                <input type="hidden" name="hasTheory" value="true" />
                <input type="hidden" name="isActive" value="true" />

                <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickSubjectModalOpen(false)}
                    className="px-4 py-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-3 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isPending ? "Creating..." : "Create Subject & Start Authoring"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Question Diagram Lightbox Modal */}
        {lightboxImageUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxImageUrl(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-yellow-400" />
                  Question Diagram / Figure Lightbox
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxImageUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-2 overflow-auto flex items-center justify-center max-h-[78vh]">
                <img
                  src={lightboxImageUrl}
                  alt="Expanded Diagram"
                  className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
        {/* Mobile Floating Action Button (FAB) */}
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 md:hidden flex flex-col items-end gap-2 pointer-events-auto">
          {activeTab === "exams" && (
            <button
              type="button"
              onClick={() => {
                setIsCreateExamOpen(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-extrabold text-xs rounded-full shadow-2xl border border-blue-400/40 active:scale-95 transition"
            >
              <PlusCircle className="w-5 h-5 text-yellow-300" />
              <span>+ New Exam</span>
            </button>
          )}
          {activeTab === "questions" && (
            <button
              type="button"
              onClick={() => {
                setIsQuickSubjectModalOpen(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs rounded-full shadow-2xl border border-emerald-400/40 active:scale-95 transition"
            >
              <PlusCircle className="w-5 h-5 text-white" />
              <span>+ Custom Subject</span>
            </button>
          )}
        </div>

        {/* Floating Math Keyboard Button & Modal for Admin Questions */}
        {activeTab === "questions" && (
          <>
            <FloatingMathButton
              onClick={() => setIsAdminMathOpen(true)}
              label="Math &amp; Science Symbols"
              shortLabel="Math (x²)"
            />
            <MathToolbar
              isModal
              isOpen={isAdminMathOpen}
              onClose={() => setIsAdminMathOpen(false)}
              targetInputId={adminMathTargetId}
            />
          </>
        )}
      </main>
    </div>
  );
}
