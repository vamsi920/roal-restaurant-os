import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Dashboard ops pages responsive (prompt 38)", () => {
  it("structures onboarding, support, admin, and notification surfaces", () => {
    const css = read("app/dashboard-theme.css");

    expect(read("components/onboarding/onboarding-wizard.tsx")).toContain(
      "onboarding-page"
    );
    expect(read("components/onboarding/onboarding-wizard.tsx")).toContain(
      "min-[380px]:grid-cols-2"
    );
    expect(read("components/dashboard/support-hub.tsx")).toContain("support-hub__cards");
    expect(read("components/admin/AdminOpsDashboard.tsx")).toContain(
      "admin-ops-dashboard__restaurant-table dashboard-table"
    );
    expect(read("components/notifications/NotificationSettingsForm.tsx")).toContain(
      "notification-settings__event"
    );
    expect(read("components/notifications/NotificationDeliveryLog.tsx")).toContain(
      "notification-delivery-log__list"
    );
    expect(css).toContain("Onboarding, settings, notifications, support, admin (prompt 38)");
  });

  it("uses card tables and scrollable delivery logs on small screens", () => {
    const admin = read("components/admin/AdminOpsDashboard.tsx");
    const log = read("components/notifications/NotificationDeliveryLog.tsx");

    expect(admin).toContain('data-label="Location"');
    expect(admin).toContain("overscroll-y-contain");
    expect(log).toContain("max-h-[28rem]");
    expect(log).toContain("[overflow-wrap:anywhere]");
  });

  it("loads real data paths without fake operational rows", () => {
    const notificationsPage = read("app/dashboard/settings/notifications/page.tsx");
    const adminPage = read("app/dashboard/admin/page.tsx");

    expect(notificationsPage).toContain("notification_deliveries");
    expect(read("components/notifications/NotificationDeliveryLog.tsx")).toContain(
      "No notifications yet"
    );
    expect(adminPage).toMatch(/loadAdminOpsSnapshot|AdminOpsDashboard/);
    expect(read("components/admin/AdminOpsDashboard.tsx")).toContain(
      "No organizations in this snapshot"
    );
    expect(read("components/admin/AdminOpsDashboard.tsx")).not.toMatch(
      /fake ops|demo tenant|lorem ipsum/i
    );
  });
});
