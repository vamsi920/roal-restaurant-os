import {
  BarChart3,
  ChefHat,
  ChevronDown,
  Clock,
  CreditCard,
  HelpCircle,
  LayoutGrid,
  MessageCircleQuestion,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Bot,
} from "lucide-react";
import { RoalMark } from "@/components/brand/roal-mark";

/**
 * Desktop mock of the ROAL dashboard ("command center"). Drawn in HTML + inline SVG.
 * Every name and number is illustrative sample data inside a device frame.
 */

const NAV = [
  { label: "Overview", Icon: LayoutGrid, active: true },
  { label: "Calls & Orders", Icon: PhoneCall },
  { label: "Kitchen", Icon: ChefHat },
  { label: "Menu", Icon: UtensilsCrossed },
  { label: "Phone host", Icon: Bot, badge: "New" },
  { label: "Reports", Icon: BarChart3 },
  { label: "Billing", Icon: CreditCard },
  { label: "Settings", Icon: Settings },
] as const;

const STATS = [
  { label: "Calls answered", value: "318", hint: "this month", tile: "orange", Icon: PhoneIncoming },
  { label: "Orders taken", value: "142", hint: "this month", tile: "green", Icon: ShoppingBag },
  { label: "Time on the phone handled", value: "21h 40m", hint: "staff time back", tile: "blue", Icon: Clock },
  { label: "Upsell revenue", value: "$386", hint: "from add-ons", tile: "amber", Icon: Sparkles },
] as const;

const CALLS = [9, 12, 10, 14, 18, 25, 22, 11, 13, 12, 16, 21, 28, 24];
const ORDERS = [4, 5, 4, 6, 8, 12, 10, 5, 6, 5, 7, 10, 13, 11];

const ACTIVITY = [
  { phone: "(555) 010-0142", what: "Taking a pickup order", badge: "live", time: "now", Icon: PhoneIncoming, tile: "amber" },
  { phone: "(555) 010-0177", what: "Order confirmed · Pickup #0418", amount: "$36.50", badge: "ok", time: "2m", Icon: ReceiptText, tile: "green" },
  { phone: "(555) 010-0163", what: "Asked about closing time", badge: "info", time: "6m", Icon: MessageCircleQuestion, tile: "blue" },
  { phone: "(555) 010-0108", what: "Catering request · sent to team", badge: "warn", time: "14m", Icon: PhoneForwarded, tile: "rose" },
] as const;

const BADGE_LABEL = { live: "Live", ok: "Confirmed", info: "Answered", warn: "Handoff" } as const;

function linePath(values: readonly number[], w: number, h: number, max: number) {
  const step = w / (values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
}

function CallsChart() {
  const w = 560;
  const h = 150;
  const max = 32;
  const calls = linePath(CALLS, w, h, max);
  const orders = linePath(ORDERS, w, h, max);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="cc-chart__svg" preserveAspectRatio="none" role="img" aria-label="Sample chart of calls and orders over 14 days">
      <defs>
        <linearGradient id="cc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(234 88 12)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(234 88 12)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1="0" x2={w} y1={h * t} y2={h * t} stroke="rgb(234 233 228)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={`${calls} L${w},${h} L0,${h} Z`} fill="url(#cc-area)" />
      <path d={calls} fill="none" stroke="rgb(234 88 12)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={orders} fill="none" stroke="rgb(17 17 17)" strokeWidth="1.75" strokeDasharray="4 4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function CommandCenterMock() {
  return (
    <div className="cc" aria-hidden>
      <div className="cc__chrome">
        <span className="cc__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="cc__url">getroal.com/dashboard</span>
      </div>
      <div className="cc__app">
        <aside className="cc__side">
          <div className="cc__brand">
            <RoalMark size={22} />
            ROAL
          </div>
          <nav className="cc__nav">
            {NAV.map(({ label, Icon, ...rest }) => (
              <span key={label} className="cc__nav-item" data-active={"active" in rest ? "true" : undefined}>
                <Icon className="h-4 w-4" />
                {label}
                {"badge" in rest ? <span className="badge badge--new ml-auto">{rest.badge}</span> : null}
              </span>
            ))}
          </nav>
          <div className="cc__side-foot">
            <div className="cc__promo">
              <p className="cc__promo-title">Go-live checklist</p>
              <p className="cc__promo-body">3 of 4 done. Forward your number to start taking calls.</p>
              <span className="cc__promo-bar">
                <span />
              </span>
            </div>
            <div className="cc__toggle">
              <span>
                <strong>Taking orders</strong>
                <small>Handling calls</small>
              </span>
              <span className="switch" role="switch" aria-checked="true" tabIndex={-1} />
            </div>
            <span className="cc__nav-item">
              <HelpCircle className="h-4 w-4" />
              Support
            </span>
          </div>
        </aside>

        <div className="cc__main">
          <div className="cc__header">
            <div className="min-w-0">
              <p className="cc__hello">Good evening, Maria</p>
              <p className="cc__date">Tuesday · 6:42 pm</p>
            </div>
            <span className="cc__loc">
              <span className="pulse-dot" />
              Maria&apos;s Trattoria
              <ChevronDown className="h-3.5 w-3.5 text-subtle" />
            </span>
          </div>
          <p className="cc__made">
            You&apos;ve made <span className="text-money">$4,212</span> from phone orders this month
          </p>

          <div className="cc__stats">
            {STATS.map(({ label, value, hint, tile, Icon }) => (
              <div key={label} className="stat-card">
                <span className={`icon-tile icon-tile--${tile}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="stat-card__label">{label}</span>
                <span className="stat-card__value">{value}</span>
                <span className="stat-card__hint">{hint}</span>
              </div>
            ))}
          </div>

          <div className="cc__grid">
            <div className="panel cc-chart">
              <div className="panel__head">
                <span className="panel__title">Calls</span>
                <span className="cc-chart__legend">
                  <span>
                    <i className="cc-chart__key" /> Calls
                  </span>
                  <span>
                    <i className="cc-chart__key cc-chart__key--orders" /> Orders
                  </span>
                  <span className="seg">
                    <span className="is-active">14d</span>
                    <span>30d</span>
                  </span>
                </span>
              </div>
              <div className="panel__body">
                <CallsChart />
                <div className="cc-chart__axis">
                  {["Mon", "Wed", "Fri", "Sun", "Tue", "Thu", "Sat"].map((d, i) => (
                    <span key={d + i}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel cc-activity">
              <div className="panel__head">
                <span className="panel__title">Recent activity</span>
                <span className="badge badge--live">
                  <span className="pulse-dot pulse-dot--accent" /> 1 live
                </span>
              </div>
              <div>
                {ACTIVITY.map((a) => (
                  <div key={a.phone} className="list-row">
                    <span className={`icon-tile icon-tile--${a.tile}`}>
                      <a.Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="cc-activity__phone">{a.phone}</span>
                      <span className="cc-activity__what">{a.what}</span>
                    </span>
                    <span className="cc-activity__end">
                      {"amount" in a ? <strong>{a.amount}</strong> : null}
                      <span className={`badge badge--${a.badge}`}>{BADGE_LABEL[a.badge]}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
