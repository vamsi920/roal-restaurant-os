import { BookOpenText, ChefHat, Languages, PhoneForwarded, ShoppingBag, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/** Capability cards with tinted icon tiles. Mini UIs are illustrative sample data. */

type Capability = {
  id: string;
  title: string;
  body: string;
  tile: "orange" | "blue" | "green" | "amber" | "rose" | "ink";
  icon: ReactNode;
  demo: ReactNode;
};

const CAPABILITIES: Capability[] = [
  {
    id: "orders",
    title: "Takes pickup & delivery orders",
    body: "Reads from your live menu, confirms items, modifiers, name and phone, and quotes a ready time.",
    tile: "orange",
    icon: <ShoppingBag className="h-5 w-5" />,
    demo: (
      <div className="cap-demo">
        <div className="cap-demo__row">
          <span>2× Margherita</span>
          <span className="cap-demo__mono">$28.00</span>
        </div>
        <div className="cap-demo__row">
          <span>1× Tiramisu</span>
          <span className="cap-demo__mono">$8.50</span>
        </div>
        <div className="cap-demo__row cap-demo__row--total">
          <span>Pickup · 7:15 pm</span>
          <strong className="cap-demo__mono">$36.50</strong>
        </div>
      </div>
    ),
  },
  {
    id: "faq",
    title: "Answers hours, menu & FAQs",
    body: "Opening hours, parking, allergens, what's in the special. Answers come from your menu and settings, not guesses.",
    tile: "blue",
    icon: <BookOpenText className="h-5 w-5" />,
    demo: (
      <div className="cap-demo cap-demo--chat">
        <p className="cap-demo__q">Is the pesto nut-free?</p>
        <p className="cap-demo__a">It has pine nuts. The arrabbiata is nut-free.</p>
      </div>
    ),
  },
  {
    id: "language",
    title: "Speaks the caller's language",
    body: "Callers can talk in the language they're most comfortable in. The ticket still prints in yours.",
    tile: "green",
    icon: <Languages className="h-5 w-5" />,
    demo: (
      <div className="cap-demo cap-demo--chips">
        <span>Hola</span>
        <span>Bonjour</span>
        <span>你好</span>
        <span>Ciao</span>
        <span>नमस्ते</span>
        <span>Olá</span>
      </div>
    ),
  },
  {
    id: "ticket",
    title: "Sends a clean kitchen ticket",
    body: "Confirmed orders land on your kitchen screen with items, notes, and the caller's details. No scribbled notes.",
    tile: "amber",
    icon: <ChefHat className="h-5 w-5" />,
    demo: (
      <div className="cap-demo cap-demo--ticket">
        <div className="cap-demo__row">
          <strong>PICKUP #0418</strong>
          <span className="badge badge--ok">New</span>
        </div>
        <div className="cap-demo__row">
          <span>1× House salad</span>
          <span className="cap-demo__mono">— no onions</span>
        </div>
      </div>
    ),
  },
  {
    id: "handoff",
    title: "Hands tricky calls to your team",
    body: "Catering, complaints, and manager requests go to a person, with a summary of what the caller needs.",
    tile: "rose",
    icon: <PhoneForwarded className="h-5 w-5" />,
    demo: (
      <div className="cap-demo">
        <div className="cap-demo__row">
          <span className="badge badge--warn">Handoff</span>
          <span className="cap-demo__muted">Catering for 40 · Saturday</span>
        </div>
        <div className="cap-demo__row">
          <span className="cap-demo__muted">Alert sent to</span>
          <span>Front of house</span>
        </div>
      </div>
    ),
  },
  {
    id: "learns",
    title: "Learns from what it couldn't answer",
    body: "Questions it didn't know land in an inbox. Add the answer once and the next caller gets it.",
    tile: "ink",
    icon: <Sparkles className="h-5 w-5" />,
    demo: (
      <div className="cap-demo">
        <p className="cap-demo__muted">Unanswered question</p>
        <p className="cap-demo__quote">&ldquo;Do you have a gluten-free crust?&rdquo;</p>
        <span className="cap-demo__btn">Add answer</span>
      </div>
    ),
  },
];

export function Capabilities() {
  return (
    <section className="section" id="features" aria-labelledby="features-title">
      <div className="wrap">
        <div className="section-head reveal">
          <p className="pill">
            <span className="pill__dot" aria-hidden />
            What it does
          </p>
          <h2 id="features-title" className="h2 mt-5">
            <span className="tone-muted">Meet your new phone host.</span> It knows your menu by heart.
          </h2>
          <p className="lead mt-4">
            One host that picks up when your team can&apos;t, takes the order the way you would, and gets out
            of the way when a person is needed.
          </p>
        </div>

        <div className="cap-grid">
          {CAPABILITIES.map((c) => (
            <article key={c.id} className="cap-card reveal">
              <span className={`icon-tile icon-tile--lg icon-tile--${c.tile}`} aria-hidden>
                {c.icon}
              </span>
              <h3 className="cap-card__title">{c.title}</h3>
              <p className="cap-card__body">{c.body}</p>
              <div className="cap-card__demo" aria-hidden>
                {c.demo}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
