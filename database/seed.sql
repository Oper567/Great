-- ============================================================================
-- Great-Favour Montessori School (GFMS)
-- Initial Seed Data: Key Personnel, 15 Classes, and Cohort Setup
-- 100% Aligned with 2025/2026 Academic Structure & Real Faculty
-- ============================================================================

-- 1. Insert Key Personnel & Faculty
-- Super Admin: Hon Okolie Peter Isioma JP MCArb (Director & Proprietor)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-dir-001',
    'greatfavourmontessorischool@gmail.com',
    '$2b$12$eX4mpL3H4shDirectorGFMS2014SecureKey',
    'SUPER_ADMIN',
    'Peter Isioma',
    'Okolie',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-dir-001',
    'usr-dir-001',
    'Director & Proprietor',
    'Executive Leadership',
    'Director',
    'Hon JP MCArb',
    'Visionary educational leader dedicated to establishing transformative Montessori and secondary academic excellence since September 2014.',
    '2014-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation,
    bio = EXCLUDED.bio;

-- Deputy Director: Mrs Jane Ekene Okolie
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-dep-002',
    'deputy.director@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shDeputyDirectorGFMSFinanceKey',
    'ADMIN',
    'Jane Ekene',
    'Okolie',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-dep-002',
    'usr-dep-002',
    'Deputy Director Administration & Montessori Administrator',
    'Administration & Montessori Education',
    'Administration & Montessori Excellence',
    'B.Ed, M.Sc (Admin & Finance)',
    'Distinguished educational administrator overseeing institutional governance, Montessori early-learning standards, and operational vitality.',
    '2014-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation,
    portfolio = EXCLUDED.portfolio;

-- Head Teacher
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-ht-003',
    'headteacher@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shHeadTeacherGFMSSecureKey',
    'ADMIN',
    'Head',
    'Teacher',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-ht-003',
    'usr-ht-003',
    'Head Teacher',
    'Academic Administration',
    'School Administration',
    'B.Ed (Curriculum & Instruction), TRCN',
    'Educational leader directing holistic foundational Montessori development and continuous academic progression.',
    '2016-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- HOD ICT & Computer Education: Mr. Jude Godstime
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-ict-004',
    'jude@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shJudeGFMSICTKey2026',
    'ADMIN',
    'Mr. Jude',
    'Godstime',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-ict-004',
    'usr-ict-004',
    'HOD ICT & Computer Education',
    'ICT & Computer Studies',
    'CBT & ICT Infrastructure',
    'B.Sc Computer Science',
    'Pioneering technology integration, digital literacy, and high-performance CBT examination management.',
    '2018-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- HOD Science Management: Mr. Abraham Akozor
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-sci-005',
    'abraham@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shAbrahamGFMSScienceKey2026',
    'ADMIN',
    'Mr. Abraham',
    'Akozor',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-sci-005',
    'usr-sci-005',
    'HOD Science Management',
    'Science Management',
    'Senior Science Management',
    'B.Sc (Ed) Physics, TRCN',
    'Guiding students through science curriculum, laboratory apparatus calibration, safety management, and rigorous scientific inquiry.',
    '2019-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- HOD Pure Science & Laboratories: Teacher Omoile Stanley Henry
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-phe-006',
    'stanley@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shStanleyGFMSSportsKey2026',
    'ADMIN',
    'Teacher Omoile',
    'Stanley Henry',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-phe-006',
    'usr-phe-006',
    'HOD Pure Science & Laboratories',
    'Pure Science & Laboratories',
    'Pure Science Laboratories & Experiments',
    'B.Sc (Ed) Pure Science, TRCN',
    'Directing pure science curriculum, chemistry, physics, and biology practical investigations with dedicated laboratory management.',
    '2020-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- HOD Guardian and Counseling: Mrs. Chiedu Eno
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-cns-007',
    'chiedu@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shChieduGFMSCounselingKey2026',
    'ADMIN',
    'Mrs. Chiedu',
    'Eno',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-cns-007',
    'usr-cns-007',
    'HOD Guardian and Counseling',
    'Guardian & Counseling',
    'Guidance, Counseling & Pastoral Care',
    'B.Ed / M.Ed Guidance and Counseling, TRCN',
    'Championing student psychological well-being, moral guidance, career path orientation, and proactive emotional support across all educational levels.',
    '2018-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- HOD Nursery Pupils: Mrs. Philo Mordi
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-nur-008',
    'philo@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shPhiloGFMSNurseryKey2026',
    'ADMIN',
    'Mrs. Philo',
    'Mordi',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-nur-008',
    'usr-nur-008',
    'HOD Nursery Pupils',
    'Early Years & Nursery Section',
    'Montessori Early Childhood Education',
    'B.Ed Early Childhood Education, TRCN',
    'Leading our foundational Montessori section, nurturing toddler cognitive wonder, sensory motor skills, early numeracy, and caring child development.',
    '2016-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- School Secretary (Primary Session): Miss Grace Edechi
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-sec-009',
    'grace@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shGraceGFMSSecKey2026',
    'ADMIN',
    'Miss Grace',
    'Edechi',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-sec-009',
    'usr-sec-009',
    'School Secretary (Primary Session)',
    'Primary Administration & Records',
    'Primary Records & Secretarial Services',
    'B.Sc Public Administration / Office Technology',
    'Managing primary pupil enrollment registers, official school records, daily correspondence, and welcoming parents with exemplary organizational care.',
    '2019-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- Bursary / Admission Officer: Mr. Paul Uyokei
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-bur-010',
    'paul@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shPaulGFMSBursarKey2026',
    'ADMIN',
    'Mr. Paul',
    'Uyokei',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-bur-010',
    'usr-bur-010',
    'Bursary / Admission Officer',
    'Bursary & Admissions',
    'Bursary, Accounts & Student Admissions',
    'HND / B.Sc Accounting & Finance',
    'Managing tuition billing, scratch card distribution, school accounts, and welcoming new families through the student admission process with transparency and integrity.',
    '2017-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- Chief Security Officer: Insp. James Ukpere (Rtd Police Officer)
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-sec-011',
    'james@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shJamesGFMSSecurityKey2026',
    'ADMIN',
    'Insp. James',
    'Ukpere',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-sec-011',
    'usr-sec-011',
    'Chief Security Officer (CSO)',
    'Campus Safety & Security',
    'Campus Safety & Security Operations',
    'Retired Police Inspector, Certified Security Specialist',
    'Directing comprehensive campus safety protocols, perimeter surveillance, pupil safeguarding, emergency response drills, and disciplined gate access control.',
    '2018-01-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- School Bus Manager: Mr. Odogwu Victor
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone_number, is_active)
VALUES (
    'usr-bus-012',
    'victor@gfms.edu.ng',
    '$2b$12$eX4mpL3H4shVictorGFMSTransportKey2026',
    'ADMIN',
    'Mr. Odogwu',
    'Victor',
    '+234 905 894 3474',
    TRUE
) ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_profiles (id, user_id, designation, department, portfolio, qualifications, bio, appointment_date)
VALUES (
    'stf-bus-012',
    'usr-bus-012',
    'School Bus Manager',
    'Transport & Logistics',
    'Fleet Logistics & Pupil Transit Safety',
    'Fleet Management Specialist & Advanced Road Safety Certification',
    'Supervising school transit routes, daily pupil pickup & dropoff logistics, bus fleet mechanical maintenance, and uncompromising road safety standards.',
    '2018-09-01'
) ON CONFLICT (user_id) DO UPDATE SET
    designation = EXCLUDED.designation;

-- 2. Insert 15 Classes:
-- 9 Primary Classes (Play class, Nursery 1-3, Basic 1-5)
INSERT INTO classes (id, name, code, division, grade_level, order_index, capacity, description)
VALUES
    ('cls-play', 'Play Class', 'PLAY', 'PRIMARY', 0, 1, 20, 'Montessori early-learning sensory and exploratory stage for toddlers.'),
    ('cls-nur1', 'Nursery 1', 'NUR1', 'PRIMARY', 1, 2, 20, 'Foundational Montessori phonics, motor skills, and social collaboration.'),
    ('cls-nur2', 'Nursery 2', 'NUR2', 'PRIMARY', 2, 3, 22, 'Early numeracy, language development, and guided self-directed learning.'),
    ('cls-nur3', 'Nursery 3', 'NUR3', 'PRIMARY', 3, 4, 22, 'Transition preparatory Montessori curriculum preceding primary education.'),
    ('cls-bas1', 'Basic 1', 'BAS1', 'PRIMARY', 4, 5, 25, 'Primary foundation in literacy, quantitative reasoning, and sciences.'),
    ('cls-bas2', 'Basic 2', 'BAS2', 'PRIMARY', 5, 6, 25, 'Enhanced analytical skills, cultural awareness, and digital literacy.'),
    ('cls-bas3', 'Basic 3', 'BAS3', 'PRIMARY', 6, 7, 28, 'Intermediate primary education with emphasis on critical problem-solving.'),
    ('cls-bas4', 'Basic 4', 'BAS4', 'PRIMARY', 7, 8, 28, 'Advanced primary concepts, STEM exploration, and creative expression.'),
    ('cls-bas5', 'Basic 5', 'BAS5', 'PRIMARY', 8, 9, 30, 'Final primary benchmark year preparing students for junior secondary entrance.')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, division = EXCLUDED.division, grade_level = EXCLUDED.grade_level, capacity = EXCLUDED.capacity, description = EXCLUDED.description;

-- 6 Secondary Classes (JSS 1-3, SS 1-3)
-- SS 2 Total = 64 (Science: 29, Art: 35) | SS 3 Total = 74 (Science: 37, Art: 37)
INSERT INTO classes (id, name, code, division, grade_level, order_index, capacity, description)
VALUES
    ('cls-jss1', 'JSS 1', 'JSS1', 'SECONDARY', 9, 10, 80, 'Junior Secondary entry: Comprehensive multidisciplinary curriculum and leadership orientation.'),
    ('cls-jss2', 'JSS 2', 'JSS2', 'SECONDARY', 10, 11, 85, 'Intermediate Junior Secondary deepening scientific inquiry, humanities, and technology.'),
    ('cls-jss3', 'JSS 3', 'JSS3', 'SECONDARY', 11, 12, 85, 'Junior Secondary culmination leading to BECE certification and senior career pathway choice.'),
    ('cls-ss1',  'SS 1',  'SS1',  'SECONDARY', 12, 13, 85, 'Senior Secondary commencement: Sciences, Arts, and Commercial specialization pathways.'),
    ('cls-ss2',  'SS 2',  'SS2',  'SECONDARY', 13, 14, 64, 'Rigorous academic mastery, pre-college preparation, and leadership practicum. Total cohort: 64 students (Science: 29, Art & Humanities: 35).'),
    ('cls-ss3',  'SS 3',  'SS3',  'SECONDARY', 14, 15, 74, 'Final graduating year focusing on WAEC, NECO, UTME, and international scholarship excellence. Total cohort: 74 students (Science: 37, Art & Humanities: 37).')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, division = EXCLUDED.division, grade_level = EXCLUDED.grade_level, capacity = EXCLUDED.capacity, description = EXCLUDED.description;

-- 3. Insert Initial Student Demonstrators
INSERT INTO students (
    id, admission_number, first_name, middle_name, last_name, 
    gender, date_of_birth, division, class_id, 
    status, guardian_name, guardian_phone, guardian_email, guardian_relation, 
    residential_address, blood_group, genotype
) VALUES 
(
    'stu-001',
    'GFMS/2024/0001',
    'Chidera',
    'Samuel',
    'Adeyemi',
    'MALE',
    '2018-05-14',
    'PRIMARY',
    'cls-bas1',
    'ACTIVE',
    'Mr. Samuel Adeyemi',
    '+234-802-123-4567',
    's.adeyemi@example.com',
    'Father',
    'GFMS Academic Quarters, Delta State',
    'O+',
    'AA'
),
(
    'stu-501',
    'GFMS/2024/0501',
    'Somtochukwu',
    'Grace',
    'Okeke',
    'FEMALE',
    '2010-09-22',
    'SECONDARY',
    'cls-ss2',
    'ACTIVE',
    'Dr. & Mrs. Okeke',
    '+234-803-987-6543',
    'greatfavourmontessorischool@gmail.com',
    'Parents',
    'Victoria Estate, Delta State',
    'A+',
    'AA'
)
ON CONFLICT (admission_number) DO NOTHING;
