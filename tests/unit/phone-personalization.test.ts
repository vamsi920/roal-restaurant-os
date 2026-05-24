import { afterEach, describe, expect, it, vi } from "vitest";
import { buildConversationInitWebhookUrl } from "@/lib/elevenlabs/phone-personalization";

describe("buildConversationInitWebhookUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when no public app origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(buildConversationInitWebhookUrl()).toBeUndefined();
  });

  it("uses NEXT_PUBLIC_APP_URL and conversation-init path", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com/");
    expect(buildConversationInitWebhookUrl()).toBe(
      "https://app.example.com/api/integrations/elevenlabs/conversation-init"
    );
  });

  it("appends secret query param when provided", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const url = buildConversationInitWebhookUrl("abc123");
    expect(url).toContain(
      "/api/integrations/elevenlabs/conversation-init?secret=abc123"
    );
  });

  it("omits secret query when secret blank", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    expect(buildConversationInitWebhookUrl("   ")).toBe(
      "https://app.example.com/api/integrations/elevenlabs/conversation-init"
    );
  });
});
