-- ============================================================================
-- Great-Favour Montessori School (GFMS)
-- cPanel PostgreSQL Production Schema DDL (Safe & Idempotent)
-- Fully compatible with phpPgAdmin, pgAdmin, and Prisma
-- ============================================================================
-- NOTE: This file uses CREATE TABLE IF NOT EXISTS and ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- It NEVER drops any tables or deletes data. Existing records remain 100% intact.
-- ============================================================================

-- 1. Create Role Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'TEACHER');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Admin & Staff Users Table
CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SUPER_ADMIN',
    "assigned_class" TEXT,
    "assigned_subject" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Students Table (with RegNo, Class & Stream/Arm)
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

-- 4. Exams Table
CREATE TABLE IF NOT EXISTS "exams" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "target_class" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "has_theory" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Objective Questions Table
CREATE TABLE IF NOT EXISTS "objective_questions" (
    "id" SERIAL PRIMARY KEY,
    "exam_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "image_url" TEXT
);

-- 6. Theory Questions Table
CREATE TABLE IF NOT EXISTS "theory_questions" (
    "id" SERIAL PRIMARY KEY,
    "exam_id" INTEGER NOT NULL,
    "question_num" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "max_score" INTEGER NOT NULL,
    "instructions" TEXT,
    "image_url" TEXT
);

-- 7. Exam Attempts Table
CREATE TABLE IF NOT EXISTS "exam_attempts" (
    "id" SERIAL PRIMARY KEY,
    "student_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "objective_score" INTEGER NOT NULL DEFAULT 0,
    "theory_score" INTEGER,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "student_answers" TEXT NOT NULL DEFAULT '{}',
    "is_transmitted_to_admin" BOOLEAN NOT NULL DEFAULT false,
    "teacher_comment" TEXT,
    "graded_by_teacher_name" TEXT
);

-- 8. Scratch Cards Table (Result Checker Authentication)
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

-- 9. Terminal Results Dossier Table
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Teacher Question Submissions Table
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

-- Ensure All Columns Exist Across Existing Tables
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "arm" TEXT DEFAULT '';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2025/2026';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';

ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "created_by" TEXT;

ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "is_transmitted_to_admin" BOOLEAN DEFAULT false;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "graded_by_teacher_name" TEXT;

ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "term_label" TEXT;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "total_possible" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_present" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_opened" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_absent" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "decision" TEXT DEFAULT 'PASSED';
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN DEFAULT true;

ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_class" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_subject" TEXT;

-- Foreign Keys & Constraints (Safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_attempts_student_id_exam_id_key') THEN
    ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_exam_id_key" UNIQUE ("student_id", "exam_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'terminal_results_adm_no_session_term_key') THEN
    ALTER TABLE "terminal_results" ADD CONSTRAINT "terminal_results_adm_no_session_term_key" UNIQUE ("adm_no", "session", "term");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_objective_questions_exam') THEN
    ALTER TABLE "objective_questions" ADD CONSTRAINT "fk_objective_questions_exam" 
      FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_theory_questions_exam') THEN
    ALTER TABLE "theory_questions" ADD CONSTRAINT "fk_theory_questions_exam" 
      FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exam_attempts_student') THEN
    ALTER TABLE "exam_attempts" ADD CONSTRAINT "fk_exam_attempts_student" 
      FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exam_attempts_exam') THEN
    ALTER TABLE "exam_attempts" ADD CONSTRAINT "fk_exam_attempts_exam" 
      FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_students_adm_no" ON "students"("adm_no");
CREATE INDEX IF NOT EXISTS "idx_students_class" ON "students"("current_class");
CREATE INDEX IF NOT EXISTS "idx_scratch_cards_pin" ON "scratch_cards"("pin");
CREATE INDEX IF NOT EXISTS "idx_scratch_cards_adm_no" ON "scratch_cards"("admNo");
CREATE INDEX IF NOT EXISTS "idx_terminal_results_adm_no" ON "terminal_results"("adm_no");
CREATE INDEX IF NOT EXISTS "idx_exam_attempts_student_exam" ON "exam_attempts"("student_id", "exam_id");
CREATE INDEX IF NOT EXISTS "idx_exam_attempts_is_completed" ON "exam_attempts"("is_completed");
CREATE INDEX IF NOT EXISTS "idx_objective_questions_exam_id" ON "objective_questions"("exam_id");
CREATE INDEX IF NOT EXISTS "idx_theory_questions_exam_id" ON "theory_questions"("exam_id");
CREATE INDEX IF NOT EXISTS "idx_exams_is_active" ON "exams"("is_active");
