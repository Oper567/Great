import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🏫 Starting Great-Favour Montessori School (GFMS) Database Seed...");

  // 1. Seed Super Admin User (Official School Email & Alias)
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: "greatfavourmontessorischool@gmail.com" },
    update: {
      fullName: "Hon Okolie Peter Isioma JP MCArb",
      password: adminPasswordHash,
      role: "SUPER_ADMIN",
      phone: "+234 905 894 3474",
    },
    create: {
      email: "greatfavourmontessorischool@gmail.com",
      fullName: "Hon Okolie Peter Isioma JP MCArb",
      password: adminPasswordHash,
      role: "SUPER_ADMIN",
      phone: "+234 905 894 3474",
    },
  });
  await prisma.adminUser.upsert({
    where: { email: "admin@gfms.edu.ng" },
    update: {
      fullName: "Hon Okolie Peter Isioma JP MCArb",
      password: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
    create: {
      email: "admin@gfms.edu.ng",
      fullName: "Hon Okolie Peter Isioma JP MCArb",
      password: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✓ Super Admin Seeded: ${admin.fullName} (${admin.email})`);

  // 2. Seed Senior Secondary Students (SS 2: 64, SS 3: 74 Stream Breakdown)
  const studentsData = [
    {
      admNo: "GFMS/SS/2024/001",
      surname: "Okeke",
      fullName: "Somtochukwu Grace Okeke",
      currentClass: "SS 2 (Science)",
    },
    {
      admNo: "GFMS/SS/2024/002",
      surname: "Eze",
      fullName: "Chidubem Emmanuel Eze",
      currentClass: "SS 2 (Art)",
    },
    {
      admNo: "GFMS/SS/2024/003",
      surname: "Bello",
      fullName: "Aisha Fatima Bello",
      currentClass: "SS 3 (Science)",
    },
    {
      admNo: "GFMS/JSS/2024/088",
      surname: "Okafor",
      fullName: "Kamsiyochukwu David Okafor",
      currentClass: "JSS 2 Diamond",
    },
  ];

  const createdStudents = [];
  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { admNo: s.admNo },
      update: s,
      create: s,
    });
    createdStudents.push(student);
    console.log(`✓ Seeded Student: ${student.fullName} (${student.admNo}) - Class: ${student.currentClass}`);
  }

  // 3. Seed Examination 1: SS 2 Mathematics
  const mathExam = await prisma.exam.upsert({
    where: { id: 1 },
    update: {
      title: "First Term Examination",
      subject: "Mathematics",
      targetClass: "SS 2",
      examDate: new Date(),
      durationMinutes: 60,
      isActive: true,
      hasTheory: true,
    },
    create: {
      title: "First Term Examination",
      subject: "Mathematics",
      targetClass: "SS 2",
      examDate: new Date(),
      durationMinutes: 60,
      isActive: true,
      hasTheory: true,
    },
  });

  const mathObjective = [
    {
      questionText: "If log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, calculate the value of log₁₀ 18 without using mathematical tables.",
      options: JSON.stringify(["1.2552", "1.5562", "1.0791", "0.9542"]),
      correctAnswer: "A",
      points: 2,
    },
    {
      questionText: "Solve the quadratic equation: 2x² - 5x + 2 = 0.",
      options: JSON.stringify(["x = 1/2 or x = 2", "x = -1/2 or x = -2", "x = 2 or x = 3", "x = -2 or x = 1/2"]),
      correctAnswer: "A",
      points: 2,
    },
    {
      questionText: "A sector of a circle of radius 14 cm subtends an angle of 60° at the center. Calculate the arc length (take π = 22/7).",
      options: JSON.stringify(["22.0 cm", "14.67 cm", "44.0 cm", "7.33 cm"]),
      correctAnswer: "B",
      points: 2,
    },
    {
      questionText: "Find the 10th term of the arithmetic progression (A.P.): 3, 7, 11, 15, ...",
      options: JSON.stringify(["35", "39", "43", "47"]),
      correctAnswer: "B",
      points: 2,
    },
    {
      questionText: "If sin θ = 3/5 for an acute angle θ, evaluate tan θ.",
      options: JSON.stringify(["3/4", "4/3", "4/5", "5/4"]),
      correctAnswer: "A",
      points: 2,
    },
  ];

  // Clear existing questions for idempotent seed
  await prisma.objectiveQuestion.deleteMany({ where: { examId: mathExam.id } });
  for (const q of mathObjective) {
    await prisma.objectiveQuestion.create({
      data: {
        examId: mathExam.id,
        ...q,
      },
    });
  }

  const mathTheory = [
    {
      questionNum: 1,
      questionText: "(a) The sum of the first n terms of an arithmetic progression is given by S_n = 2n² + 3n. Find:\n  (i) The first term\n  (ii) The common difference\n  (iii) The 15th term.\n(b) Prove that 2n² + 3n is an increasing sequence for all n ≥ 1.",
      maxScore: 15,
      instructions: "Show all steps clearly. Answer on your physical answer booklet.",
    },
    {
      questionNum: 2,
      questionText: "A rectangular sports pitch at GFMS has length (3x + 4) meters and breadth (2x - 1) meters. If the area of the pitch is 330 square meters:\n(a) Form a quadratic equation in x.\n(b) Solve the equation and find the actual physical dimensions of the pitch.",
      maxScore: 15,
      instructions: "State appropriate units of measurement (meters). Answer on your physical booklet.",
    },
  ];

  await prisma.theoryQuestion.deleteMany({ where: { examId: mathExam.id } });
  for (const t of mathTheory) {
    await prisma.theoryQuestion.create({
      data: {
        examId: mathExam.id,
        ...t,
      },
    });
  }

  // 4. Seed Examination 2: SS 1 English Language
  const englishExam = await prisma.exam.upsert({
    where: { id: 2 },
    update: {
      title: "First Term Examination",
      subject: "English Language",
      targetClass: "SS 1",
      examDate: new Date(),
      durationMinutes: 45,
      isActive: true,
      hasTheory: true,
    },
    create: {
      title: "First Term Examination",
      subject: "English Language",
      targetClass: "SS 1",
      examDate: new Date(),
      durationMinutes: 45,
      isActive: true,
      hasTheory: true,
    },
  });

  const englishObjective = [
    {
      questionText: "Choose the option that is most nearly OPPOSITE in meaning to the underlined word: 'The principal's speech was remarkably CONCISE.'",
      options: JSON.stringify(["Brief", "Verbose", "Accurate", "Lucid"]),
      correctAnswer: "B",
      points: 1,
    },
    {
      questionText: "From the options lettered A to D, choose the word that has the same vowel sound as the one represented by the underlined letters in 'pl<u>ai</u>t'.",
      options: JSON.stringify(["Play", "Cat", "Wait", "Late"]),
      correctAnswer: "B",
      points: 1,
    },
    {
      questionText: "Neither the form teacher nor the students ______ present at the assembly yesterday.",
      options: JSON.stringify(["was", "were", "is", "are"]),
      correctAnswer: "B",
      points: 1,
    },
    {
      questionText: "The idiom 'to burn the midnight oil' means to:",
      options: JSON.stringify(["Waste precious fuel", "Work late into the night studying", "Start an intentional fire", "Wake up very early"]),
      correctAnswer: "B",
      points: 1,
    },
  ];

  await prisma.objectiveQuestion.deleteMany({ where: { examId: englishExam.id } });
  for (const q of englishObjective) {
    await prisma.objectiveQuestion.create({
      data: {
        examId: englishExam.id,
        ...q,
      },
    });
  }

  const englishTheory = [
    {
      questionNum: 1,
      questionText: "Write a letter to the Director of Great-Favour Montessori School proposing three modern extracurricular clubs (such as Robotics, Model United Nations, or Debate Society) that will cultivate leadership skills in the senior school.",
      maxScore: 25,
      instructions: "Your composition should be at least 350 words. Write neatly in your physical answer booklet.",
    },
  ];

  await prisma.theoryQuestion.deleteMany({ where: { examId: englishExam.id } });
  for (const t of englishTheory) {
    await prisma.theoryQuestion.create({
      data: {
        examId: englishExam.id,
        ...t,
      },
    });
  }

  // 5. Seed Completed Attempt for Somtochukwu Okeke on Math
  const somto = createdStudents[0];
  await prisma.examAttempt.deleteMany({
    where: { studentId: somto.id, examId: mathExam.id },
  });

  await prisma.examAttempt.create({
    data: {
      studentId: somto.id,
      examId: mathExam.id,
      startedAt: new Date(Date.now() - 45 * 60 * 1000),
      submittedAt: new Date(Date.now() - 5 * 60 * 1000),
      isCompleted: true,
      objectiveScore: 8,
      theoryScore: null,
      totalScore: 8,
      studentAnswers: JSON.stringify({ "1": "A", "2": "A", "3": "B", "4": "B", "5": "B" }),
    },
  });

  // 6. Seed Scratch Cards for Result Checker (Strictly 2 Checks Allowed)
  const scratchCards = [
    {
      pin: "GFMS-8492-1049",
      serialNumber: "SN-GFMS-2026-001",
      admNo: null,
      usageCount: 0,
      maxUsage: 2,
      status: "active",
      session: "2025/2026",
      term: "THIRD_TERM",
    },
    {
      pin: "GFMS-3310-9921",
      serialNumber: "SN-GFMS-2026-002",
      admNo: "GFMS/SS/2024/001",
      usageCount: 1,
      maxUsage: 2,
      status: "active",
      session: "2025/2026",
      term: "THIRD_TERM",
    },
  ];

  for (const card of scratchCards) {
    await prisma.scratchCard.upsert({
      where: { pin: card.pin },
      update: { maxUsage: 2 },
      create: card,
    });
  }
  console.log(`✓ Seeded Scratch Cards for Result Checker.`);

  console.log("🎉 GFMS CBT and Scratch Card Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
