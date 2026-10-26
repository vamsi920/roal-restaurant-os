import Link from "next/link";
import type { LaunchFaqItem } from "@/lib/landing/launch-faq";

/** Native details/summary FAQ — no JS, keyboard accessible. */
export function FaqList({ items }: { items: readonly LaunchFaqItem[] }) {
  return (
    <div className="faq">
      {items.map((item, i) => (
        <details key={item.id} className="faq__item" open={i === 0}>
          <summary className="faq__q">
            <span>{item.question}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <p className="faq__a">
            {item.answer}
            {item.link ? (
              <>
                {" "}
                <Link href={item.link.href}>{item.link.label}</Link>
              </>
            ) : null}
          </p>
        </details>
      ))}
    </div>
  );
}
