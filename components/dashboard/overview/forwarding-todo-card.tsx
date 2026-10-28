import Link from "next/link";
import { ArrowRight, PhoneForwarded, TriangleAlert } from "lucide-react";
import { IconTile } from "@/components/ui";
import type { ForwardingSummary } from "@/lib/forwarding/state";
import { formatPhoneForDisplay } from "@/lib/phone/e164";

/** Overview to-do: shown until calls to the store number are confirmed reaching the host. */
export function ForwardingTodoCard({ forwarding, hostName, href }: { forwarding: ForwardingSummary; hostName: string; href: string }) {
  if (forwarding.status === "on") return null;
  const quiet = forwarding.status === "quiet";
  const failed = forwarding.status === "failed";
  const store = formatPhoneForDisplay(forwarding.storePhone) ?? "your store number";

  const title = quiet
    ? "Calls stopped reaching your host"
    : failed
      ? "Call forwarding isn't working yet"
      : `To do: send your calls to ${hostName}`;
  const detail = quiet
    ? `No calls came through from ${store} on a day you were open. Forwarding may have been switched off.`
    : failed
      ? "Our test call didn't come through. Let's go over the steps again. It takes two minutes."
      : !forwarding.roalPhone
        ? "Once your plan starts and your phone line is ready, we'll walk you through it."
        : `Turn on call forwarding on ${store} so ${hostName} can answer. We'll guide you and check it works.`;

  return (
    <section className="panel overflow-hidden" aria-labelledby="forwarding-todo-title">
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <span className="relative">
          <IconTile icon={quiet || failed ? TriangleAlert : PhoneForwarded} color={quiet || failed ? "rose" : "blue"} size="lg" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="forwarding-todo-title" className="text-[15px] font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[13px] text-subtle">{detail}</p>
        </div>
        <Link href={href} className="btn-primary btn-sm inline-flex shrink-0 items-center gap-1.5">
          {quiet ? "Check forwarding" : forwarding.status === "not_started" ? "Set up forwarding" : "Continue setup"}
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
