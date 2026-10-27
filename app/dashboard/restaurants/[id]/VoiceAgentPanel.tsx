"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  XCircle,
} from "lucide-react";
import { Badge, Panel, type Tone } from "@/components/ui";
import { Notice, RefreshButton } from "@/components/live-orders/workspace-ui";
import { AdvancedSection } from "@/components/voice-agent/phone-host-ui";
import { PlanLimitNotice } from "@/components/billing/PlanLimitNotice";
import type { SerializableGateVerdict } from "@/lib/billing/gates";
import type { VoiceAgentControlCenterSnapshot } from "@/lib/voice-agent/control-center-types";
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
  /** Optional summary block (store phone, agent linked, webhook) under the status row. */
  summary?: ReactNode;
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
  summary,
}: Props) {
  const router = useRouter();
  const [center, setCenter] =
    useState<VoiceAgentControlCenterSnapshot>(initialCenter);
  const [agentIdInput, setAgentIdInput] = useState(
    initialCenter.agentIdSource === "profile" ? (initialCenter.agentId ?? "") : ""
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
      setAgentIdInput(
        next.agentIdSource === "profile" ? (next.agentId ?? "") : ""
      );
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

  const connectForm = (
    <div className="voice-agent-panel__connect min-w-0 space-y-3">
      {!center.envReady ? (
        <Notice tone="warn" title="Connect is off.">
          Connect is disabled until required server secrets are configured.
        </Notice>
      ) : null}

      <div className="min-w-0">
        <label htmlFor={`voice-agent-id-${restaurantId}`} className="field-label">
          ElevenLabs agent ID
        </label>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id={`voice-agent-id-${restaurantId}`}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className="input-base min-w-0 flex-1 font-mono text-[13px] max-sm:h-11"
            placeholder="Paste agent id"
            value={agentIdInput}
            onChange={(e) => setAgentIdInput(e.target.value)}
            disabled={busy !== null || voiceBlocked}
            aria-describedby={`voice-agent-connect-hint-${restaurantId}${
              center.agentIdSource === "env_default" ? ` voice-agent-env-default-hint-${restaurantId}` : ""
            }`}
          />
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn-primary max-sm:w-full"
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
                  setError(sanitizeVoiceAgentDisplayError(raw) ?? "Connect failed");
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
              className="btn-ghost max-sm:w-full"
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
                  setError(sanitizeVoiceAgentDisplayError(raw) ?? "Re-sync failed");
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
          className="mt-1.5 text-[12px] text-subtle [overflow-wrap:anywhere]"
        >
          {voiceBlocked
            ? "Voice ordering is blocked by plan."
            : !center.envReady
              ? "Server secrets are required before connect."
              : nextActionText(center)}
        </p>
        {center.agentIdSource === "env_default" && center.agentId ? (
          <p
            id={`voice-agent-env-default-hint-${restaurantId}`}
            className="mt-1.5 text-[12px] text-subtle [overflow-wrap:anywhere]"
          >
            A server default agent exists but isn&apos;t linked to this location. Paste an ID or{" "}
            <button
              type="button"
              className="rounded font-medium text-ink underline underline-offset-2 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={() => setAgentIdInput(center.agentId ?? "")}
              disabled={busy !== null || voiceBlocked}
            >
              use the server default
            </button>
            , then Connect &amp; sync.
          </p>
        ) : null}
      </div>

      {success || error ? (
        <div className="min-w-0 space-y-2">
          {success ? (
            <Notice tone="ok" title={success} role="status">
              {nextActionText(center)}
            </Notice>
          ) : null}
          {error ? (
            <Notice tone="bad" title={error} role="alert">
              Check the status above, then retry connect or sync.
            </Notice>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const statusRow = (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[center.connectionStatus]}>{STATUS_LABEL[center.connectionStatus]}</Badge>
        <span className="text-[12.5px] text-subtle">
          {center.lastSyncAt ? `Last sync ${formatWhen(center.lastSyncAt)}` : "Never synced"}
        </span>
      </div>
      <RefreshButton
        onClick={() => void refresh()}
        busy={busy === "refresh"}
        label={busy === "refresh" ? "Refreshing" : "Refresh status"}
        showLabel
      />
    </div>
  );

  const linkedAgent = center.agentId ? (
    <div className="flex min-w-0 items-center gap-2 rounded-[10px] border border-line bg-elev px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-subtle">
          Linked agent{center.agentIdSource === "env_default" ? " (from .env default)" : ""}
        </p>
        <p className="truncate font-mono text-[12.5px] text-ink" title={center.agentId}>
          {center.agentId}
        </p>
      </div>
      <CopyButton
        label="Copy agent ID"
        copied={copied === "agent-id"}
        onClick={() => void copyText("agent-id", center.agentId ?? "")}
      />
    </div>
  ) : null;

  const okChecks = center.checklist.filter((c) => c.status === "ok").length;
  const missingSecrets = center.envSecrets.filter((x) => x.required && !x.ok).length;
  const mismatched = center.expectedPlaceholders.filter((r) => !r.matches).length;

  const diagnostics = (
    <div className="min-w-0 space-y-3">
      <SetupChecklist items={center.checklist} />
      <div className="overflow-hidden rounded-[12px] border border-line">
        <DiagnosticDisclosure
          title="Environment secrets"
          badge={
            missingSecrets > 0 ? (
              <Badge tone="bad">{missingSecrets} missing</Badge>
            ) : (
              <Badge tone="ok">All set</Badge>
            )
          }
        >
          <EnvSecretsCard secrets={center.envSecrets} />
        </DiagnosticDisclosure>
        <DiagnosticDisclosure
          title="Profile variables"
          badge={
            mismatched > 0 ? (
              <Badge tone="warn">{mismatched} out of sync</Badge>
            ) : (
              <Badge tone="ok">Match</Badge>
            )
          }
        >
          <ProfileVariablesCard rows={center.expectedPlaceholders} />
        </DiagnosticDisclosure>
        <DiagnosticDisclosure
          title="Webhook tool URLs"
          badge={<Badge>{center.toolUrls.length}</Badge>}
        >
          <ToolUrlsCard tools={center.toolUrls} copied={copied} onCopy={copyText} />
        </DiagnosticDisclosure>
      </div>
      <p className="text-[12px] text-subtle [overflow-wrap:anywhere]">
        If the agent is misconfigured, use Sync now. If server secrets were missing, set them and
        restart the server before trying again.
      </p>
    </div>
  );

  const body = (
    <div className="voice-agent-panel min-w-0 max-w-full space-y-4">
      <PlanLimitNotice verdict={voiceOrderGate} />
      {statusRow}
      {summary}
      {center.lastSyncError ? (
        <Notice tone="bad" title="Last sync error:">
          {center.lastSyncError}
        </Notice>
      ) : null}
      {linkedAgent}
      {connectForm}
    </div>
  );

  if (embedded) {
    return (
      <div className="min-w-0 space-y-6">
        <AdvancedSection
          id="connection"
          title="Connection"
          hint="Link the ElevenLabs agent and keep it in sync with this location."
        >
          {body}
        </AdvancedSection>
        <AdvancedSection
          id="diagnostics"
          title="Advanced diagnostics"
          hint={`${okChecks} of ${center.checklist.length} setup checks passing`}
          className="border-t border-line pt-5"
        >
          {diagnostics}
        </AdvancedSection>
      </div>
    );
  }

  return (
    <Panel title="Voice agent" className="min-w-0">
      <div className="space-y-5">
        {body}
        <CollapsibleInline title="Advanced diagnostics" hint="Checklist, secrets, URLs">
          {diagnostics}
        </CollapsibleInline>
      </div>
    </Panel>
  );
}

const STATUS_TONE: Record<VoiceAgentControlCenterSnapshot["connectionStatus"], Tone> = {
  disconnected: "neutral",
  connected: "ok",
  misconfigured: "warn",
  unreachable: "bad",
};

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

function CopyButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="btn-ghost btn-sm shrink-0"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function DiagnosticDisclosure({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-line/70 last:border-b-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 hover:bg-elev focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 text-[13px] font-medium text-ink">{title}</span>
        {badge}
        <ChevronDown
          size={15}
          className="shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <div className="min-w-0 border-t border-line/70 px-3.5 py-3">{children}</div>
    </details>
  );
}

function CollapsibleInline({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-[12px] border border-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink">{title}</span>
          {hint ? <span className="block text-[12px] text-subtle">{hint}</span> : null}
        </span>
        <ChevronDown
          size={15}
          className="shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <div className="min-w-0 border-t border-line px-3.5 py-3">{children}</div>
    </details>
  );
}

const CHECK_TONE: Record<string, { tone: Tone; label: string }> = {
  ok: { tone: "ok", label: "OK" },
  warn: { tone: "warn", label: "Check" },
  error: { tone: "bad", label: "Fix" },
  pending: { tone: "neutral", label: "Pending" },
};

function SetupChecklist({
  items,
}: {
  items: VoiceAgentControlCenterSnapshot["checklist"];
}) {
  return (
    <ul className="min-w-0 overflow-hidden rounded-[12px] border border-line" aria-label="Setup checklist">
      {items.map((item) => {
        const tone = CHECK_TONE[item.status] ?? CHECK_TONE.pending;
        return (
          <li key={item.id} className="list-row items-start px-3.5">
            <CheckIcon status={item.status} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink [overflow-wrap:anywhere]">{item.label}</p>
              {item.detail ? (
                <p className="mt-0.5 text-[12px] text-subtle [overflow-wrap:anywhere]">{item.detail}</p>
              ) : null}
            </div>
            <Badge tone={tone.tone} className="mt-0.5">
              {tone.label}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

function CheckIcon({ status }: { status: string }) {
  if (status === "ok") {
    return <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />;
  }
  if (status === "error") {
    return <XCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />;
  }
  if (status === "warn") {
    return <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />;
  }
  return <Circle size={16} className="mt-0.5 shrink-0 text-subtle" aria-hidden />;
}

function EnvSecretsCard({
  secrets,
}: {
  secrets: VoiceAgentControlCenterSnapshot["envSecrets"];
}) {
  const missing = secrets.filter((s) => s.required && !s.ok);
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-[12px] text-subtle [overflow-wrap:anywhere]">
        Server-only keys in <code className="rounded bg-elev px-1 font-mono">.env</code> (see{" "}
        <code className="rounded bg-elev px-1 font-mono">.env.example</code>).
      </p>
      <ul className="min-w-0 space-y-1.5">
        {secrets.map((row) => (
          <li key={row.key} className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-ink">{row.key}</code>
              <Badge tone={row.ok ? "ok" : row.required ? "bad" : "neutral"}>
                {row.ok ? "OK" : row.required ? "Missing" : "Optional"}
              </Badge>
            </div>
            {!row.ok && row.hint ? (
              <p className="mt-0.5 text-[12px] text-subtle [overflow-wrap:anywhere]">{row.hint}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {missing.length > 0 ? (
        <Notice tone="bad">
          Add {missing.map((m) => m.key).join(", ")} then restart the dev server.
        </Notice>
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
    <div className="min-w-0 space-y-2">
      <p className="text-[12px] text-subtle [overflow-wrap:anywhere]">
        ElevenLabs dynamic placeholders used when tools are not baked to this restaurant.
      </p>
      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-[10px] border border-line">
        <table className="w-full min-w-[30rem] text-left text-[12.5px]">
          <thead className="bg-elev text-[11px] uppercase tracking-[0.04em] text-subtle">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Variable</th>
              <th scope="col" className="px-3 py-2 font-semibold">Expected</th>
              <th scope="col" className="px-3 py-2 font-semibold">On agent</th>
              <th scope="col" className="px-3 py-2 font-semibold">Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-line/70 align-top">
                <td className="px-3 py-2 font-mono text-[12px] text-ink [overflow-wrap:anywhere]">{row.key}</td>
                <td className="px-3 py-2 text-muted [overflow-wrap:anywhere]">{row.expected}</td>
                <td className="px-3 py-2 text-ink [overflow-wrap:anywhere]">{row.actual ?? "—"}</td>
                <td className="px-3 py-2">
                  {row.matches ? <Badge tone="ok">Yes</Badge> : <Badge tone="bad">No</Badge>}
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
  if (tools.length === 0) {
    return <p className="text-[12.5px] text-subtle">Tool URLs appear here after the first sync.</p>;
  }
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-[12px] text-subtle [overflow-wrap:anywhere]">
        Supabase Edge Functions for this restaurant (after sync).
      </p>
      <ul className="min-w-0 space-y-2">
        {tools.map((tool) => (
          <li key={tool.name} className="min-w-0 rounded-[10px] border border-line p-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 font-mono text-[12px] font-semibold text-ink [overflow-wrap:anywhere]">
                {tool.label}
              </span>
              <CopyButton
                label={`Copy URL for ${tool.label}`}
                copied={copied === tool.name}
                onClick={() => void onCopy(tool.name, tool.url)}
              />
            </div>
            <p className="mt-1.5 break-all rounded-[8px] bg-elev px-2 py-1.5 font-mono text-[11.5px] text-muted">
              {tool.url}
            </p>
            {tool.headerNote ? (
              <p className="mt-1 text-[11.5px] text-subtle [overflow-wrap:anywhere]">{tool.headerNote}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
