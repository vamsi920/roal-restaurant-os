import type { MenuScanPreviewModel } from "@/lib/landing/build-menu-scan-preview";

type Props = {
  model: MenuScanPreviewModel;
};

export function HowFlowScanVisual({ model }: Props) {
  return (
    <div className="home-how-visual home-how-visual--scan">
      <p className="home-how-visual__meta">{model.photo.label}</p>
      <ul className="home-how-scan__list">
        {model.extractions.map((row) => (
          <li key={row.id}>
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
