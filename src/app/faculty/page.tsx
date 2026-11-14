"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  KEY_PERSONNEL,
  ACADEMIC_FACULTY,
} from "@/constants/school";
import {
  GraduationCap,
  Award,
  CheckCircle2,
  Star,
  ShieldCheck,
  TrendingUp,
  Users,
  KeyRound,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  BookOpen,
  HeartHandshake,
  FlaskConical,
  CreditCard,
  Filter,
  X,
} from "lucide-react";

type FacultyFilterType =
  | "All"
  | "Nursery"
  | "Primary"
  | "Counseling"
  | "Exams"
  | "Bursary"
  | "STEM"
  | "Operations";

interface FilterTabOption {
  label: string;
  value: FacultyFilterType;
  icon: React.ReactNode;
  description: string;
}

const FILTER_OPTIONS: FilterTabOption[] = [
  {
    label: "All Staff",
    value: "All",
    icon: <Users className="w-4 h-4 shrink-0" />,
    description: "Complete faculty & administrative directory",
  },
  {
    label: "Nursery & Montessori",
    value: "Nursery",
    icon: <Sparkles className="w-4 h-4 shrink-0" />,
    description: "Early years & Montessori sensory specialists",
  },
  {
    label: "Primary Section",
    value: "Primary",
    icon: <BookOpen className="w-4 h-4 shrink-0" />,
    description: "Basic school academic instructors & administration",
  },
  {
    label: "Guardian & Counseling",
    value: "Counseling",
    icon: <HeartHandshake className="w-4 h-4 shrink-0" />,
    description: "Student psychological well-being & moral guidance",
  },
  {
    label: "Exams & Standards",
    value: "Exams",
    icon: <Award className="w-4 h-4 shrink-0" />,
    description: "Academic testing, assessments & report card oversight",
  },
  {
    label: "Bursary & Admissions",
    value: "Bursary",
    icon: <CreditCard className="w-4 h-4 shrink-0" />,
    description: "Tuition billing, scratch cards & enrollment management",
  },
  {
    label: "Pure Science & STEM",
    value: "STEM",
    icon: <FlaskConical className="w-4 h-4 shrink-0" />,
    description: "Laboratory science, ICT digital lab & experiments",
  },
  {
    label: "Operations & Safety",
    value: "Operations",
    icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
    description: "Campus security, bus transit & perimeter safeguarding",
  },
];

export default function FacultyPage() {
  const [activeFacultyFilter, setActiveFacultyFilter] = useState<FacultyFilterType>("All");
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const isMemberInFilter = useCallback((member: (typeof ACADEMIC_FACULTY)[number], filter: FacultyFilterType): boolean => {
    if (filter === "All") return true;
    if (filter === "Nursery") return member.id === "fac-hod-nursery" || member.division === "Montessori";
    if (filter === "Primary") return member.id === "fac-sec-primary" || member.division === "Primary";
    if (filter === "Counseling") return member.id === "fac-hod-counseling" || member.division === "Counseling";
    if (filter === "Exams") return member.id === "fac-hod-exams";
    if (filter === "Bursary") return member.id === "fac-bursar" || member.division === "Bursary";
    if (filter === "STEM") return member.division === "STEM";
    if (filter === "Operations") return member.id === "fac-cso" || member.id === "fac-bus-manager" || member.division === "Operations";
    return true;
  }, []);

  const getFilterCount = useCallback((filter: FacultyFilterType): number => {
    return ACADEMIC_FACULTY.filter((member) => isMemberInFilter(member, filter)).length;
  }, [isMemberInFilter]);

  const checkScrollability = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScrollability();
    const handleResize = () => checkScrollability();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkScrollability]);

  const handleScroll = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const scrollDistance = Math.max(sliderRef.current.clientWidth * 0.65, 220);
    sliderRef.current.scrollBy({
      left: direction === "left" ? -scrollDistance : scrollDistance,
      behavior: "smooth",
    });
    setTimeout(checkScrollability, 350);
  };

  const filteredStaff = ACADEMIC_FACULTY.filter((member) =>
    isMemberInFilter(member, activeFacultyFilter)
  );

  return (
    <>
      {/* EDITORIAL PAGE HERO BANNER */}
      <section className="relative bg-primary-950 text-white py-14 sm:py-20 overflow-hidden border-b border-primary-900">
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/graduation-1.jpg"
            alt="Great-Favour Montessori School Academic Faculty"
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
            <span className="text-secondary-400 font-semibold">Faculty &amp; Leadership</span>
          </nav>
          <div className="max-w-3xl space-y-4 reveal-init reveal-fade-up delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-[2px] bg-secondary-400" />
              <span className="text-xs font-extrabold text-secondary-400 uppercase tracking-widest">
                Academic Faculty &amp; Pedagogy
              </span>
            </div>
            <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Meet Our Faculty &amp; Staff
            </h1>
            <p className="text-slate-200 text-sm sm:text-lg leading-relaxed max-w-2xl">
              Behind every confident pupil at Great-Favour is a dedicated team of TRCN-certified educators, experienced subject masters, and certified Montessori specialists committed to academic distinction.
            </p>
          </div>
        </div>
      </section>

      {/* HEAD TEACHER SPOTLIGHT */}
      <section className="py-10 sm:py-16 lg:py-20 bg-white border-b border-slate-200 relative overflow-hidden">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-14 relative z-10">
          {/* Executive Leadership Heading */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 reveal-init reveal-fade-up delay-100">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary-800 bg-secondary-100 px-3 py-1 rounded-full w-fit">
                <Award className="w-3.5 h-3.5 text-secondary-700" />
                <span>Executive Leadership</span>
              </span>
              <h2 className="text-xl sm:text-4xl font-extrabold text-primary-950 tracking-tight">
                Head Teacher &amp; Academic Leadership
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                Directing classroom excellence, continuous teacher mentoring, and certified Montessori pedagogy across all levels.
              </p>
            </div>

            <a
              href="#faculty-directory"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 hover:bg-primary-100 border border-primary-200 text-primary-900 text-xs sm:text-sm font-bold transition shadow-xs self-start md:self-end shrink-0 group"
            >
              <Users className="w-4 h-4 text-primary-700" />
              <span>Explore Faculty Directory ({ACADEMIC_FACULTY.length} Staff)</span>
              <ChevronDown className="w-4 h-4 text-primary-700 group-hover:translate-y-0.5 transition-transform" />
            </a>
          </div>

          {/* HEAD TEACHER MASTER CARD */}
          <div className="bg-gradient-to-br from-primary-950 via-primary-900 to-slate-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-primary-800/60 relative overflow-hidden reveal-init reveal-fade-up delay-200">
            <div className="absolute top-0 right-0 w-80 h-80 bg-secondary-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-primary-700/20 rounded-full blur-2xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
              <div className="lg:col-span-4 flex flex-col items-center">
                <div className="relative w-full max-w-[220px] sm:max-w-[260px] h-[260px] sm:h-[320px] md:h-[380px] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border-2 sm:border-4 border-secondary-400/80 group">
                  <Image
                    src={KEY_PERSONNEL.headTeacher.image}
                    alt={`${KEY_PERSONNEL.headTeacher.fullName} - ${KEY_PERSONNEL.headTeacher.title}`}
                    fill
                    className="object-cover object-[center_15%] group-hover:scale-105 transition-transform duration-700"
                    priority
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-950 via-primary-950/80 to-transparent p-2 sm:p-3 pt-8 text-center">
                    <span className="text-[11px] sm:text-xs font-extrabold text-secondary-400 block uppercase tracking-wider">
                      {KEY_PERSONNEL.headTeacher.title}
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-200 font-medium">
                      Academic Leadership &bull; TRCN Certified
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-3 sm:space-y-4 text-left">
                <span className="px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-secondary-500 text-slate-950 tracking-wider inline-flex items-center gap-1.5 shadow-sm">
                  <Award className="w-3.5 h-3.5" />
                  FROM THE HEAD TEACHER&apos;S DESK
                </span>

                <div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight">
                    {KEY_PERSONNEL.headTeacher.fullName}
                  </h3>
                  <p className="text-secondary-400 font-semibold text-xs sm:text-sm mt-0.5">
                    {KEY_PERSONNEL.headTeacher.title} &bull; {KEY_PERSONNEL.headTeacher.portfolio}
                  </p>
                </div>

                <blockquote className="text-slate-200 text-xs sm:text-sm leading-relaxed italic border-l-3 sm:border-l-4 border-secondary-400 pl-3 bg-white/5 py-2 rounded-r-xl">
                  &quot;{KEY_PERSONNEL.headTeacher.deskMessage}&quot;
                </blockquote>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Working closely with our teachers and parents, Mr. Okafor oversees classroom quality, teacher continuous training, and pupil welfare. Under his guidance, every child is encouraged to discover their talents, ask big questions, and build lasting self-discipline.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-1">
                  {[
                    { title: "Hands-on Montessori Discovery", desc: "Children touch, build, and explore with certified apparatus." },
                    { title: "100% Certified, Caring Teachers", desc: "Degreed instructors registered with TRCN." },
                    { title: "Real Laboratory Science & ICT", desc: "Weekly hands-on lab experiments and computer typing." },
                    { title: "Honest Character & Poise", desc: "Instilling truthfulness, public speaking, and good manners." },
                  ].map((p) => (
                    <div key={p.title} className="flex items-start gap-2 bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5 text-secondary-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{p.title}</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-300">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="pt-4 mt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { val: "100%", label: "BECE & WAEC Success" },
                { val: "1:15", label: "Teacher-Pupil Ratio" },
                { val: "100%", label: "TRCN Certified Staff" },
                { val: "12+", label: "Workshops Yearly" },
              ].map((s) => (
                <div key={s.label}>
                  <span className="text-xl sm:text-2xl font-extrabold text-secondary-400 block">{s.val}</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-300 uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FACULTY DIRECTORY & FILTER SLIDER */}
          <div id="faculty-directory" className="space-y-6 pt-4 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-700 block mb-1">
                  Departmental Directory
                </span>
                <h3 className="text-xl sm:text-3xl font-extrabold text-primary-950">
                  Our Dedicated Faculty &amp; Departmental Leaders
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-primary-900 bg-primary-50 px-3.5 py-1.5 rounded-full border border-primary-200 shadow-xs">
                  Showing <strong className="text-primary-800">{filteredStaff.length}</strong> of {ACADEMIC_FACULTY.length} Staff Members
                </span>
                {activeFacultyFilter !== "All" && (
                  <button
                    onClick={() => setActiveFacultyFilter("All")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-primary-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-full transition"
                    title="Reset to all staff"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* INTERACTIVE DEPARTMENT SLIDER */}
            <div className="relative w-full max-w-full min-w-0">
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={() => handleScroll("left")}
                disabled={!canScrollLeft}
                aria-label="Previous departments"
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-md border border-slate-300 text-slate-700 shadow-md hover:bg-primary-50 hover:text-primary-900 hover:scale-105 active:scale-95 transition-all flex items-center justify-center -ml-1 sm:-ml-3 disabled:opacity-0 disabled:pointer-events-none`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-primary-900" />
              </button>

              {/* Left Gradient Mask */}
              <div
                className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-white via-white/80 to-transparent z-10 transition-opacity duration-300 rounded-l-2xl ${
                  canScrollLeft ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Scrollable Track */}
              <div
                ref={sliderRef}
                onScroll={checkScrollability}
                className="flex items-center gap-2 p-1.5 sm:p-2 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar scroll-smooth w-full min-w-0"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {FILTER_OPTIONS.map((tab) => {
                  const isSelected = activeFacultyFilter === tab.value;
                  const count = getFilterCount(tab.value);
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveFacultyFilter(tab.value)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 group ${
                        isSelected
                          ? "bg-primary-800 text-white shadow-md ring-2 ring-primary-700/40 translate-y-[-1px]"
                          : "bg-white text-slate-700 hover:text-primary-900 hover:bg-white border border-slate-200/80 hover:border-primary-300 hover:shadow-xs"
                      }`}
                    >
                      <span className={`transition-colors ${isSelected ? "text-secondary-400" : "text-primary-700 group-hover:text-primary-900"}`}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-full transition-colors ${
                          isSelected
                            ? "bg-secondary-400 text-slate-950 font-extrabold"
                            : "bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-900"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Gradient Mask */}
              <div
                className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-white via-white/80 to-transparent z-10 transition-opacity duration-300 rounded-r-2xl ${
                  canScrollRight ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Right Arrow Button */}
              <button
                type="button"
                onClick={() => handleScroll("right")}
                disabled={!canScrollRight}
                aria-label="Next departments"
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-md border border-slate-300 text-slate-700 shadow-md hover:bg-primary-50 hover:text-primary-900 hover:scale-105 active:scale-95 transition-all flex items-center justify-center -mr-1 sm:-mr-3 disabled:opacity-0 disabled:pointer-events-none`}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary-900" />
              </button>
            </div>

            {/* Active filter helper notice if filtered */}
            {activeFacultyFilter !== "All" && (
              <div className="flex items-center justify-between bg-primary-50/70 border border-primary-200/60 rounded-xl px-3.5 py-2 text-xs text-primary-950">
                <span className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-primary-700 shrink-0" />
                  <span>
                    Filtering by: <strong>{FILTER_OPTIONS.find(t => t.value === activeFacultyFilter)?.label}</strong> &bull; {FILTER_OPTIONS.find(t => t.value === activeFacultyFilter)?.description}
                  </span>
                </span>
                <button
                  onClick={() => setActiveFacultyFilter("All")}
                  className="font-bold text-primary-800 hover:text-primary-950 underline underline-offset-2 shrink-0 ml-2"
                >
                  Show All Staff
                </button>
              </div>
            )}

            {/* FACULTY CARDS GRID — Compact 2-Column on Mobile, 3-Column on Desktop */}
            {filteredStaff.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                {filteredStaff.map((member, idx) => (
                  <div
                    key={member.id}
                    className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 border border-slate-200 shadow-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between group reveal-init reveal-fade-up"
                    style={{ animationDelay: `${(idx + 1) * 80}ms` }}
                  >
                    <div className="space-y-2 sm:space-y-3">
                      <div className="relative w-full aspect-square sm:aspect-[4/5] rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group-hover:border-secondary-400 transition-colors shadow-sm">
                        <Image
                          src={member.image}
                          alt={`${member.name} - ${member.role}`}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                          className={`object-cover ${member.objectPosition || "object-center"} group-hover:scale-105 transition-transform duration-500`}
                        />
                        <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 z-10">
                          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-extrabold bg-primary-950/85 text-white backdrop-blur-md shadow-sm border border-white/20 truncate max-w-[110px] sm:max-w-none block">
                            {member.department}
                          </span>
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 z-10">
                          <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold bg-secondary-400 text-slate-950 shadow-sm flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Certified</span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-base font-bold text-primary-950 group-hover:text-primary-800 transition leading-snug line-clamp-1 sm:line-clamp-none">
                          {member.name}
                        </h4>
                        <p className="text-primary-800 font-semibold text-[10px] sm:text-xs mt-0.5 line-clamp-1">{member.role}</p>
                        <p className="text-slate-600 text-[10px] sm:text-xs leading-relaxed mt-1 line-clamp-2 sm:line-clamp-none">{member.bio}</p>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 sm:pt-3 sm:mt-3 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-secondary-700 font-semibold truncate">
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-secondary-400 text-secondary-500 shrink-0" />
                        <span className="truncate">Dedicated Mentor</span>
                      </span>
                      <span className="hidden sm:inline font-mono text-slate-400 text-[10px]">TRCN / GFMS</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No staff members found in this category</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click below to view our full academic and administrative staff.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFacultyFilter("All")}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-800 hover:bg-primary-900 transition shadow-sm inline-flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-secondary-400" />
                  <span>View All Staff</span>
                </button>
              </div>
            )}
          </div>

          {/* FACULTY STANDARDS BANNER */}
          <div className="bg-gradient-to-r from-primary-900 to-primary-950 text-white rounded-2xl sm:rounded-3xl p-3 sm:p-8 border border-primary-800 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              <div className="space-y-1 md:border-r md:border-white/10 md:pr-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary-400 block">Staff Excellence</span>
                <h4 className="text-base sm:text-lg font-bold text-white">Our Faculty Standards</h4>
                <p className="text-xs text-slate-300">Every educator is thoroughly vetted and continually upskilled to ensure maximum pupil safety and learning success.</p>
              </div>
              {[
                { icon: <ShieldCheck className="w-5 h-5 text-secondary-400 shrink-0 mt-0.5" />, title: "Child Safeguarding", desc: "Rigorous background checks and zero-tolerance safety policies." },
                { icon: <GraduationCap className="w-5 h-5 text-secondary-400 shrink-0 mt-0.5" />, title: "TRCN Registration", desc: "100% degreed and certified by Nigeria's apex teaching council." },
                { icon: <TrendingUp className="w-5 h-5 text-secondary-400 shrink-0 mt-0.5" />, title: "Continuous CPD", desc: "Regular pedagogical workshops in modern STEM & digital literacy." },
              ].map((s) => (
                <div key={s.title} className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  {s.icon}
                  <div>
                    <h5 className="text-xs font-bold text-white">{s.title}</h5>
                    <p className="text-[11px] text-slate-300">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STAFF HUB */}
          <div className="bg-secondary-50 border-2 border-secondary-200 rounded-3xl p-4 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="space-y-1.5 text-center md:text-left">
              <span className="text-xs font-extrabold text-secondary-800 uppercase tracking-widest bg-secondary-200/80 px-3 py-0.5 rounded-full inline-block">
                Staff Hub & Digital Workspace
              </span>
              <h4 className="text-base sm:text-xl font-extrabold text-primary-950">
                Are You a Member of Our Academic Faculty?
              </h4>
              <p className="text-slate-700 text-xs sm:text-sm max-w-2xl">
                Access the GFMS Staff Intranet to submit lesson notes, record continuous assessments, manage attendance, and upload termly report comments.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/staff/login" className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-800 hover:bg-primary-900 shadow-md transition active:scale-95 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-secondary-400" />
                <span>Staff Portal Login</span>
              </Link>
              <a href="mailto:greatfavourmontessorischool@gmail.com" className="px-4 py-2.5 rounded-xl text-xs font-bold text-primary-900 bg-white border border-primary-200 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm">
                <Users className="w-3.5 h-3.5 text-primary-700" />
                <span>Join Our Teaching Team</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
