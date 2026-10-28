"use client";

import { useState } from "react";
import { CalcCard, NumberField, RangeField, ResultRow, ROAL_ORDER_FEE, WEEKS_PER_MONTH, formatCount, formatUsd } from "./calc-ui";

export function MissedCallCalculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(25);
  const [orderShare, setOrderShare] = useState(50);
  const [avgOrder, setAvgOrder] = useState(32);

  const lostOrdersWeek = missedPerWeek * (orderShare / 100);
  const weekly = lostOrdersWeek * avgOrder;
  const monthly = weekly * WEEKS_PER_MONTH;
  const yearly = weekly * 52;
  const ordersMonth = lostOrdersWeek * WEEKS_PER_MONTH;
  const roalMonth = ordersMonth * ROAL_ORDER_FEE;

  return (
    <CalcCard
      inputs={
        <>
          <NumberField label="Missed calls per week" value={missedPerWeek} onChange={setMissedPerWeek} hint="Check your phone's missed-call list for a typical week." />
          <RangeField label="Share of those calls that were orders" value={orderShare} onChange={setOrderShare} min={0} max={100} step={5} suffix="%" />
          <NumberField label="Average order value" value={avgOrder} onChange={setAvgOrder} prefix="$" step={0.5} />
        </>
      }
      results={
        <>
          <ResultRow label="Orders missed per week" value={formatCount(lostOrdersWeek)} />
          <ResultRow label="Lost sales per week" value={formatUsd(weekly)} />
          <ResultRow label="Lost sales per month" value={formatUsd(monthly)} />
          <ResultRow label="Lost sales per year" value={formatUsd(yearly)} big />
          <ResultRow label="ROAL on those orders, per month" value={formatUsd(roalMonth)} />
        </>
      }
      summary={
        <>
          About {formatCount(ordersMonth)} orders a month at {formatUsd(ROAL_ORDER_FEE)} each would cost{" "}
          {formatUsd(roalMonth)}, against {formatUsd(monthly)} in sales. You pay only when a completed order
          reaches your kitchen.
        </>
      }
    />
  );
}
