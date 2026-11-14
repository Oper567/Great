"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  INSTITUTIONAL_ACCREDITATION,
  SCHOOL_BRAND,
} from "@/constants/school";
import EventSlideshow from "@/components/EventSlideshow";
import DigitalCampusGateway from "@/components/DigitalCampusGateway";
import {
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  BookOpen,
  FlaskConical,
  HeartHandshake,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Award,
  Quote,
  ShieldCheck,
} from "lucide-react";

const HERO_SLIDES = [
  {
    id: "hero-1",
    tabLabel: "Campus & Heritage",
    eyebrow: "Established September 2014 • Issele-Azagba, Delta State",
    title: "Raising Honest, Confident Leaders for Tomorrow's World",
    description:
      "A licensed, full-spectrum educational institution delivering authentic Montessori early learning, rigorous Basic Primary foundations, and accredited Junior & Senior Secondary education.",
    image: "/assets/school%20cmmpound/DSC_1797@1053034621.JPG",
    imageAlt: "Great-Favour Montessori School Main Academic Block",
  },
  {
    id: "hero-2",
    tabLabel: "Academic Distinction",
    eyebrow: "Government Approved • FLSC, BECE, WASSCE & NECO",
    title: "Unbroken Continuity from Early Discovery to University Readiness",
    description:
      "Small class sizes (15:1 ratio), dedicated science and ICT laboratories, and TRCN-certified educators preparing scholars for national and international excellence.",
    image: "/assets/images/classroom-study.jpg",
    imageAlt: "Scholars in Classroom Study Session at Great-Favour Montessori School",
  },
  {
    id: "hero-3",
    tabLabel: "Character & Campus Life",
    eyebrow: "Motto: Education — The Best Legacy",
    title: "Where Academic Rigor Meets Moral Poise and Discipline",
    description:
      "Set within a serene, purpose-built compound featuring ventilated classroom wings, expansive athletics fields, and a warm family community.",
    image: "/assets/images/assembly-sports.jpg",
    imageAlt: "Morning Assembly and Sports Parade at Great-Favour Montessori School",
  },
];

const ACADEMIC_DIVISIONS = [
  {
    id: "early-years",
    levelBadge: "Ages 3 Months – 5 Years",
    title: "Creche & Montessori Nursery",
    classes: "Creche • Playgroup • Nursery 1 – 3",
    image: "/assets/images/classroom.jpg",
    description:
      "Guided by Maria Montessori principles, young learners develop early literacy with Jolly Phonics, sensorial numeracy, practical life grace, and curiosity.",
    highlights: ["Sensorial & Tactile Apparatus", "Jolly Phonics & Early Numeracy"],
    href: "/academics",
    delay: "delay-100",
  },
  {
    id: "primary",
    levelBadge: "Ages 5 – 11 Years",
    title: "Basic Primary School",
    classes: "Basic 1 – Basic 6 • FLSC Accredited",
    image: "/assets/images/classroom-study.jpg",
    description:
      "Blends the Nigerian National Curriculum with global elementary standards in quantitative reasoning, verbal aptitude, basic science, and computer literacy.",
    highlights: ["Quantitative & Verbal Mastery", "Weekly ICT & Practical Science"],
    href: "/academics",
    delay: "delay-200",
  },
  {
    id: "junior-secondary",
    levelBadge: "Ages 10 – 13 Years",
    title: "Junior Secondary School",
    classes: "JSS 1 – JSS 3 • BECE Accredited",
    image: "/assets/images/campus-courtyard.jpg",
    description:
      "Bridges elementary foundations with intermediate sciences, technology, humanities, business studies, and computer-based assessment readiness for BECE.",
    highlights: ["Comprehensive JSS Subject Track", "BECE & CBT Exam Preparation"],
    href: "/academics",
    delay: "delay-300",
  },
  {
    id: "senior-secondary",
    levelBadge: "Ages 13 – 17 Years",
    title: "Senior Secondary School",
    classes: "SS 1 – SS 3 • WASSCE & NECO",
    image: "/assets/images/science-lab.jpg",
    description:
      "Specialized Science, Arts, and Commercial departments supported by equipped Physics, Chemistry, Biology, and ICT laboratories for WAEC, NECO, and UTME.",
    highlights: ["Science, Arts & Commercial Streams", "WAEC, NECO & UTME Clinics"],
    href: "/academics",
    delay: "delay-400",
  },
];

const CORE_PILLARS = [
  {
    title: "Authentic Montessori Foundation",
    subtitle: "Early Childhood Excellence",
    description:
      "Certified Montessori apparatus and child-centered discovery that build strong literacy, numeracy, and independent thinking from the earliest years.",
    footer: "Creche to Nursery 3",
    icon: BookOpen,
    delay: "delay-100",
  },
  {
    title: "Practical STEM & Digital Labs",
    subtitle: "Science & Computer Literacy",
    description:
      "Dedicated Physics, Chemistry, and Biology laboratories alongside a modern ICT and CBT testing center for hands-on experimentation.",
    footer: "Primary & Secondary Arms",
    icon: FlaskConical,
    delay: "delay-200",
  },
  {
    title: "Moral Character & Leadership",
    subtitle: "Raising Godly Leaders",
    description:
      "Intentional mentorship in honesty, public speaking, civic responsibility, and personal discipline so every graduate leads with integrity.",
    footer: "Daily Devotion & Mentoring",
    icon: HeartHandshake,
    delay: "delay-300",
  },
  {
    title: "Accredited Examination Success",
    subtitle: "100% Government Approved",
    description:
      "Structured continuous assessment (15 CA1 + 15 CA2 + 70 Exam) and intensive coaching for FLSC, BECE, WASSCE, and NECO examinations.",
    footer: "Proven Academic Track Record",
    icon: GraduationCap,
    delay: "delay-400",
  },
];

const PARENT_TESTIMONIALS = [
  {
    quote:
      "Enrolling my three children at Great-Favour Montessori School was the best decision for our family. My youngest in Nursery 2 reads fluently with Jolly Phonics, while my eldest in SS 2 excels in Physics and Chemistry.",
    name: "Engr. & Mrs. Chukwuma Nwosu",
    ward: "Parents of 3 Scholars (Nursery 2, Basic 4 & SS 2)",
    tenure: "GFMS Family Since 2021",
    delay: "delay-150",
  },
  {
    quote:
      "The online scratch card result portal and CBT testing center show how forward-thinking the school is. Even more impressive is the moral discipline, neatness, and confidence the teachers instill in every child.",
    name: "Dr. (Mrs.) Adesuwa Obaseki",
    ward: "Parent of JSS 3 Scholar",
    tenure: "BECE Distinction Parent",
    delay: "delay-300",
  },
];

export default function HomePage() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  const nextHero = useCallback(() => {
    setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevHero = useCallback(() => {
    setHeroIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    if (heroPaused) return;
    const timer = setInterval(nextHero, 6500);
    return () => clearInterval(timer);
  }, [nextHero, heroPaused]);

  const activeHero = HERO_SLIDES[heroIndex];

  return (
    <>
      {/* =====================================================================
          1. FULL-BLEED EDITORIAL HERO SLIDER (EMERALD SCHOOLS LAYOUT)
          ===================================================================== */}
      <section
        className="relative bg-primary-950 text-white overflow-hidden"
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
      >
        {/* Background Slides */}
        <div className="relative min-h-[410px] sm:min-h-[600px] lg:min-h-[660px] flex items-center">
          {HERO_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-1000 ease-out ${
                idx === heroIndex
                  ? "opacity-100 scale-100 z-10"
                  : "opacity-0 scale-105 z-0 pointer-events-none"
              }`}
            >
              <Image
                src={slide.image}
                alt=""
                aria-hidden="true"
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-cover object-center"
              />
              {/* Editorial High-Contrast Scrim */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-950/95 via-primary-950/80 to-primary-950/45" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-transparent to-primary-950/30" />
            </div>
          ))}

          {/* Hero Foreground Copy */}
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-20 lg:py-24 relative z-20 w-full">
            <div className="max-w-3xl space-y-3.5 sm:space-y-6 reveal-init reveal-fade-up delay-100">
              {/* Institutional Eyebrow */}
              <div className="inline-flex items-center gap-2 max-w-full bg-primary-900/90 border border-white/15 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondary-400">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary-400 shrink-0" />
                <span className="leading-snug break-words">{activeHero.eyebrow}</span>
              </div>

              {/* Authoritative Editorial Headline */}
              <h1
                key={`title-${activeHero.id}`}
                className="text-xl sm:text-4xl lg:text-5xl xl:text-[3.4rem] font-extrabold tracking-tight text-white leading-[1.16]"
              >
                {activeHero.title}
              </h1>

              {/* Subtitle */}
              <p
                key={`desc-${activeHero.id}`}
                className="text-xs sm:text-base lg:text-lg text-slate-200 leading-relaxed max-w-2xl line-clamp-3 sm:line-clamp-none"
              >
                {activeHero.description}
              </p>

              {/* Primary Institutional CTAs (Admission, Result Checker & Staff Login) */}
              <div className="pt-1 sm:pt-2 space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
                <Link
                  href="/admissions"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3.5 rounded-lg text-xs sm:text-sm font-bold text-slate-950 bg-secondary-400 hover:bg-secondary-300 transition-colors shadow-sm"
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>Apply for 2026/2027 Admission</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>

                <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3.5">
                  <Link
                    href="/result"
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-5 sm:py-3.5 rounded-lg text-xs sm:text-sm font-bold text-white bg-primary-900/90 hover:bg-primary-800 border border-white/25 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary-400 shrink-0" />
                    <span className="truncate">Check Result</span>
                  </Link>

                  <Link
                    href="/staff/login"
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-5 sm:py-3.5 rounded-lg text-xs sm:text-sm font-bold text-slate-100 bg-slate-900/90 hover:bg-slate-800 border border-white/20 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary-400 shrink-0" />
                    <span className="truncate">Staff Login</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Automatic Slide Progress Bar (No Manual Arrows) */}
        <div className="relative z-20 border-t border-white/10 bg-primary-950/90 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-2.5 sm:py-3">
            <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl">
              {HERO_SLIDES.map((slide, idx) => {
                const active = idx === heroIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setHeroIndex(idx)}
                    className="text-left group py-1"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[11px] sm:text-xs font-extrabold tabular-nums ${
                          active ? "text-secondary-400" : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <span
                        className={`text-xs font-semibold truncate hidden sm:inline ${
                          active ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      >
                        {slide.tabLabel}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-white/15 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          active ? "w-full bg-secondary-400" : "w-0 bg-white/40"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. INSTITUTIONAL KEY FACTS RIBBON
          ===================================================================== */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-slate-200 border-x border-slate-200">
            {[
              {
                stat: "Sept. 2014",
                label: "Year Established",
                detail: "Over a decade of impact",
                delay: "delay-100",
              },
              {
                stat: "700+",
                label: "Active Scholars",
                detail: "Creche to Senior Secondary",
                delay: "delay-200",
              },
              {
                stat: "15 : 1",
                label: "Class Mentorship Ratio",
                detail: "Personalized pupil attention",
                delay: "delay-300",
              },
              {
                stat: "100%",
                label: "Government Accredited",
                detail: "WAEC, NECO, JAMB & BECE",
                delay: "delay-400",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-3 sm:p-6 lg:p-7 bg-white reveal-init reveal-fade-up ${item.delay}`}
              >
                <span className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-primary-950 block tracking-tight">
                  {item.stat}
                </span>
                <span className="text-[11px] sm:text-sm font-bold text-primary-800 block mt-0.5 sm:mt-1">
                  {item.label}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 block mt-0.5 truncate">
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. WELCOME & INSTITUTIONAL CHARTER SPLIT (EMERALD "WHO WE ARE" LAYOUT)
          ===================================================================== */}
      <section className="py-10 sm:py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
            {/* Left Column: Editorial Campus Visual Composition */}
            <div className="lg:col-span-5 space-y-3 sm:space-y-4 reveal-init reveal-fade-left delay-100">
              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-card h-44 sm:h-auto sm:aspect-[4/3] bg-slate-100 group">
                <Image
                  src="/assets/images/campus-courtyard.jpg"
                  alt="Great-Favour Montessori School Courtyard and Scholars"
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover editorial-img-zoom"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-950/75 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 text-white">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-secondary-400 block">
                    Issele-Azagba Campus
                  </span>
                  <p className="text-xs sm:text-sm font-bold leading-snug">
                    A serene, disciplined environment purpose-built for learning.
                  </p>
                </div>
              </div>

              {/* Official Charter Highlight Card */}
              <div className="bg-primary-950 text-white p-3.5 sm:p-6 rounded-xl border border-primary-900 flex items-start gap-3 sm:gap-4 reveal-init reveal-zoom-in delay-200">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-secondary-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-secondary-400 block">
                    Our Core Institutional Mandate
                  </span>
                  <p className="text-xs sm:text-lg font-extrabold text-white leading-snug">
                    &ldquo;{INSTITUTIONAL_ACCREDITATION.coreGoalAndObjective}&rdquo;
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
                    Founded {INSTITUTIONAL_ACCREDITATION.established} &bull; Motto: &ldquo;{SCHOOL_BRAND.motto}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Institutional Story & Accreditations */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 reveal-init reveal-fade-right delay-150">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-0.5 bg-secondary-500" />
                  <span className="section-badge">Welcome to Great-Favour</span>
                </div>
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-primary-950 tracking-tight leading-tight">
                  An Accredited Institution Dedicated to Academic &amp; Moral Distinction
                </h2>
                <p className="text-slate-600 text-xs sm:text-base leading-relaxed">
                  Established in <strong>{INSTITUTIONAL_ACCREDITATION.established}</strong> in Issele-Azagba, Delta State, Great-Favour Montessori School is an approved Nursery, Primary, and Secondary institution where children are known by name, mentored with patience, and challenged to achieve their highest academic potential.
                </p>
              </div>

              {/* Approved Examinations Grid with Official Logos (Compact 2-Col on Mobile) */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Approved &amp; Accredited Examination Bodies (WAEC, NECO, JAMB &amp; BECE)
                </h3>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                  {INSTITUTIONAL_ACCREDITATION.approvedExaminations.map((exam, idx) => (
                    <div
                      key={exam.code}
                      className={`p-2.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-primary-300 transition flex items-center gap-2.5 sm:gap-3.5 reveal-init reveal-fade-up delay-${(idx + 1) * 100}`}
                    >
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-white border border-slate-200 p-1 sm:p-1.5 flex items-center justify-center shrink-0 shadow-xs relative overflow-hidden">
                        <Image
                          src={exam.logo}
                          alt={`${exam.code} Official Logo`}
                          width={48}
                          height={48}
                          className="object-contain w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-primary-950 text-secondary-400 font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase">
                            {exam.code}
                          </span>
                          <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {exam.badge}
                          </span>
                        </div>
                        <h4 className="font-bold text-primary-950 text-[11px] sm:text-sm leading-tight sm:leading-snug mt-0.5 sm:mt-1 line-clamp-2">
                          {exam.title}
                        </h4>
                        <span className="text-[10px] sm:text-[11px] text-slate-600 block mt-0.5 truncate">
                          {exam.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Links */}
              <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-2.5 sm:gap-4">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg bg-primary-900 hover:bg-primary-950 text-white text-xs sm:text-sm font-bold transition"
                >
                  <span>Read Director&apos;s Welcome</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary-400" />
                </Link>
                <Link
                  href="/faculty"
                  className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg bg-white hover:bg-slate-50 text-primary-950 border border-slate-300 text-xs sm:text-sm font-bold transition"
                >
                  <span>Meet Our Faculty</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. OUR SCHOOLS, ONE SHARED VISION (EMERALD ACADEMIC DIVISIONS GRID)
          ===================================================================== */}
      <section className="py-10 sm:py-16 lg:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-5 sm:space-y-12">
          {/* Editorial Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 reveal-init reveal-fade-up delay-100">
            <div className="space-y-1.5 sm:space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-0.5 bg-secondary-500" />
                <span className="section-badge">Academic Pathways</span>
              </div>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-primary-950 tracking-tight">
                Four Academic Divisions, One Shared Vision
              </h2>
              <p className="text-slate-600 text-xs sm:text-base leading-relaxed">
                From a child&apos;s first steps in our Montessori studio to final senior secondary examinations, each division provides age-appropriate rigor and caring guidance.
              </p>
            </div>

            <Link
              href="/academics"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary-900 hover:text-primary-950 self-start md:self-end shrink-0 group"
            >
              <span>View Full Curriculum &amp; Term Calendar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* 4 Division Cards — Compact Cards on Mobile, 2x2 on Tablet, 4-Col on Desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {ACADEMIC_DIVISIONS.map((div) => (
              <article
                key={div.id}
                className={`editorial-card rounded-xl overflow-hidden flex flex-col justify-between group reveal-init reveal-fade-up ${div.delay}`}
              >
                <div>
                  {/* Card Image Frame — Compact h-36 on mobile */}
                  <div className="relative h-36 sm:h-48 w-full overflow-hidden bg-slate-200">
                    <Image
                      src={div.image}
                      alt={div.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover editorial-img-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-primary-950/90 text-secondary-400 text-[10px] sm:text-[11px] font-bold tracking-wide">
                      {div.levelBadge}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 sm:p-5 space-y-2 sm:space-y-3">
                    <div>
                      <span className="text-[11px] sm:text-xs font-bold text-primary-800 block">
                        {div.classes}
                      </span>
                      <h3 className="text-sm sm:text-lg font-extrabold text-primary-950 leading-snug mt-0.5">
                        {div.title}
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {div.description}
                    </p>

                    <div className="flex flex-wrap sm:flex-col gap-1.5 pt-1.5 sm:pt-2 border-t border-slate-100 text-[11px] sm:text-xs text-slate-700 font-medium">
                      {div.highlights.map((item) => (
                        <span key={item} className="inline-flex items-center gap-1.5 bg-slate-50 sm:bg-transparent px-2 py-0.5 sm:p-0 rounded border border-slate-200/70 sm:border-0">
                          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent-green-700 shrink-0" />
                          <span>{item}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Link */}
                <div className="px-3.5 py-2.5 sm:px-5 sm:py-3.5 bg-slate-50 border-t border-slate-200/80">
                  <Link
                    href={div.href}
                    className="inline-flex items-center justify-between w-full text-xs font-bold text-primary-900 group-hover:text-primary-950"
                  >
                    <span>Explore Division</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-800 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. WHY FAMILIES CHOOSE GREAT-FAVOUR (4 INSTITUTIONAL PILLARS)
          ===================================================================== */}
      <section className="py-10 sm:py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-5 sm:space-y-12">
          <div className="max-w-3xl space-y-1.5 sm:space-y-2.5 reveal-init reveal-fade-up delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-0.5 bg-secondary-500" />
              <span className="section-badge">The Great-Favour Standard</span>
            </div>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-primary-950 tracking-tight">
              Why Discerning Parents Entrust Their Children to Us
            </h2>
            <p className="text-slate-600 text-xs sm:text-base leading-relaxed">
              Every aspect of our school day is structured to nurture intellectual curiosity, practical competence, and upright moral character.
            </p>
          </div>

          {/* 4 Pillars Grid — Compact 2x2 Grid on Mobile, 4-Col on Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {CORE_PILLARS.map((pillar, idx) => {
              const IconComponent = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className={`editorial-card rounded-xl p-3.5 sm:p-6 border-t-4 border-t-primary-900 flex flex-col justify-between reveal-init reveal-fade-up ${pillar.delay}`}
                >
                  <div className="space-y-2 sm:space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-primary-50 border border-primary-100 text-primary-900 flex items-center justify-center">
                        <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-400 tabular-nums">
                        0{idx + 1}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] sm:text-xs font-bold text-secondary-700 uppercase tracking-wider block truncate">
                        {pillar.subtitle}
                      </span>
                      <h3 className="text-xs sm:text-lg font-extrabold text-primary-950 leading-snug mt-0.5">
                        {pillar.title}
                      </h3>
                    </div>

                    <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                      {pillar.description}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2.5 sm:pt-4 sm:mt-4 border-t border-slate-100 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-primary-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green-700 shrink-0" />
                    <span className="truncate">{pillar.footer}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. CAMPUS LIFE & EVENTS SHOWCASE
          ===================================================================== */}
      <EventSlideshow />

      {/* =====================================================================
          7. DIGITAL CAMPUS & PORTALS GATEWAY
          ===================================================================== */}
      <DigitalCampusGateway />

      {/* =====================================================================
          8. VOICES OF OUR PARENTS & ADMISSIONS INVITATION
          ===================================================================== */}
      <section className="py-10 sm:py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-5 sm:space-y-12">
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

          {/* Testimonials Grid — Compact Readable Cards on Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
            {PARENT_TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className={`editorial-card rounded-xl p-4 sm:p-8 flex flex-col justify-between space-y-3 sm:space-y-5 reveal-init reveal-fade-up ${t.delay}`}
              >
                <div className="space-y-2.5 sm:space-y-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary-50 border border-secondary-200 text-secondary-700 flex items-center justify-center">
                    <Quote className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <blockquote className="text-slate-700 text-xs sm:text-base leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-xs sm:text-base font-extrabold text-primary-950 block">
                      {t.name}
                    </strong>
                    <span className="text-[11px] sm:text-xs text-slate-600 font-medium">
                      {t.ward}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-accent-green-800 bg-accent-green-50 border border-accent-green-100 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded shrink-0">
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent-green-700" />
                    <span>{t.tenure}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
