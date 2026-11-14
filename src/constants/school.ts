/**
 * Great-Favour Montessori School (GFMS)
 * Global Brand, Academic & Institutional Constants
 */

export const SCHOOL_NAME = "Great-Favour Montessori School";
export const SCHOOL_SHORT_NAME = "GFMS";
export const FOUNDED_DATE = "September 2014";
export const FOUNDED_YEAR = 2014;

export const SCHOOL_BRAND = {
  name: SCHOOL_NAME,
  shortName: SCHOOL_SHORT_NAME,
  founded: FOUNDED_DATE,
  foundedYear: FOUNDED_YEAR,
  motto: "Leadership Academy",
  mission:
    "To cultivate visionary leaders who think critically, act with integrity to creating positive change and collaborate globally to build a more just and sustainable world.",
  vision:
    "To inspire a global generation of ethical leaders who transform challenges into opportunities for a better world.",
  coreValues: [
    {
      title: "Integrity First",
      description:
        "Upholding uncompromising moral and ethical principles in learning, leadership, and personal conduct.",
      icon: "ShieldCheck",
    },
    {
      title: "Visionary Thinking",
      description:
        "Fostering innovative, inquisitive minds equipped to foresee solutions and pioneer sustainable pathways.",
      icon: "Lightbulb",
    },
    {
      title: "Global Collaboration",
      description:
        "Instilling empathy, intercultural appreciation, and effective team dynamics to solve complex planetary problems.",
      icon: "Globe",
    },
    {
      title: "Resilient Action",
      description:
        "Transforming setbacks into stepping stones through perseverance, grit, and purposeful execution.",
      icon: "TrendingUp",
    },
  ],
} as const;

/**
 * Official Institutional Accreditation, Operating Licenses & Examination Mandates
 */
export const INSTITUTIONAL_ACCREDITATION = {
  established: "September, 2014",
  establishedDate: "September, 2014",
  officialStatement:
    "Great-Favour Montessori School was established in September, 2014. Our school has licence to operate Nursery, Primary and Secondary schools, and approved to write external examinations: FLSC, BECE, WASSCE & NECO.",
  licenseSummary: "Licence to operate Nursery, Primary and Secondary schools",
  operatingLicenses: [
    {
      level: "Nursery School",
      badge: "Licensed Early Years",
      description: "Montessori sensory foundation, phonics, and early childhood character formation.",
    },
    {
      level: "Primary School",
      badge: "Licensed Basic Education",
      description: "Comprehensive primary education leading to First School Leaving Certificate (FLSC).",
    },
    {
      level: "Secondary School",
      badge: "Licensed Junior & Senior Secondary",
      description: "Accredited junior and senior secondary with modern science labs and ICT.",
    },
  ],
  approvedExaminations: [
    {
      code: "FLSC",
      title: "First School Leaving Certificate",
      category: "Primary Education",
      badge: "Approved",
      description: "Official primary exit examination for transition into junior secondary.",
    },
    {
      code: "BECE",
      title: "Basic Education Certificate Examination",
      category: "Junior Secondary (JSS 3)",
      badge: "Approved",
      description: "Junior secondary graduation exam conducted for state & national certifications.",
    },
    {
      code: "WASSCE",
      title: "West African Senior School Certificate Examination",
      category: "Senior Secondary (SS 3)",
      badge: "WAEC Approved",
      description: "Premier regional examination for tertiary and university admissions worldwide.",
    },
    {
      code: "NECO",
      title: "National Examinations Council (SSCE)",
      category: "Senior Secondary (SS 3)",
      badge: "NECO Approved",
      description: "National secondary school certificate for tertiary entry across Nigeria and abroad.",
    },
  ],
  coreGoalAndObjective:
    "One of our core goal and objective is creating a suitable learning environment, where academic and morals are inculcated, thus building godly leaders of tomorrow.",
} as const;

/**
 * Key Leadership & Governance Personnel
 */
export const KEY_PERSONNEL = {
  director: {
    fullName: "Hon Okolie Peter Isioma JP MCArb",
    title: "Director & Proprietor",
    role: "SUPER_ADMIN" as const,
    bio: "A passionate community builder and educationist who founded Great-Favour in September 2014 to give every child a caring, modern school where they can learn with joy and grow into honest leaders.",
    appointedYear: 2014,
    image: "/assets/images/IMG-20260930-WA0375.jpg",
  },
  deputyDirector: {
    fullName: "Mrs Jane Ekene Okolie",
    title: "Deputy Director Administration & Montessori Administrator",
    portfolio: "Administration & Montessori Education",
    role: "ADMIN" as const,
    bio: "Overseeing institutional administration, Montessori early-learning standards, teacher development, and pupil welfare to ensure an enriching, values-driven school environment.",
    appointedYear: 2014,
    image: "/assets/images/mrs-jane-ekene-okolie.jpg",
  },
  headTeacher: {
    fullName: "Okafor Obinna Jude",
    title: "Head Teacher",
    portfolio: "Academic Excellence & Montessori Standards",
    role: "ADMIN" as const,
    bio: "Working closely with our teachers every day to make lessons interactive and practical, helping every child discover their unique talents and build strong moral character.",
    appointedYear: 2016,
    image: "/assets/images/head-teacher.jpg",
    email: "greatfavourmontessorischool@gmail.com",
    deskMessage:
      "Every child comes to us with natural curiosity. At Great-Favour, we don't just teach children to pass exams—we teach them to think for themselves, care for their community, and step forward with confidence.",
  },
} as const;

/**
 * Official School Contact Information
 */
export const SCHOOL_CONTACT = {
  address: "Great-Favour Montessori Street, Issele-Azagba, Aniocha North L.G.A, Delta State, Nigeria",
  town: "Issele-Azagba",
  lga: "Aniocha North",
  state: "Delta State",
  country: "Nigeria",
  phones: ["+234 905 894 3474", "+234 814 336 8320"],
  phoneFormatted: "0905 894 3474 / 0814 336 8320",
  whatsapp: "08033126400",
  whatsappFormatted: "+234 803 312 6400",
  whatsappLink: "https://wa.me/2348033126400?text=Hello%20Great-Favour%20Montessori%20School,%20I%20would%20like%20to%20inquire%20about%20admissions.",
  email: "greatfavourmontessorischool@gmail.com",
  directorEmail: "greatfavourmontessorischool@gmail.com",
  headTeacherEmail: "greatfavourmontessorischool@gmail.com",
  bursarEmail: "greatfavourmontessorischool@gmail.com",
  workingHours: "Monday – Friday: 7:30 AM – 4:30 PM",
} as const;

/**
 * Distinguished Faculty & Departmental Leadership
 */
export interface FacultyMember {
  id: string;
  name: string;
  role: string;
  department: string;
  division: "All" | "Montessori" | "Primary" | "Secondary" | "STEM" | "Bursary" | "Counseling" | "Operations";
  bio: string;
  image: string;
  objectPosition?: string;
  featured?: boolean;
}

export const ACADEMIC_FACULTY: readonly FacultyMember[] = [
  {
    id: "fac-head-teacher",
    name: "Okafor Obinna Jude",
    role: "Head Teacher",
    department: "Academic Administration",
    division: "All",
    bio: "Guiding the entire teaching staff, ensuring lesson plans are hands-on, engaging, and faithful to true Montessori practice.",
    image: "/assets/images/head-teacher.jpg",
    objectPosition: "object-top",
    featured: true,
  },
  {
    id: "fac-hod-counseling",
    name: "Mrs. Chiedu Eno",
    role: "HOD Guardian and Counseling",
    department: "Guardian & Counseling",
    division: "All",
    bio: "Championing student psychological well-being, moral guidance, career path orientation, and proactive emotional support across all educational levels.",
    image: "/assets/images/mrs-chiedu-eno.jpg",
    objectPosition: "object-center",
    featured: true,
  },
  {
    id: "fac-hod-exams",
    name: "Ms. Gift Itakpe",
    role: "HOD Examinations & Academic Standards",
    department: "Examinations & Standards",
    division: "All",
    bio: "Ensures all tests, termly examinations, continuous assessments, and report cards are accurate, honest, and properly organized.",
    image: "/assets/images/gift.jpg",
    objectPosition: "object-center",
    featured: true,
  },
  {
    id: "fac-hod-nursery",
    name: "Mrs. Philo Mordi",
    role: "HOD Nursery Pupils",
    department: "Early Years & Nursery Section",
    division: "Montessori",
    bio: "Leading our foundational Montessori early-learning sensory activities, numeracy basics, emotional nurturing, and early childhood developmental milestones.",
    image: "/assets/images/mrs-philo-mordi.jpg",
    objectPosition: "object-center",
    featured: true,
  },
  {
    id: "fac-sec-primary",
    name: "Miss Grace Edechi",
    role: "School Secretary (Primary Session)",
    department: "Primary Administration & Records",
    division: "Primary",
    bio: "Managing primary pupil enrollment registers, official school records, daily correspondence, and welcoming parents with exemplary organizational care.",
    image: "/assets/images/miss-grace.jpg",
    objectPosition: "object-center",
    featured: true,
  },
  {
    id: "fac-bursar",
    name: "Mr. Paul Uyokei",
    role: "Bursary / Admission Officer",
    department: "Bursary & Admissions",
    division: "Bursary",
    bio: "Managing tuition billing, scratch card distribution, school accounts, and welcoming new families through the student admission process with transparency and integrity.",
    image: "/assets/images/Mr paul.jpg",
    objectPosition: "object-center",
    featured: true,
  },
  {
    id: "fac-cso",
    name: "Insp. James Ukpere (Rtd Police Officer)",
    role: "Chief Security Officer (CSO)",
    department: "Campus Safety & Security",
    division: "Operations",
    bio: "Directing comprehensive campus safety protocols, perimeter surveillance, pupil safeguarding, emergency response drills, and disciplined gate access control.",
    image: "/assets/images/insp-james-ukpere.jpg",
    objectPosition: "object-center",
    featured: true,
  },
  {
    id: "fac-bus-manager",
    name: "Mr. Odogwu Victor",
    role: "School Bus Manager",
    department: "Transport & Logistics",
    division: "Operations",
    bio: "Supervising school transit routes, daily pupil pickup & dropoff logistics, bus fleet mechanical maintenance, and uncompromising road safety standards.",
    image: "/assets/images/mr-odogwu-victor.jpg",
    objectPosition: "object-center",
    featured: true,
  },
  {
    id: "fac-staff-1",
    name: "Mr. Jude Godstime",
    role: "HOD ICT & Computer Education",
    department: "ICT & Digital Lab",
    division: "STEM",
    bio: "Teaching coding, typing, computer basics, and safe internet skills to prepare students for the modern digital world.",
    image: "/assets/images/staff-1.jpg",
    objectPosition: "object-top",
    featured: false,
  },
  {
    id: "fac-staff-2",
    name: "Mr. Abraham Akozor",
    role: "HOD Science Management",
    department: "Science Management",
    division: "STEM",
    bio: "Guiding students through science curriculum, laboratory apparatus calibration, safety management, and rigorous scientific inquiry.",
    image: "/assets/images/Abraham.jpg",
    objectPosition: "object-center",
    featured: false,
  },
  {
    id: "fac-staff-3",
    name: "Teacher Omoile Stanley Henry",
    role: "HOD Pure Science & Laboratories",
    department: "Pure Science & Laboratories",
    division: "STEM",
    bio: "Directing pure science curriculum, chemistry, physics, and biology practical investigations with dedicated laboratory management.",
    image: "/assets/images/Teacher Stanley.jpg",
    objectPosition: "object-center",
    featured: false,
  },
];

/**
 * Institutional Divisions
 */
export enum SchoolDivision {
  PRIMARY = "PRIMARY",
  SECONDARY = "SECONDARY",
}

/**
 * Complete 15-Class Hierarchy
 * - Primary: 9 Classes (Play Class, Nursery 1-3, Basic 1-5) - Target capacity ~200
 * - Secondary: 6 Classes (JSS 1-3, SS 1-3) - Target capacity ~500
 */
export interface ClassDefinition {
  id: string;
  name: string;
  code: string;
  division: SchoolDivision;
  gradeLevel: number;
  order: number;
  approxCapacity: number;
  description: string;
}

export const PRIMARY_CLASSES: readonly ClassDefinition[] = [
  {
    id: "cls-play-class",
    name: "Play Class",
    code: "PLAY",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 0,
    order: 1,
    approxCapacity: 20,
    description: "Montessori early-learning sensory and exploratory stage for toddlers.",
  },
  {
    id: "cls-nursery-1",
    name: "Nursery 1",
    code: "NUR1",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 1,
    order: 2,
    approxCapacity: 20,
    description: "Foundational Montessori phonics, motor skills, and social collaboration.",
  },
  {
    id: "cls-nursery-2",
    name: "Nursery 2",
    code: "NUR2",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 2,
    order: 3,
    approxCapacity: 22,
    description: "Early numeracy, language development, and guided self-directed learning.",
  },
  {
    id: "cls-nursery-3",
    name: "Nursery 3",
    code: "NUR3",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 3,
    order: 4,
    approxCapacity: 22,
    description: "Transition preparatory Montessori curriculum preceding primary education.",
  },
  {
    id: "cls-basic-1",
    name: "Basic 1",
    code: "BAS1",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 4,
    order: 5,
    approxCapacity: 25,
    description: "Primary foundation in literacy, quantitative reasoning, and sciences.",
  },
  {
    id: "cls-basic-2",
    name: "Basic 2",
    code: "BAS2",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 5,
    order: 6,
    approxCapacity: 25,
    description: "Enhanced analytical skills, cultural awareness, and digital literacy.",
  },
  {
    id: "cls-basic-3",
    name: "Basic 3",
    code: "BAS3",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 6,
    order: 7,
    approxCapacity: 28,
    description: "Intermediate primary education with emphasis on critical problem-solving.",
  },
  {
    id: "cls-basic-4",
    name: "Basic 4",
    code: "BAS4",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 7,
    order: 8,
    approxCapacity: 28,
    description: "Advanced primary concepts, STEM exploration, and creative expression.",
  },
  {
    id: "cls-basic-5",
    name: "Basic 5",
    code: "BAS5",
    division: SchoolDivision.PRIMARY,
    gradeLevel: 8,
    order: 9,
    approxCapacity: 30,
    description: "Final primary benchmark year preparing students for junior secondary entrance examinations.",
  },
];

export const SECONDARY_CLASSES: readonly ClassDefinition[] = [
  {
    id: "cls-jss-1",
    name: "JSS 1",
    code: "JSS1",
    division: SchoolDivision.SECONDARY,
    gradeLevel: 9,
    order: 10,
    approxCapacity: 80,
    description: "Junior Secondary entry: Comprehensive multidisciplinary curriculum and leadership orientation.",
  },
  {
    id: "cls-jss-2",
    name: "JSS 2",
    code: "JSS2",
    division: SchoolDivision.SECONDARY,
    gradeLevel: 10,
    order: 11,
    approxCapacity: 85,
    description: "Intermediate Junior Secondary deepening scientific inquiry, humanities, and technology.",
  },
  {
    id: "cls-jss-3",
    name: "JSS 3",
    code: "JSS3",
    division: SchoolDivision.SECONDARY,
    gradeLevel: 11,
    order: 12,
    approxCapacity: 85,
    description: "Junior Secondary culmination leading to BECE certification and senior career pathway choice.",
  },
  {
    id: "cls-ss-1",
    name: "SS 1",
    code: "SS1",
    division: SchoolDivision.SECONDARY,
    gradeLevel: 12,
    order: 13,
    approxCapacity: 85,
    description: "Senior Secondary commencement: Sciences, Arts, and Commercial specialization pathways.",
  },
  {
    id: "cls-ss-2",
    name: "SS 2",
    code: "SS2",
    division: SchoolDivision.SECONDARY,
    gradeLevel: 13,
    order: 14,
    approxCapacity: 64, // Science: 29, Art: 35
    description: "Senior Secondary 2 cohort with Science Stream (29 students) and Art & Humanities Stream (35 students). Total: 64 students.",
  },
  {
    id: "cls-ss-3",
    name: "SS 3",
    code: "SS3",
    division: SchoolDivision.SECONDARY,
    gradeLevel: 14,
    order: 15,
    approxCapacity: 74, // Science: 37, Art: 37
    description: "Final graduating Senior Secondary 3 cohort with Science Stream (37 students) and Art & Humanities Stream (37 students). Total: 74 students.",
  },
];

export const ALL_CLASSES: readonly ClassDefinition[] = [
  ...PRIMARY_CLASSES,
  ...SECONDARY_CLASSES,
];

/**
 * Institutional Student Demographic Targets
 */
export const STUDENT_CAPACITY = {
  totalTarget: 700,
  primaryTarget: 200,
  secondaryTarget: 500,
} as const;

/**
 * System User Roles
 */
export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  STUDENT: "STUDENT",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Brand Color Hex Codes for Dynamic / SVG / Canvas Use
 */
export const BRAND_COLORS = {
  primary: {
    royalBlue: "#1E40AF",
    deepBlue: "#1E3A8A",
    midnightBlue: "#172554",
    lightBlue: "#DBEAFE",
  },
  secondary: {
    goldenYellow: "#F59E0B",
    deepGold: "#D97706",
    lightGold: "#FEF3C7",
  },
  accents: {
    kellyGreen: "#15803D",
    crimsonRed: "#DC2626",
  },
  neutrals: {
    white: "#FFFFFF",
    canvas: "#F8FAFC",
    charcoal: "#1E293B",
    charcoalDeep: "#0F172A",
    charcoalMuted: "#64748B",
  },
} as const;
