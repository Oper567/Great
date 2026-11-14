"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  SCHOOL_CONTACT,
} from "@/constants/school";
import {
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Check,
  MessageCircle,
  Download,
} from "lucide-react";

export default function AdmissionsPage() {
  const [tourFormSubmitted, setTourFormSubmitted] = useState(false);
  const [tourFormData, setTourFormData] = useState({
    parentName: "",
    phone: "",
    email: "",
    childName: "",
    targetClass: "JSS 1 (Secondary)",
    visitDate: "",
  });

  const handleTourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTourFormSubmitted(true);
  };

  return (
    <>
      {/* PAGE HERO BANNER */}
      <section className="relative bg-gradient-to-r from-primary-950 via-primary-900 to-slate-950 text-white py-10 sm:py-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-4 reveal-init reveal-fade-up delay-100">
            <span className="text-xs font-extrabold text-secondary-400 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/20 inline-flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              Join the Leadership Academy
            </span>
            <h1 className="text-2xl sm:text-5xl font-black tracking-tight">
              Admissions & Enrollment (2026/2027)
            </h1>
            <p className="text-slate-200 text-sm sm:text-lg leading-relaxed max-w-2xl">
              Admission into Great-Favour Montessori School is transparent, merit-oriented, and seamless for both parents and prospective pupils.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#tour"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-5 py-2.5 rounded-xl shadow-md transition active:scale-95"
              >
                <span>Book a Campus Tour</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/prospectus"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 backdrop-blur-sm"
              >
                <Download className="w-4 h-4 text-secondary-400" />
                <span>View School Prospectus</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4-STEP PROCESS */}
      <section className="py-10 sm:py-16 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3 reveal-init reveal-fade-up delay-100">
            <span className="text-xs font-extrabold text-secondary-600 uppercase tracking-widest bg-secondary-100 px-3 py-1 rounded-full">
              Join the Leadership Academy
            </span>
            <h2 className="text-xl sm:text-4xl font-extrabold text-primary-950">
              Four-Step Admissions Process
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Our admissions process is designed to be transparent, welcoming, and efficient for families.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-[44px] left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary-800 via-secondary-400 to-accent-green-600 z-0" />
            
            {[
              { num: "1", title: "Submit Application", desc: "Complete the official GFMS Admission Form online or at the school administrative registry.", sub: "Available Year-Round", numBg: "bg-primary-800 text-white", subColor: "text-primary-800", delay: "delay-100" },
              { num: "2", title: "Diagnostic Assessment", desc: "Pupils sit for a diagnostic assessment in English, Mathematics, and Aptitude for placement.", sub: "Scheduled Weekly", numBg: "bg-secondary-500 text-slate-950", subColor: "text-secondary-800", delay: "delay-250" },
              { num: "3", title: "Parent & Pupil Chat", desc: "Warm interaction with the Head of School to align on values, health records, and goals.", sub: "In-person or Virtual", numBg: "bg-primary-800 text-white", subColor: "text-primary-800", delay: "delay-400" },
              { num: "4", title: "Offer of Admission", desc: "Successful candidates receive the official Letter of Admission, booklist, and orientation packet.", sub: "Welcome to GFMS!", numBg: "bg-accent-green-700 text-white", subColor: "text-accent-green-700", delay: "delay-550" },
            ].map((step) => (
              <div key={step.num} className={`bg-slate-50 p-3.5 sm:p-5 rounded-2xl border border-slate-200 relative space-y-2 reveal-init reveal-fade-up ${step.delay} hover:shadow-lg transition-all duration-300 z-10 flex flex-col justify-between`}>
                <div className="space-y-2">
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full ${step.numBg} font-extrabold flex items-center justify-center text-xs sm:text-sm shadow-md`}>
                    {step.num}
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-primary-950 leading-snug">{step.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
                <div className={`pt-1.5 border-t border-slate-200/80 text-[11px] ${step.subColor} font-semibold`}>{step.sub}</div>
              </div>
            ))}
          </div>

          {/* ENROLLMENT FORM */}
          <div id="tour" className="bg-gradient-to-br from-primary-900 via-primary-950 to-slate-950 text-white rounded-2xl sm:rounded-3xl p-3 sm:p-7 lg:p-10 shadow-2xl reveal-init reveal-zoom-in delay-250">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              <div className="lg:col-span-5 space-y-3 sm:space-y-4">
                <span className="text-[11px] sm:text-xs font-extrabold text-secondary-400 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/20 inline-block">
                  Quick Enrollment Inquiry
                </span>
                <h3 className="text-lg sm:text-2xl lg:text-3xl font-black text-white leading-snug">
                  Schedule a Campus Tour or Request Admission Info
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Our admissions office is ready to assist you. Complete this form and our Admissions Officer will reach out within 24 hours.
                </p>
                <div className="grid grid-cols-1 gap-2 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    <Phone className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                    <span className="text-[11px] sm:text-xs">Desk: {SCHOOL_CONTACT.phoneFormatted}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <a
                      href={SCHOOL_CONTACT.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] sm:text-xs text-white hover:text-emerald-400 transition"
                    >
                      WhatsApp: {SCHOOL_CONTACT.whatsapp}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    <Mail className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                    <span className="text-[11px] sm:text-xs">{SCHOOL_CONTACT.email}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    <MapPin className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                    <span className="text-[11px] sm:text-xs truncate" title={SCHOOL_CONTACT.address}>Issele-Azagba, Aniocha North, Delta State</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-7 bg-white text-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                {tourFormSubmitted ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-12 h-12 bg-accent-green-100 text-accent-green-700 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold text-primary-950">Inquiry Received Successfully!</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Thank you, <strong className="text-primary-900">{tourFormData.parentName}</strong>. Our Admissions Secretary will reach out to you via <strong>{tourFormData.phone}</strong> regarding placement for <strong>{tourFormData.childName || "your child"}</strong> in <strong>{tourFormData.targetClass}</strong>.
                    </p>
                    <button
                      onClick={() => setTourFormSubmitted(false)}
                      className="text-xs text-primary-800 font-bold underline hover:text-primary-900"
                    >
                      Submit another inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTourSubmit} className="space-y-3">
                    <div className="border-b border-slate-100 pb-2 mb-2">
                      <h4 className="font-bold text-sm sm:text-base text-primary-950">
                        Admissions &amp; Tour Request Form
                      </h4>
                      <p className="text-[11px] text-slate-500">Enter your contact details below to connect with admissions.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Parent/Guardian Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Mr. & Mrs. Okeke"
                          value={tourFormData.parentName}
                          onChange={(e) => setTourFormData({ ...tourFormData, parentName: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="0803 123 4567"
                          value={tourFormData.phone}
                          onChange={(e) => setTourFormData({ ...tourFormData, phone: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Email Address</label>
                        <input
                          type="email"
                          placeholder="parent@example.com"
                          value={tourFormData.email}
                          onChange={(e) => setTourFormData({ ...tourFormData, email: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Prospective Student Name</label>
                        <input
                          type="text"
                          placeholder="Child's Full Name"
                          value={tourFormData.childName}
                          onChange={(e) => setTourFormData({ ...tourFormData, childName: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Target Class *</label>
                        <select
                          value={tourFormData.targetClass}
                          onChange={(e) => setTourFormData({ ...tourFormData, targetClass: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50/50"
                        >
                          <option value="Creche & Toddler">Creche & Toddler (3m - 2y)</option>
                          <option value="Nursery 1 - 3">Montessori Nursery (2 - 5y)</option>
                          <option value="Basic 1 - 5">Basic Primary (Basic 1 - 5)</option>
                          <option value="JSS 1 (Secondary)">JSS 1 (Junior Secondary)</option>
                          <option value="JSS 2 - 3 (Transfer)">JSS 2 - 3 (Transfer)</option>
                          <option value="SSS 1 (Senior Secondary)">SSS 1 (Senior Secondary)</option>
                          <option value="SSS 2 (Transfer)">SSS 2 (Transfer)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">Preferred Tour Date</label>
                        <input
                          type="date"
                          value={tourFormData.visitDate}
                          onChange={(e) => setTourFormData({ ...tourFormData, visitDate: e.target.value })}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-800 focus:outline-none bg-slate-50/50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full font-bold text-xs sm:text-sm bg-primary-800 hover:bg-primary-900 text-white py-2.5 sm:py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 mt-2"
                    >
                      <span>Submit Inquiry &amp; Request Callback</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
