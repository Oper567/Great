"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquareText,
  X,
  PlusCircle,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  DEFAULT_REMARK_TEMPLATES,
  PerformanceRemarkTemplateTier,
  RemarkBadgeColor,
  formatRemarkTemplateText,
  normalizeRemarkTemplates,
} from "@/lib/remark-templates";

interface RemarkTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: PerformanceRemarkTemplateTier[];
  onSave: (updated: PerformanceRemarkTemplateTier[]) => Promise<void> | void;
  isSaving?: boolean;
  feedbackMsg?: string | null;
}

const COLOR_BADGE_MAP: Record<RemarkBadgeColor, string> = {
  emerald: "bg-emerald-950/80 border-emerald-700 text-emerald-300",
  blue: "bg-blue-950/80 border-blue-700 text-blue-300",
  cyan: "bg-cyan-950/80 border-cyan-700 text-cyan-300",
  amber: "bg-amber-950/80 border-amber-700 text-amber-300",
  rose: "bg-rose-950/80 border-rose-700 text-rose-300",
};

export function RemarkTemplatesModal({
  isOpen,
  onClose,
  templates,
  onSave,
  isSaving = false,
  feedbackMsg = null,
}: RemarkTemplatesModalProps) {
  const [editingTiers, setEditingTiers] = useState<PerformanceRemarkTemplateTier[]>(templates);

  useEffect(() => {
    if (isOpen) {
      setEditingTiers(normalizeRemarkTemplates(templates));
    }
  }, [isOpen, templates]);

  if (!isOpen) return null;

  const updateTier = (idx: number, patch: Partial<PerformanceRemarkTemplateTier>) => {
    setEditingTiers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleAddTier = () => {
    setEditingTiers((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        label: "Custom Band",
        minScore: 0,
        maxScore: 39,
        teacherRemark: "Satisfactory effort recorded. Keep working steadily next term.",
        principalRemark: "Encourage steady progress with consistent supervision.",
        badgeColor: "amber",
      },
    ]);
  };

  const handleResetDefaults = () => {
    setEditingTiers(DEFAULT_REMARK_TEMPLATES.map((t) => ({ ...t })));
  };

  return (
    <div className="sheet-overlay fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="sheet-panel bg-slate-900 border border-indigo-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>Performance Remark Templates</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700 text-indigo-300 text-[10px] font-bold">
                  {editingTiers.length} Tiers
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit Teacher &amp; Principal remarks for Excellent Result, Very Good, Good, Fair, and Pass based on student average %.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
            aria-label="Close Remark Templates Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {feedbackMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Toolbar Hints */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Optional variables you can type inside remarks:</span>
              {["{name}", "{firstName}", "{average}%", "{class}"].map((tok) => (
                <code
                  key={tok}
                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono text-[10px]"
                >
                  {tok}
                </code>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddTier}
              className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 font-bold text-xs inline-flex items-center gap-1 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Custom Tier</span>
            </button>
          </div>

          {/* Editable Tier Cards */}
          <div className="space-y-3">
            {editingTiers.map((tier, idx) => {
              const badgeStyle = COLOR_BADGE_MAP[tier.badgeColor || "blue"];
              const previewSampleScore = Math.round((Number(tier.minScore) + Number(tier.maxScore)) / 2);

              return (
                <div
                  key={tier.id || idx}
                  className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow"
                >
                  {/* Row 1: Label, Range, Badge Color, Delete */}
                  <div className="grid grid-cols-12 gap-2.5 items-end">
                    <div className="col-span-12 sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Performance Label
                      </label>
                      <input
                        type="text"
                        value={tier.label}
                        onChange={(e) => updateTier(idx, { label: e.target.value })}
                        placeholder="e.g. Excellent Result"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="col-span-7 sm:col-span-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Average Score Range (%)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={tier.minScore}
                          onChange={(e) =>
                            updateTier(idx, {
                              minScore: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                            })
                          }
                          className="w-1/2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-slate-500 font-bold text-xs">–</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={tier.maxScore}
                          onChange={(e) =>
                            updateTier(idx, {
                              maxScore: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                            })
                          }
                          className="w-1/2 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="col-span-4 sm:col-span-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Tag Style
                      </label>
                      <select
                        value={tier.badgeColor || "blue"}
                        onChange={(e) =>
                          updateTier(idx, { badgeColor: e.target.value as RemarkBadgeColor })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="emerald">Green (Excellent)</option>
                        <option value="blue">Blue (Very Good)</option>
                        <option value="cyan">Cyan (Good)</option>
                        <option value="amber">Amber (Fair)</option>
                        <option value="rose">Rose (Pass / Focus)</option>
                      </select>
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        disabled={editingTiers.length <= 2}
                        onClick={() => setEditingTiers((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 disabled:opacity-30 transition"
                        title="Delete tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Editable Teacher & Principal Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Class Teacher&apos;s Remark Content
                      </label>
                      <textarea
                        rows={2}
                        value={tier.teacherRemark}
                        onChange={(e) => updateTier(idx, { teacherRemark: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Enter class teacher remark for this performance band..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Director / Principal&apos;s Remark Content
                      </label>
                      <textarea
                        rows={2}
                        value={tier.principalRemark}
                        onChange={(e) => updateTier(idx, { principalRemark: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Enter principal remark for this performance band..."
                      />
                    </div>
                  </div>

                  {/* Preview chip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${badgeStyle}`}>
                      {tier.label} ({tier.minScore}% – {tier.maxScore}%)
                    </span>
                    {tier.teacherRemark.includes("{") && (
                      <span className="text-slate-400 italic truncate max-w-lg">
                        Sample:{" "}
                        {formatRemarkTemplateText(tier.teacherRemark, {
                          studentName: "Adaobi Okonkwo",
                          average: previewSampleScore,
                          className: "JSS 2 Diamond",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to 5 Default Remarks</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onSave(normalizeRemarkTemplates(editingTiers))}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow inline-flex items-center gap-1.5 transition disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save & Apply Remark Templates"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
