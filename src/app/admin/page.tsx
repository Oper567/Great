import { getAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminRootPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin/cbt");
  } else {
    redirect("/admin/login");
  }
}
