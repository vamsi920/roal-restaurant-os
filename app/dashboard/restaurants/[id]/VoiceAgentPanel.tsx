"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PlanLimitNotice } from "@/components/billing/PlanLimitNotice";
import type { SerializableGateVerdict } from "@/lib/billing/gates";
import type { VoiceAgentControlCenterSnapshot } from "@/lib/voice-agent/control-center-types";
import { cn } from "@/lib/cn";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";
import {
  connectVoiceAgentAction,
  getVoiceAgentControlCenterAction,
  resyncVoiceAgentAction,
} from "./voice-agent-actions";

type Props = {
  initialCenter: VoiceAgentControlCenterSnapshot;
  restaurantId: string;
  restaurantName: string;
  voiceOrderGate?: SerializableGateVerdict | null;
};

const STATUS_LABEL: Record<
  VoiceAgentControlCenterSnapshot["connectionStatus"],
  string
> = {
  disconnected: "Not connected",
  connected: "Connected",
  misconfigured: "Needs sync",
  unreachable: "API error",
};

const STATUS_CLASS: Record<
  VoiceAgentControlCenterSnapshot["connectionStatus"],
  string
> = {
  disconnected: "bg-elev text-muted",
  connected: "bg-success/15 text-success",
  misconfigured: "bg-warning/15 text-amber-900",
  unreachable: "bg-danger/10 text-danger",
};

export function VoiceAgentPanel({
  initialCenter,
  restaurantId,
  restaurantName,
  voiceOrderGate,
}: Props) {
  const router = useRouter();
  const [center, setCenter] =
    useState<VoiceAgentControlCenterSnapshot>(initialCenter);
  const [agentIdInput, setAgentIdInput] = useState(
    initialCenter.agentId ?? ""
  );
  const [busy, setBusy] = useState<"connect" | "resync" | "refresh" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const voiceBlocked = voiceOrderGate?.hardBlocked === true;

  const refresh = useCallback(async () => {
    setBusy("refresh");
    setError(null);
    setSuccess(null);
    try {
      const next = await getVoiceAgentControlCenterAction(restaurantId);
      setCenter(next);
      setAgentIdInput(next.agentId ?? "");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Refresh failed";
      setError(sanitizeVoiceAgentDisplayError(raw) ?? "Refresh failed");
    } finally {
      setBusy(null);
    }
  }, [restaurantId]);

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <section className="kds-panel glass-card overflow-hidden">
      <div className="kds-panel__header">
        <div className="min-w-0">
          <h2 className="kds-panel__title">Voice agent</h2>
          <p className="kds-panel__lead">
            Connect ElevenLabs, sync menu tools, and manage the phone agent for
            this location.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={busy !== null}
          className="btn-ghost min-h-10 w-full text-xs sm:w-auto"
        >
          {busy === "refresh" ? "Refreshing…" : "Refresh status"}
        </button>
      </div>


      <PlanLimitNotice verdict={voiceOrderGate} className="mx-4 sm:mx-5" />
      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              STATUS_CLASS[center.connectionStatus]
            )}
          >
            {STATUS_LABEL[center.connectionStatus]}
          </span>
          {center.agentDisplayName ? (
            <span className="text-xs text-muted">{center.agentDisplayName}</span>
          ) : null}
          {center.lastSyncAt ? (
            <span className="text-xs text-subtle">
              Last sync {formatWhen(center.lastSyncAt)}
            </span>
          ) : null}
        </div>

        {center.lastSyncError ? (
          <p className="rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-xs text-danger">
            Last sync error: {center.lastSyncError}
          </p>
        ) : null}

        <SetupChecklist items={center.checklist} />

        <EnvSecretsCard secrets={center.envSecrets} />

        <div className="rounded-xl border border-line bg-elev p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-ink">Connect agent</h3>
          <p className="mt-1 text-xs text-muted">
            Syncs ROAL webhook tools, applies the order-taker prompt, sets a
            literal first message (no{" "}
            <code className="rounded bg-card px-1">{`{{restaurant_name}}`}</code>
            ), and patches{" "}
            <code className="rounded bg-card px-1">restaurant_id</code> /{" "}
            <code className="rounded bg-card px-1">restaurant_name</code>.
            For Twilio, configure the personalization webhook in the checklist
            below.
          </p>
          {!center.envReady ? (
            <p
              className="mt-3 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-xs text-amber-950"
              role="status"
            >
              Connect is disabled until required server secrets are set. Fix the
              items in Environment secrets below, restart the dev server, then
              try again.
            </p>
          ) : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              className="input-base min-h-11 min-w-0 sm:flex-1"
              placeholder="ElevenLabs agent id"
              value={agentIdInput}
              onChange={(e) => setAgentIdInput(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary min-h-11 w-full sm:w-auto"
              disabled={busy !== null || !center.envReady || voiceBlocked}
              onClick={async () => {
                setBusy("connect");
                setError(null);
                setSuccess(null);
                try {
                  const { center: next } = await connectVoiceAgentAction({
                    agentId: agentIdInput,
                    restaurantId,
                    restaurantName,
                  });
                  setCenter(next);
                  setAgentIdInput(next.agentId ?? agentIdInput);
                  setSuccess("Agent connected and synced.");
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Connect failed"
                  );
                  await refresh();
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "connect" ? "Syncing…" : "Connect & sync"}
            </button>
            <button
              type="button"
              className="btn-ghost min-h-11 w-full sm:w-auto"
              disabled={busy !== null || !center.agentId || voiceBlocked}
              onClick={async () => {
                setBusy("resync");
                setError(null);
                setSuccess(null);
                try {
                  const { center: next } = await resyncVoiceAgentAction(
                    restaurantId,
                    restaurantName
                  );
                  setCenter(next);
                  setSuccess("Agent re-synced successfully.");
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Re-sync failed");
                  await refresh();
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "resync" ? "Re-syncing…" : "Re-sync"}
            </button>
          </div>
          {center.agentId ? (
            <p className="mt-2 font-mono text-[11px] text-subtle">
              Linked agent: {center.agentId}
              {center.agentIdSource === "env_default"
                ? " (from .env default)"
                : ""}
            </p>
          ) : null}
        </div>

        <ProfileVariablesCard rows={center.expectedPlaceholders} />

        <ToolUrlsCard
          tools={center.toolUrls}
          copied={copied}
          onCopy={copyText}
        />

        {success ? (
          <div
            className="rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm text-success"
            role="status"
          >
            <p>{success}</p>
            <p className="mt-2 text-xs text-ink/80">
              Next: confirm the setup checklist above is green, copy webhook URLs
              if needed, then run a test scenario in the voice test harness
              below before taking live calls.
            </p>
          </div>
        ) : null}
        {error ? (
          <p
            className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
            <span className="mt-2 block text-xs text-ink/80">
              Fix the issue above, then use Re-sync or Connect & sync again. If
              secrets were missing, restart the dev server after updating{" "}
              <code className="rounded bg-card px-1">.env</code>.
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SetupChecklist({
  items,
}: {
  items: VoiceAgentControlCenterSnapshot["checklist"];
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-ink">Setup checklist</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2 text-xs">
            <CheckIcon status={item.status} />
            <div className="min-w-0">
              <p className="font-medium text-ink">{item.label}</p>
              {item.detail ? (
                <p className="mt-0.5 text-muted">{item.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CheckIcon({ status }: { status: string }) {
  if (status === "ok") {
    return (
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-success/15 text-success">
        ✓
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
        !
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-warning/15 text-amber-900">
        ?
      </span>
    );
  }
  return (
    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-line bg-elev" />
  );
}

function EnvSecretsCard({
  secrets,
}: {
  secrets: VoiceAgentControlCenterSnapshot["envSecrets"];
}) {
  const missing = secrets.filter((s) => s.required && !s.ok);
  return (
    <div className="rounded-xl border border-line bg-elev p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-ink">Environment secrets</h3>
      <p className="mt-1 text-xs text-muted">
        Server-only keys in <code className="rounded bg-card px-1">.env</code>{" "}
        (see <code className="rounded bg-card px-1">.env.example</code>).
      </p>
      <ul className="mt-3 space-y-2">
        {secrets.map((row) => (
          <li
            key={row.key}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              row.ok
                ? "border-success/25 bg-success/[0.04]"
                : row.required
                  ? "border-danger/30 bg-danger/[0.04]"
                  : "border-line bg-card"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="font-mono text-[11px] text-ink">{row.key}</code>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase",
                  row.ok ? "text-success" : "text-danger"
                )}
              >
                {row.ok ? "OK" : row.required ? "Missing" : "Optional"}
              </span>
            </div>
            {!row.ok && row.hint ? (
              <p className="mt-1 text-[11px] text-muted">{row.hint}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {missing.length > 0 ? (
        <p className="mt-3 text-xs text-danger">
          Add {missing.map((m) => m.key).join(", ")} then restart the dev server.
        </p>
      ) : null}
    </div>
  );
}

function ProfileVariablesCard({
  rows,
}: {
  rows: VoiceAgentControlCenterSnapshot["expectedPlaceholders"];
}) {
  return (
    <div className="rounded-xl border border-line bg-elev p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-ink">Profile variables</h3>
      <p className="mt-1 text-xs text-muted">
        ElevenLabs dynamic placeholders used when tools are not baked to this
        restaurant.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-xs">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wider text-subtle">
              <th className="pb-2 pr-3">Variable</th>
              <th className="pb-2 pr-3">Expected</th>
              <th className="pb-2 pr-3">On agent</th>
              <th className="pb-2">Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line/60">
                <td className="py-2 pr-3 font-mono text-[11px]">{row.key}</td>
                <td className="py-2 pr-3 break-all text-muted">
                  {row.expected}
                </td>
                <td className="py-2 pr-3 break-all text-ink">
                  {row.actual ?? "—"}
                </td>
                <td className="py-2">
                  {row.matches ? (
                    <span className="text-success">Yes</span>
                  ) : (
                    <span className="text-danger">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ToolUrlsCard({
  tools,
  copied,
  onCopy,
}: {
  tools: VoiceAgentControlCenterSnapshot["toolUrls"];
  copied: string | null;
  onCopy: (key: string, url: string) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-elev p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-ink">Webhook tool URLs</h3>
      <p className="mt-1 text-xs text-muted">
        Supabase Edge Functions for this restaurant (after sync).
      </p>
      <ul className="mt-3 space-y-3">
        {tools.map((tool) => (
          <li key={tool.name} className="rounded-lg border border-line bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold text-ink">
                {tool.label}
              </span>
              <button
                type="button"
                className="text-[11px] font-medium text-accent hover:underline"
                onClick={() => void onCopy(tool.name, tool.url)}
              >
                {copied === tool.name ? "Copied" : "Copy URL"}
              </button>
            </div>
            <p className="mt-2 break-all font-mono text-[11px] text-muted">
              {tool.url}
            </p>
            {tool.headerNote ? (
              <p className="mt-1 text-[10px] text-subtle">{tool.headerNote}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
