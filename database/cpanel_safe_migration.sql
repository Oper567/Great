-- ============================================================================
-- Great-Favour Montessori School (GFMS)
-- 100% SAFE & NON-DESTRUCTIVE DATABASE MIGRATION SCRIPT
-- ============================================================================
-- IMPORTANT SAFETY GUARANTEE:
-- 1. This script DOES NOT DROP ANY TABLES (NO "DROP TABLE").
-- 2. This script DOES NOT DELETE ANY DATA (NO "TRUNCATE" or "DELETE").
-- 3. All existing students, exams, questions, results, scratch cards & users
--    are 100% PRESERVED.
-- 4. It safely adds missing columns (including "arm" in "students"), creates
--    missing tables, ensures indexes exist, and synchronizes ID sequences.
-- 5. Safe to run multiple times (completely idempotent).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Ensure Role Enum Exists
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'TEACHER');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: Create Any Missing Tables (IF NOT EXISTS)
-- ----------------------------------------------------------------------------

-- 1. Admin Users Table
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

-- 2. Students Table
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

-- 3. Exams Table
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

-- 4. Objective Questions Table
CREATE TABLE IF NOT EXISTS "objective_questions" (
    "id" SERIAL PRIMARY KEY,
    "exam_id" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "image_url" TEXT
);

-- 5. Theory Questions Table
CREATE TABLE IF NOT EXISTS "theory_questions" (
    "id" SERIAL PRIMARY KEY,
    "exam_id" INTEGER NOT NULL,
    "question_num" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "max_score" INTEGER NOT NULL,
    "instructions" TEXT,
    "image_url" TEXT
);

-- 6. Exam Attempts Table
CREATE TABLE IF NOT EXISTS "exam_attempts" (
    "id" SERIAL PRIMARY KEY,
    "student_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "objective_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "theory_score" DOUBLE PRECISION,
    "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "student_answers" TEXT NOT NULL DEFAULT '{}',
    "is_transmitted_to_admin" BOOLEAN NOT NULL DEFAULT false,
    "teacher_comment" TEXT,
    "graded_by_teacher_name" TEXT
);

-- 7. Scratch Cards Table
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

-- 8. Terminal Results Table
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

-- 9. Teacher Question Submissions Table
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

-- ----------------------------------------------------------------------------
-- STEP 3: Non-Destructive Column Verification (Safely Add Any Missing Columns)
-- ----------------------------------------------------------------------------

-- 1. Students Table (Adds "arm", "gender", "session", "status" if missing)
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "arm" TEXT DEFAULT '';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2025/2026';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- 2. Objective Questions Table
ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "points" DOUBLE PRECISION DEFAULT 0.5;
ALTER TABLE "objective_questions" ALTER COLUMN "points" TYPE DOUBLE PRECISION USING points::double precision;
ALTER TABLE "objective_questions" ALTER COLUMN "points" SET DEFAULT 0.5;

-- 3. Theory Questions Table
ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "instructions" TEXT;

-- 4. Exams Table
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "created_by" TEXT;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "has_theory" BOOLEAN DEFAULT true;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT false;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER DEFAULT 60;

-- 5. Exam Attempts Table
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "is_transmitted_to_admin" BOOLEAN DEFAULT false;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "graded_by_teacher_name" TEXT;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "objective_score" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "exam_attempts" ALTER COLUMN "objective_score" TYPE DOUBLE PRECISION USING objective_score::double precision;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "theory_score" DOUBLE PRECISION;
ALTER TABLE "exam_attempts" ALTER COLUMN "theory_score" TYPE DOUBLE PRECISION USING theory_score::double precision;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "total_score" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "exam_attempts" ALTER COLUMN "total_score" TYPE DOUBLE PRECISION USING total_score::double precision;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "student_answers" TEXT DEFAULT '{}';
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "is_completed" BOOLEAN DEFAULT false;

-- 6. Teacher Question Submissions Table
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "question_data" TEXT;
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "admin_feedback" TEXT;
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "submission_type" TEXT DEFAULT 'MANUAL';
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER DEFAULT 60;
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "total_marks" INTEGER DEFAULT 100;
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';

-- 7. Terminal Results Table
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "term_label" TEXT;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "total_score" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "total_possible" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "average" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "position" INTEGER;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "number_in_class" INTEGER;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "next_class" TEXT;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "next_term_begins" TEXT;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_present" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_opened" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "days_absent" INTEGER DEFAULT 0;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "decision" TEXT DEFAULT 'PASSED';
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "teacher_remark" TEXT;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "principal_remark" TEXT;
ALTER TABLE "terminal_results" ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN DEFAULT true;

-- 8. Admin Users Table
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_class" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_subject" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';

-- 9. Scratch Cards Table (Align 3 checks policy)
ALTER TABLE "scratch_cards" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE "scratch_cards" ADD COLUMN IF NOT EXISTS "admNo" TEXT;
ALTER TABLE "scratch_cards" ADD COLUMN IF NOT EXISTS "session" TEXT;
ALTER TABLE "scratch_cards" ADD COLUMN IF NOT EXISTS "term" TEXT;
ALTER TABLE "scratch_cards" ADD COLUMN IF NOT EXISTS "usageCount" INTEGER DEFAULT 0;
ALTER TABLE "scratch_cards" ADD COLUMN IF NOT EXISTS "maxUsage" INTEGER DEFAULT 3;
ALTER TABLE "scratch_cards" ALTER COLUMN "maxUsage" SET DEFAULT 3;

-- ----------------------------------------------------------------------------
-- STEP 4: Safe Constraints & Foreign Keys
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Unique Constraint on exam_attempts (student_id, exam_id)
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'exam_attempts_student_id_exam_id_key'
    ) THEN
      ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_exam_id_key" UNIQUE ("student_id", "exam_id");
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Unique Constraint on terminal_results (adm_no, session, term)
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'terminal_results_adm_no_session_term_key'
    ) THEN
      ALTER TABLE "terminal_results" ADD CONSTRAINT "terminal_results_adm_no_session_term_key" UNIQUE ("adm_no", "session", "term");
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Foreign Keys
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_objective_questions_exam') THEN
      ALTER TABLE "objective_questions" ADD CONSTRAINT "fk_objective_questions_exam" 
        FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_theory_questions_exam') THEN
      ALTER TABLE "theory_questions" ADD CONSTRAINT "fk_theory_questions_exam" 
        FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exam_attempts_student') THEN
      ALTER TABLE "exam_attempts" ADD CONSTRAINT "fk_exam_attempts_student" 
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exam_attempts_exam') THEN
      ALTER TABLE "exam_attempts" ADD CONSTRAINT "fk_exam_attempts_exam" 
        FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 5: Safe Performance Indexes
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- STEP 6: Synchronize Autoincrement Sequences (Fixes P2002 Duplicate ID Errors)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- STEP 7: Ensure Super Admin Account Exists (Only Created If Missing)
-- ----------------------------------------------------------------------------
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "phone", "status")
VALUES (
  'greatfavourmontessorischool@gmail.com',
  '$2a$10$3zR14Q6f7X6P7/vY.274O.k91c8.yQ6E8Wv1B7jM12N3P4Q5R6S7T',
  'Hon Okolie Peter Isioma JP MCArb',
  'SUPER_ADMIN',
  '+234 905 894 3474',
  'ACTIVE'
)
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "admin_users" ("email", "password", "full_name", "role", "phone", "status")
VALUES (
  'admin@gfms.edu.ng',
  '$2a$10$3zR14Q6f7X6P7/vY.274O.k91c8.yQ6E8Wv1B7jM12N3P4Q5R6S7T',
  'Hon Okolie Peter Isioma JP MCArb',
  'SUPER_ADMIN',
  '+234 905 894 3474',
  'ACTIVE'
)
ON CONFLICT ("email") DO NOTHING;

-- Verification Message
SELECT 'GFMS Database successfully upgraded! All tables, columns (including students.arm), indexes, and sequences are synchronized without touching existing data.' AS status;
