import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context-server";

export default async function DashboardHomePage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard");
  }

  redirect("/dashboard/restaurants");
}
