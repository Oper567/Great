import crypto from "crypto";
import { headers } from "next/headers";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __gfmsRateLimits: Map<string, RateLimitEntry> | undefined;
}

const MAX_RATE_LIMIT_ENTRIES = 5000;

function getRateLimitStore(): Map<string, RateLimitEntry> {
  if (!global.__gfmsRateLimits) {
    global.__gfmsRateLimits = new Map<string, RateLimitEntry>();
  }
  return global.__gfmsRateLimits;
}

/**
 * Extracts best-effort client IP from incoming request headers for rate limiting.
 */
export function getClientIp(): string {
  try {
    const hdrs = headers();
    const cfIp = hdrs.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim().slice(0, 64);

    const forwarded = hdrs.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first.slice(0, 64);
    }

    const realIp = hdrs.get("x-real-ip");
    if (realIp) return realIp.trim().slice(0, 64);
  } catch {
    // headers() may throw outside a request context
  }
  return "unknown";
}

/**
 * Detects whether the client-facing connection uses HTTPS (accounting for cPanel/LiteSpeed proxies).
 */
export function isHttpsRequest(): boolean {
  try {
    const hdrs = headers();
    const proto = hdrs.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (proto === "https") return true;
    if (hdrs.get("x-forwarded-ssl")?.trim().toLowerCase() === "on") return true;
    const origin = hdrs.get("origin") || "";
    const referer = hdrs.get("referer") || "";
    if (origin.startsWith("https://") || referer.startsWith("https://")) return true;
  } catch {
    // Fallback below if headers() unavailable
  }
  return false;
}

/**
 * Bounded in-memory sliding/fixed-window rate limiter to mitigate credential brute-force attacks.
 */
export function checkRateLimit(
  bucketKey: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const store = getRateLimitStore();
  const now = Date.now();

  // Prune expired entries when store grows large to bound memory usage
  if (store.size >= MAX_RATE_LIMIT_ENTRIES) {
    store.forEach((val, key) => {
      if (now >= val.resetAt) {
        store.delete(key);
      }
    });
    while (store.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (!oldestKey) break;
      store.delete(oldestKey);
    }
  }

  const existing = store.get(bucketKey);
  if (!existing || now >= existing.resetAt) {
    store.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  store.set(bucketKey, existing);
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Timing-safe equality check for secrets of arbitrary length.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Inspects file magic bytes and enforces an explicit safe allowlist
 * (blocks SVG/HTML/script stored XSS uploads and oversized files).
 */
export async function validateUploadedFile(
  file: File | null,
  options?: { allowPdf?: boolean; maxBytes?: number }
): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "Invalid uploaded file." };
  }

  const maxBytes = options?.maxBytes ?? 5 * 1024 * 1024;
  if (file.size <= 0) {
    return { ok: false, error: "Uploaded file is empty." };
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, error: `Uploaded file exceeds the ${mb}MB maximum size limit.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, error: `Uploaded file exceeds the ${mb}MB maximum size limit.` };
  }

  let verifiedMime: string | null = null;

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    verifiedMime = "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    verifiedMime = "image/png";
  }
  // GIF: GIF87a / GIF89a
  else if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    verifiedMime = "image/gif";
  }
  // WEBP: RIFF....WEBP
  else if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    verifiedMime = "image/webp";
  }
  // PDF: %PDF-
  else if (options?.allowPdf && buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
    verifiedMime = "application/pdf";
  }

  if (!verifiedMime) {
    return {
      ok: false,
      error: options?.allowPdf
        ? "Unsupported file type. Only JPEG, PNG, WEBP, GIF images or PDF documents are allowed."
        : "Unsupported image type. Only JPEG, PNG, WEBP, or GIF images are allowed.",
    };
  }

  return {
    ok: true,
    dataUrl: `data:${verifiedMime};base64,${buffer.toString("base64")}`,
  };
}

/**
 * Validates external or inline media URLs to prevent javascript:/SVG/HTML stored XSS.
 */
export function sanitizeMediaUrl(
  rawUrl: string | null | undefined,
  options?: { allowPdf?: boolean }
): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Reject path traversal
  if (trimmed.includes("..")) return null;

  // Allow safe internal static assets
  if (trimmed.startsWith("/assets/")) {
    return trimmed;
  }

  // Allow HTTPS external URLs only
  if (trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "https:") return trimmed;
    } catch {
      return null;
    }
  }

  // Allow strictly raster image data URIs (and PDF if permitted)
  const allowedPrefixRegex = options?.allowPdf
    ? /^data:(?:image\/(?:jpeg|jpg|png|gif|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/i
    : /^data:image\/(?:jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/i;

  if (allowedPrefixRegex.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Normalizes internal errors into safe, non-leaking user-facing messages.
 */
export function sanitizeErrorMessage(err: unknown, fallback: string): string {
  console.error(`[SecurityAuditLog] ${fallback}:`, err);
  return fallback;
}
