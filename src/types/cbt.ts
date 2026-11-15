export type CBTUserRole = "SUPER_ADMIN" | "TEACHER";

export interface StudentSession {
  studentId: number;
  admNo: string;
  fullName: string;
  surname: string;
  currentClass: string;
  arm?: string;
}

export interface AdminSession {
  adminId: number;
  email: string;
  fullName: string;
  role: CBTUserRole;
  assignedClass?: string | null;
  assignedSubject?: string | null;
}

export interface ClientObjectiveQuestion {
  id: number;
  questionText: string;
  options: string[]; // parsed array e.g. ["Option A", "Option B", "Option C", "Option D"]
  points: number;
  imageUrl?: string | null;
}

export interface ClientTheoryQuestion {
  id: number;
  questionNum: number;
  questionText: string;
  maxScore: number;
  instructions?: string | null;
  imageUrl?: string | null;
}

export interface ClientExamPayload {
  exam: {
    id: number;
    title: string;
    subject: string;
    targetClass: string;
    durationMinutes: number;
    hasTheory: boolean;
    examDate: string;
  };
  student: StudentSession;
  attemptId: number;
  startedAt: string;
  serverNow?: string;
  durationSeconds?: number;
  remainingSeconds?: number;
  objectiveQuestions: ClientObjectiveQuestion[];
  theoryQuestions: ClientTheoryQuestion[];
  existingAnswers?: Record<number, string>;
  recoveredSession?: boolean;
  savedCurrentIndex?: number;
  savedFlaggedIds?: number[];
  savedQuestionOrder?: number[];
}

export interface AttemptGradingRow {
  id: number;
  studentId: number;
  studentAdmNo: string;
  studentFullName: string;
  studentClass: string;
  studentArm?: string;
  examId: number;
  startedAt: Date;
  submittedAt: Date | null;
  isCompleted: boolean;
  objectiveScore: number;
  theoryScore: number | null;
  totalScore: number;
  answeredCount?: number;
  remainingSeconds?: number | null;
  lastSavedAt?: string | null;
  flaggedQuestionIds?: number[];
  isTransmittedToAdmin?: boolean;
  gradedByTeacherName?: string | null;
}

export interface FlaggedStudentRef {
  attemptId: number;
  studentId: number;
  studentAdmNo: string;
  studentFullName: string;
  studentClass: string;
  selectedOption: string | null;
  isCompleted: boolean;
  submittedAt: Date | null;
}

export interface FlaggedQuestionSummaryItem {
  examId: number;
  examTitle: string;
  examSubject: string;
  targetClass: string;
  questionId: number;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
  imageUrl?: string | null;
  flagCount: number;
  flaggedByStudents: FlaggedStudentRef[];
}
