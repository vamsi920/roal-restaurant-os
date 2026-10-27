import { PhoneCall } from "lucide-react";

type Props = {
  restaurant: string;
  lead: string;
  tail: string;
  action: string;
};

/** Try-a-call hand-off: the visitor's built phone host is waiting for an account. */
export function TrialBanner({ restaurant, lead, tail, action }: Props) {
  return (
    <div className="auth-trial" role="note">
      <span className="auth-trial__tile" aria-hidden>
        <PhoneCall size={16} strokeWidth={2.25} />
        <span className="auth-trial__live" />
      </span>
      <p className="auth-trial__text">
        {lead} <strong>{restaurant}</strong> {tail}{" "}
        <span className="auth-trial__action">{action}</span>
      </p>
    </div>
  );
}
