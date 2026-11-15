"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Quote,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Star,
} from "lucide-react";

export interface ParentCompliment {
  id: string;
  quote: string;
  name: string;
  ward: string;
  tenure: string;
  highlight: string;
}

const PARENT_COMPLIMENTS: readonly ParentCompliment[] = [
  {
    id: "comp-1",
    quote:
      "Enrolling my three children at Great-Favour Montessori School was the best decision for our family. My youngest in Nursery 2 reads fluently with Jolly Phonics, while my eldest in SS 2 excels in Physics and Chemistry.",
    name: "Engr. & Mrs. Chukwuma Nwosu",
    ward: "Parents of 3 Scholars (Nursery 2, Basic 4 & SS 2)",
    tenure: "GFMS Family Since 2021",
    highlight: "Early Phonics & STEM Progression",
  },
  {
    id: "comp-2",
    quote:
      "The online scratch card result portal and CBT testing center show how forward-thinking the school is. Even more impressive is the moral discipline, neatness, and confidence the teachers instill in every child.",
    name: "Dr. (Mrs.) Adesuwa Obaseki",
    ward: "Parent of JSS 3 Scholar",
    tenure: "BECE Distinction Parent",
    highlight: "Discipline & Digital Readiness",
  },
  {
    id: "comp-3",
    quote:
      "My daughter joined Playgroup shy and hesitant, and within one academic session her vocabulary, handwriting, and social confidence transformed. The Montessori teachers genuinely know and care for each pupil.",
    name: "Mrs. Ngozi Okonkwo",
    ward: "Parent of Montessori Nursery 1 Pupil",
    tenure: "Early Years Family",
    highlight: "Montessori Early Foundation",
  },
  {
    id: "comp-4",
    quote:
      "Between well-organized school bus pickups in Issele-Azagba and attentive gate security, we have complete peace of mind every morning. Our son looks forward to school and speaks proudly of his teachers.",
    name: "Mr. & Mrs. Emeka Onyeka",
    ward: "Parents of Basic 5 Scholar",
    tenure: "Primary Wing Parents",
    highlight: "Campus Safety & Pupil Welfare",
  },
  {
    id: "comp-5",
    quote:
      "Consistent practical sessions in Biology and Chemistry along with focused WAEC and UTME CBT drills prepared our daughter thoroughly for Senior Secondary examinations without relying on outside cram lessons.",
    name: "Chief & Lolo Gabriel Nwachukwu",
    ward: "Parents of SS 3 Science Graduate",
    tenure: "WAEC & UTME Alumna Parent",
    highlight: "Senior Secondary Exam Mastery",
  },
];

const SLIDE_INTERVAL_MS = 6500;

export default function ParentComplimentsSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = PARENT_COMPLIMENTS.length;

  const goTo = useCallback(
    (idx: number) => {
      setActiveIndex((idx + total) % total);
    },
    [total]
  );

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (delta > 45) nextSlide();
    if (delta < -45) prevSlide();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const activeCompliment = PARENT_COMPLIMENTS[activeIndex];

  return (
    <section
      id="parent-compliments"
      aria-label="Parents Compliments Carousel"
      className="py-8 sm:py-14 lg:py-18 bg-white border-b border-slate-200 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-5 sm:space-y-9">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 reveal-init reveal-fade-up delay-100">
          <div className="space-y-1.5 sm:space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-0.5 bg-secondary-500" />
              <span className="section-badge">Parent Community</span>
            </div>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-primary-950 tracking-tight">
              Trusted by Families Across Delta State
            </h2>
            <p className="text-slate-600 text-xs sm:text-base leading-relaxed">
              Hear directly from parents and guardians whose children learn and grow at Great-Favour Montessori School.
            </p>
          </div>

          <Link
            href="/admissions#tour"
            className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg bg-primary-900 hover:bg-primary-950 text-white text-xs sm:text-sm font-bold transition self-start md:self-end shrink-0"
          >
            <Calendar className="w-4 h-4 text-secondary-400" />
            <span>Book a Campus Tour</span>
          </Link>
        </div>

        {/* Sliding Compliments Layout */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Parent testimonials"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch"
        >
          {/* Featured Sliding Quote Card */}
          <div className="lg:col-span-7 editorial-card rounded-2xl p-4 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-white via-white to-slate-50/90 border border-slate-200 shadow-card select-none min-w-0">
            <div className="space-y-4 sm:space-y-5">
              {/* Top Row: Quote Badge, Star Rating & Counter */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-secondary-50 border border-secondary-200 text-secondary-700 flex items-center justify-center shrink-0">
                    <Quote className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-0.5 text-secondary-500" aria-label="5 out of 5 rating">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-secondary-400 text-secondary-500" />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-primary-800 block truncate mt-0.5">
                      {activeCompliment.highlight}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-900 text-[11px] font-extrabold tabular-nums shrink-0">
                  {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
              </div>

              {/* Quote Copy */}
              <blockquote
                key={activeCompliment.id}
                className="text-slate-700 text-sm sm:text-lg leading-relaxed font-medium min-h-[108px] sm:min-h-[120px] flex items-center"
              >
                &ldquo;{activeCompliment.quote}&rdquo;
              </blockquote>
            </div>

            {/* Parent Meta + Controls */}
            <div className="pt-4 mt-5 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <strong className="text-sm sm:text-base font-extrabold text-primary-950 block truncate">
                    {activeCompliment.name}
                  </strong>
                  <span className="text-xs text-slate-600 font-medium block truncate">
                    {activeCompliment.ward}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent-green-800 bg-accent-green-50 border border-accent-green-100 px-2.5 py-1 rounded-md self-start sm:self-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-green-700 shrink-0" />
                  <span>{activeCompliment.tenure}</span>
                </span>
              </div>

              {/* Carousel Navigation Bar */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Select parent compliment">
                  {PARENT_COMPLIMENTS.map((item, idx) => {
                    const isCurrent = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={isCurrent}
                        aria-label={`View compliment ${idx + 1} from ${item.name}`}
                        onClick={() => goTo(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCurrent
                            ? "w-7 bg-primary-900"
                            : "w-2 bg-slate-300 hover:bg-primary-400"
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={prevSlide}
                    aria-label="Previous parent compliment"
                    className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-primary-950 flex items-center justify-center transition shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    aria-label="Next parent compliment"
                    className="w-9 h-9 rounded-lg bg-primary-900 hover:bg-primary-950 text-white flex items-center justify-center transition shadow-2xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Interactive 5-Parent Index (Desktop / Tablet) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col gap-2.5 justify-between min-w-0">
            {PARENT_COMPLIMENTS.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3 min-w-0 ${
                    isSelected
                      ? "bg-primary-950 text-white border-primary-900 shadow-sm"
                      : "bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                >
                  <span
                    className={`text-xs font-extrabold px-2 py-1 rounded shrink-0 tabular-nums mt-0.5 ${
                      isSelected
                        ? "bg-secondary-400 text-slate-950"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs font-extrabold truncate ${
                          isSelected ? "text-white" : "text-primary-950"
                        }`}
                      >
                        {item.name}
                      </p>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          isSelected ? "text-secondary-400" : "text-primary-700"
                        }`}
                      >
                        {item.highlight.split(" ")[0]}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] line-clamp-1 mt-0.5 ${
                        isSelected ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {item.ward}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
