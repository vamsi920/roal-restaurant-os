"use client";

import { useCallback, useMemo, useState } from "react";
import { HARNESS_SCENARIOS } from "@/lib/voice-agent/test-harness/scenarios";
import type {
  HarnessRunResult,
  HarnessToolName,
} from "@/lib/voice-agent/test-harness/types";
import { cn } from "@/lib/cn";
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
      <div
        id="voice-harness-panel"
        className="voice-agent-harness min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-5 sm:p-5"
      >
        <p className="voice-agent-harness__notice text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">
          Runs tool scenarios for this restaurant using harness session IDs (
          <span className="font-mono text-caption">roal-harness-…</span>), not
          live phone calls.
        </p>

        {!dryRun ? (
          <p
            className="voice-agent-harness__live-write-warning rounded-lg border border-warning/35 bg-warning/[0.08] px-3 py-2 text-xs text-amber-950 [overflow-wrap:anywhere]"
            role="alert"
          >
            Dry run is off — harness tools may write test draft orders to your
            database.
          </p>
        ) : (
          <p
            className="voice-agent-harness__dry-run-notice rounded-lg border border-line/80 bg-elev/50 px-3 py-2 text-xs text-muted"
            role="status"
          >
            Dry run is on — no database writes from harness tools.
          </p>
        )}

        <div className="voice-agent-harness__scenarios voice-agent-harness__run-row flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 w-full flex-1 flex-col gap-1">
            <span className="text-micro font-semibold uppercase tracking-wider text-subtle">
              Scenario
            </span>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="voice-agent-harness__scenario-select input-base min-h-11 text-sm sm:min-h-10"
              aria-label="Harness scenario"
            >
              {HARNESS_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !scenarioId}
            onClick={() => void runScenario()}
            className="btn-primary kds-thumb-btn min-h-11 w-full text-sm sm:min-h-10 sm:w-auto"
          >
            {busy ? "Running…" : "Run scenario"}
          </button>
        </div>

        {scenario ? (
          <p className="voice-agent-harness__scenario-desc text-xs text-muted [overflow-wrap:anywhere]">
            {scenario.description}
          </p>
        ) : null}

        <div className="voice-agent-harness__session flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-elev/40 p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 w-full flex-1 flex-col gap-1">
            <span className="text-micro font-semibold uppercase tracking-wider text-subtle">
              Test session
            </span>
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Auto-generated roal-harness-…"
              className="input-base min-h-11 font-mono text-sm sm:min-h-10 sm:text-xs"
            />
          </label>
          <label className="voice-agent-harness__dry-run-toggle flex min-h-11 w-full items-center gap-2 text-sm text-muted sm:w-auto sm:pb-2">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-line"
            />
            <span className="[overflow-wrap:anywhere]">Dry run (no DB writes)</span>
          </label>
          {sessionId.startsWith("roal-harness-") ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clearSession()}
              className="btn-ghost kds-thumb-btn min-h-11 w-full text-sm sm:min-h-10 sm:w-auto"
            >
              Clear test session
            </button>
          ) : null}
        </div>

        {error ? (
          <p
            className="voice-agent-harness__error rounded-md bg-danger/10 px-3 py-2 text-sm text-danger [overflow-wrap:anywhere]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {runResult ? (
          <div className="voice-agent-harness__results min-w-0 space-y-3">
            <div
              className={cn(
                "voice-agent-harness__results-summary rounded-md px-3 py-2 text-xs font-medium [overflow-wrap:anywhere]",
                runResult.passed
                  ? "bg-success/15 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              <p>{runResult.summary}</p>
              <p className="voice-agent-harness__results-meta mt-1 font-normal text-muted">
                {runResult.scenarioName} ·{" "}
                <span className="font-mono text-caption break-all">
                  {runResult.sessionId}
                </span>
              </p>
            </div>
            <ol className="voice-agent-harness__step-list min-w-0 space-y-2">
              {runResult.steps.map((step) => (
                <li
                  key={step.stepIndex}
                  className="voice-agent-harness__step-item min-w-0 rounded-lg border border-line bg-surface/50"
                >
                  <button
                    type="button"
                    className="voice-agent-harness__step-toggle kds-thumb-btn flex min-h-11 w-full flex-col items-start gap-1 px-3 py-2 text-left text-xs sm:min-h-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
                    aria-expanded={expandedStep === step.stepIndex}
                    onClick={() =>
                      setExpandedStep(
                        expandedStep === step.stepIndex ? null : step.stepIndex
                      )
                    }
                  >
                    <StepBadge step={step} />
                    <span className="font-mono text-subtle [overflow-wrap:anywhere]">
                      {step.tool}
                    </span>
                    <span className="text-muted">HTTP {step.httpStatus}</span>
                    <span className="text-subtle">{step.durationMs}ms</span>
                  </button>
                  {expandedStep === step.stepIndex ? (
                    <StepDetails step={step} />
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <details className="voice-agent-harness__advanced border-t border-line pt-5">
          <summary className="voice-agent-harness__advanced-summary cursor-pointer text-sm font-semibold uppercase tracking-wider text-subtle">
            Advanced tool diagnostics
          </summary>
          <div className="voice-agent-harness__advanced-body mt-3 min-w-0">
            <div className="voice-agent-harness__tool-pills mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              {TOOLS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => loadManualTemplate(t)}
                  className={cn(
                    "kds-thumb-btn min-h-11 rounded-md px-3 py-2 font-mono text-xs sm:min-h-10",
                    manualTool === t
                      ? "bg-accent/15 text-accent"
                      : "bg-elev text-muted hover:text-ink"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={manualBody}
              onChange={(e) => setManualBody(e.target.value)}
              rows={6}
              spellCheck={false}
              className="voice-agent-harness__manual-body input-base mt-2 w-full min-w-0 font-mono text-xs"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void runManualStep()}
              className="btn-ghost kds-thumb-btn mt-2 min-h-11 w-full text-xs sm:min-h-10 sm:w-auto"
            >
              Run tool step
            </button>
            {manualResult ? (
              <div className="voice-agent-harness__manual-result mt-3 min-w-0 rounded-lg border border-line bg-elev/30 p-3">
                <p className="text-xs text-muted [overflow-wrap:anywhere]">
                  HTTP {manualResult.httpStatus}
                  {manualResult.wroteDatabase ? " · wrote DB" : ""}
                </p>
                <pre className="voice-agent-harness__step-log mt-2 max-h-48 overflow-auto overscroll-contain text-micro leading-relaxed text-ink sm:max-h-64">
                  {JSON.stringify(manualResult.response, null, 2)}
                </pre>
                {manualResult.cartValidation &&
                manualResult.cartValidation.issues.length > 0 ? (
                  <ValidationList validation={manualResult.cartValidation} />
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
      </div>
  );

  if (variant === "test-call" && flowStep) {
    return (
      <div className="menu-setup-agent-panel kds-panel min-w-0 overflow-hidden">
        {panelBody}
      </div>
    );
  }

  if (variant === "test-call") {
    return (
      <details
        className="voice-agent-harness-shell voice-agent-harness-shell--optional menu-setup-test-call kds-panel min-w-0 max-w-full overflow-hidden glass-card"
        aria-labelledby="menu-setup-test-call-heading"
      >
        <summary
          id="menu-setup-test-call-heading"
          className="menu-setup-test-call__summary"
        >
          Optional testing
          <span className="menu-setup-test-call__summary-hint font-normal text-muted sm:hidden">
            (collapsed)
          </span>
        </summary>
        <p className="menu-setup-test-call__lead px-3 pb-0 pt-1 text-xs text-muted sm:px-5">
          Harness tool scenarios only — not a live caller. Dry run stays on by
          default.
        </p>
        {panelBody}
      </details>
    );
  }

  return (
    <section className="kds-panel glass-card overflow-hidden voice-harness-panel">
      <div className="kds-panel__header">
        <div className="min-w-0 flex-1">
          <h2
            id="voice-harness-heading"
            className="kds-panel__title"
          >
            Optional testing
          </h2>
          <p className="kds-panel__lead">
            Run a quick test to confirm menu and order updates.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-elev px-3 text-xs font-medium text-ink hover:bg-card"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="voice-harness-panel"
          aria-labelledby="voice-harness-heading"
        >
          {open ? "Hide" : "Show"} testing
        </button>
      </div>

      {open ? panelBody : null}
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
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-micro font-bold uppercase",
          pass ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
        )}
      >
        {pass ? "pass" : "fail"}
      </span>
      <span className="text-muted">Step {step.stepIndex + 1}</span>
    </>
  );
}

function StepDetails({ step }: { step: HarnessRunResult["steps"][0] }) {
  return (
    <div className="voice-agent-harness__step-details min-w-0 space-y-2 border-t border-line px-3 py-2">
      <div className="min-w-0">
        <p className="text-micro font-semibold uppercase text-subtle">Request</p>
        <pre className="voice-agent-harness__step-log mt-1 max-h-36 overflow-auto overscroll-contain rounded bg-elev/50 p-2 text-micro sm:max-h-40">
          {JSON.stringify(step.request, null, 2)}
        </pre>
      </div>
      <div className="min-w-0">
        <p className="text-micro font-semibold uppercase text-subtle">Response</p>
        <pre className="voice-agent-harness__step-log mt-1 max-h-40 overflow-auto overscroll-contain rounded bg-elev/50 p-2 text-micro sm:max-h-48">
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
    <ul className="mt-2 space-y-1 text-micro text-amber-900">
      {validation.issues.map((issue, i) => (
        <li key={i} className="rounded bg-warning/10 px-2 py-1">
          <span className="font-semibold">{issue.code}</span>: {issue.message}
          {issue.suggestion ? (
            <span className="block text-muted">→ {issue.suggestion}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
