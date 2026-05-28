import { DEMO_PAGE_COPY } from "@/lib/landing/demo-page-copy";

type StepIcon = (typeof DEMO_PAGE_COPY.callSimulation.steps)[number]["icon"];

function FlowIcon({ kind }: { kind: StepIcon }) {
  const common = { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true as const };

  if (kind === "ring") {
    return (
      <svg {...common} className="public-demo-flow__svg">
        <path
          d="M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M9 17h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12 7v3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "answer") {
    return (
      <svg {...common} className="public-demo-flow__svg">
        <path
          d="M4 12c2-4 6-6 8-6s6 2 8 6c-2 4-6 6-8 6s-6-2-8-6Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M9 12h6M12 9v6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common} className="public-demo-flow__svg">
      <path
        d="M7 5h10l2 3v11H5V8l2-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h8M8 13h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DemoCallFlow() {
  const steps = DEMO_PAGE_COPY.callSimulation.steps;

  return (
    <div className="public-demo-flow" role="list" aria-label="Pickup call flow">
      {steps.map((step, index) => (
        <div key={step.id} className="public-demo-flow__segment" role="listitem">
          {index > 0 ? (
            <span className="public-demo-flow__connector" aria-hidden>
              →
            </span>
          ) : null}
          <div className="public-demo-flow__step glass-card min-w-0">
            <div className="public-demo-flow__icon" aria-hidden>
              <FlowIcon kind={step.icon} />
            </div>
            <p className="public-demo-flow__time font-mono text-xs tabular-nums">
              {step.time}
            </p>
            <h3 className="public-demo-flow__title">{step.title}</h3>
            <p className="public-demo-flow__tag">{step.tagline}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DemoCallFlowSection() {
  const copy = DEMO_PAGE_COPY.callSimulation;

  return (
    <section
      id="demo-flow"
      className="public-demo-block scroll-mt-28"
      aria-labelledby={copy.titleId}
    >
      <h2 id={copy.titleId} className="public-demo-block__title">
        {copy.title}
      </h2>
      <DemoCallFlow />
    </section>
  );
}
