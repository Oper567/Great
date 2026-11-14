"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";
import { StudentSession } from "@/types/cbt";
import { studentLogoutAction } from "@/app/actions/cbt-auth";
import { formatClassWithArm, parseClassAndArm } from "@/lib/cbt-utils";

interface ExamItem {
  id: number;
  title: string;
  subject: string;
  targetClass: string;
  durationMinutes: number;
  hasTheory: boolean;
  examDate: Date;
  objectiveCount: number;
  theoryCount: number;
  attempt?: {
    isCompleted: boolean;
    objectiveScore: number;
    theoryScore: number | null;
    totalScore: number;
  } | null;
}

interface Props {
  student: StudentSession;
  exams: ExamItem[];
  initialError?: string;
}

export default function StudentDashboardClient({
  student,
  exams,
  initialError,
}: Props) {
  const router = useRouter();
  const [isLoggingOut, startLogout] = useTransition();
  const parsedStudentClass = parseClassAndArm(student.currentClass, student.arm);
  const displayClassWithArm = formatClassWithArm(student.currentClass, student.arm);

  const handleLogout = () => {
    startLogout(async () => {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("exam_") || key.includes("_answers") || key.includes("_startTime") || key.includes("_flags"))) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // ignore
      }
      await studentLogoutAction();
      window.location.href = "/cbt/login";
    });
  };

  const isSubdomain = typeof window !== "undefined" && (window.location.hostname.startsWith("cbt.") || window.location.hostname === "cbt.localhost");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-yellow-500 selection:text-blue-950">
      {/* Institutional Top App Bar */}
      <header className="bg-slate-950/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 shadow-md shadow-blue-950">
              <Image
                src="/logo.jpg"
                alt="GFMS Logo"
                width={36}
                height={36}
                className="rounded-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Great-Favour Montessori School
                </h1>
                <span className="hidden sm:inline-block bg-blue-900/80 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-700/60 uppercase">
                  CBT Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Senior Secondary Examination Terminal
              </p>
            </div>
          </div>

          {/* Student Profile Quick Badge & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                <span>{student.fullName}</span>
                <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                  {parsedStudentClass.baseLevel || student.currentClass}
                </span>
                {parsedStudentClass.arm && (
                  <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/70 text-[10px] px-1.5 py-0.5 rounded font-bold">
                    {parsedStudentClass.arm}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {student.admNo}
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Sign out of CBT portal"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Candidate Welcome & Exam Integrity Protocol Banner */}
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-950 border border-blue-800/60 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-yellow-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Candidate Examination Center
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Welcome, {student.fullName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Registered Class: <strong className="text-yellow-400">{displayClassWithArm}</strong>
                {parsedStudentClass.arm ? (
                  <>
                    {" "}• Stream / Arm: <strong className="text-emerald-400">{parsedStudentClass.arm}</strong>
                  </>
                ) : null}{" "}
                • Admission No: <span className="font-mono text-white font-semibold">{student.admNo}</span>. Below are your scheduled terminal CBT papers.
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Available Papers</div>
                <div className="text-lg font-black text-white">{exams.length}</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Completed</div>
                <div className="text-lg font-black text-emerald-400">
                  {exams.filter((e) => e.attempt?.isCompleted).length}
                </div>
              </div>
            </div>
          </div>

          {/* Hybrid Exam Advisory Box */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-medium">Single Payload Architecture:</strong>
                Zero server lag. Once started, your questions and timer run entirely in your local browser window.
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-yellow-950/30 p-2.5 rounded-xl border border-yellow-900/40">
              <FileText className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-yellow-400 block font-medium">Hybrid Examination Model:</strong>
                Objective questions are submitted and graded instantly. Theory answers must be written on your physical answer booklet.
              </div>
            </div>
          </div>
        </div>

        {initialError && (
          <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-4 flex items-center gap-3 text-rose-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{initialError}</span>
          </div>
        )}

        {/* Exams Section Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-yellow-400" />
              Scheduled Examination Papers
            </h3>
            <p className="text-xs text-slate-400">
              Select an active examination to launch your test session.
            </p>
          </div>
        </div>

        {/* Exams Grid */}
        {exams.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">No Examinations Currently Active</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              There are currently no active CBT papers assigned to {displayClassWithArm}. Please check back according to the official school examination timetable.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((exam) => {
              const attempt = exam.attempt;
              const isCompleted = attempt?.isCompleted;

              return (
                <div
                  key={exam.id}
                  className={`bg-slate-950/80 border rounded-2xl p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-lg ${
                    isCompleted
                      ? "border-slate-800 opacity-90"
                      : "border-slate-700/80 hover:border-yellow-500/60 hover:shadow-yellow-500/5 hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top Subject & Class Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-900/60 text-blue-300 border border-blue-700/50">
                        {exam.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-yellow-400 border border-slate-700">
                        {exam.targetClass}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-white tracking-tight mt-2 line-clamp-2">
                      {exam.title}
                    </h4>

                    {/* Meta specifications */}
                    <div className="mt-4 space-y-2 text-xs text-slate-400 border-t border-b border-slate-800/80 py-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-yellow-400" />
                          Duration:
                        </span>
                        <span className="font-semibold text-white">
                          {exam.durationMinutes} Minutes
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          Objective Questions:
                        </span>
                        <span className="font-semibold text-white">
                          {exam.objectiveCount} Questions
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          Theory Questions:
                        </span>
                        <span className="font-semibold text-white">
                          {exam.hasTheory && exam.theoryCount > 0
                            ? `${exam.theoryCount} Prompts (Physical)`
                            : "None"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                          Proctor Security:
                        </span>
                        <span className="font-bold text-yellow-400">
                          Tab Lock Auto-Submit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA & Status */}
                  <div className="mt-5 pt-1">
                    {isCompleted ? (
                      <div className="space-y-2">
                        <button
                          disabled
                          className="w-full py-2.5 px-4 bg-slate-800/90 border border-slate-700 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            Completed • Objective: {attempt.objectiveScore} pts
                          </span>
                        </button>

                        <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] text-center text-slate-400">
                          {attempt.theoryScore === null ? (
                            <span className="text-yellow-400/90 flex items-center justify-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              Physical theory answers undergoing marking
                            </span>
                          ) : (
                            <span className="text-white font-medium">
                              Theory: <strong className="text-yellow-400">{attempt.theoryScore} pts</strong> • Total Score: <strong className="text-emerald-400">{attempt.totalScore} pts</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Link
                        href={`/cbt/exam/${exam.id}`}
                        prefetch={false}
                        className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/40 border border-blue-500/40 flex items-center justify-center gap-2 transition-all group active:scale-[0.99]"
                      >
                        <span>Start Examination</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-yellow-300" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Legal / Help Bar */}
      <footer className="py-4 px-4 border-t border-slate-800 bg-slate-950/60 text-center text-[11px] text-slate-500 break-words leading-relaxed overflow-hidden">
        Great-Favour Montessori School CBT Examination Portal &bull; Restricted to Senior Secondary (SS 1 - SS 3)
      </footer>
    </div>
  );
}
