"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseClassAndArm } from "@/lib/cbt-utils";

/**
 * Super Admin: Create a single student with generated or custom RegNo
 */
export async function createStudentAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  student?: any;
}> {
  const customAdmNo = (formData.get("admNo") as string)?.trim().toUpperCase();
  const surname = (formData.get("surname") as string)?.trim();
  const fullName = (formData.get("fullName") as string)?.trim();
  const rawCurrentClass = (formData.get("currentClass") as string)?.trim();
  const rawArm = (formData.get("arm") as string)?.trim() || "";
  const parsed = parseClassAndArm(rawCurrentClass, rawArm);
  const currentClass = parsed.baseLevel || rawCurrentClass;
  const arm = parsed.arm || rawArm;
  const gender = (formData.get("gender") as string)?.trim() || "MALE";
  const session = (formData.get("session") as string)?.trim() || "2025/2026";

  if (!surname || !fullName || !currentClass) {
    return {
      success: false,
      error: "Student Surname, Full Name, and Current Class are required.",
    };
  }

  // Generate RegNo if not supplied: GFMS/YYYY/XXXX
  const yearPrefix = new Date().getFullYear();
  let finalAdmNo = customAdmNo;
  if (!finalAdmNo) {
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    finalAdmNo = `GFMS/${yearPrefix}/${randomSeq}`;
  }

  try {
    // Auto-heal table columns if missing
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "arm" TEXT DEFAULT ''`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE'`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2025/2026'`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE'`);
    } catch (_) {}

    // Check if admNo already exists
    const existing = await prisma.student.findUnique({
      where: { admNo: finalAdmNo },
    });
    if (existing) {
      return {
        success: false,
        error: `A student with Registration Number "${finalAdmNo}" already exists.`,
      };
    }

    const student = await prisma.student.create({
      data: {
        admNo: finalAdmNo,
        surname,
        fullName,
        currentClass,
        arm,
        gender,
        session,
        status: "ACTIVE",
      },
    });

    revalidatePath("/admin/cbt");
    return { success: true, student };
  } catch (err: any) {
    console.error("Create student error:", err);
    return {
      success: false,
      error: `Failed to create student: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Super Admin: Batch generate student RegNos for a class
 */
export async function generateBatchStudentsAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  count?: number;
  students?: any[];
}> {
  const rawCurrentClass = (formData.get("currentClass") as string)?.trim();
  const rawArm = (formData.get("arm") as string)?.trim() || "";
  const parsed = parseClassAndArm(rawCurrentClass, rawArm);
  const currentClass = parsed.baseLevel || rawCurrentClass;
  const arm = parsed.arm || rawArm;
  const session = (formData.get("session") as string)?.trim() || "2025/2026";
  const quantity = Math.min(Math.max(parseInt((formData.get("quantity") as string) || "5", 10), 1), 100);

  if (!currentClass) {
    return { success: false, error: "Please select a target class for batch registration." };
  }

  try {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "arm" TEXT DEFAULT ''`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE'`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2025/2026'`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE'`);
    } catch (_) {}

    const yearPrefix = new Date().getFullYear();
    const createdList = [];

    for (let i = 0; i < quantity; i++) {
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const admNo = `GFMS/${yearPrefix}/${randomSeq}`;

      // Candidate surname defaults to CANDIDATE
      const surname = `Candidate${randomSeq}`;
      const fullName = `Candidate ${currentClass}${arm ? ` (${arm})` : ""} #${i + 1}`;

      try {
        const student = await prisma.student.create({
          data: {
            admNo,
            surname,
            fullName,
            currentClass,
            arm,
            gender: i % 2 === 0 ? "MALE" : "FEMALE",
            session,
            status: "ACTIVE",
          },
        });
        createdList.push(student);
      } catch {
        // Continue if collision
      }
    }

    revalidatePath("/admin/cbt");
    return { success: true, count: createdList.length, students: createdList };
  } catch (err: any) {
    console.error("Batch generate students error:", err);
    return {
      success: false,
      error: `Failed to batch generate students: ${err?.message || "Unknown error"}`,
    };
  }
}

/**
 * Super Admin: Fetch all registered students
 */
export async function getAllStudentsAction(): Promise<{
  success: boolean;
  error?: string;
  students: any[];
}> {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "arm" TEXT DEFAULT '';
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE';
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2025/2026';
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
    `).catch(() => {});

    const students = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { attempts: true },
        },
      },
    });

    return { success: true, students };
  } catch (err: any) {
    console.error("Get all students error:", err);
    return { success: false, error: "Failed to load student registry.", students: [] };
  }
}

/**
 * Super Admin: Update a student record
 */
export async function updateStudentAction(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  const studentId = parseInt((formData.get("studentId") as string) || "0", 10);
  const surname = (formData.get("surname") as string)?.trim();
  const fullName = (formData.get("fullName") as string)?.trim();
  const rawCurrentClass = (formData.get("currentClass") as string)?.trim();
  const rawArm = (formData.get("arm") as string)?.trim();
  const parsed = parseClassAndArm(rawCurrentClass, rawArm);
  const currentClass = parsed.baseLevel || rawCurrentClass;
  const arm = rawArm !== undefined ? (rawArm === "" ? parsed.arm : parsed.arm || rawArm) : undefined;
  const gender = (formData.get("gender") as string)?.trim();

  if (!studentId || !surname || !fullName || !currentClass) {
    return { success: false, error: "Invalid student update parameters." };
  }

  try {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "arm" TEXT DEFAULT ''`);
    } catch (_) {}

    await prisma.student.update({
      where: { id: studentId },
      data: {
        surname,
        fullName,
        currentClass,
        ...(arm !== undefined ? { arm } : {}),
        ...(gender ? { gender } : {}),
      },
    });
    revalidatePath("/admin/cbt");
    return { success: true };
  } catch (err: any) {
    console.error("Update student error:", err);
    return { success: false, error: "Failed to update student." };
  }
}

/**
 * Super Admin: Delete a student record
 */
export async function deleteStudentAction(studentId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await prisma.student.delete({
      where: { id: studentId },
    });
    revalidatePath("/admin/cbt");
    return { success: true };
  } catch (err: any) {
    console.error("Delete student error:", err);
    return { success: false, error: "Failed to delete student record." };
  }
}
