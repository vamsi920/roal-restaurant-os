import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONTACT_PILOT_EMAIL,
  mailtoUsesPilotInbox,
} from "@/lib/landing/contact-mailto";
import { DEMO_CTA, DEMO_MAILTO_EMAIL } from "@/lib/landing/demo-page-copy";

const DEMO_CTA_BAND = join(
  process.cwd(),
  "components/landing/demo/demo-cta-band.tsx"
);

function mailtoSubject(href: string): string | null {
  const query = href.includes("?") ? href.slice(href.indexOf("?")) : "";
  return new URL(`http://x${query}`).searchParams.get("subject");
}

describe("demo CTA QA", () => {
  it("bottom band lists mailto demo call before signup", () => {
    const source = readFileSync(DEMO_CTA_BAND, "utf8");

    const actionsIdx = source.indexOf("actions={[");
    expect(actionsIdx).toBeGreaterThan(-1);
    const actionsBlock = source.slice(actionsIdx, actionsIdx + 400);

    const mailtoIdx = actionsBlock.indexOf("bookDemoCall");
    const signupIdx = actionsBlock.indexOf("signup");
    expect(mailtoIdx).toBeGreaterThan(-1);
    expect(signupIdx).toBeGreaterThan(-1);
    expect(mailtoIdx).toBeLessThan(signupIdx);

    expect(actionsBlock.indexOf('variant: "primary"')).toBeLessThan(
      actionsBlock.indexOf('variant: "ghost"')
    );
  });

  it("book demo call mailto uses hello@getroal.com with correct labels", () => {
    expect(DEMO_MAILTO_EMAIL).toBe(CONTACT_PILOT_EMAIL);
    expect(DEMO_MAILTO_EMAIL).toBe("hello@getroal.com");

    const { bookDemoCall, signup } = DEMO_CTA;

    expect(bookDemoCall.label).toBe("Book a demo call");
    expect(mailtoUsesPilotInbox(bookDemoCall.href)).toBe(true);
    expect(bookDemoCall.href.startsWith("mailto:hello@getroal.com")).toBe(true);
    expect(mailtoSubject(bookDemoCall.href)).toBe("Book a ROAL demo call");

    expect(signup.label).toBe("Sign up");
    expect(signup.href).toBe("/signup?next=/dashboard/restaurants");
  });

  it("footer exposes pilot inbox linked to the same mailto href", () => {
    const source = readFileSync(DEMO_CTA_BAND, "utf8");
    expect(source).toContain("DEMO_MAILTO_EMAIL");
    expect(source).toContain("href={bookDemoCall.href}");
  });
});
