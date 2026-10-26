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

  return (
    <section
      className="welcome-card card card--raised min-w-0"
      aria-labelledby="welcome-card-title"
      data-testid="welcome-go-live-card"
    >
      <div className="welcome-card__head">
        <div className="min-w-0">
          <p className="welcome-card__eyebrow">
            <span className="pulse-dot" aria-hidden /> Live for testing
          </p>
          <h2 id="welcome-card-title" className="welcome-card__title">
            {hostName} is live for testing
          </h2>
          <p className="welcome-card__lead">
            Your menu, hours, and FAQ are loaded. Three steps and {hostName} is
            answering your real line.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm welcome-card__dismiss"
          onClick={dismiss}
          aria-label="Dismiss welcome card"
        >
          Dismiss
        </button>
      </div>

      <ol className="welcome-card__steps">
        <li className="welcome-card__step">
          <span className="welcome-card__num" aria-hidden>1</span>
          <div className="min-w-0">
            <p className="welcome-card__step-title">Make a test call</p>
            <p className="welcome-card__step-body">
              Talk to {hostName} from your browser. Order something, ask about hours,
              ask for a manager.
            </p>
            <Link href={`${base}/agent#test-call`} className="btn-primary btn-sm mt-2">
              Test call
            </Link>
          </div>
        </li>
        <li className="welcome-card__step">
          <span className="welcome-card__num" aria-hidden>2</span>
          <div className="min-w-0">
            <p className="welcome-card__step-title">Review your menu</p>
            <p className="welcome-card__step-body">
              Check prices and mark anything that is 86&apos;d. {hostName} only sells
              what is live here.
            </p>
            <Link href={`${base}/menu`} className="btn-ghost btn-sm mt-2">
              Open menu
            </Link>
          </div>
        </li>
        <li className="welcome-card__step">
          <span className="welcome-card__num" aria-hidden>3</span>
          <div className="min-w-0">
            <p className="welcome-card__step-title">Forward your number</p>
            {forwardingNumber ? (
              <>
                <p className="welcome-card__step-body">
                  From your phone provider, forward the restaurant line to{" "}
                  <code className="welcome-card__number">{forwardingNumber}</code>.
                  Start with “forward when busy / no answer” so staff still pick up first.
                </p>
                <a
                  href={`tel:${forwardingNumber.replace(/[^+\d]/g, "")}`}
                  className="btn-ghost btn-sm mt-2"
                >
                  Call the number
                </a>
              </>
            ) : (
              <>
                <p className="welcome-card__step-body">
                  Forward the restaurant line to the ElevenLabs number we attach for
                  you. We set it up and send the forwarding steps for your carrier.
                </p>
                <a href={mailto} className="btn-ghost btn-sm mt-2">
                  Contact us to attach your number
                </a>
              </>
            )}
          </div>
        </li>
      </ol>
    </section>
  );
}
