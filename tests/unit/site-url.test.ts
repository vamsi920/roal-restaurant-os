import { afterEach, describe, expect, it, vi } from "vitest";
import {
  conversationInitAbsoluteUrl,
  ELEVENLABS_CONVERSATION_INIT_PATH,
  getSiteOrigin,
  parseUrlHost,
  resolveLocalDevOrigin,
  webhookHostMatchesAppOrigin,
} from "@/lib/site-url";

describe("site-url phone stack helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds conversation-init URL from NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tryroal.com/");
    expect(conversationInitAbsoluteUrl()).toBe(
      `https://tryroal.com${ELEVENLABS_CONVERSATION_INIT_PATH}`
    );
    expect(getSiteOrigin()).toBe("https://tryroal.com");
  });

  it("resolveLocalDevOrigin prefers QA_DEV_ORIGIN then PORT", () => {
    vi.stubEnv("PORT", "3023");
    expect(resolveLocalDevOrigin()).toBe("http://localhost:3023");

    vi.stubEnv("QA_DEV_ORIGIN", "http://127.0.0.1:3023");
    expect(resolveLocalDevOrigin()).toBe("http://127.0.0.1:3023");
  });

  it("webhookHostMatchesAppOrigin compares hostnames only", () => {
    expect(
      webhookHostMatchesAppOrigin({
        webhookUrl:
          "https://tryroal.com/api/integrations/elevenlabs/conversation-init?secret=x",
        appOrigin: "https://tryroal.com",
      }).aligned
    ).toBe(true);

    expect(
      webhookHostMatchesAppOrigin({
        webhookUrl:
          "https://old.example.com/api/integrations/elevenlabs/conversation-init",
        appOrigin: "https://tryroal.com",
      })
    ).toMatchObject({
      aligned: false,
      webhookHost: "old.example.com",
      appHost: "tryroal.com",
    });
  });

  it("parseUrlHost returns null for invalid URLs", () => {
    expect(parseUrlHost("not-a-url")).toBeNull();
    expect(parseUrlHost("https://app.test")).toBe("app.test");
  });
});
