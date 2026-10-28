"use client";

import { useState } from "react";
import { CalcCard, NumberField, ResultRow, ROAL_ORDER_FEE, formatCount, formatUsd } from "./calc-ui";

export function PhoneHostCostCalculator() {
  const [ordersMonth, setOrdersMonth] = useState(300);
  const [fixedPlan, setFixedPlan] = useState(299);

  const roalMonth = ordersMonth * ROAL_ORDER_FEE;
  const breakEven = Math.floor(fixedPlan / ROAL_ORDER_FEE);
  const diff = fixedPlan - roalMonth;

  return (
    <CalcCard
      inputs={
        <>
          <NumberField label="Phone orders per month" value={ordersMonth} onChange={setOrdersMonth} />
          <NumberField
            label="A typical fixed monthly AI phone plan (enter yours)"
            value={fixedPlan}
            onChange={setFixedPlan}
            prefix="$"
            suffix="/mo"
            hint="Use the monthly price from any quote you have. Add setup fees spread over 12 months if there are any."
          />
        </>
      }
      results={
        <>
          <ResultRow label="ROAL per month" value={formatUsd(roalMonth)} big />
          <ResultRow label="ROAL per year" value={formatUsd(roalMonth * 12)} />
          <ResultRow label="Fixed plan per year" value={formatUsd(fixedPlan * 12)} />
          <ResultRow label="Break-even orders per month" value={formatCount(breakEven)} />
          <ResultRow label={diff >= 0 ? "ROAL costs less by, per month" : "Fixed plan costs less by, per month"} value={formatUsd(Math.abs(diff))} />
        </>
      }
      summary={
        <>
          Below about {formatCount(breakEven)} completed orders a month, paying {formatUsd(ROAL_ORDER_FEE)} per
          order costs less than a {formatUsd(fixedPlan)} monthly plan. In a slow month you pay less; a month with
          no orders costs nothing.
        </>
      }
    />
  );
}
