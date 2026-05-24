const ROWS = [
  { id: "calls", label: "Calls answered", status: "Free", charged: false },
  { id: "chats", label: "Hang-ups & small talk", status: "Free", charged: false },
  { id: "order", label: "Order to the kitchen", status: "You pay", charged: true },
] as const;

export function PayInvoiceVisual() {
  return (
    <figure className="landing-pay-invoice landing-beat-card glass-card">
      <figcaption className="sr-only">
        Sample bill: calls and hang-ups are free. You pay when an order reaches the kitchen.
      </figcaption>
      <div className="landing-beat-card__art" aria-hidden>
        <svg viewBox="0 0 120 80" className="landing-beat-visual__svg">
          <rect x="30" y="12" width="60" height="56" rx="6" className="landing-beat-visual__fill" />
          <path d="M42 28h36M42 40h28M42 52h32" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
          <rect x="58" y="20" width="24" height="12" rx="6" className="landing-beat-visual__accent-chip" />
        </svg>
      </div>
      <ul className="landing-pay-invoice__rows" aria-label="Example pricing rows">
        {ROWS.map((row) => (
          <li
            key={row.id}
            className={row.charged ? "landing-pay-invoice__row landing-pay-invoice__row--charged" : "landing-pay-invoice__row"}
          >
            <span className="landing-pay-invoice__label">{row.label}</span>
            <span className="landing-pay-invoice__status">
              <span className="sr-only">{row.charged ? "Charge applies: " : ""}</span>
              {row.status}
            </span>
          </li>
        ))}
      </ul>
      <p className="landing-pay-invoice__note">Example bill</p>
    </figure>
  );
}
