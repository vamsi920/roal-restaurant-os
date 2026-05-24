import { z } from "zod";

const timeRe = /^([01]?\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(value: string | null): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function refineEqualOpenClose(
  row: { is_closed: boolean; open_time: string | null; close_time: string | null },
  ctx: z.RefinementCtx
) {
  if (row.is_closed || !row.open_time || !row.close_time) return;
  const openMin = timeToMinutes(row.open_time);
  const closeMin = timeToMinutes(row.close_time);
  if (openMin == null || closeMin == null) return;
  if (openMin === closeMin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Open and close times cannot be the same",
      path: ["close_time"],
    });
  }
}

export const WeeklyHourRowSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    is_closed: z.boolean(),
    open_time: z.string().regex(timeRe).nullable(),
    close_time: z.string().regex(timeRe).nullable(),
  })
  .superRefine((row, ctx) => {
    if (row.is_closed) return;
    if (!row.open_time || !row.close_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Open and close times required when not closed",
      });
      return;
    }
    refineEqualOpenClose(row, ctx);
  });

export const HoursExceptionRowSchema = z
  .object({
    id: z.string().uuid().optional(),
    exception_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    label: z.string().max(120).nullable().optional(),
    is_closed: z.boolean(),
    open_time: z.string().regex(timeRe).nullable(),
    close_time: z.string().regex(timeRe).nullable(),
  })
  .superRefine((row, ctx) => {
    if (row.is_closed) return;
    if (!row.open_time || !row.close_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Special hours need open and close times",
      });
      return;
    }
    refineEqualOpenClose(row, ctx);
  });

export const RestaurantHoursInputSchema = z
  .object({
    temporarily_closed: z.boolean(),
    temporarily_closed_reason: z.string().max(500).nullable(),
  weekly: z.array(WeeklyHourRowSchema).length(7),
  exceptions: z.array(HoursExceptionRowSchema),
  })
  .superRefine((data, ctx) => {
    if (data.temporarily_closed) return;
    if (data.temporarily_closed_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Clear the closure reason when not temporarily closed",
        path: ["temporarily_closed_reason"],
      });
    }
  });

export type RestaurantHoursInput = z.infer<typeof RestaurantHoursInputSchema>;
