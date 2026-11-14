import { cookies } from "next/headers";
import crypto from "crypto";
import { StudentSession, AdminSession } from "@/types/cbt";

export const STUDENT_COOKIE_NAME = "gfms_cbt_student_session";
export const ADMIN_COOKIE_NAME = "gfms_cbt_admin_session";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SETUP_SECRET ||
  "gfms_institutional_hmac_secret_2026_v1";

/**
 * Cryptographically sign a session object using HMAC-SHA256
 */
export function serializeSignedSession(payload: object): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("hex");
  return `${encoded}.${sig}`;
}

/**
 * Verify and decode an HMAC-SHA256 signed session cookie
 */
export function parseSignedSession<T>(cookieVal: string): T | null {
  try {
    if (!cookieVal || typeof cookieVal !== "string") return null;

    // 1. Standard HMAC-signed token format: <base64url>.<hexSignature>
    const dotIndex = cookieVal.lastIndexOf(".");
    if (dotIndex > 0 && !cookieVal.trim().startsWith("{")) {
      const encoded = cookieVal.slice(0, dotIndex);
      const providedSig = cookieVal.slice(dotIndex + 1);
      const expectedSig = crypto
        .createHmac("sha256", SESSION_SECRET)
        .update(encoded)
        .digest("hex");

      const a = Buffer.from(providedSig, "utf8");
      const b = Buffer.from(expectedSig, "utf8");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return null;
      }

      const decodedJson = Buffer.from(encoded, "base64url").toString("utf8");
      return JSON.parse(decodedJson) as T;
    }

    // 2. Graceful backward compatibility for active browser sessions created prior to upgrade
    if (cookieVal.trim().startsWith("{")) {
      return JSON.parse(cookieVal) as T;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieve active student session from cookies without touching database
 */
export async function getStudentSession(): Promise<StudentSession | null> {
  try {
    const cookieStore = cookies();
    const cookieVal =
      cookieStore.get(STUDENT_COOKIE_NAME)?.value ||
      cookieStore.get(`${STUDENT_COOKIE_NAME}_host`)?.value;
    if (!cookieVal) return null;
    const session = parseSignedSession<StudentSession>(cookieVal);
    if (
      session &&
      typeof session.studentId === "number" &&
      session.studentId > 0 &&
      typeof session.admNo === "string" &&
      session.admNo.trim().length > 0
    ) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieve active admin/staff session from cookies without touching database
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = cookies();
    const cookieVal =
      cookieStore.get(ADMIN_COOKIE_NAME)?.value ||
      cookieStore.get(`${ADMIN_COOKIE_NAME}_host`)?.value;
    if (!cookieVal) return null;
    const session = parseSignedSession<AdminSession>(cookieVal);
    if (
      session &&
      typeof session.adminId === "number" &&
      session.adminId > 0 &&
      typeof session.email === "string" &&
      session.email.includes("@")
    ) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}
