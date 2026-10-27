import Link from "next/link";
import { Plus } from "lucide-react";
import type { LaunchFaqItem } from "@/lib/landing/launch-faq";

/** Native details/summary FAQ — no JS, keyboard accessible. */
export function FaqList({ items }: { items: readonly LaunchFaqItem[] }) {
  return (
    <div className="faq">
      {items.map((item, i) => (
        <details key={item.id} className="faq__item" open={i === 0}>
          <summary className="faq__q">
            <span>{item.question}</span>
            <span className="faq__icon" aria-hidden>
              <Plus className="h-4 w-4" strokeWidth={2.25} />
            </span>
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
