import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildAgentToolRequestHeaders } from "@/lib/agent-tools/headers";
import { resolveRestaurantId } from "@/lib/agent-tools/scope";
import {
  AGENT_TOOL_TOKEN_PREFIX,
  getAgentToolSigningSecret,
  isSignedAgentToolToken,
  mintAgentToolToken,
  parseBearerToken,
  verifyAgentToolToken,
} from "@/lib/agent-tools/token";
import { RESTAURANT_ID } from "../fixtures/menu";

const SECRET = "test-signing-secret-32-chars-min!!";
const OTHER_RESTAURANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function authHeader(token: string) {
  return `Bearer ${token}`;
}

beforeEach(() => {
  process.env.AGENT_TOOL_SIGNING_SECRET = SECRET;
  delete process.env.AGENT_TOOL_SECRET;
});

afterEach(() => {
  delete process.env.AGENT_TOOL_SIGNING_SECRET;
});

describe("mintAgentToolToken / verifyAgentToolToken", () => {
  it("round-trips a signed roal1 token with agent id", () => {
    const token = mintAgentToolToken({
      restaurantId: RESTAURANT_ID,
      agentId: "agent_test_01",
    });
    expect(token.startsWith(`${AGENT_TOOL_TOKEN_PREFIX}.`)).toBe(true);

    const verified = verifyAgentToolToken(token, SECRET);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.claims.rid).toBe(RESTAURANT_ID);
      expect(verified.claims.aid).toBe("agent_test_01");
      expect(verified.claims.jti).toBeTruthy();
    }
  });

  it("rejects wrong signing secret", () => {
    const token = mintAgentToolToken({ restaurantId: RESTAURANT_ID });
    const verified = verifyAgentToolToken(token, "wrong-secret");
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.error).toBe("invalid_signature");
  });

  it("rejects expired tokens", () => {
    const token = mintAgentToolToken({
      restaurantId: RESTAURANT_ID,
      expiresInSec: -60,
    });
    const verified = verifyAgentToolToken(token, SECRET);
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.error).toBe("token_expired");
  });

  it("rejects tampered payload", () => {
    const token = mintAgentToolToken({ restaurantId: RESTAURANT_ID });
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;
    const verified = verifyAgentToolToken(tampered, SECRET);
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.error).toBe("invalid_signature");
  });

  it("rejects malformed token format", () => {
    const verified = verifyAgentToolToken("roal1.only-two-parts", SECRET);
    expect(verified.ok).toBe(false);
    if (!verified.ok) expect(verified.error).toBe("invalid_token_format");
  });
});

describe("resolveRestaurantId", () => {
  it("accepts consistent token, header, and body scope", () => {
    const id = resolveRestaurantId({
      tokenRestaurantId: RESTAURANT_ID,
      fromHeader: RESTAURANT_ID,
      fromBody: RESTAURANT_ID,
      fromQuery: null,
    });
    expect(id).toBe(RESTAURANT_ID);
  });

  it("returns null when identifiers disagree", () => {
    const id = resolveRestaurantId({
      tokenRestaurantId: RESTAURANT_ID,
      fromHeader: OTHER_RESTAURANT,
      fromBody: undefined,
      fromQuery: null,
    });
    expect(id).toBeNull();
  });

  it("uses token scope when body is omitted (baked tools)", () => {
    const id = resolveRestaurantId({
      tokenRestaurantId: RESTAURANT_ID,
      fromHeader: RESTAURANT_ID,
      fromBody: undefined,
      fromQuery: null,
    });
    expect(id).toBe(RESTAURANT_ID);
  });
});

describe("legacy vs signed bearer shape", () => {
  it("detects roal1 prefix for signed path", () => {
    const token = mintAgentToolToken({ restaurantId: RESTAURANT_ID });
    expect(token.startsWith("roal1.")).toBe(true);
    expect(isSignedAgentToolToken(token)).toBe(true);
    expect(authHeader(token).toLowerCase()).toContain("bearer roal1.");
  });
});

describe("parseBearerToken", () => {
  it("extracts bearer value case-insensitively", () => {
    expect(parseBearerToken("Bearer roal1.abc.sig")).toBe("roal1.abc.sig");
    expect(parseBearerToken("bearer token")).toBe("token");
  });

  it("returns null when header missing or malformed", () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken("Basic abc")).toBeNull();
  });
});

describe("getAgentToolSigningSecret", () => {
  it("prefers AGENT_TOOL_SIGNING_SECRET over legacy", () => {
    process.env.AGENT_TOOL_SIGNING_SECRET = "signing-only";
    process.env.AGENT_TOOL_SECRET = "legacy-only";
    expect(getAgentToolSigningSecret()).toBe("signing-only");
  });

  it("falls back to AGENT_TOOL_SECRET", () => {
    delete process.env.AGENT_TOOL_SIGNING_SECRET;
    process.env.AGENT_TOOL_SECRET = "legacy-only";
    expect(getAgentToolSigningSecret()).toBe("legacy-only");
  });
});

describe("buildAgentToolRequestHeaders", () => {
  it("mints signed bearer and baked restaurant header", () => {
    const headers = buildAgentToolRequestHeaders({
      restaurantId: RESTAURANT_ID,
      agentId: "agent_test",
      supabaseAnonKey: "anon-key",
    });
    expect(headers.apikey).toBe("anon-key");
    expect(headers["x-roal-restaurant-id"]).toBe(RESTAURANT_ID);
    expect(headers.Authorization?.startsWith("Bearer roal1.")).toBe(true);
  });

  it("uses legacy secret when signing is unavailable", () => {
    delete process.env.AGENT_TOOL_SIGNING_SECRET;
    delete process.env.AGENT_TOOL_SECRET;
    const headers = buildAgentToolRequestHeaders({
      restaurantId: RESTAURANT_ID,
      supabaseAnonKey: "anon-key",
      legacySecret: "legacy-bearer",
    });
    expect(headers.Authorization).toBe("Bearer legacy-bearer");
    expect(headers["x-roal-restaurant-id"]).toBe(RESTAURANT_ID);
  });
});

describe("resolveRestaurantId scope edge cases", () => {
  it("treats UUID casing as equivalent across token and header", () => {
    const upper = RESTAURANT_ID.toUpperCase();
    const id = resolveRestaurantId({
      tokenRestaurantId: RESTAURANT_ID,
      fromHeader: upper,
      fromBody: undefined,
      fromQuery: null,
    });
    expect(id).toBe(RESTAURANT_ID);
  });

  it("allows legacy scope from query only", () => {
    const id = resolveRestaurantId({
      fromHeader: null,
      fromBody: undefined,
      fromQuery: RESTAURANT_ID,
    });
    expect(id).toBe(RESTAURANT_ID);
  });

  it("returns null when legacy header disagrees with query", () => {
    const id = resolveRestaurantId({
      fromHeader: OTHER_RESTAURANT,
      fromBody: undefined,
      fromQuery: RESTAURANT_ID,
    });
    expect(id).toBeNull();
  });
});
