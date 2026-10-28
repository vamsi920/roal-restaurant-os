"use client";

import { useId, type ReactNode } from "react";

export const ROAL_ORDER_FEE = 0.9;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Whole dollars for big totals, cents under $100. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return Math.abs(value) < 100 ? usdCents.format(value) : usd.format(value);
}

export function formatCount(value: number): string {
  return Number.isFinite(value) ? num.format(value) : "0";
}

/** Average weeks per month (52 / 12). */
export const WEEKS_PER_MONTH = 52 / 12;

export function clampNumber(value: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
};

export function NumberField({ label, value, onChange, prefix, suffix, hint, min = 0, max, step = 1 }: NumberFieldProps) {
  const id = useId();
  return (
    <div className="tool-field">
      <label htmlFor={id} className="tool-field__label">
        {label}
      </label>
      <div className="tool-input-wrap">
        {prefix ? <span className="tool-input-wrap__affix">{prefix}</span> : null}
        <input
          id={id}
          className="tool-input"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const next = e.target.value === "" ? 0 : Number(e.target.value);
            onChange(clampNumber(next, min, max));
          }}
        />
        {suffix ? <span className="tool-input-wrap__affix">{suffix}</span> : null}
      </div>
      {hint ? <p className="tool-field__hint">{hint}</p> : null}
    </div>
  );
}

type RangeFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
};

export function RangeField({ label, value, onChange, min, max, step = 1, suffix = "", hint }: RangeFieldProps) {
  const id = useId();
  return (
    <div className="tool-field">
      <label htmlFor={id} className="tool-field__label">
        {label}
      </label>
      <div className="tool-range-row">
        <input
          id={id}
          className="tool-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="tool-range-value" aria-hidden>
          {value}
          {suffix}
        </span>
      </div>
      {hint ? <p className="tool-field__hint">{hint}</p> : null}
    </div>
  );
}

export function ResultRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={big ? "tool-result tool-result--big" : "tool-result"}>
      <span className="tool-result__label">{label}</span>
      <span className="tool-result__value">{value}</span>
    </div>
  );
}

export function CalcCard({
  inputs,
  results,
  resultsTitle = "Your numbers",
  summary,
}: {
  inputs: ReactNode;
  results: ReactNode;
  resultsTitle?: string;
  summary?: ReactNode;
}) {
  return (
    <div className="tool-card">
      <p className="tool-card__note">Example numbers — plug in your own.</p>
      <div className="tool-grid">
        <div className="tool-fields">{inputs}</div>
        <div className="min-w-0">
          <div className="tool-results" aria-live="polite">
            <p className="tool-results__title">{resultsTitle}</p>
            {results}
          </div>
          {summary ? <p className="tool-summary">{summary}</p> : null}
        </div>
      </div>
    </div>
  );
}
