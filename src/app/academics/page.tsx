"use client";

import React, { useState } from "react";
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
      {/* PAGE HERO BANNER */}
      <section className="relative bg-gradient-to-r from-primary-950 via-primary-900 to-slate-950 text-white py-10 sm:py-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-4 reveal-init reveal-fade-up delay-100">
            <span className="text-xs font-extrabold text-secondary-400 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/20">
              Structured Learning Pathways
            </span>
            <h1 className="text-2xl sm:text-5xl font-black tracking-tight">
              Academic Divisions & Calendar
            </h1>
            <p className="text-slate-200 text-sm sm:text-lg leading-relaxed max-w-2xl">
              Providing unbroken continuity from early childhood Montessori discovery through to Senior Secondary graduation and university preparation.
            </p>
          </div>
        </div>
      </section>

      {/* ACADEMIC DIVISIONS EXPLORER */}
      <section className="py-10 sm:py-16 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3 reveal-init reveal-fade-up delay-100">
            <span className="text-xs font-extrabold text-secondary-600 uppercase tracking-widest bg-secondary-100 px-3 py-1 rounded-full">
              Structured Learning Pathways
            </span>
            <h2 className="text-xl sm:text-4xl font-extrabold text-primary-950">
              Explore Our Academic Divisions
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Providing unbroken continuity from early childhood Montessori discovery through to Senior Secondary graduation and university preparation.
            </p>
          </div>

          {/* Division Selector */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-4xl mx-auto border border-slate-200 overflow-x-auto no-scrollbar reveal-init reveal-fade-down delay-200">
            {[
              { value: "creche" as const, label: "Creche & Toddler (3m - 2y)" },
              { value: "nursery" as const, label: "Montessori Nursery (2 - 5y)" },
              { value: "primary" as const, label: "Basic Primary (Basic 1 - 5)" },
              { value: "jss" as const, label: "Junior Secondary (JSS 1 - 3)" },
              { value: "sss" as const, label: "Senior Secondary (SS 1 - 3)" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveDivisionTab(tab.value)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeDivisionTab === tab.value
                    ? "bg-primary-800 text-white shadow-md"
                    : "text-slate-700 hover:text-primary-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-slate-50 rounded-2xl sm:rounded-3xl p-3 sm:p-10 border border-slate-200 reveal-init reveal-fade-up delay-300">
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

      {/* ACADEMIC CALENDAR */}
      <section id="calendar" className="py-10 sm:py-16 lg:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3 reveal-init reveal-fade-up delay-100">
            <span className="text-xs font-extrabold text-primary-800 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded-full">
              Calendar & Daily Operations
            </span>
            <h2 className="text-xl sm:text-4xl font-extrabold text-primary-950">
              School Hours & Key Academic Milestones
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Carefully structured daily schedules designed to balance academic focus, sports, cultural activities, and personal growth.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Daily Schedule */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 space-y-6 reveal-init reveal-fade-left delay-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-800 text-secondary-400 flex items-center justify-center shadow-md">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary-950">Daily School Hours</h3>
                  <p className="text-xs text-slate-500">Punctuality and routine mastery</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { day: "Monday – Thursday", type: "Full Academic Instruction", time: "7:30 AM – 3:30 PM", timeColor: "text-primary-800" },
                  { day: "Friday", type: "Sports & Leadership Clubs", time: "7:30 AM – 1:30 PM", timeColor: "text-secondary-700" },
                  { day: "Creche Extended Care", type: "Working Parents Support", time: "7:00 AM – 5:30 PM", timeColor: "text-accent-green-700" },
                ].map((s) => (
                  <div key={s.day} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-primary-950 block">{s.day}</strong>
                      <span className="text-slate-500">{s.type}</span>
                    </div>
                    <span className={`font-mono font-bold ${s.timeColor} bg-white px-2.5 py-1 rounded-lg border border-slate-200`}>
                      {s.time}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 text-xs text-primary-900 space-y-1">
                <strong className="block font-bold">Assembly Policy:</strong>
                <p className="text-slate-600">
                  Morning devotions and national anthem commence promptly at <strong>7:45 AM</strong>. Gates close to late arrivals at 8:00 AM.
                </p>
              </div>
            </div>

            {/* Events */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 space-y-6 reveal-init reveal-fade-right delay-350">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary-500 text-slate-950 flex items-center justify-center shadow-md">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary-950">Term Dates & Milestones (2026/2027)</h3>
                    <p className="text-xs text-slate-500">Official academic calendar highlights</p>
                  </div>
                </div>
                <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-700">Session 2026/2027</span>
              </div>

              <div className="space-y-3">
                {[
                  { tag: "Resumption", tagColor: "bg-primary-100 text-primary-800", borderColor: "border-l-primary-800", title: "First Term Resumption for 2026/2027 Session", desc: "All boarders and day students return for commencement of lectures.", date: "Mon, Sept 14, 2026", sub: "Next Academic Term" },
                  { tag: "Academics", tagColor: "bg-secondary-100 text-secondary-800", borderColor: "border-l-secondary-500", title: "Mid-Term Continuous Assessment & Open Day", desc: "Parent-teacher consultations and student continuous assessment progress reviews.", date: "Fri, Oct 23, 2026", sub: "Campus Classrooms" },
                  { tag: "Sports & Gala", tagColor: "bg-accent-green-100 text-accent-green-800", borderColor: "border-l-accent-green-600", title: "Annual Inter-House Athletics & Cultural Gala", desc: "Track and field events, cultural presentations, and medal ceremonies.", date: "Fri, Nov 27, 2026", sub: "School Sports Field" },
                ].map((evt) => (
                  <div key={evt.title} className={`p-4 bg-slate-50 rounded-xl border-l-4 ${evt.borderColor} border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-primary-50/30 transition`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase ${evt.tagColor} px-2 py-0.5 rounded`}>{evt.tag}</span>
                        <h4 className="font-bold text-sm text-primary-950">{evt.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500">{evt.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm text-primary-900 block">{evt.date}</span>
                      <span className="text-[11px] text-slate-500">{evt.sub}</span>
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
