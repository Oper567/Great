"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  KEY_PERSONNEL,
  INSTITUTIONAL_ACCREDITATION,
  SCHOOL_BRAND,
} from "@/constants/school";
import {
  CheckCircle2,
  Download,
  Globe,
  TrendingUp,
  ShieldCheck,
  Lightbulb,
  ChevronRight,
} from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* EDITORIAL PAGE HERO BANNER */}
      <section className="relative bg-primary-950 text-white py-10 sm:py-16 overflow-hidden border-b border-primary-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/school-building-front.jpg"
            alt=""
            aria-hidden="true"
            fill
            className="object-cover object-center opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-950/95 to-primary-950/80" />
        </div>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative z-10">
          <nav className="flex items-center gap-2 text-xs text-slate-300 mb-3">
            <Link href="/" className="hover:text-secondary-400 transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-secondary-400 font-semibold">About Us &amp; Governance</span>
          </nav>
          <div className="max-w-3xl space-y-3 reveal-init reveal-fade-up delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2px] bg-secondary-400" />
              <span className="text-[11px] sm:text-xs font-extrabold text-secondary-400 uppercase tracking-widest">
                Leadership &amp; Institutional Charter
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              About Great-Favour Montessori School
            </h1>
            <p className="text-slate-200 text-xs sm:text-base leading-relaxed max-w-2xl">
              Founded in September 2014 with a dedicated mission to raise a generation of honest, confident leaders grounded in moral character and academic distinction.
            </p>
          </div>
        </div>
      </section>

      {/* DIRECTOR'S WELCOME */}
      <section className="py-10 sm:py-14 lg:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 reveal-init reveal-fade-up delay-100">
            <div>
              <span className="text-[11px] font-extrabold text-primary-800 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded-full">
                Leadership &amp; Governance
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold text-primary-950 mt-2">
                Welcome from the Director&apos;s Desk
              </h2>
              <p className="text-slate-600 max-w-2xl mt-1 text-xs sm:text-sm">
                Raising a generation of honest, confident leaders grounded in moral character and academic brilliance.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/prospectus"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary-800 bg-white border border-primary-200 hover:border-primary-400 px-4 py-2 rounded-xl shadow-xs transition hover:bg-primary-50"
              >
                <Download className="w-3.5 h-3.5 text-secondary-600" />
                <span>View &amp; Download Prospectus</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Director Card — Full Box Width Portrait Maintaining Height */}
            <div className="lg:col-span-7 bg-primary-950 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-primary-900 flex flex-col justify-between reveal-init reveal-fade-left delay-200">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-center">
                <div className="md:col-span-5 w-full">
                  <div className="relative w-full h-[230px] sm:h-[250px] rounded-2xl overflow-hidden bg-slate-900 border-2 border-secondary-400/80 shadow-xl">
                    <Image
                      src={KEY_PERSONNEL.director.image}
                      alt={`${KEY_PERSONNEL.director.fullName} - ${KEY_PERSONNEL.director.title}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover object-top"
                      style={{ objectPosition: "center 12%" }}
                      priority
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-950 via-primary-950/85 to-transparent p-2.5 text-center">
                      <span className="text-[11px] font-extrabold text-secondary-400 block uppercase tracking-wider">
                        Director &amp; Proprietor
                      </span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-3 text-left">
                  <span className="px-2.5 py-1 rounded text-[10px] font-extrabold bg-secondary-400 text-slate-950 tracking-wider inline-block">
                    DIRECTOR&apos;S WELCOME ADDRESS
                  </span>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                      {KEY_PERSONNEL.director.fullName}
                    </h3>
                    <p className="text-secondary-400 font-semibold text-xs sm:text-sm mt-0.5">
                      {KEY_PERSONNEL.director.title} &bull; Educationist &amp; Philanthropist
                    </p>
                  </div>

                  <blockquote className="text-slate-200 text-xs sm:text-sm leading-relaxed italic border-l-2 border-secondary-400 pl-3.5 bg-white/5 py-2 pr-3 rounded-r-lg">
                    &quot;When my wife and I started Great-Favour in September 2014, our prayer was simple: to build a school where every child feels loved, safe, and excited to learn. We help our boys and girls build real confidence, sound morals, and the courage to become honest leaders.&quot;
                  </blockquote>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    Under Hon. Okolie&apos;s guidance, Great-Favour has grown into a thriving school family in Issele-Azagba, graduating bright, respectful scholars every year.
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-secondary-400 shrink-0" />
                  <span>Over 700 scholars across Nursery, Primary &amp; Secondary</span>
                </div>
                <span className="font-semibold text-secondary-400">12+ Years of Impact</span>
              </div>
            </div>

            {/* Deputy Director & Institutional Charter — Balanced Layout */}
            <div className="lg:col-span-5 flex flex-col gap-4 reveal-init reveal-fade-right delay-300">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-primary-100 text-primary-900 border border-primary-200">
                    DEPUTY DIRECTOR &amp; MONTESSORI ADMIN
                  </span>

                  <div className="flex items-center gap-4">
                    <div className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden border-2 border-secondary-400 shrink-0 bg-slate-100 shadow-sm">
                      <Image
                        src={KEY_PERSONNEL.deputyDirector.image}
                        alt={`${KEY_PERSONNEL.deputyDirector.fullName} - ${KEY_PERSONNEL.deputyDirector.title}`}
                        fill
                        sizes="140px"
                        className="object-cover object-top"
                      />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-primary-950 leading-snug">
                        {KEY_PERSONNEL.deputyDirector.fullName}
                      </h3>
                      <p className="text-primary-800 font-semibold text-xs">
                        {KEY_PERSONNEL.deputyDirector.title}
                      </p>
                      <p className="text-slate-600 text-xs leading-relaxed pt-1">
                        &quot;We make sure our school feels like a true second home for your child—from clean, safe learning spaces to caring teachers.&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Institutional Charter with Official Exam Logos */}
              <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-4 space-y-2.5">
                <div>
                  <span className="text-[10px] font-extrabold text-secondary-800 uppercase tracking-wider block">
                    Core Goal &amp; Objective
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5 italic leading-snug">
                    &quot;{INSTITUTIONAL_ACCREDITATION.coreGoalAndObjective}&quot;
                  </p>
                </div>
                <div className="border-t border-secondary-200/60 pt-2 space-y-2">
                  <span className="text-[10px] font-extrabold text-secondary-800 uppercase tracking-wider block">
                    Approved External Examinations
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {INSTITUTIONAL_ACCREDITATION.approvedExaminations.map((exam) => (
                      <div
                        key={exam.code}
                        className="bg-white rounded-lg border border-secondary-200 p-1.5 flex flex-col items-center justify-center gap-1 shadow-2xs"
                      >
                        <div className="w-7 h-7 relative flex items-center justify-center">
                          <Image
                            src={exam.logo}
                            alt={exam.code}
                            width={28}
                            height={28}
                            className="object-contain w-full h-full"
                          />
                        </div>
                        <span className="text-[9px] font-extrabold text-primary-950 uppercase tracking-wider">
                          {exam.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISION, MISSION & CORE VALUES — Compact Cards */}
      <section className="py-10 sm:py-14 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 reveal-init reveal-fade-up delay-100">
            <span className="text-[11px] font-extrabold text-primary-800 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded-full">
              Our Foundation
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-primary-950">
              Vision, Mission &amp; Core Values
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 reveal-init reveal-fade-up delay-200">
            {/* Vision */}
            <div className="bg-primary-950 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-primary-900 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary-400 text-slate-950 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold">Our Vision</h3>
              </div>
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">{SCHOOL_BRAND.vision}</p>
            </div>

            {/* Mission */}
            <div className="bg-secondary-50/70 rounded-2xl p-4 sm:p-6 border border-secondary-300 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-900 text-secondary-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-primary-950">Our Mission</h3>
              </div>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">{SCHOOL_BRAND.mission}</p>
            </div>
          </div>

          {/* Core Values — 2x2 Grid on Mobile, 4-Column on Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {SCHOOL_BRAND.coreValues.map((value, idx) => {
              const icons: Record<string, React.ReactNode> = {
                ShieldCheck: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />,
                Lightbulb: <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />,
                Globe: <Globe className="w-4 h-4 sm:w-5 sm:h-5" />,
                TrendingUp: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />,
              };
              return (
                <div
                  key={value.title}
                  className="bg-slate-50 rounded-xl p-3.5 sm:p-5 border border-slate-200 hover:border-primary-300 transition space-y-2 reveal-init reveal-fade-up"
                  style={{ animationDelay: `${(idx + 1) * 100}ms` }}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary-900 text-secondary-400 flex items-center justify-center shadow-xs">
                    {icons[value.icon] || <Lightbulb className="w-4 h-4" />}
                  </div>
                  <h4 className="font-bold text-xs sm:text-base text-primary-950 leading-snug">
                    {value.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
