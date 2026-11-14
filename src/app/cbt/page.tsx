import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import StudentLoginPage from "./login/page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Senior Secondary CBT Examination Portal | Great-Favour Montessori School",
  description:
    "Official Computer-Based Test (CBT) portal for Great-Favour Montessori School SS 1, SS 2, and SS 3 students.",
};

export default async function CBTIndexPage() {
  try {
    const session = await getStudentSession().catch(() => null);
    if (session) {
      redirect("/cbt/dashboard");
    }
  } catch (err) {
    // If it was a Next.js redirect, rethrow it
    if ((err as any)?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
  }
  return <StudentLoginPage />;
}
