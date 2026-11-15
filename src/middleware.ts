import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Great-Favour Montessori School (GFMS)
 * Multi-Domain Subdomain Isolation, Strict Origin CORS & Security Headers Middleware
 */
function getAllowedCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const rawHost = forwardedHost || request.headers.get("host") || "";
    const reqHost = rawHost.split(":")[0].toLowerCase();
    const originHost = originUrl.hostname.toLowerCase();

    if (reqHost && originHost === reqHost) {
      return origin;
    }

    // Permit sibling institutional subdomains sharing the same root domain
    const cbtPrefix = process.env.CBT_SUBDOMAIN_PREFIX || "cbt";
    const rootDomain = reqHost.replace(new RegExp(`^${cbtPrefix}\\.`), "");
    if (rootDomain && (originHost === rootDomain || originHost.endsWith(`.${rootDomain}`))) {
      return origin;
    }

    if (
      process.env.NODE_ENV !== "production" &&
      (originHost === "localhost" || originHost === "cbt.localhost" || originHost === "127.0.0.1")
    ) {
      return origin;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && origin.startsWith(appUrl)) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  allowedOrigin: string | null
): NextResponse {
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, X-Requested-With"
    );
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const allowedOrigin = getAllowedCorsOrigin(request);

  // Handle CORS preflight strictly against allowlisted origins
  if (request.method === "OPTIONS") {
    if (!allowedOrigin) {
      return applySecurityHeaders(new NextResponse(null, { status: 403 }), request, null);
    }
    const preflight = new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Max-Age": "86400",
      },
    });
    return applySecurityHeaders(preflight, request, allowedOrigin);
  }

  // Normalize duplicate /cbt prefix on static assets / APIs
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
    return applySecurityHeaders(
      NextResponse.rewrite(new URL(strippedPath + request.nextUrl.search, request.url)),
      request,
      allowedOrigin
    );
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const rawHost = forwardedHost || request.headers.get("host") || "";
  const host = rawHost.split(":")[0].toLowerCase();

  const cbtPrefix = process.env.CBT_SUBDOMAIN_PREFIX || "cbt";
  const explicitCbtHost = process.env.CBT_HOST?.toLowerCase();

  const isCbtSubdomain =
    host.startsWith(`${cbtPrefix}.`) ||
    host === explicitCbtHost ||
    host.startsWith("cbt-") ||
    host === "cbt.localhost";

  if (isCbtSubdomain) {
    if (pathname === "/") {
      const res = NextResponse.rewrite(new URL("/cbt", request.url), {
        request: { headers: request.headers },
      });
      return applySecurityHeaders(res, request, allowedOrigin);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return applySecurityHeaders(NextResponse.next(), request, allowedOrigin);
    }

    let res: NextResponse;
    if (pathname === "/login") {
      res = NextResponse.redirect(new URL("/cbt/login", request.url));
    } else if (pathname === "/dashboard") {
      res = NextResponse.redirect(new URL("/cbt/dashboard", request.url));
    } else if (pathname.startsWith("/exam/")) {
      const examSubpath = pathname.replace(/^\/exam/, "");
      res = NextResponse.redirect(new URL(`/cbt/exam${examSubpath}`, request.url));
    } else if (
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
      const mainHost =
        process.env.NEXT_PUBLIC_APP_URL ||
        `https://${host.replace(new RegExp(`^${cbtPrefix}\\.`), "")}`;
      res = NextResponse.redirect(new URL(pathname, mainHost));
    }

    return applySecurityHeaders(res, request, allowedOrigin);
  }

  return applySecurityHeaders(NextResponse.next(), request, allowedOrigin);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
