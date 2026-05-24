import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOTIFICATION_PROVIDER_POSTURE } from "@/lib/notifications/provider-posture";

const REPO = join(import.meta.dirname, "../..");

describe("notifications live posture (launch 22)", () => {
  it("documents human-only email/SMS providers", () => {
    expect(NOTIFICATION_PROVIDER_POSTURE.emailSmsHumanOnly).toMatch(
      /not wired|SendGrid|Resend|Twilio/i
    );
    expect(NOTIFICATION_PROVIDER_POSTURE.memberReadOnly).toMatch(/admin/i);
  });

  it("settings form surfaces provider posture copy", () => {
    const form = readFileSync(
      join(REPO, "components/notifications/NotificationSettingsForm.tsx"),
      "utf8"
    );
    expect(form).toContain("NOTIFICATION_PROVIDER_POSTURE");
    expect(form).toContain("canEdit");
    expect(form).toMatch(/Ask an organization admin/i);
  });

  it("save action gates non-admins", () => {
    const actions = readFileSync(
      join(
        REPO,
        "app/dashboard/settings/notifications/actions.ts"
      ),
      "utf8"
    );
    expect(actions).toContain("isOrgAdmin");
    expect(actions).toMatch(/Only organization admins can change/i);
    expect(actions).toContain("channelSecretsForSave");
  });

  it("delivery log page redacts payload and secrets for members", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/settings/notifications/page.tsx"),
      "utf8"
    );
    expect(page).toContain("deliveryRowForClient");
    expect(page).toContain("notificationSettingsForViewer");
    expect(page).not.toMatch(/select\([^)]*payload/i);
  });

  it("email and SMS providers skip instead of fake send", () => {
    const email = readFileSync(
      join(REPO, "lib/notifications/providers/email.ts"),
      "utf8"
    );
    const sms = readFileSync(
      join(REPO, "lib/notifications/providers/sms.ts"),
      "utf8"
    );
    expect(email).toMatch(/status:\s*"skipped"/);
    expect(email).toMatch(/not wired/i);
    expect(sms).toMatch(/status:\s*"skipped"/);
    expect(sms).toMatch(/not wired/i);
  });
});
