-- ============================================================================
-- Great-Favour Montessori School (GFMS)
-- Comprehensive Relational Database DDL Schema (PostgreSQL / ANSI SQL Compatible)
-- Established: September 2014 | Motto: "Leadership Academy"
-- Result Checker & Terminal Report Card Management Engine
-- ============================================================================

-- 1. Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STUDENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE school_division AS ENUM ('PRIMARY', 'SECONDARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE student_status AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE academic_term AS ENUM ('FIRST_TERM', 'SECOND_TERM', 'THIRD_TERM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table (Core Authentication)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STUDENT',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30),
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Staff Profile Table (Leadership & Academic Staff)
CREATE TABLE IF NOT EXISTS staff_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    designation VARCHAR(150) NOT NULL,         -- e.g. 'Director & Proprietor', 'Deputy Director'
    department VARCHAR(100) NOT NULL,          -- e.g. 'Executive Leadership', 'Administration & Finance'
    portfolio VARCHAR(100),                    -- e.g. 'Finance/Admin'
    qualifications VARCHAR(255),               -- e.g. 'Hon JP MCArb'
    bio TEXT,
    appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_department ON staff_profiles(department);

-- 4. Classes Table (15 Classes: 9 Primary, 6 Secondary)
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                -- e.g. 'Play Class', 'Nursery 1', 'Basic 5', 'JSS 1', 'SS 3'
    code VARCHAR(20) NOT NULL UNIQUE,          -- e.g. 'PLAY', 'NUR1', 'BAS5', 'JSS1', 'SS3'
    division school_division NOT NULL,         -- 'PRIMARY' or 'SECONDARY'
    grade_level INT NOT NULL,                  -- 0 for Play Class, 1-3 Nursery, 4-8 Basic 1-5, 9-11 JSS 1-3, 12-14 SS 1-3
    order_index INT NOT NULL DEFAULT 0,
    capacity INT NOT NULL DEFAULT 35,          -- Approximate classroom cohort limit
    description TEXT,
    class_teacher_id VARCHAR(36) REFERENCES staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_classes_division ON classes(division);
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON classes(grade_level);

-- 5. Students Table (Capacity: 700 students, approx 200 Primary, 500 Secondary)
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) PRIMARY KEY,
    admission_number VARCHAR(50) NOT NULL UNIQUE,
    user_id VARCHAR(36) UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender gender_type NOT NULL,
    date_of_birth DATE NOT NULL,
    
    -- Division flag for rapid reporting & demographic filtering
    division school_division NOT NULL,
    class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status student_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Guardian & Parent Contact Info
    guardian_name VARCHAR(200) NOT NULL,
    guardian_phone VARCHAR(50) NOT NULL,
    guardian_email VARCHAR(255),
    guardian_relation VARCHAR(50),
    residential_address TEXT,
    
    -- Medical Profile
    blood_group VARCHAR(10),
    genotype VARCHAR(10),
    medical_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_division ON students(division);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(last_name, first_name);

-- ============================================================================
-- RESULT CHECKER & REPORT CARD SCHEMA
-- ============================================================================

-- 6. Subjects Table with Category Grouping
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,                -- e.g. 'Civic Education', 'Social Studies', 'Mathematics'
    code VARCHAR(30) NOT NULL UNIQUE,          -- e.g. 'CIV', 'SOS', 'SEC', 'MTH', 'ENG'
    category VARCHAR(100),                     -- e.g. 'National Values', 'Basic Science & Technology'
    division school_division NOT NULL DEFAULT 'SECONDARY',
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subjects_category ON subjects(category);
CREATE INDEX IF NOT EXISTS idx_subjects_division ON subjects(division);

-- 7. Termly Enrollment Table (Session & Term Tracking)
CREATE TABLE IF NOT EXISTS termly_enrollments (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(36) NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    session VARCHAR(20) NOT NULL,              -- e.g. '2025/2026'
    term academic_term NOT NULL,               -- 'FIRST_TERM', 'SECOND_TERM', 'THIRD_TERM'
    
    -- Positioning and Promotion
    number_in_class INT NOT NULL,              -- e.g. 42 students
    position_in_class INT,                     -- e.g. 1
    next_class VARCHAR(50),                    -- e.g. 'JSS 3', 'SS 1'
    next_term_begins DATE,                     -- Next resumption date
    
    -- Attendance
    days_opened INT NOT NULL DEFAULT 0,
    days_present INT NOT NULL DEFAULT 0,
    days_absent INT NOT NULL DEFAULT 0,
    
    -- Averages and Totals
    student_average NUMERIC(5,2),              -- e.g. 88.75
    class_average NUMERIC(5,2),                -- e.g. 69.40
    total_score_obtained NUMERIC(7,2),
    total_score_possible NUMERIC(7,2),
    
    -- Form Master and Principal Remarks
    form_master_comment TEXT,
    principal_remark TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_student_session_term UNIQUE (student_id, session, term)
);

CREATE INDEX IF NOT EXISTS idx_termly_enrollments_student ON termly_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_termly_enrollments_class ON termly_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_termly_enrollments_session_term ON termly_enrollments(session, term);

-- 8. Cognitive Grades Table
CREATE TABLE IF NOT EXISTS cognitive_grades (
    id VARCHAR(36) PRIMARY KEY,
    termly_enrollment_id VARCHAR(36) NOT NULL REFERENCES termly_enrollments(id) ON DELETE CASCADE,
    subject_id VARCHAR(36) NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    
    ca_1 INT NOT NULL DEFAULT 0 CHECK (ca_1 >= 0 AND ca_1 <= 20),
    ca_2 INT NOT NULL DEFAULT 0 CHECK (ca_2 >= 0 AND ca_2 <= 20),
    exam INT NOT NULL DEFAULT 0 CHECK (exam >= 0 AND exam <= 60),
    total_score INT NOT NULL DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
    
    grade VARCHAR(10) NOT NULL,               -- 'A', 'B', 'C', 'P', 'F'
    remark VARCHAR(50) NOT NULL,              -- 'Distinction', 'Credit', 'Pass', etc.
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_enrollment_subject UNIQUE (termly_enrollment_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_cognitive_grades_enrollment ON cognitive_grades(termly_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_grades_subject ON cognitive_grades(subject_id);

-- 9. Skills and Behaviour Table (Affective & Psychomotor Domains)
CREATE TABLE IF NOT EXISTS skills_and_behaviour (
    id VARCHAR(36) PRIMARY KEY,
    termly_enrollment_id VARCHAR(36) NOT NULL UNIQUE REFERENCES termly_enrollments(id) ON DELETE CASCADE,
    
    -- Psychomotor Skills stored as JSON (Scale 1 to 5)
    -- keys: handwriting, fluency, games, sports, handling_of_tools, lab_and_workshop, drawing_and_painting, craft, music_skill
    skills JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Affective Behaviour stored as JSON (Scale 1 to 5)
    -- keys: punctuality, attendance, neatness, politeness, honesty, relationship_with_others, self_control, spirit_of_cooperation, sense_of_responsibility, attentiveness, initiatives, organizational_ability
    behaviour JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skills_behaviour_enrollment ON skills_and_behaviour(termly_enrollment_id);
