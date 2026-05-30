import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context-server";
import { isOrgAdmin } from "@/lib/auth/roles";

export default async function DashboardHomePage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard");
  }

  const primary = context.primaryMembership;
  if (primary && isOrgAdmin(primary.role)) {
    redirect("/dashboard/overview");
  }

  redirect("/dashboard/restaurants");
}
