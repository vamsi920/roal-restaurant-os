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
  /** Agent route supplies the page header; hide duplicate panel chrome. */
  embedded?: boolean;
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

function nextActionText(center: VoiceAgentControlCenterSnapshot): string {
  if (!center.envReady) return "Next: add required server secrets, then refresh status.";
  if (center.connectionStatus === "connected") return "Next: run a quick test call.";
  if (center.connectionStatus === "misconfigured") return "Next: re-sync the current agent.";
  if (center.connectionStatus === "unreachable") return "Next: refresh status or try again in a moment.";
  return "Next: connect the agent to this location.";
}

export function VoiceAgentPanel({
  initialCenter,
  restaurantId,
  restaurantName,
  voiceOrderGate,
  embedded = false,
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
  const connectDisabled = busy !== null || !center.envReady || voiceBlocked;
  const resyncDisabled = busy !== null || !center.agentId || voiceBlocked;

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
    <section
      className={cn(
        "voice-agent-panel kds-panel min-w-0 max-w-full overflow-hidden glass-card",
        embedded && "kds-panel--embedded voice-agent-panel--embedded"
      )}
    >
      {!embedded ? (
        <div className="kds-panel__header">
          <div className="min-w-0">
            <h2 className="kds-panel__title">Voice agent</h2>
            <p className="kds-panel__lead">Connect and keep the agent in sync.</p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy !== null}
            aria-busy={busy === "refresh"}
            className="voice-agent-panel__refresh btn-ghost kds-thumb-btn min-h-11 w-full text-xs sm:min-h-10 sm:w-auto"
          >
            {busy === "refresh" ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      ) : null}

      <PlanLimitNotice
        verdict={voiceOrderGate}
        className={embedded ? "mx-4 mt-4 sm:mx-5" : "mx-4 sm:mx-5"}
      />
      <div className="voice-agent-panel__body min-w-0 space-y-5 p-4 sm:p-5">
        {!embedded ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
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
              <p
                className="rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm text-danger [overflow-wrap:anywhere]"
                role="alert"
              >
                Last sync error: {center.lastSyncError}
              </p>
            ) : null}
          </>
        ) : (
          <div className="voice-agent-panel__embedded-refresh flex sm:hidden">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy !== null}
              aria-busy={busy === "refresh"}
              className="voice-agent-panel__refresh btn-ghost kds-thumb-btn min-h-11 w-full text-xs"
            >
              {busy === "refresh" ? "Refreshing…" : "Refresh status"}
            </button>
          </div>
        )}

        {embedded ? (
          <div className="voice-agent-panel__embedded-chrome hidden flex-wrap items-center justify-between gap-2 sm:flex">
            <p className="text-xs text-muted">{nextActionText(center)}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy !== null}
              aria-busy={busy === "refresh"}
              className="voice-agent-panel__refresh btn-ghost kds-thumb-btn min-h-11 w-full shrink-0 text-xs sm:min-h-10 sm:w-auto"
            >
              {busy === "refresh" ? "Refreshing…" : "Refresh status"}
            </button>
          </div>
        ) : null}

        <div className="voice-agent-panel__connect rounded-xl border border-line bg-elev p-4 shadow-sm max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none">
          <h3 className="text-sm font-semibold text-ink sm:text-xs">
            {embedded ? "Connect or update agent" : "Connect"}
          </h3>
          {!center.envReady ? (
            <p
              className="voice-agent-panel__env-notice mt-3 rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-sm text-amber-950 [overflow-wrap:anywhere] sm:text-xs"
              role="status"
            >
              Add required server settings before connecting.
            </p>
          ) : null}
          <div className="voice-agent-panel__controls mt-3 min-w-0">
            <div className="voice-agent-panel__field min-w-0">
              <label
                htmlFor={`voice-agent-id-${restaurantId}`}
                className="text-xs font-medium text-muted"
              >
                ElevenLabs agent ID
              </label>
              <input
                id={`voice-agent-id-${restaurantId}`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                className="voice-agent-panel__agent-id-input input-base mt-1.5 min-h-11 w-full min-w-0"
                placeholder="Paste agent id"
                value={agentIdInput}
                onChange={(e) => setAgentIdInput(e.target.value)}
                disabled={busy !== null || voiceBlocked}
                aria-describedby={
                  connectDisabled && !voiceBlocked && !center.envReady
                    ? `voice-agent-connect-hint-${restaurantId}`
                    : undefined
                }
              />
            </div>
            <div className="voice-agent-panel__actions">
            <button
              type="button"
              className="voice-agent-panel__btn voice-agent-panel__btn--connect btn-primary kds-thumb-btn min-h-11 w-full"
              disabled={connectDisabled}
              aria-busy={busy === "connect"}
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
                  setSuccess("Agent connected.");
                  router.refresh();
                } catch (e) {
                  const raw = e instanceof Error ? e.message : "Connect failed";
                  setError(
                    sanitizeVoiceAgentDisplayError(raw) ?? "Connect failed"
                  );
                  await refresh();
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "connect" ? "Connecting…" : "Connect & sync"}
            </button>
            <button
              type="button"
              className="voice-agent-panel__btn voice-agent-panel__btn--resync btn-ghost kds-thumb-btn min-h-11 w-full"
              disabled={resyncDisabled}
              aria-busy={busy === "resync"}
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
                  setSuccess("Agent re-synced.");
                  router.refresh();
                } catch (e) {
                  const raw = e instanceof Error ? e.message : "Re-sync failed";
                  setError(
                    sanitizeVoiceAgentDisplayError(raw) ?? "Re-sync failed"
                  );
                  await refresh();
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "resync" ? "Syncing…" : "Sync now"}
            </button>
            </div>
          </div>
          <p
            id={`voice-agent-connect-hint-${restaurantId}`}
            className="voice-agent-panel__connect-hint mt-2 text-xs text-muted [overflow-wrap:anywhere] max-sm:sr-only sm:not-sr-only sm:block"
          >
            {voiceBlocked
              ? "Voice ordering is blocked by plan."
              : !center.envReady
                ? "Server secrets are required before connect."
                : nextActionText(center)}
          </p>
          {center.agentId ? (
            <p className="voice-agent-panel__agent-id-line mt-2 hidden break-all font-mono text-caption text-subtle sm:block">
              Linked agent: {center.agentId}
              {center.agentIdSource === "env_default"
                ? " (from .env default)"
                : ""}
            </p>
          ) : null}
        </div>

        {success || error ? (
          <div className="voice-agent-panel__feedback min-w-0 space-y-2">
            {success ? (
              <div
                className="voice-agent-panel__success rounded-lg border border-success/25 bg-success/5 px-3 py-2.5 text-sm text-success [overflow-wrap:anywhere]"
                role="status"
                aria-live="polite"
              >
                <p className="font-medium">{success}</p>
                <p className="voice-agent-panel__success-hint mt-1 hidden text-xs text-ink/80 sm:block">
                  {nextActionText(center)}
                </p>
              </div>
            ) : null}
            {error ? (
              <div
                className="voice-agent-panel__error rounded-lg border border-danger/25 bg-danger/5 px-3 py-2.5 text-sm text-danger [overflow-wrap:anywhere]"
                role="alert"
                aria-live="assertive"
              >
                <p className="font-medium">{error}</p>
                <p className="voice-agent-panel__error-hint mt-1 text-xs text-ink/80 max-sm:sr-only sm:not-sr-only">
                  Review status above, then retry connect or sync.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <details className="voice-agent-panel__advanced rounded-xl border border-line bg-card p-4 shadow-sm">
          <summary className="voice-agent-panel__advanced-summary cursor-pointer text-sm font-semibold text-ink">
            Advanced diagnostics
            <span className="voice-agent-panel__advanced-hint ml-1 font-normal text-muted sm:hidden">
              (checklist, secrets, URLs)
            </span>
          </summary>
          <div className="voice-agent-panel__advanced-body mt-4 min-w-0 space-y-4 overflow-hidden">
            <SetupChecklist items={center.checklist} />
            <EnvSecretsCard secrets={center.envSecrets} />
            <ProfileVariablesCard rows={center.expectedPlaceholders} />
            <ToolUrlsCard
              tools={center.toolUrls}
              copied={copied}
              onCopy={copyText}
            />
            <p className="voice-agent-panel__advanced-footnote text-xs text-muted [overflow-wrap:anywhere]">
              If the agent is misconfigured, use Re-sync. If server secrets were
              missing, set them and restart the server before trying again.
            </p>
          </div>
        </details>
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
    <div className="voice-agent-panel__checklist min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-ink">Setup checklist</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2 text-xs">
            <CheckIcon status={item.status} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink [overflow-wrap:anywhere]">
                {item.label}
              </p>
              {item.detail ? (
                <p className="mt-0.5 text-muted [overflow-wrap:anywhere]">
                  {item.detail}
                </p>
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
    <div className="voice-agent-panel__env-secrets min-w-0 rounded-xl border border-line bg-elev p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-ink">Environment secrets</h3>
      <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">
        Server-only keys in <code className="rounded bg-card px-1">.env</code>{" "}
        (see <code className="rounded bg-card px-1">.env.example</code>).
      </p>
      <ul className="mt-3 space-y-2">
        {secrets.map((row) => (
          <li
            key={row.key}
            className={cn(
              "voice-agent-panel__env-row min-w-0 rounded-lg border px-3 py-2 text-xs",
              row.ok
                ? "border-success/25 bg-success/[0.04]"
                : row.required
                  ? "border-danger/30 bg-danger/[0.04]"
                  : "border-line bg-card"
            )}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
              <code className="voice-agent-panel__env-key break-all font-mono text-caption text-ink [overflow-wrap:anywhere]">
                {row.key}
              </code>
              <span
                className={cn(
                  "text-micro font-semibold uppercase",
                  row.ok ? "text-success" : "text-danger"
                )}
              >
                {row.ok ? "OK" : row.required ? "Missing" : "Optional"}
              </span>
            </div>
            {!row.ok && row.hint ? (
              <p className="mt-1 text-caption text-muted [overflow-wrap:anywhere]">
                {row.hint}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {missing.length > 0 ? (
        <p className="mt-3 text-xs text-danger [overflow-wrap:anywhere]">
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
    <div className="voice-agent-panel__profile-vars min-w-0 rounded-xl border border-line bg-elev p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-ink">Profile variables</h3>
      <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">
        ElevenLabs dynamic placeholders used when tools are not baked to this
        restaurant.
      </p>
      <div className="voice-agent-panel__profile-scroll mt-3 min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
        <div className="voice-agent-panel__profile-table dashboard-table min-w-0">
        <table className="w-full min-w-0 text-left text-sm xl:min-w-[280px]">
          <thead>
            <tr className="border-b border-line text-micro uppercase tracking-wider text-subtle">
              <th className="pb-2 pr-3">Variable</th>
              <th className="pb-2 pr-3">Expected</th>
              <th className="pb-2 pr-3">On agent</th>
              <th className="pb-2">Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line/60">
                <td
                  data-label="Variable"
                  className="py-2 pr-3 font-mono text-caption [overflow-wrap:anywhere]"
                >
                  {row.key}
                </td>
                <td
                  data-label="Expected"
                  className="py-2 pr-3 break-all text-muted [overflow-wrap:anywhere]"
                >
                  {row.expected}
                </td>
                <td
                  data-label="On agent"
                  className="py-2 pr-3 break-all text-ink [overflow-wrap:anywhere]"
                >
                  {row.actual ?? "—"}
                </td>
                <td data-label="Match" className="py-2">
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
    <div className="voice-agent-panel__tool-urls min-w-0 rounded-xl border border-line bg-elev p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-ink">Webhook tool URLs</h3>
      <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">
        Supabase Edge Functions for this restaurant (after sync).
      </p>
      <ul className="mt-3 space-y-3">
        {tools.map((tool) => (
          <li
            key={tool.name}
            className="voice-agent-panel__tool-item min-w-0 rounded-lg border border-line bg-card p-3"
          >
            <div className="voice-agent-panel__tool-head flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0 font-mono text-caption font-semibold text-ink [overflow-wrap:anywhere]">
                {tool.label}
              </span>
              <button
                type="button"
                className="voice-agent-panel__copy-btn kds-thumb-btn inline-flex min-h-11 w-full shrink-0 items-center justify-center text-sm font-medium text-accent underline-offset-2 hover:underline sm:min-h-10 sm:w-auto"
                onClick={() => void onCopy(tool.name, tool.url)}
                aria-label={`Copy URL for ${tool.label}`}
              >
                {copied === tool.name ? "Copied" : "Copy URL"}
              </button>
            </div>
            <div className="voice-agent-panel__tool-url-scroll mt-2 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-line/70 bg-elev/40 px-2 py-1.5">
              <p className="min-w-0 whitespace-pre-wrap break-all font-mono text-caption text-muted [overflow-wrap:anywhere]">
                {tool.url}
              </p>
            </div>
            {tool.headerNote ? (
              <p className="mt-1 text-micro text-subtle [overflow-wrap:anywhere]">
                {tool.headerNote}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
