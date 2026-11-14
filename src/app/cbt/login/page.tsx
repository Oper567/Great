"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  GraduationCap,
  ArrowRight,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ChevronLeft,
  Check,
  HelpCircle,
  Wifi,
  ExternalLink,
} from "lucide-react";
import { studentLoginAction } from "@/app/actions/cbt-auth";

export default function StudentLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Controlled form state
  const [admNo, setAdmNo] = useState("");
  const [surname, setSurname] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("admNo", admNo);
    formData.append("surname", surname);

    startTransition(async () => {
      try {
        const result = await studentLoginAction(formData);
        if (!result || !result.success) {
          setErrorMessage(result?.error || "Authentication failed. Please check your credentials.");
        } else {
          setSuccessMessage(`Welcome back, ${result.student?.fullName}! Launching CBT Portal...`);
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i);
              if (
                key &&
                (key.startsWith("exam_") ||
                  key.includes("_answers") ||
                  key.includes("_startTime") ||
                  key.includes("_flags"))
              ) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // ignore
          }
          setTimeout(() => {
            window.location.href = "/cbt/dashboard";
          }, 500);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Connection error. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-yellow-500 selection:text-slate-950 font-sans">
      {/* Background Ambience / Cyber Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="px-4 sm:px-8 py-3 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 shadow-md shadow-blue-950">
              <Image
                src="/assets/images/school-logo.jpg"
                alt="GFMS Logo"
                width={32}
                height={32}
                className="rounded-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white tracking-tight leading-none">
                  GFMS CBT Portal
                </span>
                <span className="bg-yellow-500/20 text-yellow-400 text-[9px] font-bold px-1.5 py-0.2 rounded border border-yellow-500/30 uppercase tracking-wider">
                  SS 1 - SS 3
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden xs:inline">
                Computer-Based Examination System
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold">Live Server Online</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-3.5 sm:p-6 my-4 sm:my-6 relative z-10">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-8 backdrop-blur-xl relative">
          {/* Top Brand Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-yellow-400 to-emerald-500 rounded-t-3xl" />

          {/* School Header Identity */}
          <div className="text-center space-y-2 mb-5 sm:mb-6 pt-1">
            <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white p-1.5 shadow-xl shadow-blue-950/80 mx-auto ring-4 ring-blue-500/20">
              <Image
                src="/assets/images/school-logo.jpg"
                alt="Great-Favour Montessori School Crest"
                width={60}
                height={60}
                className="rounded-xl object-contain"
                priority
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black tracking-widest uppercase bg-blue-900/60 text-yellow-300 border border-blue-700/60 shadow-inner mt-2">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>Senior Secondary CBT Terminal</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-1.5">
                Candidate Verification
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Enter your official student credentials to begin your exam
              </p>
            </div>
          </div>

          {/* Gatekeeper Advisory Notice */}
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-2xl p-3 sm:p-3.5 mb-5 flex items-start gap-3 shadow-inner">
            <ShieldAlert className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-yellow-400 block">
                Official Examination Protocol
              </span>
              Strictly restricted to enrolled candidates in <strong className="text-white">SS 1, SS 2, &amp; SS 3</strong>. Anti-tamper proctoring is enabled.
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 bg-rose-950/70 border border-rose-800 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-200 text-xs animate-shake shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-bold block text-rose-300">Access Denied</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 bg-emerald-950/70 border border-emerald-700 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-200 text-xs shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-snug font-bold">{successMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="admNo"
                  className="block text-xs font-bold text-slate-300 uppercase tracking-wider"
                >
                  Admission Number
                </label>
                <span className="text-[10px] text-slate-500 font-mono">e.g. GFMS/SS/2024/001</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4 text-yellow-400/80" />
                </div>
                <input
                  id="admNo"
                  name="admNo"
                  type="text"
                  required
                  value={admNo}
                  onChange={(e) => setAdmNo(e.target.value)}
                  placeholder="GFMS/SS/2024/..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/90 rounded-xl text-base text-white placeholder-slate-600 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/25 transition-all font-mono tracking-wide"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="surname"
                  className="block text-xs font-bold text-slate-300 uppercase tracking-wider"
                >
                  Student Surname (Last Name)
                </label>
                <span className="text-[10px] text-slate-500">Case-insensitive</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4 text-yellow-400/80" />
                </div>
                <input
                  id="surname"
                  name="surname"
                  type="text"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="e.g. Okeke"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/90 rounded-xl text-base text-white placeholder-slate-600 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/25 transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full min-h-[52px] mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-blue-950/80 border border-blue-500/50 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Candidate Records...</span>
                </>
              ) : (
                <>
                  <span>Enter CBT Examination Hall</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-yellow-400" />
                </>
              )}
            </button>
          </form>

          {/* Institutional Integrity & Proctoring Notice */}
          <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-center space-y-1">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Locked candidate session. Responses are encrypted &amp; continuously auto-saved.
            </p>
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 font-medium">
              <span>Anti-Cheating Shield</span>
              <span>&bull;</span>
              <span>Zero Lost Data</span>
              <span>&bull;</span>
              <span>Automatic Timing</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 sm:px-6 text-center border-t border-slate-800/60 bg-slate-950/60 relative z-10 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2 overflow-hidden">
        <span className="break-words text-center sm:text-left">
          &copy; {new Date().getFullYear()} Great-Favour Montessori School (GFMS) &bull; Academic Examination Council
        </span>
        <span className="text-[10px] text-slate-600 font-mono break-words text-center sm:text-right">
          System Build v2.5 &bull; CloudLinux &bull; Secure CBT Engine
        </span>
      </footer>
    </div>
  );
}
