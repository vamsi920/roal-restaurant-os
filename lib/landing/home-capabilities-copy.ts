/** Homepage capability statements — no invented metrics or customer proof. */

export const HOME_CAPABILITIES = {
  eyebrow: "What ROAL does",
  title: "Product capabilities",
  note: "Illustrative product flows—not verified customer counts, orders, or savings.",
  items: [
    {
      id: "answers-line",
      title: "Answers your line",
      body: "Pickup calls with your live menu—not a phone tree.",
    },
    {
      id: "confirms-call",
      title: "Confirms on the call",
      body: "Name, phone, and items before hang-up.",
    },
    {
      id: "kitchen-ticket",
      title: "Tickets the kitchen",
      body: "Confirmed pickup on the screen your team already uses.",
    },
  ],
} as const;
