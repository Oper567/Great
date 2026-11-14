/**
 * Great-Favour Montessori School (GFMS)
 * cPanel PostgreSQL Direct Database Initializer & Seeder
 * 
 * Usage:
 *   node scripts/cpanel-setup-db.js
 * 
 * This script runs entirely with production dependencies (PrismaClient + bcryptjs),
 * without needing ts-node or devDependencies on cPanel.
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('======================================================');
  console.log('🏫 GFMS - cPanel PostgreSQL Setup & Seeder');
  console.log('======================================================\n');

  console.log('📡 [Step 1/3] Pushing Prisma schema to cPanel PostgreSQL...');
  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log('✓ Schema pushed successfully.\n');
  } catch (err) {
    console.error('❌ Error executing prisma db push:', err.message);
    process.exit(1);
  }

  console.log('🌱 [Step 2/3] Seeding Initial Data into Database...');

  // 1. Seed Super Admin (Official School Gmail + Legacy Alias)
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'greatfavourmontessorischool@gmail.com' },
    update: {
      fullName: 'Hon Okolie Peter Isioma JP MCArb',
      password: adminPasswordHash,
      role: 'SUPER_ADMIN',
      phone: '+234 905 894 3474',
    },
    create: {
      email: 'greatfavourmontessorischool@gmail.com',
      fullName: 'Hon Okolie Peter Isioma JP MCArb',
      password: adminPasswordHash,
      role: 'SUPER_ADMIN',
      phone: '+234 905 894 3474',
    },
  });
  await prisma.adminUser.upsert({
    where: { email: 'admin@gfms.edu.ng' },
    update: {
      fullName: 'Hon Okolie Peter Isioma JP MCArb',
      password: adminPasswordHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'admin@gfms.edu.ng',
      fullName: 'Hon Okolie Peter Isioma JP MCArb',
      password: adminPasswordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✓ Super Admin Ready: ${admin.fullName} (${admin.email}) [Password: admin123]`);

  // 2. Seed Students (SS2: 64, SS3: 74 Stream Breakdown)
  const students = [
    { admNo: 'GFMS/SS/2024/001', surname: 'Okeke', fullName: 'Somtochukwu Grace Okeke', currentClass: 'SS 2', arm: 'Science' },
    { admNo: 'GFMS/SS/2024/002', surname: 'Eze', fullName: 'Chidubem Emmanuel Eze', currentClass: 'SS 2', arm: 'Art' },
    { admNo: 'GFMS/SS/2024/003', surname: 'Bello', fullName: 'Aisha Fatima Bello', currentClass: 'SS 3', arm: 'Science' },
    { admNo: 'GFMS/JSS/2024/088', surname: 'Okafor', fullName: 'Kamsiyochukwu David Okafor', currentClass: 'JSS 2 Diamond', arm: '' },
  ];

  for (const s of students) {
    await prisma.student.upsert({
      where: { admNo: s.admNo },
      update: s,
      create: s,
    });
  }
  console.log(`✓ Seeded ${students.length} student records.`);

  // 3. Seed Exams & Questions
  const exam = await prisma.exam.upsert({
    where: { id: 1 },
    update: {
      title: 'First Term Examination 2024/2025',
      subject: 'Mathematics',
      targetClass: 'SS 2',
      durationMinutes: 60,
      isActive: true,
      hasTheory: true,
    },
    create: {
      id: 1,
      title: 'First Term Examination 2024/2025',
      subject: 'Mathematics',
      targetClass: 'SS 2',
      examDate: new Date(),
      durationMinutes: 60,
      isActive: true,
      hasTheory: true,
    },
  });

  // Ensure sample objective question
  const existingObj = await prisma.objectiveQuestion.findFirst({ where: { examId: exam.id } });
  if (!existingObj) {
    await prisma.objectiveQuestion.create({
      data: {
        examId: exam.id,
        questionText: 'Solve for x: 2x + 5 = 15',
        options: JSON.stringify(['3', '5', '7', '10']),
        correctAnswer: 'B',
        points: 1,
      },
    });
    console.log('✓ Sample objective question created.');
  }

  // Ensure sample theory question
  const existingTheory = await prisma.theoryQuestion.findFirst({ where: { examId: exam.id } });
  if (!existingTheory) {
    await prisma.theoryQuestion.create({
      data: {
        examId: exam.id,
        questionNum: 1,
        questionText: 'Prove that the sum of the interior angles of a triangle equals 180 degrees.',
        maxScore: 10,
        instructions: 'Show all geometric steps clearly.',
      },
    });
    console.log('✓ Sample theory question created.');
  }

  // 4. Seed Scratch Cards
  const cards = [
    { id: 'cuid_card_01', pin: 'GFMS-8492-1049', serialNumber: 'SN-GFMS-2025-001', session: '2024/2025', term: 'FIRST_TERM' },
    { id: 'cuid_card_02', pin: 'GFMS-1122-3344', serialNumber: 'SN-GFMS-2025-002', session: '2024/2025', term: 'FIRST_TERM' },
    { id: 'cuid_card_03', pin: 'GFMS-9988-7766', serialNumber: 'SN-GFMS-2025-003', session: '2024/2025', term: 'FIRST_TERM' },
  ];

  for (const c of cards) {
    await prisma.scratchCard.upsert({
      where: { pin: c.pin },
      update: { maxUsage: 2 },
      create: {
        id: c.id,
        pin: c.pin,
        serialNumber: c.serialNumber,
        usageCount: 0,
        maxUsage: 2,
        status: 'active',
        session: '2025/2026',
        term: 'THIRD_TERM',
      },
    });
  }
  console.log(`✓ Seeded ${cards.length} scratch cards for Result Checker testing.`);

  // 5. Ensure image_url columns exist in questions tables
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE "objective_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE "theory_questions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE "teacher_question_submissions" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;
    `);
    console.log('✓ Ensured question image_url columns exist in PostgreSQL.');
  } catch (colErr) {
    console.warn('⚠️ Warning checking question image columns:', colErr.message);
  }

  // 6. Resynchronize all autoincrement sequences
  try {
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
    console.log('✓ Synchronized all PostgreSQL autoincrement ID sequences.');
  } catch (seqErr) {
    console.warn('⚠️ Warning syncing sequences:', seqErr.message);
  }

  console.log('\n======================================================');
  console.log('🎉 [Step 3/3] Database Setup Completed Successfully!');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during setup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
