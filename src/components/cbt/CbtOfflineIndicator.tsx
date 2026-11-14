"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function CbtOfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check initial status
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) {
    return null;
  }

  if (isOffline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-slate-950 font-bold px-4 py-2 shadow-2xl flex items-center justify-between gap-3 text-xs sm:text-sm border-b-2 border-amber-400 animate-in slide-in-from-top duration-300"
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
            <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              <strong>Network Disconnected:</strong> Exam Safe Mode is active. Your answers are auto-saved in local memory. Do not close this window.
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 bg-slate-950/15 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-extrabold">
            <ShieldAlert className="w-3.5 h-3.5" />
            Buffered Locally
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white font-bold px-4 py-2 shadow-2xl flex items-center justify-between gap-3 text-xs sm:text-sm border-b-2 border-emerald-400 animate-in slide-in-from-top duration-300"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-white shrink-0" />
          <span>
            <strong>Connection Restored:</strong> Examination terminal has reconnected to the school server.
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-extrabold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Synchronized
        </span>
      </div>
    </div>
  );
}
