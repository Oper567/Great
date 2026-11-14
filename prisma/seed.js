const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const KEY_PERSONNEL = {
  director: {
    fullName: "Hon Okolie Peter Isioma JP MCArb",
    title: "Director & Proprietor",
    bio: "Visionary educational leader dedicated to establishing transformative Montessori and secondary academic excellence.",
  },
  deputyDirector: {
    fullName: "Mrs Jane Ekene Okolie",
    title: "Deputy Director",
    portfolio: "Finance & Administration",
    bio: "Distinguished educational administrator overseeing institutional governance, fiscal integrity, and operational vitality.",
  },
};

const PRIMARY_CLASSES = [
  { name: "Play Class", code: "PLAY", division: "PRIMARY", gradeLevel: 0, order: 1, approxCapacity: 20 },
  { name: "Nursery 1", code: "NUR1", division: "PRIMARY", gradeLevel: 1, order: 2, approxCapacity: 20 },
  { name: "Nursery 2", code: "NUR2", division: "PRIMARY", gradeLevel: 2, order: 3, approxCapacity: 22 },
  { name: "Nursery 3", code: "NUR3", division: "PRIMARY", gradeLevel: 3, order: 4, approxCapacity: 22 },
  { name: "Basic 1", code: "BAS1", division: "PRIMARY", gradeLevel: 4, order: 5, approxCapacity: 25 },
  { name: "Basic 2", code: "BAS2", division: "PRIMARY", gradeLevel: 5, order: 6, approxCapacity: 25 },
  { name: "Basic 3", code: "BAS3", division: "PRIMARY", gradeLevel: 6, order: 7, approxCapacity: 28 },
  { name: "Basic 4", code: "BAS4", division: "PRIMARY", gradeLevel: 7, order: 8, approxCapacity: 28 },
  { name: "Basic 5", code: "BAS5", division: "PRIMARY", gradeLevel: 8, order: 9, approxCapacity: 30 },
];

const SECONDARY_CLASSES = [
  { name: "JSS 1", code: "JSS1", division: "SECONDARY", gradeLevel: 9, order: 10, approxCapacity: 80 },
  { name: "JSS 2", code: "JSS2", division: "SECONDARY", gradeLevel: 10, order: 11, approxCapacity: 85 },
  { name: "JSS 3", code: "JSS3", division: "SECONDARY", gradeLevel: 11, order: 12, approxCapacity: 85 },
  { name: "SS 1", code: "SS1", division: "SECONDARY", gradeLevel: 12, order: 13, approxCapacity: 85 },
  { name: "SS 2", code: "SS2", division: "SECONDARY", gradeLevel: 13, order: 14, approxCapacity: 85 },
  { name: "SS 3", code: "SS3", division: "SECONDARY", gradeLevel: 14, order: 15, approxCapacity: 80 },
];

async function main() {
  console.log("🏫 Seeding Great-Favour Montessori School (GFMS) Database...");

  // 1. Leadership Personnel
  const director = await prisma.user.upsert({
    where: { email: "director@gfms.edu.ng" },
    update: {},
    create: {
      email: "director@gfms.edu.ng",
      passwordHash: "$2b$12$eX4mpL3H4shDirectorGFMS2014SecureKey",
      role: "SUPER_ADMIN",
      firstName: "Peter Isioma",
      lastName: "Okolie",
      phoneNumber: "+234-803-000-0001",
      staffProfile: {
        create: {
          designation: "Director & Proprietor",
          department: "Executive Leadership",
          portfolio: "Director",
          qualifications: "Hon JP MCArb",
          bio: KEY_PERSONNEL.director.bio,
          appointmentDate: new Date("2014-09-01"),
        },
      },
    },
  });
  console.log("  ✓ Seeded Super Admin: Hon Okolie Peter Isioma JP MCArb");

  const deputy = await prisma.user.upsert({
    where: { email: "deputy.director@gfms.edu.ng" },
    update: {},
    create: {
      email: "deputy.director@gfms.edu.ng",
      passwordHash: "$2b$12$eX4mpL3H4shDeputyDirectorGFMSFinanceKey",
      role: "ADMIN",
      firstName: "Jane Ekene",
      lastName: "Okolie",
      phoneNumber: "+234-803-000-0002",
      staffProfile: {
        create: {
          designation: "Deputy Director",
          department: "Administration & Finance",
          portfolio: "Finance/Admin",
          qualifications: "B.Ed, M.Sc",
          bio: KEY_PERSONNEL.deputyDirector.bio,
          appointmentDate: new Date("2014-09-01"),
        },
      },
    },
  });
  console.log("  ✓ Seeded Admin: Mrs Jane Ekene Okolie");

  // 2. 15 Classes
  const allClasses = [...PRIMARY_CLASSES, ...SECONDARY_CLASSES];
  const classMap = new Map();
  for (const cls of allClasses) {
    const created = await prisma.class.upsert({
      where: { code: cls.code },
      update: {},
      create: {
        name: cls.name,
        code: cls.code,
        division: cls.division,
        gradeLevel: cls.gradeLevel,
        orderIndex: cls.order,
        capacity: cls.approxCapacity,
      },
    });
    classMap.set(cls.code, created.id);
  }
  console.log("  ✓ Seeded 15 Classes (9 Primary, 6 Secondary)");

  // 3. Scratch Cards
  const cards = [
    { pin: "GFMS-8492-1049", serialNumber: "SN-GFMS-2025-001", admNo: null, usageCount: 0, maxUsage: 5, status: "active" },
    { pin: "GFMS-3310-9921", serialNumber: "SN-GFMS-2025-002", admNo: "GFMS/2024/0501", usageCount: 1, maxUsage: 5, status: "active" },
    { pin: "GFMS-5555-1111", serialNumber: "SN-GFMS-2025-003", admNo: "GFMS/2025/0024", usageCount: 2, maxUsage: 5, status: "active" },
    { pin: "GFMS-0000-9999", serialNumber: "SN-GFMS-2025-004", admNo: "GFMS/2024/0501", usageCount: 5, maxUsage: 5, status: "exhausted" },
  ];

  for (const c of cards) {
    await prisma.scratchCard.upsert({
      where: { pin: c.pin },
      update: c,
      create: c,
    });
  }
  console.log("  ✓ Seeded 4 Scratch Cards (Fresh, Locked, and Exhausted)");

  // 4. Sample Student
  const jss2Id = classMap.get("JSS2");
  if (jss2Id) {
    await prisma.student.upsert({
      where: { admissionNumber: "GFMS/2024/0501" },
      update: {},
      create: {
        admissionNumber: "GFMS/2024/0501",
        firstName: "Somtochukwu",
        middleName: "Grace",
        lastName: "Okeke",
        gender: "FEMALE",
        dateOfBirth: new Date("2010-09-22"),
        division: "SECONDARY",
        classId: jss2Id,
        status: "ACTIVE",
        guardianName: "Dr. & Mrs. Okeke",
        guardianPhone: "+234-803-987-6543",
      },
    });
    console.log("  ✓ Seeded Student: Somtochukwu Grace Okeke (GFMS/2024/0501)");
  }

  console.log("🎉 Seeding Completed Successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
