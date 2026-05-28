import type { LandingPreviewData } from "@/lib/landing-demo-data";
import { ConversationTranscript } from "@/components/landing/chapters/conversation-transcript";
import { KdsVisual } from "@/components/landing/feature-visuals";
import { DEMO_PAGE_COPY } from "@/lib/landing/demo-page-copy";

type Props = {
  preview: LandingPreviewData;
};

export function DemoProofSection({ preview }: Props) {
  const { proof } = DEMO_PAGE_COPY;

  return (
    <section
      id="demo-proof"
      className="public-demo-proof scroll-mt-28"
      aria-labelledby={proof.titleId}
    >
      <h2 id={proof.titleId} className="public-demo-block__title">
        {proof.title}
      </h2>

      <div className="public-demo-proof__grid">
        <div className="public-demo-proof__col min-w-0">
          <p className="public-demo-proof__label">{proof.transcriptLabel}</p>
          <ConversationTranscript />
        </div>
        <div className="public-demo-proof__col min-w-0">
          <p className="public-demo-proof__label">{proof.ticketLabel}</p>
          <div className="public-demo-ticket__frame glass-card min-w-0">
            <KdsVisual data={preview} embedded tone="glass" />
          </div>
          <p className="public-demo-proof__note">
            {preview.source === "live"
              ? `Live preview from ${preview.restaurantName}.`
              : proof.ticketNote}
          </p>
        </div>
      </div>
    </section>
  );
}
