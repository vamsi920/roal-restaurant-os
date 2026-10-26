/**
 * Full-black mid-page section: a sample call transcript next to the ticket it produced.
 * All names, items, and numbers are illustrative. No real customer is shown.
 */

const TURNS = [
  { who: "host", text: "Thanks for calling Blue Moon Cafe, this is Maya. Pickup order or a quick question?" },
  { who: "caller", text: "Pickup. Can I get a margherita and a house salad?" },
  { who: "host", text: "One margherita pizza and one house salad. Anything to drink?" },
  { who: "caller", text: "No, that's it. Actually, make the salad no onions." },
  { who: "host", text: "Got it, house salad with no onions. Name and a phone number for the order?" },
  { who: "caller", text: "Sam, 555-010-0177." },
  { who: "host", text: "Thanks Sam. Total is 23 dollars, ready for pickup in about 20 minutes. See you soon." },
] as const;

export function InkSection() {
  return (
    <section className="ink" aria-labelledby="ink-title">
      <div className="wrap">
        <div className="ink__head reveal">
          <p className="eyebrow">A call, start to ticket</p>
          <h2 id="ink-title" className="h2 mt-3">
            It takes the order. Your kitchen gets the ticket.
          </h2>
          <p className="lead mt-4">
            No app for the caller. No tablet for you to watch. The call ends and the ticket is already
            on the screen.
          </p>
        </div>

        <div className="ink__grid reveal">
          <div className="transcript" aria-label="Sample call transcript">
            <div className="transcript__head">
              <span className="transcript__live">
                <span className="pulse-dot" /> Sample call
              </span>
              <span>Blue Moon Cafe · fictional</span>
            </div>
            {TURNS.map((turn, i) => (
              <div key={i} className={`turn turn--${turn.who}`}>
                <span className="turn__who">{turn.who === "host" ? "Maya · host" : "Caller"}</span>
                <p className="turn__bubble">{turn.text}</p>
              </div>
            ))}
          </div>

          <div className="ticket" aria-label="Sample kitchen ticket">
            <span className="ticket__stamp">Pickup</span>
            <div className="ticket__head">
              <strong>BLUE MOON CAFE</strong>
              <span>Phone order · #0418</span>
            </div>
            <div className="ticket__meta">
              <span>Name</span>
              <span>Sam</span>
            </div>
            <div className="ticket__meta">
              <span>Phone</span>
              <span>(555) 010-0177</span>
            </div>
            <div className="ticket__meta">
              <span>Ready</span>
              <span>~20 min</span>
            </div>
            <div className="ticket__items">
              <div className="ticket__item">
                <span>1×</span>
                <span>Margherita pizza</span>
                <span>14.00</span>
              </div>
              <div className="ticket__item">
                <span>1×</span>
                <span>House salad</span>
                <span>9.00</span>
              </div>
              <div className="ticket__mod">— no onions</div>
            </div>
            <div className="ticket__total">
              <span>TOTAL</span>
              <span>23.00</span>
            </div>
            <div className="mt-3 text-center text-[11px] opacity-70">Paid at pickup · taken by ROAL</div>
          </div>
        </div>

        <p className="ink__note">Sample conversation for illustration. Your host uses your menu, your prices, and your hours.</p>
      </div>
    </section>
  );
}
