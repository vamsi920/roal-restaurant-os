import { SolutionChatVisual, SolutionMenuVisual, SolutionTicketVisual } from "../illustrations/solution-card-visuals";
import { LandingBeatStaggerGrid, LandingPosterReveal } from "../landing-poster-reveal";
import { LandingHeader, LandingSection } from "../landing-section";

const CARDS = [
  {
    id: "talk",
    title: "Answers the phone",
    body: "Sounds like your team, not a phone tree.",
    tone: "glass",
    art: <SolutionChatVisual />,
  },
  {
    id: "menu",
    title: "Knows your menu",
    body: "Your items, modifiers, and prices.",
    tone: "glass",
    art: <SolutionMenuVisual />,
  },
  {
    id: "ticket",
    title: "Sends the ticket",
    body: "Order hits your kitchen screen.",
    tone: "glass",
    art: <SolutionTicketVisual />,
  },
] as const;

export function LandingSolution() {
  return (
    <LandingSection id="what" labelledBy="what-heading" className="landing-poster-block">
      <LandingPosterReveal>
        <LandingHeader titleId="what-heading" title="What ROAL does" />
      </LandingPosterReveal>
      <LandingBeatStaggerGrid items={[...CARDS]} />
    </LandingSection>
  );
}
