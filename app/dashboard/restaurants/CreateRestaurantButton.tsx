import Link from "next/link";
import { Plus } from "lucide-react";
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
      <Plus size={15} strokeWidth={2.5} aria-hidden />
      {label}
    </Link>
  );
}
