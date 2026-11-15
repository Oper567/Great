"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, MessageCircle } from "lucide-react";
import { SCHOOL_CONTACT } from "@/constants/school";

export default function FloatingActions() {
  const pathname = usePathname();

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
    pathname.startsWith("/result") ||
    pathname.startsWith("/results") ||
    pathname === "/adminlogin"
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex flex-col gap-2 items-start print:hidden">
      <Link
        href="/result"
        title="Check Termly Result"
        aria-label="Check Termly Result"
        className="bg-secondary-400 hover:bg-secondary-300 text-slate-950 font-extrabold text-xs h-10 w-10 sm:h-auto sm:w-auto p-0 sm:px-4 sm:py-2.5 rounded-full sm:rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all duration-200 border border-secondary-500"
      >
        <KeyRound className="w-4 h-4 text-slate-950 shrink-0" />
        <span className="hidden sm:inline">Check Termly Result</span>
      </Link>

      <a
        href={SCHOOL_CONTACT.whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat on WhatsApp"
        aria-label="Chat on WhatsApp"
        className="bg-primary-950 hover:bg-primary-900 text-white font-bold text-xs h-10 w-10 sm:h-auto sm:w-auto p-0 sm:px-4 sm:py-2.5 rounded-full sm:rounded-xl shadow-xl border border-white/15 flex items-center justify-center gap-2 transition-all duration-200"
      >
        <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="hidden sm:inline">Chat on WhatsApp</span>
      </a>
    </div>
  );
}
