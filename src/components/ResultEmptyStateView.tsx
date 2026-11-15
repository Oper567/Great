"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FileClock,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Mail,
  Phone,
  HelpCircle,
  Calendar,
  UserCheck,
  School,
  Lock,
  CheckCircle2,
  ArrowRight,
  Layers,
} from "lucide-react";
import { SCHOOL_NAME, SCHOOL_BRAND } from "@/constants/school";

interface Props {
  admNo: string;
  studentName?: string;
  className?: string;
  session: string;
  term: string;
  isRegisteredStudent?: boolean;
  cardPreserved?: boolean;
  availableTerms?: string[];
}

export default function ResultEmptyStateView({
  admNo,
  studentName,
  className,
  session,
  term,
  isRegisteredStudent = false,
  cardPreserved = true,
  availableTerms = [],
}: Props) {
  const displayName = studentName || (isRegisteredStudent ? "Registered Scholar" : "Student Scholar");
  const displayClass = className || (isRegisteredStudent ? "Active Class Stream" : "Grade / Class Pending");

  // Filter other uploaded terms for this student that are not the currently requested term
  const normCurrent = term.toLowerCase().trim();
  const otherUploadedTerms = (availableTerms || []).filter((t) => {
    const norm = t.toLowerCase().trim();
    return !norm.includes(normCurrent) && !normCurrent.includes(norm);
  });

  return (
    <div className="min-h-screen bg-slate-100/90 py-6 sm:py-10 px-3 sm:px-6 flex items-center justify-center selection:bg-yellow-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-blue-800 text-white px-5 sm:px-8 py-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* School Crest */}
          <div className="w-16 h-16 mx-auto relative mb-3 bg-white p-1 rounded-full shadow-md">
            <Image
              src="/assets/images/school-logo.jpg"
              alt="Great-Favour Montessori School Logo"
              width={64}
              height={64}
              className="object-contain mx-auto rounded-full"
              priority
            />
          </div>

          <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-white">
            {SCHOOL_NAME}
          </h1>
          <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider mt-0.5">
            {SCHOOL_BRAND.motto} &bull; Est. September 2014
          </p>
          <p className="text-[11px] text-blue-200 mt-1">
            Official Terminal Result Verification &amp; Assessment Portal
          </p>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-8 space-y-5">
          
          {/* Status Badge & Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold tracking-wide uppercase shadow-sm">
              <FileClock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>{term} Result Not Yet Uploaded</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {term} Result Pending Release
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              The school administration has not yet uploaded or published the official <strong>{term}</strong> continuous assessment and examination dossier for <strong>{displayName}</strong> ({session}).
            </p>
          </div>

          {/* Other Terms Already Uploaded (If any) */}
          {otherUploadedTerms.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Uploaded Results Available For This Student:</span>
              </div>
              <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                Results for the following academic term(s) are officially published and ready for viewing:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {otherUploadedTerms.map((t) => (
                  <Link
                    key={t}
                    href={`/result?admNo=${encodeURIComponent(admNo)}&name=${encodeURIComponent(
                      displayName
                    )}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(t)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
                  >
                    <span>View {t} Result</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Student & Query Information Grid */}
          <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>Query Information</span>
              <span className="text-blue-700">Official Student Record</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Registration / Admission No:</span>
                <span className="font-mono font-bold text-slate-900 text-sm bg-white px-2.5 py-1 rounded border border-slate-200 inline-block">
                  {admNo}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Student Full Name:</span>
                <span className="font-bold text-slate-900 block truncate">
                  {displayName}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Checked Academic Term:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                  {term} ({session}) &bull; Not Uploaded
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block font-medium">Class / Stream:</span>
                <span className="font-bold text-slate-800 block">
                  {displayClass}
                </span>
              </div>
            </div>
          </div>

          {/* Scratch Card Protection Callout */}
          {cardPreserved && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-950">
              <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-blue-950">
                  Scratch Card PIN Usage 100% Preserved
                </strong>
                <span className="text-blue-800 leading-relaxed mt-0.5 block">
                  Because this student&apos;s <strong>{term}</strong> report card has not yet been uploaded by the school administrator, your scratch card check limit has <strong>NOT been deducted</strong>. Your allowed checks remain completely intact.
                </span>
              </div>
            </div>
          )}

          {/* Explanation / What To Do */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-700">
            <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold text-slate-900">
                How do I check another term?
              </strong>
              <p className="text-slate-600 leading-relaxed">
                If you intended to check a different term (such as the current <strong>Third Term</strong> promotional result or <strong>First Term</strong>), click below to return to the Result Checker Form with your credentials prefilled.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href={`/result?admNo=${encodeURIComponent(admNo)}&name=${encodeURIComponent(
                displayName
              )}&session=${encodeURIComponent(session)}&term=Third+Term&notUploaded=true&unreleasedTerm=${encodeURIComponent(term)}`}
              className="w-full sm:w-1/2 py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow transition text-center flex items-center justify-center gap-2 active:scale-95"
            >
              <Layers className="w-4 h-4 text-yellow-400" />
              <span>Select Another Term in Form</span>
            </Link>

            <Link
              href="/result"
              className="w-full sm:w-1/2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition text-center flex items-center justify-center gap-2 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Fresh Result Search</span>
            </Link>
          </div>

          {/* Contact Support Desk */}
          <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-slate-500">
              <Mail className="w-3.5 h-3.5 text-blue-700" />
              <span>greatfavourmontessorischool@gmail.com</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Phone className="w-3.5 h-3.5 text-blue-700" />
              <span>+234 905 894 3474</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
