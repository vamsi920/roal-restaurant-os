import { FaqList } from "@/components/landing/faq-list";
import { HOME_FAQ } from "@/lib/landing/launch-faq";

export function HomeFaq() {
  return (
    <section className="section" id="faq" aria-labelledby={HOME_FAQ.titleId}>
      <div className="wrap">
        <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-12">
          <div className="reveal min-w-0">
            <p className="eyebrow">FAQ</p>
            <h2 id={HOME_FAQ.titleId} className="h2 mt-3">
              {HOME_FAQ.title}
            </h2>
            <p className="lead mt-4">Short answers. If yours is not here, email us and a person replies.</p>
          </div>
          <div className="reveal min-w-0">
            <FaqList items={HOME_FAQ.items} />
          </div>
        </div>
      </div>
    </section>
  );
}
