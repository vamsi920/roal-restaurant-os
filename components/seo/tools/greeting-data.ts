/** Copy-ready restaurant phone scripts (shared by the server page and the client copier). */

export type Template = { id: string; kind: string; title: string; body: string };

/** `{name}` is replaced with the restaurant name the owner types. */
export const GREETING_TEMPLATES: Template[] = [
  {
    id: "standard",
    kind: "Greeting",
    title: "Standard open-hours greeting",
    body: "Thanks for calling {name}, this is the front counter. Are you calling to place an order for pickup or delivery?",
  },
  {
    id: "warm",
    kind: "Greeting",
    title: "Warm neighborhood greeting",
    body: "Hi, thanks for calling {name}! What can we get started for you today?",
  },
  {
    id: "specials",
    kind: "Greeting",
    title: "Greeting with today's special",
    body: "Thanks for calling {name}. Today's special is [special] for [price]. Would you like to start an order?",
  },
  {
    id: "busy-hold",
    kind: "Busy night",
    title: "Busy night, short hold",
    body: "Thanks for calling {name}. We're in the middle of a busy rush, so please hold for just a moment and we'll be right with you.",
  },
  {
    id: "busy-wait",
    kind: "Busy night",
    title: "Busy night, set wait times",
    body: "Thanks for calling {name}. Tonight pickup orders are running about [time] minutes and delivery about [time] minutes. What can we get for you?",
  },
  {
    id: "busy-callback",
    kind: "Busy night",
    title: "Busy night, offer a call back",
    body: "Thanks for calling {name}. All of our team is helping guests right now. Leave your name and number and we'll call you back within [time] minutes.",
  },
  {
    id: "after-hours",
    kind: "After hours",
    title: "Closed for the night",
    body: "Thanks for calling {name}. We're closed right now. Our hours are [days] from [open] to [close]. We'd love to cook for you next time.",
  },
  {
    id: "after-hours-online",
    kind: "After hours",
    title: "Closed, point to the website",
    body: "You've reached {name}. We're closed at the moment. You can see our full menu and hours at [website]. Thanks for calling, and see you soon.",
  },
  {
    id: "after-hours-message",
    kind: "After hours",
    title: "Closed, take a message",
    body: "Thanks for calling {name}. We're closed right now. For catering or large orders, leave your name, number and the date you need, and we'll call you back when we open.",
  },
  {
    id: "holiday-closed",
    kind: "Holiday",
    title: "Holiday closure",
    body: "Thanks for calling {name}. We're closed on [holiday] so our team can spend the day with family. We'll be back on [date] at [open]. Happy holidays!",
  },
  {
    id: "holiday-hours",
    kind: "Holiday",
    title: "Holiday hours",
    body: "Thanks for calling {name}. For [holiday] we're open from [open] to [close]. Pre-orders for the holiday close on [date], so call early to save your spot.",
  },
  {
    id: "seasonal-closure",
    kind: "Holiday",
    title: "Vacation or renovation closure",
    body: "Thanks for calling {name}. We're closed from [start date] through [end date] for [reason]. We reopen on [date] and can't wait to see you.",
  },
];
