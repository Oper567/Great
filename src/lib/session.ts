import { cookies } from "next/headers";
import { StudentSession, AdminSession } from "@/types/cbt";

export const STUDENT_COOKIE_NAME = "gfms_cbt_student_session";
export const ADMIN_COOKIE_NAME = "gfms_cbt_admin_session";

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
    const session = JSON.parse(cookieVal) as StudentSession;
    if (session?.studentId && session?.admNo) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Retrieve active admin session from cookies without touching database
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = cookies();
    const cookieVal =
      cookieStore.get(ADMIN_COOKIE_NAME)?.value ||
      cookieStore.get(`${ADMIN_COOKIE_NAME}_host`)?.value;
    if (!cookieVal) return null;
    const session = JSON.parse(cookieVal) as AdminSession;
    if (session?.adminId && session?.email) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}
