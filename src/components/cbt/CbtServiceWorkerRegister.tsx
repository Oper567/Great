"use client";

import { useEffect } from "react";

export default function CbtServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        // Purge any legacy v1/v2 service worker caches that could hold stale CSS hashes
        if ("caches" in window) {
          const keys = await window.caches.keys();
          await Promise.all(
            keys
              .filter((k) => k !== "gfms-cbt-cache-v3")
              .map((k) => window.caches.delete(k))
          );
        }

        const registration = await navigator.serviceWorker.register("/cbt-sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        registration.update().catch(() => {});

        // Check for service worker updates
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("[GFMS CBT] New CBT version available. Refresh to activate.");
              }
            });
          }
        });
      } catch (error) {
        console.warn("[GFMS CBT] Service Worker registration failed:", error);
      }
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  return null;
}
