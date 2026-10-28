import { describe, expect, it } from "vitest";
import { createMemoryDb } from "@/lib/db";
import { findExistingLocation } from "@/lib/trial/claim";
import { buildLiveTicket } from "@/lib/trial/live-ticket";
import { pickTrialGreeting, trialGreetingVariants } from "@/lib/trial/prompt";
import type { ScannedMenu } from "@/lib/menu-import/types";
import type { TrialRecord } from "@/lib/trial/types";

async function orgWithEggmania() {
  const db = createMemoryDb();
  const slug = `eggmania-${Math.random().toString(36).slice(2, 9)}`;
  const { data: org } = await db.from("organizations").insert({ name: "Eggmania", slug }).select("id").single();
  const orgId = org!.id as string;
  const { data: r } = await db.from("restaurants").insert({ name: "Eggmania", organization_id: orgId }).select("id").single();
  // Creating a restaurant creates its profile row; fill in the address.
  await db.from("restaurant_profiles").update({ address_line1: "1546 Oak Tree Rd" }).eq("restaurant_id", r!.id);
  return { db, orgId };
}

const trial = (name: string, address: string | null) =>
  ({ restaurant_name: name, profile: { name, address_line1: address } }) as unknown as Pick<TrialRecord, "restaurant_name" | "profile">;

describe("findExistingLocation", () => {
  it("flags the same restaurant at the same address", async () => {
    const { db, orgId } = await orgWithEggmania();
    const dup = await findExistingLocation(db, orgId, trial("EggMania", "1546 Oak Tree Road"));
    expect(dup?.name).toBe("Eggmania");
  });

  it("allows another branch of the same brand at a different address", async () => {
    const { db, orgId } = await orgWithEggmania();
    expect(await findExistingLocation(db, orgId, trial("Eggmania", "1234 Golf Rd"))).toBeNull();
  });

  it("allows a different restaurant", async () => {
    const { db, orgId } = await orgWithEggmania();
    expect(await findExistingLocation(db, orgId, trial("Kati Roll", "1546 Oak Tree Rd"))).toBeNull();
  });
});

describe("buildLiveTicket", () => {
  const menu = {
    categories: [
      {
        name: "Curries",
        items: [
          { name: "Tawa Butter Chicken", price: 13.99, modifiers: [{ modifier_name: "Add rice", extra_price: 2 }] },
          { name: "Paneer Angara", price: 12.99, modifiers: [] },
        ],
      },
    ],
  } as unknown as ScannedMenu;

  it("prices lines from the menu, not the model", () => {
    const t = buildLiveTicket(menu, {
      i: [
        { n: "tawa butter chicken", q: 2, m: ["Add rice"] },
        { n: "Paneer Angara", q: 1, note: "mild" },
        { n: "Mystery Dish", q: 1 },
      ],
      name: "Vamsi",
      done: true,
    });
    expect(t.lines.map((l) => [l.name, l.qty, l.lineTotal])).toEqual([
      ["Tawa Butter Chicken", 2, 31.98],
      ["Paneer Angara", 1, 12.99],
      ["Mystery Dish", 1, null],
    ]);
    expect(t.subtotal).toBe(44.97);
    expect(t.customerName).toBe("Vamsi");
    expect(t.confirmed).toBe(true);
  });

  it("is not confirmed while empty", () => {
    expect(buildLiveTicket(menu, { i: [], done: true }).confirmed).toBe(false);
  });
});

describe("receptionist greetings", () => {
  it("always thanks the caller for calling the restaurant and names the host", () => {
    for (const g of trialGreetingVariants({ restaurantName: "Eggmania", agentName: "Anika", offersDelivery: true })) {
      expect(g).toMatch(/Eggmania/);
      expect(g).toMatch(/Anika/);
      expect(g).toMatch(/thank/i);
    }
  });

  it("varies between calls", () => {
    const input = { restaurantName: "Eggmania", agentName: "Anika" };
    const seen = new Set([0, 0.25, 0.5, 0.75, 0.99].map((r) => pickTrialGreeting(input, () => r)));
    expect(seen.size).toBeGreaterThan(3);
  });

  it("uses the restaurant's local time of day", () => {
    const noonUtc = new Date("2026-10-27T16:00:00Z");
    const [, second] = trialGreetingVariants({ restaurantName: "X", agentName: "A", timezone: "America/New_York", now: noonUtc });
    expect(second).toMatch(/Good afternoon|Good morning/);
  });
});
