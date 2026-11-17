"use client";

import React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastFeedbackState {
  type: "success" | "error";
  text: string;
}

interface ToastBannerProps {
  toast: ToastFeedbackState | null;
  onDismiss: () => void;
}

/**
 * Floating confirmation toast rendered on top of Admin/Staff workspaces
 * so Created / Saved / Updated / Deleted confirmations are always visible
 * regardless of modal closure or scroll position.
 */
export function ToastBanner({ toast, onDismiss }: ToastBannerProps) {
  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-[80] pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200 no-print"
    >
      <div
        className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md flex items-start gap-2.5 text-xs font-bold ${
          isSuccess
            ? "bg-emerald-950/95 border-emerald-500/70 text-emerald-100 shadow-emerald-950/60"
            : "bg-rose-950/95 border-rose-500/70 text-rose-100 shadow-rose-950/60"
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        )}
        <span className="flex-1 leading-relaxed">{toast.text}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="p-0.5 rounded-md text-white/60 hover:text-white transition shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
