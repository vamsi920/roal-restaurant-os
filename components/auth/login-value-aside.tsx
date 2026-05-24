import { LOGIN_PAGE_COPY } from "@/lib/auth/login-page-copy";

export function LoginValueAside() {
  const { entry, highlights, asideNote } = LOGIN_PAGE_COPY;

  return (
    <aside
      className="public-signup-aside public-signup-aside__card min-w-0"
      aria-labelledby="login-entry-heading"
    >
      <p className="public-eyebrow">{entry.eyebrow}</p>
      <h2 id="login-entry-heading" className="public-signup-aside__title">
        {entry.title}
      </h2>
      <p className="public-signup-aside__lead">{entry.description}</p>

      <ul className="public-login-highlights">
        {highlights.map((item) => (
          <li key={item.title} className="public-login-highlights__item">
            <h3 className="public-login-highlights__title">{item.title}</h3>
            <p className="public-login-highlights__body">{item.body}</p>
          </li>
        ))}
      </ul>

      <p className="public-signup-aside__note">{asideNote}</p>
    </aside>
  );
}
