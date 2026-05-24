import { StepMenuVisual, StepOrdersVisual, StepPhoneVisual } from "../illustrations/how-step-visuals";
import { LandingBeatStaggerGrid, LandingPosterReveal } from "../landing-poster-reveal";
import { LandingHeader, LandingSection } from "../landing-section";

const STEPS = [
  {
    id: "menu",
    title: "Add your menu",
    body: "Photo or type it in.",
    tone: "glass",
    art: <StepMenuVisual />,
    step: 1,
  },
  {
    id: "phone",
    title: "Connect your line",
    body: "ROAL answers when you cannot.",
    tone: "yellow",
    art: <StepPhoneVisual />,
    step: 2,
  },
  {
    id: "orders",
    title: "Take orders",
    body: "Tickets show on your kitchen screen.",
    tone: "glass",
    art: <StepOrdersVisual />,
    step: 3,
  },
] as const;

export function LandingHowItWorks() {
  return (
    <LandingSection id="how" className="landing-how-it-works landing-poster-block" labelledBy="how-heading">
      <LandingPosterReveal>
        <LandingHeader titleId="how-heading" title="How it works" />
      </LandingPosterReveal>
      <LandingBeatStaggerGrid items={[...STEPS]} ordered />
    </LandingSection>
  );
}
