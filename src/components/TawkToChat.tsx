"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  getTawkConfig,
  isAdminOrStaffRoute,
  isEligibleTawkRoute,
  TAWK_SCRIPT_ID,
} from "@/lib/tawk";
import { attachTawkDragController } from "@/lib/tawkDrag";

declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
      minimize?: () => void;
      customStyle?: {
        visibility?: {
          desktop?: {
            position?: "br" | "bl" | "tr" | "tl" | "cr" | "cl";
            xOffset?: number | string;
            yOffset?: number | string;
          };
          mobile?: {
            position?: "br" | "bl" | "tr" | "tl" | "cr" | "cl";
            xOffset?: number | string;
            yOffset?: number | string;
          };
        };
      };
      [key: string]: unknown;
    };
    Tawk_LoadStart?: Date;
  }
}

export default function TawkToChat() {
  const pathname = usePathname() || "/";
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isDashboardPortal = isAdminOrStaffRoute(pathname);
  const shouldShow = isEligibleTawkRoute(pathname, hostname);
  const shouldShowRef = useRef(shouldShow);
  shouldShowRef.current = shouldShow;

  const { propertyId, widgetId } = getTawkConfig();

  useEffect(() => {
    if (!propertyId || !widgetId) return;

    const syncVisibility = () => {
      const api = window.Tawk_API;
      if (!api) return;
      if (shouldShowRef.current) {
        api.showWidget?.();
      } else {
        api.minimize?.();
        api.hideWidget?.();
      }
    };

    const existingScript = document.getElementById(TAWK_SCRIPT_ID);

    if (!existingScript) {
      if (!shouldShow) return;

      window.Tawk_API = window.Tawk_API || {};
      if (!window.Tawk_API.customStyle && isDashboardPortal) {
        // Lift the native mobile launcher & "We are here!" bubble cleanly above the 64px bottom bar.
        window.Tawk_API.customStyle = {
          visibility: {
            desktop: { position: "br", xOffset: 16, yOffset: 16 },
            mobile: { position: "br", xOffset: 12, yOffset: 76 },
          },
        };
      }
      window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

      const previousOnLoad = window.Tawk_API.onLoad;
      window.Tawk_API.onLoad = () => {
        previousOnLoad?.();
        syncVisibility();
      };

      const s1 = document.createElement("script");
      s1.id = TAWK_SCRIPT_ID;
      s1.async = true;
      s1.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
      s1.charset = "UTF-8";
      s1.setAttribute("crossorigin", "*");
      s1.addEventListener("error", () => {
        s1.remove();
      });

      const s0 = document.getElementsByTagName("script")[0];
      if (s0?.parentNode) {
        s0.parentNode.insertBefore(s1, s0);
      } else {
        document.head.appendChild(s1);
      }
    } else {
      syncVisibility();
    }

    window.addEventListener("tawkLoad", syncVisibility);
    return () => {
      window.removeEventListener("tawkLoad", syncVisibility);
    };
  }, [shouldShow, isDashboardPortal, propertyId, widgetId]);

  useEffect(() => {
    return attachTawkDragController();
  }, []);

  useEffect(() => {
    const handleBeforePrint = () => {
      window.Tawk_API?.hideWidget?.();
    };
    const handleAfterPrint = () => {
      if (shouldShowRef.current) {
        window.Tawk_API?.showWidget?.();
      }
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  return null;
}
