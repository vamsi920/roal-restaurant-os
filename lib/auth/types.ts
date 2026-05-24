import type { User } from "@supabase/supabase-js";
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
  user: User;
  memberships: MembershipWithOrg[];
  /** Earliest membership by created_at (stable default org). */
  primaryMembership: MembershipWithOrg | null;
};

export type RestaurantAccess = {
  restaurant: Restaurant;
  membership: MembershipWithOrg;
  role: MembershipRole;
};
