import { cn } from "@/lib/cn";
import { PublicCtaButton } from "./public-cta-button";

export type PublicCtaAction = {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
};

export function PublicCtaActions({
  actions,
  centered,
  tone = "default",
  className,
}: {
  actions: readonly PublicCtaAction[];
  centered?: boolean;
  tone?: "default" | "ink";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "public-cta-band__actions",
        centered && "public-cta-band__actions--center",
        className
      )}
    >
      {actions.map((action) => (
        <div key={`${action.href}-${action.label}`} className="landing-cta-hit">
          <PublicCtaButton {...action} tone={tone} />
        </div>
      ))}
    </div>
  );
}
