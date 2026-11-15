"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { StudentSession, AdminSession } from "@/types/cbt";
import { isSeniorSecondaryClass } from "@/lib/cbt-utils";
import { checkRateLimit, getClientIp, isHttpsRequest, sanitizeErrorMessage } from "@/lib/security";

import {
  STUDENT_COOKIE_NAME,
  ADMIN_COOKIE_NAME,
  getStudentSession,
  getAdminSession,
  serializeSignedSession,
} from "@/lib/session";

export { getStudentSession, getAdminSession };

/**
 * Student Login Server Action
 * Inputs: admNo and surname
 * Matching: Match admNo strictly and surname case-insensitively.
 * Gatekeeper: Strictly restricts access to active Secondary (JSS 1-3 & SS 1-3) students.
 */
export async function studentLoginAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  student?: StudentSession;
}> {
  const rawAdmNo = formData.get("admNo");
  const rawSurname = formData.get("surname");

  const inputAdmNo = typeof rawAdmNo === "string" ? rawAdmNo.trim() : "";
  const inputSurname = typeof rawSurname === "string" ? rawSurname.trim() : "";

  if (!inputAdmNo || !inputSurname) {
    return {
      success: false,
      error: "Please enter both your Admission Number and Surname.",
    };
  }

  // Sliding-window rate limiting to prevent admission-number/surname enumeration
  const ip = getClientIp();
  const rl = checkRateLimit(`stu-login:${ip}:${inputAdmNo.toUpperCase()}`, 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return {
      success: false,
      error: `Too many login attempts. Please wait ${Math.ceil(rl.retryAfterSec / 60)} minute(s) and try again.`,
    };
  }

  try {
    const student = await prisma.student.findUnique({
      where: { admNo: inputAdmNo },
    });

    if (!student || student.surname.trim().toLowerCase() !== inputSurname.toLowerCase()) {
      return {
        success: false,
        error: "Invalid Admission Number or Surname. Please verify your credentials.",
      };
    }

    if (student.status && student.status.toUpperCase() !== "ACTIVE") {
      return {
        success: false,
        error: "Student account is currently inactive. Please contact the school administration.",
      };
    }

    if (!isSeniorSecondaryClass(student.currentClass)) {
      return {
        success: false,
        error: "Access Denied: The CBT portal is restricted to registered Secondary students.",
      };
    }

    const sessionData: StudentSession = {
      studentId: student.id,
      admNo: student.admNo,
      fullName: student.fullName,
      surname: student.surname,
      currentClass: student.currentClass,
      arm: (student as any).arm || "",
    };

    const sessionStr = serializeSignedSession(sessionData, "student", 60 * 60 * 12);
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
    const secureFlag = isHttpsRequest();

    cookies().set(STUDENT_COOKIE_NAME, sessionStr, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60 * 12,
    });

    cookies().set(`${STUDENT_COOKIE_NAME}_host`, sessionStr, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return {
      success: true,
      student: sessionData,
    };
  } catch (err: any) {
    const detail = err?.message || String(err);
    if (detail.includes("Can't reach database server") || detail.includes("ETIMEDOUT") || detail.includes("ECONNREFUSED")) {
      return {
        success: false,
        error: "Service temporarily unavailable: Could not connect to the academic database.",
      };
    }
    return {
      success: false,
      error: sanitizeErrorMessage(err, "Authentication failed. Please try again later."),
    };
  }
}

/**
 * Student Logout Server Action
 */
export async function studentLogoutAction(): Promise<{ success: boolean }> {
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
  if (cookieDomain) {
    cookies().set(STUDENT_COOKIE_NAME, "", {
      path: "/",
      domain: cookieDomain,
      maxAge: 0,
    });
  }
  cookies().delete(STUDENT_COOKIE_NAME);
  cookies().delete(`${STUDENT_COOKIE_NAME}_host`);
  return { success: true };
}

/**
 * Staff & Administrator Login Server Action
 * Strictly authenticates against hashed bcrypt passwords in the database (zero hardcoded credentials).
 */
export async function adminLoginAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  admin?: AdminSession;
}> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");

  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";

  if (!email || !password) {
    return {
      success: false,
      error: "Please provide both administrator email and password.",
    };
  }

  // Rate limiting against brute-force attacks
  const ip = getClientIp();
  const rl = checkRateLimit(`adm-login:${ip}:${email}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return {
      success: false,
      error: `Too many failed login attempts. Please wait ${Math.ceil(rl.retryAfterSec / 60)} minute(s) before trying again.`,
    };
  }

  try {
    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin || !admin.password) {
      return {
        success: false,
        error: "Invalid administrator credentials.",
      };
    }

    if (admin.status && admin.status.toUpperCase() !== "ACTIVE") {
      return {
        success: false,
        error: "This staff account is inactive. Please contact the Super Administrator.",
      };
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return {
        success: false,
        error: "Invalid administrator credentials.",
      };
    }

    const normalizedRole = admin.role === "SUPER_ADMIN" || admin.role === "TEACHER" ? admin.role : null;
    if (!normalizedRole) {
      return {
        success: false,
        error: "Account role configuration is invalid. Contact the Super Administrator.",
      };
    }

    const sessionData: AdminSession = {
      adminId: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: normalizedRole,
      assignedClass: (admin as any).assignedClass || null,
      assignedSubject: (admin as any).assignedSubject || null,
    };

    const signedAdminCookie = serializeSignedSession(sessionData, "admin", 60 * 60 * 12);
    const secureFlag = isHttpsRequest();

    cookies().set(ADMIN_COOKIE_NAME, signedAdminCookie, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return {
      success: true,
      admin: sessionData,
    };
  } catch (err: any) {
    const detail = err?.message || String(err);
    if (detail.includes("Can't reach database server") || detail.includes("ETIMEDOUT") || detail.includes("ECONNREFUSED")) {
      return {
        success: false,
        error: "Service temporarily unavailable: Could not connect to the academic database.",
      };
    }
    return {
      success: false,
      error: sanitizeErrorMessage(err, "Authentication error. Please try again later."),
    };
  }
}

/**
 * Admin Logout Server Action
 */
export async function adminLogoutAction(): Promise<{ success: boolean }> {
  cookies().delete(ADMIN_COOKIE_NAME);
  return { success: true };
}
