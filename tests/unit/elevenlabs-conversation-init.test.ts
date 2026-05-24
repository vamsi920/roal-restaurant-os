import { describe, expect, it } from "vitest";
import {
  buildElevenLabsConversationInitPayload,
  isElevenLabsConversationInitAuthorized,
  readElevenLabsConversationInitAgentId,
} from "@/lib/elevenlabs/conversation-init";

describe("readElevenLabsConversationInitAgentId", () => {
  it("prefers query agent_id over body", () => {
    const url = new URL("http://localhost/init?agent_id=from-query");
    expect(
      readElevenLabsConversationInitAgentId(url, { agent_id: "from-body" })
    ).toBe("from-query");
  });

  it("reads agentId camelCase from query or body", () => {
    expect(
      readElevenLabsConversationInitAgentId(
        new URL("http://localhost/init?agentId=camel-query"),
        {}
      )
    ).toBe("camel-query");
    expect(
      readElevenLabsConversationInitAgentId(new URL("http://localhost/init"), {
        agentId: "camel-body",
      })
    ).toBe("camel-body");
  });
});

describe("isElevenLabsConversationInitAuthorized", () => {
  it("allows all traffic when secret unset", () => {
    expect(
      isElevenLabsConversationInitAuthorized({
        configuredSecret: undefined,
        headerSecret: null,
        querySecret: null,
      })
    ).toBe(true);
  });

  it("requires header or query when secret set", () => {
    expect(
      isElevenLabsConversationInitAuthorized({
        configuredSecret: "s",
        headerSecret: "s",
      })
    ).toBe(true);
    expect(
      isElevenLabsConversationInitAuthorized({
        configuredSecret: "s",
        querySecret: "s",
      })
    ).toBe(true);
    expect(
      isElevenLabsConversationInitAuthorized({
        configuredSecret: "s",
        headerSecret: "wrong",
      })
    ).toBe(false);
  });
});

describe("buildElevenLabsConversationInitPayload", () => {
  it("returns conversation_initiation_client_data with restaurant vars", () => {
    const payload = buildElevenLabsConversationInitPayload({
      restaurantId: "11111111-1111-1111-1111-111111111111",
      restaurantName: "QA Bistro",
    });
    expect(payload.type).toBe("conversation_initiation_client_data");
    expect(payload.dynamic_variables.restaurant_id).toBe(
      "11111111-1111-1111-1111-111111111111"
    );
    expect(payload.dynamic_variables.restaurant_name).toBe("QA Bistro");
  });

  it("falls back restaurant_name when empty", () => {
    const payload = buildElevenLabsConversationInitPayload({
      restaurantId: "11111111-1111-1111-1111-111111111111",
      restaurantName: "",
    });
    expect(payload.dynamic_variables.restaurant_name).toBe("the restaurant");
  });
});
