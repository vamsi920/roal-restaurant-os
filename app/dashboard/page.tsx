import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context-server";
import { isOrgAdmin } from "@/lib/auth/roles";

/** Dashboard home: org admins land on the overview, members on their locations. */
export default async function DashboardHomePage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard");
  }

  const isAdmin = context.memberships.some((m) => isOrgAdmin(m.role));
  if (isAdmin) {
    redirect("/dashboard/overview");
  }

  redirect("/dashboard/restaurants");
}
