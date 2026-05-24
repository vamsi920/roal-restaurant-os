import { parseOrderLineItems } from "@/lib/orders/line-items";
import { cn } from "@/lib/cn";

export function OrderCardHeader({
  badge,
  badgeClass,
  sessionId,
}: {
  badge: string;
  badgeClass: string;
  sessionId: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span
        className={cn(
          "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          badgeClass
        )}
      >
        {badge}
      </span>
      <span className="font-mono-tabular text-[11px] text-subtle">
        {sessionId.length > 14
          ? `${sessionId.slice(0, 12)}…`
          : sessionId}
      </span>
    </div>
  );
}

export function CustomerLine({
  name,
  phone,
}: {
  name: string | null;
  phone: string | null;
}) {
  if (!name && !phone) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      {[name, phone].filter(Boolean).join(" · ")}
    </p>
  );
}

export function OrderItemsList({ items }: { items: unknown }) {
  const lines = parseOrderLineItems(items);
  if (lines.length === 0) {
    return <p className="mt-2 text-xs text-subtle">No line items</p>;
  }
  return (
    <ul className="mt-2 space-y-1 border-t border-line/60 pt-2">
      {lines.map((line, i) => (
        <li key={i} className="text-[13px] text-ink">
          <span className="font-mono-tabular text-muted">{line.quantity}×</span>{" "}
          {line.name}
          {line.customizations.length > 0 ? (
            <span className="text-subtle">
              {" "}
              — {line.customizations.join(", ")}
            </span>
          ) : null}
          {line.notes ? (
            <span className="mt-0.5 block text-[12px] italic text-subtle">
              Note: {line.notes}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
