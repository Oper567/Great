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
  HeartHandshake,
  Mail,
  Award,
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
      <section className="relative bg-primary-950 text-white py-14 sm:py-20 overflow-hidden border-b border-primary-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/school-building-front.jpg"
            alt="Great-Favour Montessori School Campus"
            fill
            className="object-cover object-center opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-950/95 to-primary-950/80" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <nav className="flex items-center gap-2 text-xs text-slate-300 mb-4">
            <Link href="/" className="hover:text-secondary-400 transition">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-secondary-400 font-semibold">About Us &amp; Governance</span>
          </nav>
          <div className="max-w-3xl space-y-4 reveal-init reveal-fade-up delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2px] bg-secondary-400" />
              <span className="text-xs font-extrabold text-secondary-400 uppercase tracking-widest">
                Leadership &amp; Institutional Charter
              </span>
            </div>
            <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              About Great-Favour Montessori School
            </h1>
            <p className="text-slate-200 text-sm sm:text-lg leading-relaxed max-w-2xl">
              Founded in September 2014 with a dedicated mission to raise a generation of honest, confident leaders grounded in moral character and academic distinction.
            </p>
          </div>
        </div>
      </section>

      {/* DIRECTOR'S WELCOME */}
      <section className="py-10 sm:py-16 lg:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 reveal-init reveal-fade-up delay-100">
            <div>
              <span className="text-xs font-extrabold text-primary-800 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded-full">
                Leadership & Governance
              </span>
              <h2 className="text-xl sm:text-4xl font-extrabold text-primary-950 mt-2">
                Welcome from the Director&apos;s Desk
              </h2>
              <p className="text-slate-600 max-w-2xl mt-1 text-sm sm:text-base">
                Great-Favour Montessori School was founded with a loving mission: to raise a generation of honest, confident leaders grounded in moral character and academic brilliance.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/prospectus"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary-800 bg-white border border-primary-200 hover:border-primary-400 px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 hover:bg-primary-50"
              >
                <Download className="w-4 h-4 text-secondary-600" />
                <span>View & Download Prospectus</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            {/* Director Card */}
            <div className="lg:col-span-7 bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between reveal-init reveal-fade-left delay-200 hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center relative z-10">
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="relative w-full max-w-[220px] sm:max-w-[240px] h-[230px] sm:h-[320px] md:h-[360px] rounded-2xl overflow-hidden bg-white shadow-2xl border-2 border-secondary-400/50 group">
                    <Image
                      src={KEY_PERSONNEL.director.image}
                      alt={`${KEY_PERSONNEL.director.fullName} - ${KEY_PERSONNEL.director.title}`}
                      fill
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                      priority
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-950 via-primary-950/75 to-transparent p-2 sm:p-3 pt-6 text-center">
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-secondary-400 block uppercase tracking-wider">
                        Director &amp; Proprietor
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-200 font-medium">
                        Leadership Academy
                      </span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-3 sm:space-y-4 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-secondary-500 text-slate-950 tracking-wider">
                      DIRECTOR&apos;S WELCOME ADDRESS
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                      greatfavourmontessorischool@gmail.com
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight">
                      {KEY_PERSONNEL.director.fullName}
                    </h3>
                    <p className="text-secondary-400 font-semibold text-xs sm:text-sm mt-0.5">
                      {KEY_PERSONNEL.director.title} &bull; Educationist &amp; Philanthropist
                    </p>
                  </div>

                  <blockquote className="text-slate-200 text-xs sm:text-sm leading-relaxed italic border-l-3 sm:border-l-4 border-secondary-500 pl-3 bg-white/5 py-1.5 rounded-r-lg">
                    &quot;When my wife and I started Great-Favour in September 2014, our prayer was simple: to build a school where every child feels loved, safe, and excited to learn. We don&apos;t believe in just passing exams; we help our boys and girls build real confidence, sound morals, and the courage to become honest leaders anywhere in the world.&quot;
                  </blockquote>

                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    Under Hon. Okolie&apos;s personal guidance and dedication, Great-Favour has grown from a humble beginning into a joyful, thriving school family in Issele-Azagba, graduating hundreds of bright, respectful scholars every year.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 relative z-10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-secondary-400 shrink-0" />
                  <span>Caring for over 700 students across Primary &amp; Secondary</span>
                </div>
                <div className="font-semibold text-secondary-300">
                  12+ Years of Impact
                </div>
              </div>
            </div>

            {/* Deputy Director & Creed */}
            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6 reveal-init reveal-fade-right delay-350">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-card flex-1 flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                <div className="space-y-4">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-primary-100 text-primary-900 border border-primary-200">
                      DEPUTY DIRECTOR &amp; MONTESSORI ADMINISTRATOR
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-1">
                    <div className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-2xl overflow-hidden shadow-lg border-2 border-secondary-400 shrink-0 bg-slate-100 group">
                      <Image
                        src={KEY_PERSONNEL.deputyDirector.image}
                        alt={`${KEY_PERSONNEL.deputyDirector.fullName} - ${KEY_PERSONNEL.deputyDirector.title}`}
                        fill
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-950/85 to-transparent p-1.5 text-center">
                        <span className="text-[10px] font-extrabold text-secondary-400 block uppercase tracking-wider">
                          Montessori Admin
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-center sm:text-left flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-primary-950 leading-snug">
                        {KEY_PERSONNEL.deputyDirector.fullName}
                      </h3>
                      <p className="text-primary-800 font-semibold text-xs">
                        {KEY_PERSONNEL.deputyDirector.title}
                      </p>
                      <span className="inline-block text-[11px] bg-secondary-100 text-secondary-900 px-2.5 py-0.5 rounded-full font-semibold">
                        {KEY_PERSONNEL.deputyDirector.portfolio}
                      </span>
                      <p className="text-slate-600 text-xs leading-relaxed pt-1.5">
                        &quot;We make sure our school feels like a true second home for your child. From clean, safe learning spaces to transparent fee records and caring teachers, we are here to support your family every single day.&quot;
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Montessori Leadership &amp; Governance</span>
                  <span className="font-semibold text-primary-800">Administration &amp; Care</span>
                </div>
              </div>

              {/* Institutional Charter */}
              <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-5 space-y-3">
                <div>
                  <span className="text-[10px] font-extrabold text-secondary-800 uppercase tracking-wider block">
                    Core Goal &amp; Objective
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5 italic">
                    &quot;{INSTITUTIONAL_ACCREDITATION.coreGoalAndObjective}&quot;
                  </p>
                </div>
                <div className="border-t border-secondary-200/60 pt-2">
                  <span className="text-[10px] font-extrabold text-secondary-800 uppercase tracking-wider block">
                    Licences &amp; External Examination Approvals
                  </span>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Licensed Nursery, Primary &amp; Secondary &bull; Approved to write FLSC, BECE, WASSCE &amp; NECO examinations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISION, MISSION & CORE VALUES */}
      <section className="py-10 sm:py-16 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3 reveal-init reveal-fade-up delay-100">
            <span className="text-xs font-extrabold text-primary-800 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded-full">
              Our Foundation
            </span>
            <h2 className="text-xl sm:text-4xl font-extrabold text-primary-950">
              Vision, Mission & Core Values
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 reveal-init reveal-fade-up delay-200">
            {/* Vision */}
            <div className="bg-gradient-to-br from-primary-950 to-primary-900 text-white rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-secondary-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-secondary-400 text-slate-950 flex items-center justify-center shadow-md">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold">Our Vision</h3>
                <p className="text-slate-200 text-sm leading-relaxed">{SCHOOL_BRAND.vision}</p>
              </div>
            </div>

            {/* Mission */}
            <div className="bg-gradient-to-br from-secondary-50 to-white rounded-3xl p-5 sm:p-8 border-2 border-secondary-400/50 shadow-sm relative overflow-hidden">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary-800 text-secondary-400 flex items-center justify-center shadow-md">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold text-primary-950">Our Mission</h3>
                <p className="text-slate-700 text-sm leading-relaxed">{SCHOOL_BRAND.mission}</p>
              </div>
            </div>
          </div>

          {/* Core Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SCHOOL_BRAND.coreValues.map((value, idx) => {
              const icons: Record<string, React.ReactNode> = {
                ShieldCheck: <ShieldCheck className="w-6 h-6" />,
                Lightbulb: <Lightbulb className="w-6 h-6" />,
                Globe: <Globe className="w-6 h-6" />,
                TrendingUp: <TrendingUp className="w-6 h-6" />,
              };
              return (
                <div
                  key={value.title}
                  className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-200 hover:border-primary-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 space-y-3 reveal-init reveal-fade-up"
                  style={{ animationDelay: `${(idx + 1) * 150}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-800 text-secondary-400 flex items-center justify-center shadow-md">
                    {icons[value.icon] || <Lightbulb className="w-5 h-5" />}
                  </div>
                  <h4 className="font-bold text-base text-primary-950">{value.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
