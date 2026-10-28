"use client";

import { useId, useState } from "react";

import { GREETING_TEMPLATES } from "./greeting-data";

function fill(body: string, name: string): string {
  const cleaned = name.trim() || "[restaurant name]";
  return body.split("{name}").join(cleaned);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="tool-copy-btn"
      data-copied={copied}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function GreetingTemplates() {
  const [name, setName] = useState("");
  const id = useId();

  return (
    <div className="tool-card">
      <div className="tool-field">
        <label htmlFor={id} className="tool-field__label">
          Your restaurant name
        </label>
        <input
          id={id}
          className="tool-text-input"
          type="text"
          placeholder="e.g. Sal's Pizza"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="tool-field__hint">
          Every script below updates as you type. Fill in the parts in [brackets] before you record or post it.
        </p>
      </div>
      <div className="tool-template-list mt-6">
        {GREETING_TEMPLATES.map((t) => {
          const text = fill(t.body, name);
          return (
            <article key={t.id} className="tool-template">
              <div className="tool-template__head">
                <div className="min-w-0">
                  <p className="tool-template__kind">{t.kind}</p>
                  <h3 className="tool-template__title">{t.title}</h3>
                </div>
                <CopyButton text={text} />
              </div>
              <p className="tool-template__body">{text}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
