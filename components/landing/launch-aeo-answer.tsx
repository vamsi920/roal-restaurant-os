import { cn } from "@/lib/cn";

export type LaunchAeoAnswerProps = {
  titleId: string;
  question: string;
  answer: string;
  detail?: string;
  className?: string;
};

/** Concise Q→A block for AEO / answer engines (schema.org Question). */
export function LaunchAeoAnswer({
  titleId,
  question,
  answer,
  detail,
  className,
}: LaunchAeoAnswerProps) {
  return (
    <section
      className={cn("launch-aeo-answer public-reveal min-w-0", className)}
      aria-labelledby={titleId}
      itemScope
      itemType="https://schema.org/Question"
    >
      <h2 id={titleId} className="landing-h2 text-balance" itemProp="name">
        {question}
      </h2>
      <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
        <p className="landing-lead mt-4 text-pretty" itemProp="text">
          {answer}
        </p>
        {detail ? (
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">
            {detail}
          </p>
        ) : null}
      </div>
    </section>
  );
}
