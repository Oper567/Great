"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  Key,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Monitor,
  FileCheck2,
  Users,
  GraduationCap,
  ChevronLeft,
  Briefcase,
  Layers,
  Award,
} from "lucide-react";
import { AdminSession } from "@/types/cbt";
import { adminLoginAction, adminLogoutAction } from "@/app/actions/cbt-auth";

interface Props {
  initialAdmin: AdminSession | null;
}

export default function StaffLoginClient({ initialAdmin }: Props) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(initialAdmin);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Auto redirect if already authenticated
  useEffect(() => {
    if (admin) {
      if (admin.role === "TEACHER") {
        window.location.href = "/staff";
      } else {
        window.location.href = "/admin/cbt";
      }
    }
  }, [admin]);

  // Submit Login
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    startTransition(async () => {
      try {
        const res = await adminLoginAction(formData);
        if (!res || !res.success) {
          setLoginError(res?.error || "Authentication failed. Please verify your credentials or server connection.");
        } else {
          setAdmin(res.admin || null);
          if (res.admin?.role === "TEACHER") {
            window.location.href = "/staff";
          } else {
            window.location.href = "/admin/cbt";
          }
        }
      } catch (err: any) {
        setLoginError(err?.message || "Connection error during login. Please try again.");
      }
    });
  };

  // Sign Out
  const handleLogout = () => {
    startTransition(async () => {
      await adminLogoutAction();
      setAdmin(null);
      window.location.reload();
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-slate-950 text-white relative overflow-hidden flex flex-col justify-between">
      {/* Ambient Decorative Lighting */}
      <div className="absolute top-0 right-1/4 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-secondary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 sm:w-[400px] h-72 sm:h-[400px] bg-blue-700/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Nav Bar */}
      <header className="relative z-20 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition group py-2 px-3 rounded-xl hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4 text-secondary-400 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Main Website</span>
          </Link>

          {/* School Brand Badge */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white p-0.5 shadow-sm flex items-center justify-center shrink-0">
              <Image
                src="/assets/images/school-logo.webp"
                alt="Great-Favour Montessori School Logo"
                width={36}
                height={36}
                className="object-contain rounded-full"
              />
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-black tracking-tight text-white block leading-none">
                Great-Favour Montessori
              </span>
              <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">
                Staff &amp; Faculty Desk
              </span>
            </div>
          </Link>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-[11px] bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Session 2026/2027 Live</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="max-w-4xl w-full">
          {admin ? (
            /* ═══════════════════════════════════════════════════════
               AUTHENTICATED STAFF DIRECT REDIRECT VIEW (NO 4-BOXES)
               ═══════════════════════════════════════════════════════ */
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-5 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-secondary-400/20 border border-secondary-400/40 text-secondary-400 flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Welcome, {admin.fullName}
                </h2>
                <p className="text-xs text-secondary-400 font-bold uppercase tracking-wider mt-1">
                  {admin.role === "TEACHER" ? "Academic Teacher Console" : "Super Admin Command Center"}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Redirecting straight to your assigned dashboard...
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium pt-2">
                <div className="w-4 h-4 border-2 border-secondary-400 border-t-transparent rounded-full animate-spin" />
                <span>Launching session...</span>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    if (admin.role === "TEACHER") {
                      window.location.href = "/staff";
                    } else {
                      window.location.href = "/admin/cbt";
                    }
                  }}
                  className="px-4 py-2 bg-secondary-400 hover:bg-secondary-300 text-slate-950 text-xs font-bold rounded-xl transition shadow"
                >
                  Click here if not redirected
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isPending}
                  className="text-xs text-slate-400 hover:text-rose-400 transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════
               UNAUTHENTICATED STAFF LOGIN FORM
               ═══════════════════════════════════════════════════════ */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
              {/* Left Column: Brand & Security Overview (order-2 on mobile so form appears first) */}
              <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-between space-y-4 sm:space-y-6 bg-white/5 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/10 reveal-init reveal-fade-left delay-100">
                <div className="space-y-3 sm:space-y-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-secondary-400/20 border border-secondary-400/30 flex items-center justify-center text-secondary-400 shadow-md">
                    <ShieldCheck className="w-6 h-6 sm:w-9 sm:h-9" />
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary-400">
                      Great-Favour Montessori School
                    </span>
                    <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight mt-1">
                      Staff &amp; Faculty Login Portal
                    </h1>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Secure gateway for academic staff, subject teachers, and school administrators to access computerized assessment systems, terminal report records, and student analytics.
                  </p>
                </div>

                {/* Feature Highlights */}
                <div className="space-y-2.5 sm:space-y-3 pt-3 sm:pt-4 border-t border-white/10 text-xs">
                  <div className="flex items-start gap-2 sm:gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-secondary-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">
                      <strong>CBT Exam Command:</strong> Create exams, author objective tests, and grade theory papers.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-secondary-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">
                      <strong>Continuous Assessment:</strong> Standard 15 CA1 + 15 CA2 + 70 Terminal Exam scoring.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-secondary-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">
                      <strong>256-Bit Protection:</strong> Hardware-encrypted session authentication.
                    </span>
                  </div>
                </div>

                {/* Institutional Accreditation Pill */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-black/20 border border-white/10 text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-2">
                  <Award className="w-4 h-4 text-secondary-400 shrink-0" />
                  <span>Licensed Nursery, Primary &amp; Secondary Academy &bull; Est. Sept 2014</span>
                </div>
              </div>

              {/* Right Column: Interactive Login Card (order-1 on mobile so user sees login immediately) */}
              <div className="order-1 lg:order-2 lg:col-span-7 bg-slate-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-white/20 shadow-2xl space-y-4 sm:space-y-6 reveal-init reveal-fade-right delay-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    Sign In to Staff Console
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">
                    Enter your assigned institutional email address and secure password.
                  </p>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 sm:p-3.5 text-xs text-rose-200 flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <strong className="block font-bold">Authentication Failed</strong>
                      <span>{loginError}</span>
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Staff Institutional Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. greatfavourmontessorischool@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white/5 border border-white/15 rounded-xl text-sm sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          alert(
                            "For password recovery, please contact the Great-Favour ICT Support Desk at greatfavourmontessorischool@gmail.com or call +234 905 894 3474."
                          )
                        }
                        className="text-[10px] sm:text-[11px] text-secondary-400 hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-white/5 border border-white/15 rounded-xl text-sm sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>



                  {/* Remember Device Checkbox */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="rememberDevice"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/10 text-secondary-500 focus:ring-secondary-400 cursor-pointer"
                    />
                    <label
                      htmlFor="rememberDevice"
                      className="text-xs text-slate-300 cursor-pointer select-none"
                    >
                      Remember my staff terminal on this secure workstation
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-3.5 px-4 rounded-xl text-sm font-extrabold text-slate-950 bg-secondary-400 hover:bg-secondary-300 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isPending ? (
                        <>
                          <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Verifying Staff Credentials...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Staff Console</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Help Desk Link */}
                <div className="border-t border-white/10 pt-4 text-center">
                  <p className="text-[11px] text-slate-400">
                    Need new staff account activation? Contact the Head of School or Registrar Desk at{" "}
                    <a
                      href="mailto:greatfavourmontessorischool@gmail.com"
                      className="text-secondary-400 hover:underline font-bold"
                    >
                      greatfavourmontessorischool@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Footer Ribbon */}
      <footer className="relative z-20 border-t border-white/10 bg-black/30 backdrop-blur-md py-4 overflow-hidden w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400 text-center sm:text-left">
          <p className="break-words">
            &copy; {new Date().getFullYear()} Great-Favour Montessori School (GFMS) &bull; Staff Authentication Gateway
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 flex-wrap">
            <span>FLSC</span>
            <span>&bull;</span>
            <span>BECE</span>
            <span>&bull;</span>
            <span>WASSCE</span>
            <span>&bull;</span>
            <span>NECO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
