import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { getTeacherSubmissionsAction } from "@/app/actions/teacher-submissions";
import { getTeacherGradingAttemptsAction } from "@/app/actions/teacher-grading";
import { getAllStudentsAction } from "@/app/actions/student-admin";
import { getAllAdminExamsAction } from "@/app/actions/cbt-admin";
import TeacherQuestionDeskClient from "@/components/staff/TeacherQuestionDeskClient";

export const metadata = {
  title: "Teacher Command Console | GFMS Staff Portal",
  description:
    "Draft & submit examination questions, manage question drafts, inspect student objective CBT scores, and manage your subject CBT courses.",
};

export default async function StaffPage() {
  const session = await getAdminSession().catch(() => null);

  if (!session) {
    redirect("/staff/login");
  }

  const [submissionsRes, attemptsRes, examsRes, studentsRes] = await Promise.all([
    getTeacherSubmissionsAction(undefined, session.email).catch(() => ({ success: false, submissions: [] })),
    getTeacherGradingAttemptsAction(
      session.assignedSubject || undefined,
      session.assignedClass || undefined,
      session.email
    ).catch(() => ({ success: false, attempts: [] })),
    getAllAdminExamsAction().catch(() => ({ success: false, exams: [] })),
    getAllStudentsAction().catch(() => ({ success: false, students: [] })),
  ]);

  const initialSubmissions = submissionsRes?.submissions || [];
  const initialAttempts = attemptsRes?.attempts || [];
  const initialExams = examsRes?.exams || [];
  const initialStudents = studentsRes?.students || [];

  return (
    <TeacherQuestionDeskClient
      teacher={session}
      initialSubmissions={initialSubmissions}
      initialGradingAttempts={initialAttempts}
      initialExams={initialExams}
      initialStudents={initialStudents}
    />
  );
}
