"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  KeyRound,
  MessageCircle,
  Lock,
  GraduationCap,
  ArrowUp,
} from "lucide-react";
import { SCHOOL_CONTACT } from "@/constants/school";

export default function FloatingActions() {
  const pathname = usePathname();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 420);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host.startsWith("cbt.") || host === "cbt.localhost" || host.startsWith("cbt-")) {
      return null;
    }
  }

  if (
    pathname.startsWith("/cbt") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/results") ||
    pathname === "/adminlogin"
  ) {
    return null;
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Spacer on mobile so bottom quick-access dock never covers footer content */}
      <div className="h-16 lg:hidden print:hidden" aria-hidden="true" />

      {/* MOBILE BOTTOM EXECUTIVE QUICK-ACCESS DOCK (< lg) */}
      <nav
        aria-label="Mobile Quick Access Bar"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-primary-950/95 backdrop-blur-md border-t border-white/15 shadow-[0_-8px_24px_rgba(2,6,23,0.35)] print:hidden"
      >
        <div className="grid grid-cols-4 divide-x divide-white/10 max-w-md mx-auto">
          <Link
            href="/admissions"
            className={`flex flex-col items-center justify-center py-2.5 px-1 text-[10px] font-bold transition-colors ${
              pathname === "/admissions"
                ? "text-secondary-400 bg-white/5"
                : "text-slate-200 hover:text-secondary-400"
            }`}
          >
            <GraduationCap className="w-4 h-4 mb-0.5 text-secondary-400" />
            <span>Admissions</span>
          </Link>

          <Link
            href="/result"
            className={`flex flex-col items-center justify-center py-2.5 px-1 text-[10px] font-extrabold transition-colors ${
              pathname === "/result"
                ? "bg-secondary-400 text-slate-950"
                : "text-secondary-300 hover:text-secondary-200 bg-secondary-500/10"
            }`}
          >
            <KeyRound
              className={`w-4 h-4 mb-0.5 ${
                pathname === "/result" ? "text-slate-950" : "text-secondary-400"
              }`}
            />
            <span>Check Result</span>
          </Link>

          <Link
            href="/staff/login"
            className="flex flex-col items-center justify-center py-2.5 px-1 text-[10px] font-bold text-slate-200 hover:text-secondary-400 transition-colors"
          >
            <Lock className="w-4 h-4 mb-0.5 text-slate-300" />
            <span>Staff Login</span>
          </Link>

          <a
            href={SCHOOL_CONTACT.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-2.5 px-1 text-[10px] font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
          >
            <MessageCircle className="w-4 h-4 mb-0.5 text-emerald-400" />
            <span>WhatsApp</span>
          </a>
        </div>
      </nav>

      {/* MOBILE SCROLL-TO-TOP BUTTON */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-20 right-3.5 z-40 lg:hidden w-10 h-10 rounded-full bg-white text-primary-950 border border-slate-200 shadow-lg flex items-center justify-center active:scale-95 transition-transform print:hidden"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* DESKTOP FLOATING ACTION DOCK (>= lg) */}
      <div className="hidden lg:flex fixed bottom-6 right-6 z-40 flex-col gap-2.5 items-end print:hidden">
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            title="Back to top"
            aria-label="Back to top"
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 text-primary-950 border border-slate-200 shadow-lg flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}

        {pathname !== "/result" && (
          <Link
            href="/result"
            title="Check Termly Result"
            aria-label="Check Termly Result"
            className="bg-secondary-400 hover:bg-secondary-300 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 border border-secondary-500"
          >
            <KeyRound className="w-4 h-4 text-slate-950 shrink-0" />
            <span>Check Termly Result</span>
          </Link>
        )}

        <a
          href={SCHOOL_CONTACT.whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat with Admissions Desk on WhatsApp"
          aria-label="Chat on WhatsApp"
          className="bg-primary-950 hover:bg-primary-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xl border border-white/15 flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Admissions WhatsApp</span>
        </a>
      </div>
    </>
  );
}
