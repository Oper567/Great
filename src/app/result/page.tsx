"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyScratchCardAction, VerifyCardResult } from "@/app/actions/verify-card";
import { getStudentAvailableTermsAction } from "@/app/actions/terminal-result-admin";
import { SCHOOL_BRAND, SCHOOL_NAME } from "@/constants/school";
import { ResultPortalSkeleton } from "@/components/ui/Skeleton";
import {
  KeyRound,
  UserCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Calendar,
  Layers,
  User,
  HelpCircle,
  CheckCircle2,
  FileClock,
  Sparkles,
  Info,
} from "lucide-react";

function ResultPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Query parameter prefill
  const paramAdmNo = searchParams.get("admNo") || "";
  const paramName = searchParams.get("name") || searchParams.get("fullName") || "";
  const paramSession = searchParams.get("session") || "2025/2026";
  const paramTerm = searchParams.get("term") || "Third Term";
  const isNotUploadedRedirect = searchParams.get("notUploaded") === "true";
  const unreleasedTerm = searchParams.get("unreleasedTerm") || "Second Term";

  const [fullName, setFullName] = useState(paramName);
  const [admNo, setAdmNo] = useState(paramAdmNo);
  const [session, setSession] = useState(paramSession);
  const [term, setTerm] = useState(paramTerm);
  const [pin, setPin] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available uploaded terms for this student
  const [studentUploadedTerms, setStudentUploadedTerms] = useState<string[]>([]);
  const [isCheckingUploadedTerms, setIsCheckingUploadedTerms] = useState(false);

  // Sync state if URL search parameters change
  useEffect(() => {
    if (paramName && !fullName) setFullName(paramName);
    if (paramAdmNo && !admNo) setAdmNo(paramAdmNo);
    if (paramSession) setSession(paramSession);
    if (paramTerm) setTerm(paramTerm);
  }, [paramName, paramAdmNo, paramSession, paramTerm]);

  // Live check uploaded terms whenever admission number is entered
  useEffect(() => {
    const clean = admNo.trim();
    if (clean.length < 4) {
      setStudentUploadedTerms([]);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsCheckingUploadedTerms(true);
      try {
        const res = await getStudentAvailableTermsAction(clean);
        if (isCurrent && res.success && res.terms) {
          const list = res.terms.map((t) => t.term);
          setStudentUploadedTerms(list);
          if (res.studentName) {
            setFullName((prev) => prev || res.studentName || "");
          }
        }
      } catch {
        // quiet fallback
      } finally {
        if (isCurrent) setIsCheckingUploadedTerms(false);
      }
    }, 400);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [admNo]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("admNo", admNo);
    formData.append("session", session);
    formData.append("term", term);
    formData.append("pin", pin);

    startTransition(async () => {
      const result: VerifyCardResult = await verifyScratchCardAction(null, formData);

      if (!result.success) {
        setErrorMessage(result.error || "Verification failed. Please check your credentials.");
      } else if (result.redirectUrl) {
        router.push(result.redirectUrl);
      }
    });
  };

  // Check if currently selected term is already known to be uploaded or pending
  const isSelectedTermUploaded =
    studentUploadedTerms.length > 0 &&
    studentUploadedTerms.some(
      (t) =>
        t.toLowerCase().includes(term.toLowerCase()) ||
        term.toLowerCase().includes(t.toLowerCase())
    );

  const isSelectedTermMissing =
    studentUploadedTerms.length > 0 && !isSelectedTermUploaded;

  return (
    <main className="min-h-screen bg-slate-100/90 flex flex-col items-center justify-center p-3 sm:p-6 selection:bg-yellow-200">
      {/* Centered Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transition-all my-2 sm:my-4">
        {/* Royal Blue Header */}
        <div className="bg-blue-800 text-white px-4 sm:px-6 py-3 sm:py-5 text-center relative overflow-hidden">
          {/* Subtle Golden Glow Accent */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Official School Crest Logo */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto relative mb-1.5 sm:mb-2">
            <Image
              src="/assets/images/school-logo.webp"
              alt="Great-Favour Montessori School Official Crest"
              width={56}
              height={56}
              className="object-contain drop-shadow-md mx-auto rounded-full bg-white p-1 w-full h-full"
              priority
            />
          </div>

          <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-white">
            Result Portal
          </h1>
          <p className="text-[11px] sm:text-xs text-yellow-400 font-bold uppercase tracking-wider mt-0.5">
            {SCHOOL_NAME}
          </p>
          <p className="text-[10px] sm:text-[11px] text-blue-200 font-medium">
            {SCHOOL_BRAND.motto} &bull; Terminal Assessment &amp; Report Card Dossier
          </p>
        </div>

        {/* Card Body & Form */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          {/* Friendly Notification Banner if redirected due to unreleased term */}
          {isNotUploadedRedirect && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-xl shadow-sm space-y-2 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <FileClock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    {unreleasedTerm} Result Not Yet Uploaded
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    The school administration has not uploaded results for <strong>{unreleasedTerm}</strong> yet. 
                    Your scratch card check was <strong>100% preserved</strong>. 
                  </p>
                  <p className="text-xs text-amber-900 font-semibold pt-1">
                    👉 Current promotional term is <strong>Third Term</strong>. You may select it below to view promotional results!
                  </p>
                </div>
              </div>
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTerm("Third Term")}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Switch to Third Term (Current)</span>
                </button>
              </div>
            </div>
          )}

          {/* Crimson Red Error Alert Area */}
          {errorMessage && (
            <div
              role="alert"
              className="bg-red-50 border-l-4 border-red-600 p-3 rounded-r-lg flex items-start gap-2.5 animate-in fade-in duration-200 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">
                  Access Denied
                </h4>
                <p className="text-xs text-red-700 font-semibold mt-0.5">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            {/* Field 1: Student Full Name */}
            <div className="space-y-1">
              <label
                htmlFor="fullName"
                className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Student Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Okeke, Somtochukwu Grace"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-lg border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all capitalize bg-white"
                />
              </div>
            </div>

            {/* Field 2: Admission Number */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admNo"
                  className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Admission Number
                </label>
                {isCheckingUploadedTerms && (
                  <span className="text-[10.5px] text-blue-700 flex items-center gap-1 font-medium animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking term records...
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <input
                  id="admNo"
                  name="admNo"
                  type="text"
                  required
                  autoComplete="off"
                  value={admNo}
                  onChange={(e) => setAdmNo(e.target.value.toUpperCase())}
                  placeholder="e.g. GFMS/2024/0501"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-lg border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all uppercase tracking-wide bg-white"
                />
              </div>
            </div>

            {/* Field 3 & 4: Session & Term (Side by Side on Mobile & Desktop) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="session"
                  className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 truncate"
                >
                  Academic Session
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <select
                    id="session"
                    name="session"
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 rounded-lg border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all bg-white"
                  >
                    <option value="2025/2026">2025/2026</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2023/2024">2023/2024</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="term"
                  className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 truncate"
                >
                  Academic Term
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <select
                    id="term"
                    name="term"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 rounded-lg border border-slate-300 text-slate-900 font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all bg-white"
                  >
                    <option value="Third Term">Third Term (Current)</option>
                    <option value="Second Term">Second Term</option>
                    <option value="First Term">First Term</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Term Selector Pills & Informational Badges */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700">Quick Select Term:</span>
                <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/70 px-2 py-0.5 rounded-full">
                  Current Term: Third Term
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTerm("Third Term")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    term === "Third Term"
                      ? "bg-blue-800 text-white shadow-sm ring-2 ring-blue-800/30"
                      : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span>Third Term (Active)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTerm("Second Term")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    term === "Second Term"
                      ? "bg-blue-800 text-white shadow-sm ring-2 ring-blue-800/30"
                      : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  <span>Second Term</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTerm("First Term")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    term === "First Term"
                      ? "bg-blue-800 text-white shadow-sm ring-2 ring-blue-800/30"
                      : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  <span>First Term</span>
                </button>
              </div>

              {/* Informative live feedback if known uploaded status is available */}
              {studentUploadedTerms.length > 0 && isSelectedTermMissing && (
                <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-2 text-[11px] text-amber-900 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span>
                      Notice: <strong>{term}</strong> is not uploaded for this student yet. 
                      Uploaded term(s): <strong>{studentUploadedTerms.join(", ")}</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={() => setTerm(studentUploadedTerms[0])}
                      className="block text-blue-800 font-bold underline hover:text-blue-950"
                    >
                      Click here to switch to {studentUploadedTerms[0]}
                    </button>
                  </div>
                </div>
              )}

              {studentUploadedTerms.length > 0 && isSelectedTermUploaded && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-[11px] text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Official result for <strong>{term}</strong> is uploaded and ready to view.
                  </span>
                </div>
              )}
            </div>

            {/* Field 5: Scratch Card PIN */}
            <div className="space-y-1">
              <label
                htmlFor="pin"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Scratch Card PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="pin"
                  name="pin"
                  type="text"
                  required
                  autoComplete="off"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder="e.g. GFMS-8492-1049"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 font-mono font-bold text-sm placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all uppercase tracking-widest bg-white"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Scratch the silver panel on your physical card to reveal PIN.
              </p>
            </div>

            {/* Golden Yellow Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 rounded-lg font-bold text-slate-950 bg-yellow-500 hover:bg-yellow-600 focus:ring-4 focus:ring-yellow-300 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Validating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate &amp; Check Result</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </form>

          {/* PIN Lock Security Banner */}
          <div className="p-2.5 bg-blue-50/80 rounded-lg border border-blue-100 flex items-start gap-2 text-[10.5px] text-slate-700">
            <ShieldCheck className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />
            <p className="leading-tight">
              <strong>PIN Protection Guarantee:</strong> If a selected term result (such as Second Term) has not yet been uploaded by the school, your PIN check count will <strong>not be deducted</strong>.
            </p>
          </div>

          {/* Card Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
            <a href="/" className="hover:text-blue-800 transition">
              &larr; Return to School Home
            </a>
            <span className="flex items-center gap-1 text-slate-400">
              <HelpCircle className="w-3 h-3" />
              <span>Contact Admin Office</span>
            </span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-2">
        &copy; {new Date().getFullYear()} {SCHOOL_NAME} &bull; All Rights Reserved.
      </p>
    </main>
  );
}

export default function ResultPortalLoginPage() {
  return (
    <Suspense fallback={<ResultPortalSkeleton />}>
      <ResultPortalContent />
    </Suspense>
  );
}

