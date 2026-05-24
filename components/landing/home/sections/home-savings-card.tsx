import { HOME_SAVINGS } from "@/lib/landing/home-savings-copy";

export function HomeSavingsCard() {
  const { eyebrow, title, lead, rows, result, note } = HOME_SAVINGS;

  return (
    <section
      className="home-section home-section--tight home-savings"
      aria-labelledby="savings-heading"
    >
      <div className="home-wrap">
        <article className="home-savings__card home-glass-panel">
          <p className="home-eyebrow">{eyebrow}</p>
          <h2 id="savings-heading" className="home-h2 mt-2">
            {title}
          </h2>
          <p className="home-lead mt-3">{lead}</p>

          <dl className="home-savings__rows">
            {rows.map((row) => (
              <div key={row.label} className="home-savings__row">
                <dt>{row.label}</dt>
                <dd>
                  <span className="home-savings__value">{row.value}</span>
                  {row.unit ? <span className="home-savings__unit">{row.unit}</span> : null}
                </dd>
              </div>
            ))}
          </dl>

          <div className="home-savings__result" aria-label={`${result.prefix}: ${result.amount} ${result.suffix}`}>
            <p className="home-savings__result-label">{result.prefix}</p>
            <p className="home-savings__result-amount">{result.amount}</p>
            <p className="home-savings__result-suffix">{result.suffix}</p>
          </div>

          <p className="home-savings__note">{note}</p>
        </article>
      </div>
    </section>
  );
}
