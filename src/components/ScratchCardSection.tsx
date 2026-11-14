"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  ArrowRight,
  Eye,
  Award,
  FileCheck2,
  Users,
  Printer,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function ScratchCardSection() {
  const [quickPin, setQuickPin] = useState("");

  return (
    <section className="py-16 sm:py-20 bg-primary-950 text-white border-b border-primary-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-5 reveal-init reveal-fade-left delay-100">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-secondary-400 text-slate-950 text-[11px] font-extrabold uppercase tracking-widest">
              <Award className="w-3.5 h-3.5" />
              <span>Official Scratch Card Result Portal</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Verify Termly Report Cards &amp; Download Official A4 Transcripts
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Parents and guardians can verify student terminal evaluations online using official scratch card PINs. Each report includes full cognitive scores (15 CA1 + 15 CA2 + 70 Exam), psychomotor ratings, and one-click full-page A4 vector PDF export.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-primary-900/80 p-3.5 rounded-xl border border-white/10">
                <FileCheck2 className="w-4 h-4 text-secondary-400 mb-1.5" />
                <strong className="block text-white font-bold">Cognitive Breakdown</strong>
                <span className="text-slate-300 text-[11px]">15 CA1 + 15 CA2 + 70 Exam = 100</span>
              </div>
              <div className="bg-primary-900/80 p-3.5 rounded-xl border border-white/10">
                <Users className="w-4 h-4 text-secondary-400 mb-1.5" />
                <strong className="block text-white font-bold">Affective &amp; Skills</strong>
                <span className="text-slate-300 text-[11px]">12 Traits &amp; 9 Psychomotor ratings</span>
              </div>
              <div className="bg-primary-900/80 p-3.5 rounded-xl border border-white/10">
                <Printer className="w-4 h-4 text-secondary-400 mb-1.5" />
                <strong className="block text-white font-bold">Full-Page A4 PDF</strong>
                <span className="text-slate-300 text-[11px]">Zero-overflow vector PDF sheet</span>
              </div>
            </div>

            {/* Quick Result Checker Input */}
            <div className="bg-primary-900/90 rounded-2xl p-4 sm:p-5 border border-white/15 space-y-3 mt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-secondary-400 text-slate-950 flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Instant Scratch Card Verification
                    </h4>
                    <p className="text-[11px] text-slate-300">Enter 12-character Scratch Card PIN</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickPin("GFMS-8492-1049")}
                  className="text-[11px] bg-white/10 hover:bg-white/20 text-secondary-300 font-bold px-2.5 py-1 rounded-md border border-white/15 transition flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-secondary-400" />
                  <span>Auto-Fill Demo PIN</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="e.g. GFMS-8492-1049"
                  value={quickPin}
                  onChange={(e) => setQuickPin(e.target.value)}
                  className="flex-1 text-sm px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-secondary-400 font-mono uppercase bg-slate-950/70 text-white placeholder:text-slate-400"
                />
                <Link
                  href={quickPin.trim() ? `/result?pin=${encodeURIComponent(quickPin.trim())}` : "/result"}
                  className="text-sm font-extrabold bg-secondary-400 hover:bg-secondary-300 text-slate-950 px-6 py-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 shadow-md"
                >
                  <span>Verify Result</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 pt-1">
                <span>Want to inspect a sample report sheet immediately?</span>
                <Link
                  href="/results/demo"
                  className="font-bold text-secondary-400 hover:text-secondary-300 flex items-center gap-1"
                >
                  <span>Open Live Demo Report (JSS 2)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right — Test Credentials Preview */}
          <div className="lg:col-span-5 reveal-init reveal-fade-right delay-200">
            <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold text-primary-800 uppercase tracking-widest block">
                    Live Demonstration Credentials
                  </span>
                  <h3 className="text-sm font-extrabold text-primary-950 mt-0.5">
                    Sample Student Verification Card
                  </h3>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold px-2.5 py-1 rounded-md">
                  Active Demo
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-slate-500 font-sans font-semibold">Student Name:</span>
                  <span className="text-primary-950 font-bold">Okeke, Somtochukwu Grace</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-slate-500 font-sans font-semibold">Admission No:</span>
                  <span className="text-primary-800 font-bold">GFMS/2024/0501</span>
                </div>
                <div className="flex justify-between items-center bg-secondary-50 p-2.5 rounded-lg border border-secondary-200">
                  <span className="text-slate-600 font-sans font-semibold">Scratch Card PIN:</span>
                  <span className="text-primary-950 font-black">GFMS-8492-1049</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-slate-500 font-sans font-semibold">Term / Session:</span>
                  <span className="text-slate-800 font-bold">Third Term &bull; 2025/2026</span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-primary-800 shrink-0 mt-0.5" />
                <span>
                  Cryptographically bound scratch cards enforce a maximum of <strong>3 verification checks</strong> per term and lock to the student&apos;s admission number on first use.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Link
                  href="/result?pin=GFMS-8492-1049"
                  className="font-extrabold text-xs bg-primary-950 hover:bg-primary-900 text-white px-4 py-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-secondary-400" />
                  <span>Verify With PIN</span>
                </Link>
                <Link
                  href="/results/demo"
                  className="font-extrabold text-xs bg-secondary-400 hover:bg-secondary-300 text-slate-950 px-4 py-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Direct Report View</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
