import {
  BarChart3,
  Building2,
  ChefHat,
  Headset,
  LayoutDashboard,
  LifeBuoy,
  PhoneCall,
  Receipt,
  Settings,
  ShieldCheck,
  Store,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type NavIconKey =
  | "overview"
  | "calls"
  | "kitchen"
  | "menu"
  | "host"
  | "reports"
  | "billing"
  | "settings"
  | "support"
  | "locations"
  | "org"
  | "team"
  | "platform";

const ICONS: Record<NavIconKey, LucideIcon> = {
  overview: LayoutDashboard,
  calls: PhoneCall,
  kitchen: ChefHat,
  menu: UtensilsCrossed,
  host: Headset,
  reports: BarChart3,
  billing: Receipt,
  settings: Settings,
  support: LifeBuoy,
  locations: Store,
  org: Building2,
  team: Users,
  platform: ShieldCheck,
};

const ORG_HREF_ICON: Record<string, NavIconKey> = {
  "/dashboard/restaurants": "locations",
  "/dashboard/overview": "org",
  "/dashboard/settings": "team",
  "/dashboard/admin": "platform",
  "/dashboard/support": "support",
};

export function navIconKeyForHref(href: string): NavIconKey {
  return ORG_HREF_ICON[href] ?? "overview";
}

export function NavIcon({ name, className }: { name: NavIconKey; className?: string }) {
  const Icon = ICONS[name];
  return <Icon size={18} strokeWidth={1.75} className={cn("shrink-0", className)} aria-hidden />;
}
