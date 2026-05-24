import { cn } from "@/lib/cn";

type MotifVariant = "index" | "article";

export function BlogPhoneRingsSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={cn("blog-motif-svg blog-motif-svg--rings", className)}
      aria-hidden
    >
      <path
        d="M40 18c14 0 22 10 22 22"
        className="landing-beat-visual__accent-ring blog-motif-ring blog-motif-ring--1"
      />
      <path
        d="M40 26c10 0 16 7 16 14"
        className="landing-beat-visual__accent-ring blog-motif-ring blog-motif-ring--2"
      />
      <path
        d="M40 34c6 0 10 4 10 8"
        className="landing-beat-visual__accent-ring blog-motif-ring blog-motif-ring--3"
      />
      <rect
        x="30"
        y="48"
        width="20"
        height="28"
        rx="5"
        className="landing-beat-visual__fill"
      />
      <path d="M36 58h8" className="landing-beat-visual__stroke-thin" strokeLinecap="round" />
    </svg>
  );
}

export function BlogScribbleSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 48"
      className={cn("blog-motif-svg blog-motif-svg--scribble", className)}
      aria-hidden
    >
      <path
        d="M8 32c18-22 42-8 54 6s28 14 50-4"
        className="blog-motif-scribble"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M14 38c12-6 26-2 38 4"
        className="blog-motif-scribble blog-motif-scribble--light"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BlogLineArtPanelSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 100"
      className={cn("blog-motif-svg blog-motif-svg--panel", className)}
      aria-hidden
    >
      <rect
        x="8"
        y="10"
        width="124"
        height="80"
        rx="8"
        className="landing-beat-visual__fill"
      />
      <rect x="22" y="24" width="44" height="52" rx="6" className="landing-beat-visual__screen" />
      <path
        d="M78 30h42M78 42h34M78 54h38"
        className="landing-beat-visual__stroke-thin"
        strokeLinecap="round"
      />
      <rect
        x="72"
        y="62"
        width="48"
        height="20"
        rx="3"
        className="landing-beat-visual__ticket-missed"
        transform="rotate(-4 96 72)"
      />
      <circle cx="108" cy="28" r="6" className="landing-beat-visual__accent-bubble" />
    </svg>
  );
}

export function BlogTicketCornerSvg({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("blog-ticket-corner-svg", flip && "blog-ticket-corner-svg--flip", className)}
      aria-hidden
    >
      <path
        d="M2 2h14l6 6v14H2V2z"
        className="landing-beat-visual__fill"
      />
      <path d="M16 2v6h6" className="landing-beat-visual__stroke-thin" />
    </svg>
  );
}

export function BlogMotifLayer({
  variant,
  glass,
}: {
  variant: MotifVariant;
  glass?: boolean;
}) {
  return (
    <div
      className={cn("blog-motifs", `blog-motifs--${variant}`, glass && "blog-motifs--glass")}
      aria-hidden
    >
      <div className="blog-motif blog-motif--rings">
        <BlogPhoneRingsSvg />
      </div>
      <div className="blog-motif blog-motif--scribble">
        <BlogScribbleSvg />
      </div>
      {variant === "index" ? (
        <div className="blog-motif blog-motif--panel">
          <BlogLineArtPanelSvg />
        </div>
      ) : null}
      <div className="blog-motif blog-motif--corner-tl">
        <BlogTicketCornerSvg />
      </div>
      <div className="blog-motif blog-motif--corner-br">
        <BlogTicketCornerSvg flip />
      </div>
    </div>
  );
}
