/**
 * Great-Favour Montessori School (GFMS)
 * Type Definitions for Report Card, Result Checker & Academic Assessment
 */

export type AcademicTermType = "FIRST_TERM" | "SECOND_TERM" | "THIRD_TERM";

export interface StudentBio {
  id: string;
  admissionNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: "MALE" | "FEMALE";
  dateOfBirth?: string;
  className: string;
  arm?: string;
  classCode: string;
  division: "PRIMARY" | "SECONDARY";
  avatarUrl?: string;
}

export interface CognitiveScoreItem {
  id: string;
  subjectName: string;
  subjectCode: string;
  category?: string; // Grouped subjects: "National Values", "Basic Science & Technology", etc.
  ca1: number;       // Max 15 (Term CA1)
  ca2: number;       // Max 15 (Term CA2)
  exam: number;      // Max 70 (Terminal Exam)
  totalScore: number;// Max 100 (Term Total)
  term1Score?: number; // 1st Term Total (Max 100) - compiled in 3rd term
  term2Score?: number; // 2nd Term Total (Max 100) - compiled in 3rd term
  term3Total?: number; // 3rd Term Total (Max 100)
  cumulativeScore?: number; // Cumulative Annual Average %: (T1 + T2 + T3) / 3
  grade: string;     // A, B, C, P, F
  remark: string;    // Distinction, Credit, Pass, etc.
}

export interface GroupedCognitiveCategory {
  categoryName: string;
  subjects: CognitiveScoreItem[];
}

export interface PsychomotorSkillsRatings {
  handwriting: number;         // 1 - 5
  fluency: number;             // 1 - 5
  games: number;               // 1 - 5
  sports: number;              // 1 - 5
  handlingOfTools: number;     // 1 - 5
  labAndWorkshop: number;      // 1 - 5
  drawingAndPainting: number;  // 1 - 5
  craft: number;               // 1 - 5
  musicSkill: number;          // 1 - 5
}

export interface AffectiveBehaviourRatings {
  punctuality: number;             // 1 - 5
  attendance: number;              // 1 - 5
  neatness: number;                // 1 - 5
  politeness: number;              // 1 - 5
  honesty: number;                 // 1 - 5
  relationshipWithOthers: number;  // 1 - 5
  selfControl: number;             // 1 - 5
  spiritOfCooperation: number;     // 1 - 5
  senseOfResponsibility: number;   // 1 - 5
  attentiveness: number;           // 1 - 5
  initiatives: number;             // 1 - 5
  organizationalAbility: number;   // 1 - 5
}

export interface SchoolFeeNotice {
  termFeeAmount?: string;
  dueDate?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  status?: "PAID" | "PARTIALLY_PAID" | "OUTSTANDING";
  receiptNumber?: string;
}

export interface ReportCardData {
  enrollmentId: string;
  session: string;             // e.g. "2025/2026"
  term: AcademicTermType;      // "THIRD_TERM"
  termLabel: string;           // "Third Term"
  
  // Student Bio
  student: StudentBio;
  
  // Class Hierarchy & Rank
  numberInClass: number;       // e.g. 38
  positionInClass: number;     // e.g. 1
  positionSuffix: string;      // "st", "nd", "rd", "th"
  nextClass: string;           // e.g. "JSS 3"
  nextTermBegins: string;      // e.g. "September 14, 2026"
  
  // Attendance Records
  daysOpened: number;          // e.g. 115
  daysPresent: number;         // e.g. 112
  daysAbsent: number;          // e.g. 3
  
  // Academic Metrics
  totalScoreObtained: number;  // e.g. 1120
  totalScorePossible: number;  // e.g. 1300
  studentAverage: number;      // e.g. 86.15
  classAverage: number;        // e.g. 69.40
  decision: string;            // e.g. "PROMOTED TO JSS 3"
  
  // Cognitive Grades (including grouped subjects)
  cognitiveGrades: CognitiveScoreItem[];
  
  // Psychomotor & Affective Ratings
  skills: PsychomotorSkillsRatings;
  behaviour: AffectiveBehaviourRatings;
  
  // Remarks & Approvals
  formMasterComment: string;
  formMasterName: string;
  principalRemark: string;
  principalName: string;
  parentCommentPlaceholder?: string;
  
  // School Fee Notice for Header
  feeInfo: SchoolFeeNotice;
}

export const SKILL_LABELS: Record<keyof PsychomotorSkillsRatings, string> = {
  handwriting: "Handwriting",
  fluency: "Fluency",
  games: "Games",
  sports: "Sports",
  handlingOfTools: "Handling of Tools",
  labAndWorkshop: "Lab & Workshop",
  drawingAndPainting: "Drawing & Painting",
  craft: "Craft",
  musicSkill: "Music Skill",
};

export const BEHAVIOUR_LABELS: Record<keyof AffectiveBehaviourRatings, string> = {
  punctuality: "Punctuality",
  attendance: "Attendance",
  neatness: "Neatness",
  politeness: "Politeness",
  honesty: "Honesty",
  relationshipWithOthers: "Relationship with others",
  selfControl: "Self Control",
  spiritOfCooperation: "Spirit of cooperation",
  senseOfResponsibility: "Sense of Responsibility",
  attentiveness: "Attentiveness",
  initiatives: "Initiatives",
  organizationalAbility: "Organizational Ability",
};

export const RATING_SCALE_KEY = [
  { score: 5, label: "Excellent / Outstanding Degree" },
  { score: 4, label: "Good / High Degree" },
  { score: 3, label: "Fair / Acceptable Level" },
  { score: 2, label: "Poor / Needs Improvement" },
  { score: 1, label: "Very Poor / No Regard" },
];

export function getOrdinalSuffix(n: number): string {
  const abs = Math.abs(Math.floor(n || 0));
  const j = abs % 10;
  const k = abs % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

export interface PreparedSubjectScore {
  id: string;
  subjectName: string;
  subjectCode: string;
  category: string;
  ca1: number; // Max 15 (Term CA1)
  ca2: number; // Max 15 (Term CA2)
  exam: number; // Max 70 (Terminal Exam)
  totalScore: number; // Max 100 (Term Total)
  term1Score?: number; // 1st Term Total (Max 100) - for 3rd term cumulative
  term2Score?: number; // 2nd Term Total (Max 100) - for 3rd term cumulative
  term3Total?: number; // 3rd Term Total (Max 100)
  cumulativeScore?: number; // Cumulative Annual Average %
  grade: string; // A, B, C, D, E, F
  remark: string; // Distinction, Excellent, Credit, Pass, Fail
}

export interface PreparedResultPayload {
  studentName: string;
  admNo: string;
  className: string;
  arm?: string;
  session: string;
  term: string;
  termLabel: string;
  gender?: "MALE" | "FEMALE";
  division?: "PRIMARY" | "SECONDARY";
  studentPhotoUrl?: string;
  numberInClass: number;
  position: number;
  isPositionManual?: boolean;
  daysOpened: number;
  daysPresent: number;
  daysAbsent: number;
  decision: string;
  nextClass: string;
  nextTermBegins: string;
  teacherRemark: string;
  principalRemark: string;
  formMasterName?: string;
  principalName?: string;
  classAverage?: number;
  feeInfo?: {
    termFeeAmount?: string;
    dueDate?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    status?: "PAID" | "PARTIALLY_PAID" | "OUTSTANDING";
    receiptNumber?: string;
  };
  skills?: Record<string, number>;
  behaviour?: Record<string, number>;
  subjects: PreparedSubjectScore[];
}

export const DEFAULT_PREPARED_SKILLS: Record<string, number> = {
  handwriting: 5,
  fluency: 5,
  games: 4,
  sports: 4,
  handlingOfTools: 4,
  labAndWorkshop: 5,
  drawingAndPainting: 4,
  craft: 4,
  musicSkill: 4,
};

export const DEFAULT_PREPARED_BEHAVIOUR: Record<string, number> = {
  punctuality: 5,
  attendance: 5,
  neatness: 5,
  politeness: 5,
  honesty: 5,
  relationshipWithOthers: 5,
  selfControl: 4,
  spiritOfCooperation: 5,
  senseOfResponsibility: 5,
  attentiveness: 5,
  initiatives: 4,
  organizationalAbility: 5,
};

export const DEFAULT_PREPARED_FEE = {
  termFeeAmount: "",
  dueDate: "",
  bankName: "",
  accountNumber: "",
  accountName: "",
  status: "PAID" as const,
  receiptNumber: "",
};

