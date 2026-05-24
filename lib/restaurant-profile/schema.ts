import { z } from "zod";

/** Accepts `null` from server actions and empty strings from forms. */
const optionalText = z.preprocess(
  (val) => (val === null || val === undefined ? "" : val),
  z.string().trim().transform((v) => (v === "" ? null : v))
);

const optionalEmail = z.preprocess(
  (val) => (val === null || val === undefined ? "" : val),
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || z.email().safeParse(v).success, {
      message: "Invalid escalation email",
    })
);

const optionalUrl = z.preprocess(
  (val) => (val === null || val === undefined ? "" : val),
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || z.url().safeParse(v).success, {
      message: "Invalid website URL",
    })
);

export const RestaurantProfileInputSchema = z
  .object({
    name: z.string().trim().min(1, "Restaurant name is required"),
    phone: optionalText,
    address_line1: optionalText,
    address_line2: optionalText,
    city: optionalText,
    region: optionalText,
    postal_code: optionalText,
    country: z.string().trim().min(2).max(2).default("US"),
    timezone: z.string().trim().min(1, "Timezone is required"),
    cuisine: optionalText,
    website: optionalUrl,
    allows_pickup: z.boolean(),
    allows_delivery: z.boolean(),
    prep_time_minutes: z.coerce
      .number()
      .int()
      .min(5, "Prep time must be at least 5 minutes")
      .max(240, "Prep time cannot exceed 240 minutes"),
    tax_rate_percent: z.coerce
      .number()
      .min(0)
      .max(100),
    service_fee_percent: z.coerce
      .number()
      .min(0)
      .max(100),
    escalation_name: optionalText,
    escalation_phone: optionalText,
    escalation_email: optionalEmail,
  })
  .refine((d) => d.allows_pickup || d.allows_delivery, {
    message: "Enable at least pickup or delivery",
    path: ["allows_pickup"],
  });

export type RestaurantProfileInput = z.infer<typeof RestaurantProfileInputSchema>;
