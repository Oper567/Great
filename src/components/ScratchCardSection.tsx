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
} from "lucide-react";

export default function ScratchCardSection() {
  const [quickPin, setQuickPin] = useState("");

  return (
    <section className="py-20 bg-gradient-to-br from-primary-950 via-primary-900 to-slate-950 text-white border-b border-primary-900 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-secondary-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-primary-700/20 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Content */}
          <div className="lg:col-span-7 space-y-5 reveal-init reveal-fade-left delay-200">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-500 text-slate-950 text-xs font-bold shadow-sm">
              <Award className="w-3.5 h-3.5" />
              <span>Official Scratch Card Result Portal</span>
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Check Your Termly Report Card <span className="text-secondary-400">Instantly</span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Parents and guardians can verify student terminal evaluations instantly using scratch card PINs. Features cognitive domains, psychomotor ratings, and single-page A4 print optimization.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 hover:bg-white/15 transition group">
                <FileCheck2 className="w-4 h-4 text-secondary-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <strong className="block text-white">Cognitive Table</strong>
                <span className="text-slate-400 text-[11px]">15 CA1 + 15 CA2 + 70 Exam</span>
              </div>
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 hover:bg-white/15 transition group">
                <Users className="w-4 h-4 text-secondary-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <strong className="block text-white">Affective & Skills</strong>
                <span className="text-slate-400 text-[11px]">5-to-1 official ratings</span>
              </div>
              <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 hover:bg-white/15 transition group">
                <Printer className="w-4 h-4 text-secondary-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <strong className="block text-white">Compact Print</strong>
                <span className="text-slate-400 text-[11px]">Exact single-page A4</span>
              </div>
            </div>

            {/* Quick Result Checker Input */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary-400 text-slate-950 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Quick Result Checker
                    </h4>
                    <p className="text-[11px] text-slate-400">Enter your scratch card PIN</p>
                  </div>
                </div>
                <span className="text-[10px] bg-accent-green-700/20 text-accent-green-400 font-bold px-2 py-0.5 rounded-full border border-accent-green-700/30">
                  Term 3 Live
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. GFMS-8492-1049"
                  value={quickPin}
                  onChange={(e) => setQuickPin(e.target.value)}
                  className="flex-1 text-sm px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-secondary-400 font-mono uppercase bg-white/10 text-white placeholder:text-slate-500 shadow-inner backdrop-blur-sm"
                />
                <Link
                  href={quickPin.trim() ? `/result?pin=${encodeURIComponent(quickPin.trim())}` : "/result"}
                  className="text-sm font-bold bg-secondary-400 hover:bg-secondary-300 text-slate-950 px-6 py-3 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-md active:scale-95"
                >
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Or try demo card:</span>
                <Link
                  href="/results/demo"
                  className="font-bold text-secondary-400 hover:underline flex items-center gap-1"
                >
                  <span>Somtochukwu G. Okeke (JSS 2)</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right — Test Credentials Preview */}
          <div className="lg:col-span-5 reveal-init reveal-fade-right delay-350">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 space-y-4 hover:bg-white/15 transition-all">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-secondary-400 uppercase tracking-wider">
                  Test Scratch Card Credentials
                </span>
                <span className="text-[10px] bg-secondary-400 text-slate-950 font-extrabold px-2 py-0.5 rounded">
                  Demo Active
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between bg-black/20 p-2.5 rounded-lg">
                  <span className="text-slate-400">Student Name:</span>
                  <span className="text-white font-bold">Okeke, Somtochukwu Grace</span>
                </div>
                <div className="flex justify-between bg-black/20 p-2.5 rounded-lg">
                  <span className="text-slate-400">Admission No:</span>
                  <span className="text-secondary-300 font-bold">GFMS/2024/0501</span>
                </div>
                <div className="flex justify-between bg-black/20 p-2.5 rounded-lg">
                  <span className="text-slate-400">Scratch Card PIN:</span>
                  <span className="text-yellow-400 font-bold">GFMS-8492-1049</span>
                </div>
                <div className="flex justify-between bg-black/20 p-2.5 rounded-lg">
                  <span className="text-slate-400">Term / Session:</span>
                  <span className="text-white">Third Term &bull; 2025/2026</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Cards enforce strictly 3 checks and lock to the student&apos;s admission number upon first verification.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/result"
                  className="font-bold text-xs bg-secondary-400 hover:bg-secondary-300 text-slate-950 px-5 py-2.5 rounded-xl transition shadow-lg flex items-center gap-2 active:scale-95"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Result Portal</span>
                </Link>
                <Link
                  href="/results/demo"
                  className="font-bold text-xs bg-white/15 hover:bg-white/25 text-white border border-white/25 px-4 py-2.5 rounded-xl transition flex items-center gap-2 active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5 text-secondary-400" />
                  <span>Live Demo</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
