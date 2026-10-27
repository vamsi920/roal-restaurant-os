import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowUpRight, Clock, Info, PhoneCall, ShoppingBag, Timer, TrendingUp } from "lucide-react";
import { Panel, StatCard, formatMoney, greetingFor } from "@/components/ui";
import { CallsChart } from "@/components/dashboard/overview/calls-chart";
import { GoLiveCard } from "@/components/dashboard/overview/go-live-card";
import { RecentActivity } from "@/components/dashboard/overview/recent-activity";
import { WelcomeGoLiveCard } from "@/components/live-orders/WelcomeGoLiveCard";
import { getAuthContext, getRestaurantAccessForPage } from "@/lib/auth/context-server";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import {
  firstNameFor,
  formatHandledDuration,
  formatLocalDayTime,
} from "@/lib/overview/aggregate";
import { loadForwardingNumber } from "@/lib/overview/forwarding-number";
import { loadRestaurantOverview } from "@/lib/overview/load-overview";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { getDb } from "@/lib/db";

export const metadata: Metadata = {
  title: "Overview — ROAL",
};

const HEADLINE =
  "font-display text-[20px] font-semibold leading-snug tracking-[-0.015em] text-ink sm:text-[24px]";

export default async function RestaurantOverviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { welcome?: string };
}) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}/overview`);
    notFound();
  }

  const { restaurant, context } = access;
  const supabase = getDb();
  const profile = await ensureRestaurantProfile(supabase, restaurant.id, restaurant.organization_id);
  const showWelcome = searchParams?.welcome === "1";
  const now = new Date();

  const [overview, forwardingNumber] = await Promise.all([
    loadRestaurantOverview(supabase, {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      profile,
      now,
    }),
    showWelcome
      ? loadForwardingNumber(restaurant.id, restaurant.name, profile)
      : Promise.resolve<string | null>(null),
  ]);

  if (overview.warnings.length > 0) {
    console.error("overview load", restaurant.id, overview.warnings);
  }

  const meta = context.user.user_metadata ?? {};
  const firstName = firstNameFor({
    fullName:
      typeof meta.full_name === "string"
        ? meta.full_name
        : typeof meta.name === "string"
          ? meta.name
          : null,
    email: context.user.email ?? null,
  });
  const greeting = greetingFor(now, overview.timezone);
  const base = `/dashboard/restaurants/${restaurant.id}`;
  const { month } = overview;
  const showChecklist = overview.launch != null && !overview.launch.isLive;

  return (
    <div className="overview-page min-w-0 space-y-5 sm:space-y-6">
      {showWelcome ? (
        <WelcomeGoLiveCard
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          hostName={overview.hostName}
          forwardingNumber={forwardingNumber}
          supportEmail={CONTACT_PILOT_EMAIL}
        />
      ) : null}

      <header className="min-w-0">
        <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-subtle">
          <Clock size={14} aria-hidden />
          It&apos;s {formatLocalDayTime(now, overview.timezone)}
        </p>
      </header>

      <section aria-label="This month" className="min-w-0">
        {month.revenueCents > 0 ? (
          <p className={HEADLINE}>
            You&apos;ve made{" "}
            <span className="text-money font-bold">{formatMoney(month.revenueCents, { cents: true })}</span>{" "}
            this month
            {!month.revenueComplete ? (
              <span
                className="ml-2 inline-flex translate-y-[-2px] items-center gap-1 align-middle font-sans text-[12px] font-medium tracking-normal text-subtle"
                title="Some items didn't match your menu, so their price isn't counted."
              >
                <Info size={13} aria-hidden /> estimate
              </span>
            ) : null}
          </p>
        ) : month.ordersTaken > 0 ? (
          <p className={HEADLINE}>
            Your host took{" "}
            <span className="text-money font-bold">
              {month.ordersTaken} phone order{month.ordersTaken === 1 ? "" : "s"}
            </span>{" "}
            this month
          </p>
        ) : (
          <p className={HEADLINE}>
            {showChecklist ? "Almost there." : "Your host is ready."}{" "}
            <span className="text-subtle">Your first phone order will show up here.</span>
          </p>
        )}
      </section>

      {showChecklist && overview.launch ? <GoLiveCard launch={overview.launch} /> : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Calls answered"
          info={`Calls your host picked up since ${overview.monthLabel} 1.`}
          value={month.callsAnswered.toLocaleString("en-US")}
          hint="This month"
          icon={PhoneCall}
          color="blue"
          href={`${base}/calls`}
        />
        <StatCard
          label="Orders taken"
          info="Completed phone orders sent to your kitchen."
          value={month.ordersTaken.toLocaleString("en-US")}
          hint="This month"
          icon={ShoppingBag}
          color="green"
          href={`${base}/calls`}
        />
        <StatCard
          label="Time on the phone"
          info="Total talk time on calls your host handled this month, as reported by the phone provider."
          value={formatHandledDuration(month.handledSeconds)}
          hint="Calls your host handled"
          icon={Timer}
          color="amber"
        />
        <StatCard
          label="Upsell revenue"
          info="Add-ons your host suggested that callers accepted, priced from your menu."
          value={formatMoney(month.upsellRevenueCents, { cents: true })}
          hint={
            month.upsellRules === 0
              ? "Add upsell rules"
              : `${month.upsellAttachedOrders} order${month.upsellAttachedOrders === 1 ? "" : "s"} with an add-on`
          }
          icon={TrendingUp}
          color="orange"
          href={month.upsellRules === 0 ? `${base}/menu#restaurant-settings` : `${base}/analytics`}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Panel
          title={
            <Link href={`${base}/analytics`} className="inline-flex items-center gap-1 hover:text-accent">
              Calls <ArrowUpRight size={15} className="text-subtle" aria-hidden />
            </Link>
          }
          action={<span className="text-[12px] text-subtle">Last 14 days</span>}
        >
          <CallsChart series={overview.series} />
        </Panel>

        <RecentActivity items={overview.activity} callsHref={`${base}/calls`} now={now.getTime()} />
      </div>
    </div>
  );
}
