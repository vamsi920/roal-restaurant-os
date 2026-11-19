/**
 * Live Clover check: places a phone order on production through the same agent-tool
 * endpoints the phone host calls (get-menu → sync-draft-order → finalize-order), then reads
 * the receipt to see whether it reached the restaurant's connected Clover.
 *
 * Usage (dry run, no order):  npx tsx --env-file=.env --env-file=.env.local scripts/qa-clover-order.ts <restaurantId>
 * Send a real test order:     npx tsx --env-file=.env --env-file=.env.local scripts/qa-clover-order.ts <restaurantId> send
 */
import { getDb } from "../lib/db";
import { mintAgentToolToken } from "../lib/agent-tools/token";

type MenuItem = { name: string; price: number | null; is_available?: boolean };
type MenuResponse = {
  operations?: { ordering_allowed?: boolean; reason?: string };
  categories?: Array<{ items?: MenuItem[] }>;
};

const RID = process.argv[2]?.trim();
const SEND = process.argv[3] === "send";
const BASE = `${process.env.QA_BASE_URL?.trim() || "https://tryroal.com"}/api/agent-tools`;

void (async () => {
  if (!RID) throw new Error("Pass a restaurant id.");
  const db = getDb();
  const { data: restaurant } = await db
    .from("restaurants")
    .select("organization_id, name")
    .eq("id", RID)
    .maybeSingle<{ organization_id: string | null; name: string }>();
  if (!restaurant) throw new Error("Restaurant not found.");
  const { data: org } = await db
    .from("organizations")
    .select("subscription_status, stripe_customer_id")
    .eq("id", restaurant.organization_id ?? "")
    .maybeSingle<{ subscription_status: string | null; stripe_customer_id: string | null }>();
  console.log(
    `restaurant: ${restaurant.name} | subscription: ${org?.subscription_status ?? "none"} | billable: ${
      org?.subscription_status === "active" && Boolean(org?.stripe_customer_id)
    }`
  );

  const headers = {
    Authorization: `Bearer ${mintAgentToolToken({ restaurantId: RID })}`,
    "content-type": "application/json",
  };
  const menu = (await (
    await fetch(`${BASE}/get-menu?restaurant_id=${RID}&restaurant_name=qa`, { headers })
  ).json()) as MenuResponse;
  console.log(`ordering_allowed: ${menu.operations?.ordering_allowed} ${menu.operations?.reason ?? ""}`);
  const items = (menu.categories ?? [])
    .flatMap((c) => c.items ?? [])
    .filter((i) => i.is_available !== false && typeof i.price === "number" && i.price > 0)
    .slice(0, 2);
  console.log(`items: ${items.map((i) => `${i.name} $${i.price}`).join(", ")}`);
  if (!SEND || items.length < 2) return;

  const session = `qa-clover-${Date.now()}`;
  const sync = await fetch(`${BASE}/sync-draft-order`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      restaurant_id: RID,
      session_id: session,
      status: "draft",
      items: [
        { name: items[0].name, quantity: 2 },
        { name: items[1].name, quantity: 1, notes: "Clover test, please ignore" },
      ],
    }),
  });
  console.log(`sync-draft-order: HTTP ${sync.status}${sync.ok ? "" : ` ${(await sync.text()).slice(0, 300)}`}`);
  const fin = await fetch(`${BASE}/finalize-order`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      restaurant_id: RID,
      session_id: session,
      customer_name: "Clover Test",
      customer_phone: "2015550123",
      fulfillment_type: "pickup",
    }),
  });
  console.log(`finalize-order: HTTP ${fin.status}${fin.ok ? "" : ` ${(await fin.text()).slice(0, 300)}`}`);

  const { data: receipt } = await db
    .from("phone_order_receipts")
    .select("pos_provider, pos_order_id, pos_printed, pos_sync_error")
    .eq("restaurant_id", RID)
    .eq("session_id", session)
    .maybeSingle();
  console.log(`receipt: ${JSON.stringify(receipt)}`);
  console.log(`session: ${session}`);
})();
