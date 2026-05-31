import { PublicFaq } from "@/components/landing/public";
import { HOME_FAQ } from "@/lib/landing/launch-faq";

export function HomeFaq() {
  return (
    <PublicFaq
      variant="accordion-home"
      homeHeader={{
        eyebrow: HOME_FAQ.eyebrow,
        title: HOME_FAQ.title,
        lead: HOME_FAQ.lead,
      }}
      items={HOME_FAQ.items}
      afterList={
        <div className="home-faq__readiness" aria-label="Before forwarding calls">
          <span>Before forwarding calls</span>
          <strong>Menu loaded</strong>
          <strong>Test calls passed</strong>
          <strong>Kitchen screen ready</strong>
        </div>
      }
    />
  );
}
