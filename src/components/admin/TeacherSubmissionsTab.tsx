"use client";

import React, { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import {
  FileText,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Eye,
  Check,
  X,
  Sparkles,
  ExternalLink,
  BookOpen,
  Trash2,
  ZoomIn,
  Edit3,
  Save,
  Plus,
  ArrowLeft,
} from "lucide-react";
import {
  reviewTeacherSubmissionAction,
  convertTeacherSubmissionToCbtExamAction,
  deleteTeacherSubmissionAction,
  updateTeacherSubmissionQuestionsAction,
  updateTeacherSubmissionMetadataAction,
  ManualQuestionItem,
} from "@/app/actions/teacher-submissions";
import { FormattedMathText } from "@/components/cbt/FormattedMathText";

interface Props {
  initialSubmissions: any[];
  onExamCreated?: (newExam?: any) => void;
}

export default function TeacherSubmissionsTab({
  initialSubmissions,
  onExamCreated,
}: Props) {
  const [submissions, setSubmissions] = useState<any[]>(initialSubmissions);

  useEffect(() => {
    setSubmissions(initialSubmissions);
  }, [initialSubmissions]);

  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditingQuestions, setIsEditingQuestions] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState<ManualQuestionItem[]>([]);
  const [editingDurationMinutes, setEditingDurationMinutes] = useState<string | number>(60);
  const [editingTotalMarks, setEditingTotalMarks] = useState<string | number>(100);
  const [isQuickEditingMeta, setIsQuickEditingMeta] = useState<boolean>(false);
  const [quickDuration, setQuickDuration] = useState<string | number>(60);
  const [quickMarks, setQuickMarks] = useState<string | number>(100);

  const handleOpenSubmission = (sub: any) => {
    setSelectedSubmission(sub);
    setQuickDuration(sub.durationMinutes || 60);
    setQuickMarks(sub.totalMarks || 100);
    setIsQuickEditingMeta(false);
    setIsEditingQuestions(false);
  };

  const startEditingQuestions = () => {
    if (!selectedSubmission) return;
    let list: ManualQuestionItem[] = [];
    try {
      list = JSON.parse(selectedSubmission.questionData || "[]");
    } catch {
      list = [];
    }
    setEditingQuestions(list);
    setEditingDurationMinutes(selectedSubmission.durationMinutes || 60);
    setEditingTotalMarks(selectedSubmission.totalMarks || 100);
    setIsEditingQuestions(true);
  };

  const handleSaveEditedQuestions = () => {
    if (!selectedSubmission) return;
    setActionError(null);
    setActionSuccess(null);
    const safeDuration = Math.max(1, parseInt(String(editingDurationMinutes), 10) || 60);
    const safeMarks = Math.max(1, parseInt(String(editingTotalMarks), 10) || 100);
    setEditingDurationMinutes(safeDuration);
    setEditingTotalMarks(safeMarks);
    startTransition(async () => {
      const res = await updateTeacherSubmissionQuestionsAction(
        selectedSubmission.id,
        editingQuestions,
        safeDuration,
        safeMarks
      );
      if (!res.success) {
        setActionError(res.error || "Failed to update questions.");
      } else {
        const updatedDataStr = JSON.stringify(res.updatedQuestions || editingQuestions);
        const finalDuration = res.durationMinutes || safeDuration;
        const finalMarks = res.totalMarks || safeMarks;
        setSelectedSubmission((prev: any) => ({
          ...prev,
          questionData: updatedDataStr,
          durationMinutes: finalDuration,
          totalMarks: finalMarks,
        }));
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === selectedSubmission.id
              ? {
                  ...s,
                  questionData: updatedDataStr,
                  durationMinutes: finalDuration,
                  totalMarks: finalMarks,
                }
              : s
          )
        );
        setIsEditingQuestions(false);
        setActionSuccess(
          `Questions, allocated time (${finalDuration} mins), and total marks (${finalMarks} marks) updated successfully! Ready for CBT conversion.`
        );
      }
    });
  };

  const handleQuickSaveMeta = () => {
    if (!selectedSubmission) return;
    setActionError(null);
    setActionSuccess(null);
    const safeDuration = Math.max(1, parseInt(String(quickDuration), 10) || 60);
    const safeMarks = Math.max(1, parseInt(String(quickMarks), 10) || 100);
    setQuickDuration(safeDuration);
    setQuickMarks(safeMarks);
    startTransition(async () => {
      const res = await updateTeacherSubmissionMetadataAction(
        selectedSubmission.id,
        safeDuration,
        safeMarks
      );
      if (!res.success) {
        setActionError(res.error || "Failed to update time and marks.");
      } else {
        const finalDuration = res.durationMinutes || safeDuration;
        const finalMarks = res.totalMarks || safeMarks;
        setSelectedSubmission((prev: any) => ({
          ...prev,
          durationMinutes: finalDuration,
          totalMarks: finalMarks,
        }));
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === selectedSubmission.id
              ? {
                  ...s,
                  durationMinutes: finalDuration,
                  totalMarks: finalMarks,
                }
              : s
          )
        );
        setIsQuickEditingMeta(false);
        setActionSuccess(
          `Allocated time (${finalDuration} mins) and total marks (${finalMarks} marks) saved successfully!`
        );
      }
    });
  };


  const filteredSubmissions = submissions.filter((s) => {
    if (statusFilter === "ALL") return true;
    return s.status === statusFilter;
  });

  const handleReview = (id: number, status: "APPROVED" | "REJECTED") => {
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await reviewTeacherSubmissionAction(id, status, feedbackInput);
      if (!res.success) {
        setActionError(res.error || "Failed to update review status.");
      } else {
        setActionSuccess(`Submission marked as ${status}.`);
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status, adminFeedback: feedbackInput } : s))
        );
        if (selectedSubmission?.id === id) {
          setSelectedSubmission((prev: any) => ({ ...prev, status, adminFeedback: feedbackInput }));
        }
        setFeedbackInput("");
      }
    });
  };

  const handleConvertToExam = (id: number) => {
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const sub = submissions.find((s) => s.id === id);
      const subTitle = sub ? `${sub.subject} (${sub.targetClass})` : "Teacher Submission";

      const res = await convertTeacherSubmissionToCbtExamAction(id);
      if (!res.success) {
        setActionError(res.error || "Failed to convert submission to CBT exam.");
      } else {
        // Cleanly close the review modal immediately
        setSelectedSubmission(null);
        setFeedbackInput("");

        // Prominent confirmation message
        setActionSuccess(
          `🎉 CBT Exam Created! "${subTitle}" has been successfully approved and converted into live CBT Exam #${res.examId}. All questions have been imported and are immediately ready in the CBT engine!`
        );

        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: "APPROVED", adminFeedback: `Converted to CBT Exam #${res.examId}` } : s
          )
        );

        if (onExamCreated) {
          onExamCreated(res.exam);
        }

        // Scroll smoothly to top so admin immediately sees the confirmation banner
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });
  };

  const handleDeleteSubmission = (id: number, subject?: string) => {
    if (!confirm(`Are you sure you want to delete this question submission for "${subject || "this subject"}"?`)) return;
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const res = await deleteTeacherSubmissionAction(id);
      if (!res.success) {
        setActionError(res.error || "Failed to delete submission.");
      } else {
        setActionSuccess("Question submission deleted successfully.");
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (selectedSubmission?.id === id) {
          setSelectedSubmission(null);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-secondary-400/20 text-secondary-400 border border-secondary-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Staff Submissions Desk</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
            Teacher Question Submissions
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
            Review examination papers submitted by subject teachers with marks and allocated time. Preview question sheet snapshots or 1-click convert manual questions into live CBT exams.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="w-full md:w-auto max-w-full overflow-x-auto no-scrollbar p-1 sm:p-1.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-1 sm:gap-1.5">
          {(["ALL", "PENDING", "DRAFT", "APPROVED", "REJECTED"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition whitespace-nowrap ${
                statusFilter === filter
                  ? "bg-secondary-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {filter === "DRAFT" ? "Drafts" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xl">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-white block">Success</span>
              <span className="text-emerald-200 text-xs sm:text-[13px] leading-relaxed block">{actionSuccess}</span>
            </div>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="p-1 text-emerald-400 hover:text-white rounded-lg hover:bg-emerald-900/60 transition shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-red-950/80 border border-red-600/80 text-red-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xl">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-white block">Error</span>
              <span className="text-red-200 text-xs sm:text-[13px] leading-relaxed block">{actionError}</span>
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="p-1 text-red-400 hover:text-white rounded-lg hover:bg-red-900/60 transition shrink-0"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Submissions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs">No teacher question submissions found for &quot;{statusFilter}&quot;.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (Visible on small screens) */}
            <div className="md:hidden divide-y divide-slate-800">
              {filteredSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-white text-sm">{sub.subject}</strong>
                        <span className="text-[11px] font-bold text-secondary-400">{sub.targetClass}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        By {sub.teacherName} • {new Date(sub.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        sub.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : sub.status === "REJECTED"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : sub.status === "DRAFT"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {sub.status === "DRAFT" ? "Draft (In Progress)" : sub.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        sub.submissionType === "PDF"
                          ? "bg-rose-900/60 text-rose-300 border border-rose-800"
                          : sub.submissionType === "IMAGE"
                          ? "bg-purple-900/60 text-purple-300 border border-purple-800"
                          : "bg-blue-900/60 text-blue-300 border border-blue-800"
                      }`}
                    >
                      {sub.submissionType}
                    </span>
                    <span className="text-slate-300 font-mono">{sub.durationMinutes} mins</span>
                    <span className="text-secondary-400 font-bold">{sub.totalMarks} Marks</span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => handleOpenSubmission(sub)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>

                    {sub.submissionType === "MANUAL" && sub.status !== "APPROVED" && sub.status !== "DRAFT" && (
                      <button
                        onClick={() => handleConvertToExam(sub.id)}
                        disabled={isPending}
                        className="flex-1 py-2 rounded-xl bg-secondary-400 hover:bg-secondary-300 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm active:scale-95"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>To CBT</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteSubmission(sub.id, sub.subject)}
                      disabled={isPending}
                      className="p-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800/80 transition flex items-center justify-center active:scale-95 shrink-0"
                      title="Delete question submission"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/60">
                    <th className="py-3 px-4">Subject &amp; Class</th>
                    <th className="py-3 px-4">Submitted By</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Allocated Time &amp; Marks</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <strong className="text-white block text-sm">{sub.subject}</strong>
                        <span className="text-[11px] font-bold text-secondary-400">{sub.targetClass}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-white font-medium block">{sub.teacherName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{sub.teacherEmail || "Staff"}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                            sub.submissionType === "PDF"
                              ? "bg-rose-900/60 text-rose-300 border border-rose-800"
                              : sub.submissionType === "IMAGE"
                              ? "bg-purple-900/60 text-purple-300 border border-purple-800"
                              : "bg-blue-900/60 text-blue-300 border border-blue-800"
                          }`}
                        >
                          {sub.submissionType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                          <span>{sub.durationMinutes} mins</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Award className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                          <span>{sub.totalMarks} Total Marks</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            sub.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : sub.status === "REJECTED"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : sub.status === "DRAFT"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {sub.status === "DRAFT" ? "Draft (In Progress)" : sub.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenSubmission(sub)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {sub.submissionType === "MANUAL" && sub.status !== "APPROVED" && sub.status !== "DRAFT" && (
                          <button
                            onClick={() => handleConvertToExam(sub.id)}
                            disabled={isPending}
                            className="px-2.5 py-1 rounded-lg bg-secondary-400 hover:bg-secondary-300 text-slate-950 text-xs font-bold transition inline-flex items-center gap-1 shadow-sm"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Convert to CBT</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteSubmission(sub.id, sub.subject)}
                          disabled={isPending}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-800/80 transition inline-flex items-center gap-1 active:scale-95"
                          title="Delete question submission"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="sheet-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="sheet-panel bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedSubmission.subject} ({selectedSubmission.targetClass})
                </h3>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mt-1">
                  <span>By {selectedSubmission.teacherName}</span>
                  <span>&bull;</span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-secondary-400" />
                    {selectedSubmission.durationMinutes} mins
                  </span>
                  <span>&bull;</span>
                  <span className="inline-flex items-center gap-1 font-bold text-secondary-400">
                    <Award className="w-3.5 h-3.5" />
                    {selectedSubmission.totalMarks} Marks
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickDuration(selectedSubmission.durationMinutes || 60);
                      setQuickMarks(selectedSubmission.totalMarks || 100);
                      setIsQuickEditingMeta((prev) => !prev);
                    }}
                    className="text-[11px] text-amber-300 hover:text-amber-200 font-bold underline ml-1 cursor-pointer"
                  >
                    {isQuickEditingMeta ? "Cancel Edit" : "Edit Time & Marks"}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg self-start sm:self-center"
              >
                Close
              </button>
            </div>

            {/* Quick Edit Time & Marks Banner */}
            {isQuickEditingMeta && (
              <div className="bg-slate-950 border border-amber-500/50 p-3.5 rounded-2xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Edit3 className="w-3.5 h-3.5" />
                    Modify Allocated Time & Total Marks
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-secondary-400" />
                      Allocated Time (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="360"
                      value={quickDuration}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setQuickDuration(e.target.value)}
                      onBlur={() => {
                        if (String(quickDuration).trim() === "") setQuickDuration(60);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs focus:outline-none focus:border-secondary-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                      <Award className="w-3.5 h-3.5 text-secondary-400" />
                      Total Paper Marks
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={quickMarks}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setQuickMarks(e.target.value)}
                      onBlur={() => {
                        if (String(quickMarks).trim() === "") setQuickMarks(100);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono font-bold text-xs focus:outline-none focus:border-secondary-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsQuickEditingMeta(false)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickSaveMeta}
                    disabled={isPending}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isPending ? "Saving..." : "Save Time & Marks"}</span>
                  </button>
                </div>
              </div>
            )}


            {/* Submission Content: PDF, Image, or Manual */}
            {(selectedSubmission.submissionType === "PDF" ||
              selectedSubmission.imageUrl?.startsWith("data:application/pdf") ||
              selectedSubmission.imageUrl?.includes(".pdf")) && selectedSubmission.imageUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">Official Question Document (PDF)</span>
                      <span className="text-[11px] text-slate-400">Uploaded by subject teacher for academic review</span>
                    </div>
                  </div>
                  <a
                    href={selectedSubmission.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`${selectedSubmission.subject.replace(/\s+/g, "_")}_Questions.pdf`}
                    className="px-3 py-1.5 bg-secondary-400 hover:bg-secondary-300 text-slate-950 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 transition shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open / Download PDF</span>
                  </a>
                </div>
                <div className="w-full h-96 bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                  <iframe
                    src={selectedSubmission.imageUrl}
                    title="Teacher PDF Document Preview"
                    className="w-full h-full rounded-xl border-none"
                  />
                </div>
              </div>
            )}

            {selectedSubmission.submissionType === "IMAGE" &&
              !selectedSubmission.imageUrl?.startsWith("data:application/pdf") &&
              selectedSubmission.imageUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-secondary-400 block uppercase tracking-wider">
                    Uploaded Question Paper Sheet (Image):
                  </span>
                  <a
                    href={selectedSubmission.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`${selectedSubmission.subject.replace(/\s+/g, "_")}_QuestionSheet.png`}
                    className="text-xs text-secondary-400 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View Fullscreen</span>
                  </a>
                </div>
                <div className="relative w-full h-96 bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <img
                    src={selectedSubmission.imageUrl}
                    alt="Question Sheet"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            )}

            {selectedSubmission.submissionType === "MANUAL" && selectedSubmission.questionData && !isEditingQuestions && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-secondary-400 block uppercase tracking-wider">
                    Structured Questions:
                  </span>
                  <button
                    type="button"
                    onClick={startEditingQuestions}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                    title="Modify questions, fix typos, correct answer keys or adjust marks"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit / Correct Questions</span>
                  </button>
                </div>
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {JSON.parse(selectedSubmission.questionData).map((q: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="font-bold text-white flex justify-between items-start gap-2">
                        <span>Q{i + 1}: <FormattedMathText text={q.questionText} /></span>
                        <span className="text-secondary-400 shrink-0">{q.points === 0.5 ? "1/2" : q.points} pt(s)</span>
                      </div>
                      {q.imageUrl && (
                        <div className="mt-1 relative inline-block group">
                          <img
                            src={q.imageUrl}
                            alt="Question Diagram"
                            className="h-20 w-auto object-contain rounded-lg border border-slate-700 cursor-pointer hover:opacity-90 transition"
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
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {q.options?.map((opt: string, oIdx: number) => (
                            <div
                              key={oIdx}
                              className={`p-1.5 rounded ${
                                ["A", "B", "C", "D"][oIdx] === q.correctAnswer
                                  ? "bg-emerald-950 text-emerald-300 font-bold border border-emerald-800"
                                  : "bg-slate-900 text-slate-300"
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

            {selectedSubmission.submissionType === "MANUAL" && isEditingQuestions && (
              <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-amber-500/40 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Edit Questions (Fix Teacher Errors)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingQuestions(false)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditedQuestions}
                      disabled={isPending}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isPending ? "Saving..." : "Save Corrected Questions"}</span>
                    </button>
                  </div>
                </div>

                {/* Paper Time & Marks Controls */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-secondary-400" />
                      <span>Allocated Exam Time (Minutes)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="360"
                        value={editingDurationMinutes}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setEditingDurationMinutes(e.target.value)}
                        onBlur={() => {
                          if (String(editingDurationMinutes).trim() === "") setEditingDurationMinutes(60);
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-secondary-400 rounded-xl text-white font-mono font-bold text-xs"
                        placeholder="e.g. 60"
                      />
                      <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-bold">mins</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Duration allocated to students in the CBT examination engine
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-secondary-400" />
                        <span>Total Paper Marks</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const sum = editingQuestions.reduce(
                            (acc, q) =>
                              acc + (q.points != null ? Number(q.points) : q.questionType === "theory" ? 10 : 0.5),
                            0
                          );
                          setEditingTotalMarks(Math.round(sum));
                        }}
                        className="text-[10px] text-amber-300 hover:text-amber-200 underline font-bold cursor-pointer"
                        title="Auto-calculate total marks from sum of all question points"
                      >
                        Set to Question Sum (
                        {editingQuestions.reduce(
                          (acc, q) =>
                            acc + (q.points != null ? Number(q.points) : q.questionType === "theory" ? 10 : 0.5),
                          0
                        )}{" "}
                        pts)
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={editingTotalMarks}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setEditingTotalMarks(e.target.value)}
                        onBlur={() => {
                          if (String(editingTotalMarks).trim() === "") setEditingTotalMarks(100);
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-secondary-400 rounded-xl text-white font-mono font-bold text-xs"
                        placeholder="e.g. 100"
                      />
                      <span className="absolute right-3 top-2 text-[11px] text-secondary-400 font-bold">marks</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Total score possible for this examination paper
                    </span>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {editingQuestions.map((q, idx) => (
                    <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-yellow-400">Question {idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-slate-400 font-medium">Points:</label>
                          <select
                            value={q.points != null ? String(q.points) : "0.5"}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0.5;
                              setEditingQuestions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, points: val } : item))
                              );
                            }}
                            className="px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-yellow-300 font-bold text-xs"
                          >
                            <option value="0.5">1/2 pt (0.5 mark)</option>
                            <option value="1">1 pt (1 mark)</option>
                            <option value="1.5">1 1/2 pts (1.5 marks)</option>
                            <option value="2">2 pts (2 marks)</option>
                            <option value="2.5">2 1/2 pts (2.5 marks)</option>
                            <option value="3">3 pts (3 marks)</option>
                            <option value="4">4 pts (4 marks)</option>
                            <option value="5">5 pts (5 marks)</option>
                            <option value="10">10 pts</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete Question ${idx + 1}?`)) {
                                setEditingQuestions((prev) => prev.filter((_, i) => i !== idx));
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Remove this question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingQuestions((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, questionText: val } : item))
                          );
                        }}
                        placeholder="Question prompt text..."
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-yellow-400"
                      />

                      {/* Options A-D for Objective */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Options &amp; Correct Answer Key:</span>
                          <span className="text-emerald-400 font-bold">Correct Key: Option {q.correctAnswer || "A"}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {["A", "B", "C", "D"].map((letter, optIdx) => (
                            <div
                              key={letter}
                              className={`flex items-center gap-1.5 p-1 rounded-lg border ${
                                q.correctAnswer === letter
                                  ? "border-emerald-600 bg-emerald-950/40"
                                  : "border-slate-800 bg-slate-950"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingQuestions((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, correctAnswer: letter } : item))
                                  );
                                }}
                                className={`px-2 py-0.5 rounded font-bold text-xs transition ${
                                  q.correctAnswer === letter
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                                title={`Set ${letter} as correct answer`}
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={q.options?.[optIdx] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditingQuestions((prev) =>
                                    prev.map((item, i) => {
                                      if (i !== idx) return item;
                                      const nextOpts = [...(item.options || ["", "", "", ""])];
                                      nextOpts[optIdx] = val;
                                      return { ...item, options: nextOpts };
                                    })
                                  );
                                }}
                                placeholder={`Option ${letter}...`}
                                className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuestions((prev) => [
                        ...prev,
                        {
                          questionText: "",
                          options: ["", "", "", ""],
                          correctAnswer: "A",
                          points: 0.5,
                        },
                      ]);
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Add Another Question</span>
                  </button>
                </div>
              </div>
            )}

            {selectedSubmission.instructions && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                <strong className="text-white block mb-0.5">Teacher Instructions:</strong>
                {selectedSubmission.instructions}
              </div>
            )}

            {/* Admin Feedback Box */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Super Admin Review Feedback / Notes:
              </label>
              <textarea
                rows={2}
                placeholder="Enter feedback or modification requirements for the teacher..."
                defaultValue={selectedSubmission.adminFeedback || ""}
                onChange={(e) => setFeedbackInput(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-secondary-400"
              />
            </div>

            {/* Draft Notice if In Progress */}
            {selectedSubmission.status === "DRAFT" && (
              <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Teacher Draft In Progress:</strong> This paper was saved as a draft by the teacher and has not been formally submitted yet. Live CBT conversion and approval will unlock once the teacher completes submission.
                </span>
              </div>
            )}

            {/* Review Decision Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Current:</span>
                <span className="text-xs font-bold text-white">
                  {selectedSubmission.status === "DRAFT" ? "Draft (In Progress)" : selectedSubmission.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedSubmission.submissionType === "MANUAL" && selectedSubmission.status !== "DRAFT" && (
                  <button
                    onClick={() => handleConvertToExam(selectedSubmission.id)}
                    disabled={isPending}
                    className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>{isPending ? "Converting to Exam..." : "Approve & Create CBT Exam"}</span>
                  </button>
                )}

                <button
                  onClick={() => handleReview(selectedSubmission.id, "APPROVED")}
                  disabled={isPending}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Approve</span>
                </button>

                <button
                  onClick={() => handleReview(selectedSubmission.id, "REJECTED")}
                  disabled={isPending}
                  className="px-3.5 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => handleDeleteSubmission(selectedSubmission.id, selectedSubmission.subject)}
                  disabled={isPending}
                  className="px-3.5 py-1.5 bg-rose-950 hover:bg-rose-900 disabled:opacity-50 text-rose-300 border border-rose-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  title="Delete this submission"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
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
                Diagram / Figure Lightbox
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
    </div>
  );
}
