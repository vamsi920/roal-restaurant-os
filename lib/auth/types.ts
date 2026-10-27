import type { SessionUser } from "@/lib/auth/session-user";
import type {
  Membership,
  MembershipRole,
  Organization,
  Restaurant,
} from "@/lib/types";

export type MembershipWithOrg = Membership & {
  organization: Organization;
};

export type AuthContext = {
  user: SessionUser;
  memberships: MembershipWithOrg[];
  /** Earliest membership by created_at (stable default org). */
  primaryMembership: MembershipWithOrg | null;
};

export type RestaurantAccess = {
  restaurant: Restaurant;
  membership: MembershipWithOrg;
  role: MembershipRole;
};
