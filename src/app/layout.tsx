import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SCHOOL_BRAND, SCHOOL_CONTACT, SCHOOL_NAME } from "@/constants/school";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingActions from "@/components/FloatingActions";
import Script from "next/script";
import TawkToChat from "@/components/TawkToChat";
import { buildTawkBootstrapScript, getTawkConfig } from "@/lib/tawk";
import { ScrollRevealProvider } from "@/components/ScrollReveal";
import { getCompiledCssText } from "@/lib/inline-css";

const inter = { variable: "font-inter" };
const outfit = { variable: "font-outfit" };

export const metadata: Metadata = {
  metadataBase: new URL("https://greatfavourmontessori.com.ng"),
  title: `${SCHOOL_NAME} | ${SCHOOL_BRAND.motto}`,
  description: `${SCHOOL_NAME} (Established ${SCHOOL_BRAND.founded}) - ${SCHOOL_BRAND.mission}`,
  keywords: [
    "Great-Favour Montessori School",
    "GFMS",
    "Leadership Academy",
    "Montessori School",
    "Primary Education",
    "Secondary Education",
    "School Management System",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.jpg", type: "image/jpeg" },
      { url: "/icon.jpg", type: "image/jpeg" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/logo.jpg", type: "image/jpeg" },
      { url: "/apple-icon.jpg", type: "image/jpeg" },
    ],
  },
  openGraph: {
    title: `${SCHOOL_NAME} | ${SCHOOL_BRAND.motto}`,
    description: `${SCHOOL_NAME} (Established ${SCHOOL_BRAND.founded}) - ${SCHOOL_BRAND.mission}`,
    url: "https://greatfavourmontessori.com.ng",
    siteName: SCHOOL_NAME,
    images: [
      {
        url: "/logo.jpg",
        width: 800,
        height: 800,
        alt: `${SCHOOL_NAME} Official Crest Logo`,
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SCHOOL_NAME} | ${SCHOOL_BRAND.motto}`,
    description: `${SCHOOL_NAME} - ${SCHOOL_BRAND.mission}`,
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const rawHost = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const host = rawHost.split(":")[0].toLowerCase();
  const isCbtSubdomain =
    host.startsWith("cbt.") ||
    host === "cbt.localhost" ||
    host.startsWith("cbt-");

  const compiledCss = getCompiledCssText();

  if (isCbtSubdomain) {
    return (
      <html lang="en" className={`scroll-smooth ${inter.variable} ${outfit.variable} dark`}>
        <head>
          <link rel="icon" href="/logo.jpg" type="image/jpeg" sizes="any" />
          <link rel="shortcut icon" href="/logo.jpg" type="image/jpeg" />
          <link rel="apple-touch-icon" href="/logo.jpg" />
          {compiledCss ? (
            <style
              id="gfms-cbt-subdomain-css"
              dangerouslySetInnerHTML={{ __html: compiledCss }}
            />
          ) : null}
        </head>
        <body className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans selection:bg-yellow-500 selection:text-slate-950">
          <main>{children}</main>
          <Script
            id="tawkto-bootstrap"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: buildTawkBootstrapScript(
                getTawkConfig().propertyId,
                getTawkConfig().widgetId
              ),
            }}
          />
          <TawkToChat />
        </body>
      </html>
    );
  }

  const schoolSchema = {
    "@context": "https://schema.org",
    "@type": "School",
    "name": SCHOOL_NAME,
    "alternateName": [SCHOOL_BRAND.shortName, "Great Favour Montessori School"],
    "url": "https://greatfavourmontessori.com.ng/",
    "logo": "https://greatfavourmontessori.com.ng/logo.jpg",
    "image": "https://greatfavourmontessori.com.ng/logo.jpg",
    "slogan": SCHOOL_BRAND.motto,
    "description": `${SCHOOL_NAME} - ${SCHOOL_BRAND.mission}`,
    "foundingDate": "2014-09",
    "sameAs": [SCHOOL_CONTACT.facebookUrl],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "NG"
    }
  };

  return (
    <html lang="en" className={`scroll-smooth ${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/jpeg" href="/logo.jpg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        {compiledCss ? (
          <style
            id="gfms-global-css"
            dangerouslySetInnerHTML={{ __html: compiledCss }}
          />
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolSchema) }}
        />
      </head>
      <body className="min-h-screen bg-neutral-white text-neutral-charcoal antialiased selection:bg-secondary-200 selection:text-primary-900 font-sans">
        <ScrollRevealProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <FloatingActions />
          <Script
            id="tawkto-bootstrap"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: buildTawkBootstrapScript(
                getTawkConfig().propertyId,
                getTawkConfig().widgetId
              ),
            }}
          />
          <TawkToChat />
        </ScrollRevealProvider>
      </body>
    </html>
  );
}
