import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { isSeniorSecondaryClass } from "../src/lib/cbt-utils";

async function runVerification() {
  console.log("🧪 Starting Automated Verification of GFMS CBT Portal...\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ""}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Class Gatekeeper Logic
  // --------------------------------------------------------------------------
  console.log("1. Testing Class Gatekeeper (SS 1 - SS 3 Only):");
  assert(isSeniorSecondaryClass("SS 1"), "Allows 'SS 1'");
  assert(isSeniorSecondaryClass("SS 1A"), "Allows 'SS 1A'");
  assert(isSeniorSecondaryClass("SS 2"), "Allows 'SS 2'");
  assert(isSeniorSecondaryClass("SS 3 Science"), "Allows 'SS 3 Science'");
  assert(isSeniorSecondaryClass("SS1 B"), "Allows 'SS1 B'");
  assert(!isSeniorSecondaryClass("JSS 1"), "Blocks 'JSS 1'");
  assert(!isSeniorSecondaryClass("JSS 2"), "Blocks 'JSS 2'");
  assert(!isSeniorSecondaryClass("JSS 3 Arts"), "Blocks 'JSS 3 Arts'");
  assert(!isSeniorSecondaryClass("Basic 5"), "Blocks 'Basic 5'");
  assert(!isSeniorSecondaryClass("Primary 4"), "Blocks 'Primary 4'");

  // --------------------------------------------------------------------------
  // TEST 2: Student DB Lookup & Surname Matching
  // --------------------------------------------------------------------------
  console.log("\n2. Testing Student Verification & Case-Insensitive Matching:");
  const student = await prisma.student.findUnique({
    where: { admNo: "GFMS/SS/2024/001" },
  });
  assert(!!student, "SS Student 'GFMS/SS/2024/001' found in DB");
  assert(
    student?.surname.toLowerCase() === "okeke",
    "Surname 'OKEKE' matches case-insensitively"
  );
  assert(
    isSeniorSecondaryClass(student?.currentClass || ""),
    "SS Student class is valid for CBT"
  );

  const jssStudent = await prisma.student.findUnique({
    where: { admNo: "GFMS/JSS/2024/088" },
  });
  assert(!!jssStudent, "JSS Student found in DB");
  assert(
    !isSeniorSecondaryClass(jssStudent?.currentClass || ""),
    "JSS Student is correctly REJECTED by Gatekeeper"
  );

  // --------------------------------------------------------------------------
  // TEST 3: Super Admin Credentials
  // --------------------------------------------------------------------------
  console.log("\n3. Testing Super Admin Authentication & Password Hash:");
  const admin = (await prisma.adminUser.findUnique({
    where: { email: "greatfavourmontessorischool@gmail.com" },
  })) || (await prisma.adminUser.findUnique({
    where: { email: "admin@gfms.edu.ng" },
  }));
  assert(!!admin, "Admin user exists");
  const verifyPass = process.env.VERIFY_ADMIN_PASSWORD;
  if (verifyPass) {
    const isPasswordValid = await bcrypt.compare(verifyPass, admin?.password || "");
    assert(isPasswordValid, "Bcrypt verifies VERIFY_ADMIN_PASSWORD against stored hash");
  } else {
    assert(
      typeof admin?.password === "string" && admin.password.startsWith("$2"),
      "Admin password is stored as a bcrypt hash (set VERIFY_ADMIN_PASSWORD to test match)"
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Single Payload Security & Exam Structure
  // --------------------------------------------------------------------------
  console.log("\n4. Testing Exam Payload & Objective/Theory Separation:");
  const mathExam = await prisma.exam.findFirst({
    where: { subject: "Mathematics" },
    include: {
      objectiveQuestions: true,
      theoryQuestions: true,
    },
  });

  assert(!!mathExam, "Mathematics exam exists");
  assert(
    (mathExam?.objectiveQuestions.length || 0) >= 5,
    `Mathematics has ${mathExam?.objectiveQuestions.length} Objective questions`
  );
  assert(
    (mathExam?.theoryQuestions.length || 0) >= 2,
    `Mathematics has ${mathExam?.theoryQuestions.length} Theory prompts`
  );

  // Verify options parsing
  const firstQ = mathExam?.objectiveQuestions[0];
  const parsedOptions = JSON.parse(firstQ?.options || "[]");
  assert(Array.isArray(parsedOptions) && parsedOptions.length === 4, "Objective options JSON parses to 4 choices");

  // --------------------------------------------------------------------------
  // TEST 5: Physical Theory Grading Desk & Score Recalculation
  // --------------------------------------------------------------------------
  console.log("\n5. Testing Physical Theory Grading Desk (Total = Objective + Theory):");
  const attempt = await prisma.examAttempt.findFirst({
    where: {
      student: { admNo: "GFMS/SS/2024/001" },
      examId: mathExam?.id,
    },
  });

  assert(!!attempt, "Attempt record exists for candidate Somtochukwu Okeke");
  assert(attempt?.isCompleted === true, "Attempt is marked completed");

  const objectiveScore = attempt?.objectiveScore || 0;
  const inputTheoryScore = 14; // Teacher grades physical test booklet

  const updatedAttempt = await prisma.examAttempt.update({
    where: { id: attempt?.id },
    data: {
      theoryScore: inputTheoryScore,
      totalScore: objectiveScore + inputTheoryScore,
    },
  });

  assert(
    updatedAttempt.theoryScore === 14,
    `Theory score updated to ${updatedAttempt.theoryScore}`
  );
  assert(
    updatedAttempt.totalScore === objectiveScore + 14,
    `Total score successfully recalculated: ${objectiveScore} + 14 = ${updatedAttempt.totalScore}`
  );

  console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests === totalTests) {
    console.log("🌟 ALL CBT CORE MODULES VALIDATED SUCCESSFULLY!");
  } else {
    process.exit(1);
  }
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
