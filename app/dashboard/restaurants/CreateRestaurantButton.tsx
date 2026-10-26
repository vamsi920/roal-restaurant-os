import Link from "next/link";
import { cn } from "@/lib/cn";

export const ADD_LOCATION_HREF = "/dashboard/onboarding?new=1";

/** Adding a location runs the magic builder (menu link → AI host → test call). */
export function CreateRestaurantButton({
  className,
  label = "Add location",
  href = ADD_LOCATION_HREF,
}: {
  className?: string;
  label?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("btn-primary", className)}>
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </Link>
  );
}
