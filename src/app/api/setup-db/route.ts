import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // Basic security check: must provide secret key
  const validSecret = process.env.SETUP_SECRET || "gfms2025";
  if (secret !== validSecret) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Invalid or missing 'secret' query parameter. Append '?secret=gfms2025' to the URL.",
      },
      { status: 401 }
    );
  }

  const logs: string[] = [];

  try {
    // 1. Create Role Enum
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'TEACHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    logs.push("Enum 'Role' verified.");

    // 2. Create admin_users
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "admin_users" (
        "id" SERIAL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "full_name" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'SUPER_ADMIN',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logs.push("Table 'admin_users' verified.");

    // 3. Create students
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "students" (
        "id" SERIAL PRIMARY KEY,
        "adm_no" TEXT NOT NULL UNIQUE,
        "surname" TEXT NOT NULL,
        "full_name" TEXT NOT NULL,
        "current_class" TEXT NOT NULL,
        "arm" TEXT DEFAULT '',
        "gender" TEXT DEFAULT 'MALE',
        "session" TEXT DEFAULT '2025/2026',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "arm" TEXT DEFAULT '';
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE';
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2025/2026';
      ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
    `);
    logs.push("Table 'students' verified (with arm column).");

    // 4. Create exams
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "exams" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "target_class" TEXT NOT NULL,
        "exam_date" TIMESTAMP(3) NOT NULL,
        "duration_minutes" INTEGER NOT NULL DEFAULT 60,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "is_archived" BOOLEAN NOT NULL DEFAULT false,
        "has_theory" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false;
    `);
    logs.push("Table 'exams' verified.");

    // 5. Create objective_questions
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "objective_questions" (
        "id" SERIAL PRIMARY KEY,
        "exam_id" INTEGER NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "question_text" TEXT NOT NULL,
        "options" TEXT NOT NULL,
        "correct_answer" TEXT NOT NULL,
        "points" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
        "image_url" TEXT
      );
      ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
      ALTER TABLE "objective_questions" ALTER COLUMN "points" TYPE DOUBLE PRECISION USING points::double precision;
      ALTER TABLE "objective_questions" ALTER COLUMN "points" SET DEFAULT 0.5;
    `);
    logs.push("Table 'objective_questions' verified.");

    // 6. Create theory_questions
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "theory_questions" (
        "id" SERIAL PRIMARY KEY,
        "exam_id" INTEGER NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "question_num" INTEGER NOT NULL,
        "question_text" TEXT NOT NULL,
        "max_score" INTEGER NOT NULL,
        "instructions" TEXT,
        "image_url" TEXT
      );
      ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
    `);
    logs.push("Table 'theory_questions' verified.");

    // 7. Create exam_attempts
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "exam_attempts" (
        "id" SERIAL PRIMARY KEY,
        "student_id" INTEGER NOT NULL REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "exam_id" INTEGER NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "submitted_at" TIMESTAMP(3),
        "is_completed" BOOLEAN NOT NULL DEFAULT false,
        "objective_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "theory_score" DOUBLE PRECISION,
        "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "student_answers" TEXT NOT NULL DEFAULT '{}',
        CONSTRAINT "exam_attempts_student_id_exam_id_key" UNIQUE ("student_id", "exam_id")
      );
      ALTER TABLE "exam_attempts" ALTER COLUMN "objective_score" TYPE DOUBLE PRECISION USING objective_score::double precision;
      ALTER TABLE "exam_attempts" ALTER COLUMN "total_score" TYPE DOUBLE PRECISION USING total_score::double precision;
      ALTER TABLE "exam_attempts" ALTER COLUMN "theory_score" TYPE DOUBLE PRECISION USING theory_score::double precision;
    `);
    logs.push("Table 'exam_attempts' verified.");

    // 8. Create scratch_cards
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "scratch_cards" (
        "id" TEXT PRIMARY KEY,
        "pin" TEXT NOT NULL UNIQUE,
        "serialNumber" TEXT UNIQUE,
        "admNo" TEXT,
        "usageCount" INTEGER NOT NULL DEFAULT 0,
        "maxUsage" INTEGER NOT NULL DEFAULT 3,
        "status" TEXT NOT NULL DEFAULT 'active',
        "session" TEXT,
        "term" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "scratch_cards_pin_idx" ON "scratch_cards"("pin");
      CREATE INDEX IF NOT EXISTS "scratch_cards_admNo_idx" ON "scratch_cards"("admNo");
    `);
    logs.push("Table 'scratch_cards' verified.");

    // 8b. Create terminal_results
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "terminal_results" (
        "id" SERIAL PRIMARY KEY,
        "adm_no" TEXT NOT NULL,
        "student_name" TEXT NOT NULL,
        "class_name" TEXT NOT NULL,
        "session" TEXT NOT NULL,
        "term" TEXT NOT NULL,
        "term_label" TEXT,
        "total_score" INTEGER NOT NULL DEFAULT 0,
        "total_possible" INTEGER NOT NULL DEFAULT 0,
        "average" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "position" INTEGER,
        "number_in_class" INTEGER,
        "next_class" TEXT,
        "next_term_begins" TEXT,
        "days_present" INTEGER DEFAULT 0,
        "days_opened" INTEGER DEFAULT 0,
        "days_absent" INTEGER DEFAULT 0,
        "decision" TEXT DEFAULT 'PASSED',
        "teacher_remark" TEXT,
        "principal_remark" TEXT,
        "result_payload" TEXT NOT NULL,
        "is_published" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "terminal_results_adm_no_session_term_key" UNIQUE ("adm_no", "session", "term")
      );
      CREATE INDEX IF NOT EXISTS "terminal_results_adm_no_idx" ON "terminal_results"("adm_no");
    `);
    logs.push("Table 'terminal_results' verified.");

    // 8c. Create teacher_question_submissions
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "teacher_question_submissions" (
        "id" SERIAL PRIMARY KEY,
        "teacher_name" TEXT NOT NULL,
        "teacher_email" TEXT,
        "subject" TEXT NOT NULL,
        "target_class" TEXT NOT NULL,
        "submission_type" TEXT NOT NULL DEFAULT 'MANUAL',
        "duration_minutes" INTEGER NOT NULL DEFAULT 60,
        "total_marks" INTEGER NOT NULL DEFAULT 100,
        "question_data" TEXT,
        "image_url" TEXT,
        "instructions" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "admin_feedback" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logs.push("Table 'teacher_question_submissions' verified.");

    // 9. Seed Super Admin
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.adminUser.upsert({
      where: { email: "greatfavourmontessorischool@gmail.com" },
      update: {
        fullName: "Hon Okolie Peter Isioma JP MCArb",
        password: adminPassword,
        role: "SUPER_ADMIN",
        phone: "+234 905 894 3474",
      },
      create: {
        email: "greatfavourmontessorischool@gmail.com",
        fullName: "Hon Okolie Peter Isioma JP MCArb",
        password: adminPassword,
        role: "SUPER_ADMIN",
        phone: "+234 905 894 3474",
      },
    });
    // Also ensure legacy admin alias
    await prisma.adminUser.upsert({
      where: { email: "admin@gfms.edu.ng" },
      update: {
        fullName: "Hon Okolie Peter Isioma JP MCArb",
        password: adminPassword,
        role: "SUPER_ADMIN",
      },
      create: {
        email: "admin@gfms.edu.ng",
        fullName: "Hon Okolie Peter Isioma JP MCArb",
        password: adminPassword,
        role: "SUPER_ADMIN",
      },
    });
    logs.push(`Super Admin ready: ${admin.email}`);

    // 10. Seed Demo Students
    const students = [
      { admNo: "GFMS/SS/2024/001", surname: "Okeke", fullName: "Somtochukwu Grace Okeke", currentClass: "SS 2 (Science)" },
      { admNo: "GFMS/SS/2024/002", surname: "Eze", fullName: "Chidubem Emmanuel Eze", currentClass: "SS 2 (Art)" },
      { admNo: "GFMS/SS/2024/003", surname: "Bello", fullName: "Aisha Fatima Bello", currentClass: "SS 3 (Science)" },
      { admNo: "GFMS/JSS/2024/088", surname: "Okafor", fullName: "Kamsiyochukwu David Okafor", currentClass: "JSS 2 Diamond" },
    ];
    for (const s of students) {
      await prisma.student.upsert({
        where: { admNo: s.admNo },
        update: s,
        create: s,
      });
    }
    logs.push(`Seeded ${students.length} students.`);

    // 11. Seed Scratch Cards (Strictly 3 Checks Allowed)
    const cards = [
      { id: "cuid_card_01", pin: "GFMS-8492-1049", serialNumber: "SN-GFMS-2026-001" },
      { id: "cuid_card_02", pin: "GFMS-1122-3344", serialNumber: "SN-GFMS-2026-002" },
      { id: "cuid_card_03", pin: "GFMS-9988-7766", serialNumber: "SN-GFMS-2026-003" },
    ];
    for (const c of cards) {
      await prisma.scratchCard.upsert({
        where: { pin: c.pin },
        update: { maxUsage: 3 },
        create: {
          id: c.id,
          pin: c.pin,
          serialNumber: c.serialNumber,
          usageCount: 0,
          maxUsage: 3,
          status: "active",
          session: "2025/2026",
          term: "THIRD_TERM",
        },
      });
    }
    logs.push(`Seeded ${cards.length} scratch cards.`);

    // 12. Seed Sample Exams
    const exam1 = await prisma.exam.upsert({
      where: { id: 1 },
      update: {
        title: "First Term Examination 2024/2025",
        subject: "Mathematics",
        targetClass: "SS 2",
        isActive: true,
        hasTheory: true,
      },
      create: {
        id: 1,
        title: "First Term Examination 2024/2025",
        subject: "Mathematics",
        targetClass: "SS 2",
        examDate: new Date(),
        durationMinutes: 60,
        isActive: true,
        hasTheory: true,
      },
    });

    const exam2 = await prisma.exam.upsert({
      where: { id: 2 },
      update: {
        title: "First Term Examination 2024/2025",
        subject: "English Language",
        targetClass: "SS 1",
        isActive: true,
        hasTheory: false,
      },
      create: {
        id: 2,
        title: "First Term Examination 2024/2025",
        subject: "English Language",
        targetClass: "SS 1",
        examDate: new Date(),
        durationMinutes: 60,
        isActive: true,
        hasTheory: false,
      },
    });
    logs.push("Seeded sample exams.");

    // 13. Seed Objective Questions for Exam 1
    const objCount = await prisma.objectiveQuestion.count({ where: { examId: 1 } });
    if (objCount === 0) {
      await prisma.objectiveQuestion.createMany({
        data: [
          {
            examId: 1,
            questionText: "Solve for x: 2x + 5 = 15",
            options: '["3", "5", "7", "10"]',
            correctAnswer: "B",
            points: 1,
          },
          {
            examId: 1,
            questionText: "What is the value of pi (π) approximately?",
            options: '["3.142", "2.178", "1.414", "0.577"]',
            correctAnswer: "A",
            points: 1,
          },
          {
            examId: 1,
            questionText: "Find the slope of the line y = 3x - 4",
            options: '["-4", "3", "4", "1/3"]',
            correctAnswer: "B",
            points: 1,
          },
        ],
      });
      logs.push("Seeded objective questions for Exam 1.");
    }

    // 14. Seed Theory Questions for Exam 1
    const theoryCount = await prisma.theoryQuestion.count({ where: { examId: 1 } });
    if (theoryCount === 0) {
      await prisma.theoryQuestion.createMany({
        data: [
          {
            examId: 1,
            questionNum: 1,
            questionText: "Prove that the sum of the interior angles of a triangle equals 180 degrees.",
            maxScore: 10,
            instructions: "Write out the full geometric proof clearly.",
          },
          {
            examId: 1,
            questionNum: 2,
            questionText: "Given quadratic equation 2x^2 + 5x - 3 = 0, solve using the quadratic formula.",
            maxScore: 10,
            instructions: "Show all working steps.",
          },
        ],
      });
      logs.push("Seeded theory questions for Exam 1.");
    }

    // 15. Synchronize All Autoincrement Sequences to prevent P2002 duplicate key errors
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        tbl text;
        max_id int;
        seq_name text;
      BEGIN
        FOR tbl IN 
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name IN ('exams', 'students', 'objective_questions', 'theory_questions', 'exam_attempts', 'admin_users', 'teacher_question_submissions', 'terminal_results')
        LOOP
          BEGIN
            seq_name := pg_get_serial_sequence('"' || tbl || '"', 'id');
            IF seq_name IS NOT NULL THEN
              EXECUTE 'SELECT COALESCE(MAX(id), 0) FROM "' || tbl || '"' INTO max_id;
              IF max_id > 0 THEN
                EXECUTE 'SELECT setval(''' || seq_name || ''', ' || max_id || ', true)';
              ELSE
                EXECUTE 'SELECT setval(''' || seq_name || ''', 1, false)';
              END IF;
            END IF;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END LOOP;
      END $$;
    `);
    logs.push("Synchronized all PostgreSQL autoincrement sequences (exams, questions, attempts, students).");

    return NextResponse.json({
      status: "success",
      message: "Database schema and seed data successfully initialized!",
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error?.message || String(error),
        logs,
      },
      { status: 500 }
    );
  }
}
