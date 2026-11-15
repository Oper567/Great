"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Play,
  Pause,
  MapPin,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export interface BuildingSlide {
  id: string;
  image: string;
  title: string;
  badge: string;
  caption: string;
  highlights: string[];
}

export const BUILDING_SLIDES: BuildingSlide[] = [
  {
    id: "compound-1",
    image: "/assets/school-compound/main-academic-block.webp",
    title: "Main Academic Block & Frontage",
    badge: "Official Facade",
    caption:
      "The distinguished front elevation of Great-Favour Montessori School, showcasing spacious covered verandas, sunlit corridors, and secure student entryways.",
    highlights: ["Shaded Verandas", "Signposted Main Wing", "Direct Courtyard Access"],
  },
  {
    id: "compound-2",
    image: "/assets/school-compound/campus-lawns.webp",
    title: "Expansive Campus Lawns & Sports Ground",
    badge: "Athletics & Grounds",
    caption:
      "A panoramic perspective over the green field fronting our academic blocks — providing open recreational space for morning drills, football, and athletics.",
    highlights: ["Lush Green Lawns", "Spacious Athletics Ground", "Serene Atmosphere"],
  },
  {
    id: "compound-3",
    image: "/assets/school-compound/central-quadrangle.webp",
    title: "Central Quadrangle & Interconnected Wings",
    badge: "Campus Architecture",
    caption:
      "Architectural view capturing our single-storey layout and high-pitched emerald green roofing designed to maintain cool indoor temperatures throughout the school day.",
    highlights: ["High-Pitch Roofing", "Natural Cross-Breeze", "Interconnected Blocks"],
  },
  {
    id: "compound-4",
    image: "/assets/school-compound/covered-corridors.webp",
    title: "Eco-Friendly Classrooms & Covered Corridors",
    badge: "Classroom Wings",
    caption:
      "Continuous sheltered walkways connecting primary and secondary wings, surrounded by landscaped curbs and quiet grounds that foster academic concentration.",
    highlights: ["Covered Walkways", "Dedicated Classrooms", "Safe Perimeter"],
  },
  {
    id: "compound-5",
    image: "/assets/school-compound/compound-panorama.webp",
    title: "Full Compound Panorama & Assembly Grounds",
    badge: "Issele-Azagba Campus",
    caption:
      "Wide-angle vista of the GFMS educational complex in Delta State, purpose-built to provide a secure, inspiring environment for scholarly achievement.",
    highlights: ["Purpose-Built Campus", "Issele-Azagba, Delta State", "Secure Compound"],
  },
];

export default function SchoolBuildingSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const SLIDE_DURATION = 5500;

  const goToSlide = useCallback(
    (idx: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex((idx + BUILDING_SLIDES.length) % BUILDING_SLIDES.length);
      setTimeout(() => setIsTransitioning(false), 500);
    },
    [isTransitioning]
  );

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  useEffect(() => {
    if (isPaused || lightboxOpen) return;
    const interval = setInterval(() => {
      nextSlide();
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [isPaused, lightboxOpen, nextSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "Escape" && lightboxOpen) setLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, lightboxOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diffX = touchStartX.current - touchEndX.current;
    if (diffX > 45) {
      nextSlide();
    } else if (diffX < -45) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const activeSlide = BUILDING_SLIDES[currentIndex];

  return (
    <section
      id="school-building-showcase"
      className="py-10 sm:py-16 lg:py-24 bg-slate-900 text-white border-b border-slate-800"
      aria-label="Campus Architecture and Grounds"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-5 sm:space-y-8">
        {/* SECTION HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 reveal-init reveal-fade-up">
          <div className="space-y-1.5 sm:space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-0.5 bg-secondary-400" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-secondary-400">
                Campus Infrastructure
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Our Purpose-Built Campus in Issele-Azagba
            </h2>
            <p className="text-slate-300 text-xs sm:text-base leading-relaxed">
              Explore the permanent campus of Great-Favour Montessori School, featuring naturally ventilated classroom blocks, covered walkways, and expansive athletics grounds.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-end">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-secondary-400" />
              <span>Aniocha North, Delta State</span>
            </div>
            <Link
              href="/admissions#tour"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary-400 hover:bg-secondary-300 text-slate-950 font-bold text-xs transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule a Visit</span>
            </Link>
          </div>
        </div>

        {/* SLIDER MAIN CONTAINER */}
        <div
          className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden select-none reveal-init reveal-zoom-in delay-150"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Visual Image Stage */}
          <div className="relative w-full h-64 sm:h-96 md:h-[480px] lg:h-[560px] overflow-hidden bg-slate-950">
            {BUILDING_SLIDES.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  idx === currentIndex
                    ? "opacity-100 scale-100 z-10"
                    : "opacity-0 scale-[1.03] pointer-events-none z-0"
                }`}
              >
                <Image
                  src={slide.image}
                  alt=""
                  aria-hidden="true"
                  fill
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
                  className="object-cover object-center"
                />
                <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
              </div>
            ))}

            {/* Top Overlay Controls */}
            <div className="absolute top-3 inset-x-3 sm:top-5 sm:inset-x-5 z-20 flex items-center justify-between">
              <span className="px-3 py-1 rounded bg-slate-950/85 text-secondary-400 text-xs font-bold uppercase tracking-wider border border-white/15">
                {activeSlide.badge}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaused((prev) => !prev)}
                  aria-label={isPaused ? "Play Slideshow" : "Pause Slideshow"}
                  className="w-9 h-9 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-white border border-white/15 flex items-center justify-center transition"
                >
                  {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label="View Fullscreen Photo"
                  className="w-9 h-9 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-white border border-white/15 flex items-center justify-center transition"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Desktop Overlay Caption */}
            <div className="hidden md:block absolute bottom-0 inset-x-0 z-20 p-6 lg:p-8">
              <div className="max-w-3xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-secondary-400">
                  <span>
                    {String(currentIndex + 1).padStart(2, "0")} / {String(BUILDING_SLIDES.length).padStart(2, "0")}
                  </span>
                  <span>&bull;</span>
                  <span>{activeSlide.badge}</span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                  {activeSlide.title}
                </h3>
                <p className="text-slate-200 text-sm leading-relaxed max-w-2xl">
                  {activeSlide.caption}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {activeSlide.highlights.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-slate-900/90 px-3 py-1 rounded border border-slate-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Dedicated Editorial Caption Card (Compact on Mobile) */}
          <div className="md:hidden p-3.5 bg-slate-950 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-secondary-400 font-bold">
              <span>{activeSlide.badge}</span>
              <span className="tabular-nums text-slate-400">
                {String(currentIndex + 1).padStart(2, "0")} / {String(BUILDING_SLIDES.length).padStart(2, "0")}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white leading-snug">
              {activeSlide.title}
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">
              {activeSlide.caption}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {activeSlide.highlights.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                >
                  <CheckCircle2 className="w-3 h-3 text-secondary-400 shrink-0" />
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Thumbnail Selector Bar */}
          <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto no-scrollbar">
            {BUILDING_SLIDES.map((slide, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className={`relative shrink-0 rounded-lg overflow-hidden transition-all w-16 h-12 sm:w-20 sm:h-14 border-2 ${
                    isActive
                      ? "border-secondary-400 opacity-100"
                      : "border-transparent opacity-55 hover:opacity-90"
                  }`}
                  aria-label={`View campus perspective ${idx + 1}: ${slide.title}`}
                >
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    loading="lazy"
                    decoding="async"
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="flex items-center justify-between z-20 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-xs text-secondary-400 font-bold uppercase tracking-wider block">
                Campus View &bull; {currentIndex + 1} of {BUILDING_SLIDES.length}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                {activeSlide.title}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition border border-white/20"
              aria-label="Close fullscreen view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="relative flex-1 w-full max-w-6xl mx-auto my-4 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full max-h-[75vh] flex items-center justify-center">
              <Image
                src={activeSlide.image}
                alt={activeSlide.title}
                fill
                priority
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div
            className="text-center max-w-2xl mx-auto space-y-1 text-slate-300 text-sm z-20 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p>{activeSlide.caption}</p>
          </div>
        </div>
      )}
    </section>
  );
}
