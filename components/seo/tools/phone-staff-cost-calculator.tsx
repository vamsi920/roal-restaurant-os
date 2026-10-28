"use client";

import { useState } from "react";
import { CalcCard, NumberField, RangeField, ResultRow, ROAL_ORDER_FEE, WEEKS_PER_MONTH, formatUsd } from "./calc-ui";

export function PhoneStaffCostCalculator() {
  const [wage, setWage] = useState(16);
  const [hours, setHours] = useState(30);
  const [overhead, setOverhead] = useState(15);
  const [ordersMonth, setOrdersMonth] = useState(500);

  const weekly = wage * hours * (1 + overhead / 100);
  const monthly = weekly * WEEKS_PER_MONTH;
  const yearly = weekly * 52;
  const roalMonth = ordersMonth * ROAL_ORDER_FEE;
  const roalYear = roalMonth * 12;

  return (
    <CalcCard
      inputs={
        <>
          <NumberField label="Hourly wage" value={wage} onChange={setWage} prefix="$" step={0.25} />
          <NumberField label="Hours per week someone covers the phone" value={hours} onChange={setHours} max={168} />
          <RangeField
            label="Payroll overhead"
            value={overhead}
            onChange={setOverhead}
            min={0}
            max={40}
            suffix="%"
            hint="Payroll taxes, workers' comp and benefits on top of the wage. Ask your bookkeeper for yours."
          />
          <NumberField label="Phone orders per month" value={ordersMonth} onChange={setOrdersMonth} />
        </>
      }
      results={
        <>
          <ResultRow label="Phone coverage per week" value={formatUsd(weekly)} />
          <ResultRow label="Phone coverage per month" value={formatUsd(monthly)} />
          <ResultRow label="Phone coverage per year" value={formatUsd(yearly)} big />
          <ResultRow label="ROAL per month" value={formatUsd(roalMonth)} />
          <ResultRow label="ROAL per year" value={formatUsd(roalYear)} />
        </>
      }
      summary={
        <>
          ROAL figure is {formatUsd(ROAL_ORDER_FEE)} per completed phone order. Many owners keep their staff and
          move them from the phone to the counter or the line during the rush.
        </>
      }
    />
  );
}
