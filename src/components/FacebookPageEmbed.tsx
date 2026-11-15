"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { SCHOOL_CONTACT } from "@/constants/school";

const FACEBOOK_TABS = "timeline";
const DEFAULT_PLUGIN_HEIGHT = 460;

export default function FacebookPageEmbed() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pluginWidth, setPluginWidth] = useState<number>(340);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const available = Math.floor(el.getBoundingClientRect().width);
      // Meta's Page Plugin supports widths cleanly between 260px and 500px
      const clamped = Math.min(500, Math.max(260, available));
      setPluginWidth((prev) => (prev !== clamped ? clamped : prev));
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(updateWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const pluginSrc = `https://www.facebook.com/plugins/page.php?${new URLSearchParams({
    href: SCHOOL_CONTACT.facebookUrl,
    tabs: FACEBOOK_TABS,
    width: String(pluginWidth),
    height: String(DEFAULT_PLUGIN_HEIGHT),
    small_header: "false",
    adapt_container_width: "true",
    hide_cover: "false",
    show_facepile: "true",
  }).toString()}`;

  return (
    <section
      id="facebook-community"
      aria-label="Official School Facebook Community"
      className="py-8 sm:py-14 lg:py-18 bg-slate-50 border-b border-slate-200 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Left Editorial Summary & Direct Facebook CTA */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5 reveal-init reveal-fade-left delay-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-0.5 bg-secondary-500" />
              <span className="section-badge">School Community &amp; Social Feed</span>
            </div>

            <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-primary-950 tracking-tight leading-tight">
              Follow Campus Moments Live on Facebook
            </h2>

            <p className="text-slate-600 text-xs sm:text-base leading-relaxed">
              Explore recent event photos, Inter-House sports highlights, cultural celebrations, and school announcements straight from our official Facebook Page in Issele-Azagba.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                "Event & Sports Day Galleries",
                "Graduation & Prize Awards",
                "Academic & Exam Notices",
                "Parent Community Updates",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-primary-950 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-accent-green-700 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={SCHOOL_CONTACT.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 sm:py-3 rounded-lg bg-[#1877F2] hover:bg-[#1465D1] text-white text-xs sm:text-sm font-extrabold transition shadow-sm"
              >
                <svg
                  className="w-4 h-4 fill-current shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M22.675 0h-21.35C.595 0 0 .593 0 1.326v21.348C0 23.406.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24h-1.918c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.594 1.323-1.326V1.326C24 .593 23.405 0 22.675 0z" />
                </svg>
                <span>Open Official Facebook Page</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-90 shrink-0" />
              </a>

              <a
                href={SCHOOL_CONTACT.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-lg bg-white hover:bg-slate-100 text-primary-950 border border-slate-300 text-xs sm:text-sm font-bold transition"
              >
                <MessageCircle className="w-4 h-4 text-accent-green-700 shrink-0" />
                <span>WhatsApp Admissions Desk</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-secondary-600 shrink-0" />
              <span>
                Using strict tracker blocking? Click &ldquo;Open Official Facebook Page&rdquo; above to view all school albums directly.
              </span>
            </p>
          </div>

          {/* Right Official Facebook Page Plugin Embed */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end min-w-0 reveal-init reveal-fade-right delay-200">
            <div className="w-full max-w-[524px] bg-white rounded-2xl border border-slate-200 shadow-card p-3 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2] shrink-0" />
                  <span className="text-xs font-extrabold text-primary-950 truncate">
                    Great-Favour Montessori School &bull; Facebook Timeline
                  </span>
                </div>
                <Link
                  href={SCHOOL_CONTACT.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-[#1877F2] hover:underline shrink-0"
                >
                  Follow &rarr;
                </Link>
              </div>

              <div
                ref={containerRef}
                className="w-full flex justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-100 min-h-[460px]"
              >
                <iframe
                  title="Great-Favour Montessori School Official Facebook Feed"
                  src={pluginSrc}
                  width={pluginWidth}
                  height={DEFAULT_PLUGIN_HEIGHT}
                  style={{
                    border: "none",
                    overflow: "hidden",
                    width: `${pluginWidth}px`,
                    maxWidth: "100%",
                    height: `${DEFAULT_PLUGIN_HEIGHT}px`,
                  }}
                  loading="lazy"
                  scrolling="no"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
