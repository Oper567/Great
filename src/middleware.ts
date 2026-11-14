import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Great-Favour Montessori School (GFMS)
 * Multi-Domain Subdomain Isolation & Routing Middleware
 *
 * Dedicated Subdomain: cbt.greatfavourmontessori.com.ng
 * Local Development: cbt.localhost:3000
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 0. Normalize cPanel subdomain subdirectory prefixing if requests arrive with duplicate /cbt prefix
  if (
    pathname.startsWith("/cbt/_next/") ||
    pathname.startsWith("/cbt/assets/") ||
    pathname.startsWith("/cbt/api/") ||
    pathname.startsWith("/cbt/cbt/") ||
    pathname === "/cbt/cbt" ||
    pathname === "/cbt/logo.jpg" ||
    pathname === "/cbt/favicon.ico" ||
    pathname === "/cbt/cbt-sw.js" ||
    pathname === "/cbt/cbt-manifest.webmanifest" ||
    pathname === "/cbt/cbt-offline.html"
  ) {
    const strippedPath = pathname.replace(/^\/cbt/, "") || "/";
    return NextResponse.rewrite(new URL(strippedPath + request.nextUrl.search, request.url));
  }

  // 1. Resolve effective hostname (respecting cPanel reverse-proxy headers)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const rawHost = forwardedHost || request.headers.get("host") || "";
  const host = rawHost.split(":")[0].toLowerCase();

  // 2. Identify if the current request is targeting the CBT subdomain
  const cbtPrefix = process.env.CBT_SUBDOMAIN_PREFIX || "cbt";
  const explicitCbtHost = process.env.CBT_HOST?.toLowerCase();

  const isCbtSubdomain =
    host.startsWith(`${cbtPrefix}.`) ||
    host === explicitCbtHost ||
    host.startsWith("cbt-") ||
    host === "cbt.localhost";

  // -------------------------------------------------------------
  // SCENARIO A: Request is on the CBT SUBDOMAIN
  // -------------------------------------------------------------
  if (isCbtSubdomain) {
    let res: NextResponse;

    // A1. Root path on subdomain -> serve CBT entry portal (for both GET and Server Action POSTs)
    if (pathname === "/") {
      res = NextResponse.rewrite(new URL("/cbt", request.url), {
        request: {
          headers: request.headers,
        },
      });
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, X-Requested-With"
      );
      return res;
    }

    // Never redirect mutations, Server Actions, or POST requests across origins
    if (request.method !== "GET" && request.method !== "HEAD") {
      res = NextResponse.next();
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, X-Requested-With"
      );
      return res;
    }

    if (pathname === "/login") {
      // Redirect clean URLs on subdomain directly to canonical routes to preserve cookies
      return NextResponse.redirect(new URL("/cbt/login", request.url));
    } else if (pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/cbt/dashboard", request.url));
    } else if (pathname.startsWith("/exam/")) {
      const examSubpath = pathname.replace(/^\/exam/, "");
      return NextResponse.redirect(new URL(`/cbt/exam${examSubpath}`, request.url));
    } else if (
      // A3. Direct /cbt, /admin, /staff, /result, static assets, APIs, and service worker pass through
      pathname.startsWith("/cbt") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/result") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/assets") ||
      pathname.startsWith("/api") ||
      pathname === "/cbt-sw.js" ||
      pathname === "/cbt-manifest.webmanifest" ||
      pathname === "/cbt-offline.html" ||
      pathname.includes(".")
    ) {
      res = NextResponse.next();
    } else {
      // A4. Marketing routes accessed on CBT subdomain -> Redirect back to Main School Website
      const mainHost =
        process.env.NEXT_PUBLIC_APP_URL ||
        `https://${host.replace(new RegExp(`^${cbtPrefix}\\.`), "")}`;

      res = NextResponse.redirect(new URL(pathname, mainHost));
    }

    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, X-Requested-With"
    );
    return res;
  }

  // -------------------------------------------------------------
  // SCENARIO B: Request is on the MAIN DOMAIN
  // -------------------------------------------------------------
  // Allow direct access to /cbt, /cbt/login, /cbt/dashboard, /cbt/exam
  // Do NOT force cross-origin redirect to prevent CORS preflight failures
  // and ensure the CBT portal works seamlessly on both the main domain
  // and dedicated subdomain without configuration friction.
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, X-Requested-With"
  );
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static assets)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.jpg, and binary assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
