import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import StaffLoginClient from "@/components/staff/StaffLoginClient";

export const metadata = {
  title: "Staff & Faculty Portal Login | Great-Favour Montessori School",
  description:
    "Secure academic staff authentication portal for Great-Favour Montessori School (GFMS) teachers, examiners, and administrators.",
};

export default async function StaffLoginPage() {
  try {
    const adminSession = await getAdminSession().catch(() => null);
    if (adminSession) {
      if (adminSession.role === "TEACHER") {
        redirect("/staff");
      } else {
        redirect("/admin/cbt");
      }
    }
    return <StaffLoginClient initialAdmin={null} />;
  } catch {
    return <StaffLoginClient initialAdmin={null} />;
  }
}

