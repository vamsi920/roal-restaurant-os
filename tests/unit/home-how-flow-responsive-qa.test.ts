import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_HOW_FLOW } from "@/lib/landing/home-how-flow-copy";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("home how-flow responsive (prompt 09)", () => {
  it("maps beats to menu, phone line, ROAL answers, kitchen", () => {
    const [menu, line, answers] = HOME_HOW_FLOW.beats;
    expect(menu.id).toBe("share-menu");
    expect(line.id).toBe("connect-line");
    expect(answers.id).toBe("kitchen-orders");
    expect(menu.title).toMatch(/menu/i);
    expect(line.title).toMatch(/phone agent/i);
    expect(answers.title).toMatch(/live/i);
    expect(answers.body).toMatch(/kitchen/i);
  });

  it("omits tablet story chrome on phone and desktop", () => {
    const flow = read("components/landing/home/how-flow/home-how-flow.tsx");
    expect(flow).toContain("const showStoryChrome = motionOk && !mobileStory && !desktopStage");
  });
});
