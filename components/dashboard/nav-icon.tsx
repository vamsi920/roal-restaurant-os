import { cn } from "@/lib/cn";

const PATHS: Record<string, string> = {
  overview: "M4 5h16v4H4zM4 13h7v6H4zM15 13h5v6h-5z",
  restaurants: "M3 10l9-7 9 7M5 9v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V9",
  onboarding: "M5 12l4 4L19 6",
  analytics: "M4 19V9M10 19V4M16 19v-6M22 19H2",
  settings:
    "M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  billing: "M3 7h18v10H3zM3 11h18M7 15h3",
  support: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17h.01",
  admin: "M12 3l8 3.5v5.5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6.5L12 3z",
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
      className={cn("h-4 w-4 shrink-0", className)}
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
