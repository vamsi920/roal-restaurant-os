import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";

export function LoginValueAside() {
  const { entry, highlights, asideNote } = LOGIN_PAGE_COPY;

  return (
    <aside
      className="public-signup-aside public-signup-entry__aside public-login-entry__aside public-signup-aside__card min-w-0"
      aria-labelledby="login-entry-heading"
    >
      <p className="public-eyebrow">{entry.eyebrow}</p>
      <h2 id="login-entry-heading" className="public-signup-aside__title">
        {entry.title}
      </h2>
      <p className="public-signup-aside__lead">{entry.description}</p>

      <ul className="public-auth-beats" role="list">
        {highlights.map((item, index) => (
          <li key={item.title} className="public-auth-beats__item" role="listitem">
            <span className="public-auth-beats__num" aria-hidden>
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="public-auth-beats__title">{item.title}</h3>
              <p className="public-auth-beats__tag">{item.tag}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="public-signup-aside__note">{asideNote}</p>
    </aside>
  );
}
