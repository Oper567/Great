import { redirect } from "next/navigation";
import { getStudentSession } from "@/app/actions/cbt-auth";
import { getStudentDashboardExamsAction } from "@/app/actions/cbt-exam";
import StudentDashboardClient from "@/components/cbt/StudentDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Student Examination Dashboard | GFMS CBT Portal",
  description: "Senior Secondary Computer-Based Examination Dashboard",
};

export default async function StudentDashboardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/cbt/login");
  }

  const { exams, error, student: liveStudent } = await getStudentDashboardExamsAction();

  return (
    <StudentDashboardClient
      student={liveStudent || session}
      exams={exams || []}
      initialError={error}
    />
  );
}
