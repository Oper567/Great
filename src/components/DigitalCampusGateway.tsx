"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  KeyRound,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Users,
} from "lucide-react";

export default function DigitalCampusGateway() {
  const [activeTab, setActiveTab] = useState<"all" | "staff" | "parent">("all");

  const portals = [
    {
      id: "result-checker",
      category: "parent",
      title: "Termly Report Card Portal",
      subtitle: "Scratch Card PIN Verification",
      badge: "Parent & Student Access",
      description:
        "Official portal for parents and guardians to verify and print single-page A4 terminal report sheets featuring cognitive scores, affective traits, and principal remarks.",
      href: "/result",
      ctaText: "Check Student Result",
      icon: <KeyRound className="w-5 h-5 text-secondary-400" />,
      features: [
        "Official Single-Page A4 Report Sheet",
        "1st CA (15) + 2nd CA (15) + Exam (70)",
        "Cognitive, Affective & Psychomotor Ratings",
      ],
    },
    {
      id: "staff-portal",
      category: "staff",
      title: "Staff & Faculty Intranet",
      subtitle: "Teacher Console & Academic Desk",
      badge: "Authorized Staff Only",
      description:
        "Dedicated workspace for subject teachers, class masters, and administrators to upload CA scores, author CBT exam questions, grade theory scripts, and compile results.",
      href: "/staff/login",
      ctaText: "Staff Portal Sign In",
      icon: <Users className="w-5 h-5 text-secondary-400" />,
      features: [
        "Continuous Assessment (15 + 15 + 70)",
        "CBT Question Bank & Theory Grading Desk",
        "Class Master Broadsheet & Attendance",
      ],
    },
    {
      id: "admissions-desk",
      category: "parent",
      title: "Admissions & Enrollment",
      subtitle: "2026/2027 Academic Session",
      badge: "Admissions Open",
      description:
        "Begin your child's academic journey at Great-Favour Montessori School across our Creche, Montessori Nursery, Basic Primary, or Junior & Senior Secondary arms.",
      href: "/admissions",
      ctaText: "Apply for Admission",
      icon: <GraduationCap className="w-5 h-5 text-secondary-400" />,
      features: [
        "Creche, Nursery, Primary & Secondary",
        "Physical Campus Tour Scheduling",
        "Diagnostic Placement & Prospectus",
      ],
    },
  ];

  const filteredPortals =
    activeTab === "all"
      ? portals
      : portals.filter((p) => p.category === activeTab);

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-primary-950 text-white border-b border-primary-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        {/* Top Editorial Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 reveal-init reveal-fade-up">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-0.5 bg-secondary-400" />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-secondary-400">
                Institutional Portals &amp; Digital Services
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Academic Portals &amp; Online Services
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Access Great-Favour Montessori School&apos;s online result verification portal, faculty grading desk, and admissions registry from any device.
            </p>
          </div>

          {/* Role Filter Tabs */}
          <div className="inline-flex items-center gap-1 bg-primary-900/90 p-1 rounded-lg border border-primary-800 self-start lg:self-end overflow-x-auto max-w-full">
            {(
              [
                { key: "all", label: "All Portals" },
                { key: "parent", label: "Parents & Students" },
                { key: "staff", label: "Faculty & Staff" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-2 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-secondary-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Portals Grid — Spacious Single-Column on Mobile, 3-Column on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredPortals.map((portal, index) => (
            <div
              key={portal.id}
              className="bg-primary-900/50 rounded-xl p-5 sm:p-6 border border-primary-800 hover:border-secondary-400/60 transition-all duration-300 flex flex-col justify-between group reveal-init reveal-fade-up"
              style={{ transitionDelay: `${(index + 1) * 80}ms` }}
            >
              <div className="space-y-4">
                {/* Top Row: Icon & Institutional Tag */}
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-lg bg-primary-950 border border-primary-800 flex items-center justify-center shrink-0">
                    {portal.icon}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-primary-950/90 text-slate-300 border border-primary-800">
                    {portal.badge}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                    {portal.title}
                  </h3>
                  <p className="text-xs font-semibold text-secondary-400">
                    {portal.subtitle}
                  </p>
                </div>

                {/* Description — Full Readability on Mobile */}
                <p className="text-sm text-slate-300 leading-relaxed">
                  {portal.description}
                </p>

                {/* Features List */}
                <ul className="space-y-2 pt-3 border-t border-primary-800/80 text-xs text-slate-200">
                  {portal.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-secondary-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action CTA */}
              <div className="pt-5 mt-5 border-t border-primary-800/80">
                <Link
                  href={portal.href}
                  className="w-full inline-flex items-center justify-between py-3 px-4 rounded-lg text-xs font-bold text-slate-950 bg-secondary-400 hover:bg-secondary-300 transition-colors"
                >
                  <span>{portal.ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Institutional Accreditation & Academic Session Strip */}
        <div className="bg-primary-900/40 border border-primary-800 rounded-xl p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-xs reveal-init reveal-fade-up">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <div>
              <strong className="block text-white font-bold text-sm">Academic Session</strong>
              <span className="text-slate-300">2026/2027 Session Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-400 shrink-0" />
            <div>
              <strong className="block text-white font-bold text-sm">Approved Examinations</strong>
              <span className="text-slate-300">FLSC, BECE, WASSCE &amp; NECO</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-400 shrink-0" />
            <div>
              <strong className="block text-white font-bold text-sm">Grading Standard</strong>
              <span className="text-slate-300">15 CA1 &bull; 15 CA2 &bull; 70 Exam</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <div>
              <strong className="block text-white font-bold text-sm">CBT Examination Center</strong>
              <span className="text-slate-300">LAN &amp; Cloud Synchronized</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
