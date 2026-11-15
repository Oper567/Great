import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import net from "net";
import {
  checkRateLimit,
  constantTimeEqual,
  getClientIp,
  getRateLimitStatus,
  RATE_LIMIT_MAX_FAILED_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  releaseRateLimitAttempt,
} from "@/lib/security";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function testTcpPort(host: string, port: number, timeoutMs = 3000): Promise<{ open: boolean; error?: string; durationMs: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      if (!isResolved) {
        isResolved = true;
        socket.end();
        resolve({ open: true, durationMs: Date.now() - start });
      }
    });

    socket.on("error", (err) => {
      if (!isResolved) {
        isResolved = true;
        resolve({ open: false, error: err.message, durationMs: Date.now() - start });
      }
    });

    socket.on("timeout", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ open: false, error: `Connection timed out after ${timeoutMs}ms`, durationMs: Date.now() - start });
      }
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") || "";
  const configuredSecret = process.env.SETUP_SECRET || "";
  const adminSession = await getAdminSession().catch(() => null);
  const isSuperAdmin = adminSession?.role === "SUPER_ADMIN";

  const clientIp = getClientIp();
  const healthRateBucket = `health-secret-fail:ip:${clientIp}`;
  let rlWindowResetAt: number | undefined;

  if (!isSuperAdmin && secret.length > 0) {
    const lockStatus = getRateLimitStatus(healthRateBucket, RATE_LIMIT_MAX_FAILED_ATTEMPTS);
    if (!lockStatus.allowed) {
      return NextResponse.json(
        { error: "Too Many Requests" },
        {
          status: 429,
          headers: { "Retry-After": String(lockStatus.retryAfterSec) },
        }
      );
    }
    const rl = checkRateLimit(
      healthRateBucket,
      RATE_LIMIT_MAX_FAILED_ATTEMPTS,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too Many Requests" },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }
    rlWindowResetAt = rl.windowResetAt;
  }

  const hasValidSecret =
    configuredSecret.length >= 16 &&
    secret.length > 0 &&
    constantTimeEqual(secret, configuredSecret);

  if (hasValidSecret && rlWindowResetAt !== undefined) {
    releaseRateLimitAttempt(healthRateBucket, rlWindowResetAt);
  }

  const isAuthorizedDiagnostic = isSuperAdmin || hasValidSecret;

  let dbSuccess = false;
  let adminCount = 0;
  let dbError: string | null = null;

  try {
    adminCount = await prisma.adminUser.count();
    dbSuccess = true;
  } catch (err: any) {
    dbError = err?.message || String(err);
  }

  if (!isAuthorizedDiagnostic) {
    return NextResponse.json({
      status: dbSuccess ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    });
  }

  let targetHost = "localhost";
  let targetPort = 5432;

  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      targetHost = parsed.hostname || "localhost";
      targetPort = parsed.port ? parseInt(parsed.port, 10) : 5432;
    } catch {
      const match = process.env.DATABASE_URL.match(/@([^:/]+)(?::(\d+))?/);
      if (match) {
        targetHost = match[1];
        targetPort = match[2] ? parseInt(match[2], 10) : 5432;
      }
    }
  }

  const portReachable = await testTcpPort(targetHost, targetPort, 3000);
  const maskedUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")
    : "NOT_SET";

  return NextResponse.json({
    status: dbSuccess ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      databaseUrlConfigured: !!process.env.DATABASE_URL,
      activeDatabaseUrl: maskedUrl,
    },
    network: {
      targetHost,
      targetPort,
      portReachable,
    },
    database: {
      success: dbSuccess,
      adminUserCount: adminCount,
      error: dbError,
    },
  });
}
