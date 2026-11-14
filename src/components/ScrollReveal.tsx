"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ScrollRevealProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [showBar, setShowBar] = useState(false);

  // Trigger top route progress bar and scroll-to-top on route change
  useEffect(() => {
    setShowBar(true);
    setProgress(35);

    const stepTimer = setTimeout(() => {
      setProgress(85);
    }, 120);

    const doneTimer = setTimeout(() => {
      setProgress(100);
    }, 280);

    const hideTimer = setTimeout(() => {
      setShowBar(false);
      setProgress(0);
    }, 520);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(doneTimer);
      clearTimeout(hideTimer);
    };
  }, [pathname]);

  // Observe all `.reveal-init` elements on initial load, route change, and DOM mutations (tab switches)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -32px 0px",
      }
    );

    const scanElements = () => {
      const elements = document.querySelectorAll(".reveal-init:not(.reveal-visible)");
      elements.forEach((el) => io.observe(el));
    };

    const timer = setTimeout(scanElements, 40);

    const mo = new MutationObserver(() => {
      scanElements();
    });

    mo.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Safety fallback so no element remains hidden if observer doesn't fire
    const fallbackTimer = setTimeout(() => {
      document.querySelectorAll(".reveal-init:not(.reveal-visible)").forEach((el) => {
        el.classList.add("reveal-visible");
      });
    }, 1800);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return (
    <>
      {showBar && (
        <div
          className="route-progress-bar"
          style={{
            width: `${progress}%`,
            opacity: progress >= 100 ? 0 : 1,
          }}
          aria-hidden="true"
        />
      )}
      <div key={pathname} className="page-transition-shell">
        {children}
      </div>
    </>
  );
}
