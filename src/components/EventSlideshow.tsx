"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface EventSlide {
  id: string;
  image: string;
  title: string;
  date: string;
  description: string;
  tag: string;
}

const EVENT_SLIDES: EventSlide[] = [
  {
    id: "evt-1",
    image: "/assets/images/assembly-sports.jpg",
    title: "Morning Assembly & Sports Parade",
    date: "Weekly Sessions • 2026/2027",
    description:
      "Scholars assemble on the school field for morning devotion, physical fitness exercises, and the Principal's address.",
    tag: "Assembly & Discipline",
  },
  {
    id: "evt-2",
    image: "/assets/images/interhouse-sports.jpg",
    title: "Annual Inter-House Athletics & Sports Gala",
    date: "November 2026 • Main Athletics Field",
    description:
      "Track and field competitions, march-past drills, relay races, and medal presentations across all school houses.",
    tag: "Sports & Athletics",
  },
  {
    id: "evt-3",
    image: "/assets/images/classroom-study.jpg",
    title: "Continuous Assessment & Practical Study Clinics",
    date: "Termly Curriculum Focus",
    description:
      "Focused classroom study, practical subject sessions, and structured continuous assessment preparation under dedicated mentors.",
    tag: "Academic Excellence",
  },
  {
    id: "evt-4",
    image: "/assets/images/campus-courtyard.jpg",
    title: "Secondary School Orientation & Leadership Forum",
    date: "First Term Academic Session",
    description:
      "Junior and Senior Secondary students gather at the central academic quadrangle for prefect orientation and academic goal-setting.",
    tag: "Student Leadership",
  },
  {
    id: "evt-5",
    image: "/assets/images/assembly-red.jpg",
    title: "General School Fellowship & Moral Poise Day",
    date: "Monthly Character Seminar",
    description:
      "Cultivating honesty, public speaking confidence, mutual respect, and civic responsibility across Primary and Secondary arms.",
    tag: "Character Formation",
  },
  {
    id: "evt-6",
    image: "/assets/images/classroom.jpg",
    title: "Montessori & Collaborative Classroom Discovery",
    date: "Daily Learning Routine",
    description:
      "Naturally ventilated, sunlit classrooms designed for active teacher-pupil engagement and hands-on learning.",
    tag: "Classroom Life",
  },
];

export default function EventSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide((index + EVENT_SLIDES.length) % EVENT_SLIDES.length);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 5500);
    return () => clearInterval(timer);
  }, [nextSlide, isPaused]);

  const active = EVENT_SLIDES[currentSlide];

  return (
    <section className="py-12 sm:py-16 lg:py-24 bg-slate-50 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 reveal-init reveal-fade-up">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-0.5 bg-secondary-500" />
              <span className="section-badge">Campus Life &amp; Tradition</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary-950 tracking-tight">
              Life Inside Great-Favour Montessori
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Beyond classroom instruction, our pupils participate in structured athletics, leadership assemblies, and collaborative study clinics throughout the academic year.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 self-start md:self-end shrink-0">
            <span className="text-xs font-semibold text-slate-500 mr-2 tabular-nums">
              {String(currentSlide + 1).padStart(2, "0")} / {String(EVENT_SLIDES.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous campus highlight"
              className="w-10 h-10 rounded-lg bg-white border border-slate-200 hover:border-primary-800 text-slate-800 flex items-center justify-center transition shadow-2xs active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next campus highlight"
              className="w-10 h-10 rounded-lg bg-primary-900 hover:bg-primary-950 text-white flex items-center justify-center transition shadow-2xs active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editorial Split Showcase: Featured Image + Interactive Event Selector Cards */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Featured Stage (Left 8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden flex flex-col justify-between reveal-init reveal-fade-left delay-100">
            <div className="relative h-64 sm:h-96 lg:h-[420px] w-full bg-slate-900 overflow-hidden">
              {EVENT_SLIDES.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-all duration-700 ease-out ${
                    index === currentSlide
                      ? "opacity-100 scale-100 z-10"
                      : "opacity-0 scale-[1.03] z-0 pointer-events-none"
                  }`}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
                </div>
              ))}

              <div className="absolute top-4 left-4 z-20">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-primary-950/90 text-secondary-400 text-xs font-bold uppercase tracking-wider border border-white/15">
                  {active.tag}
                </span>
              </div>
            </div>

            {/* Readable Editorial Caption Panel (Full clarity on Mobile & Desktop) */}
            <div className="p-5 sm:p-6 lg:p-7 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary-800">
                  <Calendar className="w-3.5 h-3.5 text-secondary-600 shrink-0" />
                  <span>{active.date}</span>
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-primary-950 leading-snug">
                  {active.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {active.description}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Event List Cards (4 cols on desktop, clean 1-col/2-col on mobile) */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 content-between reveal-init reveal-fade-right delay-200">
            {EVENT_SLIDES.map((slide, idx) => {
              const isSelected = idx === currentSlide;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-3.5 ${
                    isSelected
                      ? "bg-primary-950 text-white border-primary-900 shadow-sm"
                      : "bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200"
                  }`}
                >
                  <span
                    className={`text-xs font-extrabold px-2 py-1 rounded shrink-0 tabular-nums mt-0.5 ${
                      isSelected
                        ? "bg-secondary-400 text-slate-950"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-wider truncate ${
                        isSelected ? "text-secondary-400" : "text-slate-500"
                      }`}
                    >
                      {slide.tag}
                    </p>
                    <h4
                      className={`text-sm font-bold leading-snug line-clamp-1 mt-0.5 ${
                        isSelected ? "text-white" : "text-primary-950"
                      }`}
                    >
                      {slide.title}
                    </h4>
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
