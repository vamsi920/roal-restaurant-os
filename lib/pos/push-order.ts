import type { Db } from "@/lib/db";
import { sendOrderToClover, type CloverOrderLine } from "@/lib/pos/clover";
import { freshCloverAccessToken, loadPosConnection, recordPosSync } from "@/lib/pos/connections";
import { dollarsToCents } from "@/lib/orders/money";

export type PosOrderLine = {
  item_id: string;
  name: string;
  quantity: number;
  customizations: string[];
  unit_price: number | null;
  notes: string | null;
};

export type PosModifierPrice = { item_id: string; modifier_name: string; extra_price: number | null };

export type PushOrderToPosInput = {
  restaurantId: string;
  sessionId: string;
  lines: PosOrderLine[];
  modifiers: PosModifierPrice[];
  customerName: string | null;
  customerPhone: string | null;
  fulfillmentType: string;
  deliveryAddress: string | null;
  deliveryInstructions: string | null;
};

export type PushOrderToPosResult =
  | { status: "not_connected" }
  | { status: "already_sent"; posOrderId: string }
  | { status: "sent"; posOrderId: string; printed: boolean }
  | { status: "failed"; error: string };

/** Unit price in cents, including paid add-ons the caller picked. */
export function posLines(lines: PosOrderLine[], modifiers: PosModifierPrice[]): CloverOrderLine[] {
  return lines.map((line) => {
    const addOns = line.customizations.reduce((sum, choice) => {
      const match = modifiers.find(
        (m) => m.item_id === line.item_id && m.modifier_name.trim().toLowerCase() === choice.trim().toLowerCase()
      );
      return sum + (match?.extra_price ?? 0);
    }, 0);
    const noteParts = [...line.customizations, ...(line.notes ? [`Note: ${line.notes}`] : [])];
    return {
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: dollarsToCents((line.unit_price ?? 0) + addOns),
      note: noteParts.length ? noteParts.join(", ") : null,
    };
  });
}

/**
 * Sends a finalized phone order to the restaurant's connected register (Clover today).
 * Never throws: the order is already saved and on the ROAL kitchen screen either way.
 * The result is stored on the phone_order_receipts row so it is sent once per order.
 */
export async function pushOrderToPos(
  db: Db,
  input: PushOrderToPosInput,
  fetchImpl: typeof fetch = fetch
): Promise<PushOrderToPosResult> {
  let restaurantId = input.restaurantId;
  try {
    const connection = await loadPosConnection(db, input.restaurantId);
    if (!connection) return { status: "not_connected" };
    restaurantId = connection.restaurant_id;

    const { data: receipt } = await db
      .from("phone_order_receipts")
      .select("pos_order_id")
      .eq("restaurant_id", input.restaurantId)
      .eq("session_id", input.sessionId)
      .maybeSingle<{ pos_order_id?: string | null }>();
    if (receipt?.pos_order_id) return { status: "already_sent", posOrderId: receipt.pos_order_id };

    const { config, accessToken } = await freshCloverAccessToken(db, connection, undefined, fetchImpl);
    const sent = await sendOrderToClover(
      config,
      connection.merchant_id,
      accessToken,
      {
        lines: posLines(input.lines, input.modifiers),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        fulfillmentType: input.fulfillmentType,
        deliveryAddress: input.deliveryAddress,
        deliveryInstructions: input.deliveryInstructions,
      },
      fetchImpl
    );

    await db
      .from("phone_order_receipts")
      .update({
        pos_provider: connection.provider,
        pos_order_id: sent.orderId,
        pos_printed: sent.printed,
        pos_sync_error: sent.printError,
      })
      .eq("restaurant_id", input.restaurantId)
      .eq("session_id", input.sessionId);
    await recordPosSync(db, restaurantId, sent.printError);
    return { status: "sent", posOrderId: sent.orderId, printed: sent.printed };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not reach the register.";
    try {
      await db
        .from("phone_order_receipts")
        .update({ pos_sync_error: message })
        .eq("restaurant_id", input.restaurantId)
        .eq("session_id", input.sessionId);
      await recordPosSync(db, restaurantId, message);
    } catch {
      // Best effort.
    }
    return { status: "failed", error: message };
  }
}
