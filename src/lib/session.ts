import fs from "fs";
import path from "path";
import crypto from "crypto";
import { cookies } from "next/headers";
import { AdminSession, CBTUserRole, StudentSession } from "@/types/cbt";

export const STUDENT_COOKIE_NAME = "gfms_cbt_student_session";
export const ADMIN_COOKIE_NAME = "gfms_cbt_admin_session";
export const RESULT_COOKIE_NAME = "gfms_cbt_result_session";

const DEFAULT_SESSION_TTL_SEC = 12 * 60 * 60; // 12 hours
const RESULT_SESSION_TTL_SEC = 2 * 60 * 60; // 2 hours

export type TokenScope = "student" | "admin" | "result";

export interface ResultAccessSession {
  admNo: string;
  session: string;
  term: string;
  pendingOnly: boolean;
  checkCount?: number;
  maxCount?: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __gfmsSessionSecretCache: string | undefined;
}

/**
 * Loads HMAC signing secret from environment (`SESSION_SECRET`) or a local
 * runtime-generated CSPRNG file (`.gfms_runtime_secrets.json`) with 0600 permissions.
 * Zero static fallback secrets exist in source control.
 */
function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }

  if (global.__gfmsSessionSecretCache) {
    return global.__gfmsSessionSecretCache;
  }

  const runtimePath = path.join(process.cwd(), ".gfms_runtime_secrets.json");
  try {
    if (fs.existsSync(runtimePath)) {
      const parsed = JSON.parse(fs.readFileSync(runtimePath, "utf8") || "{}");
      if (parsed?.sessionSecret && typeof parsed.sessionSecret === "string") {
        global.__gfmsSessionSecretCache = parsed.sessionSecret;
        return parsed.sessionSecret;
      }
    }
  } catch {
    // Proceed to regenerate below
  }

  const generated = crypto.randomBytes(32).toString("hex");
  global.__gfmsSessionSecretCache = generated;

  try {
    let current: Record<string, string> = {};
    if (fs.existsSync(runtimePath)) {
      current = JSON.parse(fs.readFileSync(runtimePath, "utf8") || "{}") || {};
    }
    current.sessionSecret = generated;
    fs.writeFileSync(runtimePath, JSON.stringify(current), { mode: 0o600 });
  } catch {
    // Non-fatal in read-only environments; secret stays pinned in process RAM
  }

  return generated;
}

/**
 * Produces an HMAC-SHA256 signed, scoped, time-bounded session token (`<base64url>.<hexSig>`).
 */
export function serializeSignedSession<T extends object>(
  payload: T,
  scope: TokenScope = "student",
  maxAgeSeconds = DEFAULT_SESSION_TTL_SEC
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const envelope = {
    ...payload,
    _scope: scope,
    _iat: nowSec,
    _exp: nowSec + Math.max(60, maxAgeSeconds),
  };

  const json = JSON.stringify(envelope);
  const encoded = Buffer.from(json, "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(encoded)
    .digest("hex");

  return `${encoded}.${sig}`;
}

/**
 * Strictly verifies an HMAC-SHA256 signed session cookie with constant-time comparison,
 * scope validation, and expiration checks. Unsigned JSON cookies are unconditionally rejected.
 */
export function parseSignedSession<T>(
  cookieVal: string,
  expectedScope?: TokenScope
): T | null {
  try {
    if (!cookieVal || typeof cookieVal !== "string") return null;

    const trimmed = cookieVal.trim();
    if (trimmed.startsWith("{")) {
      // Strictly reject unsigned raw JSON payloads to prevent session forgery
      return null;
    }

    const dotIndex = trimmed.lastIndexOf(".");
    if (dotIndex <= 0) return null;

    const encoded = trimmed.slice(0, dotIndex);
    const providedSig = trimmed.slice(dotIndex + 1);
    if (!encoded || !/^[0-9a-f]{64}$/i.test(providedSig)) {
      return null;
    }

    const expectedSig = crypto
      .createHmac("sha256", getSessionSecret())
      .update(encoded)
      .digest("hex");

    const a = Buffer.from(providedSig.toLowerCase(), "utf8");
    const b = Buffer.from(expectedSig.toLowerCase(), "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const decodedJson = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(decodedJson) as Record<string, any>;
    if (!parsed || typeof parsed !== "object") return null;

    if (expectedScope && parsed._scope !== expectedScope) {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof parsed._exp !== "number" || nowSec > parsed._exp) {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

export async function getStudentSession(): Promise<StudentSession | null> {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
    if (!raw) return null;

    const parsed = parseSignedSession<StudentSession>(raw, "student");
    if (!parsed || !parsed.admNo || !parsed.studentId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!raw) return null;

    const parsed = parseSignedSession<AdminSession>(raw, "admin");
    if (
      !parsed ||
      !parsed.email ||
      (parsed.role !== "SUPER_ADMIN" && parsed.role !== "TEACHER")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Centralized role-based authorization guard for Staff & Admin Server Actions.
 */
export async function requireAdminSession(
  allowedRoles: readonly CBTUserRole[] = ["SUPER_ADMIN", "TEACHER"]
): Promise<{ ok: true; session: AdminSession } | { ok: false; error: string }> {
  const session = await getAdminSession().catch(() => null);
  if (!session) {
    return { ok: false, error: "Unauthorized: Authentication required." };
  }
  if (!allowedRoles.includes(session.role)) {
    return {
      ok: false,
      error: "Forbidden: You do not have permission to perform this action.",
    };
  }
  return { ok: true, session };
}

export function serializeResultAccessCookie(payload: ResultAccessSession): string {
  return serializeSignedSession(payload, "result", RESULT_SESSION_TTL_SEC);
}

function normalizeLookupToken(v?: string | null): string {
  return (v || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getResultAccessSession(
  admNo: string,
  session?: string,
  term?: string
): Promise<ResultAccessSession | null> {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(RESULT_COOKIE_NAME)?.value;
    if (!raw) return null;

    const parsed = parseSignedSession<ResultAccessSession>(raw, "result");
    if (!parsed || !parsed.admNo) return null;

    if (parsed.admNo.trim().toUpperCase() !== admNo.trim().toUpperCase()) {
      return null;
    }

    if (session && normalizeLookupToken(parsed.session) !== normalizeLookupToken(session)) {
      return null;
    }
    if (term && normalizeLookupToken(parsed.term) !== normalizeLookupToken(term)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
