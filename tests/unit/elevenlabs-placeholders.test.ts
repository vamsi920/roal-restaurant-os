import { describe, expect, it } from "vitest";
import {
  firstMessageHasUnresolvedTemplates,
  readAgentFirstMessage,
} from "@/lib/elevenlabs-placeholders";

describe("firstMessageHasUnresolvedTemplates", () => {
  it("detects mustache in first_message", () => {
    expect(
      firstMessageHasUnresolvedTemplates("Hi, thanks for calling {{restaurant_name}}.")
    ).toBe(true);
    expect(
      firstMessageHasUnresolvedTemplates("Hi, thanks for calling Joe's.")
    ).toBe(false);
  });
});

describe("readAgentFirstMessage", () => {
  it("reads nested conversation_config.agent.first_message", () => {
    const msg = readAgentFirstMessage({
      conversation_config: {
        agent: { first_message: "Hello from ROAL" },
      },
    });
    expect(msg).toBe("Hello from ROAL");
  });
});
