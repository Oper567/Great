"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, Sparkles, Check, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function CbtPwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if app is already running in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // Listen for the Chrome / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.warn("[GFMS CBT] PWA installation prompt error:", err);
    }
  };

  if (isInstalled || isDismissed) {
    return null;
  }

  // Show if Chromium prompt is ready OR if user is on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Sleek Floating Install Action Pill */}
      <div className="fixed bottom-4 left-4 z-40 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div className="flex items-center gap-2 bg-slate-950/90 border border-yellow-500/40 backdrop-blur-md text-white p-1.5 pl-3 rounded-full shadow-2xl shadow-yellow-500/10">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
            title="Install CBT App for offline & standalone full-screen testing"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>Install CBT Exam App</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            title="Dismiss install notice"
            aria-label="Dismiss install notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* iOS Safari Guided Install Sheet */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-100 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Install on iPad / iPhone</h3>
                <p className="text-xs text-slate-400">Great-Favour CBT Terminal</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> in the Safari toolbar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top-right corner to launch in full screen.
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
