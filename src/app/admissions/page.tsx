"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SCHOOL_CONTACT } from "@/constants/school";
import {
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Check,
  MessageCircle,
  Download,
  ChevronRight,
  ChevronDown,
  FileCheck2,
  Sparkles,
  HelpCircle,
  Calendar,
} from "lucide-react";

interface PlacementDivision {
  id: string;
  ageRange: string;
  shortLabel: string;
  divisionTitle: string;
  targetClassValue: string;
  classes: string;
  assessment: string;
  curriculumFocus: string;
  documents: string[];
}

const PLACEMENT_DIVISIONS: PlacementDivision[] = [
  {
    id: "creche",
    ageRange: "3 Months – 2 Years",
    shortLabel: "3m – 2y (Creche)",
    divisionTitle: "Creche & Infant Learning Haven",
    targetClassValue: "Creche & Toddler",
    classes: "Infant Care & Toddler Group",
    assessment: "Parent orientation interview & pediatric wellness review (No written test).",
    curriculumFocus: "Sensory stimulation, motor development, safe nap routines, and affectionate care.",
    documents: [
      "Copy of Birth Certificate",
      "Immunization & Health Record Card",
      "2 Recent Passport Photographs (Child & Parents)",
      "Completed GFMS Medical & Feeding Form",
    ],
  },
  {
    id: "nursery",
    ageRange: "2 – 5 Years",
    shortLabel: "2 – 5y (Nursery)",
    divisionTitle: "Montessori Nursery Division",
    targetClassValue: "Nursery 1 - 3",
    classes: "Pre-School, Nursery 1, Nursery 2 & Nursery 3",
    assessment: "Play-based readiness observation, oral phonics & number recognition chat.",
    curriculumFocus: "Maria Montessori tactile apparatus, Jolly Phonics reading fluency, practical life & courtesy.",
    documents: [
      "Copy of Official Birth Certificate",
      "Immunization Record",
      "4 Recent Passport Photographs",
      "Previous School Report (if transferring into Nursery 2/3)",
    ],
  },
  {
    id: "primary",
    ageRange: "5 – 10 Years",
    shortLabel: "5 – 10y (Primary)",
    divisionTitle: "Basic Primary School (Elementary)",
    targetClassValue: "Basic 1 - 5",
    classes: "Basic 1, Basic 2, Basic 3, Basic 4 & Basic 5",
    assessment: "Diagnostic placement test in English Literacy, Quantitative Mathematics & General Reasoning.",
    curriculumFocus: "Blended Nigerian & British Primary curriculum, ICT & coding, practical science, and FLSC preparation.",
    documents: [
      "Copy of Birth Certificate",
      "Last Terminal Report Sheet from Previous School",
      "4 Recent Passport Photographs",
      "Medical Fitness / Health Record",
    ],
  },
  {
    id: "jss",
    ageRange: "10 – 13 Years",
    shortLabel: "10 – 13y (JSS 1–3)",
    divisionTitle: "Junior Secondary College (BECE Track)",
    targetClassValue: "JSS 1 (Secondary)",
    classes: "JSS 1, JSS 2 & JSS 3",
    assessment: "Common Entrance / Diagnostic Examination in Mathematics, English Studies & Basic Science.",
    curriculumFocus: "13-subject Junior Secondary curriculum, laboratory practicals, CBT mastery & State/NECO BECE distinction.",
    documents: [
      "First School Leaving Certificate (FLSC) or Primary 5/6 Testimonial",
      "Last Two Terminal Report Cards",
      "Copy of Birth Certificate",
      "4 Passport Photographs",
    ],
  },
  {
    id: "sss",
    ageRange: "13 – 16+ Years",
    shortLabel: "13 – 16y (SS 1–3)",
    divisionTitle: "Senior Secondary College (WASSCE / NECO / UTME)",
    targetClassValue: "SSS 1 (Senior Secondary)",
    classes: "SS 1 & SS 2 (Science, Art & Commercial Streams)",
    assessment: "Stream-specific Entrance Examination (Science / Arts / Commercial) + Head Teacher Interview.",
    curriculumFocus: "Physics, Chemistry, Biology, Literature, Government, Economics, and intensive WAEC/NECO/JAMB UTME clinics.",
    documents: [
      "BECE Result Slip / Junior Secondary Testimonial",
      "Previous Senior Secondary Transcript (for SS 2 transfers)",
      "Copy of Birth Certificate & 4 Passport Photographs",
      "Character Reference / Transfer Clearance",
    ],
  },
];

const ADMISSIONS_FAQS = [
  {
    q: "When can my child sit for the entrance diagnostic assessment?",
    a: "Diagnostic assessments hold Monday through Friday between 9:00 AM and 1:00 PM at the school administrative registry, as well as on scheduled Saturdays. Results are communicated within 24–48 hours.",
  },
  {
    q: "Does Great-Favour accept mid-session transfers into Primary, JSS 2, or SS 2?",
    a: "Yes. Transfer candidates into Nursery 2–3, Basic 1–5, JSS 2, and SS 2 are admitted at the start of First or Second Term subject to a satisfactory transcript review and diagnostic placement score.",
  },
  {
    q: "How do parents monitor continuous assessments and terminal results?",
    a: "Every term follows a transparent 15 CA1 + 15 CA2 + 70 Examination grading model. At the end of each term, parents use an official Scratch Card PIN on our Result Portal to view and download a full-page A4 vector PDF report card.",
  },
  {
    q: "Does the school operate a school bus service across Issele-Azagba and environs?",
    a: "Yes. Our Transport & Logistics Department operates supervised morning pick-up and afternoon drop-off routes across designated stops in Issele-Azagba, Okpanam, Asaba axis, and surrounding communities.",
  },
];

export default function AdmissionsPage() {
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("jss");
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [tourFormSubmitted, setTourFormSubmitted] = useState(false);
  const [tourFormData, setTourFormData] = useState({
    parentName: "",
    phone: "",
    email: "",
    childName: "",
    targetClass: "JSS 1 (Secondary)",
    visitDate: "",
  });

  const activePlacement =
    PLACEMENT_DIVISIONS.find((d) => d.id === selectedDivisionId) || PLACEMENT_DIVISIONS[3];

  const handleSelectAndApply = (targetClassValue: string) => {
    setTourFormData((prev) => ({ ...prev, targetClass: targetClassValue }));
    const el = document.getElementById("tour");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleTourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTourFormSubmitted(true);
  };

  return (
    <>
      {/* EDITORIAL PAGE HERO BANNER */}
      <section className="relative bg-primary-950 text-white py-14 sm:py-20 overflow-hidden border-b border-primary-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/school-building-front.jpg"
            alt="Great-Favour Montessori School Admissions"
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
            <span className="text-secondary-400 font-semibold">Admissions &amp; Enrollment</span>
          </nav>

          <div className="max-w-3xl space-y-4 reveal-init reveal-fade-up delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2px] bg-secondary-400" />
              <span className="text-xs font-extrabold text-secondary-400 uppercase tracking-widest">
                2026/2027 Academic Session Open
              </span>
            </div>
            <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Admissions &amp; Enrollment Guide
            </h1>
            <p className="text-slate-200 text-sm sm:text-lg leading-relaxed max-w-2xl">
              Admission into Great-Favour Montessori School is transparent, merit-oriented, and structured to place every child in the class arm where they will flourish academically and morally.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#tour"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-5 py-3 rounded-lg shadow-md transition"
              >
                <span>Schedule a Campus Tour</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#class-finder"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/25 px-5 py-3 rounded-lg transition"
              >
                <Sparkles className="w-4 h-4 text-secondary-400" />
                <span>Age &amp; Class Finder</span>
              </a>
              <Link
                href="/prospectus"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-200 hover:text-secondary-400 px-3 py-2.5 transition"
              >
                <Download className="w-4 h-4 text-secondary-400" />
                <span>View School Prospectus</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE AGE & CLASS PLACEMENT FINDER */}
      <section id="class-finder" className="py-14 sm:py-20 bg-slate-50 border-b border-slate-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 reveal-init reveal-fade-up">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-8 h-[2px] bg-primary-800" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-primary-800">
                  Interactive Placement Guide
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-primary-950 tracking-tight">
                Find the Right Class &amp; Requirements by Age
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md">
              Select your child&apos;s age group below to view the recommended academic division, assessment format, and required documents.
            </p>
          </div>

          {/* Age Bracket Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 reveal-init reveal-fade-up delay-100">
            {PLACEMENT_DIVISIONS.map((div) => {
              const isSelected = div.id === selectedDivisionId;
              return (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => setSelectedDivisionId(div.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-primary-950 text-white border-primary-950 shadow-lg"
                      : "bg-white text-slate-800 border-slate-200 hover:border-primary-300"
                  }`}
                >
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                      isSelected ? "text-secondary-400" : "text-primary-800"
                    }`}
                  >
                    Age Bracket
                  </span>
                  <strong className="text-xs sm:text-sm font-extrabold block mt-0.5">
                    {div.shortLabel}
                  </strong>
                </button>
              );
            })}
          </div>

          {/* Selected Division Detail Card */}
          <div className="editorial-card p-5 sm:p-8 bg-white grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start reveal-init reveal-fade-up delay-150">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-secondary-50 border border-secondary-200 text-secondary-900 text-xs font-extrabold">
                <GraduationCap className="w-4 h-4 text-primary-900" />
                <span>Recommended for Ages {activePlacement.ageRange}</span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-primary-950">
                  {activePlacement.divisionTitle}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-primary-800 mt-1">
                  Available Classes: {activePlacement.classes}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-800 block">
                    Entrance Assessment Format
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activePlacement.assessment}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-800 block">
                    Core Curriculum Focus
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {activePlacement.curriculumFocus}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectAndApply(activePlacement.targetClassValue)}
                  className="inline-flex items-center gap-2 bg-primary-950 hover:bg-primary-900 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-lg transition shadow-sm"
                >
                  <span>Apply for {activePlacement.divisionTitle}</span>
                  <ArrowRight className="w-4 h-4 text-secondary-400" />
                </button>
                <Link
                  href="/academics"
                  className="editorial-link text-xs font-bold text-primary-900 py-2"
                >
                  <span>Explore Division Curriculum</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <FileCheck2 className="w-4 h-4 text-primary-800" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary-950">
                  Required Registration Documents
                </h4>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700">
                {activePlacement.documents.map((doc) => (
                  <li key={doc} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </span>
                    <span className="font-medium">{doc}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                Documents can be submitted physically at the school administrative office during your campus tour or assessment appointment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-STEP PROCESS & ENROLLMENT FORM */}
      <section className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-2 reveal-init reveal-fade-up">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2px] bg-primary-800" />
              <span className="text-xs font-extrabold text-primary-800 uppercase tracking-widest">
                Step-by-Step Enrollment
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-primary-950 tracking-tight">
              Four-Step Admissions Process
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Our admissions workflow is designed to be welcoming, clear, and efficient for families.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                num: "01",
                title: "Submit Application",
                desc: "Complete the official GFMS Admission Form online or at the school administrative registry.",
                sub: "Available Year-Round",
              },
              {
                num: "02",
                title: "Diagnostic Assessment",
                desc: "Pupils sit for an age-appropriate assessment in English, Mathematics, and Aptitude.",
                sub: "Scheduled Mon – Sat",
              },
              {
                num: "03",
                title: "Parent & Pupil Chat",
                desc: "Warm interaction with the Head Teacher to align on character values, health records, and goals.",
                sub: "In-person or Virtual",
              },
              {
                num: "04",
                title: "Offer of Admission",
                desc: "Successful candidates receive their official Letter of Admission, booklist, and uniform pack.",
                sub: "Welcome to GFMS!",
              },
            ].map((step, idx) => (
              <div
                key={step.num}
                className="editorial-card p-5 flex flex-col justify-between space-y-4 reveal-init reveal-fade-up"
                style={{ transitionDelay: `${idx * 90}ms` }}
              >
                <div className="space-y-2.5">
                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary-950 text-secondary-400 font-mono text-xs font-extrabold">
                    STEP {step.num}
                  </span>
                  <h3 className="font-extrabold text-base text-primary-950 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
                <div className="pt-2.5 border-t border-slate-100 text-[11px] text-primary-800 font-bold">
                  {step.sub}
                </div>
              </div>
            ))}
          </div>

          {/* ENROLLMENT FORM */}
          <div
            id="tour"
            className="bg-primary-950 text-white rounded-2xl p-5 sm:p-8 lg:p-10 border border-primary-900 shadow-xl scroll-mt-24 reveal-init reveal-fade-up"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-[11px] font-extrabold text-slate-950 uppercase tracking-widest bg-secondary-400 px-3 py-1 rounded-md inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Campus Tour &amp; Enrollment Desk</span>
                </span>
                <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-snug">
                  Schedule a Campus Tour or Request Admission Placement
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Complete this form and our Admissions Officer will contact you within 24 hours to confirm your visit date and diagnostic assessment slot.
                </p>
                <div className="grid grid-cols-1 gap-2.5 pt-1 text-xs text-slate-200">
                  <div className="flex items-center gap-2.5 bg-primary-900/80 p-3 rounded-lg border border-white/10">
                    <Phone className="w-4 h-4 text-secondary-400 shrink-0" />
                    <span>Admissions Desk: {SCHOOL_CONTACT.phoneFormatted}</span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-primary-900/80 p-3 rounded-lg border border-white/10">
                    <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={SCHOOL_CONTACT.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-emerald-300 transition font-semibold"
                    >
                      WhatsApp Direct: {SCHOOL_CONTACT.whatsapp}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 bg-primary-900/80 p-3 rounded-lg border border-white/10">
                    <Mail className="w-4 h-4 text-secondary-400 shrink-0" />
                    <span>{SCHOOL_CONTACT.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-primary-900/80 p-3 rounded-lg border border-white/10">
                    <MapPin className="w-4 h-4 text-secondary-400 shrink-0" />
                    <span>Issele-Azagba, Aniocha North LGA, Delta State</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-7 bg-white text-slate-900 rounded-xl p-5 sm:p-7 shadow-lg">
                {tourFormSubmitted ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-extrabold text-primary-950">
                      Inquiry Received by Admissions!
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      Thank you, <strong className="text-primary-900">{tourFormData.parentName}</strong>. Our Admissions Secretary will reach out to you via <strong>{tourFormData.phone}</strong> regarding placement for <strong>{tourFormData.childName || "your child"}</strong> in <strong>{tourFormData.targetClass}</strong>.
                    </p>
                    <button
                      onClick={() => setTourFormSubmitted(false)}
                      className="text-xs text-primary-800 font-extrabold underline hover:text-primary-950 pt-2"
                    >
                      Submit another inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTourSubmit} className="space-y-3.5">
                    <div className="border-b border-slate-200 pb-3">
                      <h4 className="font-extrabold text-base text-primary-950">
                        Admissions &amp; Campus Tour Request Form
                      </h4>
                      <p className="text-xs text-slate-500">
                        Enter your family&apos;s details below to reserve an assessment or tour slot.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Parent / Guardian Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Mr. & Mrs. Okeke"
                          value={tourFormData.parentName}
                          onChange={(e) =>
                            setTourFormData({ ...tourFormData, parentName: e.target.value })
                          }
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Phone / WhatsApp Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="0803 123 4567"
                          value={tourFormData.phone}
                          onChange={(e) =>
                            setTourFormData({ ...tourFormData, phone: e.target.value })
                          }
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="parent@example.com"
                          value={tourFormData.email}
                          onChange={(e) =>
                            setTourFormData({ ...tourFormData, email: e.target.value })
                          }
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Prospective Student Name
                        </label>
                        <input
                          type="text"
                          placeholder="Child's Full Name"
                          value={tourFormData.childName}
                          onChange={(e) =>
                            setTourFormData({ ...tourFormData, childName: e.target.value })
                          }
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Target Class Division *
                        </label>
                        <select
                          value={tourFormData.targetClass}
                          onChange={(e) =>
                            setTourFormData({ ...tourFormData, targetClass: e.target.value })
                          }
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50"
                        >
                          <option value="Creche & Toddler">Creche &amp; Toddler (3m - 2y)</option>
                          <option value="Nursery 1 - 3">Montessori Nursery (2 - 5y)</option>
                          <option value="Basic 1 - 5">Basic Primary (Basic 1 - 5)</option>
                          <option value="JSS 1 (Secondary)">JSS 1 (Junior Secondary)</option>
                          <option value="JSS 2 - 3 (Transfer)">JSS 2 - 3 (Transfer)</option>
                          <option value="SSS 1 (Senior Secondary)">SSS 1 (Senior Secondary)</option>
                          <option value="SSS 2 (Transfer)">SSS 2 (Transfer)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Preferred Tour / Test Date
                        </label>
                        <input
                          type="date"
                          value={tourFormData.visitDate}
                          onChange={(e) =>
                            setTourFormData({ ...tourFormData, visitDate: e.target.value })
                          }
                          className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full font-extrabold text-xs sm:text-sm bg-primary-950 hover:bg-primary-900 text-white py-3 rounded-lg transition shadow-md flex items-center justify-center gap-2 mt-2"
                    >
                      <span>Submit Inquiry &amp; Request Callback</span>
                      <ArrowRight className="w-4 h-4 text-secondary-400" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION */}
      <section className="py-14 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2 reveal-init reveal-fade-up">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-primary-800">
              <HelpCircle className="w-4 h-4 text-secondary-600" />
              <span>Parent Admissions FAQ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-950 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3 reveal-init reveal-fade-up delay-100">
            {ADMISSIONS_FAQS.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={faq.q}
                  className="editorial-card bg-white overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                  >
                    <span className="font-bold text-sm sm:text-base text-primary-950">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-primary-800 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
