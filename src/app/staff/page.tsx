import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminSession } from "@/types/cbt";
import { getTeacherSubmissionsAction } from "@/app/actions/teacher-submissions";
import { getTeacherGradingAttemptsAction } from "@/app/actions/teacher-grading";
import { getAllStudentsAction } from "@/app/actions/student-admin";
import { getAllAdminExamsAction, getFlaggedQuestionsSummaryAction } from "@/app/actions/cbt-admin";
import TeacherQuestionDeskClient from "@/components/staff/TeacherQuestionDeskClient";
import { PortalDashboardSkeleton } from "@/components/ui/Skeleton";

export const metadata = {
  title: "Teacher Command Console | GFMS Staff Portal",
  description:
    "Draft & submit examination questions, manage question drafts, inspect student objective CBT scores, and manage your subject CBT courses.",
};

async function StaffPortalLoader({ session }: { session: AdminSession }) {
  const [submissionsRes, attemptsRes, examsRes, studentsRes, flaggedRes] = await Promise.all([
    getTeacherSubmissionsAction(undefined, session.email).catch(() => ({ success: false, submissions: [] })),
    getTeacherGradingAttemptsAction(
      session.assignedSubject || undefined,
      session.assignedClass || undefined,
      session.role === "TEACHER" ? session.email : undefined
    ).catch(() => ({ success: false, attempts: [] })),
    getAllAdminExamsAction().catch(() => ({ success: false, exams: [] })),
    getAllStudentsAction().catch(() => ({ success: false, students: [] })),
    getFlaggedQuestionsSummaryAction().catch(() => ({ success: false, flaggedQuestions: [] })),
  ]);

  return (
    <TeacherQuestionDeskClient
      teacher={session}
      initialSubmissions={submissionsRes?.submissions || []}
      initialGradingAttempts={attemptsRes?.attempts || []}
      initialExams={examsRes?.exams || []}
      initialStudents={studentsRes?.students || []}
      initialFlaggedQuestions={flaggedRes?.flaggedQuestions || []}
    />
  );
}

export default async function StaffPage() {
  const session = await getAdminSession().catch(() => null);

  if (!session) {
    redirect("/staff/login");
  }

  return (
    <Suspense fallback={<PortalDashboardSkeleton variant="staff" />}>
      <StaffPortalLoader session={session} />
    </Suspense>
  );
}
