import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { getAllAdminExamsAction } from "@/app/actions/cbt-admin";
import { getTeacherSubmissionsAction } from "@/app/actions/teacher-submissions";
import { getAllTerminalResultsAction } from "@/app/actions/terminal-result-admin";
import { getAllScratchCardsAction } from "@/app/actions/scratch-card-admin";
import { getAllStudentsAction } from "@/app/actions/student-admin";
import { getAllTeachersAction } from "@/app/actions/staff-admin";
import AdminCbtDashboardClient from "@/components/cbt/AdminCbtDashboardClient";

export const metadata = {
  title: "Super Admin CBT Command Center | GFMS",
  description:
    "Computer-Based Test Exam Creator, Question Uploader, Student RegNo Desk, Staff Desk, Scratch Card Generator, and Terminal Result Preparation Desk",
};

export default async function AdminCbtPage() {
  const adminSession = await getAdminSession().catch(() => null);

  // Security Gatekeeper: Teachers must NOT access Super Admin commands.
  // Redirect teachers immediately to their dedicated, privacy-protected /staff portal.
  if (adminSession?.role === "TEACHER") {
    redirect("/staff");
  }

  try {
    let exams: any[] = [];
    let submissions: any[] = [];
    let results: any[] = [];
    let cardsData: any = { cards: [], stats: null };
    let students: any[] = [];
    let teachers: any[] = [];

    if (adminSession) {
      try {
        const [examRes, subRes, resRes, cardRes, studentRes, teacherRes] = await Promise.all([
          getAllAdminExamsAction().catch(() => ({ exams: [] })),
          getTeacherSubmissionsAction().catch(() => ({ submissions: [] })),
          getAllTerminalResultsAction().catch(() => ({ results: [] })),
          getAllScratchCardsAction().catch(() => ({ cards: [], stats: null })),
          getAllStudentsAction().catch(() => ({ students: [] })),
          getAllTeachersAction().catch(() => ({ teachers: [] })),
        ]);
        exams = examRes?.exams || [];
        submissions = subRes?.submissions || [];
        results = resRes?.results || [];
        cardsData = cardRes || { cards: [], stats: null };
        students = studentRes?.students || [];
        teachers = teacherRes?.teachers || [];
      } catch (err) {
        console.error("Failed to load admin dashboard data in AdminCbtPage:", err);
      }
    }

    return (
      <AdminCbtDashboardClient
        admin={adminSession}
        initialExams={exams}
        initialSubmissions={submissions}
        initialResults={results}
        initialCardsData={cardsData}
        initialStudents={students}
        initialTeachers={teachers}
      />
    );
  } catch (err) {
    console.error("AdminCbtPage render error:", err);
    return (
      <AdminCbtDashboardClient
        admin={null}
        initialExams={[]}
        initialSubmissions={[]}
        initialResults={[]}
        initialCardsData={{ cards: [], stats: null }}
        initialStudents={[]}
        initialTeachers={[]}
      />
    );
  }
}
