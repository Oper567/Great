"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Phone,
  KeyRound,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  MapPin,
  ArrowUpRight,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/academics", label: "Academics" },
  { href: "/facilities", label: "Facilities" },
  { href: "/faculty", label: "Faculty & Staff" },
  { href: "/admissions", label: "Admissions" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host.startsWith("cbt.") || host === "cbt.localhost" || host.startsWith("cbt-")) {
      return null;
    }
  }

  if (
    pathname.startsWith("/cbt") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/result") ||
    pathname.startsWith("/results") ||
    pathname === "/adminlogin"
  ) {
    return null;
  }

  return (
    <>
      {/* TOP INSTITUTIONAL UTILITY BAR */}
      <div className="bg-primary-950 text-slate-200 text-xs border-b border-primary-900 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4">
          {/* Institutional Notice */}
          <div className="hidden md:flex items-center gap-3 min-w-0">
            <span className="inline-block bg-secondary-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shrink-0">
              2026/2027 Session
            </span>
            <p className="text-slate-300 text-xs truncate">
              Admissions Open across Creche, Montessori Nursery, Basic Primary &amp; Secondary Divisions
            </p>
          </div>

          {/* Direct Contact & Portal Links */}
          <div className="w-full md:w-auto flex items-center justify-between sm:justify-end gap-3 sm:gap-5 text-[11px] sm:text-xs font-medium text-slate-300">
            <span className="hidden xl:inline-flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
              <span>Issele-Azagba, Delta State</span>
            </span>
            <span className="hidden xl:inline text-primary-800">|</span>
            <a
              href="tel:+2349058943474"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
              <span>+234 (0) 905 894 3474</span>
            </a>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-primary-800 hidden sm:inline">|</span>
              <Link
                href="/result"
                className="inline-flex items-center gap-1.5 text-secondary-400 hover:text-secondary-300 font-semibold transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span>Result Checker</span>
              </Link>
              <span className="text-primary-800">|</span>
              <Link
                href="/staff/login"
                className="inline-flex items-center gap-1.5 text-white hover:text-secondary-400 font-semibold transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-secondary-400 shrink-0" />
                <span>Staff Login</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION BAR */}
      <header
        className={`sticky top-0 z-40 bg-white transition-all duration-300 ${
          scrolled
            ? "shadow-md border-b border-slate-200/90 py-0"
            : "border-b border-slate-200 py-0.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-4">
          {/* School Brand Crest & Identity */}
          <Link href="/" className="flex items-center gap-3 sm:gap-3.5 group min-w-0 shrink">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden p-1 shrink-0 group-hover:border-primary-800 transition-colors">
              <Image
                src="/logo.jpg"
                alt="Great-Favour Montessori School Official Crest"
                width={52}
                height={52}
                className="object-contain rounded-full"
                priority
              />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight text-primary-950 block leading-tight truncate">
                Great-Favour Montessori
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-600 font-semibold tracking-wider uppercase block truncate mt-0.5">
                Nursery &bull; Primary &bull; Secondary
              </span>
            </div>
          </Link>

          {/* Desktop Editorial Navigation */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-6" aria-label="Main Navigation">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`editorial-link py-1.5 text-sm transition-colors duration-200 ${
                    active
                      ? "editorial-link-active text-primary-950 font-bold"
                      : "text-slate-700 hover:text-primary-950 font-medium"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action Buttons (Result, Staff Login & Admissions) */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <Link
              href="/result"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-950 bg-slate-100 hover:bg-slate-200/80 border border-slate-300/80 px-3.5 py-2.5 rounded-lg transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-primary-800" />
              <span>Results</span>
            </Link>
            <Link
              href="/staff/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary-800" />
              <span>Staff Login</span>
            </Link>
            <Link
              href="/admissions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary-900 hover:bg-primary-950 px-4 py-2.5 rounded-lg transition-colors shadow-xs"
            >
              <span>Admissions</span>
              <ChevronRight className="w-3.5 h-3.5 text-secondary-400" />
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-slate-800 hover:text-primary-950 hover:bg-slate-100 border border-slate-200 transition"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-out ${
            mobileMenuOpen ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-xl">
            <nav className="flex flex-col divide-y divide-slate-100">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-3 px-3 flex items-center justify-between text-sm transition ${
                      active
                        ? "text-primary-950 font-bold bg-slate-50 border-l-4 border-secondary-500 pl-3"
                        : "text-slate-700 font-medium hover:bg-slate-50"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ChevronRight
                      className={`w-4 h-4 ${
                        active ? "text-primary-900" : "text-slate-400"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                href="/result"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 px-4 font-bold text-slate-950 bg-secondary-400 hover:bg-secondary-500 rounded-lg text-xs flex items-center justify-center gap-2 transition"
              >
                <KeyRound className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Check Termly Result</span>
              </Link>
              <Link
                href="/staff/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 px-4 font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs flex items-center justify-center gap-2 transition"
              >
                <ShieldCheck className="w-4 h-4 text-secondary-400 shrink-0" />
                <span>Staff / Teacher Login</span>
              </Link>
              <Link
                href="/admissions"
                onClick={() => setMobileMenuOpen(false)}
                className="sm:col-span-2 w-full py-3 px-4 font-bold text-white bg-primary-900 hover:bg-primary-950 rounded-lg text-xs flex items-center justify-center gap-2 transition"
              >
                <span>Apply for Admission</span>
                <ArrowUpRight className="w-4 h-4 text-secondary-400 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
