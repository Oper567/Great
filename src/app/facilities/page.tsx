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
      <section className="relative bg-primary-950 text-white py-8 sm:py-14 overflow-hidden border-b border-primary-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/science-lab.jpg"
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
            <span className="text-secondary-400 font-semibold">Campus &amp; Facilities</span>
          </nav>
          <div className="max-w-3xl space-y-3 reveal-init reveal-fade-up delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2px] bg-secondary-400" />
              <span className="text-[11px] sm:text-xs font-extrabold text-secondary-400 uppercase tracking-widest">
                Infrastructure &amp; Campus Life
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Modern Campus &amp; Learning Facilities
            </h1>
            <p className="text-slate-200 text-xs sm:text-base leading-relaxed max-w-2xl">
              Engineered to inspire curiosity and provide a secure, conducive atmosphere where learners thrive intellectually, physically, and socially.
            </p>
            <Link
              href="/admissions#tour"
              className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-4 py-2.5 rounded-lg transition shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>Book a Physical Campus Tour</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CAMPUS BUILDING SHOWCASE SLIDER */}
      <SchoolBuildingSlider />

      {/* FACILITIES GRID — Compact Cards & Professional Margin Spacing */}
      <section className="py-7 sm:py-12 lg:py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-5 sm:space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {/* Modern ICT Center */}
            <div className="editorial-card rounded-xl overflow-hidden group reveal-init reveal-fade-up delay-100 flex flex-col justify-between">
              <div>
                <div className="relative h-56 sm:h-64 lg:h-72 w-full overflow-hidden">
                  <Image
                    src="/assets/images/ict-lab.jpg"
                    alt="Great-Favour Montessori School Modern ICT Center"
                    fill
                    className="object-cover editorial-img-zoom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2 left-2.5 text-[10px] font-bold text-white bg-primary-950/90 px-2 py-0.5 rounded">
                    Computer Studies
                  </span>
                </div>
                <div className="p-3.5 sm:p-4 space-y-1.5">
                  <h3 className="font-bold text-sm sm:text-base text-primary-950 leading-snug">
                    Modern ICT Center
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                    Equipped with computer workstations, typing suites, and digital literacy tools for practical computer education and CBT exams.
                  </p>
                </div>
              </div>
              <div className="px-3.5 pb-3 sm:px-4 sm:pb-4 pt-1 flex items-center gap-2 text-[10px] text-slate-500 font-medium border-t border-slate-100">
                <span>&bull; Computer Literacy</span>
                <span>&bull; Typing</span>
                <span>&bull; CBT Center</span>
              </div>
            </div>

            {/* Science Labs */}
            <div className="editorial-card rounded-xl overflow-hidden group reveal-init reveal-fade-up delay-200 flex flex-col justify-between">
              <div>
                <div className="relative h-56 sm:h-64 lg:h-72 w-full overflow-hidden">
                  <Image
                    src="/assets/images/science-lab.jpg"
                    alt="Great-Favour Montessori School Advanced Science Laboratories"
                    fill
                    className="object-cover editorial-img-zoom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2 left-2.5 text-[10px] font-bold text-white bg-accent-green-800/90 px-2 py-0.5 rounded">
                    Practical Science
                  </span>
                </div>
                <div className="p-3.5 sm:p-4 space-y-1.5">
                  <h3 className="font-bold text-sm sm:text-base text-primary-950 leading-snug">
                    Comprehensive Laboratories
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                    Dedicated laboratories for Physics, Chemistry, and Biology with certified safety apparatus, microscopes, and reagents.
                  </p>
                </div>
              </div>
              <div className="px-3.5 pb-3 sm:px-4 sm:pb-4 pt-1 flex items-center gap-2 text-[10px] text-slate-500 font-medium border-t border-slate-100">
                <span>&bull; Titration Benches</span>
                <span>&bull; Microscopes</span>
                <span>&bull; Safety Gear</span>
              </div>
            </div>

            {/* Eco-Friendly Learning Environment */}
            <div className="editorial-card rounded-xl overflow-hidden group reveal-init reveal-fade-up delay-300 flex flex-col justify-between">
              <div>
                <div className="relative h-56 sm:h-64 lg:h-72 w-full overflow-hidden">
                  <Image
                    src="/assets/images/classroom.jpg"
                    alt="Great-Favour Montessori School Eco-Friendly Learning Environment"
                    fill
                    className="object-cover object-center editorial-img-zoom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2 left-2.5 text-[10px] font-bold text-white bg-accent-green-800/90 px-2 py-0.5 rounded">
                    Eco-Friendly Atmosphere
                  </span>
                </div>
                <div className="p-3.5 sm:p-4 space-y-1.5">
                  <h3 className="font-bold text-sm sm:text-base text-primary-950 leading-snug">
                    Eco-Friendly Classrooms
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                    Naturally ventilated, serene, and sunlit learning spaces designed to nurture calm focus and collaborative discovery.
                  </p>
                </div>
              </div>
              <div className="px-3.5 pb-3 sm:px-4 sm:pb-4 pt-1 flex items-center gap-2 text-[10px] text-slate-500 font-medium border-t border-slate-100">
                <span>&bull; Natural Ventilation</span>
                <span>&bull; 15:1 Ratio</span>
                <span>&bull; Sunlit Wings</span>
              </div>
            </div>

            {/* Montessori Studio */}
            <div className="editorial-card rounded-xl p-3.5 sm:p-4 space-y-2 reveal-init reveal-fade-up delay-150 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-secondary-100 text-secondary-800 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-primary-950 leading-snug">
                  Montessori Sensorial Studio
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Equipped with authentic Maria Montessori tactile apparatus, pink towers, cylinder blocks, and practical life stations.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-primary-800 block pt-2 border-t border-slate-100">
                For Early Learners &bull; Fine Motor Mastery
              </span>
            </div>

            {/* Health Bay */}
            <div className="editorial-card rounded-xl p-3.5 sm:p-4 space-y-2 reveal-init reveal-fade-up delay-250 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-accent-green-100 text-accent-green-800 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-primary-950 leading-snug">
                  Sick Bay &amp; First Aid Station
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dedicated school first-aid bay staffed during school hours for wellness checks, minor care, and pupil health support.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-accent-green-700 block pt-2 border-t border-slate-100">
                First Aid &amp; Student Wellness
              </span>
            </div>

            {/* School Sports & Playground */}
            <div className="editorial-card rounded-xl p-3.5 sm:p-4 space-y-2 reveal-init reveal-fade-up delay-350 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-secondary-100 text-secondary-800 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-primary-950 leading-snug">
                  School Sports &amp; Playground
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Open campus grounds for Physical Health Education (PHE), football matches, athletics practice, and supervised recreation.
                </p>
              </div>
              <span className="text-[10px] font-semibold text-primary-800 block pt-2 border-t border-slate-100">
                Outdoor Fitness &amp; Sportsmanship
              </span>
            </div>
          </div>

          {/* Campus Tour CTA — Compact */}
          <div className="bg-primary-950 text-white rounded-2xl p-5 sm:p-8 text-center space-y-3 border border-primary-900 reveal-init reveal-zoom-in delay-200">
            <h3 className="text-base sm:text-2xl font-extrabold">
              See Our Campus in Person
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto">
              Schedule a physical campus tour and let your child explore their future learning environment.
            </p>
            <Link
              href="/admissions#tour"
              className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-950 bg-secondary-400 hover:bg-secondary-300 px-5 py-2.5 rounded-lg transition shadow-md"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Your Campus Tour</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
