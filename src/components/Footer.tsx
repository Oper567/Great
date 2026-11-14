"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  KeyRound,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import {
  SCHOOL_BRAND,
  SCHOOL_CONTACT,
} from "@/constants/school";

export default function Footer() {
  const pathname = usePathname();
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
    <footer id="contact" className="bg-primary-950 text-white pt-12 sm:pt-16 pb-8 border-t-4 border-secondary-500 overflow-hidden w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12 reveal-init reveal-fade-up delay-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Column 1: School Identity (4 cols) */}
          <div className="lg:col-span-4 space-y-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-white p-1 shrink-0 flex items-center justify-center border border-slate-200">
                <Image
                  src="/assets/images/school-logo.jpg"
                  alt="Great-Favour Montessori School Crest"
                  width={44}
                  height={44}
                  className="object-contain rounded-full"
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-base text-white tracking-tight">
                  Great-Favour Montessori School
                </h4>
                <p className="text-xs text-secondary-400 font-semibold tracking-wider uppercase truncate">
                  {SCHOOL_BRAND.motto}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              An accredited Nursery, Primary, and Secondary institution cultivating honest, confident leaders through Montessori early learning and Secondary academic distinction.
            </p>
            <div className="pt-2 border-t border-primary-900 text-xs text-slate-400 space-y-1.5">
              <p><strong className="text-slate-200">Director:</strong> Hon. Okolie Peter Isioma JP MCArb</p>
              <p><strong className="text-slate-200">Deputy Director:</strong> Mrs. Jane Ekene Okolie</p>
            </div>
          </div>

          {/* Column 2: Quick Links (2 cols) */}
          <div className="lg:col-span-2 space-y-3.5 min-w-0">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-secondary-400">
              Our Institution
            </h5>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <Link href="/about" className="hover:text-white transition-colors block">
                  About Us &amp; Leadership
                </Link>
              </li>
              <li>
                <Link href="/academics" className="hover:text-white transition-colors block">
                  Academic Divisions
                </Link>
              </li>
              <li>
                <Link href="/facilities" className="hover:text-white transition-colors block">
                  Campus Facilities
                </Link>
              </li>
              <li>
                <Link href="/faculty" className="hover:text-white transition-colors block">
                  Faculty &amp; Staff Directory
                </Link>
              </li>
              <li>
                <Link href="/admissions" className="hover:text-white transition-colors block">
                  Admissions &amp; Enrollment
                </Link>
              </li>
              <li>
                <Link href="/prospectus" className="hover:text-white transition-colors block">
                  Official Prospectus
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Systems (3 cols) */}
          <div className="lg:col-span-3 space-y-3.5 min-w-0">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-secondary-400">
              Online Portals
            </h5>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <Link href="/result" className="text-white hover:text-secondary-400 font-semibold inline-flex items-center gap-2 transition-colors">
                  <KeyRound className="w-4 h-4 text-secondary-400 shrink-0" />
                  <span>Termly Result Checker</span>
                </Link>
              </li>
              <li>
                <Link href="/staff/login" className="hover:text-white inline-flex items-center gap-2 transition-colors">
                  <ShieldCheck className="w-4 h-4 text-secondary-400 shrink-0" />
                  <span>Staff &amp; Faculty Intranet</span>
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white inline-flex items-center gap-2 transition-colors">
                  <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Executive Admin Console</span>
                </Link>
              </li>
              <li>
                <Link href="/results/demo" className="hover:text-white transition-colors block">
                  Sample Terminal Report Sheet
                </Link>
              </li>
              <li>
                <Link href="/admissions#tour" className="hover:text-white transition-colors block">
                  Schedule a Campus Visit
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Office (3 cols) */}
          <div className="lg:col-span-3 space-y-3.5 min-w-0">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-secondary-400">
              Campus &amp; Registry Desk
            </h5>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-secondary-400 shrink-0 mt-1" />
                <span className="leading-relaxed">{SCHOOL_CONTACT.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-secondary-400 shrink-0" />
                <a href="tel:+2349058943474" className="hover:text-white transition-colors">
                  {SCHOOL_CONTACT.phoneFormatted}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-secondary-400 shrink-0" />
                <a
                  href={SCHOOL_CONTACT.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp: {SCHOOL_CONTACT.whatsapp}
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-secondary-400 shrink-0 mt-1" />
                <a
                  href={`mailto:${SCHOOL_CONTACT.email}`}
                  className="hover:text-white transition-colors break-all"
                >
                  {SCHOOL_CONTACT.email}
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-secondary-400 shrink-0" />
                <span>{SCHOOL_CONTACT.workingHours}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Accreditation Bar */}
        <div className="border-t border-primary-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 text-center sm:text-left">
          <p>
            &copy; {new Date().getFullYear()} Great-Favour Montessori School (GFMS). Established September 2014. All Rights Reserved.
          </p>
          <div className="flex items-center justify-center sm:justify-end gap-2.5 flex-wrap">
            <span>Licensed Nursery, Primary &amp; Secondary</span>
            <span className="text-primary-800">&bull;</span>
            <span className="text-slate-300 font-medium">Approved for FLSC, BECE, WASSCE &amp; NECO</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
