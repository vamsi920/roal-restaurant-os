import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

const ITEMS = [
  "Takes pickup orders",
  "Reads your live menu",
  "Answers hours and FAQs",
  "Sends kitchen tickets",
  "Hands tricky calls to your team",
  `${PRICING_RATE_AMOUNT} per completed order`,
  "No contracts",
] as const;

/** Ambient marquee under the hero. Content repeats twice for the loop; the copy is aria-hidden. */
export function HomeStrip() {
  return (
    <div className="strip" role="presentation">
      <div className="marquee" aria-hidden>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex">
            {ITEMS.map((item) => (
              <span key={`${copy}-${item}`} className="strip__item">
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="sr-only">{ITEMS.join(". ")}.</p>
    </div>
  );
}
