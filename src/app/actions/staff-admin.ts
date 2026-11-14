"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/session";

/**
 * Super Admin: Create a new teacher or staff account
 */
export async function createTeacherAccountAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  teacher?: any;
}> {
  const session = await getAdminSession().catch(() => null);
  if (!session || session.role === "TEACHER") {
    return {
      success: false,
      error: "Unauthorized: Super Admin privileges are required to create staff accounts.",
    };
  }

  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const rawPassword = (formData.get("password") as string)?.trim();
  const assignedSubject = (formData.get("assignedSubject") as string)?.trim();
  const assignedClass = (formData.get("assignedClass") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const roleInput = (formData.get("role") as string)?.trim() || "TEACHER";

  if (!fullName || !email || !rawPassword) {
    return {
      success: false,
      error: "Staff Full Name, Institutional Email, and Password are required.",
    };
  }

  try {
    // Auto-heal table columns if missing
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_class" TEXT;
      ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_subject" TEXT;
      ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
      ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
    `).catch(() => {});

    // Check if email already exists
    const existing = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existing) {
      return {
        success: false,
        error: `A staff member with email "${email}" is already registered.`,
      };
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const role = roleInput === "SUPER_ADMIN" ? "SUPER_ADMIN" : "TEACHER";

    const user = await prisma.adminUser.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: role as any,
        assignedSubject: assignedSubject || "General",
        assignedClass: assignedClass || "All Classes",
        phone,
        status: "ACTIVE",
      },
    });

    revalidatePath("/admin/cbt");
    revalidatePath("/staff");

    return {
      success: true,
      teacher: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        assignedSubject: (user as any).assignedSubject,
        assignedClass: (user as any).assignedClass,
      },
    };
  } catch (err: any) {
    console.error("Create teacher error:", err);
    return {
      success: false,
      error: `Failed to create teacher account: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Super Admin: Fetch all teachers & administrative staff
 */
export async function getAllTeachersAction(): Promise<{
  success: boolean;
  error?: string;
  teachers: any[];
}> {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_class" TEXT;
      ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_subject" TEXT;
      ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
      ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
    `).catch(() => {});

    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        assignedClass: true,
        assignedSubject: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    return { success: true, teachers: users };
  } catch (err: any) {
    console.error("Get teachers error:", err);
    return { success: false, error: "Failed to load staff list.", teachers: [] };
  }
}

/**
 * Super Admin: Delete a teacher account
 */
export async function deleteTeacherAccountAction(teacherId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getAdminSession().catch(() => null);
  if (!session || session.role === "TEACHER") {
    return {
      success: false,
      error: "Unauthorized: Super Admin privileges are required to delete staff accounts.",
    };
  }
  try {
    await prisma.adminUser.delete({
      where: { id: teacherId },
    });
    revalidatePath("/admin/cbt");
    return { success: true };
  } catch (err: any) {
    console.error("Delete teacher error:", err);
    return { success: false, error: "Failed to delete teacher account." };
  }
}
