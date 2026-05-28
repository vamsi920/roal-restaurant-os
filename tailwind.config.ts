import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Semantic colors map to CSS variables in app/globals.css (:root light theme).
      colors: {
        base: "rgb(var(--bg-base) / <alpha-value>)",
        elev: "rgb(var(--bg-elev) / <alpha-value>)",
        card: "rgb(var(--bg-card) / <alpha-value>)",
        line: "rgb(var(--border) / <alpha-value>)",
        "line-strong": "rgb(var(--border-strong) / <alpha-value>)",
        ink: "rgb(var(--text-primary) / <alpha-value>)",
        muted: "rgb(var(--text-secondary) / <alpha-value>)",
        subtle: "rgb(var(--text-muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        ticket: "rgb(var(--ticket) / <alpha-value>)",
        "ticket-ink": "rgb(var(--ticket-ink) / <alpha-value>)",
        heat: "rgb(var(--heat) / <alpha-value>)",
        glow: "rgb(var(--glow) / <alpha-value>)",
      },
      maxWidth: {
        "landing-readable": "var(--landing-readable-max, 42rem)",
        landing: "var(--landing-content-max, 72rem)",
      },
      transitionTimingFunction: {
        "landing-out": "var(--landing-ease-out, cubic-bezier(0.22, 1, 0.36, 1))",
        "landing-in-out": "var(--landing-ease-in-out, cubic-bezier(0.65, 0, 0.35, 1))",
        "landing-spring": "var(--landing-ease-spring, cubic-bezier(0.34, 1.45, 0.64, 1))",
        "landing-ticket": "var(--landing-ease-ticket, cubic-bezier(0.25, 0.9, 0.35, 1))",
      },
      transitionDuration: {
        "landing-instant": "var(--landing-duration-instant, 120ms)",
        "landing-fast": "var(--landing-duration-fast, 180ms)",
        landing: "var(--landing-duration, 280ms)",
        "landing-slow": "var(--landing-duration-slow, 480ms)",
        "landing-chapter": "var(--landing-duration-chapter, 640ms)",
      },
      fontFamily: {
        display: ["var(--type-display)"],
        sans: ["var(--type-body)"],
        mono: ["var(--type-mono)"],
      },
      fontSize: {
        caption: [
          "var(--text-caption-size)",
          { lineHeight: "var(--text-caption-leading)" },
        ],
        micro: ["var(--text-micro-size)", { lineHeight: "var(--text-micro-leading)" }],
        label: [
          "var(--text-label-size)",
          {
            lineHeight: "var(--text-label-leading)",
            letterSpacing: "var(--text-label-tracking)",
          },
        ],
      },
      animation: {
        "fade-in": "fade-in 240ms ease-out",
        "slide-up": "slide-up 280ms cubic-bezier(0.21, 1.02, 0.73, 1)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)" },
          "100%": { transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
