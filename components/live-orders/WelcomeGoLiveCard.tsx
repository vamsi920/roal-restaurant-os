"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  restaurantId: string;
  hostName: string;
  /** ElevenLabs number to forward the store line to, when known. */
  forwardingNumber: string | null;
  supportEmail: string;
  restaurantName: string;
};

function storageKey(restaurantId: string) {
  return `roal:welcome-dismissed:${restaurantId}`;
}

/**
 * First-run card after a trial is claimed (`?welcome=1`). Dismiss persists in
 * localStorage so the kitchen tablet never sees it again.
 */
export function WelcomeGoLiveCard({
  restaurantId,
  hostName,
  forwardingNumber,
  supportEmail,
  restaurantName,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(storageKey(restaurantId)) !== "1");
    } catch {
      setVisible(true);
    }
  }, [restaurantId]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(restaurantId), "1");
    } catch {
      // Private mode: card simply hides for this view.
    }
    setVisible(false);
    if (typeof window !== "undefined" && window.location.search.includes("welcome=1")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState(null, "", url.toString());
    }
  }

  if (!visible) return null;

  const base = `/dashboard/restaurants/${restaurantId}`;
  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(
    `Attach our number — ${restaurantName}`
  )}&body=${encodeURIComponent(
    `Hi ROAL,\n\nPlease attach a phone number for ${restaurantName} so we can forward our line to ${hostName}.\n\nRestaurant id: ${restaurantId}\n`
  )}`;

  const steps = [
    {
      title: "Make a test call",
      body: `Talk to ${hostName} from your browser. Order something, ask about hours, ask for a manager.`,
      action: (
        <Link href={`${base}/agent#test-call`} className="btn-primary btn-sm">
          Test call
        </Link>
      ),
    },
    {
      title: "Review your menu",
      body: `Check prices and switch off anything that is 86'd. ${hostName} only sells what is live here.`,
      action: (
        <Link href={`${base}/menu`} className="btn-ghost btn-sm">
          Open menu
        </Link>
      ),
    },
    {
      title: "Forward your number",
      body: forwardingNumber ? (
        <>
          From your phone provider, forward the restaurant line to{" "}
          <code className="rounded bg-elev px-1 font-mono text-[12.5px] text-ink">{forwardingNumber}</code>. Start with
          “forward when busy / no answer” so staff still pick up first.
        </>
      ) : (
        "Forward the restaurant line to the number we attach for you. We set it up and send the forwarding steps for your carrier."
      ),
      action: forwardingNumber ? (
        <a href={`tel:${forwardingNumber.replace(/[^+\d]/g, "")}`} className="btn-ghost btn-sm">
          Call the number
        </a>
      ) : (
        <a href={mailto} className="btn-ghost btn-sm">
          Contact us to attach your number
        </a>
      ),
    },
  ];

  return (
    <section
      className="panel min-w-0 overflow-hidden"
      aria-labelledby="welcome-card-title"
      data-testid="welcome-go-live-card"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-[1.125rem] py-4">
        <div className="min-w-0">
          <span className="badge badge--live">
            <span className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
            Live for testing
          </span>
          <h2
            id="welcome-card-title"
            className="mt-2 font-display text-[20px] font-bold leading-tight tracking-[-0.01em] text-ink"
          >
            {hostName} is live for testing
          </h2>
          <p className="mt-1 text-[13.5px] text-muted">
            Your menu, hours, and FAQ are loaded. Three steps and {hostName} is answering your real line.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm shrink-0"
          onClick={dismiss}
          aria-label="Dismiss welcome card"
        >
          Dismiss
        </button>
      </div>

      <ol className="grid gap-px bg-line sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="flex min-w-0 gap-3 bg-card px-[1.125rem] py-4">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-white"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink">{step.title}</p>
              <p className="mt-0.5 text-[13px] text-muted [overflow-wrap:anywhere]">{step.body}</p>
              <div className="mt-2.5">{step.action}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
