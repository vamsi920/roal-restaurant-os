"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ShellLocation } from "@/lib/dashboard/shell-data";
import { setRestaurantTakingOrdersAction } from "@/app/dashboard/restaurants/[id]/status-actions";

/**
 * Sidebar status pill bound to `restaurant_profiles.temporarily_closed`
 * (on = taking orders). Pausing asks for confirmation first.
 */
export function TakingOrdersCard({
  location,
  collapsed = false,
}: {
  location: ShellLocation;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [takingOrders, setTakingOrders] = useState(!location.temporarilyClosed);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTakingOrders(!location.temporarilyClosed);
    setConfirming(false);
    setError(null);
  }, [location.id, location.temporarilyClosed]);

  function commit(next: boolean) {
    setError(null);
    setConfirming(false);
    const previous = takingOrders;
    setTakingOrders(next);
    startTransition(async () => {
      const result = await setRestaurantTakingOrdersAction(location.id, next);
      if (!result.ok) {
        setTakingOrders(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onToggle(next: boolean) {
    if (!next) {
      setConfirming(true);
      return;
    }
    commit(true);
  }

  if (collapsed) {
    return (
      <div
        className="flex justify-center py-1"
        title={takingOrders ? "Live – taking orders" : "Paused – not taking orders"}
      >
        <span
          className={cn("h-2.5 w-2.5 rounded-full", takingOrders ? "bg-success" : "bg-warning")}
          aria-label={takingOrders ? "Live – taking orders" : "Paused – not taking orders"}
          role="img"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "taking-orders rounded-xl border px-3 py-2.5",
        takingOrders ? "border-success/35 bg-success/[0.04]" : "border-warning/40 bg-[rgb(var(--tile-amber)/0.45)]"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "taking-orders__dot h-2 w-2 shrink-0 rounded-full",
            takingOrders ? "bg-success" : "bg-warning"
          )}
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-[12.5px] leading-snug" aria-live="polite">
          {takingOrders ? (
            <>
              <span className="font-semibold text-success">Live</span>
              <span className="text-muted"> – taking orders</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-[rgb(var(--tile-amber-ink))]">Paused</span>
              <span className="text-muted"> – callers hear you&apos;re not taking orders</span>
            </>
          )}
        </p>
        <Switch
          checked={takingOrders}
          onChange={onToggle}
          disabled={pending}
          label="Taking orders"
        />
      </div>
      {!location.isLive && !confirming ? (
        <p className="mt-1.5 pl-[18px] text-[11.5px] text-subtle">Applies once your host is live.</p>
      ) : null}

      {confirming ? (
        <div className="mt-2.5 border-t border-line pt-2.5" role="alertdialog" aria-label="Pause orders?">
          <p className="text-[12.5px] font-medium text-ink">Pause phone orders?</p>
          <p className="mt-0.5 text-[12px] text-subtle">
            Callers will hear that you&apos;re not taking orders right now. Turn it back on any time.
          </p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              className="btn-primary btn-sm flex-1"
              onClick={() => commit(false)}
              autoFocus
            >
              Pause orders
            </button>
            <button type="button" className="btn-ghost btn-sm flex-1" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-1.5 text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
