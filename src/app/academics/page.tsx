"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PRIMARY_CLASSES,
} from "@/constants/school";
import {
  Award,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronRight,
} from "lucide-react";

export default function AcademicsPage() {
  const [activeDivisionTab, setActiveDivisionTab] = useState<"creche" | "nursery" | "primary" | "jss" | "sss">("jss");

  return (
    <>
      {/* EDITORIAL PAGE HERO BANNER */}
      <section className="relative bg-primary-950 text-white py-10 sm:py-16 overflow-hidden border-b border-primary-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/classroom.jpg"
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
            <span className="text-secondary-400 font-semibold">Academic Divisions &amp; Calendar</span>
          </nav>
          <div className="max-w-3xl space-y-3 reveal-init reveal-fade-up delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2px] bg-secondary-400" />
              <span className="text-[11px] sm:text-xs font-extrabold text-secondary-400 uppercase tracking-widest">
                Structured Learning Pathways
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Academic Divisions &amp; Calendar
            </h1>
            <p className="text-slate-200 text-xs sm:text-base leading-relaxed max-w-2xl">
              Providing unbroken continuity from early childhood Montessori discovery through to Senior Secondary graduation and university preparation.
            </p>
          </div>
        </div>
      </section>

      {/* ACADEMIC DIVISIONS EXPLORER */}
      <section className="py-10 sm:py-14 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-6 sm:space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 reveal-init reveal-fade-up delay-100">
            <span className="text-[11px] font-extrabold text-secondary-700 uppercase tracking-widest bg-secondary-100 px-3 py-1 rounded-full">
              Structured Learning Pathways
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-primary-950">
              Explore Our Academic Divisions
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Select a division below to inspect class arms, age ranges, and core curriculum focus.
            </p>
          </div>

          {/* Division Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-100 rounded-xl max-w-4xl mx-auto border border-slate-200 overflow-x-auto no-scrollbar reveal-init reveal-fade-down delay-200">
            {[
              { value: "creche" as const, label: "Creche (3m - 2y)" },
              { value: "nursery" as const, label: "Montessori Nursery (2 - 5y)" },
              { value: "primary" as const, label: "Basic Primary (Basic 1 - 5)" },
              { value: "jss" as const, label: "Junior Secondary (JSS 1 - 3)" },
              { value: "sss" as const, label: "Senior Secondary (SS 1 - 3)" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveDivisionTab(tab.value)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeDivisionTab === tab.value
                    ? "bg-primary-900 text-white shadow-xs"
                    : "text-slate-700 hover:text-primary-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content — Compact */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-200 reveal-init reveal-fade-up delay-300">
            {activeDivisionTab === "creche" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-secondary-800 bg-secondary-100 px-3 py-1 rounded-full">
                    <span>Ages: 3 Months – 2 Years</span><span>&bull;</span><span>Early Childhood Haven</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-primary-950">Creche & Infant Learning Center</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Our Creche offers a warm, sanitized, and sensorially stimulating environment where our infants receive compassionate attention from certified caregivers and pediatric-trained staff.
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium pt-2">
                    {["Individualized feeding & nap schedules", "Motor skills & sensory development", "Loving caregiver oversight", "Safe, hygienic, supervised sleeping cots"].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-green-700 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/admissions" className="btn-primary text-xs inline-flex mt-2">Enroll in Creche</Link>
                </div>
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-primary-950 uppercase tracking-wider">Division Highlights</h4>
                  <div className="space-y-2 text-xs text-slate-600">
                    {[{ l: "Caregiver Ratio:", v: "1 : 3 Infants" }, { l: "Operational Hours:", v: "7:00 AM – 5:30 PM" }, { l: "Nutritional Guidance:", v: "Personalized Menu" }].map((r) => (
                      <div key={r.l} className="flex justify-between py-1.5 border-b border-slate-100">
                        <span>{r.l}</span><strong className="text-primary-950">{r.v}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDivisionTab === "nursery" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-800 bg-primary-100 px-3 py-1 rounded-full">
                    <span>Ages: 2 – 5 Years</span><span>&bull;</span><span>Nursery 1, 2 & 3</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-primary-950">Authentic Montessori Early Childhood</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Designed around the Maria Montessori philosophy. Children interact freely with specialized didactic learning apparatus spanning practical life, sensorial discrimination, mathematics, phonics, and cultural studies.
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium pt-2">
                    {["Jolly Phonics & early reading fluency", "Sensorial geometric solids & color grading", "Practical life skills (grace, courtesy & care)", "Numeracy with golden bead mathematics"].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-green-700 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/admissions" className="btn-primary text-xs inline-flex mt-2">Apply for Nursery Admission</Link>
                </div>
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-primary-950 uppercase tracking-wider">Nursery Classes</h4>
                  <div className="space-y-2 text-xs text-slate-600">
                    {[{ name: "Nursery 1 (Ages 2–3)", desc: "Fine motor control, sensory immersion & vocabulary" }, { name: "Nursery 2 (Ages 3–4)", desc: "Phonetic blending, numbers 1–100, creative arts" }, { name: "Nursery 3 (Ages 4–5)", desc: "Independent reading, elementary arithmetic & science" }].map((cls) => (
                      <div key={cls.name} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <strong className="text-primary-900 block">{cls.name}</strong>
                        <span>{cls.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDivisionTab === "primary" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-secondary-800 bg-secondary-100 px-3 py-1 rounded-full">
                    <span>Ages: 5 – 10 Years</span><span>&bull;</span><span>Basic 1 to Basic 5</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-primary-950">Basic Primary Division (Elementary)</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Our primary curriculum marries the Nigerian National Curriculum with Cambridge primary objectives. Learners delve into quantitative reasoning, verbal aptitude, science experiments, digital literacy, and leadership ethics.
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium pt-2">
                    {["Advanced Mathematics & Verbal Reasoning", "Hands-on Basic Science & Technology", "National Values (Civic, Social & Security)", "Weekly Computer Lab & Coding sessions"].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-green-700 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/admissions" className="btn-primary text-xs inline-flex mt-2">Enroll for Basic Primary</Link>
                </div>
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-primary-950 uppercase tracking-wider">Primary Structure (~200 Capacity)</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {PRIMARY_CLASSES.slice(4).map((cls) => (
                      <div key={cls.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="font-bold text-primary-900 block">{cls.name}</span>
                        <span className="text-[10px] text-slate-500">Cap: ~{cls.approxCapacity} pupils</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDivisionTab === "jss" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-800 bg-primary-100 px-3 py-1 rounded-full">
                    <span>Ages: 10 – 13 Years</span><span>&bull;</span><span>JSS 1, JSS 2 & JSS 3</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-primary-950">Junior Secondary School & BECE Excellence</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Designed to transition students from elementary discovery to academic discipline. Features intensive laboratory work, grouping of National Values and Pre-Vocational Studies, and 100% BECE distinction preparation.
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium pt-2">
                    {["Full Cognitive Domain: 15 CA1 + 15 CA2 + 70 Exam", "Psychomotor (9 skills) & Affective (12 traits) rating", "Pre-Vocational Studies (Home Econ & Agric)", "Scratch card termly result checker access"].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-green-700 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 flex items-center gap-3">
                    <Link href="/admissions" className="btn-primary text-xs">Enroll in Junior Secondary</Link>
                  </div>
                </div>
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-primary-950 uppercase tracking-wider">JSS Classes (BECE Track)</h4>
                  <div className="space-y-2 text-xs text-slate-600">
                    {[
                      { name: "JSS 1 (Grade 7)", cap: "~80", desc: "Foundational secondary orientation, introductory sciences & languages.", bg: "bg-primary-50/60 border-primary-100" },
                      { name: "JSS 2 (Grade 8)", cap: "~80", desc: "Intermediate sciences, business studies, ICT & critical debating.", bg: "bg-primary-50/60 border-primary-100" },
                      { name: "JSS 3 (Grade 9)", cap: "~80", desc: "Graduation year: State & NECO BECE examination mastery.", bg: "bg-secondary-50/60 border-secondary-200" },
                    ].map((cls) => (
                      <div key={cls.name} className={`p-3 rounded-xl border ${cls.bg}`}>
                        <div className="flex justify-between font-bold text-primary-950">
                          <span>{cls.name}</span><span>Cap: {cls.cap}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{cls.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDivisionTab === "sss" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-secondary-800 bg-secondary-100 px-3 py-1 rounded-full">
                    <span>Ages: 13 – 16 Years</span><span>&bull;</span><span>SS 1, SS 2 &amp; SS 3</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-primary-950">Senior Secondary &amp; University Prep (WAEC/NECO/JAMB)</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Preparing leaders for top tertiary institutions in Nigeria and abroad. Dedicated Science and Art &amp; Humanities academic cohorts, supported by university counseling and leadership seminars.
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium pt-2">
                    {["Science Stream: Physics, Chem, Bio, Further Maths", "Commercial Stream: Accounting, Commerce, Econ", "Arts Stream: Lit-in-English, Government, History", "Intensive JAMB/UTME & WAEC mock drills"].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-green-700 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/admissions" className="btn-primary text-xs inline-flex mt-2">Apply for Senior Secondary</Link>
                </div>
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-bold text-sm text-primary-950 uppercase tracking-wider">Senior Secondary Cohorts &amp; Streams</h4>
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="p-3 rounded-lg border bg-slate-50 border-slate-100 space-y-1">
                      <div className="flex justify-between font-bold text-primary-950">
                        <span>SS 1 (Stream Exploration)</span>
                        <span className="text-secondary-700 font-extrabold text-[11px]">Foundational</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Career counseling, stream diagnostics, and core secondary curriculum.</p>
                    </div>

                    <div className="p-3 rounded-lg border bg-blue-50/50 border-blue-100 space-y-1.5">
                      <div className="flex justify-between font-bold text-primary-950">
                        <span>SS 2 (Specialized Streams)</span>
                        <span className="text-blue-800 font-black text-xs">Total: 64 Students</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                        <div className="p-2 rounded-lg bg-white border border-blue-200 shadow-xs">
                          <strong className="text-primary-900 block text-[11px]">Science Stream</strong>
                          <span className="text-blue-700 font-black text-xs">29 Students</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-blue-200 shadow-xs">
                          <strong className="text-primary-900 block text-[11px]">Art &amp; Humanities</strong>
                          <span className="text-secondary-800 font-black text-xs">35 Students</span>
                        </div>
                      </div>
                      <p className="text-[10.5px] text-slate-500">Advanced laboratory practicals, literature seminars, and JAMB UTME clinics.</p>
                    </div>

                    <div className="p-3 rounded-lg border bg-secondary-50/70 border-secondary-200 space-y-1.5">
                      <div className="flex justify-between font-bold text-primary-950">
                        <span>SS 3 (Graduation &amp; WAEC)</span>
                        <span className="text-secondary-900 font-black text-xs">Total: 74 Students</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                        <div className="p-2 rounded-lg bg-white border border-secondary-300 shadow-xs">
                          <strong className="text-primary-900 block text-[11px]">Science Stream</strong>
                          <span className="text-blue-700 font-black text-xs">37 Students</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-secondary-300 shadow-xs">
                          <strong className="text-primary-900 block text-[11px]">Art &amp; Humanities</strong>
                          <span className="text-secondary-800 font-black text-xs">37 Students</span>
                        </div>
                      </div>
                      <p className="text-[10.5px] text-slate-500">Intensive WAEC, NECO &amp; JAMB preparation, university placement guidance.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ACADEMIC CALENDAR — Compact Cards */}
      <section id="calendar" className="py-10 sm:py-14 lg:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-6 sm:space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 reveal-init reveal-fade-up delay-100">
            <span className="text-[11px] font-extrabold text-primary-800 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded-full">
              Calendar &amp; Daily Operations
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-primary-950">
              School Hours &amp; Key Academic Milestones
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Structured daily schedules balancing academic focus, sports, cultural activities, and personal growth.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Daily Schedule */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4 reveal-init reveal-fade-left delay-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-900 text-secondary-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-primary-950">Daily School Hours</h3>
                  <p className="text-[11px] text-slate-500">Punctuality and routine mastery</p>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { day: "Monday – Thursday", type: "Full Academic Instruction", time: "7:30 AM – 3:30 PM", timeColor: "text-primary-800" },
                  { day: "Friday", type: "Sports & Leadership Clubs", time: "7:30 AM – 1:30 PM", timeColor: "text-secondary-700" },
                  { day: "Creche Extended Care", type: "Working Parents Support", time: "7:00 AM – 5:30 PM", timeColor: "text-accent-green-700" },
                ].map((s) => (
                  <div key={s.day} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-primary-950 block">{s.day}</strong>
                      <span className="text-[11px] text-slate-500">{s.type}</span>
                    </div>
                    <span className={`font-mono font-bold text-[11px] ${s.timeColor} bg-white px-2 py-1 rounded-md border border-slate-200`}>
                      {s.time}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 text-xs text-primary-900 space-y-0.5">
                <strong className="block font-bold">Assembly Policy:</strong>
                <p className="text-slate-600 text-[11px]">
                  Morning devotions commence promptly at <strong>7:45 AM</strong>. Gates close to late arrivals at 8:00 AM.
                </p>
              </div>
            </div>

            {/* Events */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4 reveal-init reveal-fade-right delay-350">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-primary-950">Term Dates &amp; Milestones</h3>
                    <p className="text-[11px] text-slate-500">Official academic calendar highlights</p>
                  </div>
                </div>
                <span className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-700 shrink-0">
                  2026/2027
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { tag: "Resumption", tagColor: "bg-primary-100 text-primary-800", borderColor: "border-l-primary-800", title: "First Term Resumption for 2026/2027 Session", desc: "All students return for commencement of lectures.", date: "Mon, Sept 14, 2026", sub: "Next Academic Term" },
                  { tag: "Academics", tagColor: "bg-secondary-100 text-secondary-800", borderColor: "border-l-secondary-500", title: "Mid-Term Continuous Assessment & Open Day", desc: "Parent-teacher consultations and CA progress reviews.", date: "Fri, Oct 23, 2026", sub: "Campus Classrooms" },
                  { tag: "Sports & Gala", tagColor: "bg-accent-green-100 text-accent-green-800", borderColor: "border-l-accent-green-600", title: "Annual Inter-House Athletics & Cultural Gala", desc: "Track and field events, cultural presentations, and medals.", date: "Fri, Nov 27, 2026", sub: "School Sports Field" },
                ].map((evt) => (
                  <div key={evt.title} className={`p-3 bg-slate-50 rounded-xl border-l-4 ${evt.borderColor} border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[9px] font-extrabold uppercase ${evt.tagColor} px-1.5 py-0.5 rounded`}>{evt.tag}</span>
                        <h4 className="font-bold text-xs sm:text-sm text-primary-950">{evt.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500">{evt.desc}</p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <span className="font-bold text-xs text-primary-900 block">{evt.date}</span>
                      <span className="text-[10px] text-slate-500">{evt.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
