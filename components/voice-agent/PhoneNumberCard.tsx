import Link from "next/link";
import { Phone } from "lucide-react";
import { IconTile } from "@/components/ui";

function formatUsPhone(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return e164;
}

/**
 * The restaurant's own ROAL line. It's bought and connected automatically when the plan starts;
 * the only thing the owner does is forward their existing number to it.
 */
export function PhoneNumberCard({
  restaurantId,
  hostName,
  roalNumber,
  restaurantPhone,
}: {
  restaurantId: string;
  hostName: string;
  roalNumber: string | null;
  restaurantPhone: string | null;
}) {
  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="phone-number-title">
      <div className="flex flex-wrap items-start gap-3">
        <IconTile icon={Phone} color="green" size="lg" />
        <div className="min-w-0 flex-1">
          <h2 id="phone-number-title" className="text-[15px] font-semibold text-ink">
            Your phone line
          </h2>
          {roalNumber ? (
            <>
              <p className="mt-1 font-mono text-[22px] font-semibold tracking-tight text-ink">{formatUsPhone(roalNumber)}</p>
              <p className="mt-1 text-[13px] text-subtle">{hostName} answers every call to this number.</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-ink">
                <li>
                  Call your phone company{restaurantPhone ? ` for ${formatUsPhone(restaurantPhone)}` : ""} and ask them to
                  forward calls to <strong>{formatUsPhone(roalNumber)}</strong>.
                </li>
                <li>Or forward only when you&apos;re busy or closed, so you can still pick up when you want to.</li>
                <li>Call your restaurant&apos;s number once to hear {hostName} answer.</li>
              </ol>
            </>
          ) : (
            <>
              <p className="mt-1 text-[13px] text-subtle">
                You get your own phone number for {hostName} as soon as your plan starts. We set it up for you; then you
                just forward your restaurant&apos;s calls to it.
              </p>
              <Link href={`/dashboard/restaurants/${restaurantId}/billing`} className="btn-primary btn-sm mt-3">
                Start my plan
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
