import { describe, expect, it } from "vitest";
import { CONTACT_CTA, CONTACT_PAGE_COPY } from "@/lib/landing/contact-page-copy";
import { CONTACT_PILOT_EMAIL, mailtoUsesPilotInbox } from "@/lib/landing/contact-mailto";

describe("contact CTA QA", () => {
  it("book demo mailto uses hello@getroal.com", () => {
    expect(CONTACT_CTA.bookDemo.href).toContain(CONTACT_PILOT_EMAIL);
    expect(mailtoUsesPilotInbox(CONTACT_CTA.bookDemo.href)).toBe(true);
    expect(CONTACT_PAGE_COPY.form.submitLabel).toBe("Book a demo");
    expect(CONTACT_PAGE_COPY.close.description).toContain(CONTACT_PILOT_EMAIL);
  });

  it("form anchor targets contact-form id", () => {
    expect(CONTACT_CTA.form.href).toBe("#contact-form");
  });
});
