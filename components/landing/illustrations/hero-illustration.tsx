import { cn } from "@/lib/cn";

type Props = {
  className?: string;
};

export function HeroIllustration({ className }: Props) {
  return (
    <figure
      className={cn(
        "hero-illustration mx-auto w-full max-w-[min(100%,17.5rem)] sm:max-w-md",
        className
      )}
    >
      <figcaption className="sr-only">
        Decorative illustration: a phone call is answered by ROAL and becomes a kitchen order
        ticket.
      </figcaption>
      <svg
        viewBox="0 0 420 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hero-illustration__svg"
        aria-hidden
        focusable="false"
      >
        <rect
          x="12"
          y="12"
          width="396"
          height="356"
          rx="28"
          className="hero-illustration__panel"
        />

        <g className="hero-illustration__phone">
          <path
            d="M88 88c0-22 18-40 40-40h0"
            className="hero-illustration__ring hero-illustration__ring--1"
          />
          <path
            d="M78 78c0-32 26-58 58-58"
            className="hero-illustration__ring hero-illustration__ring--2"
          />
          <path
            d="M68 68c0-42 34-76 76-76"
            className="hero-illustration__ring hero-illustration__ring--3"
          />
          <rect x="48" y="128" width="88" height="148" rx="16" className="hero-illustration__stroke-fill" />
          <rect x="58" y="142" width="68" height="108" rx="8" className="hero-illustration__screen" />
          <circle cx="92" cy="262" r="6" className="hero-illustration__stroke" />
          <path d="M72 168h40M72 184h28" className="hero-illustration__stroke-thin" strokeLinecap="round" />
        </g>

        <g className="hero-illustration__agent">
          <path
            d="M200 118c-36 0-66 28-66 62 0 20 10 38 26 50l-8 42 44-22c6 2 12 3 20 3 36 0 66-28 66-62s-30-62-66-62z"
            className="hero-illustration__bubble"
          />
          <circle cx="200" cy="168" r="44" className="hero-illustration__stroke-fill" />
          <circle cx="186" cy="162" r="4" className="hero-illustration__ink-dot" />
          <circle cx="214" cy="162" r="4" className="hero-illustration__ink-dot" />
          <path
            d="M182 182c8 10 28 10 36 0"
            className="hero-illustration__stroke"
            strokeLinecap="round"
          />
          <g className="hero-illustration__cheek-dot hero-illustration__cheek-dot--1">
            <circle cx="176" cy="176" r="5" className="hero-illustration__accent-dot" />
          </g>
          <g className="hero-illustration__cheek-dot hero-illustration__cheek-dot--2">
            <circle cx="224" cy="176" r="5" className="hero-illustration__accent-dot" />
          </g>
          <path
            d="M168 148c-6-10-2-22 10-26"
            className="hero-illustration__stroke-thin"
            strokeLinecap="round"
          />
          <path
            d="M232 148c6-10 2-22-10-26"
            className="hero-illustration__stroke-thin"
            strokeLinecap="round"
          />
          <path
            d="M168 248c0-28 22-50 50-50h4c28 0 50 22 50 50v52c0 8-6 14-14 14h-76c-8 0-14-6-14-14v-52z"
            className="hero-illustration__bag"
          />
          <path
            d="M178 214c12-18 32-18 44 0M222 214c12-18 32-18 44 0"
            className="hero-illustration__stroke"
            strokeLinecap="round"
          />
          <path d="M196 268h48" className="hero-illustration__accent-bar" strokeLinecap="round" />
        </g>

        <path
          d="M136 210c40 8 88 4 120-28"
          className="hero-illustration__flow"
          strokeLinecap="round"
        />

        <g className="hero-illustration__flow-dot hero-illustration__flow-dot--1">
          <circle cx="168" cy="202" r="5" className="hero-illustration__accent-dot" />
        </g>
        <g className="hero-illustration__flow-dot hero-illustration__flow-dot--2">
          <circle cx="210" cy="188" r="5" className="hero-illustration__accent-dot" />
        </g>
        <g className="hero-illustration__flow-dot hero-illustration__flow-dot--3">
          <circle cx="248" cy="168" r="5" className="hero-illustration__accent-dot" />
        </g>

        <g className="hero-illustration__ticket-group">
          <path
            d="M268 118h108c10 0 18 8 18 18v168c0 10-8 18-18 18h-108c-10 0-18-8-18-18v-168c0-10 8-18 18-18z"
            className="hero-illustration__ticket"
          />
          <path
            d="M250 148h132M250 168h100M250 188h108M250 208h88"
            className="hero-illustration__stroke-thin"
          />
          <rect x="318" y="128" width="52" height="26" rx="13" className="hero-illustration__accent-pill" />
          <text x="344" y="146" textAnchor="middle" className="hero-illustration__label" aria-hidden>
            NEW
          </text>
          <path
            d="M358 118l18 18-18 18"
            className="hero-illustration__stroke-thin"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </figure>
  );
}
