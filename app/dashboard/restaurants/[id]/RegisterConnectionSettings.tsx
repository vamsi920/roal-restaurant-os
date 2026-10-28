"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Badge, formatRelative } from "@/components/ui";
import { Notice } from "@/components/live-orders/workspace-ui";
import type { PosConnectionSummary } from "@/lib/pos/connections";
import { disconnectRegisterAction } from "./pos-actions";
import { SettingsPanel } from "./menu/menu-ui";

/** Connect the restaurant's Clover so phone orders show up on it and print in the kitchen. */
export function RegisterConnectionSettings({
  restaurantId,
  connection,
  canManage,
}: {
  restaurantId: string;
  connection: PosConnectionSummary | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const result = useSearchParams().get("clover");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const disconnect = () => {
    if (!window.confirm("Stop sending phone orders to your Clover? They will still show on the ROAL kitchen screen.")) return;
    setError(null);
    startTransition(async () => {
      const res = await disconnectRegisterAction(restaurantId);
      if (!res.ok) setError(res.error ?? "Could not disconnect.");
      else router.refresh();
    });
  };

  return (
    <SettingsPanel
      id="register"
      icon={Printer}
      color="green"
      title="Your register"
      titleId="register-heading"
      description="Send phone orders straight to your Clover. They show up with your other orders and print on your kitchen printer. Customers still pay at pickup."
      action={connection ? <Badge tone="ok">Connected</Badge> : <Badge>Not connected</Badge>}
    >
      <div className="space-y-4">
        {result === "connected" ? <Notice tone="ok">Clover connected. The next phone order will print in your kitchen.</Notice> : null}
        {result === "failed" ? <Notice tone="bad">Clover didn&apos;t connect. Try again, or contact us and we&apos;ll set it up with you.</Notice> : null}
        {error ? <Notice tone="bad">{error}</Notice> : null}

        {connection ? (
          <>
            <p className="text-[13.5px] text-ink">
              Sending orders to <strong>{connection.merchantName ?? "your Clover"}</strong>.
              {connection.lastSyncAt ? ` Last order sent ${formatRelative(connection.lastSyncAt)}.` : " No orders sent yet."}
            </p>
            {connection.lastSyncError ? (
              <Notice tone="warn">
                The last order didn&apos;t reach your Clover or didn&apos;t print. It is still on the ROAL kitchen screen.
              </Notice>
            ) : null}
            {canManage ? (
              <button type="button" className="btn-ghost btn-sm" onClick={disconnect} disabled={pending}>
                {pending ? "Disconnecting…" : "Disconnect Clover"}
              </button>
            ) : null}
          </>
        ) : canManage ? (
          <a className="btn-primary inline-flex w-full justify-center sm:w-auto" href={`/api/integrations/clover/connect?restaurant_id=${encodeURIComponent(restaurantId)}`}>
            Connect Clover
          </a>
        ) : (
          <p className="text-[13px] text-muted">Ask an owner or admin to connect your Clover.</p>
        )}
      </div>
    </SettingsPanel>
  );
}
