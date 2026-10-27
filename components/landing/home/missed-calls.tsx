import { PhoneMissed, TrendingDown, UsersRound } from "lucide-react";

const CARDS = [
  {
    title: "Rush hour is when it rings",
    body: "Rush hours are when the phone rings most and staff can't pick up. The busiest moments are the ones you can least afford to miss.",
    tile: "orange",
    Icon: PhoneMissed,
  },
  {
    title: "An unanswered call goes elsewhere",
    body: "Every unanswered call is an order that goes somewhere else. Hungry callers rarely leave a voicemail and wait.",
    tile: "rose",
    Icon: TrendingDown,
  },
  {
    title: "The floor pays for the phone",
    body: "Staff pulled off the floor to answer phones means guests at the counter and tables wait. Nobody wins.",
    tile: "blue",
    Icon: UsersRound,
  },
] as const;

/** Full-black mid-page band. No invented numbers. */
export function MissedCalls() {
  return (
    <section className="ink-band" aria-labelledby="missed-title">
      <div className="wrap">
        <div className="section-head section-head--center reveal">
          <h2 id="missed-title" className="h2">
            <span className="tone-muted">Every missed call</span> is a lost order.
          </h2>
          <p className="lead mt-4">
            ROAL picks up when your team can&apos;t, takes the order from your live menu, and hands
            it straight to the kitchen.
          </p>
        </div>
        <div className="ink-cards">
          {CARDS.map(({ title, body, tile, Icon }) => (
            <article key={title} className="ink-card reveal">
              <span className={`ink-card__tile ink-card__tile--${tile}`} aria-hidden>
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="ink-card__title">{title}</h3>
              <p className="ink-card__body">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
