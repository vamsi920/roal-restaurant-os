"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Megaphone, Sparkles, UserPlus, Users } from "lucide-react";
import { PageHeader, Panel, formatWhen } from "@/components/dashboard/page-primitives";
import { StatCard } from "@/components/ui";
import { NO_TRACK_KEY } from "@/components/analytics/site-tracker";
import type { DayPoint, GrowthStats, RankRow, Totals } from "@/lib/admin/load-growth-stats";

const nf = new Intl.NumberFormat("en-US");

function delta(today: number, yesterday: number): string {
  if (today === yesterday) return "same as yesterday";
  const d = today - yesterday;
  return `${d > 0 ? "+" : ""}${nf.format(d)} vs yesterday`;
}

function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${((n / d) * 100).toFixed(n / d < 0.1 ? 1 : 0)}%`;
}

export function GrowthStatsDashboard({ stats }: { stats: GrowthStats }) {
  // Keep the owner's own browsing out of the visitor counts.
  useEffect(() => {
    try {
      window.localStorage.setItem(NO_TRACK_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const { today, yesterday, last7, last30 } = stats;

  return (
    <div className="org-page org-page--wide min-w-0 space-y-8 overflow-x-hidden">
      <PageHeader
        eyebrow="ROAL owner"
        title="Growth stats"
        lead={
          <>
            Visitors, demos, sign-ups and orders. Days are New York time. Updated {formatWhen(stats.generatedAt)}.{" "}
            <Link href="/dashboard/admin" className="org-link underline underline-offset-2">
              Tenant health
            </Link>
          </>
        }
      />

      {stats.notes.length ? (
        <ul className="space-y-1 text-[13px] text-muted">
          {stats.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      ) : null}

      <section aria-label="Today" className="space-y-3">
        <h2 className="text-[15px] font-semibold text-ink">Today</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Visitors" value={nf.format(today.visitors)} hint={delta(today.visitors, yesterday.visitors)} icon={Users} color="blue" />
          <StatCard label="Demos started" value={nf.format(today.demos)} hint={delta(today.demos, yesterday.demos)} icon={Sparkles} color="orange" />
          <StatCard label="New sign-ups" value={nf.format(today.signups)} hint={delta(today.signups, yesterday.signups)} icon={UserPlus} color="green" />
          <StatCard label="Visits from Meta ads" value={nf.format(today.adVisits)} hint={delta(today.adVisits, yesterday.adVisits)} icon={Megaphone} color="rose" />
        </div>
      </section>

      <Panel title="Last 7 and 30 days" flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="text-subtle">
              <tr>
                <th className="px-4 py-2 font-medium">Metric</th>
                <th className="px-4 py-2 text-right font-medium">Today</th>
                <th className="px-4 py-2 text-right font-medium">7 days</th>
                <th className="px-4 py-2 text-right font-medium">30 days</th>
                <th className="px-4 py-2 text-right font-medium">All time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(
                [
                  ["Visitors (unique per day)", "visitors", null],
                  ["Page views", "views", null],
                  ["Visits from Meta ads", "adVisits", null],
                  ["Demos started (/try)", "demos", null],
                  ["Demo leads (left contact)", "leads", null],
                  ["Sign-ups", "signups", stats.allTime.signups],
                  ["Restaurants created", "restaurants", stats.allTime.restaurants],
                  ["Phone calls handled", "calls", stats.allTime.calls],
                  ["Phone orders", "orders", stats.allTime.orders],
                ] as Array<[string, keyof Totals, number | null]>
              ).map(([label, k, all]) => (
                <tr key={k}>
                  <td className="px-4 py-2 text-ink">{label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{nf.format(today[k])}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{nf.format(last7[k])}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{nf.format(last30[k])}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted">{all === null ? "—" : nf.format(all)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Funnel, last 30 days" hint="How many visitors move to the next step.">
        <ol className="grid gap-3 sm:grid-cols-5">
          {(
            [
              ["Visitors", last30.visitors, null],
              ["Demos", last30.demos, last30.visitors],
              ["Leads", last30.leads, last30.demos],
              ["Sign-ups", last30.signups, last30.visitors],
              ["Restaurants", last30.restaurants, last30.signups],
            ] as Array<[string, number, number | null]>
          ).map(([label, n, of]) => (
            <li key={label} className="rounded-xl border border-line bg-card px-4 py-3">
              <div className="text-[12px] text-subtle">{label}</div>
              <div className="text-[22px] font-semibold tabular-nums text-ink">{nf.format(n)}</div>
              <div className="text-[12px] text-muted">{of === null ? "start" : `${pct(n, of)} of previous`}</div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Daily, last 30 days" hint="Bars: visitors. Orange dots: demos started. Green dots: sign-ups.">
        <DailyChart series={stats.series} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankPanel title="Where visitors come from (7 days)" rows={stats.sources} empty="No outside visits yet." />
        <RankPanel title="Top pages (7 days)" rows={stats.topPages} empty="No page views yet." mono />
        <RankPanel title="Ad campaigns (30 days, landings)" rows={stats.campaigns} empty="No campaign traffic yet." mono />
        <div className="grid gap-6 sm:grid-cols-2">
          <RankPanel title="Countries (7 days)" rows={stats.countries} empty="—" />
          <RankPanel title="Devices (7 days)" rows={stats.devices} empty="—" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Newest sign-ups" flush>
          <ListTable
            empty="No sign-ups yet."
            head={["Email", "Joined", "Last sign-in"]}
            rows={stats.recentSignups.map((u) => [u.email, formatWhen(u.createdAt), formatWhen(u.lastSignInAt)])}
          />
        </Panel>
        <Panel title="Newest demos (/try)" hint="Demo records are deleted after 7 days unless claimed." flush>
          <ListTable
            empty="No demos in the last 7 days."
            head={["Restaurant", "When", "Calls", "Claimed"]}
            rows={stats.recentDemos.map((d) => [
              d.restaurantName || d.sourceInput || "(unknown)",
              formatWhen(d.createdAt),
              String(d.callCount),
              d.claimed ? "yes" : "no",
            ])}
          />
        </Panel>
      </div>

      <Panel title="Newest restaurants" flush>
        <ListTable
          empty="No restaurants yet."
          head={["Restaurant", "Created"]}
          rows={stats.recentRestaurants.map((r) => [r.name, formatWhen(r.createdAt)])}
        />
      </Panel>

      <p className="text-[12px] text-subtle">
        Visits are counted on the public site only, with no cookies; a visitor is counted once per day. Your own
        browser is excluded after you open this page.
      </p>
    </div>
  );
}

function DailyChart({ series }: { series: DayPoint[] }) {
  const max = Math.max(1, ...series.map((p) => p.visitors), ...series.map((p) => p.demos), ...series.map((p) => p.signups));
  const H = 140;
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[600px] items-end gap-[3px]" style={{ height: H + 28 }} role="img" aria-label="Daily visitors, demos and sign-ups">
        {series.map((p) => {
          const h = (p.visitors / max) * H;
          return (
            <div key={p.day} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: H + 28 }}>
              <div className="relative w-full" style={{ height: H }}>
                <div className="absolute bottom-0 w-full rounded-t bg-[rgb(var(--tile-blue-ink)/0.35)]" style={{ height: Math.max(h, p.visitors ? 2 : 0) }} />
                {p.demos ? (
                  <span className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[rgb(var(--accent))]" style={{ bottom: (p.demos / max) * H - 4 }} />
                ) : null}
                {p.signups ? (
                  <span className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[rgb(var(--success))]" style={{ bottom: (p.signups / max) * H - 4 }} />
                ) : null}
              </div>
              <span className="mt-1 text-[10px] text-subtle">{p.day.slice(8)}</span>
              <span className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-white group-hover:block">
                {p.day}: {p.visitors} visitors · {p.demos} demos · {p.signups} sign-ups
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankPanel({ title, rows, empty, mono = false }: { title: string; rows: RankRow[]; empty: string; mono?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="relative overflow-hidden rounded-md px-2 py-1 text-[13px]">
              <span className="absolute inset-y-0 left-0 bg-[rgb(var(--accent-soft))]" style={{ width: `${(r.count / max) * 100}%` }} aria-hidden />
              <span className="relative flex justify-between gap-3">
                <span className={mono ? "truncate font-mono text-[12px]" : "truncate"}>{r.label}</span>
                <span className="tabular-nums text-ink">{nf.format(r.count)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ListTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <p className="px-4 py-3 text-[13px] text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-[13px]">
        <thead className="text-subtle">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? "max-w-[260px] truncate px-4 py-2 text-ink" : "px-4 py-2 text-muted"}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
