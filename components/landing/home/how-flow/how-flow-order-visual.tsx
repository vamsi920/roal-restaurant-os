import type { TranscriptLine } from "@/lib/landing/agent-conversation-demo";
import type { KitchenTicketPreviewModel } from "@/lib/landing/build-kitchen-ticket-preview";
import { HowFlowCallVisual } from "./how-flow-call-visual";

type Props = {
  lines: TranscriptLine[];
  ticket: KitchenTicketPreviewModel;
};

export function HowFlowOrderVisual({ lines, ticket }: Props) {
  return (
    <div className="home-how-visual home-how-visual--order">
      <HowFlowCallVisual lines={lines} />
      <div className="home-how-order__cart" aria-label="Order building on the call">
        <p className="home-how-order__cart-label">On the ticket</p>
        <ul className="home-how-order__items">
          {ticket.items.map((item, i) => (
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
    </div>
  );
}
