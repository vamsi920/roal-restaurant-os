import { SIGNUP_PAGE_COPY } from "@/lib/auth/signup-page-copy";

type Props = {
  onboardingPath?: boolean;
};

export function SignupOnboardingAside({ onboardingPath }: Props) {
  const { entry, steps, asideNote } = SIGNUP_PAGE_COPY;

  return (
    <aside
      className="public-signup-aside public-signup-aside__card min-w-0"
      aria-labelledby="signup-entry-heading"
    >
      <p className="public-eyebrow">{entry.eyebrow}</p>
      <h2 id="signup-entry-heading" className="public-signup-aside__title">
        {entry.title}
      </h2>
      <p className="public-signup-aside__lead">{entry.description}</p>

      <ol className="public-signup-steps">
        {steps.map((step, index) => (
          <li key={step.title} className="public-signup-steps__item">
            <span className="public-signup-steps__num" aria-hidden>
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="public-signup-steps__title">{step.title}</h3>
              <p className="public-signup-steps__body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="public-signup-aside__note">
        {onboardingPath ? asideNote.onboardingPath : asideNote.default}
      </p>
    </aside>
  );
}
