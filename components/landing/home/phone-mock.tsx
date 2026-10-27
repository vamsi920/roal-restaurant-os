import { ChevronDown, Clock, Menu, PhoneIncoming, ReceiptText, ShoppingBag, Sparkles } from "lucide-react";

/**
 * Hero product mock: the ROAL dashboard on a phone, flanked by four chat bubbles.
 * Drawn in HTML/CSS. Every name and number is illustrative sample data.
 */

type Bubble = { who: "caller" | "host"; text: string; slot: string };

const BUBBLES: Bubble[] = [
  { who: "caller", text: "Hi, can I order a pickup for 7?", slot: "l1" },
  { who: "host", text: "Of course. What can I get started for you?", slot: "l2" },
  { who: "caller", text: "What time do you close tonight?", slot: "r1" },
  { who: "host", text: "We're open until 10pm tonight.", slot: "r2" },
];

const STATS = [
  { label: "Calls answered", value: "318", tile: "orange", Icon: PhoneIncoming },
  { label: "Orders taken", value: "142", tile: "green", Icon: ShoppingBag },
  { label: "Phone time handled", value: "21h", tile: "blue", Icon: Clock },
  { label: "Upsell revenue", value: "$386", tile: "amber", Icon: Sparkles },
] as const;

export function PhoneStage() {
  return (
    <div className="phone-stage" aria-hidden>
      <div className="phone-stage__inner">
        {BUBBLES.map((b) => (
          <ChatBubble key={b.slot} {...b} />
        ))}
        <PhoneMock />
      </div>
    </div>
  );
}

function ChatBubble({ who, text, slot }: Bubble) {
  return (
    <div className={`chat-bubble chat-bubble--${who}`} data-slot={slot}>
      {who === "caller" ? (
        <span className="chat-bubble__avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="9" r="3.5" />
            <path d="M5.5 19.5c1.3-3 3.7-4.5 6.5-4.5s5.2 1.5 6.5 4.5" />
          </svg>
        </span>
      ) : null}
      <p className="chat-bubble__text">{text}</p>
      {who === "host" ? (
        <span className="chat-bubble__avatar chat-bubble__avatar--host">
          <span className="chat-bubble__host-dot" />
        </span>
      ) : null}
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="phone">
      <div className="phone__screen">
        <div className="phone__status">
          <span>6:42</span>
          <span className="phone__island" />
          <span className="phone__signal">
            <i />
            <i />
            <i />
            <b />
          </span>
        </div>

        <div className="phone__top">
          <span className="phone__menu">
            <Menu className="h-3.5 w-3.5" />
          </span>
          <span className="phone__loc">
            Maria&apos;s Trattoria
            <span className="badge badge--ok">Live</span>
            <ChevronDown className="h-3 w-3 text-subtle" />
          </span>
        </div>

        <div className="phone__body">
          <p className="phone__hello">Good evening, Maria</p>
          <p className="phone__made">
            You&apos;ve made <span className="text-money">$4,212</span> this month
          </p>

          <div className="phone__stats">
            {STATS.map(({ label, value, tile, Icon }) => (
              <div key={label} className="phone__stat">
                <span className={`icon-tile icon-tile--${tile} phone__stat-tile`}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="phone__stat-label">{label}</span>
                <span className="phone__stat-value">{value}</span>
              </div>
            ))}
          </div>

          <div className="phone__card">
            <div className="phone__card-row">
              <span className="badge badge--live">
                <span className="pulse-dot pulse-dot--accent" /> Live
              </span>
              <span className="phone__mono">(555) 010-0142</span>
              <span className="phone__mono ml-auto">0:48</span>
            </div>
            <p className="phone__card-title">Taking a pickup order</p>
            <div className="phone__wave">
              {Array.from({ length: 22 }).map((_, i) => (
                <i key={i} style={{ animationDelay: `${(i % 7) * 0.11}s` }} />
              ))}
            </div>
          </div>

          <div className="phone__card">
            <div className="phone__card-row">
              <span className="icon-tile icon-tile--green phone__ticket-tile">
                <ReceiptText className="h-3 w-3" />
              </span>
              <span className="phone__card-title">Pickup #0418</span>
              <span className="badge badge--ok ml-auto">Confirmed</span>
            </div>
            <p className="phone__card-sub">2× Margherita · 1× Tiramisu · ready 7:15</p>
            <p className="phone__card-total">
              <span>Sam · (555) 010-0177</span>
              <strong>$36.50</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
