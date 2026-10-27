import { Check } from "lucide-react";
import { CommandCenterMock } from "@/components/landing/home/command-center";

const POINTS = [
  "Live calls, transcripts, and recordings",
  "Orders and kitchen tickets in one place",
  "Edit your menu, hours, and FAQs in seconds",
  "See peak call times, popular items, and upsells",
] as const;

export function CommandCenterSection() {
  return (
    <section className="section" id="command-center" aria-labelledby="cc-title">
      <div className="wrap">
        <div className="section-head reveal">
          <p className="pill">
            <span className="pill__dot" aria-hidden />
            Your dashboard
          </p>
          <h2 id="cc-title" className="h2 mt-5">
            <span className="tone-muted">Your restaurant&apos;s</span> phone command center.
          </h2>
          <p className="lead mt-4">
            See every call the host handled, read the transcript, and watch orders arrive. Change the menu
            or the hours and the next caller hears it.
          </p>
          <ul className="cc-points">
            {POINTS.map((p) => (
              <li key={p}>
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="cc-stage reveal">
          <CommandCenterMock />
        </div>
      </div>
    </section>
  );
}
