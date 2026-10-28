import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Phone host page layout", () => {
  it("is header, status, test call, phone line, inbox and persona — nothing technical", () => {
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");
    expect(page).toContain("<PageHeader");
    expect(page).toContain("RESTAURANT_PHONE_HOST_LABEL");
    expect(page).toContain("<PhoneHostTestCall");
    expect(page).toContain("<PhoneNumberCard");
    expect(page).toContain("<KnowledgeSuggestionsInbox");
    expect(page).toContain("<HostPersonaCard");
    expect(page).not.toContain("<CollapsiblePanel");
    expect(page).not.toContain("kds-workspace.css");
  });

  it("reads real profile data and never fabricates status", () => {
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");
    expect(page).toContain('.from("restaurant_profiles")');
    expect(page).not.toMatch(/MOCK_|demoAgent|fakeCenter/i);
  });
});
