"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LineResult = { restaurantId: string; result: { ok: boolean; phoneNumber?: string; message?: string } };

/** Staff: start this organization's plan and set up a phone line for each location. */
export function ActivatePlanButton({ organizationId, active }: { organizationId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function activate() {
    setBusy(true);
    setNote(null);
    const res = await fetch(`/api/admin/organizations/${organizationId}/activate`, { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { error?: string; lines?: LineResult[] };
    setBusy(false);
    if (!res.ok) {
      setNote(body.error ?? "Could not activate.");
      return;
    }
    const lines = body.lines ?? [];
    const got = lines.filter((l) => l.result.ok).map((l) => l.result.phoneNumber);
    const failed = lines.filter((l) => !l.result.ok).map((l) => l.result.message);
    setNote(
      [got.length ? `Lines: ${got.join(", ")}` : null, failed.length ? `Pending: ${[...new Set(failed)].join(" ")}` : null]
        .filter(Boolean)
        .join(" · ") || "Plan active."
    );
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" className="btn-primary btn-sm" onClick={activate} disabled={busy}>
        {busy ? "Activating…" : active ? "Set up phone lines" : "Activate plan + phone lines"}
      </button>
      {note ? <span className="max-w-[22rem] text-right text-[12px] text-muted">{note}</span> : null}
    </span>
  );
}
