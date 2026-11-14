"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  BookOpen,
  Award,
  Download,
  Printer,
  CheckCircle2,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Users,
} from "lucide-react";
import { KEY_PERSONNEL, SCHOOL_CONTACT } from "@/constants/school";

export default function ProspectusPage() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans print:bg-white print:text-black">
      {/* Top Navigation Bar - Hidden on print */}
      <header className="bg-primary-950 text-white border-b border-primary-900 sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to School Website</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <a
              href="/docs/GFMS_School_Prospectus.pdf"
              download="Great_Favour_Montessori_School_Prospectus.pdf"
              className="px-3.5 py-1.5 bg-secondary-500 hover:bg-secondary-400 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>Download PDF Document</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Prospectus Document Sheet */}
      <main className="max-w-5xl mx-auto my-6 sm:my-10 bg-white border border-slate-200 shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden print:border-none print:shadow-none print:m-0 print:rounded-none">
        {/* Cover / Title Banner */}
        <section className="bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 text-white p-6 sm:p-12 relative overflow-hidden border-b-4 border-secondary-500">
          <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-secondary-500 text-slate-950 shadow-sm">
                  Official School Prospectus
                </span>
                <span className="text-xs text-secondary-400 font-bold">
                  2026 / 2027 Academic Session
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Great-Favour Montessori School
              </h1>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-light">
                Motto: <strong className="text-secondary-400 font-bold">&ldquo;Building Honest, Confident Leaders Grounded in Moral Character &amp; Academic Brilliance&rdquo;</strong>
              </p>

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Early Childhood &amp; Montessori Creche</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Primary Education (Grades 1–6)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Junior &amp; Senior Secondary (JSS 1–SS 3)</span>
                </div>
              </div>
            </div>

            {/* Logo Badge */}
            <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-2 shadow-2xl border-2 border-secondary-400 flex items-center justify-center">
              <div className="relative w-full h-full">
                <Image
                  src="/logo.jpg"
                  alt="GFMS Official Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Welcome Address from the Director */}
        <section className="p-6 sm:p-10 border-b border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-2 text-primary-900 font-extrabold text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-secondary-600" />
            <span>Welcome from the Proprietor / Director</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-8 space-y-3 text-slate-700 text-sm leading-relaxed">
              <h2 className="text-xl sm:text-2xl font-black text-primary-950">
                A Message of Purpose, Faith &amp; Excellence
              </h2>
              <p>
                Welcome to <strong>Great-Favour Montessori School (GFMS)</strong>. We are a distinguished citadel of learning dedicated to cultivating pupils and students who excel not only in academic pursuits but also in sound moral values, high integrity, and independent critical thinking.
              </p>
              <p>
                Since our founding, we have maintained a standard of excellence that harmonizes the child-centered Montessori approach with Nigeria’s rigorous national basic and secondary educational curriculum. Here, every child is recognized as unique, equipped with modern STEM tools, and nurtured by devoted educators.
              </p>
              <p>
                We invite your family to explore this prospectus and partner with us on this transformative journey toward raising global leaders.
              </p>
              <div className="pt-2">
                <p className="font-bold text-primary-950 text-sm">
                  {KEY_PERSONNEL.director.fullName}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {KEY_PERSONNEL.director.title} &bull; Great-Favour Montessori School
                </p>
              </div>
            </div>

            <div className="md:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-primary-900 uppercase tracking-wider text-[11px]">
                Core Pillars
              </div>
              <ul className="space-y-1.5 text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                  <span>Academic Brilliance &amp; STEM</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                  <span>Moral Character &amp; Godliness</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                  <span>Modern Computer-Based Testing</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-500" />
                  <span>Leadership &amp; Public Speaking</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Academic Divisions & Curricula */}
        <section className="p-6 sm:p-10 border-b border-slate-200 bg-slate-50/60 space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-primary-800 uppercase tracking-widest bg-primary-100 px-3 py-1 rounded-full">
              Educational Pathways
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-primary-950">
              Structured Academic Divisions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Division 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-sm">
                  01
                </div>
                <h4 className="font-extrabold text-base text-primary-950">
                  Early Childhood &amp; Montessori Creche
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ages 1 to 5. Emphasizes sensorial discovery, phonics foundations, numbers, vocabulary, creative crafts, and social etiquette.
                </p>
              </div>
              <div className="text-[11px] font-bold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Focus: Motor skills, confidence, phonics, joyful exploration.
              </div>
            </div>

            {/* Division 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black text-sm">
                  02
                </div>
                <h4 className="font-extrabold text-base text-primary-950">
                  Primary / Basic School (Grades 1–6)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Rigorous numeracy, English studies, Basic Science &amp; Technology, Civic Education, Computer / ICT literacy, and French.
                </p>
              </div>
              <div className="text-[11px] font-bold text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-200">
                Focus: Analytical thinking, reading culture, digital literacy.
              </div>
            </div>

            {/* Division 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-sm">
                  03
                </div>
                <h4 className="font-extrabold text-base text-primary-950">
                  Secondary School (JSS 1 – SS 3)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Complete Junior &amp; Senior Secondary programs preparing students for WAEC / WASSCE, NECO, BECE, and JAMB/UTME with Science, Arts, and Commercial tracks.
                </p>
              </div>
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                Focus: Exam mastery, science labs, leadership &amp; CBT testing.
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Specialized Facilities & STEM Labs */}
        <section className="p-6 sm:p-10 border-b border-slate-200 bg-white space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-secondary-600 uppercase tracking-widest bg-secondary-100 px-3 py-1 rounded-full">
              Modern Facilities
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-primary-950">
              State-of-the-Art Infrastructure
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-primary-950 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-secondary-600" />
                <span>Modern Computer &amp; CBT Lab</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Fully air-conditioned computer testing suite with offline local mesh server and high-speed terminals.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-primary-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-secondary-600" />
                <span>Science Laboratories</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Hands-on Physics, Chemistry, and Biology apparatus and specimen collections for empirical discovery.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-primary-950 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-secondary-600" />
                <span>Library &amp; Media Hub</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Rich collection of classic literature, encyclopedias, reference texts, and quiet study carrels.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-primary-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-secondary-600" />
                <span>Security &amp; Sports Complex</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Gated, secure campus perimeter with CCTV monitoring, football pitch, badminton court, and recreation parks.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Admissions & Enrollment Guide */}
        <section className="p-6 sm:p-10 border-b border-slate-200 bg-slate-50/60 space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">
              Enrollment Guidelines
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-primary-950">
              The 4-Step Admission Procedure
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-primary-800 text-white font-bold flex items-center justify-center text-[10px]">
                1
              </span>
              <h5 className="font-bold text-primary-950">Obtain Admission Form</h5>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Available online at our portal or physically at the school administrative desk.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-secondary-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                2
              </span>
              <h5 className="font-bold text-primary-950">Diagnostic Assessment</h5>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Prospective pupils take a short diagnostic placement assessment in English &amp; Mathematics.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-primary-800 text-white font-bold flex items-center justify-center text-[10px]">
                3
              </span>
              <h5 className="font-bold text-primary-950">Parent Interaction</h5>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Brief interaction with school leadership to align on student needs, health, and mutual goals.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                4
              </span>
              <h5 className="font-bold text-primary-950">Admission Offer</h5>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Successful candidates receive the official Letter of Admission and starter orientation packet.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: School Calendar & Contact Information */}
        <section className="p-6 sm:p-10 bg-primary-950 text-white space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <h4 className="text-lg font-black text-white">
                Contact the Admissions Registry
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our admissions officers are available Mondays through Fridays (8:00 AM – 4:00 PM) to attend to prospective parents, schedule tours, and answer inquiries.
              </p>
              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-secondary-400 shrink-0" />
                  <span>{SCHOOL_CONTACT.phoneFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-secondary-400 shrink-0" />
                  <span>{SCHOOL_CONTACT.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-secondary-400 shrink-0" />
                  <span>{SCHOOL_CONTACT.address}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-xs">
              <div className="font-bold text-secondary-400 uppercase tracking-wider text-[11px]">
                Schedule a Visit
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Parents are warmly encouraged to visit our campus to observe classrooms, meet teachers, and experience the GFMS learning environment firsthand.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  href="/admissions#tour"
                  className="px-4 py-2 bg-secondary-500 hover:bg-secondary-400 text-slate-950 font-black rounded-xl text-xs transition active:scale-95"
                >
                  Schedule Campus Tour
                </Link>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition"
                >
                  Print Prospectus
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-center text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} Great-Favour Montessori School. All rights reserved.
          </div>
        </section>
      </main>
    </div>
  );
}
