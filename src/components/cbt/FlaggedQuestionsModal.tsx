"use client";

import React from "react";
import { Flag, X, Edit3, CheckCircle2, Clock, User } from "lucide-react";
import { FlaggedQuestionSummaryItem } from "@/types/cbt";
import { FormattedMathText } from "@/components/cbt/FormattedMathText";

interface FlaggedQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  items: FlaggedQuestionSummaryItem[];
  highlightStudentAdmNo?: string | null;
  onEditQuestion?: (item: FlaggedQuestionSummaryItem) => void;
  isLoading?: boolean;
}

export function FlaggedQuestionsModal({
  isOpen,
  onClose,
  title = "Flagged Questions Review",
  subtitle = "Questions marked by students for clarification or review during CBT.",
  items,
  highlightStudentAdmNo = null,
  onEditQuestion,
  isLoading = false,
}: FlaggedQuestionsModalProps) {
  if (!isOpen) return null;

  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">{title}</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 text-[11px] font-bold">
                  {items.length} Flagged Question{items.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
            aria-label="Close flagged questions modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading flagged questions...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Flag className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-white">No Flagged Questions</div>
              <p className="text-xs text-slate-400">
                No candidates have flagged any objective questions for this view.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const visibleStudents = highlightStudentAdmNo
                ? item.flaggedByStudents.filter(
                    (s) => s.studentAdmNo.toLowerCase() === highlightStudentAdmNo.toLowerCase()
                  )
                : item.flaggedByStudents;
              const focusedStudent = highlightStudentAdmNo ? visibleStudents[0] : null;

              return (
                <div
                  key={`${item.examId}-${item.questionId}`}
                  className="bg-slate-950/90 border border-amber-700/40 rounded-xl p-4 space-y-3"
                >
                  {/* Top metadata + Edit button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                        Q{item.questionNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 text-[11px] font-bold">
                        {item.examSubject} ({item.targetClass})
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-xs">
                        {item.examTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-700/70 text-rose-300 text-[10px] font-bold inline-flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        <span>
                          Flagged by {item.flagCount} candidate{item.flagCount === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>

                    {onEditQuestion && (
                      <button
                        type="button"
                        onClick={() => onEditQuestion(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-[11px] font-bold inline-flex items-center gap-1.5 transition active:scale-95"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Question</span>
                      </button>
                    )}
                  </div>

                  {/* Question Stem */}
                  <div className="text-xs sm:text-sm text-white font-medium leading-relaxed whitespace-pre-wrap">
                    <FormattedMathText text={item.questionText} />
                  </div>

                  {item.imageUrl && (
                    <div>
                      <img
                        src={item.imageUrl}
                        alt={`Question ${item.questionNumber} Figure`}
                        className="max-h-36 rounded-lg border border-slate-800 bg-black/40 object-contain"
                      />
                    </div>
                  )}

                  {/* Options A-D */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {optionLetters.map((letter, idx) => {
                      const optText = item.options[idx] ?? "";
                      const isKey = item.correctAnswer === letter;
                      const isChosenByFocused = focusedStudent?.selectedOption === letter;

                      return (
                        <div
                          key={letter}
                          className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${
                            isKey
                              ? "bg-emerald-950/50 border-emerald-600/80 text-emerald-200 font-semibold"
                              : isChosenByFocused
                              ? "bg-amber-950/50 border-amber-600/80 text-amber-200"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isKey
                                ? "bg-emerald-600 text-white"
                                : isChosenByFocused
                                ? "bg-amber-600 text-white"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="flex-1 min-w-0">
                            <FormattedMathText text={optText} />
                          </span>
                          <div className="flex flex-col items-end gap-0.5 shrink-0 text-[10px] font-bold">
                            {isKey && <span className="text-emerald-400">✓ KEY</span>}
                            {isChosenByFocused && (
                              <span className="text-amber-300">Chosen</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Students who flagged */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Flagged By:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(visibleStudents.length > 0 ? visibleStudents : item.flaggedByStudents).map((st) => (
                        <div
                          key={`${item.questionId}-${st.attemptId}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                        >
                          <User className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="font-bold">{st.studentFullName}</span>
                          <span className="font-mono text-yellow-400 text-[10px]">{st.studentAdmNo}</span>
                          <span className="text-slate-500">&bull;</span>
                          <span className="font-mono text-[10px] text-sky-300">
                            Ans: {st.selectedOption || "None"}
                          </span>
                          <span title={st.isCompleted ? "Submitted" : "In Progress"}>
                            {st.isCompleted ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
