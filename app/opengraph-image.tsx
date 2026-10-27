import { ImageResponse } from "next/og";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

export const alt = "ROAL — the AI phone host for restaurants";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card used by every page unless a route defines its own. */
export default function OpenGraphImage() {
  // Satori's gradient parser needs an explicit direction on every gradient.
  const line = "rgba(17,17,17,0.05)";
  const grid = `linear-gradient(to bottom, ${line} 1px, transparent 1px), linear-gradient(to right, ${line} 1px, transparent 1px)`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#F7F6F3",
          backgroundImage: grid,
          backgroundSize: "36px 36px",
          color: "#111111",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#EA580C" }} />
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>ROAL</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>Never miss another order.</div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>
            <span>Your phone, answered</span>
            <span style={{ color: "#EA580C", marginLeft: 22 }}>24/7.</span>
          </div>
          <div style={{ marginTop: 26, fontSize: 30, color: "#44423C", maxWidth: 960 }}>
            The AI phone host for restaurants. Takes pickup orders from your live menu and sends the ticket to your kitchen.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 26 }}>
          <div
            style={{
              display: "flex",
              padding: "12px 22px",
              borderRadius: 999,
              background: "#111111",
              color: "#F7F6F3",
              fontWeight: 700,
            }}
          >
            {`${PRICING_RATE_AMOUNT} per completed order`}
          </div>
          <div style={{ color: "#76736A" }}>No monthly fee · Try it with your restaurant link</div>
        </div>
      </div>
    ),
    size
  );
}
