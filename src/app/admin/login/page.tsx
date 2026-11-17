import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import StaffLoginClient from "@/components/staff/StaffLoginClient";

export const metadata = {
  title: "Super Admin Command Portal Login | Great-Favour Montessori School",
  description:
    "Secure administrative login portal for Great-Favour Montessori School (GFMS) administrators and CBT directors.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLoginPage() {
  let adminSession = null;
  try {
    adminSession = await getAdminSession().catch(() => null);
  } catch {
    adminSession = null;
  }

  if (adminSession) {
    redirect(adminSession.role === "TEACHER" ? "/staff" : "/admin/cbt");
  }

  return <StaffLoginClient initialAdmin={null} />;
}
