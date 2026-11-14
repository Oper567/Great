-- ============================================================================
-- Great-Favour Montessori School (GFMS)
-- SQL Seed: JSS Subject Catalog, Termly Enrollment & Report Card Result
-- Student: Somtochukwu Grace Okeke (JSS 2 Diamond) | Session: 2025/2026 Third Term
-- ============================================================================

-- 1. Insert Subjects with Grouped Categories
INSERT INTO subjects (id, name, code, category, division, order_index) VALUES
    -- National Values
    ('sub-civ', 'Civic Education', 'CIV', 'National Values', 'SECONDARY', 1),
    ('sub-sos', 'Social Studies', 'SOS', 'National Values', 'SECONDARY', 2),
    ('sub-sec', 'Security Education', 'SEC', 'National Values', 'SECONDARY', 3),
    -- Basic Science & Technology
    ('sub-bsc', 'Basic Science', 'BSC', 'Basic Science & Technology', 'SECONDARY', 4),
    ('sub-btech', 'Basic Technology', 'BTECH', 'Basic Science & Technology', 'SECONDARY', 5),
    ('sub-ict', 'Information Technology (ICT)', 'ICT', 'Basic Science & Technology', 'SECONDARY', 6),
    ('sub-phe', 'Physical & Health Education', 'PHE', 'Basic Science & Technology', 'SECONDARY', 7),
    -- Languages
    ('sub-eng', 'English Language', 'ENG', 'Languages', 'SECONDARY', 8),
    ('sub-lit', 'Literature in English', 'LIT', 'Languages', 'SECONDARY', 9),
    ('sub-fre', 'French Language', 'FRE', 'Languages', 'SECONDARY', 10),
    ('sub-igb', 'Igbo Language', 'IGB', 'Languages', 'SECONDARY', 11),
    -- Mathematical Sciences
    ('sub-mth', 'Mathematics', 'MTH', 'Mathematical Sciences', 'SECONDARY', 12),
    -- Pre-Vocational Studies
    ('sub-agr', 'Agricultural Science', 'AGR', 'Pre-Vocational Studies', 'SECONDARY', 13),
    ('sub-hec', 'Home Economics', 'HEC', 'Pre-Vocational Studies', 'SECONDARY', 14),
    -- Business & Humanities
    ('sub-bus', 'Business Studies', 'BUS', 'Business & Humanities', 'SECONDARY', 15),
    ('sub-crs', 'Christian Religious Studies', 'CRS', 'Business & Humanities', 'SECONDARY', 16),
    ('sub-cca', 'Cultural & Creative Arts (CCA)', 'CCA', 'Business & Humanities', 'SECONDARY', 17)
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Termly Enrollment for Somtochukwu Grace Okeke
INSERT INTO termly_enrollments (
    id, student_id, class_id, session, term,
    number_in_class, position_in_class, next_class, next_term_begins,
    days_opened, days_present, days_absent,
    student_average, class_average, total_score_obtained, total_score_possible,
    form_master_comment, principal_remark
) VALUES (
    'enr-2025-2026-t3-0501',
    'stu-501',
    'cls-jss2',
    '2025/2026',
    'THIRD_TERM',
    42,
    1,
    'JSS 3',
    '2026-09-14',
    115,
    112,
    3,
    87.00,
    87.00,
    1479.00,
    1700.00,
    'Somtochukwu is an exceptionally disciplined, diligent, and intellectually gifted student. Outstanding academic mastery across all disciplines.',
    'Remarkable academic performance and exemplary conduct. Promoted to JSS 3 with distinction! Congratulations.'
) ON CONFLICT (student_id, session, term) DO NOTHING;

-- 3. Insert Cognitive Grades
INSERT INTO cognitive_grades (id, termly_enrollment_id, subject_id, ca_1, ca_2, exam, total_score, grade, remark) VALUES
    ('cg-01', 'enr-2025-2026-t3-0501', 'sub-civ',   19, 18, 54, 91, 'A', 'Distinction'),
    ('cg-02', 'enr-2025-2026-t3-0501', 'sub-sos',   18, 19, 52, 89, 'A', 'Distinction'),
    ('cg-03', 'enr-2025-2026-t3-0501', 'sub-sec',   20, 18, 55, 93, 'A', 'Distinction'),
    ('cg-04', 'enr-2025-2026-t3-0501', 'sub-bsc',   17, 18, 50, 85, 'A', 'Distinction'),
    ('cg-05', 'enr-2025-2026-t3-0501', 'sub-btech', 16, 17, 48, 81, 'A', 'Distinction'),
    ('cg-06', 'enr-2025-2026-t3-0501', 'sub-ict',   20, 19, 56, 95, 'A', 'Distinction'),
    ('cg-07', 'enr-2025-2026-t3-0501', 'sub-phe',   18, 18, 51, 87, 'A', 'Distinction'),
    ('cg-08', 'enr-2025-2026-t3-0501', 'sub-eng',   18, 17, 52, 87, 'A', 'Distinction'),
    ('cg-09', 'enr-2025-2026-t3-0501', 'sub-lit',   17, 19, 51, 87, 'A', 'Distinction'),
    ('cg-10', 'enr-2025-2026-t3-0501', 'sub-fre',   16, 16, 47, 79, 'B', 'Very Good'),
    ('cg-11', 'enr-2025-2026-t3-0501', 'sub-igb',   17, 18, 49, 84, 'A', 'Distinction'),
    ('cg-12', 'enr-2025-2026-t3-0501', 'sub-mth',   19, 19, 55, 93, 'A', 'Distinction'),
    ('cg-13', 'enr-2025-2026-t3-0501', 'sub-agr',   18, 18, 50, 86, 'A', 'Distinction'),
    ('cg-14', 'enr-2025-2026-t3-0501', 'sub-hec',   17, 18, 49, 84, 'A', 'Distinction'),
    ('cg-15', 'enr-2025-2026-t3-0501', 'sub-bus',   18, 18, 52, 88, 'A', 'Distinction'),
    ('cg-16', 'enr-2025-2026-t3-0501', 'sub-crs',   20, 19, 56, 95, 'A', 'Distinction'),
    ('cg-17', 'enr-2025-2026-t3-0501', 'sub-cca',   18, 17, 50, 85, 'A', 'Distinction')
ON CONFLICT (termly_enrollment_id, subject_id) DO NOTHING;

-- 4. Insert Skills and Behaviour Ratings (Scale 1 to 5)
INSERT INTO skills_and_behaviour (id, termly_enrollment_id, skills, behaviour) VALUES (
    'sb-001',
    'enr-2025-2026-t3-0501',
    '{
        "handwriting": 5,
        "fluency": 5,
        "games": 4,
        "sports": 4,
        "handling_of_tools": 4,
        "lab_and_workshop": 5,
        "drawing_and_painting": 4,
        "craft": 4,
        "music_skill": 4
    }'::jsonb,
    '{
        "punctuality": 5,
        "attendance": 5,
        "neatness": 5,
        "politeness": 5,
        "honesty": 5,
        "relationship_with_others": 5,
        "self_control": 4,
        "spirit_of_cooperation": 5,
        "sense_of_responsibility": 5,
        "attentiveness": 5,
        "initiatives": 4,
        "organizational_ability": 5
    }'::jsonb
) ON CONFLICT (termly_enrollment_id) DO NOTHING;
