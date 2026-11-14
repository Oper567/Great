"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import SchoolBuildingSlider from "@/components/SchoolBuildingSlider";
import {
  Calendar,
  Sparkles,
  Activity,
  Trophy,
  ChevronRight,
} from "lucide-react";

export default function FacilitiesPage() {
  return (
    <>
      {/* EDITORIAL PAGE HERO BANNER */}
      <section className="relative bg-primary-950 text-white py-14 sm:py-20 overflow-hidden border-b border-primary-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/science-lab.jpg"
            alt="Great-Favour Montessori School Science and ICT Facilities"
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
            <span className="text-secondary-400 font-semibold">Campus &amp; Facilities</span>
          </nav>
          <div className="max-w-3xl space-y-4 reveal-init reveal-fade-up delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2px] bg-secondary-400" />
              <span className="text-xs font-extrabold text-secondary-400 uppercase tracking-widest">
                Infrastructure &amp; Campus Life
              </span>
            </div>
            <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Modern Campus &amp; Learning Facilities
            </h1>
            <p className="text-slate-200 text-sm sm:text-lg leading-relaxed max-w-2xl">
              Engineered to inspire curiosity and provide a secure, conducive atmosphere where learners thrive intellectually, physically, and socially.
            </p>
            <Link
              href="/admissions#tour"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-5 py-3 rounded-lg transition shadow-md"
            >
              <Calendar className="w-4 h-4" />
              <span>Book a Physical Campus Tour</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CAMPUS BUILDING SHOWCASE SLIDER */}
      <SchoolBuildingSlider />

      {/* FACILITIES GRID */}
      <section className="py-10 sm:py-16 lg:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Modern ICT Center */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group reveal-init reveal-fade-up delay-100 flex flex-col justify-between">
              <div>
                <div className="relative h-44 sm:h-52 w-full overflow-hidden">
                  <Image
                    src="/assets/images/ict-lab.jpg"
                    alt="Great-Favour Montessori School Modern ICT Center"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 text-[11px] font-bold text-white bg-primary-900/80 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    Computer Studies
                  </span>
                </div>
                <div className="p-4 sm:p-5 space-y-2">
                  <h3 className="font-bold text-base sm:text-lg text-primary-950 leading-snug">Modern ICT Center</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Equipped with computer workstations, typing master suites, and digital literacy tools for practical computer education and online CBT exams.
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 font-medium">
                <span>&bull; Computer Literacy</span>
                <span>&bull; Typing Mastery</span>
                <span>&bull; CBT Center</span>
              </div>
            </div>

            {/* Science Labs */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group reveal-init reveal-fade-up delay-250 flex flex-col justify-between">
              <div>
                <div className="relative h-44 sm:h-52 w-full overflow-hidden">
                  <Image
                    src="/assets/images/science-lab.jpg"
                    alt="Great-Favour Montessori School Advanced Science Laboratories"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 text-[11px] font-bold text-white bg-accent-green-800/80 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    Practical Science
                  </span>
                </div>
                <div className="p-4 sm:p-5 space-y-2">
                  <h3 className="font-bold text-base sm:text-lg text-primary-950 leading-snug">Comprehensive Laboratories</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Laboratories for Physics, Chemistry, and Biology with certified safety apparatus, microscopes, and chemicals.
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 font-medium">
                <span>&bull; Titration Benches</span>
                <span>&bull; Fume Hoods</span>
                <span>&bull; Safety Gear</span>
              </div>
            </div>

            {/* Eco-Friendly Learning Environment */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group reveal-init reveal-fade-up delay-400 flex flex-col justify-between">
              <div>
                <div className="relative h-44 sm:h-52 w-full overflow-hidden">
                  <Image
                    src="/assets/images/classroom.jpg"
                    alt="Great-Favour Montessori School Eco-Friendly Learning Environment"
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 text-[11px] font-bold text-white bg-accent-green-800/90 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    Eco-Friendly Atmosphere
                  </span>
                </div>
                <div className="p-4 sm:p-5 space-y-2">
                  <h3 className="font-bold text-base sm:text-lg text-primary-950 leading-snug">Eco-Friendly Learning Environment</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Naturally ventilated, serene, and sunlit learning spaces designed to nurture calm focus, active teacher-pupil engagement, and collaborative academic discovery.
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 font-medium">
                <span>&bull; Natural Ventilation</span>
                <span>&bull; 15:1 Ratio</span>
                <span>&bull; Inspiring Spaces</span>
              </div>
            </div>

            {/* Montessori Studio */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2.5 reveal-init reveal-fade-up delay-200 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-secondary-100 text-secondary-800 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-primary-950 leading-snug">Montessori Sensorial Studio</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Custom-designed with authentic Maria Montessori tactile apparatus, pink towers, cylinder blocks, and practical stations.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-primary-800 block pt-1 border-t border-slate-100">
                For Early Learners &bull; Fine Motor Mastery
              </span>
            </div>

            {/* Health Bay */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2.5 reveal-init reveal-fade-up delay-350 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-accent-green-100 text-accent-green-800 flex items-center justify-center shadow-sm">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-primary-950 leading-snug">Sick Bay &amp; First Aid Station</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Dedicated school first-aid bay staffed during school hours for wellness checks, minor care, and student health support.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-accent-green-700 block pt-1 border-t border-slate-100">
                First Aid &amp; Health Support
              </span>
            </div>

            {/* School Sports & Playground */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-2.5 reveal-init reveal-fade-up delay-500 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-secondary-100 text-secondary-800 flex items-center justify-center shadow-sm">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-primary-950 leading-snug">School Sports &amp; Playground</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Open campus grounds for Physical Health Education (PHE), football matches, athletics practice, and supervised outdoor recreation.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-primary-800 block pt-1 border-t border-slate-100">
                Outdoor Fitness &amp; Sportsmanship
              </span>
            </div>
          </div>

          {/* Campus Tour CTA */}
          <div className="bg-gradient-to-r from-primary-950 to-slate-950 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center space-y-4 reveal-init reveal-zoom-in delay-200">
            <h3 className="text-lg sm:text-3xl font-extrabold">
              See Our Campus in Person
            </h3>
            <p className="text-slate-300 text-xs sm:text-base max-w-xl mx-auto">
              Nothing compares to experiencing our facilities firsthand. Schedule a physical campus tour and let your child explore their future learning environment.
            </p>
            <Link
              href="/admissions#tour"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl transition shadow-lg active:scale-95"
            >
              <Calendar className="w-5 h-5" />
              <span>Schedule Your Campus Tour</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
