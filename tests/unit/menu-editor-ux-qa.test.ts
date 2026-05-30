import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("menu editor UX (launch 13)", () => {
  it("MenuEditor refreshes RSC and notifies live menu after saves", () => {
    const editor = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/MenuEditor.tsx"),
      "utf8"
    );
    expect(editor).toContain("useRouter");
    expect(editor).toContain("afterMenuMutation");
    expect(editor).toContain("notifyMenuChanged");
    expect(editor).toContain('role="alert"');
    expect(editor).toContain('role="status"');
  });

  it("LiveMenuSidebar listens for menu-changed events", () => {
    const sidebar = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveMenuSidebar.tsx"),
      "utf8"
    );
    expect(sidebar).toContain("roal:menu-changed");
    expect(sidebar).toContain("syncMenuFromServer");
  });

  it("menu editor page redirects guests to login with next", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/page.tsx"),
      "utf8"
    );
    expect(page).toContain("/login?next=/dashboard/restaurants/");
  });

  it("menu actions revalidate KDS and editor routes", () => {
    const actions = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/menu-actions.ts"),
      "utf8"
    );
    const revalidate = readFileSync(
      join(REPO, "lib/voice-agent/after-menu-content-mutation.ts"),
      "utf8"
    );
    expect(actions).toContain("afterMenuContentMutation");
    expect(revalidate).toContain("/dashboard/restaurants/${restaurantId}/menu");
    expect(revalidate).toContain("revalidatePath");
  });
});
