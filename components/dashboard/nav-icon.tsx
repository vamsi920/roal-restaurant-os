import { cn } from "@/lib/cn";

const PATHS: Record<string, string> = {
  overview:
    "M4 5a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5z",
  restaurants:
    "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  onboarding: "M12 3v4M12 17v4M5 12H3M21 12h-2M7 7l-2-2M19 19l-2-2M7 17l-2 2M19 5l-2 2",
  analytics:
    "M4 18V8M9 18V4M14 18v-6M19 18v-10",
  settings: "M12 8a4 4 0 110 8 4 4 0 010-8zM4 12a8 8 0 0116 0",
  billing: "M4 7h16M4 11h16M4 15h10M6 19h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z",
  support:
    "M8 10h.01M12 10h.01M16 10h.01M21 16a9 9 0 11-18 0 9 9 0 0118 0z",
  admin:
    "M12 3l8 4v6c0 3.5-2.8 6.5-8 8-5.2-1.5-8-4.5-8-8V7l8-4z",
};

function iconKey(href: string): string {
  if (href === "/dashboard") return "overview";
  if (href.includes("restaurants")) return "restaurants";
  if (href.includes("onboarding")) return "onboarding";
  if (href.includes("analytics")) return "analytics";
  if (href.includes("settings")) return "settings";
  if (href.includes("billing")) return "billing";
  if (href.includes("support")) return "support";
  if (href.includes("admin")) return "admin";
  return "overview";
}

export function NavIcon({ href, className }: { href: string; className?: string }) {
  const d = PATHS[iconKey(href)] ?? PATHS.overview;
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-[18px] w-[18px] shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
