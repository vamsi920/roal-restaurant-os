import type { MenuScanPreviewModel } from "@/lib/landing/build-menu-scan-preview";

type Props = {
  model: MenuScanPreviewModel;
};

const THUMB_CLASS_BY_ROW_ID: Record<string, string> = {
  i1: "home-how-scan__thumb--margherita",
  i2: "home-how-scan__thumb--pepperoni",
  i3: "home-how-scan__thumb--knots",
  i4: "home-how-scan__thumb--lemonade",
  i5: "home-how-scan__thumb--lemonade",
};

export function HowFlowScanVisual({ model }: Props) {
  return (
    <div className="home-how-visual home-how-visual--scan">
      <div className="home-how-scan__media" aria-hidden>
        <span className="home-how-scan__photo home-how-scan__photo--margherita" />
        <span className="home-how-scan__photo home-how-scan__photo--pepperoni" />
        <span className="home-how-scan__photo home-how-scan__photo--knots" />
        <span className="home-how-scan__photo home-how-scan__photo--lemonade" />
      </div>
      <p className="home-how-visual__meta">{model.photo.label}</p>
      <ul className="home-how-scan__list">
        {model.extractions.map((row) => (
          <li key={row.id}>
            <span
              className={`home-how-scan__thumb ${
                THUMB_CLASS_BY_ROW_ID[row.id] ?? "home-how-scan__thumb--margherita"
              }`}
              aria-hidden
            />
            <span className="home-how-scan__name">{row.name}</span>
            <span className="home-how-scan__price">{row.priceLabel}</span>
          </li>
        ))}
      </ul>
      <p className="home-how-visual__foot">
        Sample scan · {model.stats.items} items · {model.stats.categories} categories (demo menu)
      </p>
    </div>
  );
}
