"use client";

import { useCallback, useMemo, useState } from "react";
import { HARNESS_SCENARIOS } from "@/lib/voice-agent/test-harness/scenarios";
import type {
  HarnessRunResult,
  HarnessToolName,
} from "@/lib/voice-agent/test-harness/types";
import { cn } from "@/lib/cn";
import { ChevronDown, Play } from "lucide-react";
import { Badge, Switch } from "@/components/ui";
import { Notice } from "@/components/live-orders/workspace-ui";
import {
  clearHarnessDraftSessionAction,
  runVoiceAgentHarnessScenarioAction,
  runVoiceAgentHarnessStepAction,
  type HarnessStepActionResult,
} from "./voice-agent-test-actions";

type Props = {
  restaurantId: string;
  /** Menu setup: native collapsed "Test call" section. Default: legacy panel toggle. */
  variant?: "panel" | "test-call";
  /** Guided setup step 3: no nested details wrapper. */
  flowStep?: boolean;
};

const TOOLS: HarnessToolName[] = [
  "get_menu_items",
  "get_restaurant_info",
  "get_caller_history",
  "submit_reservation_request",
  "sync_draft_order",
  "finalize_order",
  "get_order_status",
];

const DEFAULT_SYNC_BODY = `{
  "status": "draft",
  "items": [
    { "name": "REPLACE_WITH_MENU_ITEM", "quantity": 1 }
  ]
}`;

const DEFAULT_FINALIZE_BODY = `{
  "customer_name": "Test Guest",
  "customer_phone": "555-010-2233"
}`;

const DEFAULT_RESERVATION_BODY = `{
  "customer_name": "Test Guest",
  "customer_phone": "415-555-2233",
  "party_size": 4,
  "requested_date": "tomorrow",
  "requested_time": "7 PM",
  "notes": "Window table if available"
}`;

export function VoiceAgentTestHarness({
  restaurantId,
  variant = "panel",
  flowStep = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [scenarioId, setScenarioId] = useState(HARNESS_SCENARIOS[0]?.id ?? "");
  const [sessionId, setSessionId] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<HarnessRunResult | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const [manualTool, setManualTool] = useState<HarnessToolName>("get_menu_items");
  const [manualBody, setManualBody] = useState("{}");
  const [manualResult, setManualResult] = useState<HarnessStepActionResult | null>(
    null
  );

  const scenario = useMemo(
    () => HARNESS_SCENARIOS.find((s) => s.id === scenarioId),
    [scenarioId]
  );

  const runScenario = useCallback(async () => {
    setBusy(true);
    setError(null);
    setRunResult(null);
    setManualResult(null);
    try {
      const result = await runVoiceAgentHarnessScenarioAction(
        restaurantId,
        scenarioId,
        {
          sessionId: sessionId.trim() || undefined,
          dryRun,
        }
      );
      setSessionId(result.sessionId);
      setRunResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scenario failed");
    } finally {
      setBusy(false);
    }
  }, [restaurantId, scenarioId, sessionId, dryRun]);

  async function runManualStep() {
    setBusy(true);
    setError(null);
    setManualResult(null);
    try {
      let parsed: Record<string, unknown> = {};
      if (manualBody.trim()) {
        parsed = JSON.parse(manualBody) as Record<string, unknown>;
      }
      const result = await runVoiceAgentHarnessStepAction(
        restaurantId,
        manualTool,
        parsed,
        {
          sessionId: sessionId.trim() || undefined,
          dryRun,
        }
      );
      setSessionId(result.sessionId);
      setManualResult(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Invalid JSON or step failed"
      );
    } finally {
      setBusy(false);
    }
  }

  async function clearSession() {
    if (!sessionId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await clearHarnessDraftSessionAction(restaurantId, sessionId.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  function loadManualTemplate(tool: HarnessToolName) {
    setManualTool(tool);
    if (tool === "get_menu_items" || tool === "get_restaurant_info") {
      setManualBody("{}");
    }
    else if (tool === "get_caller_history") {
      setManualBody(`{
  "customer_phone": "555-010-2233"
}`);
    }
    else if (tool === "submit_reservation_request") {
      setManualBody(DEFAULT_RESERVATION_BODY);
    }
    else if (tool === "sync_draft_order") setManualBody(DEFAULT_SYNC_BODY);
    else if (tool === "get_order_status") {
      setManualBody(`{
  "customer_phone": "555-010-2233"
}`);
    } else setManualBody(DEFAULT_FINALIZE_BODY);
  }

  const panelBody = (
    <div id="voice-harness-panel" className="voice-agent-harness min-w-0 space-y-4">
      <p className="text-[12.5px] leading-relaxed text-subtle [overflow-wrap:anywhere]">
        Runs tool scenarios for this restaurant using harness session IDs (
        <span className="font-mono text-[12px]">roal-harness-…</span>), not live phone calls.
      </p>

      {!dryRun ? (
        <Notice tone="warn" role="alert" title="Dry run is off.">
          Harness tools may write test draft orders to your database.
        </Notice>
      ) : (
        <Notice tone="info" role="status">
          Dry run is on — no database writes from harness tools.
        </Notice>
      )}

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={`harness-scenario-${restaurantId}`} className="field-label">
            Scenario
          </label>
          <select
            id={`harness-scenario-${restaurantId}`}
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            className="input-base max-sm:h-11"
          >
            {HARNESS_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={busy || !scenarioId}
          aria-busy={busy}
          onClick={() => void runScenario()}
          className="btn-primary max-sm:w-full"
        >
          <Play size={14} aria-hidden />
          {busy ? "Running…" : "Run scenario"}
        </button>
      </div>

      {scenario ? (
        <p className="-mt-2 text-[12.5px] text-subtle [overflow-wrap:anywhere]">{scenario.description}</p>
      ) : null}

      <div className="grid min-w-0 gap-3 rounded-[12px] border border-line bg-elev p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <label htmlFor={`harness-session-${restaurantId}`} className="field-label">
            Test session
          </label>
          <input
            id={`harness-session-${restaurantId}`}
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Auto-generated roal-harness-…"
            spellCheck={false}
            autoComplete="off"
            className="input-base font-mono text-[12.5px] max-sm:h-11"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-muted sm:min-h-9">
            <Switch checked={dryRun} onChange={setDryRun} label="Dry run (no DB writes)" />
            <span>Dry run</span>
          </label>
          {sessionId.startsWith("roal-harness-") ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clearSession()}
              className="btn-ghost btn-sm max-sm:w-full"
            >
              Clear test session
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Notice tone="bad" role="alert">
          {error}
        </Notice>
      ) : null}

      {runResult ? (
        <div className="min-w-0 space-y-2">
          <Notice tone={runResult.passed ? "ok" : "bad"} role="status" title={runResult.summary}>
            <span className="block text-[12px] opacity-80">
              {runResult.scenarioName} ·{" "}
              <span className="break-all font-mono">{runResult.sessionId}</span>
            </span>
          </Notice>
          <ol className="min-w-0 overflow-hidden rounded-[12px] border border-line" aria-label="Scenario steps">
            {runResult.steps.map((step) => {
              const expanded = expandedStep === step.stepIndex;
              return (
                <li key={step.stepIndex} className="min-w-0 border-b border-line/70 last:border-b-0">
                  <button
                    type="button"
                    className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-2 text-left text-[12.5px] hover:bg-elev focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
                    aria-expanded={expanded}
                    onClick={() => setExpandedStep(expanded ? null : step.stepIndex)}
                  >
                    <StepBadge step={step} />
                    <span className="min-w-0 font-mono text-ink [overflow-wrap:anywhere]">{step.tool}</span>
                    <span className="ml-auto flex items-center gap-2 text-subtle tabular-nums">
                      <span>HTTP {step.httpStatus}</span>
                      <span>{step.durationMs}ms</span>
                      <ChevronDown
                        size={14}
                        className={cn(
                          "transition-transform duration-200 motion-reduce:transition-none",
                          expanded && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </span>
                  </button>
                  {expanded ? <StepDetails step={step} /> : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <details className="voice-agent-harness__advanced group rounded-[12px] border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">Run a single tool</span>
            <span className="block text-[12px] text-subtle">Advanced tool diagnostics with a custom JSON body</span>
          </span>
          <ChevronDown
            size={15}
            className="shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <div className="min-w-0 space-y-3 border-t border-line px-3.5 py-3">
          <div className="flex min-w-0 flex-wrap gap-1.5" role="group" aria-label="Tool">
            {TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={manualTool === t}
                onClick={() => loadManualTemplate(t)}
                className={cn(
                  "min-h-9 rounded-[8px] border px-2.5 font-mono text-[12px] transition-colors max-sm:min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                  manualTool === t
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-card text-muted hover:border-line-strong hover:text-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <label htmlFor={`harness-body-${restaurantId}`} className="sr-only">
            Request body (JSON)
          </label>
          <textarea
            id={`harness-body-${restaurantId}`}
            value={manualBody}
            onChange={(e) => setManualBody(e.target.value)}
            rows={6}
            spellCheck={false}
            className="input-base w-full min-w-0 font-mono text-[12px]"
          />
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void runManualStep()}
            className="btn-ghost max-sm:w-full"
          >
            Run tool step
          </button>
          {manualResult ? (
            <div className="min-w-0 rounded-[10px] border border-line bg-elev p-3">
              <p className="text-[12px] text-subtle [overflow-wrap:anywhere]">
                HTTP {manualResult.httpStatus}
                {manualResult.wroteDatabase ? " · wrote DB" : ""}
              </p>
              <pre className="mt-2 max-h-56 overflow-auto overscroll-contain font-mono text-[11.5px] leading-relaxed text-ink">
                {JSON.stringify(manualResult.response, null, 2)}
              </pre>
              {manualResult.cartValidation && manualResult.cartValidation.issues.length > 0 ? (
                <ValidationList validation={manualResult.cartValidation} />
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );

  if (variant === "test-call" && flowStep) {
    return <div className="min-w-0">{panelBody}</div>;
  }

  if (variant === "test-call") {
    return (
      <details
        className="menu-setup-test-call panel group min-w-0 max-w-full"
        aria-labelledby="menu-setup-test-call-heading"
      >
        <summary
          id="menu-setup-test-call-heading"
          className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[14px] px-[1.125rem] py-3.5 [&::-webkit-details-marker]:hidden"
        >
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-ink">Optional testing</span>
            <span className="block text-[12.5px] text-subtle">
              Harness tool scenarios only — not a live caller. Dry run stays on by default.
            </span>
          </span>
          <ChevronDown
            size={16}
            className="shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <div className="border-t border-line px-[1.125rem] py-4">{panelBody}</div>
      </details>
    );
  }

  return (
    <section className="panel min-w-0" aria-labelledby="voice-harness-heading">
      <div className="panel__head">
        <div className="min-w-0 flex-1">
          <h2 id="voice-harness-heading" className="panel__title">
            Optional testing
          </h2>
          <p className="text-[12.5px] text-subtle">Run a quick test to confirm menu and order updates.</p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="voice-harness-panel"
        >
          {open ? "Hide" : "Show"} testing
        </button>
      </div>

      {open ? <div className="panel__body">{panelBody}</div> : null}
    </section>
  );
}

function StepBadge({
  step,
}: {
  step: HarnessRunResult["steps"][0];
}) {
  const pass = step.expectedFailure ? !step.ok : step.ok;
  return (
    <>
      <Badge tone={pass ? "ok" : "bad"}>{pass ? "Pass" : "Fail"}</Badge>
      <span className="text-subtle">Step {step.stepIndex + 1}</span>
    </>
  );
}

function StepDetails({ step }: { step: HarnessRunResult["steps"][0] }) {
  return (
    <div className="min-w-0 space-y-2 border-t border-line/70 bg-elev px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle">Request</p>
        <pre className="mt-1 max-h-40 overflow-auto overscroll-contain rounded-[8px] border border-line bg-card p-2 font-mono text-[11.5px] text-ink">
          {JSON.stringify(step.request, null, 2)}
        </pre>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle">Response</p>
        <pre className="mt-1 max-h-48 overflow-auto overscroll-contain rounded-[8px] border border-line bg-card p-2 font-mono text-[11.5px] text-ink">
          {JSON.stringify(step.response, null, 2)}
        </pre>
      </div>
      {step.cartValidation && step.cartValidation.issues.length > 0 ? (
        <ValidationList validation={step.cartValidation} />
      ) : null}
    </div>
  );
}

function ValidationList({
  validation,
}: {
  validation: NonNullable<HarnessRunResult["steps"][0]["cartValidation"]>;
}) {
  return (
    <ul className="mt-2 space-y-1.5" aria-label="Cart validation issues">
      {validation.issues.map((issue, i) => (
        <li key={i}>
          <Notice tone="warn" title={`${issue.code}:`}>
            {issue.message}
            {issue.suggestion ? <span className="block opacity-80">Try: {issue.suggestion}</span> : null}
          </Notice>
        </li>
      ))}
    </ul>
  );
}
