-- ============================================================================
-- Great-Favour Montessori School (GFMS)
-- Complete PostgreSQL Database Setup (Schema + Seed Data)
-- 100% Aligned with Prisma Schema & 2025/2026 Academic Structure
-- Paste this entire file into phpPgAdmin / pgAdmin / psql and click Execute
-- ============================================================================

-- Clean up any existing tables to allow safe fresh execution
DROP TABLE IF EXISTS "teacher_question_submissions" CASCADE;
DROP TABLE IF EXISTS "terminal_results" CASCADE;
DROP TABLE IF EXISTS "scratch_cards" CASCADE;
DROP TABLE IF EXISTS "exam_attempts" CASCADE;
DROP TABLE IF EXISTS "theory_questions" CASCADE;
DROP TABLE IF EXISTS "objective_questions" CASCADE;
DROP TABLE IF EXISTS "exams" CASCADE;
DROP TABLE IF EXISTS "students" CASCADE;
DROP TABLE IF EXISTS "admin_users" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

-- 1. Create Role Enum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'TEACHER');

-- 2. Admin & Staff Users Table
CREATE TABLE "admin_users" (
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

-- 3. Students Table (with RegNo & Academic Stream)
CREATE TABLE "students" (
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
CREATE TABLE "exams" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "target_class" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "has_theory" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Objective Questions Table
CREATE TABLE "objective_questions" (
    "id" SERIAL PRIMARY KEY,
    "exam_id" INTEGER NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "question_text" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "image_url" TEXT
);

-- 6. Theory Questions Table
CREATE TABLE "theory_questions" (
    "id" SERIAL PRIMARY KEY,
    "exam_id" INTEGER NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "question_num" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "max_score" INTEGER NOT NULL,
    "instructions" TEXT,
    "image_url" TEXT
);

-- 7. Exam Attempts Table
CREATE TABLE "exam_attempts" (
    "id" SERIAL PRIMARY KEY,
    "student_id" INTEGER NOT NULL REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "exam_id" INTEGER NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "objective_score" INTEGER NOT NULL DEFAULT 0,
    "theory_score" INTEGER,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "student_answers" TEXT NOT NULL DEFAULT '{}',
    "is_transmitted_to_admin" BOOLEAN NOT NULL DEFAULT false,
    "teacher_comment" TEXT,
    "graded_by_teacher_name" TEXT,
    CONSTRAINT "exam_attempts_student_id_exam_id_key" UNIQUE ("student_id", "exam_id")
);

-- 8. Scratch Cards Table (Strictly 3 Checks Allowed)
CREATE TABLE "scratch_cards" (
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

CREATE INDEX "scratch_cards_pin_idx" ON "scratch_cards"("pin");
CREATE INDEX "scratch_cards_admNo_idx" ON "scratch_cards"("admNo");
CREATE INDEX "exam_attempts_student_exam_idx" ON "exam_attempts"("student_id", "exam_id");
CREATE INDEX "exam_attempts_is_completed_idx" ON "exam_attempts"("is_completed");
CREATE INDEX "objective_questions_exam_id_idx" ON "objective_questions"("exam_id");
CREATE INDEX "theory_questions_exam_id_idx" ON "theory_questions"("exam_id");
CREATE INDEX "exams_is_active_idx" ON "exams"("is_active");

-- 9. Prepared Student Terminal Results Table
CREATE TABLE "terminal_results" (
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

CREATE INDEX "terminal_results_adm_no_idx" ON "terminal_results"("adm_no");

-- 10. Teacher Question Submissions Table
CREATE TABLE "teacher_question_submissions" (
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
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- "DRAFT", "PENDING", "APPROVED", "REJECTED"
    "admin_feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEED DATA (Institutional Credentials & Faculty Setup)
-- ============================================================================

-- Primary Super Admin (Official School Gmail)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'greatfavourmontessorischool@gmail.com',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Hon Okolie Peter Isioma JP MCArb',
    'SUPER_ADMIN',
    'All Classes',
    'All Subjects',
    '+234 905 894 3474',
    NOW()
);

-- Legacy Admin Alias (Locked by default — set credentials securely after setup)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'admin@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Hon Okolie Peter Isioma JP MCArb',
    'SUPER_ADMIN',
    'All Classes',
    'All Subjects',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 1: Mr. Jude Godstime (HOD ICT & Computer Education)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'jude@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Mr. Jude Godstime',
    'TEACHER',
    'SS 1 - SS 3',
    'ICT & Computer Studies',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 2: Mr. Abraham Akozor (HOD Science Management)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'abraham.akozo@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Mr. Abraham Akozor',
    'TEACHER',
    'SS 2 (Science)',
    'Science Management',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 3: Teacher Omoile Stanley Henry (HOD Pure Science & Laboratories)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'stanley@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Teacher Omoile Stanley Henry',
    'TEACHER',
    'All Secondary',
    'Pure Science & Laboratories',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 4: Mr. Paul Uyokei (Bursary / Admission Officer)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'paul@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Mr. Paul Uyokei',
    'BURSAR',
    'All',
    'Bursary & Admissions',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 5: Ms. Gift Itakpe (HOD Examinations & Academic Standards)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'gift@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Ms. Gift Itakpe',
    'TEACHER',
    'All',
    'Examinations & Standards',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 6: Mrs. Chiedu Eno (HOD Guardian and Counseling)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'chiedu@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Mrs. Chiedu Eno',
    'TEACHER',
    'All',
    'Guardian & Counseling',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 7: Mrs. Philo Mordi (HOD Nursery Pupils)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'philo@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Mrs. Philo Mordi',
    'TEACHER',
    'Play Class - Nursery 3',
    'Early Years & Nursery Section',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 8: Miss Grace Edechi (School Secretary - Primary Session)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'grace@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Miss Grace Edechi',
    'ADMIN',
    'Primary 1 - 5',
    'Primary Administration & Records',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 9: Insp. James Ukpere (Chief Security Officer)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'james@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Insp. James Ukpere (Rtd Police Officer)',
    'ADMIN',
    'All',
    'Campus Safety & Security',
    '+234 905 894 3474',
    NOW()
);

-- Faculty 10: Mr. Odogwu Victor (School Bus Manager)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'victor@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Mr. Odogwu Victor',
    'ADMIN',
    'All',
    'Transport & Logistics',
    '+234 905 894 3474',
    NOW()
);

-- Generic Teacher Account (Locked by default — set credentials securely after setup)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'teacher@gfms.edu.ng',
    '$2b$12$LOCKED_ACCOUNT_SET_PASSWORD_VIA_INITIAL_ADMIN_PASSWORD_ENV',
    'Senior Subject Educator',
    'TEACHER',
    'SS 2 (Science)',
    'Mathematics',
    '+234 905 894 3474',
    NOW()
);

-- Seed Senior Secondary & Junior Secondary Students
-- Note: SS 2 Total = 64 (Science: 29, Art: 35) | SS 3 Total = 74 (Science: 37, Art: 37)
INSERT INTO "students" ("adm_no", "surname", "full_name", "current_class", "gender", "session", "created_at")
VALUES
    ('GFMS/SS/2024/001', 'Okeke', 'Somtochukwu Grace Okeke', 'SS 2 (Science)', 'FEMALE', '2025/2026', NOW()),
    ('GFMS/SS/2024/002', 'Eze', 'Chidubem Emmanuel Eze', 'SS 2 (Art)', 'MALE', '2025/2026', NOW()),
    ('GFMS/SS/2024/003', 'Bello', 'Aisha Fatima Bello', 'SS 3 (Science)', 'FEMALE', '2025/2026', NOW()),
    ('GFMS/SS/2024/004', 'Nnamdi', 'Chukwuemeka David Nnamdi', 'SS 3 (Art)', 'MALE', '2025/2026', NOW()),
    ('GFMS/SS/2024/005', 'Adeyemi', 'Oluwaseun Blessing Adeyemi', 'SS 1', 'FEMALE', '2025/2026', NOW()),
    ('GFMS/2026/0501', 'Okeke', 'Okeke, Somtochukwu Grace', 'JSS 2 Diamond', 'FEMALE', '2025/2026', NOW()),
    ('GFMS/JSS/2024/088', 'Okafor', 'Kamsiyochukwu David Okafor', 'JSS 2 Diamond', 'MALE', '2025/2026', NOW());

-- Seed Sample CBT Exams across Streams
INSERT INTO "exams" ("id", "title", "subject", "target_class", "exam_date", "duration_minutes", "is_active", "has_theory", "created_at")
VALUES
    (1, 'First Term Examination 2025/2026', 'Mathematics', 'SS 2 (Science)', NOW(), 60, true, true, NOW()),
    (2, 'First Term Examination 2025/2026', 'English Language', 'SS 1', NOW(), 60, true, false, NOW()),
    (3, 'First Term Examination 2025/2026', 'Literature in English', 'SS 2 (Art)', NOW(), 60, true, true, NOW()),
    (4, 'Mock Senior Certificate Examination 2025/2026', 'Physics', 'SS 3 (Science)', NOW(), 90, true, true, NOW());

-- Seed Objective Questions for Exam 1 (SS 2 Science Mathematics)
INSERT INTO "objective_questions" ("exam_id", "question_text", "options", "correct_answer", "points")
VALUES
    (1, 'Solve for x: 2x + 5 = 15', '["3", "5", "7", "10"]', 'B', 1),
    (1, 'What is the value of pi (π) approximately?', '["3.142", "2.178", "1.414", "0.577"]', 'A', 1),
    (1, 'Find the slope of the line y = 3x - 4', '["-4", "3", "4", "1/3"]', 'B', 1);

-- Seed Theory Questions for Exam 1 (SS 2 Science Mathematics)
INSERT INTO "theory_questions" ("exam_id", "question_num", "question_text", "max_score", "instructions")
VALUES
    (1, 1, 'Prove that the sum of the interior angles of a triangle equals 180 degrees.', 10, 'Write out the full geometric proof clearly.'),
    (1, 2, 'Given quadratic equation 2x^2 + 5x - 3 = 0, solve using the quadratic formula.', 10, 'Show all working steps.');

-- Seed Result Checker Scratch Cards (Strictly 3 Checks Allowed)
INSERT INTO "scratch_cards" ("id", "pin", "serialNumber", "usageCount", "maxUsage", "status", "session", "term", "createdAt", "updatedAt")
VALUES
    ('cuid_card_01', 'GFMS-8492-1049', 'SN-GFMS-2026-001', 0, 3, 'active', '2025/2026', 'Third Term', NOW(), NOW()),
    ('cuid_card_02', 'GFMS-1122-3344', 'SN-GFMS-2026-002', 0, 3, 'active', '2025/2026', 'Third Term', NOW(), NOW()),
    ('cuid_card_03', 'GFMS-9988-7766', 'SN-GFMS-2026-003', 0, 3, 'active', '2025/2026', 'Third Term', NOW(), NOW());

-- Ensure image_url exists on question tables
ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;

-- Resynchronize All Autoincrement Sequences to prevent P2002 duplicate key errors
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

-- ============================================================================
-- 11. Grant Full Privileges to mqqfpopx_dbuser (Fixes cPanel Error 42501)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO mqqfpopx_dbuser;
GRANT CREATE ON SCHEMA public TO mqqfpopx_dbuser;
GRANT ALL PRIVILEGES ON SCHEMA public TO mqqfpopx_dbuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mqqfpopx_dbuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mqqfpopx_dbuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mqqfpopx_dbuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mqqfpopx_dbuser;
