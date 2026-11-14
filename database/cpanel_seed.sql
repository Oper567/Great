-- ============================================================================
-- Great-Favour Montessori School (GFMS)
-- cPanel PostgreSQL Seed & Migration SQL
-- 100% Aligned with Prisma Schema & 2025/2026 Academic Structure
-- ============================================================================

-- 1. Seed Super Admin Users (Password: admin123)
-- Primary Official School Gmail
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'greatfavourmontessorischool@gmail.com',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Hon Okolie Peter Isioma JP MCArb',
    'SUPER_ADMIN',
    'All Classes',
    'All Subjects',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject",
    "phone" = EXCLUDED."phone";

-- Legacy Admin Alias (Password: admin123)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'admin@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Hon Okolie Peter Isioma JP MCArb',
    'SUPER_ADMIN',
    'All Classes',
    'All Subjects',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role";

-- 2. Seed Faculty Members (Password: admin123)
-- Mr. Jude Godstime (HOD ICT & Computer Education)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'jude@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Mr. Jude Godstime',
    'TEACHER',
    'SS 1 - SS 3',
    'ICT & Computer Studies',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Mr. Abraham Akozor (HOD Science Management)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'abraham.akozo@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Mr. Abraham Akozor',
    'TEACHER',
    'SS 2 (Science)',
    'Science Management',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Teacher Omoile Stanley Henry (HOD Pure Science & Laboratories)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'stanley@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Teacher Omoile Stanley Henry',
    'TEACHER',
    'All Secondary',
    'Pure Science & Laboratories',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Mrs. Jane Ekene Okolie (Deputy Director Administration & Montessori Administrator)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'deputydirector@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Mrs Jane Ekene Okolie',
    'ADMIN',
    'All',
    'Deputy Director Administration & Montessori Administrator',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Mr. Paul Uyokei (Bursary / Admission Officer)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'paul@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Mr. Paul Uyokei',
    'BURSAR',
    'All',
    'Bursary & Admissions',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Ms. Gift Itakpe (HOD Examinations & Academic Standards)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'gift@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Ms. Gift Itakpe',
    'TEACHER',
    'All',
    'Examinations & Standards',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Mrs. Chiedu Eno (HOD Guardian and Counseling)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'chiedu@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Mrs. Chiedu Eno',
    'TEACHER',
    'All',
    'Guardian & Counseling',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Mrs. Philo Mordi (HOD Nursery Pupils)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'philo@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Mrs. Philo Mordi',
    'TEACHER',
    'Play Class - Nursery 3',
    'Early Years & Nursery Section',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Miss Grace Edechi (School Secretary - Primary Session)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'grace@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Miss Grace Edechi',
    'ADMIN',
    'Primary 1 - 5',
    'Primary Administration & Records',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Insp. James Ukpere (Chief Security Officer)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'james@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Insp. James Ukpere (Rtd Police Officer)',
    'ADMIN',
    'All',
    'Campus Safety & Security',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Mr. Odogwu Victor (School Bus Manager)
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'victor@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Mr. Odogwu Victor',
    'ADMIN',
    'All',
    'Transport & Logistics',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "assigned_class" = EXCLUDED."assigned_class",
    "assigned_subject" = EXCLUDED."assigned_subject";

-- Generic Teacher Account
INSERT INTO "admin_users" ("email", "password", "full_name", "role", "assigned_class", "assigned_subject", "phone", "created_at")
VALUES (
    'teacher@gfms.edu.ng',
    '$2b$10$l55hVPS0QW7KJQk5GsszzecbhWvk6a7X6iaP8iWgs6z/9tZTha.G6',
    'Senior Subject Educator',
    'TEACHER',
    'SS 2 (Science)',
    'Mathematics',
    '+234 905 894 3474',
    NOW()
)
ON CONFLICT ("email") DO UPDATE SET
    "full_name" = EXCLUDED."full_name",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role";

-- 3. Seed Senior Secondary Students (SS2: 64 students, SS3: 74 students)
INSERT INTO "students" ("adm_no", "surname", "full_name", "current_class", "gender", "session", "created_at")
VALUES
    ('GFMS/SS/2024/001', 'Okeke', 'Somtochukwu Grace Okeke', 'SS 2 (Science)', 'FEMALE', '2025/2026', NOW()),
    ('GFMS/SS/2024/002', 'Eze', 'Chidubem Emmanuel Eze', 'SS 2 (Art)', 'MALE', '2025/2026', NOW()),
    ('GFMS/SS/2024/003', 'Bello', 'Aisha Fatima Bello', 'SS 3 (Science)', 'FEMALE', '2025/2026', NOW()),
    ('GFMS/SS/2024/004', 'Nnamdi', 'Chukwuemeka David Nnamdi', 'SS 3 (Art)', 'MALE', '2025/2026', NOW()),
    ('GFMS/SS/2024/005', 'Adeyemi', 'Oluwaseun Blessing Adeyemi', 'SS 1', 'FEMALE', '2025/2026', NOW()),
    ('GFMS/2026/0501', 'Okeke', 'Okeke, Somtochukwu Grace', 'JSS 2 Diamond', 'FEMALE', '2025/2026', NOW()),
    ('GFMS/JSS/2024/088', 'Okafor', 'Kamsiyochukwu David Okafor', 'JSS 2 Diamond', 'MALE', '2025/2026', NOW())
ON CONFLICT ("adm_no") DO UPDATE SET
    "surname" = EXCLUDED."surname",
    "full_name" = EXCLUDED."full_name",
    "current_class" = EXCLUDED."current_class",
    "gender" = EXCLUDED."gender",
    "session" = EXCLUDED."session";

-- 4. Seed Sample Exams Across Active Streams
INSERT INTO "exams" ("id", "title", "subject", "target_class", "exam_date", "duration_minutes", "is_active", "has_theory", "created_at")
VALUES
    (1, 'First Term Examination 2025/2026', 'Mathematics', 'SS 2 (Science)', NOW(), 60, true, true, NOW()),
    (2, 'First Term Examination 2025/2026', 'English Language', 'SS 1', NOW(), 60, true, false, NOW()),
    (3, 'First Term Examination 2025/2026', 'Literature in English', 'SS 2 (Art)', NOW(), 60, true, true, NOW()),
    (4, 'Mock Senior Certificate Examination 2025/2026', 'Physics', 'SS 3 (Science)', NOW(), 90, true, true, NOW())
ON CONFLICT ("id") DO UPDATE SET
    "title" = EXCLUDED."title",
    "subject" = EXCLUDED."subject",
    "target_class" = EXCLUDED."target_class";

-- 5. Seed Objective Questions for Exam 1 (Mathematics)
INSERT INTO "objective_questions" ("exam_id", "question_text", "options", "correct_answer", "points")
VALUES
    (1, 'Solve for x: 2x + 5 = 15', '["3", "5", "7", "10"]', 'B', 1),
    (1, 'What is the value of pi (π) approximately?', '["3.142", "2.178", "1.414", "0.577"]', 'A', 1),
    (1, 'Find the slope of the line y = 3x - 4', '["-4", "3", "4", "1/3"]', 'B', 1)
ON CONFLICT DO NOTHING;

-- 6. Seed Theory Questions for Exam 1 (Mathematics)
INSERT INTO "theory_questions" ("exam_id", "question_num", "question_text", "max_score", "instructions")
VALUES
    (1, 1, 'Prove that the sum of the interior angles of a triangle equals 180 degrees.', 10, 'Write out the full geometric proof clearly.'),
    (1, 2, 'Given quadratic equation 2x^2 + 5x - 3 = 0, solve using the quadratic formula.', 10, 'Show all working steps.')
ON CONFLICT DO NOTHING;

-- 7. Scratch Cards Table & Seed (Strictly 2 Checks Allowed)
CREATE TABLE IF NOT EXISTS "scratch_cards" (
    "id" TEXT PRIMARY KEY,
    "pin" TEXT NOT NULL UNIQUE,
    "serialNumber" TEXT UNIQUE,
    "admNo" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsage" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'active',
    "session" TEXT,
    "term" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "scratch_cards" ("id", "pin", "serialNumber", "usageCount", "maxUsage", "status", "session", "term", "createdAt", "updatedAt")
VALUES
    ('cuid_card_01', 'GFMS-8492-1049', 'SN-GFMS-2026-001', 0, 2, 'active', '2025/2026', 'Third Term', NOW(), NOW()),
    ('cuid_card_02', 'GFMS-1122-3344', 'SN-GFMS-2026-002', 0, 2, 'active', '2025/2026', 'Third Term', NOW(), NOW()),
    ('cuid_card_03', 'GFMS-9988-7766', 'SN-GFMS-2026-003', 0, 2, 'active', '2025/2026', 'Third Term', NOW(), NOW())
ON CONFLICT ("pin") DO UPDATE SET "maxUsage" = 2;

-- 8. Create Terminal Results Table If Missing
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

-- 9. Create Teacher Question Submissions Table If Missing
CREATE TABLE IF NOT EXISTS "teacher_question_submissions" (
    "id" SERIAL PRIMARY KEY,
    "teacher_name" TEXT NOT NULL,
    "teacher_email" TEXT,
    "subject" TEXT NOT NULL,
    "target_class" TEXT NOT NULL,
    "submission_type" TEXT NOT NULL DEFAULT 'MANUAL',
    "total_marks" INTEGER NOT NULL DEFAULT 100,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "instructions" TEXT,
    "image_url" TEXT,
    "question_data" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Schema Migrations for Student RegNo, Staff Management & Theory Transmission
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "gender" TEXT DEFAULT 'MALE';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "session" TEXT DEFAULT '2025/2026';
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';

ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_class" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_subject" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';

ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "is_transmitted_to_admin" BOOLEAN DEFAULT false;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "teacher_comment" TEXT;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "graded_by_teacher_name" TEXT;

-- 11. Ensure image_url exists on question tables
ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;

-- 12. Resynchronize All Autoincrement Sequences to prevent P2002 errors
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
