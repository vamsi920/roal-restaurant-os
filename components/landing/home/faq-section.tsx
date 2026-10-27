import { FaqList } from "@/components/landing/faq-list";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { HOME_FAQ } from "@/lib/landing/launch-faq";

export function HomeFaq() {
  return (
    <section className="section" id="faq" aria-labelledby={HOME_FAQ.titleId}>
      <div className="wrap">
        <div className="faq-layout">
          <div className="reveal min-w-0">
            <p className="pill">
              <span className="pill__dot" aria-hidden />
              FAQ
            </p>
            <h2 id={HOME_FAQ.titleId} className="h2 mt-5">
              <span className="tone-muted">Frequently asked</span> questions
            </h2>
            <p className="lead mt-4">
              Short answers. If yours isn&apos;t here, email{" "}
              <a className="link" href={`mailto:${CONTACT_PILOT_EMAIL}`}>
                {CONTACT_PILOT_EMAIL}
              </a>{" "}
              and a person replies.
            </p>
          </div>
          <div className="reveal min-w-0">
            <FaqList items={HOME_FAQ.items} />
          </div>
        </div>
      </div>
    </section>
  );
}
