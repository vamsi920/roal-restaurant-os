import { cn } from "@/lib/cn";

export function RoalMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4 text-accent", className)}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="roal-mark-bg" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff7ff" />
          <stop offset="0.46" stopColor="#bda4ff" />
          <stop offset="1" stopColor="#17111f" />
        </linearGradient>
        <linearGradient id="roal-mark-accent" x1="7" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff3b8" />
          <stop offset="0.45" stopColor="#d7ff74" />
          <stop offset="1" stopColor="#8f72ff" />
        </linearGradient>
      </defs>
      <rect x="2.25" y="2.25" width="19.5" height="19.5" rx="6.25" fill="url(#roal-mark-bg)" />
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.75" stroke="white" strokeOpacity="0.55" />
      <path
        d="M7.15 8.55c1.1-1.08 2.52-1.62 4.25-1.62 1.6 0 2.92.48 3.96 1.43 1.05.95 1.57 2.18 1.57 3.68 0 1.57-.5 2.84-1.5 3.82-1 .98-2.34 1.47-4.02 1.47h-.74l-2.53 1.6.35-2.35c-.85-.55-1.5-1.25-1.95-2.1-.45-.85-.68-1.78-.68-2.8 0-1.2.33-2.24 1-3.13h.29z"
        fill="#15101d"
      />
      <path
        d="M9.05 9.72c.65-.64 1.5-.97 2.55-.97.92 0 1.68.26 2.28.79.6.52.93 1.22 1 2.08.07.94-.18 1.7-.75 2.3-.58.6-1.35.9-2.32.9h-1.72l.2-1.45h1.45c.45 0 .82-.13 1.09-.39.27-.26.38-.6.34-1.02-.03-.4-.18-.7-.45-.93-.27-.22-.62-.34-1.04-.34-.47 0-.84.14-1.12.43-.28.29-.4.68-.36 1.17l-1.5.02c-.07-1.03.04-1.9.35-2.59z"
        fill="url(#roal-mark-accent)"
      />
      <path d="M17.1 15.25l1.32 1.32m0-1.32-1.32 1.32" stroke="#d7ff74" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
