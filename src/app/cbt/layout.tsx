import type { Metadata, Viewport } from "next";
import CbtServiceWorkerRegister from "@/components/cbt/CbtServiceWorkerRegister";
import CbtOfflineIndicator from "@/components/cbt/CbtOfflineIndicator";

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://greatfavourmontessori.com.ng"),
  title: {
    default: "GFMS CBT Portal | Senior Secondary Examination Terminal",
    template: "%s | GFMS CBT Portal",
  },
  description:
    "Official Computer-Based Testing (CBT) and Examination Portal for Great-Favour Montessori School Senior Secondary students.",
  manifest: "/cbt-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GFMS CBT",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo.jpg", sizes: "any", type: "image/jpeg" },
      { url: "/logo.jpg", sizes: "800x800", type: "image/jpeg" },
    ],
    shortcut: "/logo.jpg",
    apple: [
      { url: "/logo.jpg", sizes: "800x800", type: "image/jpeg" },
    ],
  },
};

export default function CbtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-yellow-500 selection:text-slate-950">
      <CbtServiceWorkerRegister />
      <CbtOfflineIndicator />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
