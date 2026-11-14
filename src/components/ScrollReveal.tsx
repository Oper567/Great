"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ScrollRevealProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [showBar, setShowBar] = useState(false);

  // Trigger top route progress bar on route navigation
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

  // Scroll-triggered animation engine for both Desktop and Mobile touch scrolling
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observedElements = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          } else if (entry.boundingClientRect.top > viewportHeight * 0.98) {
            // Reset element when it is scrolled back below the bottom of the viewport
            // so scrolling down again smoothly replays the entrance animation
            entry.target.classList.remove("reveal-visible");
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    const scanElements = () => {
      const elements = document.querySelectorAll(".reveal-init");
      elements.forEach((el) => {
        if (!observedElements.has(el)) {
          observedElements.add(el);
          io.observe(el);
        }
      });
    };

    // Initial scan and delayed scan after hydration
    scanElements();
    const timer = setTimeout(scanElements, 60);

    // Watch for dynamically rendered tabs/cards (e.g., Faculty filter, Academics tabs, Portals)
    const mo = new MutationObserver(() => {
      scanElements();
    });

    mo.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
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
