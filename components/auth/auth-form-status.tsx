import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  message: string | null;
  tone?: "error" | "success";
  /** Optional follow-up control, e.g. "Resend confirmation email". */
  action?: ReactNode;
};

/** Inline alert above the submit button. Errors use role="alert"; confirmations use role="status". */
export function AuthFormStatus({ id, message, tone = "error", action }: Props) {
  if (!message) return null;
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={tone === "error" ? "auth-alert auth-alert--error" : "auth-alert auth-alert--success"}
    >
      <Icon size={16} aria-hidden className="auth-alert__icon" />
      <div className="min-w-0">
        <p>{message}</p>
        {action ? <div className="auth-alert__action">{action}</div> : null}
      </div>
    </div>
  );
}
