"use client";

import React, { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Upload,
  FileText,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ImageIcon,
  Eye,
  LogOut,
  ChevronLeft,
  Calendar,
  Layers,
  Send,
  Sparkles,
  HelpCircle,
  ClipboardList,
  Save,
  Check,
  UserCheck,
  Percent,
  Search,
  ExternalLink,
  ZoomIn,
  Edit3,
  Shield,
  Lock,
  X,
  ChevronRight,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Flag,
} from "lucide-react";
import { AdminSession, FlaggedQuestionSummaryItem } from "@/types/cbt";
import { adminLogoutAction } from "@/app/actions/cbt-auth";
import {
  submitTeacherQuestionsAction,
  deleteTeacherSubmissionAction,
  ManualQuestionItem,
} from "@/app/actions/teacher-submissions";
import {
  getTeacherGradingAttemptsAction,
  saveAndTransmitTheoryScoreAction,
  TeacherGradingRow,
} from "@/app/actions/teacher-grading";
import {
  forceSubmitInterruptedAttemptAction,
  getAdminExamWithQuestionsAction,
  getExamGradingAttemptsAction,
  getFlaggedQuestionsSummaryAction,
  updateExamDurationAction,
  updateObjectiveQuestionAction,
} from "@/app/actions/cbt-admin";
import { downloadExamScoresPdf } from "@/lib/pdf-score-export";
import { doesTeacherMatchExam, isAttemptAwaitingTheory } from "@/lib/cbt-utils";
import { MathToolbar, FloatingMathButton } from "@/components/cbt/MathToolbar";
import { FormattedMathText } from "@/components/cbt/FormattedMathText";
import { FlaggedQuestionsModal } from "@/components/cbt/FlaggedQuestionsModal";
import DelegatedSubjectScoreUploader from "@/components/results/DelegatedSubjectScoreUploader";

interface Props {
  teacher: AdminSession | null;
  initialSubmissions: any[];
  initialGradingAttempts?: TeacherGradingRow[];
  initialExams?: any[];
  initialStudents?: any[];
  initialFlaggedQuestions?: FlaggedQuestionSummaryItem[];
}

export default function TeacherQuestionDeskClient({
  teacher,
  initialSubmissions,
  initialGradingAttempts = [],
  initialExams = [],
  initialStudents = [],
  initialFlaggedQuestions = [],
}: Props) {
  const [activeWorkspace, setActiveWorkspace] = useState<"questions" | "grading" | "exams" | "scores">("questions");
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions);
  const [gradingAttempts, setGradingAttempts] = useState<TeacherGradingRow[]>(initialGradingAttempts);
  const [myExams, setMyExams] = useState<any[]>(initialExams);
  const [flaggedQuestions, setFlaggedQuestions] = useState<FlaggedQuestionSummaryItem[]>(initialFlaggedQuestions);
  const [flaggedModalConfig, setFlaggedModalConfig] = useState<{
    title: string;
    subtitle?: string;
    items: FlaggedQuestionSummaryItem[];
    highlightStudentAdmNo?: string | null;
  } | null>(null);
  const [loadingFlaggedModal, setLoadingFlaggedModal] = useState(false);

  useEffect(() => {
    setGradingAttempts(initialGradingAttempts);
  }, [initialGradingAttempts]);

  useEffect(() => {
    setSubmissions(initialSubmissions);
  }, [initialSubmissions]);

  useEffect(() => {
    setMyExams(initialExams);
  }, [initialExams]);

  useEffect(() => {
    setFlaggedQuestions(initialFlaggedQuestions);
  }, [initialFlaggedQuestions]);

  const [gradingSearchQuery, setGradingSearchQuery] = useState("");
  const [gradingClassFilter, setGradingClassFilter] = useState("ALL");
  const [gradingExamFilter, setGradingExamFilter] = useState("ALL");
  const [gradingStatusFilter, setGradingStatusFilter] = useState<"ALL" | "AWAITING" | "TRANSMITTED" | "IN_PROGRESS" | "FLAGGED">("ALL");
  const [refreshingAttempts, setRefreshingAttempts] = useState(false);
  const [recoveringAttemptId, setRecoveringAttemptId] = useState<number | null>(null);
  const [tempScores, setTempScores] = useState<Record<number, number>>({});
  const [tempComments, setTempComments] = useState<Record<number, string>>({});
  const [savingAttemptId, setSavingAttemptId] = useState<number | null>(null);
  const [transmitSuccess, setTransmitSuccess] = useState<Record<number, boolean>>({});
  const [isPending, startTransition] = useTransition();

  // Draft & Edit state
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [submissionsFilter, setSubmissionsFilter] = useState<"ALL" | "DRAFT" | "PENDING" | "APPROVED">("ALL");
  const [unsavedDraftAvailable, setUnsavedDraftAvailable] = useState<boolean>(false);

  // Exam preview modal
  const [selectedExamForModal, setSelectedExamForModal] = useState<any | null>(null);
  const [loadingExamDetails, setLoadingExamDetails] = useState(false);
  const [examSearchQuery, setExamSearchQuery] = useState("");

  // Form State
  const [submissionType, setSubmissionType] = useState<"MANUAL" | "IMAGE" | "PDF">("MANUAL");
  const [subject, setSubject] = useState(teacher?.assignedSubject || "Mathematics");
  const [subjectMode, setSubjectMode] = useState<"preset" | "custom">("preset");
  const [customSubjectInput, setCustomSubjectInput] = useState("");
  const [targetClass, setTargetClass] = useState(teacher?.assignedClass || "SS 1");
  const [durationMinutes, setDurationMinutes] = useState<string | number>(60);
  const [totalMarks, setTotalMarks] = useState<string | number>(100);
  const [instructions, setInstructions] = useState("");
  const [modalExamDurationInput, setModalExamDurationInput] = useState<string | number>(60);
  const [editingModalObjQ, setEditingModalObjQ] = useState<any | null>(null);

  // Floating Math Toolbar State
  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [mathTargetInputId, setMathTargetInputId] = useState<string>("teacher-q-text-0");

  // Manual questions array
  const [questions, setQuestions] = useState<ManualQuestionItem[]>([
    {
      questionText: "",
      options: ["", "", "", ""],
      correctAnswer: "A",
      points: 0.5,
    },
  ]);

  // File upload state (Image or PDF)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Status & Feedback
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview modal for submissions
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // File handling (Image or PDF)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setSubmissionType("PDF");
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("image/")) {
        setSubmissionType("IMAGE");
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.createElement("img");
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const maxDim = 1600;
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
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                    type: "image/jpeg",
                  });
                  setSelectedFile(compressedFile);
                  const previewUrl = canvas.toDataURL("image/jpeg", 0.82);
                  setImagePreviewUrl(previewUrl);
                } else {
                  setSelectedFile(file);
                  setImagePreviewUrl(ev.target?.result as string);
                }
              },
              "image/jpeg",
              0.82
            );
          };
          img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        setSelectedFile(file);
      }
    }
  };

  // Manual Questions handlers
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "A",
        points: 0.5,
        imageUrl: null,
        questionType: "objective",
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (idx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx].questionText = text;
      return copy;
    });
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const newOpts = [...(copy[qIdx].options || ["", "", "", ""])];
      newOpts[optIdx] = val;
      copy[qIdx].options = newOpts;
      return copy;
    });
  };

  const handleCorrectAnswerChange = (qIdx: number, key: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].correctAnswer = key;
      return copy;
    });
  };

  const handlePointsChange = (qIdx: number, points: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx].points = points;
      return copy;
    });
  };

  const handleQuestionImageSelect = (idx: number, file: File) => {
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
        setQuestions((prev) => {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], imageUrl: compressedBase64 };
          return copy;
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQuestionImage = (idx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], imageUrl: null };
      return copy;
    });
  };

  const handleQuestionTypeChange = (idx: number, type: "objective" | "theory") => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        questionType: type,
        options: type === "theory" ? [] : (copy[idx].options?.length === 4 ? copy[idx].options : ["", "", "", ""]),
        correctAnswer: type === "theory" ? "" : (copy[idx].correctAnswer || "A"),
        points: type === "theory" ? (copy[idx].points < 1 ? 5 : copy[idx].points) : (copy[idx].points > 5 ? 0.5 : copy[idx].points),
      };
      return copy;
    });
  };

  const handleQuestionInstructionsChange = (idx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], instructions: text };
      return copy;
    });
  };

  // Check for unsaved draft in localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && teacher?.email) {
      try {
        const saved = localStorage.getItem(`gfms_draft_${teacher.email}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.subject && (!subject || subject === "")) {
            setUnsavedDraftAvailable(true);
          }
        }
      } catch (_) {}
    }
  }, [teacher?.email]);

  const handleRestoreLocalDraft = () => {
    if (typeof window === "undefined" || !teacher?.email) return;
    try {
      const saved = localStorage.getItem(`gfms_draft_${teacher.email}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.subject) setSubject(parsed.subject);
      if (parsed.targetClass) setTargetClass(parsed.targetClass);
      if (parsed.durationMinutes) setDurationMinutes(parsed.durationMinutes);
      if (parsed.totalMarks) setTotalMarks(parsed.totalMarks);
      if (parsed.instructions) setInstructions(parsed.instructions);
      if (parsed.submissionType) setSubmissionType(parsed.submissionType);
      if (parsed.questions && Array.isArray(parsed.questions)) setQuestions(parsed.questions);
      if (parsed.editingDraftId) setEditingDraftId(parsed.editingDraftId);
      setUnsavedDraftAvailable(false);
      setFormSuccess("Unsaved draft restored successfully!");
    } catch (_) {}
  };

  const handleDismissLocalDraft = () => {
    if (typeof window !== "undefined" && teacher?.email) {
      localStorage.removeItem(`gfms_draft_${teacher.email}`);
    }
    setUnsavedDraftAvailable(false);
  };

  // Draft Save Handler (Can be called anytime while writing questions)
  const handleSaveDraft = () => {
    setFormError(null);
    setFormSuccess(null);

    if (!subject) {
      setFormError("Please enter or select a Subject to save as draft.");
      return;
    }

    const formData = new FormData();
    formData.append("teacherName", teacher?.fullName || "Staff Examiner");
    formData.append("teacherEmail", teacher?.email || "greatfavourmontessorischool@gmail.com");
    formData.append("subject", subject);
    formData.append("targetClass", targetClass);
    formData.append("submissionType", submissionType);
    formData.append("durationMinutes", String(durationMinutes));
    formData.append("totalMarks", String(totalMarks));
    formData.append("instructions", instructions);
    formData.append("isDraft", "true");
    if (editingDraftId) {
      formData.append("draftId", String(editingDraftId));
    }

    if (submissionType === "MANUAL") {
      formData.append("questionsJson", JSON.stringify(questions));
    } else if (submissionType === "IMAGE" || submissionType === "PDF") {
      if (selectedFile) {
        formData.append("imageFile", selectedFile);
      } else if (imagePreviewUrl) {
        formData.append("imageUrl", imagePreviewUrl);
      }
    }

    setIsDraftSaving(true);
    startTransition(async () => {
      try {
        const res = await submitTeacherQuestionsAction(formData);
        setIsDraftSaving(false);
        if (!res || !res.success) {
          setFormError(res?.error || "Failed to save draft.");
        } else {
          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setLastDraftSavedAt(nowStr);
          const newDraftId = res.submissionId || editingDraftId;
          setEditingDraftId(newDraftId);
          setFormSuccess(`Draft saved successfully at ${nowStr}! You can safely close or resume editing later.`);

          // LocalStorage auto-save backup
          try {
            if (teacher?.email) {
              localStorage.setItem(
                `gfms_draft_${teacher.email}`,
                JSON.stringify({
                  subject,
                  targetClass,
                  durationMinutes,
                  totalMarks,
                  instructions,
                  submissionType,
                  questions,
                  editingDraftId: newDraftId,
                  savedAt: new Date().toISOString(),
                })
              );
            }
          } catch (_) {}

          // Update local submissions list
          setSubmissions((prev) => {
            const existingIdx = prev.findIndex((s) => s.id === newDraftId);
            const draftRecord = {
              id: newDraftId,
              teacherName: teacher?.fullName || "Teacher",
              teacherEmail: teacher?.email,
              subject,
              targetClass,
              submissionType,
              durationMinutes,
              totalMarks,
              status: "DRAFT",
              createdAt: new Date(),
              imageUrl: imagePreviewUrl,
              questionData: submissionType === "MANUAL" ? JSON.stringify(questions) : null,
              instructions,
            };
            if (existingIdx >= 0) {
              const copy = [...prev];
              copy[existingIdx] = { ...copy[existingIdx], ...draftRecord };
              return copy;
            }
            return [draftRecord, ...prev];
          });
        }
      } catch (err: any) {
        setIsDraftSaving(false);
        setFormError(err?.message || "Failed to save draft due to connection error.");
      }
    });
  };

  // Final Submit Handler (Submits to Super Admin with status = PENDING)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!subject) {
      setFormError("Please enter or select a Subject.");
      return;
    }

    if (submissionType === "MANUAL") {
      const emptyQ = questions.find((q) => !q.questionText.trim());
      if (emptyQ) {
        setFormError("Please ensure all manual questions have question prompts before final submission.");
        return;
      }
    } else if (submissionType === "IMAGE" || submissionType === "PDF") {
      if (!selectedFile && !imagePreviewUrl) {
        setFormError(`Please select ${submissionType === "PDF" ? "a PDF" : "an image"} file of your question paper.`);
        return;
      }
    }

    const formData = new FormData();
    formData.append("teacherName", teacher?.fullName || "Staff Examiner");
    formData.append("teacherEmail", teacher?.email || "greatfavourmontessorischool@gmail.com");
    formData.append("subject", subject);
    formData.append("targetClass", targetClass);
    formData.append("submissionType", submissionType);
    formData.append("durationMinutes", String(durationMinutes));
    formData.append("totalMarks", String(totalMarks));
    formData.append("instructions", instructions);
    formData.append("isDraft", "false"); // Final submission
    if (editingDraftId) {
      formData.append("draftId", String(editingDraftId));
    }

    if (submissionType === "MANUAL") {
      formData.append("questionsJson", JSON.stringify(questions));
    } else if (submissionType === "IMAGE" || submissionType === "PDF") {
      if (selectedFile) {
        formData.append("imageFile", selectedFile);
      } else if (imagePreviewUrl) {
        formData.append("imageUrl", imagePreviewUrl);
      }
    }

    startTransition(async () => {
      try {
        const res = await submitTeacherQuestionsAction(formData);
        if (!res || !res.success) {
          setFormError(
            res?.error ||
              "Submission was rejected by the server. If you attached a large file, please ensure ModSecurity is disabled in cPanel or try uploading a smaller image."
          );
        } else {
          setFormSuccess("Question paper submitted successfully! Super Admin will review and import into CBT.");
          const submittedId = res.submissionId || editingDraftId;
          setEditingDraftId(null);
          setLastDraftSavedAt(null);

          // Clear local backup
          try {
            if (teacher?.email) {
              localStorage.removeItem(`gfms_draft_${teacher.email}`);
            }
          } catch (_) {}

          // Reset form
          setSubject("");
          setInstructions("");
          setSelectedFile(null);
          setImagePreviewUrl(null);
          setQuestions([
            {
              questionText: "",
              options: ["", "", "", ""],
              correctAnswer: "A",
              points: 0.5,
              imageUrl: null,
              questionType: "objective",
            },
          ]);

          // Update local list
          setSubmissions((prev) => {
            const existingIdx = prev.findIndex((s) => s.id === submittedId);
            const submittedRecord = {
              id: submittedId,
              teacherName: teacher?.fullName || "Teacher",
              teacherEmail: teacher?.email,
              subject,
              targetClass,
              submissionType,
              durationMinutes,
              totalMarks,
              status: "PENDING",
              createdAt: new Date(),
              imageUrl: imagePreviewUrl,
              questionData: submissionType === "MANUAL" ? JSON.stringify(questions) : null,
              instructions,
            };
            if (existingIdx >= 0) {
              const copy = [...prev];
              copy[existingIdx] = { ...copy[existingIdx], ...submittedRecord };
              return copy;
            }
            return [submittedRecord, ...prev];
          });
        }
      } catch (err: any) {
        setFormError(
          err?.message ||
            "Server connection error. If you uploaded a large file, ensure ModSecurity is disabled in cPanel."
        );
      }
    });
  };

  // Resume editing a saved draft
  const handleResumeDraft = (sub: any) => {
    setEditingDraftId(sub.id);
    setSubject(sub.subject || "");
    setTargetClass(sub.targetClass || "SS 1");
    setDurationMinutes(sub.durationMinutes || 60);
    setTotalMarks(sub.totalMarks || 100);
    setInstructions(sub.instructions || "");
    setSubmissionType(sub.submissionType || "MANUAL");

    if (sub.questionData) {
      try {
        const parsed = JSON.parse(sub.questionData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed);
        }
      } catch (e) {
        console.warn("Could not parse draft questions:", e);
      }
    }
    if (sub.imageUrl) {
      setImagePreviewUrl(sub.imageUrl);
    }

    setFormError(null);
    setFormSuccess(`Draft #${sub.id} ("${sub.subject}") loaded into editor. You can continue adding questions or submit when complete.`);
    setActiveWorkspace("questions");
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Cancel draft editing and clear form
  const handleCancelEditingDraft = () => {
    setEditingDraftId(null);
    setSubject("");
    setInstructions("");
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setQuestions([
      {
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "A",
        points: 0.5,
        imageUrl: null,
        questionType: "objective",
      },
    ]);
    setFormSuccess("Draft editing cancelled. Editor reset for a new paper.");
  };

  // Delete draft or submission
  const handleDeleteSubmission = (id: number, subSubject?: string) => {
    if (!confirm(`Are you sure you want to delete this question draft/submission for "${subSubject || "this paper"}"?`)) return;
    startTransition(async () => {
      const res = await deleteTeacherSubmissionAction(id);
      if (res.success) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (editingDraftId === id) {
          handleCancelEditingDraft();
        }
        setFormSuccess("Draft/submission deleted successfully.");
      } else {
        setFormError(res.error || "Failed to delete submission.");
      }
    });
  };

  // Inspect questions for an approved exam
  const handleInspectExam = (examId: number) => {
    setLoadingExamDetails(true);
    startTransition(async () => {
      try {
        const res = await getAdminExamWithQuestionsAction(examId);
        setLoadingExamDetails(false);
        if (res.success && res.exam) {
          setSelectedExamForModal(res.exam);
          setModalExamDurationInput(res.exam.durationMinutes || 60);
          setEditingModalObjQ(null);
        } else {
          alert(res.error || "Could not load examination questions.");
        }
      } catch (err: any) {
        setLoadingExamDetails(false);
        alert(err?.message || "Failed to load examination details.");
      }
    });
  };

  const handleSaveModalExamDuration = () => {
    if (!selectedExamForModal) return;
    const safeMin = Math.max(5, parseInt(String(modalExamDurationInput), 10) || 60);
    setModalExamDurationInput(safeMin);
    startTransition(async () => {
      const res = await updateExamDurationAction(selectedExamForModal.id, safeMin);
      if (res.success) {
        setSelectedExamForModal((prev: any) => (prev ? { ...prev, durationMinutes: safeMin } : prev));
        setMyExams((prev) => prev.map((e) => (e.id === selectedExamForModal.id ? { ...e, durationMinutes: safeMin } : e)));
      } else {
        alert(res.error || "Failed to update exam duration.");
      }
    });
  };

  const handleSaveModalObjQuestion = () => {
    if (!editingModalObjQ || !selectedExamForModal) return;
    const fd = new FormData();
    fd.append("questionId", String(editingModalObjQ.id));
    fd.append("examId", String(selectedExamForModal.id));
    fd.append("questionText", editingModalObjQ.questionText || "");
    fd.append("optionA", editingModalObjQ.optA || "");
    fd.append("optionB", editingModalObjQ.optB || "");
    fd.append("optionC", editingModalObjQ.optC || "");
    fd.append("optionD", editingModalObjQ.optD || "");
    fd.append("correctAnswer", editingModalObjQ.correctAnswer || "A");
    fd.append("points", String(editingModalObjQ.points || 0.5));
    if (editingModalObjQ.imageUrl) {
      fd.append("imageUrl", editingModalObjQ.imageUrl);
      fd.append("removeImage", "false");
    }

    startTransition(async () => {
      const res = await updateObjectiveQuestionAction(fd);
      if (res.success) {
        const newOptionsJson = JSON.stringify([
          editingModalObjQ.optA || "",
          editingModalObjQ.optB || "",
          editingModalObjQ.optC || "",
          editingModalObjQ.optD || "",
        ]);
        setSelectedExamForModal((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            objectiveQuestions: (prev.objectiveQuestions || []).map((q: any) =>
              q.id === editingModalObjQ.id
                ? {
                    ...q,
                    questionText: editingModalObjQ.questionText,
                    options: newOptionsJson,
                    correctAnswer: editingModalObjQ.correctAnswer,
                    points: parseFloat(String(editingModalObjQ.points)) || 0.5,
                  }
                : q
            ),
          };
        });
        setEditingModalObjQ(null);
      } else {
        alert(res.error || "Failed to save question changes.");
      }
    });
  };

  // Filtered exams for current subject teacher (courses created by them OR matching their assigned subject)
  const filteredExams = myExams.filter((exam: any) => {
    if (teacher?.role === "TEACHER" && !doesTeacherMatchExam(teacher, exam)) {
      return false;
    }
    if (!examSearchQuery.trim()) return true;
    const q = examSearchQuery.toLowerCase();
    return (
      exam.title?.toLowerCase().includes(q) ||
      exam.subject?.toLowerCase().includes(q) ||
      exam.targetClass?.toLowerCase().includes(q)
    );
  });

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await adminLogoutAction();
      } catch (_) {}
      window.location.href = "/staff/login";
    });
  };

  const handleTransmitScore = (attemptId: number) => {
    const currentAtt = gradingAttempts.find((a) => a.id === attemptId);
    if (!currentAtt) return;

    const scoreToSave = tempScores[attemptId] !== undefined ? tempScores[attemptId] : currentAtt.theoryScore ?? 0;
    const commentToSave = tempComments[attemptId] ?? currentAtt.teacherComment ?? "";

    setSavingAttemptId(attemptId);
    startTransition(async () => {
      try {
        const res = await saveAndTransmitTheoryScoreAction(
          attemptId,
          scoreToSave,
          commentToSave,
          teacher?.fullName || "Subject Teacher"
        );
        setSavingAttemptId(null);
        if (res?.success && res?.updatedAttempt) {
          setGradingAttempts((prev) =>
            prev.map((a) => (a.id === attemptId ? { ...a, ...res.updatedAttempt! } : a))
          );
          setTransmitSuccess((prev) => ({ ...prev, [attemptId]: true }));
          setTimeout(() => {
            setTransmitSuccess((prev) => ({ ...prev, [attemptId]: false }));
          }, 3000);
        } else {
          alert(res?.error || "Failed to transmit score to Super Admin.");
        }
      } catch (err: any) {
        setSavingAttemptId(null);
        alert(err?.message || "Failed to transmit score due to a connection error.");
      }
    });
  };

  const authorizedAttempts = gradingAttempts.filter((a) => {
    if (teacher?.role === "TEACHER") {
      return doesTeacherMatchExam(teacher, {
        createdBy: a.examCreatedBy,
        subject: a.examSubject,
        targetClass: a.targetClass,
      });
    }
    return true;
  });

  const authorizedExamIdSet = new Set(
    myExams
      .filter((ex: any) => teacher?.role !== "TEACHER" || doesTeacherMatchExam(teacher, ex))
      .map((ex: any) => Number(ex.id))
  );

  const authorizedFlaggedQuestions = flaggedQuestions.filter((item) =>
    authorizedExamIdSet.size > 0
      ? authorizedExamIdSet.has(item.examId)
      : teacher?.role !== "TEACHER" ||
        doesTeacherMatchExam(teacher, { subject: item.examSubject, targetClass: item.targetClass })
  );

  const completedAttempts = authorizedAttempts.filter((a) => a.isCompleted);
  const awaitingTheoryCount = completedAttempts.filter((a) => isAttemptAwaitingTheory(a)).length;
  const transmittedCount = completedAttempts.filter((a) => a.isTransmittedToAdmin).length;
  const inProgressCount = authorizedAttempts.filter((a) => !a.isCompleted).length;
  const flaggedAttemptCount = authorizedAttempts.filter((a) => (a.flaggedQuestionIds?.length ?? 0) > 0).length;

  const filteredAttempts = authorizedAttempts.filter((a) => {
    const sName = (a.studentFullName || "").toLowerCase();
    const aNo = (a.studentAdmNo || "").toLowerCase();
    const exTitle = (a.examTitle || "").toLowerCase();
    const exSub = (a.examSubject || "").toLowerCase();
    const q = gradingSearchQuery.toLowerCase();
    const matchesSearch =
      sName.includes(q) || aNo.includes(q) || exTitle.includes(q) || exSub.includes(q);
    const matchesClass =
      gradingClassFilter === "ALL" ||
      a.studentClass.toLowerCase().includes(gradingClassFilter.toLowerCase()) ||
      (a.targetClass || "").toLowerCase().includes(gradingClassFilter.toLowerCase());
    const matchesExam = gradingExamFilter === "ALL" || String(a.examId) === gradingExamFilter;
    const matchesStatus =
      gradingStatusFilter === "ALL"
        ? true
        : gradingStatusFilter === "AWAITING"
        ? isAttemptAwaitingTheory(a)
        : gradingStatusFilter === "TRANSMITTED"
        ? Boolean(a.isTransmittedToAdmin)
        : gradingStatusFilter === "FLAGGED"
        ? (a.flaggedQuestionIds?.length ?? 0) > 0
        : !a.isCompleted;
    return matchesSearch && matchesClass && matchesExam && matchesStatus;
  });

  const [exportingExamId, setExportingExamId] = useState<number | null>(null);

  const handleExportTeacherScoresPdf = (mode: "obj_only" | "full" = "obj_only") => {
    const firstAtt = filteredAttempts[0];
    const effectiveSubject = firstAtt?.examSubject || teacher?.assignedSubject || "General Subject";
    const effectiveTitle = firstAtt?.examTitle || "CBT Examination";
    const effectiveClass =
      gradingClassFilter !== "ALL"
        ? gradingClassFilter
        : firstAtt?.studentClass || teacher?.assignedClass || "All Classes";

    const rows = filteredAttempts.map((att) => {
      const currentTheory = tempScores[att.id] !== undefined ? tempScores[att.id] : (att.theoryScore ?? 0);
      return {
        studentFullName: att.studentFullName,
        studentAdmNo: att.studentAdmNo,
        studentClass: att.studentClass,
        objectiveScore: att.objectiveScore,
        theoryScore: currentTheory,
        totalScore: att.objectiveScore + Number(currentTheory),
        submittedAt: att.submittedAt,
        remark: tempComments[att.id] ?? att.teacherComment,
      };
    });

    downloadExamScoresPdf({
      examTitle: effectiveTitle,
      subject: effectiveSubject,
      targetClass: effectiveClass,
      rows,
      mode,
      examinerName: teacher?.fullName || "Subject Examiner",
    });
  };

  const handleRefreshAttempts = async () => {
    setRefreshingAttempts(true);
    try {
      const [res, flaggedRes] = await Promise.all([
        getTeacherGradingAttemptsAction(
          teacher?.assignedSubject || undefined,
          teacher?.assignedClass || undefined,
          teacher?.role === "TEACHER" ? teacher?.email : undefined
        ),
        getFlaggedQuestionsSummaryAction().catch(() => ({ success: false, flaggedQuestions: [] })),
      ]);
      if (res.success && Array.isArray(res.attempts)) {
        setGradingAttempts(res.attempts);
      }
      if (flaggedRes.success && Array.isArray(flaggedRes.flaggedQuestions)) {
        setFlaggedQuestions(flaggedRes.flaggedQuestions);
      }
    } finally {
      setRefreshingAttempts(false);
    }
  };

  const handleOpenAttemptFlaggedModal = async (att: TeacherGradingRow) => {
    const matchingLocal = flaggedQuestions.filter(
      (f) => f.examId === att.examId && f.flaggedByStudents.some((s) => s.attemptId === att.id)
    );
    setFlaggedModalConfig({
      title: `Flagged Questions — ${att.studentFullName}`,
      subtitle: `${att.examSubject} (${att.targetClass}) • ${att.studentAdmNo}`,
      items: matchingLocal,
      highlightStudentAdmNo: att.studentAdmNo,
    });
    if (matchingLocal.length === 0) {
      setLoadingFlaggedModal(true);
      try {
        const res = await getFlaggedQuestionsSummaryAction(att.examId);
        if (res.success) {
          const freshMatches = res.flaggedQuestions.filter((f) =>
            f.flaggedByStudents.some((s) => s.attemptId === att.id)
          );
          setFlaggedModalConfig((prev) => (prev ? { ...prev, items: freshMatches } : prev));
        }
      } finally {
        setLoadingFlaggedModal(false);
      }
    }
  };

  const handleOpenExamFlaggedModal = async (exam?: {
    id: number;
    subject: string;
    targetClass: string;
    title: string;
  }) => {
    if (!exam) {
      setFlaggedModalConfig({
        title: "All Course Flagged Questions",
        subtitle: "Questions flagged by students across your assigned courses.",
        items: authorizedFlaggedQuestions,
      });
      return;
    }
    const localItems = authorizedFlaggedQuestions.filter((f) => f.examId === exam.id);
    setFlaggedModalConfig({
      title: `Flagged Questions — ${exam.subject} (${exam.targetClass})`,
      subtitle: exam.title,
      items: localItems,
    });
    setLoadingFlaggedModal(true);
    try {
      const res = await getFlaggedQuestionsSummaryAction(exam.id);
      if (res.success) {
        setFlaggedModalConfig((prev) => (prev ? { ...prev, items: res.flaggedQuestions } : prev));
      }
    } finally {
      setLoadingFlaggedModal(false);
    }
  };

  const handleEditFlaggedQuestionFromModal = async (item: FlaggedQuestionSummaryItem) => {
    setFlaggedModalConfig(null);
    setActiveWorkspace("exams");
    setLoadingExamDetails(true);
    try {
      const res = await getAdminExamWithQuestionsAction(item.examId);
      if (res?.success && res.exam) {
        setSelectedExamForModal(res.exam);
        setModalExamDurationInput(res.exam.durationMinutes ?? 60);
        const targetQ = (res.exam.objectiveQuestions || []).find((q: any) => q.id === item.questionId);
        if (targetQ) {
          let parsedOpts = ["", "", "", ""];
          try {
            const arr = typeof targetQ.options === "string" ? JSON.parse(targetQ.options) : targetQ.options;
            if (Array.isArray(arr)) parsedOpts = [arr[0] || "", arr[1] || "", arr[2] || "", arr[3] || ""];
          } catch {}
          setEditingModalObjQ({
            id: targetQ.id,
            questionText: targetQ.questionText || "",
            optA: parsedOpts[0],
            optB: parsedOpts[1],
            optC: parsedOpts[2],
            optD: parsedOpts[3],
            correctAnswer: targetQ.correctAnswer || "A",
            points: targetQ.points ?? 0.5,
            imageUrl: targetQ.imageUrl || null,
          });
        }
      }
    } finally {
      setLoadingExamDetails(false);
    }
  };

  const handleFinalizeInterruptedAttempt = async (attemptId: number) => {
    setRecoveringAttemptId(attemptId);
    try {
      const res = await forceSubmitInterruptedAttemptAction(attemptId);
      if (res.success) {
        await handleRefreshAttempts();
      } else {
        alert(res.error || "Could not finalize interrupted CBT attempt.");
      }
    } finally {
      setRecoveringAttemptId(null);
    }
  };

  const renderGradingStatusPill = (att: TeacherGradingRow) => {
    if (!att.isCompleted) {
      return (
        <span className="text-[10px] font-bold text-sky-300 bg-sky-950/60 border border-sky-700/70 px-2 py-0.5 rounded-full">
          In Progress ({att.answeredCount ?? 0} ans)
        </span>
      );
    }
    if (isAttemptAwaitingTheory(att)) {
      return (
        <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded-full">
          Awaiting Theory
        </span>
      );
    }
    if (att.isTransmittedToAdmin) {
      return (
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
          Transmitted
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
        Ready to Send
      </span>
    );
  };

  const handleExportSingleExamPdf = async (exam: any, mode: "obj_only" | "full" = "obj_only") => {
    setExportingExamId(exam.id);
    try {
      const res = await getExamGradingAttemptsAction(exam.id);
      if (!res.success) {
        alert(res.error || "Could not load student attempts for this exam.");
        return;
      }
      downloadExamScoresPdf({
        examTitle: exam.title || "CBT Examination",
        subject: exam.subject || teacher?.assignedSubject || "Subject",
        targetClass: exam.targetClass || "Senior Secondary",
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
        examinerName: teacher?.fullName || "Subject Examiner",
      });
    } catch (err: any) {
      alert(err?.message || "Failed to export PDF score sheet.");
    } finally {
      setExportingExamId(null);
    }
  };

  return (
    <div className="dash-mobile min-h-screen bg-slate-950 text-white pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-16">
      {/* Sticky top chrome: header + workspace strip share one sticky wrapper */}
      <div className="sticky top-0 z-30 no-print">
      {/* Header Bar */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-md">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
            <Link
              href="/"
              className="w-8 h-8 sm:w-auto sm:h-auto sm:p-2 flex items-center justify-center rounded-xl sm:rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition shrink-0"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-secondary-400 block truncate max-w-[150px] xs:max-w-[220px]">
                <span className="sm:hidden">{teacher?.fullName || "GFMS Staff"}</span>
                <span className="hidden sm:inline">GFMS Staff Console</span>
              </span>
              <h1 className="text-xs sm:text-base font-black text-white truncate flex items-center gap-1.5">
                <span className="sm:hidden flex items-center gap-1 min-w-0">
                  <span className="truncate">
                    {activeWorkspace === "questions"
                      ? "Question Desk"
                      : activeWorkspace === "grading"
                      ? "Grading Desk"
                      : activeWorkspace === "scores"
                      ? "Scores Upload"
                      : "My Exams"}
                  </span>
                  {activeWorkspace === "grading" && awaitingTheoryCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white shadow shrink-0">
                      {awaitingTheoryCount}
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline">Teacher Question Submission Desk</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block truncate max-w-[160px] lg:max-w-none">
                {teacher?.fullName || "Honored Teacher"}
              </span>
              <span className="text-[10px] text-secondary-400 font-mono block">
                {teacher?.role === "SUPER_ADMIN" ? "Super Admin" : "Teacher / Examiner"}
              </span>
            </div>
            {teacher?.role === "SUPER_ADMIN" && (
              <Link
                href="/admin/cbt"
                className="h-8 sm:h-auto flex items-center text-[10px] sm:text-xs font-extrabold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition shadow-sm shrink-0"
              >
                <span className="hidden sm:inline">Admin Center</span>
                <span className="sm:hidden">Admin</span>
              </Link>
            )}
            <button
              onClick={handleLogout}
              aria-label="Sign Out"
              title="Sign Out"
              className="w-8 h-8 sm:w-auto sm:h-auto justify-center inline-flex items-center gap-1 text-xs font-bold text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 sm:px-3 sm:py-1.5 rounded-lg transition shrink-0 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Switcher Bar (tabs on >= sm; phones get the bottom tab bar) */}
      <div className="bg-slate-900/90 border-b border-white/10 px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="hidden sm:flex sm:items-center gap-2">
            <button
              onClick={() => setActiveWorkspace("questions")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeWorkspace === "questions"
                  ? "bg-blue-700 text-white shadow"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span className="truncate">Question Desk &amp; Drafts</span>
              <span className="bg-slate-950 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                {submissions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspace("grading")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeWorkspace === "grading"
                  ? "bg-yellow-500 text-slate-950 font-black shadow"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Theory &amp; CBT</span>
              {awaitingTheoryCount > 0 ? (
                <span className="bg-rose-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                  {awaitingTheoryCount}
                </span>
              ) : (
                <span className="bg-slate-950 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                  {authorizedAttempts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveWorkspace("exams")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeWorkspace === "exams"
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">My Subject Exams</span>
              <span className="bg-slate-950 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                {myExams.filter((ex: any) => teacher?.role !== "TEACHER" || doesTeacherMatchExam(teacher, ex)).length}
              </span>
            </button>

            <button
              onClick={() => setActiveWorkspace("scores")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeWorkspace === "scores"
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
              <span className="truncate">CA &amp; Exam Score Upload</span>
            </button>
          </div>

          <div className="text-[10px] sm:text-xs text-slate-400 font-medium flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
              <BookOpen className="w-3 h-3 text-emerald-400" />
              {teacher?.assignedSubject ? teacher.assignedSubject : "All Subjects"}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
              <Layers className="w-3 h-3 text-secondary-400" />
              {teacher?.assignedClass ? teacher.assignedClass : "All Classes"}
            </span>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Bottom Tab Bar (< sm) */}
      <nav
        aria-label="Teacher workspaces"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.7)] pb-safe"
      >
        <div className="grid grid-cols-4 h-16">
          {(
            [
              {
                id: "questions",
                label: "Questions",
                icon: Upload,
                badge: submissions.filter((s) => s.status === "DRAFT" || s.status === "PENDING").length,
              },
              { id: "grading", label: "Grading", icon: ClipboardList, badge: awaitingTheoryCount },
              { id: "exams", label: "My Exams", icon: BookOpen, badge: 0 },
              { id: "scores", label: "Scores", icon: FileSpreadsheet, badge: 0 },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeWorkspace === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveWorkspace(item.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                  isActive ? "text-secondary-400" : "text-slate-400"
                }`}
              >
                <span
                  className={`absolute top-0 h-0.5 w-10 rounded-full transition-all ${
                    isActive ? "bg-secondary-400 opacity-100" : "opacity-0"
                  }`}
                />
                <span
                  className={`relative flex items-center justify-center w-12 h-7 rounded-full transition ${
                    isActive ? "bg-secondary-400/15" : ""
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-slate-950 shadow-md animate-pulse">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] leading-none ${isActive ? "font-black" : "font-semibold"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-6 sm:space-y-8">
        {/* ================================================================== */}
        {/* WORKSPACE 1: QUESTION SUBMISSIONS & DRAFTS                          */}
        {/* ================================================================== */}
        {activeWorkspace === "questions" && (
          <div className="space-y-8">
        {/* Unsaved Local Draft Notification Banner */}
        {unsavedDraftAvailable && !editingDraftId && (
          <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>We detected an unsaved question draft stored locally in your browser. Would you like to restore it?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreLocalDraft}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition"
              >
                Restore Draft
              </button>
              <button
                type="button"
                onClick={handleDismissLocalDraft}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Intro Alert Banner */}
        <div className="bg-gradient-to-r from-primary-950 via-primary-900 to-slate-900 border border-primary-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-secondary-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Academic Submission &amp; Draft Protocol</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Draft &amp; Submit Examination Papers for CBT Verification
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Subject teachers can prepare questions gradually, save work as <strong>Draft</strong> at any stage to resume later, or submit finalized papers directly to Super Admin for live CBT deployment.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setSubmissionType("MANUAL")}
              className={`px-2 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 ${
                submissionType === "MANUAL"
                  ? "bg-secondary-400 text-slate-950 shadow-md"
                  : "bg-white/10 text-slate-300 hover:bg-white/15"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Manual</span>
            </button>
            <button
              type="button"
              onClick={() => setSubmissionType("IMAGE")}
              className={`px-2 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 ${
                submissionType === "IMAGE"
                  ? "bg-secondary-400 text-slate-950 shadow-md"
                  : "bg-white/10 text-slate-300 hover:bg-white/15"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
            <button
              type="button"
              onClick={() => setSubmissionType("PDF")}
              className={`px-2 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 ${
                submissionType === "PDF"
                  ? "bg-secondary-400 text-slate-950 shadow-md"
                  : "bg-white/10 text-slate-300 hover:bg-white/15"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Form Error / Success */}
        {formError && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700/60 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        {formSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6">
          {/* Active Editing Draft Banner */}
          {editingDraftId && (
            <div className="bg-amber-950/80 border border-amber-500/60 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 text-xs shadow-md">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold block text-white text-xs">
                    Currently Editing Draft #{editingDraftId}: {subject || "Untitled"} ({targetClass})
                  </span>
                  <span className="text-[11px] text-amber-300">
                    You can add questions and save your draft anytime, or submit to Admin when finalized.
                    {lastDraftSavedAt && ` (Last saved at ${lastDraftSavedAt})`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEditingDraft}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs shrink-0 transition"
              >
                Cancel / Start Fresh
              </button>
            </div>
          )}

          <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {submissionType === "MANUAL" ? (
                  <FileText className="w-4 h-4 text-secondary-400" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-secondary-400" />
                )}
                <span>
                  {submissionType === "MANUAL"
                    ? "Step 1: Enter Subject, Class & Type Questions"
                    : "Step 1: Upload Question Paper Sheet / Image"}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ensure duration in minutes and total marks match your department scheme. You can save as a Draft anytime.
              </p>
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-secondary-400">
              Format: {submissionType}
            </span>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Select Subject Name *
              </label>
              {subjectMode === "preset" ? (
                <div className="space-y-1">
                  <select
                    value={subject}
                    onChange={(e) => {
                      if (e.target.value === "CUSTOM") {
                        setSubjectMode("custom");
                        setCustomSubjectInput("");
                      } else {
                        setSubject(e.target.value);
                      }
                    }}
                    className="w-full text-base sm:text-xs px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:ring-2 focus:ring-secondary-400 focus:outline-none font-semibold"
                  >
                    {teacher?.assignedSubject && (
                      <option value={teacher.assignedSubject}>
                        ★ {teacher.assignedSubject} (Teacher&apos;s Assigned Subject)
                      </option>
                    )}
                    {Array.from(new Set([
                      ...(myExams.map((e) => e.subject).filter(Boolean)),
                      "Mathematics",
                      "English Language",
                      "Civic Education",
                      "Basic Science",
                      "Basic Technology",
                      "Physics",
                      "Chemistry",
                      "Biology",
                      "Economics",
                      "Agricultural Science",
                      "Computer Studies / ICT",
                      "Christian Religious Studies",
                      "Islamic Religious Studies",
                      "Social Studies",
                      "Government",
                      "Commerce",
                      "Financial Accounting",
                      "Literature in English",
                      "Further Mathematics",
                      "Physical & Health Education"
                    ]))
                      .filter((s) => s !== teacher?.assignedSubject)
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    <option value="CUSTOM">-- Type Custom Subject --</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Further Mathematics..."
                    value={customSubjectInput}
                    onChange={(e) => {
                      setCustomSubjectInput(e.target.value);
                      setSubject(e.target.value);
                    }}
                    className="w-full text-base sm:text-xs px-3 py-2 rounded-xl bg-slate-800 border border-secondary-400 text-white placeholder-slate-500 focus:ring-2 focus:ring-secondary-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSubjectMode("preset");
                      setSubject(teacher?.assignedSubject || "Mathematics");
                    }}
                    className="px-2.5 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg shrink-0 font-bold"
                  >
                    Use Assigned
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Target Class *
              </label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full text-base sm:text-xs px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:ring-2 focus:ring-secondary-400 focus:outline-none"
              >
                <option value="JSS 1">JSS 1 (Junior Secondary)</option>
                <option value="JSS 2">JSS 2 (Junior Secondary)</option>
                <option value="JSS 3">JSS 3 (Junior Secondary)</option>
                <option value="SS 1">SS 1 (All Streams)</option>
                <option value="SS 1 (Science)">SS 1 (Science)</option>
                <option value="SS 1 (Art)">SS 1 (Art)</option>
                <option value="SS 1 (Commercial)">SS 1 (Commercial)</option>
                <option value="SS 2">SS 2 (All Streams - 64)</option>
                <option value="SS 2 (Science)">SS 2 (Science - 29 Pupils)</option>
                <option value="SS 2 (Art)">SS 2 (Art - 35 Pupils)</option>
                <option value="SS 2 (Commercial)">SS 2 (Commercial)</option>
                <option value="SS 3">SS 3 (All Streams - 74)</option>
                <option value="SS 3 (Science)">SS 3 (Science - 37 Pupils)</option>
                <option value="SS 3 (Art)">SS 3 (Art - 37 Pupils)</option>
                <option value="SS 3 (Commercial)">SS 3 (Commercial)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center justify-between">
                <span>Allocated Time (Mins)</span>
                <Clock className="w-3 h-3 text-secondary-400" />
              </label>
              <input
                type="number"
                min="10"
                max="240"
                value={durationMinutes}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setDurationMinutes(e.target.value)}
                onBlur={() => {
                  if (String(durationMinutes).trim() === "") setDurationMinutes(60);
                }}
                className="w-full text-base sm:text-xs px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:ring-2 focus:ring-secondary-400 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center justify-between">
                <span>Total Marks</span>
                <Award className="w-3 h-3 text-secondary-400" />
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={totalMarks}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setTotalMarks(e.target.value)}
                onBlur={() => {
                  if (String(totalMarks).trim() === "") setTotalMarks(100);
                }}
                className="w-full text-base sm:text-xs px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:ring-2 focus:ring-secondary-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              General Instructions for Students / Admin Note (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Answer all questions. Scientific calculators permitted."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full text-base sm:text-xs px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-secondary-400 focus:outline-none"
            />
          </div>

          {/* TYPE A: MANUAL QUESTIONS BUILDER */}
          {submissionType === "MANUAL" && (
            <div className="space-y-4 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-400 flex items-center gap-1.5">
                  <span>Questions Builder ({questions.length} Questions)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-3 py-1.5 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((q, qIdx) => {
                  const isTheory = q.questionType === "theory";
                  return (
                    <div
                      key={qIdx}
                      className="p-3.5 sm:p-5 rounded-2xl bg-slate-800/90 border border-white/10 space-y-4 relative group shadow-lg"
                    >
                      {/* Question Header & Format Selector */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-secondary-400 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                            {qIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">Question Prompt</span>
                          {/* Type Pill */}
                          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-white/10 ml-2">
                            <button
                              type="button"
                              onClick={() => handleQuestionTypeChange(qIdx, "objective")}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                !isTheory
                                  ? "bg-secondary-400 text-slate-950 shadow"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Objective (CBT)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuestionTypeChange(qIdx, "theory")}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                isTheory
                                  ? "bg-yellow-400 text-slate-950 shadow font-black"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Theory
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <span>{isTheory ? "Marks:" : "Points:"}</span>
                            {isTheory ? (
                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={q.points}
                                onChange={(e) =>
                                  handlePointsChange(qIdx, parseFloat(e.target.value) || 1)
                                }
                                className="w-14 text-xs px-2 py-1 rounded-lg bg-slate-900 border border-white/20 text-center text-white font-mono font-bold"
                              />
                            ) : (
                              <select
                                value={q.points}
                                onChange={(e) =>
                                  handlePointsChange(qIdx, parseFloat(e.target.value) || 0.5)
                                }
                                className="text-xs px-2 py-1 rounded-lg bg-slate-900 border border-white/20 text-white font-mono font-bold cursor-pointer"
                              >
                                <option value="0.5">1/2 pt (0.5)</option>
                                <option value="1">1 pt</option>
                                <option value="1.5">1.5 pts</option>
                                <option value="2">2 pts</option>
                                <option value="2.5">2.5 pts</option>
                                <option value="3">3 pts</option>
                                <option value="4">4 pts</option>
                                <option value="5">5 pts</option>
                              </select>
                            )}
                          </div>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(qIdx)}
                              className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-950/40 transition"
                              title="Remove Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Textarea with Math & Science Toolbar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            {isTheory ? "Theory Question Prompt / Problem Statement *" : "Objective Question Statement *"}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setMathTargetInputId(`teacher-q-text-${qIdx}`);
                              setIsMathModalOpen(true);
                            }}
                            className="text-[11px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-amber-500/30 transition active:scale-95 shadow-sm shrink-0"
                            title="Open Floating Math & Formula Keyboard for this question"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="hidden xs:inline">Insert Math / Symbol</span>
                            <span className="xs:hidden">Math</span>
                          </button>
                        </div>
                        <textarea
                          id={`teacher-q-text-${qIdx}`}
                          rows={2}
                          required
                          placeholder={
                            isTheory
                              ? `e.g. State Ohm's Law and describe an experiment to verify it...`
                              : `Enter question ${qIdx + 1} statement here (e.g. Solve for x: 2x² - 5x + 2 = 0)...`
                          }
                          value={q.questionText}
                          onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                          className="w-full text-base sm:text-xs px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 focus:ring-2 focus:ring-secondary-400 focus:outline-none font-sans"
                        />
                      </div>

                      {/* Question Diagram / Image Attachment (Optional) */}
                      <div className="bg-slate-900/90 border border-dashed border-white/15 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Diagram / Figure / Image for Question {qIdx + 1} (Optional)</span>
                          </span>
                          {q.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionImage(qIdx)}
                              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        {q.imageUrl ? (
                          <div className="flex items-center gap-3">
                            <div className="relative inline-block border border-white/20 rounded-lg overflow-hidden bg-slate-950 p-1">
                              <img
                                src={q.imageUrl}
                                alt={`Question ${qIdx + 1} diagram`}
                                className="h-20 w-auto object-contain rounded cursor-pointer hover:opacity-90"
                                onClick={() => setLightboxImageUrl(q.imageUrl || null)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setLightboxImageUrl(q.imageUrl || null)}
                              className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                            >
                              <ZoomIn className="w-3 h-3 text-yellow-400" />
                              <span>Enlarge</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 active:scale-95">
                              <Upload className="w-3.5 h-3.5 text-yellow-400" />
                              <span>Attach Diagram</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleQuestionImageSelect(qIdx, file);
                                }}
                              />
                            </label>
                            <span className="text-[11px] text-slate-400">
                              Upload charts, graphs, or biological/technical diagrams
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Options or Theory Instructions */}
                      {!isTheory ? (
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-300 block">
                            Options (Select the correct key by tapping A, B, C, or D) *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(["A", "B", "C", "D"] as const).map((optKey, optIdx) => (
                              <div key={optKey} className="flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-white/5 min-w-0">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCorrectAnswerChange(qIdx, optKey)}
                                      className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95 ${
                                        q.correctAnswer === optKey
                                          ? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-md"
                                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                      }`}
                                      title="Tap to mark as correct answer"
                                    >
                                      {optKey}
                                    </button>
                                    <span className="text-[11px] font-bold text-slate-300 truncate">
                                      Option {optKey} {q.correctAnswer === optKey && <span className="text-emerald-400 font-extrabold text-[10px]">(Correct)</span>}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {[
                                      { l: "x²", v: "²", t: "Square power" },
                                      { l: "₂", v: "₂", t: "Base 2 (Binary)" },
                                      { l: "₈", v: "₈", t: "Base 8 (Octal)" },
                                      { l: "₁₀", v: "₁₀", t: "Base 10 (Denary)" },
                                      { l: "₁₆", v: "₁₆", t: "Base 16 (Hex)" },
                                      { l: "₅", v: "₅", t: "Base 5 (Quinary)" },
                                    ].map((sym) => (
                                      <button
                                        key={sym.l}
                                        type="button"
                                        onClick={() => handleOptionChange(qIdx, optIdx, (q.options[optIdx] || "") + sym.v)}
                                        title={`Add ${sym.t}`}
                                        className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-white/5 active:scale-95"
                                      >
                                        {sym.l}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <input
                                  type="text"
                                  required={!isTheory}
                                  placeholder={`Choice for Option ${optKey}...`}
                                  value={q.options[optIdx] || ""}
                                  onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                  className={`w-full text-base sm:text-xs px-3 py-2 rounded-xl bg-slate-900 border ${
                                    q.correctAnswer === optKey
                                      ? "border-emerald-500 ring-1 ring-emerald-500/50"
                                      : "border-white/10"
                                  } text-white focus:outline-none min-w-0 font-sans`}
                                />

                                {q.options[optIdx] && /[²³₀₁₂₃₄₅⁶⁷⁸⁹\^_]|<su[bp]>/i.test(q.options[optIdx]) && (
                                  <span className="text-[10px] text-amber-300 pl-1 font-medium truncate">
                                    Preview: <FormattedMathText text={q.options[optIdx]} />
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[11px] font-bold text-yellow-400 block mb-1">
                            Special Instructions for this Theory Question (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Answer in brief. Diagram must be fully labelled."
                            value={q.instructions || ""}
                            onChange={(e) => handleQuestionInstructionsChange(qIdx, e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Add Question Action Bar */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-5 py-3 rounded-xl transition shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Another Question ({questions.length} Created)</span>
                </button>
                <span className="text-[11px] text-slate-400 text-center sm:text-right">
                  Questions are kept safe in your active session
                </span>
              </div>
            </div>
          )}

          {/* TYPE B: FILE UPLOAD (IMAGE OR PDF) */}
          {(submissionType === "IMAGE" || submissionType === "PDF") && (
            <div className="space-y-4 pt-2 border-t border-white/10">
              <label className="text-xs font-bold text-slate-300 block">
                Question Sheet Document ({submissionType === "PDF" ? "PDF Document" : "PNG, JPG, WebP Image"} or Scanned Paper)
              </label>

              <div className="border-2 border-dashed border-white/20 hover:border-secondary-400 rounded-2xl p-6 text-center space-y-3 transition bg-slate-800/40">
                <input
                  type="file"
                  id="questionFile"
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="questionFile"
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-4 py-2.5 rounded-xl cursor-pointer shadow transition active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose {submissionType === "PDF" ? "PDF Document" : "Image / Document"} File</span>
                </label>
                <p className="text-xs text-slate-400">
                  {selectedFile ? (
                    <span className="font-bold text-white">Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  ) : (
                    submissionType === "PDF"
                      ? "Upload PDF document containing typed or formatted examination questions"
                      : "Upload camera snapshot of handwritten or typed question paper"
                  )}
                </p>
              </div>

              {imagePreviewUrl && (
                <div className="p-4 bg-slate-800 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-secondary-400 uppercase tracking-wider">
                      {selectedFile?.name?.toLowerCase().endsWith(".pdf") || imagePreviewUrl.startsWith("data:application/pdf")
                        ? "Uploaded PDF Document Preview:"
                        : "Question Sheet Preview:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreviewUrl(null);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                    >
                      Remove File
                    </button>
                  </div>

                  {selectedFile?.name?.toLowerCase().endsWith(".pdf") || imagePreviewUrl.startsWith("data:application/pdf") ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-white/10">
                        <div className="flex items-center gap-2 text-xs text-white">
                          <FileText className="w-4 h-4 text-rose-400" />
                          <span className="font-mono font-medium truncate max-w-[200px] sm:max-w-md">
                            {selectedFile?.name || "Question_Paper.pdf"}
                          </span>
                        </div>
                        <a
                          href={imagePreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-secondary-400 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open PDF in New Tab</span>
                        </a>
                      </div>
                      <div className="w-full h-80 rounded-lg overflow-hidden border border-white/10 bg-slate-950">
                        <iframe
                          src={imagePreviewUrl}
                          title="PDF Preview"
                          className="w-full h-full border-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full max-h-96 h-80 rounded-lg overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center">
                      <img
                        src={imagePreviewUrl}
                        alt="Uploaded Question Paper Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions: Save Draft & Final Submit */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {lastDraftSavedAt ? (
                <span className="inline-flex items-center gap-1.5 text-amber-300 font-mono text-[11px]">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  Draft auto-saved at {lastDraftSavedAt}
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  Tip: Use &quot;Save as Draft&quot; anytime to preserve your questions and resume later.
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {editingDraftId && (
                <button
                  type="button"
                  onClick={handleCancelEditingDraft}
                  className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition text-center"
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isPending || isDraftSaving}
                className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 sm:px-5 py-3 sm:py-2.5 rounded-xl shadow-lg transition active:scale-95 border border-amber-500/40"
                title="Save your questions as a draft to resume later"
              >
                <Save className="w-4 h-4 text-amber-200" />
                <span>{isDraftSaving ? "Saving Draft..." : "Save Draft & Continue Later"}</span>
              </button>

              <button
                type="submit"
                disabled={isPending || isDraftSaving}
                className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-extrabold text-slate-950 bg-secondary-400 hover:bg-secondary-300 disabled:opacity-50 px-5 sm:px-6 py-3 sm:py-2.5 rounded-xl shadow-lg transition active:scale-95"
                title="Submit finalized questions to Super Admin for CBT publication"
              >
                <Send className="w-4 h-4" />
                <span>{isPending ? "Submitting..." : "Submit Questions to Admin"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Submissions History Table */}
        <section className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Your Question Papers &amp; Drafts</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved question drafts and submitted papers. Drafts can be resumed and edited anytime.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: "ALL", label: "All Papers", count: submissions.length },
                  { id: "DRAFT", label: "Drafts", count: submissions.filter((s) => s.status === "DRAFT").length },
                  { id: "PENDING", label: "Pending", count: submissions.filter((s) => s.status === "PENDING").length },
                  { id: "APPROVED", label: "Approved CBT", count: submissions.filter((s) => s.status === "APPROVED").length },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSubmissionsFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                    submissionsFilter === f.id
                      ? "bg-secondary-400 text-slate-950 shadow"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="bg-slate-950/70 text-[10px] px-1.5 py-0.2 rounded-full">
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No question papers or drafts found. Fill the form above and click &quot;Save Draft&quot; to begin.
            </div>
          ) : (
            <>
              {/* Mobile Submissions Card View */}
              <div className="md:hidden space-y-3">
                {submissions
                  .filter((s) => (submissionsFilter === "ALL" ? true : s.status === submissionsFilter))
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        sub.status === "DRAFT"
                          ? "bg-amber-950/20 border-amber-500/40"
                          : "bg-slate-800/60 border-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white">{sub.subject}</h4>
                          <span className="text-xs font-semibold text-secondary-400">{sub.targetClass}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            sub.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : sub.status === "REJECTED"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : sub.status === "DRAFT"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {sub.status === "DRAFT" && <Edit3 className="w-3 h-3 text-amber-400" />}
                          {sub.status === "DRAFT" ? "Draft (In Progress)" : sub.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                              sub.submissionType === "PDF"
                                ? "bg-rose-900/60 text-rose-300"
                                : sub.submissionType === "IMAGE"
                                ? "bg-purple-900/60 text-purple-300"
                                : "bg-blue-900/60 text-blue-300"
                            }`}
                          >
                            {sub.submissionType}
                          </span>
                          <span>
                            &bull; {sub.durationMinutes}m &bull; {sub.totalMarks} Marks
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {sub.status === "DRAFT" && (
                            <button
                              onClick={() => handleResumeDraft(sub)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-black text-slate-950 flex items-center gap-1 shadow"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewItem(sub)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-bold text-white hover:bg-white/20 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          {sub.status === "DRAFT" && (
                            <button
                              onClick={() => handleDeleteSubmission(sub.id, sub.subject)}
                              className="p-1 rounded-lg bg-red-950/50 hover:bg-red-900 text-red-300"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Desktop Submissions Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Format</th>
                      <th className="py-2.5 px-3">Duration &amp; Marks</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {submissions
                      .filter((s) => (submissionsFilter === "ALL" ? true : s.status === submissionsFilter))
                      .map((sub) => (
                        <tr
                          key={sub.id}
                          className={`transition ${
                            sub.status === "DRAFT" ? "bg-amber-950/15 hover:bg-amber-950/30" : "hover:bg-white/5"
                          }`}
                        >
                          <td className="py-3 px-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              {sub.status === "DRAFT" && <Edit3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              <span>{sub.subject}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{sub.targetClass}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                sub.submissionType === "PDF"
                                  ? "bg-rose-900/60 text-rose-300"
                                  : sub.submissionType === "IMAGE"
                                  ? "bg-purple-900/60 text-purple-300"
                                  : "bg-blue-900/60 text-blue-300"
                              }`}
                            >
                              {sub.submissionType}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {sub.durationMinutes}m &bull; {sub.totalMarks} Marks
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                sub.status === "APPROVED"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : sub.status === "REJECTED"
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                  : sub.status === "DRAFT"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              {sub.status === "DRAFT" && <Edit3 className="w-3 h-3 text-amber-400" />}
                              {sub.status === "DRAFT" ? "Draft (In Progress)" : sub.status}
                            </span>
                            {sub.adminFeedback && (
                              <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                                {sub.adminFeedback}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {sub.status === "DRAFT" && (
                                <button
                                  onClick={() => handleResumeDraft(sub)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1 shadow transition"
                                  title="Continue writing / editing this draft"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Continue Editing</span>
                                </button>
                              )}
                              <button
                                onClick={() => setPreviewItem(sub)}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {sub.status === "DRAFT" && (
                                <button
                                  onClick={() => handleDeleteSubmission(sub.id, sub.subject)}
                                  className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900 border border-red-800/40 text-red-300 transition"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {/* Modal for Submission Preview */}
        {previewItem && (
          <div className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="sheet-panel bg-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-base font-bold text-white">
                    {previewItem.subject} ({previewItem.targetClass})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Format: {previewItem.submissionType} &bull; {previewItem.durationMinutes} mins &bull; {previewItem.totalMarks} Marks
                  </span>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1.5 bg-white/10 rounded-lg"
                >
                  Close
                </button>
              </div>

              {(previewItem.submissionType === "PDF" || previewItem.imageUrl?.startsWith("data:application/pdf")) && previewItem.imageUrl && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-white">
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span className="font-bold">Official Question Document (PDF)</span>
                    </div>
                    <a
                      href={previewItem.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-secondary-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open PDF in New Window</span>
                    </a>
                  </div>
                  <div className="w-full h-80 rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                    <iframe
                      src={previewItem.imageUrl}
                      title="PDF Preview"
                      className="w-full h-full border-none"
                    />
                  </div>
                </div>
              )}

              {previewItem.submissionType === "IMAGE" && !previewItem.imageUrl?.startsWith("data:application/pdf") && previewItem.imageUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-secondary-400">Uploaded Sheet Image:</span>
                    <a
                      href={previewItem.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-secondary-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View Fullscreen</span>
                    </a>
                  </div>
                  <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
                    <img
                      src={previewItem.imageUrl}
                      alt="Question Paper"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {previewItem.submissionType === "MANUAL" && previewItem.questionData && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-secondary-400">Manual Questions:</span>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {JSON.parse(previewItem.questionData).map((q: any, i: number) => (
                      <div key={i} className="p-3 bg-slate-800 rounded-lg border border-white/10 text-xs space-y-2">
                        <div className="font-bold text-white flex justify-between items-start gap-2">
                          <span>Q{i + 1}: <FormattedMathText text={q.questionText} /></span>
                          <span className="text-secondary-400 shrink-0">{q.points === 0.5 ? "1/2" : q.points} pt(s)</span>
                        </div>
                        {q.imageUrl && (
                          <div className="relative inline-block border border-white/10 rounded-lg overflow-hidden bg-slate-950 p-1">
                            <img
                              src={q.imageUrl}
                              alt="Diagram"
                              className="h-16 w-auto object-contain rounded cursor-pointer hover:opacity-90"
                              onClick={() => setLightboxImageUrl(q.imageUrl)}
                            />
                          </div>
                        )}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                            {q.options?.map((opt: string, oIdx: number) => (
                              <div
                                key={oIdx}
                                className={`p-1 rounded ${
                                  ["A", "B", "C", "D"][oIdx] === q.correctAnswer
                                    ? "bg-emerald-900/40 text-emerald-300 font-bold"
                                    : "bg-slate-900/60"
                                }`}
                              >
                                {["A", "B", "C", "D"][oIdx]}. <FormattedMathText text={opt} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewItem.instructions && (
                <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-300">
                  <strong className="text-white block mb-1">Instructions:</strong>
                  {previewItem.instructions}
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        )}

        {/* ================================================================== */}
        {/* WORKSPACE 2: THEORY SCORING & OBJECTIVE REVIEW                     */}
        {/* ================================================================== */}
        {activeWorkspace === "grading" && (
          <div className="space-y-6">
            {/* Intro Alert Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-yellow-400">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Teacher Continuous Assessment &amp; Theory Desk</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Inspect Objective Scores &amp; Transmit Theory Marks
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Review student objective CBT scores, evaluate their handwritten or online theory answers, enter their allocated theory score, and click &ldquo;Save &amp; Transmit&rdquo; to send the certified marks to the Super Admin for terminal result compilation.
                </p>
              </div>

              <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Subject / Class</div>
                <div className="text-xs font-black text-yellow-400">
                  {teacher?.assignedSubject || "All Subjects"} ({teacher?.assignedClass || "All Classes"})
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Total Attempts</div>
                  <div className="text-base sm:text-lg font-black text-white">{authorizedAttempts.length}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-900/40 border border-rose-700 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Pending Scores</div>
                  <div className="text-base sm:text-lg font-black text-rose-400">{awaitingTheoryCount}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Transmitted</div>
                  <div className="text-base sm:text-lg font-black text-emerald-400">{transmittedCount}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-900/40 border border-yellow-700 text-yellow-400 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Average Objective</div>
                  <div className="text-lg font-black text-yellow-400">
                    {completedAttempts.length > 0
                      ? (
                          completedAttempts.reduce((acc, a) => acc + Number(a.objectiveScore || 0), 0) /
                          completedAttempts.length
                        ).toFixed(1) + " pts"
                      : "0 pts"}
                  </div>
                </div>
              </div>
            </div>

            {/* Grading Filter & Course Bar */}
            <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "ALL", label: `All Attempts (${authorizedAttempts.length})` },
                      { id: "AWAITING", label: `Awaiting Theory (${awaitingTheoryCount})` },
                      { id: "TRANSMITTED", label: `Transmitted (${transmittedCount})` },
                      ...(flaggedAttemptCount > 0 || authorizedFlaggedQuestions.length > 0
                        ? [{ id: "FLAGGED" as const, label: `Flagged (${flaggedAttemptCount})` }]
                        : []),
                      ...(inProgressCount > 0
                        ? [{ id: "IN_PROGRESS" as const, label: `In Progress (${inProgressCount})` }]
                        : []),
                    ] as const
                  ).map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setGradingStatusFilter(pill.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        gradingStatusFilter === pill.id
                          ? pill.id === "AWAITING"
                            ? "bg-rose-600 border-rose-500 text-white"
                            : pill.id === "TRANSMITTED"
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : pill.id === "FLAGGED"
                            ? "bg-amber-500 border-amber-400 text-slate-950"
                            : "bg-yellow-500 border-yellow-400 text-slate-950"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {authorizedFlaggedQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenExamFlaggedModal()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-600/80 text-xs font-bold text-amber-300 transition active:scale-95"
                    >
                      <Flag className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {authorizedFlaggedQuestions.length} Flagged Q{authorizedFlaggedQuestions.length === 1 ? "" : "s"}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshAttempts}
                    disabled={refreshingAttempts}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition active:scale-95 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingAttempts ? "animate-spin" : ""}`} />
                    <span>{refreshingAttempts ? "Refreshing..." : "Refresh Attempts"}</span>
                  </button>
                </div>
              </div>
              {myExams.filter((ex: any) => teacher?.role !== "TEACHER" || doesTeacherMatchExam(teacher, ex)).length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">Filter Course:</span>
                  <select
                    value={gradingExamFilter}
                    onChange={(e) => setGradingExamFilter(e.target.value)}
                    className="flex-1 max-w-md px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-yellow-500"
                  >
                    <option value="ALL">All My Course Papers</option>
                    {myExams
                      .filter((ex: any) => teacher?.role !== "TEACHER" || doesTeacherMatchExam(teacher, ex))
                      .map((ex: any) => (
                        <option key={ex.id} value={String(ex.id)}>
                          {ex.subject} — {ex.targetClass} ({ex.title})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student by RegNo or Name..."
                  value={gradingSearchQuery}
                  onChange={(e) => setGradingSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-base sm:text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <select
                value={gradingClassFilter}
                onChange={(e) => setGradingClassFilter(e.target.value)}
                className="w-full sm:w-48 px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-base sm:text-xs text-slate-300 focus:outline-none focus:border-yellow-500"
              >
                <option value="ALL">All Classes</option>
                <option value="SS 1">SS 1</option>
                <option value="SS 2">SS 2</option>
                <option value="SS 3">SS 3</option>
                <option value="JSS 1">JSS 1</option>
                <option value="JSS 2">JSS 2</option>
                <option value="JSS 3">JSS 3</option>
              </select>

              {filteredAttempts.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleExportTeacherScoresPdf("obj_only")}
                    className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
                    title="Export A4 PDF Score Sheet with Student Name and OBJ Scores"
                  >
                    <Download className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Export OBJ Scores (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportTeacherScoresPdf("full")}
                    className="flex-1 sm:flex-initial px-3 py-2.5 bg-blue-900/80 hover:bg-blue-800 border border-blue-700 text-blue-200 text-xs font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
                    title="Export Full A4 PDF Score Sheet (OBJ + Theory + Total)"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-300" />
                    <span>Full Scores (PDF)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Student CBT Attempts &amp; Theory Scoring ({filteredAttempts.length})</span>
                </h3>
                <div className="flex items-center gap-3">
                  {filteredAttempts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleExportTeacherScoresPdf("obj_only")}
                      className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-bold rounded-lg transition inline-flex items-center gap-1.5 active:scale-95"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>Download OBJ Score Sheet (PDF)</span>
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400">
                    Total Score auto-updates as Objective + Theory
                  </span>
                </div>
              </div>

              {filteredAttempts.length === 0 ? (
                <div className="p-10 text-center text-slate-500 space-y-2.5">
                  <ClipboardList className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs">
                    {authorizedAttempts.length > 0
                      ? "No student attempts match your active search, class, or status filter."
                      : "No student CBT attempts found yet for your subject/courses."}
                  </p>
                  {authorizedAttempts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setGradingSearchQuery("");
                        setGradingClassFilter("ALL");
                        setGradingExamFilter("ALL");
                        setGradingStatusFilter("ALL");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
                    >
                      Show All {authorizedAttempts.length} Course Attempts
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile Touch-Friendly Card View for Theory Grading */}
                  <div className="md:hidden space-y-3 p-3">
                    {filteredAttempts.map((att) => {
                      const objScore = Number(att.objectiveScore || 0);
                      const isAwaiting = isAttemptAwaitingTheory(att);
                      const currentTheory = tempScores[att.id] !== undefined ? tempScores[att.id] : (att.theoryScore ?? 0);
                      const dynamicTotal = objScore + Number(currentTheory || 0);
                      const theoryInputVal =
                        tempScores[att.id] !== undefined
                          ? tempScores[att.id]
                          : isAwaiting && att.theoryScore === 0
                          ? ""
                          : (att.theoryScore ?? "");
                      const isSaving = savingAttemptId === att.id;
                      const isSaved = transmitSuccess[att.id];

                      return (
                        <div
                          key={att.id}
                          className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-sm text-white">{att.studentFullName}</div>
                              <div className="text-xs font-mono text-yellow-400 font-semibold">{att.studentAdmNo}</div>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 shrink-0">
                              {att.studentClass}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                            <span>
                              Exam: <strong className="text-slate-200">{att.examTitle}</strong> &bull; {att.examSubject}
                            </span>
                            {(att.flaggedQuestionIds?.length ?? 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenAttemptFlaggedModal(att)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/90 hover:bg-amber-900 border border-amber-600/80 text-amber-300 text-[10px] font-bold transition"
                              >
                                <Flag className="w-3 h-3 text-amber-400" />
                                <span>
                                  {att.flaggedQuestionIds!.length} Flagged Q{att.flaggedQuestionIds!.length === 1 ? "" : "s"}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Scores Grid */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center items-center">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Objective</span>
                              <span className="text-sm font-bold text-blue-400 font-mono">
                                {att.isCompleted ? `${objScore} pts` : `${att.answeredCount ?? 0} ans`}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Theory</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                disabled={!att.isCompleted}
                                value={att.isCompleted ? theoryInputVal : ""}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setTempScores((prev) => ({
                                    ...prev,
                                    [att.id]: isNaN(val) ? 0 : val,
                                  }));
                                }}
                                placeholder={att.isCompleted ? "0" : "—"}
                                className="w-20 px-2 py-1.5 mt-0.5 bg-slate-950 border border-slate-700 rounded-lg text-center text-base sm:text-sm font-bold font-mono text-white focus:outline-none focus:border-yellow-500 disabled:opacity-40"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                              <span className="text-sm font-black text-emerald-400 font-mono">
                                {att.isCompleted ? `${dynamicTotal} pts` : "Pending"}
                              </span>
                            </div>
                          </div>

                          {/* Quick Score Adjustment Buttons (Mobile-Centric Touch Grading) */}
                          {att.isCompleted && (
                            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Quick Score Touch:
                                </span>
                                <span className="text-[10px] font-mono text-yellow-400 font-bold">
                                  {currentTheory} marks
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = tempScores[att.id] !== undefined ? tempScores[att.id] : (att.theoryScore ?? 0);
                                    setTempScores((prev) => ({ ...prev, [att.id]: Math.max(0, cur - 5) }));
                                  }}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700"
                                >
                                  -5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = tempScores[att.id] !== undefined ? tempScores[att.id] : (att.theoryScore ?? 0);
                                    setTempScores((prev) => ({ ...prev, [att.id]: Math.max(0, cur - 1) }));
                                  }}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-700"
                                >
                                  -1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = tempScores[att.id] !== undefined ? tempScores[att.id] : (att.theoryScore ?? 0);
                                    setTempScores((prev) => ({ ...prev, [att.id]: Math.min(100, cur + 1) }));
                                  }}
                                  className="px-3 py-1 bg-blue-900/60 hover:bg-blue-800 active:scale-95 text-blue-200 text-xs font-mono font-bold rounded-lg border border-blue-700/60"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = tempScores[att.id] !== undefined ? tempScores[att.id] : (att.theoryScore ?? 0);
                                    setTempScores((prev) => ({ ...prev, [att.id]: Math.min(100, cur + 5) }));
                                  }}
                                  className="px-3 py-1 bg-blue-900/60 hover:bg-blue-800 active:scale-95 text-blue-200 text-xs font-mono font-bold rounded-lg border border-blue-700/60"
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = tempScores[att.id] !== undefined ? tempScores[att.id] : (att.theoryScore ?? 0);
                                    setTempScores((prev) => ({ ...prev, [att.id]: Math.min(100, cur + 10) }));
                                  }}
                                  className="px-3 py-1 bg-emerald-900/60 hover:bg-emerald-800 active:scale-95 text-emerald-200 text-xs font-mono font-bold rounded-lg border border-emerald-700/60"
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTempScores((prev) => ({ ...prev, [att.id]: 40 }))}
                                  className="px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 active:scale-95 text-yellow-300 text-xs font-mono font-bold rounded-lg border border-yellow-500/40"
                                >
                                  40
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTempScores((prev) => ({ ...prev, [att.id]: 0 }))}
                                  className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 active:scale-95 text-rose-300 text-xs font-mono font-bold rounded-lg border border-rose-800"
                                >
                                  0
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Status Pill */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Grading Status:</span>
                            {renderGradingStatusPill(att)}
                          </div>

                          {/* Teacher Appraisal Comment & Quick Chips */}
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={tempComments[att.id] !== undefined ? tempComments[att.id] : (att.teacherComment || "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTempComments((prev) => ({ ...prev, [att.id]: val }));
                              }}
                              placeholder="Appraisal comment (optional)..."
                              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-base sm:text-xs text-white focus:outline-none focus:border-yellow-500 placeholder:text-slate-500"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {["Excellent script", "Good presentation", "Satisfactory effort", "Needs more detail"].map((phrase) => (
                                <button
                                  key={phrase}
                                  type="button"
                                  onClick={() => setTempComments((prev) => ({ ...prev, [att.id]: phrase }))}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 active:scale-95 transition"
                                >
                                  {phrase}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Submit or Finalize Interrupted Attempt Button */}
                          {!att.isCompleted ? (
                            <button
                              type="button"
                              onClick={() => handleFinalizeInterruptedAttempt(att.id)}
                              disabled={recoveringAttemptId === att.id}
                              className="w-full py-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 active:scale-95 shadow-md bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-60"
                            >
                              <span>{recoveringAttemptId === att.id ? "Finalizing CBT..." : "Finalize CBT & Enable Theory Grading"}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTransmitScore(att.id)}
                              disabled={isSaving}
                              className={`w-full py-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 active:scale-95 shadow-md ${
                                isSaved
                                  ? "bg-emerald-600 text-white"
                                  : "bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow"
                              }`}
                            >
                              {isSaving ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                  <span>Sending Score...</span>
                                </>
                              ) : isSaved ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Transmitted to Super Admin!</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Save &amp; Transmit Score</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                          <th className="p-3 font-semibold">Student &amp; RegNo</th>
                          <th className="p-3 font-semibold">Exam Title &amp; Class</th>
                          <th className="p-3 font-semibold text-center">Objective Score</th>
                          <th className="p-3 font-semibold text-center">Theory Score</th>
                          <th className="p-3 font-semibold text-center">Total Score</th>
                          <th className="p-3 font-semibold">Teacher Remark</th>
                          <th className="p-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {filteredAttempts.map((att) => {
                          const objScore = Number(att.objectiveScore || 0);
                          const isAwaiting = isAttemptAwaitingTheory(att);
                          const currentTheory = tempScores[att.id] !== undefined ? tempScores[att.id] : (att.theoryScore ?? 0);
                          const dynamicTotal = objScore + Number(currentTheory || 0);
                          const theoryInputVal =
                            tempScores[att.id] !== undefined
                              ? tempScores[att.id]
                              : isAwaiting && att.theoryScore === 0
                              ? ""
                              : (att.theoryScore ?? "");
                          const isSaving = savingAttemptId === att.id;
                          const isSaved = transmitSuccess[att.id];

                          return (
                            <tr key={att.id} className="hover:bg-slate-950/40 transition">
                              <td className="p-3">
                                <div className="font-bold text-white">{att.studentFullName}</div>
                                <div className="text-[11px] font-mono text-yellow-400">{att.studentAdmNo}</div>
                              </td>

                              <td className="p-3">
                                <div className="font-medium text-slate-200">{att.examTitle}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                                  <span>
                                    {att.examSubject} &bull; <strong className="text-blue-400">{att.studentClass}</strong>
                                  </span>
                                  {(att.flaggedQuestionIds?.length ?? 0) > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAttemptFlaggedModal(att)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/90 hover:bg-amber-900 border border-amber-600/80 text-amber-300 text-[10px] font-bold transition"
                                      title="Inspect flagged questions from this candidate"
                                    >
                                      <Flag className="w-2.5 h-2.5 text-amber-400" />
                                      <span>{att.flaggedQuestionIds!.length} Flagged</span>
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Objective Score */}
                              <td className="p-3 text-center">
                                <span className="inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-sm bg-blue-950/70 border border-blue-800 text-blue-300">
                                  {att.isCompleted ? `${objScore} pts` : `${att.answeredCount ?? 0} ans`}
                                </span>
                              </td>

                              {/* Theory Score Input */}
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    disabled={!att.isCompleted}
                                    value={att.isCompleted ? theoryInputVal : ""}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setTempScores((prev) => ({
                                        ...prev,
                                        [att.id]: isNaN(val) ? 0 : val,
                                      }));
                                    }}
                                    placeholder={att.isCompleted ? "0" : "—"}
                                    className="w-20 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm focus:outline-none focus:border-yellow-500 text-center disabled:opacity-40"
                                  />
                                  {renderGradingStatusPill(att)}
                                </div>
                              </td>

                              {/* Live Computed Total */}
                              <td className="p-3 text-center">
                                <span className="text-sm font-black text-emerald-400 font-mono">
                                  {att.isCompleted ? `${dynamicTotal} pts` : "Pending"}
                                </span>
                              </td>

                              {/* Teacher Remark Input */}
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={tempComments[att.id] !== undefined ? tempComments[att.id] : (att.teacherComment || "")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTempComments((prev) => ({ ...prev, [att.id]: val }));
                                  }}
                                  placeholder="Appraisal comment..."
                                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-500"
                                />
                              </td>

                              {/* Save & Transmit Button */}
                              <td className="p-3 text-right">
                                {!att.isCompleted ? (
                                  <button
                                    type="button"
                                    onClick={() => handleFinalizeInterruptedAttempt(att.id)}
                                    disabled={recoveringAttemptId === att.id}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto bg-sky-600 hover:bg-sky-500 text-white shadow disabled:opacity-60"
                                  >
                                    <span>{recoveringAttemptId === att.id ? "Finalizing..." : "Finalize CBT"}</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleTransmitScore(att.id)}
                                    disabled={isSaving}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                                      isSaved
                                        ? "bg-emerald-600 text-white"
                                        : "bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow"
                                    }`}
                                  >
                                    {isSaving ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                        <span>Sending</span>
                                      </>
                                    ) : isSaved ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Transmitted!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Send to Admin</span>
                                      </>
                                    )}
                                  </button>
                                )}
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
        {/* WORKSPACE 3: MY SUBJECT EXAMS (Zero Leakage Privacy Protected)     */}
        {/* ================================================================== */}
        {activeWorkspace === "exams" && (
          <div className="space-y-6">
            {/* Privacy & Scope Notice */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Zero-Leakage Privacy Guard Active</h3>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                      Protected Teacher Scope
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    For institutional examination confidentiality, you can only view and manage CBT papers created by you or assigned to your subject (<strong>{teacher?.assignedSubject || "Assigned Subjects"}</strong>). Other teachers cannot access or view your examination questions.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  Authorized Papers:{" "}
                  <strong className="text-emerald-400 font-mono text-sm">
                    {myExams.filter((ex: any) => teacher?.role !== "TEACHER" || doesTeacherMatchExam(teacher, ex)).length}
                  </strong>
                </span>
              </div>
            </div>

            {/* Search & Stats Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-white/10 rounded-xl p-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={examSearchQuery}
                  onChange={(e) => setExamSearchQuery(e.target.value)}
                  placeholder="Search your exams by title or class..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>
                  Showing {filteredExams.length} of{" "}
                  {myExams.filter((ex: any) => teacher?.role !== "TEACHER" || doesTeacherMatchExam(teacher, ex)).length} exams
                </span>
              </div>
            </div>

            {/* Exams Grid */}
            {filteredExams.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
                <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Examination Papers Found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {examSearchQuery
                    ? "No exams match your search query."
                    : "When your submitted question drafts are approved by Super Admin, or when CBT papers are scheduled for your subject, they will appear here under your secure workspace."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExams.map((exam: any) => {
                  const examAttempts = authorizedAttempts.filter((a) => a.examId === exam.id);
                  const examAwaiting = examAttempts.filter((a) => isAttemptAwaitingTheory(a)).length;
                  const examTotalAttempts = Math.max(exam._count?.attempts ?? 0, examAttempts.length);
                  const examFlaggedItems = authorizedFlaggedQuestions.filter((f) => f.examId === exam.id);

                  return (
                  <div
                    key={exam.id}
                    className="bg-slate-900/90 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between transition group shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                          {exam.subject}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {examFlaggedItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenExamFlaggedModal(exam)}
                              className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-950/90 hover:bg-amber-900 border border-amber-600 text-amber-300 inline-flex items-center gap-1 transition"
                            >
                              <Flag className="w-2.5 h-2.5 text-amber-400" />
                              <span>{examFlaggedItems.length} Flagged</span>
                            </button>
                          )}
                          {examAwaiting > 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-700 text-rose-300">
                              {examAwaiting} Awaiting Theory
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              exam.isActive
                                ? "bg-emerald-950/60 border-emerald-600 text-emerald-300"
                                : "bg-slate-800 border-slate-700 text-slate-400"
                            }`}
                          >
                            {exam.isActive ? "● Active" : "○ Inactive"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition line-clamp-2">
                          {exam.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span>Class: <strong className="text-slate-200">{exam.targetClass}</strong></span>
                          <span>&bull;</span>
                          <span>Duration: <strong className="text-slate-200">{exam.durationMinutes}m</strong></span>
                        </div>
                      </div>

                      {/* Stats badges */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
                        <div className="bg-slate-950/60 rounded-lg p-2 border border-white/5">
                          <div className="text-[10px] text-slate-400">Objective</div>
                          <div className="text-xs font-mono font-bold text-amber-400">
                            {exam._count?.objectiveQuestions ?? 0} Qs
                          </div>
                        </div>
                        <div className="bg-slate-950/60 rounded-lg p-2 border border-white/5">
                          <div className="text-[10px] text-slate-400">Theory</div>
                          <div className="text-xs font-mono font-bold text-sky-400">
                            {exam._count?.theoryQuestions ?? 0} Qs
                          </div>
                        </div>
                        <div className="bg-slate-950/60 rounded-lg p-2 border border-white/5">
                          <div className="text-[10px] text-slate-400">Attempts</div>
                          <div className="text-xs font-mono font-bold text-emerald-400">
                            {examTotalAttempts}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGradingExamFilter(String(exam.id));
                          setGradingStatusFilter(examAwaiting > 0 ? "AWAITING" : "ALL");
                          setActiveWorkspace("grading");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 text-yellow-300 text-xs font-bold transition active:scale-95"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>
                          {examAwaiting > 0
                            ? `Grade Theory (${examAwaiting} Awaiting)`
                            : `View Student Attempts (${examTotalAttempts})`}
                        </span>
                      </button>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleInspectExam(exam.id)}
                          disabled={loadingExamDetails}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Questions</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportSingleExamPdf(exam, "obj_only")}
                          disabled={exportingExamId === exam.id}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-bold transition active:scale-95"
                          title="Export PDF Score Sheet with Student Name and OBJ Scores"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{exportingExamId === exam.id ? "..." : "OBJ PDF"}</span>
                        </button>
                        <Link
                          href={`/cbt/exam/${exam.id}`}
                          target="_blank"
                          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
                          title="Preview CBT Candidate Portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* WORKSPACE 4: SUBJECT CA & EXAMS SCORE UPLOAD (Delegated By Reg No) */}
        {/* ================================================================== */}
        {activeWorkspace === "scores" && (() => {
          const courseMap = new Map<string, {
            key: string;
            subject: string;
            targetClass: string;
            source: "CBT_EXAM" | "QUESTION_SUBMISSION";
            status: string;
            title?: string;
            examId?: number;
            submissionId?: number;
          }>();

          for (const ex of myExams) {
            const sub = (ex.subject || "").trim();
            const cls = (ex.targetClass || "").trim();
            if (!sub || !cls) continue;
            const normKey = `${sub.toLowerCase()}::${cls.toLowerCase()}`;
            if (!courseMap.has(normKey)) {
              courseMap.set(normKey, {
                key: `${sub}::${cls}`,
                subject: sub,
                targetClass: cls,
                source: "CBT_EXAM",
                status: ex.isActive ? "ACTIVE_CBT_EXAM" : "CBT_EXAM_CREATED",
                title: ex.title,
                examId: ex.id,
              });
            }
          }

          for (const item of submissions) {
            const sub = (item.subject || "").trim();
            const cls = (item.targetClass || "").trim();
            if (!sub || !cls) continue;
            const normKey = `${sub.toLowerCase()}::${cls.toLowerCase()}`;
            if (!courseMap.has(normKey)) {
              courseMap.set(normKey, {
                key: `${sub}::${cls}`,
                subject: sub,
                targetClass: cls,
                source: "QUESTION_SUBMISSION",
                status: item.status || "SUBMITTED",
                title: `${sub} (${cls}) Question Paper`,
                submissionId: item.id,
              });
            }
          }

          const teacherUploadedCourses = Array.from(courseMap.values());

          return (
            <div className="space-y-6">
              <DelegatedSubjectScoreUploader
                userRole="TEACHER"
                teacherName={teacher?.fullName || "Subject Teacher"}
                teacherEmail={teacher?.email}
                defaultClass={teacherUploadedCourses[0]?.targetClass || teacher?.assignedClass || "JSS 1 Diamond"}
                defaultSubject={teacherUploadedCourses[0]?.subject || teacher?.assignedSubject || "Mathematics"}
                initialStudents={initialStudents}
                uploadedCourses={teacherUploadedCourses}
                onNavigateToQuestionDesk={() => setActiveWorkspace("questions")}
              />
            </div>
          );
        })()}

        {/* Exam Questions Inspection Modal */}
        {selectedExamForModal && (
          <div
            className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            onClick={() => setSelectedExamForModal(null)}
          >
            <div
              className="sheet-panel sheet-flush relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/70 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300">
                      {selectedExamForModal.subject}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {selectedExamForModal.targetClass}
                    </span>
                    <div className="inline-flex items-center gap-1.5 bg-slate-950 border border-white/15 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <input
                        type="number"
                        min={5}
                        max={360}
                        value={modalExamDurationInput}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setModalExamDurationInput(e.target.value)}
                        onBlur={() => {
                          if (String(modalExamDurationInput).trim() === "") {
                            setModalExamDurationInput(selectedExamForModal.durationMinutes || 60);
                          }
                        }}
                        className="w-12 bg-transparent text-white font-mono font-bold text-[11px] text-center focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400">mins</span>
                      {Number(modalExamDurationInput) !== selectedExamForModal.durationMinutes && (
                        <button
                          type="button"
                          onClick={handleSaveModalExamDuration}
                          disabled={isPending}
                          className="ml-1 px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px]"
                        >
                          Save Time
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                    {selectedExamForModal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>Zero-leakage verified: Subject questions isolated to your credentials.</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExamForModal(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Scrollable */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
                {/* Objective Questions Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>Section A: Objective Questions ({selectedExamForModal.objectiveQuestions?.length || 0})</span>
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Total Points: {selectedExamForModal.objectiveQuestions?.reduce((acc: number, q: any) => acc + (q.points || 1), 0) || 0} pts
                    </span>
                  </div>

                  {(!selectedExamForModal.objectiveQuestions || selectedExamForModal.objectiveQuestions.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-2">No objective questions added to this exam yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedExamForModal.objectiveQuestions.map((q: any, idx: number) => {
                        let parsedOpts = [q.optA || "", q.optB || "", q.optC || "", q.optD || ""];
                        if (q.options) {
                          try {
                            const arr = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
                            if (Array.isArray(arr) && arr.length > 0) {
                              parsedOpts = [arr[0] || "", arr[1] || "", arr[2] || "", arr[3] || ""];
                            }
                          } catch {
                            // keep fallback
                          }
                        }

                        const isEditingThis = editingModalObjQ?.id === q.id;

                        return (
                          <div
                            key={q.id || idx}
                            className="bg-slate-950/60 border border-white/10 rounded-xl p-4 space-y-2.5"
                          >
                            {isEditingThis ? (
                              <div className="space-y-3 bg-slate-900/90 p-3 rounded-xl border border-amber-500/40">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-amber-400">
                                    Editing Question Q{idx + 1}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingModalObjQ(null)}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSaveModalObjQuestion}
                                      disabled={isPending}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                                    >
                                      {isPending ? "Saving..." : "Save Question"}
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  rows={2}
                                  value={editingModalObjQ.questionText}
                                  onChange={(e) =>
                                    setEditingModalObjQ((prev: any) => ({ ...prev, questionText: e.target.value }))
                                  }
                                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(["A", "B", "C", "D"] as const).map((letter) => {
                                    const fieldKey = `opt${letter}`;
                                    return (
                                      <div key={letter} className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-amber-400 w-4">{letter}.</span>
                                        <input
                                          type="text"
                                          value={editingModalObjQ[fieldKey] || ""}
                                          onChange={(e) =>
                                            setEditingModalObjQ((prev: any) => ({
                                              ...prev,
                                              [fieldKey]: e.target.value,
                                            }))
                                          }
                                          className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-none"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center gap-4 pt-1">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-slate-400">Correct Key:</span>
                                    <select
                                      value={editingModalObjQ.correctAnswer || "A"}
                                      onChange={(e) =>
                                        setEditingModalObjQ((prev: any) => ({
                                          ...prev,
                                          correctAnswer: e.target.value,
                                        }))
                                      }
                                      className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold"
                                    >
                                      <option value="A">Option A</option>
                                      <option value="B">Option B</option>
                                      <option value="C">Option C</option>
                                      <option value="D">Option D</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-slate-400">Points:</span>
                                    <select
                                      value={String(editingModalObjQ.points || 0.5)}
                                      onChange={(e) =>
                                        setEditingModalObjQ((prev: any) => ({
                                          ...prev,
                                          points: parseFloat(e.target.value) || 0.5,
                                        }))
                                      }
                                      className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-bold"
                                    >
                                      <option value="0.5">0.5 pt</option>
                                      <option value="1">1 pt</option>
                                      <option value="1.5">1.5 pts</option>
                                      <option value="2">2 pts</option>
                                      <option value="3">3 pts</option>
                                      <option value="5">5 pts</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-xs font-black text-amber-400 font-mono">
                                    Q{idx + 1}.
                                  </span>
                                  <div className="text-xs text-slate-200 flex-1 whitespace-pre-wrap font-medium">
                                    <FormattedMathText text={q.questionText} />
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {(() => {
                                      const flagItem = flaggedQuestions.find(
                                        (f) => f.examId === selectedExamForModal.id && f.questionId === q.id
                                      );
                                      return flagItem ? (
                                        <span className="text-[10px] font-bold bg-amber-950/80 border border-amber-600/80 text-amber-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                          <Flag className="w-2.5 h-2.5 text-amber-400" />
                                          <span>Flagged ({flagItem.flagCount})</span>
                                        </span>
                                      ) : null;
                                    })()}
                                    <span className="text-[10px] font-mono font-bold bg-amber-950/60 border border-amber-800 text-amber-300 px-2 py-0.5 rounded-md">
                                      {q.points === 0.5 ? "1/2" : (q.points || 1)} pt{q.points > 1 ? "s" : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingModalObjQ({
                                          id: q.id,
                                          questionText: q.questionText || "",
                                          optA: parsedOpts[0],
                                          optB: parsedOpts[1],
                                          optC: parsedOpts[2],
                                          optD: parsedOpts[3],
                                          correctAnswer: q.correctAnswer || "A",
                                          points: q.points ?? 0.5,
                                          imageUrl: q.imageUrl || null,
                                        })
                                      }
                                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-white/10 rounded text-[10px] font-bold transition"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>

                                {q.imageUrl && (
                                  <div className="pt-1">
                                    <img
                                      src={q.imageUrl}
                                      alt="Question Figure"
                                      onClick={() => setLightboxImageUrl(q.imageUrl)}
                                      className="max-h-36 rounded-lg border border-white/15 cursor-zoom-in hover:opacity-90 transition object-contain bg-black/40"
                                    />
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                  {[
                                    { key: "A", text: parsedOpts[0] },
                                    { key: "B", text: parsedOpts[1] },
                                    { key: "C", text: parsedOpts[2] },
                                    { key: "D", text: parsedOpts[3] },
                                  ].map((opt) => {
                                    const isCorrect = q.correctAnswer === opt.key;
                                    return (
                                      <div
                                        key={opt.key}
                                        className={`flex items-start gap-2 p-2 rounded-lg text-xs border ${
                                          isCorrect
                                            ? "bg-emerald-950/60 border-emerald-600 text-emerald-200 font-bold"
                                            : "bg-slate-900 border-white/5 text-slate-300"
                                        }`}
                                      >
                                        <span
                                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                            isCorrect
                                              ? "bg-emerald-600 text-white"
                                              : "bg-slate-800 text-slate-400"
                                          }`}
                                        >
                                          {opt.key}
                                        </span>
                                        <span className="flex-1">
                                          <FormattedMathText text={opt.text} />
                                        </span>
                                        {isCorrect && (
                                          <span className="text-[10px] text-emerald-400 font-black shrink-0">
                                            ✓ KEY
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Theory Questions Section */}
                {selectedExamForModal.hasTheory && (
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Section B: Theory / Structured Questions ({selectedExamForModal.theoryQuestions?.length || 0})</span>
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Total Max: {selectedExamForModal.theoryQuestions?.reduce((acc: number, q: any) => acc + (q.maxScore || 10), 0) || 0} pts
                      </span>
                    </div>

                    {(!selectedExamForModal.theoryQuestions || selectedExamForModal.theoryQuestions.length === 0) ? (
                      <p className="text-xs text-slate-500 italic py-2">No theory questions configured for this exam.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedExamForModal.theoryQuestions.map((q: any, idx: number) => (
                          <div
                            key={q.id || idx}
                            className="bg-slate-950/60 border border-white/10 rounded-xl p-4 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs font-black text-sky-400 font-mono">
                                Q{q.questionNum || idx + 1}.
                              </span>
                              <div className="text-xs text-slate-200 flex-1 whitespace-pre-wrap font-medium">
                                <FormattedMathText text={q.questionText} />
                              </div>
                              <span className="text-[10px] font-mono font-bold bg-sky-950/60 border border-sky-800 text-sky-300 px-2 py-0.5 rounded-md shrink-0">
                                Max: {q.maxScore || 10} pts
                              </span>
                            </div>

                            {q.imageUrl && (
                              <div className="pt-1">
                                <img
                                  src={q.imageUrl}
                                  alt="Theory Figure"
                                  onClick={() => setLightboxImageUrl(q.imageUrl)}
                                  className="max-h-36 rounded-lg border border-white/15 cursor-zoom-in hover:opacity-90 transition object-contain bg-black/40"
                                />
                              </div>
                            )}

                            {q.rubrics && (
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                                <span className="font-bold text-sky-400">Marking Rubrics / Guide: </span>
                                {q.rubrics}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Protected Subject Examination Desk
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedExamForModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Lightbox Zoom Modal */}
        <FlaggedQuestionsModal
          isOpen={Boolean(flaggedModalConfig)}
          onClose={() => setFlaggedModalConfig(null)}
          title={flaggedModalConfig?.title}
          subtitle={flaggedModalConfig?.subtitle}
          items={flaggedModalConfig?.items || []}
          highlightStudentAdmNo={flaggedModalConfig?.highlightStudentAdmNo}
          onEditQuestion={handleEditFlaggedQuestionFromModal}
          isLoading={loadingFlaggedModal}
        />

        {lightboxImageUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxImageUrl(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-white/15 rounded-2xl p-2 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-4 py-2 border-b border-white/10">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-secondary-400" />
                  Diagram / Figure Preview
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxImageUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <Eye className="w-4 h-4" />
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

        {/* Mobile Floating Action Pill for Teacher Questions Desk (bottom-left above Math button so Tawk.to stays clear on bottom-right) */}
        {activeWorkspace === "questions" && submissionType === "MANUAL" && (
          <div className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] sm:bottom-20 left-3 sm:left-6 z-40 md:hidden flex flex-col items-start gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                handleAddQuestion();
                setTimeout(() => {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                }, 100);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-full shadow-2xl border border-yellow-300 active:scale-95 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Question (Q{questions.length + 1})</span>
            </button>
          </div>
        )}

        {/* Floating Math Keyboard Button & Modal */}
        {activeWorkspace === "questions" && submissionType === "MANUAL" && (
          <>
            <FloatingMathButton
              onClick={() => setIsMathModalOpen(true)}
              label="Math &amp; Science Symbols (x², H₂O, Bases)"
              shortLabel="Math (x²)"
            />
            <MathToolbar
              isModal
              isOpen={isMathModalOpen}
              onClose={() => setIsMathModalOpen(false)}
              targetInputId={mathTargetInputId}
            />
          </>
        )}
      </main>
    </div>
  );
}
