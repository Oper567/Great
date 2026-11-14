import { redirect } from "next/navigation";
import { getStudentSession } from "@/app/actions/cbt-auth";
import { getSinglePayloadExamAction } from "@/app/actions/cbt-exam";
import CbtExamEngine from "@/components/cbt/CbtExamEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "CBT Examination Room | GFMS",
  description: "Computer-Based Examination Terminal",
};

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ExamRoomPage({ params }: PageProps) {
  const session = await getStudentSession();
  if (!session) {
    redirect("/cbt/login");
  }

  const examId = parseInt(params.id, 10);
  if (isNaN(examId)) {
    redirect("/cbt/dashboard");
  }

  // Fetch the single payload once on the server
  const initialResult = await getSinglePayloadExamAction(examId);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <CbtExamEngine
        examId={examId}
        student={session}
        initialResult={initialResult}
      />
    </main>
  );
}
