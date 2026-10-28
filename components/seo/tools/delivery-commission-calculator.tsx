"use client";

import { useState } from "react";
import { CalcCard, NumberField, RangeField, ResultRow, ROAL_ORDER_FEE, formatUsd } from "./calc-ui";

export function DeliveryCommissionCalculator() {
  const [ordersMonth, setOrdersMonth] = useState(400);
  const [avgOrder, setAvgOrder] = useState(30);
  const [commission, setCommission] = useState(20);

  const sales = ordersMonth * avgOrder;
  const commissionMonth = sales * (commission / 100);
  const commissionYear = commissionMonth * 12;
  const phoneMonth = ordersMonth * ROAL_ORDER_FEE;
  const phoneYear = phoneMonth * 12;
  const difference = commissionMonth - phoneMonth;

  return (
    <CalcCard
      inputs={
        <>
          <NumberField label="Orders per month through delivery apps" value={ordersMonth} onChange={setOrdersMonth} />
          <NumberField label="Average order value" value={avgOrder} onChange={setAvgOrder} prefix="$" step={0.5} />
          <RangeField
            label="Commission per order"
            value={commission}
            onChange={setCommission}
            min={10}
            max={35}
            suffix="%"
            hint="Commissions are commonly about 15–30%. Check your own statement."
          />
        </>
      }
      results={
        <>
          <ResultRow label="Commission paid per month" value={formatUsd(commissionMonth)} />
          <ResultRow label="Commission paid per year" value={formatUsd(commissionYear)} big />
          <ResultRow label="Same orders by phone, per month" value={formatUsd(phoneMonth)} />
          <ResultRow label="Same orders by phone, per year" value={formatUsd(phoneYear)} />
          <ResultRow label="Difference per month" value={formatUsd(difference)} />
        </>
      }
      summary={
        <>
          At {commission}% you pay {formatUsd(commissionMonth / Math.max(ordersMonth, 1))} per order in
          commission. A phone order taken by ROAL costs {formatUsd(ROAL_ORDER_FEE)}. Phone orders do not
          cover delivery drivers, so keep that cost in mind if you deliver yourself.
        </>
      }
    />
  );
}
