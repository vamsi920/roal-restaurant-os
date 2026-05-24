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
};

const TOOLS: HarnessToolName[] = [
  "get_menu_items",
  "sync_draft_order",
  "finalize_order",
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

export function VoiceAgentTestHarness({ restaurantId }: Props) {
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
    if (tool === "get_menu_items") setManualBody("{}");
    else if (tool === "sync_draft_order") setManualBody(DEFAULT_SYNC_BODY);
    else setManualBody(DEFAULT_FINALIZE_BODY);
  }

  return (
    <section className="kds-panel glass-card overflow-hidden">
      <div className="kds-panel__header">
        <div className="min-w-0 flex-1">
          <h2
            id="voice-harness-heading"
            className="kds-panel__title"
          >
            Voice agent test harness
          </h2>
          <p className="kds-panel__lead">
            Simulate menu and order tools without a live call — for QA and
            debugging.
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
          {open ? "Hide" : "Show"} harness
        </button>
      </div>

      {open ? (
      <div id="voice-harness-panel" className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
              Scenario
            </span>
            <select
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
              className="input-base text-sm"
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
            className="btn-primary min-h-10 text-xs"
          >
            {busy ? "Running…" : "Run scenario"}
          </button>
        </div>

        {scenario ? (
          <p className="text-xs text-muted">{scenario.description}</p>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-elev/40 p-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
              Session id
            </span>
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Auto-generated roal-harness-…"
              className="input-base font-mono text-xs"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-line"
            />
            Dry run (no DB writes)
          </label>
          {sessionId.startsWith("roal-harness-") ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clearSession()}
              className="btn-ghost min-h-10 text-xs"
            >
              Clear harness session
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        {runResult ? (
          <div className="space-y-3">
            <div
              className={cn(
                "rounded-md px-3 py-2 text-xs font-medium",
                runResult.passed
                  ? "bg-success/15 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              {runResult.summary}
              <span className="ml-2 font-normal text-muted">
                · {runResult.scenarioName} · {runResult.sessionId}
              </span>
            </div>
            <ol className="space-y-2">
              {runResult.steps.map((step) => (
                <li
                  key={step.stepIndex}
                  className="rounded-lg border border-line bg-surface/50"
                >
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-xs"
                    aria-expanded={expandedStep === step.stepIndex}
                    onClick={() =>
                      setExpandedStep(
                        expandedStep === step.stepIndex ? null : step.stepIndex
                      )
                    }
                  >
                    <StepBadge step={step} />
                    <span className="font-mono text-subtle">{step.tool}</span>
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

        <div className="border-t border-line pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">
            Manual tool step
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => loadManualTemplate(t)}
                className={cn(
                  "min-h-10 rounded-md px-3 py-2 font-mono text-xs",
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
            rows={8}
            spellCheck={false}
            className="input-base mt-2 w-full font-mono text-xs"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void runManualStep()}
            className="btn-ghost mt-2 min-h-10 text-xs"
          >
            Run tool step
          </button>
          {manualResult ? (
            <div className="mt-3 rounded-lg border border-line bg-elev/30 p-3">
              <p className="text-xs text-muted">
                HTTP {manualResult.httpStatus}
                {manualResult.wroteDatabase ? " · wrote DB" : ""}
              </p>
              <pre className="mt-2 max-h-64 overflow-auto text-[10px] leading-relaxed text-ink">
                {JSON.stringify(manualResult.response, null, 2)}
              </pre>
              {manualResult.cartValidation &&
              manualResult.cartValidation.issues.length > 0 ? (
                <ValidationList validation={manualResult.cartValidation} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
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
          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
          pass ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
        )}
      >
        {pass ? "pass" : "fail"}
      </span>
      <span className="text-muted">&ldquo;{step.guestLine}&rdquo;</span>
    </>
  );
}

function StepDetails({ step }: { step: HarnessRunResult["steps"][0] }) {
  return (
    <div className="space-y-2 border-t border-line px-3 py-2">
      <div>
        <p className="text-[10px] font-semibold uppercase text-subtle">Request</p>
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-elev/50 p-2 text-[10px]">
          {JSON.stringify(step.request, null, 2)}
        </pre>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase text-subtle">Response</p>
        <pre className="mt-1 max-h-48 overflow-auto rounded bg-elev/50 p-2 text-[10px]">
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
    <ul className="mt-2 space-y-1 text-[10px] text-amber-900">
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
