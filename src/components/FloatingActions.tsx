"use client";

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
    <div className="fixed bottom-2.5 right-2.5 sm:bottom-6 sm:right-6 z-40 flex flex-col gap-1.5 sm:gap-2 items-end animate-scale-in">
      <Link
        href="/result"
        title="Check Termly Result"
        aria-label="Check Termly Result"
        className="bg-secondary-400 hover:bg-secondary-500 text-slate-950 font-extrabold text-[10px] sm:text-xs h-10 w-10 sm:h-auto sm:w-auto p-0 sm:px-4 sm:py-2.5 rounded-full shadow-2xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 transform active:scale-90 hover:scale-105 border-2 border-slate-900 animate-glow-gold"
      >
        <KeyRound className="w-[18px] h-[18px] sm:w-4 sm:h-4 text-slate-950 shrink-0" />
        <span className="hidden sm:inline">Check Termly Result</span>
      </Link>
      <a
        href={SCHOOL_CONTACT.whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat on WhatsApp"
        aria-label="Chat on WhatsApp"
        className="bg-accent-green-700 hover:bg-accent-green-800 text-white font-bold text-[10px] sm:text-xs h-10 w-10 sm:h-auto sm:w-auto p-0 sm:px-3.5 sm:py-2 rounded-full shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 active:scale-90"
      >
        <MessageCircle className="w-[18px] h-[18px] sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:inline">Chat on WhatsApp</span>
      </a>
    </div>
  );
}
