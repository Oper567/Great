import crypto from "crypto";
import { headers } from "next/headers";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
  windowResetAt: number;
}

export const RATE_LIMIT_MAX_FAILED_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

declare global {
  // eslint-disable-next-line no-var
  var __gfmsRateLimits: Map<string, RateLimitEntry> | undefined;
}

const MAX_RATE_LIMIT_ENTRIES = 20000;

function getRateLimitStore(): Map<string, RateLimitEntry> {
  if (!global.__gfmsRateLimits) {
    global.__gfmsRateLimits = new Map<string, RateLimitEntry>();
  }
  return global.__gfmsRateLimits;
}

function pruneRateLimitStore(store: Map<string, RateLimitEntry>, now: number): void {
  if (store.size < MAX_RATE_LIMIT_ENTRIES) return;
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

function normalizeIpCandidate(raw: string): string {
  let cleaned = raw.trim().slice(0, 64);
  if (!cleaned) return "";
  if (cleaned.toLowerCase().startsWith("::ffff:")) {
    cleaned = cleaned.slice(7);
  }
  // Strip IPv4 port suffix if present (e.g. "203.0.113.5:54321")
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(cleaned)) {
    cleaned = cleaned.split(":")[0];
  }
  return cleaned;
}

function isLoopbackIp(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1";
}

/**
 * Extracts best-effort client IP from incoming request headers for rate limiting.
 * Prefers proxy-overwritten headers and rightmost proxy-appended X-Forwarded-For entry
 * to resist client-side header spoofing.
 */
export function getClientIp(): string {
  try {
    const hdrs = headers();

    const cfIp = hdrs.get("cf-connecting-ip");
    if (cfIp) {
      const normalized = normalizeIpCandidate(cfIp);
      if (normalized) return normalized;
    }

    const realIp = hdrs.get("x-real-ip");
    if (realIp) {
      const normalized = normalizeIpCandidate(realIp);
      if (normalized) return normalized;
    }

    const forwarded = hdrs.get("x-forwarded-for");
    if (forwarded) {
      const candidates = forwarded
        .split(",")
        .map((part) => normalizeIpCandidate(part))
        .filter(Boolean);
      for (let i = candidates.length - 1; i >= 0; i--) {
        if (!isLoopbackIp(candidates[i])) {
          return candidates[i];
        }
      }
      if (candidates.length > 0) {
        return candidates[candidates.length - 1];
      }
    }

    const clientIp = hdrs.get("x-client-ip") || hdrs.get("true-client-ip");
    if (clientIp) {
      const normalized = normalizeIpCandidate(clientIp);
      if (normalized) return normalized;
    }

    const socketIp = hdrs.get("x-gfms-remote-ip");
    if (socketIp) {
      const normalized = normalizeIpCandidate(socketIp);
      if (normalized) return normalized;
    }
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
    if (hdrs.get("front-end-https")?.trim().toLowerCase() === "on") return true;
    const cfVisitor = hdrs.get("cf-visitor") || "";
    if (cfVisitor.includes('"https"')) return true;
    const origin = hdrs.get("origin") || "";
    const referer = hdrs.get("referer") || "";
    if (origin.startsWith("https://") || referer.startsWith("https://")) return true;
  } catch {
    // Fallback below if headers() unavailable
  }
  return false;
}

/**
 * Checks whether a rate-limit bucket is currently blocked without incrementing its counter.
 */
export function getRateLimitStatus(
  bucketKey: string,
  maxAttempts: number
): RateLimitDecision {
  const store = getRateLimitStore();
  const now = Date.now();
  const existing = store.get(bucketKey);

  if (!existing || now >= existing.resetAt) {
    if (existing) store.delete(bucketKey);
    return {
      allowed: maxAttempts > 0,
      retryAfterSec: 0,
      remaining: Math.max(0, maxAttempts),
      windowResetAt: 0,
    };
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      retryAfterSec,
      remaining: 0,
      windowResetAt: existing.resetAt,
    };
  }

  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, maxAttempts - existing.count),
    windowResetAt: existing.resetAt,
  };
}

/**
 * Bounded in-memory fixed-window rate limiter that synchronously reserves an attempt slot
 * before async DB/hash work to prevent concurrent burst bypasses.
 * Pair with `releaseRateLimitAttempt` on verified success when counting failed attempts only.
 */
export function checkRateLimit(
  bucketKey: string,
  maxAttempts: number,
  windowMs: number
): RateLimitDecision {
  const store = getRateLimitStore();
  const now = Date.now();

  pruneRateLimitStore(store, now);

  if (maxAttempts <= 0) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil(windowMs / 1000)),
      remaining: 0,
      windowResetAt: now + windowMs,
    };
  }

  const existing = store.get(bucketKey);
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(bucketKey, { count: 1, resetAt });
    return {
      allowed: true,
      retryAfterSec: 0,
      remaining: Math.max(0, maxAttempts - 1),
      windowResetAt: resetAt,
    };
  }

  if (existing.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      allowed: false,
      retryAfterSec,
      remaining: 0,
      windowResetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  store.set(bucketKey, existing);
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, maxAttempts - existing.count),
    windowResetAt: existing.resetAt,
  };
}

/**
 * Releases a previously reserved rate-limit slot when authentication/verification succeeds,
 * ensuring only failed attempts count toward lockout thresholds.
 */
export function releaseRateLimitAttempt(
  bucketKey: string,
  expectedResetAt?: number
): void {
  const store = getRateLimitStore();
  const existing = store.get(bucketKey);
  if (!existing) return;
  if (expectedResetAt !== undefined && existing.resetAt !== expectedResetAt) {
    return;
  }

  existing.count -= 1;
  if (existing.count <= 0) {
    store.delete(bucketKey);
  } else {
    store.set(bucketKey, existing);
  }
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
