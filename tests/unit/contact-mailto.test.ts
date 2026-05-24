import { describe, expect, it } from "vitest";
import {
  CONTACT_PILOT_EMAIL,
  buildContactFormMailto,
  buildPilotMailto,
  contactFormCanSubmit,
  isValidContactEmail,
  mailtoUsesPilotInbox,
} from "@/lib/landing/contact-mailto";

describe("contact-mailto", () => {
  it("uses hello@getroal.com", () => {
    expect(CONTACT_PILOT_EMAIL).toBe("hello@getroal.com");
    expect(buildPilotMailto()).toBe("mailto:hello@getroal.com");
  });

  it("encodes pilot mailto subject and body", () => {
    const href = buildPilotMailto({ subject: "ROAL — send my menu", body: "Restaurant:\n" });
    expect(mailtoUsesPilotInbox(href)).toBe(true);
    expect(href).toContain("subject=ROAL");
    expect(href).toContain("body=Restaurant");
  });

  it("builds form mailto with trimmed fields", () => {
    const href = buildContactFormMailto({
      restaurant: "  Harbor Poke ",
      email: "chef@example.com",
      rushNotes: "  busy Fri  ",
    });
    expect(mailtoUsesPilotInbox(href)).toBe(true);
    const decoded = decodeURIComponent(href.replace(/\+/g, " "));
    expect(decoded).toContain("Harbor Poke");
    expect(decoded).toContain("chef@example.com");
    expect(decoded).toContain("busy Fri");
  });

  it("validates submit prerequisites", () => {
    expect(contactFormCanSubmit({ restaurant: "", email: "a@b.co" }).ok).toBe(false);
    expect(contactFormCanSubmit({ restaurant: "X", email: "" }).ok).toBe(false);
    expect(contactFormCanSubmit({ restaurant: "X", email: "not-email" }).ok).toBe(false);
    expect(isValidContactEmail("ok@getroal.com")).toBe(true);
    expect(contactFormCanSubmit({ restaurant: "X", email: "ok@getroal.com" }).ok).toBe(true);
  });
});
