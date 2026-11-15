"use server";

import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitStatus,
  isHttpsRequest,
  RATE_LIMIT_MAX_FAILED_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  releaseRateLimitAttempt,
} from "@/lib/security";
import { RESULT_COOKIE_NAME, serializeResultAccessCookie } from "@/lib/session";

export interface VerifyCardResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
  cardInfo?: {
    admNo: string;
    fullName?: string;
    session?: string;
    term?: string;
    usageCount: number;
    maxUsage: number;
    remainingUsage: number;
  };
}

/**
 * Validates a scratch card PIN according to GFMS strict "PIN Lock" protocol,
 * enforces rate limits and atomic check accounting, and issues a signed HttpOnly
 * access cookie bound to the verified Admission Number, Session, and Term.
 */
export async function verifyScratchCardAction(
  prevState: VerifyCardResult | null,
  formData: FormData
): Promise<VerifyCardResult> {
  const rawFullName = formData.get("fullName");
  const rawAdmNo = formData.get("admNo");
  const rawSession = formData.get("session");
  const rawTerm = formData.get("term");
  const rawPin = formData.get("pin");

  const fullName = typeof rawFullName === "string" ? rawFullName.trim() : "";
  const inputAdmNo = typeof rawAdmNo === "string" ? rawAdmNo.trim().toUpperCase() : "";
  const session = typeof rawSession === "string" ? rawSession.trim() : "2025/2026";
  const term = typeof rawTerm === "string" ? rawTerm.trim() : "Third Term";
  const inputPin = typeof rawPin === "string" ? rawPin.trim().toUpperCase() : "";

  const clientIp = getClientIp();
  const ipRateBucket = `pin-fail:ip:${clientIp}`;
  const lockStatus = getRateLimitStatus(ipRateBucket, RATE_LIMIT_MAX_FAILED_ATTEMPTS);
  if (!lockStatus.allowed) {
    return {
      success: false,
      error: `Too many failed verification attempts. Please wait ${Math.ceil(lockStatus.retryAfterSec / 60)} minute(s) before trying again.`,
    };
  }

  if (!fullName) {
    return { success: false, error: "Please enter Student Full Name." };
  }
  if (!inputAdmNo) {
    return { success: false, error: "Please enter Admission Number." };
  }
  if (!session) {
    return { success: false, error: "Please select Academic Session." };
  }
  if (!term) {
    return { success: false, error: "Please select Academic Term." };
  }
  if (!inputPin) {
    return { success: false, error: "Please enter Scratch Card PIN." };
  }

  // Reserve a failed-attempt slot synchronously per IP (max 5 failed attempts per 15 minutes per IP);
  // released only upon verified card success to block brute-force PIN guessing across any AdmNo.
  const rateCheck = checkRateLimit(
    ipRateBucket,
    RATE_LIMIT_MAX_FAILED_ATTEMPTS,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Too many failed verification attempts. Please wait ${Math.ceil(rateCheck.retryAfterSec / 60)} minute(s) before trying again.`,
    };
  }

  try {
    const cleanPin = inputPin.trim().toUpperCase();

    // 1. Look up ScratchCard in database or persistent store
    let card: any = null;
    let fromDb = false;
    try {
      card = await prisma.scratchCard.findUnique({
        where: { pin: cleanPin },
      });
      if (card) fromDb = true;
    } catch {}

    if (!card) {
      const { findInLocalScratchCardsStore } = await import("@/lib/scratch-card-store");
      card = findInLocalScratchCardsStore(cleanPin);
    }

    if (!card) {
      return {
        success: false,
        error: "Invalid or Unregistered PIN. This scratch card has not been generated or issued by the school administration.",
      };
    }

    // 2. Check exhaustion limit
    const effectiveMaxUsage = card.maxUsage || 3;
    if ((card.usageCount || 0) >= effectiveMaxUsage || card.status?.toLowerCase() === "exhausted") {
      return {
        success: false,
        error: "Scratch Card Exhausted: This PIN has reached its maximum check limit (strictly 3 checks permitted per card).",
      };
    }

    // 3. Verify PIN Lock binding
    if (card.admNo !== null && card.admNo.trim() !== "") {
      if (card.admNo.trim().toUpperCase() !== inputAdmNo) {
        return {
          success: false,
          error: "PIN Lock Violation: This scratch card PIN is already locked to a different Student Admission Number.",
        };
      }
    }

    // 4. Verify result exists for this student, session & term via internal server helper
    const { findPublishedResultForLookup } = await import("@/lib/result-lookup");
    const resultCheck = await findPublishedResultForLookup(inputAdmNo, session, term).catch(() => ({
      success: false,
      result: null,
    }));
    const hasUploadedResult = !!(resultCheck?.success && resultCheck.result);
    const secureCookie = isHttpsRequest();

    if (!hasUploadedResult) {
      // Grant a pending-only scoped view token (strictly cannot unlock ReportCardView)
      const pendingToken = serializeResultAccessCookie({
        admNo: inputAdmNo,
        session,
        term,
        pendingOnly: true,
      });
      cookies().set(RESULT_COOKIE_NAME, pendingToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
        path: "/",
        maxAge: 60 * 30,
      });

      const params = new URLSearchParams({
        name: fullName,
        session,
        term,
        pending: "true",
        cardPreserved: "true",
      });

      releaseRateLimitAttempt(ipRateBucket, rateCheck.windowResetAt);

      return {
        success: true,
        redirectUrl: `/result/${encodeURIComponent(inputAdmNo)}?${params.toString()}`,
        cardInfo: {
          admNo: inputAdmNo,
          fullName,
          session,
          term,
          usageCount: card.usageCount || 0,
          maxUsage: effectiveMaxUsage,
          remainingUsage: effectiveMaxUsage - (card.usageCount || 0),
        },
      };
    }

    // 5. Result exists: Atomically increment usageCount in DB to prevent concurrent double-check race conditions
    const isFreshCard = card.admNo === null || card.admNo.trim() === "";
    const updatedUsageCount = (card.usageCount || 0) + 1;
    const isNowExhausted = updatedUsageCount >= effectiveMaxUsage;

    const updatePayload: {
      usageCount: number;
      maxUsage: number;
      status: "active" | "exhausted";
      admNo?: string;
      session?: string;
      term?: string;
    } = {
      usageCount: updatedUsageCount,
      maxUsage: effectiveMaxUsage,
      status: isNowExhausted ? "exhausted" : "active",
      ...(isFreshCard ? { admNo: inputAdmNo, session, term } : {}),
    };

    if (fromDb) {
      const atomicRes = await prisma.scratchCard
        .updateMany({
          where: {
            id: card.id,
            usageCount: { lt: effectiveMaxUsage },
            ...(isFreshCard
              ? { OR: [{ admNo: null }, { admNo: "" }] }
              : { admNo: card.admNo }),
          },
          data: updatePayload,
        })
        .catch(() => ({ count: 0 }));

      if (atomicRes.count === 0) {
        return {
          success: false,
          error: "Scratch Card Exhausted or Locked: This PIN could not be redeemed. Please verify your card balance.",
        };
      }
    }

    const { updateInLocalScratchCardsStore } = await import("@/lib/scratch-card-store");
    updateInLocalScratchCardsStore(cleanPin, updatePayload);

    // Issue signed HttpOnly access token bound to exact (admNo, session, term, checkCount, maxCount)
    const accessToken = serializeResultAccessCookie({
      admNo: inputAdmNo,
      session,
      term,
      pendingOnly: false,
      checkCount: updatedUsageCount,
      maxCount: effectiveMaxUsage,
    });
    cookies().set(RESULT_COOKIE_NAME, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 2 * 60 * 60,
    });

    const params = new URLSearchParams({
      session,
      term,
    });

    releaseRateLimitAttempt(ipRateBucket, rateCheck.windowResetAt);

    return {
      success: true,
      redirectUrl: `/result/${encodeURIComponent(inputAdmNo)}?${params.toString()}`,
      cardInfo: {
        admNo: inputAdmNo,
        fullName,
        session,
        term,
        usageCount: updatedUsageCount,
        maxUsage: effectiveMaxUsage,
        remainingUsage: effectiveMaxUsage - updatedUsageCount,
      },
    };
  } catch (error) {
    console.error("Scratch card verification failed:", error);
    return {
      success: false,
      error: "A system error occurred while validating your PIN. Please try again.",
    };
  }
}
