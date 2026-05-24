import { DEMO_PAGE_COPY } from "@/lib/landing/demo-page-copy";

function DemoCallSimulation() {
  const steps = DEMO_PAGE_COPY.callSimulation.steps;

  return (
    <ol className="public-demo-steps" aria-label="Illustrative call flow">
      {steps.map((step, index) => (
        <li key={step.id} className="public-demo-steps__item glass-card min-w-0">
          <span className="public-demo-steps__num" aria-hidden>
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="public-demo-steps__time font-mono text-xs tabular-nums">{step.time}</p>
            <h3 className="public-demo-steps__title">{step.title}</h3>
            <p className="public-demo-steps__body">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DemoCallFlowSection() {
  const copy = DEMO_PAGE_COPY.callSimulation;

  return (
    <section id="demo-flow" className="public-demo-block scroll-mt-28" aria-labelledby={copy.titleId}>
      <h2 id={copy.titleId} className="public-demo-block__title">
        {copy.title}
      </h2>
      <p className="public-demo-block__deck">{copy.description}</p>
      <DemoCallSimulation />
    </section>
  );
}
