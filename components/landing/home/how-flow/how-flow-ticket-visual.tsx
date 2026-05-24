import type { KitchenTicketPreviewModel } from "@/lib/landing/build-kitchen-ticket-preview";

type Props = {
  model: KitchenTicketPreviewModel;
};

export function HowFlowTicketVisual({ model }: Props) {
  return (
    <div className="home-how-visual home-how-visual--ticket">
      <div className="home-how-ticket__head">
        <span className="home-how-ticket__status">New ticket</span>
        <span className="home-how-ticket__time">{model.updatedLabel}</span>
      </div>
      <p className="home-how-ticket__guest">
        {model.guestName ?? "Guest"} · {model.guestPhone ?? "Phone on file"}
      </p>
      <ul className="home-how-ticket__items">
        {model.items.map((item, i) => (
          <li key={`${item.name}-${i}`}>
            <span>
              {item.quantity}× {item.name}
            </span>
            {item.customizations?.length ? (
              <span className="home-how-ticket__mods">{item.customizations.join(", ")}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
