/** Homepage capability statements — no invented metrics or customer proof. */

export const HOME_CAPABILITIES = {
  eyebrow: "What guests feel",
  title: "It feels like calling the restaurant, not a robot.",
  note: "ROAL is focused on one job: answer pickup calls, understand the guest, confirm the order, and keep your team out of the phone chaos.",
  items: [
    {
      id: "answers-line",
      title: "Natural conversation",
      body: "Guests can speak normally. ROAL asks simple follow-ups for size, spice, pickup time, name, and phone.",
    },
    {
      id: "confirms-call",
      title: "Your live menu",
      body: "Items, modifiers, prices, hours, and pickup rules come from the menu you control.",
    },
    {
      id: "kitchen-ticket",
      title: "Kitchen-ready tickets",
      body: "Your team sees the confirmed order, not a voicemail or transcript to decode during service.",
    },
  ],
} as const;
