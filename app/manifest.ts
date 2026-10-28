import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROAL — AI phone host for restaurants",
    short_name: "ROAL",
    description: "Answers your restaurant's phone, takes pickup orders from your live menu, and sends the ticket to your kitchen.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F7F6F3",
    theme_color: "#111111",
    icons: [
      { src: "/icons/roal-app-icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/roal-apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icons/roal-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/roal-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
