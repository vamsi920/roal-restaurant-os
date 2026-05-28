import type { MembershipRole } from "@/lib/types";

export function isOrgOwner(role: MembershipRole): boolean {
  return role === "owner";
}

export function isOrgAdmin(role: MembershipRole): boolean {
  return role === "owner" || role === "admin";
}

/** Invite/update/remove members, org settings (with owner for delete). */
export function canManageMembers(role: MembershipRole): boolean {
  return isOrgAdmin(role);
}

export function canUpdateOrganization(role: MembershipRole): boolean {
  return isOrgAdmin(role);
}

export function canDeleteOrganization(role: MembershipRole): boolean {
  return isOrgOwner(role);
}

/** Menu, orders, voice tools, scanner. */
export function canOperateRestaurant(role: MembershipRole): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function canCreateRestaurant(role: MembershipRole): boolean {
  return canOperateRestaurant(role);
}

export function canDeleteRestaurant(role: MembershipRole): boolean {
  return isOrgAdmin(role);
}

export function formatMembershipRole(role: MembershipRole): string {
  const labels: Record<MembershipRole, string> = {
    owner: "Owner",
    admin: "Manager",
    member: "Member",
  };
  return labels[role];
}
