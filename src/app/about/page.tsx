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
      <section className="relative bg-primary-950 text-white py-8 sm:py-14 overflow-hidden border-b border-primary-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/school-compound/main-academic-block.webp"
            alt=""
            aria-hidden="true"
            fill
            className="object-cover object-center opacity-20"
            priority
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-950/95 to-primary-950/80" />
        </div>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative z-10">
          <nav className="flex items-center gap-2 text-xs text-slate-300 mb-2.5">
            <Link href="/" className="hover:text-secondary-400 transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-secondary-400 font-semibold">About Us &amp; Governance</span>
          </nav>
          <div className="max-w-3xl space-y-2.5 reveal-init reveal-fade-up delay-100">
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
      <section className="py-7 sm:py-12 lg:py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-5 sm:space-y-7">
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
                className="inline-flex items-center gap-2 text-xs font-bold text-primary-800 bg-white border border-primary-200 hover:border-primary-400 px-3.5 py-2 rounded-xl shadow-xs transition hover:bg-primary-50"
              >
                <Download className="w-3.5 h-3.5 text-secondary-600" />
                <span>View &amp; Download Prospectus</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
            {/* Director Card — Compact on Mobile, Tall Uncropped Portrait on Tablet & Desktop */}
            <div className="lg:col-span-7 bg-primary-950 text-white rounded-2xl p-3.5 sm:p-6 shadow-xl border border-primary-900 flex flex-col justify-between reveal-init reveal-fade-left delay-200">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6 items-center flex-1">
                <div className="md:col-span-6 w-full">
                  <div className="relative w-full max-w-[215px] sm:max-w-[260px] md:max-w-none mx-auto aspect-[3/4] lg:min-h-[390px] rounded-2xl overflow-hidden bg-slate-900 border-2 border-secondary-400/80 shadow-xl">
                    <Image
                      src={KEY_PERSONNEL.director.image}
                      alt={`${KEY_PERSONNEL.director.fullName} - ${KEY_PERSONNEL.director.title}`}
                      fill
                      sizes="(max-width: 640px) 215px, (max-width: 768px) 260px, (max-width: 1280px) 34vw, 340px"
                      className="object-cover object-center"
                      priority
                    />
                  </div>
                </div>

                <div className="md:col-span-6 space-y-2 sm:space-y-3 text-left">
                  <span className="px-2.5 py-0.5 sm:py-1 rounded text-[10px] font-extrabold bg-secondary-400 text-slate-950 tracking-wider inline-block">
                    DIRECTOR&apos;S WELCOME ADDRESS
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-extrabold text-white leading-tight">
                      {KEY_PERSONNEL.director.fullName}
                    </h3>
                    <p className="text-secondary-400 font-semibold text-[11px] sm:text-xs mt-0.5 sm:mt-1">
                      {KEY_PERSONNEL.director.title} &bull; Educationist &amp; Philanthropist
                    </p>
                  </div>

                  <blockquote className="text-slate-200 text-[11px] sm:text-[13px] leading-snug sm:leading-relaxed italic border-l-2 border-secondary-400 pl-2.5 sm:pl-3 bg-white/5 py-1.5 sm:py-2 pr-2.5 sm:pr-3 rounded-r-lg">
                    &quot;Since September 2014, our prayer has been simple: to build a safe school where every child learns with joy, sound morals, and the courage to become an honest leader.&quot;
                  </blockquote>

                  <p className="hidden sm:block text-slate-300 text-xs leading-relaxed">
                    Under Hon. Okolie&apos;s guidance, Great-Favour has grown into a thriving school family in Issele-Azagba, graduating bright, respectful scholars every year.
                  </p>
                </div>
              </div>

              <div className="pt-2.5 mt-3 sm:pt-3 sm:mt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                  <span>700+ scholars across Nursery, Primary &amp; Secondary</span>
                </div>
                <span className="font-semibold text-secondary-400">12+ Years of Impact</span>
              </div>
            </div>

            {/* Deputy Director & Institutional Charter — Balanced Layout */}
            <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-4 reveal-init reveal-fade-right delay-300">
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-primary-100 text-primary-900 border border-primary-200">
                    DEPUTY DIRECTOR &amp; MONTESSORI ADMIN
                  </span>

                  <div className="flex items-center gap-3">
                    <div className="relative w-20 sm:w-28 aspect-[4/5] rounded-xl overflow-hidden border-2 border-secondary-400 shrink-0 bg-slate-100 shadow-sm">
                      <Image
                        src={KEY_PERSONNEL.deputyDirector.image}
                        alt={`${KEY_PERSONNEL.deputyDirector.fullName} - ${KEY_PERSONNEL.deputyDirector.title}`}
                        fill
                        loading="lazy"
                        decoding="async"
                        sizes="120px"
                        className="object-cover object-top"
                      />
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-primary-950 leading-snug">
                        {KEY_PERSONNEL.deputyDirector.fullName}
                      </h3>
                      <p className="text-primary-800 font-semibold text-[11px] sm:text-xs">
                        {KEY_PERSONNEL.deputyDirector.title}
                      </p>
                      <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed pt-0.5">
                        &quot;We make sure our school feels like a true second home for your child—from clean, safe learning spaces to caring teachers.&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Institutional Charter with Official Exam Logos */}
              <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-3.5 sm:p-4 space-y-2">
                <div>
                  <span className="text-[10px] font-extrabold text-secondary-800 uppercase tracking-wider block">
                    Core Goal &amp; Objective
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5 italic leading-snug">
                    &quot;{INSTITUTIONAL_ACCREDITATION.coreGoalAndObjective}&quot;
                  </p>
                </div>
                <div className="border-t border-secondary-200/60 pt-2 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-secondary-800 uppercase tracking-wider block">
                    Approved External Examinations
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {INSTITUTIONAL_ACCREDITATION.approvedExaminations.map((exam) => (
                      <div
                        key={exam.code}
                        className="bg-white rounded-lg border border-secondary-200 p-1.5 flex flex-col items-center justify-center gap-1 shadow-2xs"
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 relative flex items-center justify-center">
                          <Image
                            src={exam.logo}
                            alt={exam.code}
                            width={28}
                            height={28}
                            loading="lazy"
                            decoding="async"
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
      <section className="py-7 sm:py-12 lg:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-5 sm:space-y-7">
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
