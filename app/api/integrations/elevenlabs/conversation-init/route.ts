import { NextResponse } from "next/server";
import {
  buildElevenLabsConversationInitPayload,
  ELEVENLABS_CONVERSATION_INIT_SECRET_HEADER,
  isElevenLabsConversationInitAuthorized,
  lookupRestaurantForElevenLabsAgent,
  readElevenLabsConversationInitAgentId,
} from "@/lib/elevenlabs/conversation-init";
import { DEFAULT_RESTAURANT_NAME } from "@/lib/elevenlabs-placeholders";
import { getElevenLabsConversationInitSecret } from "@/lib/env.server";

export const runtime = "nodejs";

async function handleInit(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  if (
    !isElevenLabsConversationInitAuthorized({
      configuredSecret: getElevenLabsConversationInitSecret(),
      headerSecret: req.headers.get(ELEVENLABS_CONVERSATION_INIT_SECRET_HEADER),
      querySecret: url.searchParams.get("secret"),
    })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body =
    req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};
  const agentId = readElevenLabsConversationInitAgentId(url, body);
  if (!agentId) {
    return NextResponse.json(
      { error: "Missing agent_id (query or JSON body)" },
      { status: 400 }
    );
  }

  const ctx = await lookupRestaurantForElevenLabsAgent(agentId);
  return NextResponse.json(
    buildElevenLabsConversationInitPayload(
      ctx ?? {
        restaurantId: "",
        restaurantName: DEFAULT_RESTAURANT_NAME,
      }
    )
  );
}

/** ElevenLabs Twilio personalization webhook — supplies required dynamic variables. */
export async function GET(req: Request) {
  return handleInit(req);
}

export async function POST(req: Request) {
  return handleInit(req);
}
