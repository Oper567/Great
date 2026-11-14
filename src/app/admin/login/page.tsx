import { getAdminSession } from "@/lib/session";
import StaffLoginClient from "@/components/staff/StaffLoginClient";

export const metadata = {
  title: "Super Admin Command Portal Login | Great-Favour Montessori School",
  description:
    "Secure administrative login portal for Great-Favour Montessori School (GFMS) administrators and CBT directors.",
};

export default async function AdminLoginPage() {
  try {
    const adminSession = await getAdminSession().catch(() => null);
    return <StaffLoginClient initialAdmin={adminSession} />;
  } catch {
    return <StaffLoginClient initialAdmin={null} />;
  }
}
