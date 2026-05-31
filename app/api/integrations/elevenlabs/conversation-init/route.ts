import { NextResponse } from "next/server";
import {
  buildElevenLabsConversationInitPayload,
  ELEVENLABS_CONVERSATION_INIT_SECRET_HEADER,
  isElevenLabsConversationInitAuthorized,
  parseElevenLabsConversationInitRequestBody,
  persistElevenLabsConversationStarted,
  readAgentPlaceholdersForInit,
  readElevenLabsConversationInitAgentId,
  readElevenLabsConversationInitCallerPhone,
  readElevenLabsConversationInitCalledNumber,
  readElevenLabsConversationInitSessionId,
  resolveRestaurantForElevenLabsConversationInit,
} from "@/lib/elevenlabs/conversation-init";
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

  const body = await parseElevenLabsConversationInitRequestBody(req);
  const agentId = readElevenLabsConversationInitAgentId(url, body);
  const calledNumber = readElevenLabsConversationInitCalledNumber(url, body);
  const sessionId = readElevenLabsConversationInitSessionId(url, body);
  const callerPhone = readElevenLabsConversationInitCallerPhone(url, body);

  if (!agentId && !calledNumber) {
    return NextResponse.json(
      {
        error:
          "Missing agent_id or called_number (query, JSON body, or form field — ElevenLabs Twilio POST)",
      },
      { status: 400 }
    );
  }

  try {
    const resolved = await resolveRestaurantForElevenLabsConversationInit({
      agentId,
      calledNumber,
    });

    if (!resolved) {
      console.warn("[elevenlabs/conversation-init] restaurant_not_linked", {
        agentId: agentId || null,
        calledNumber: calledNumber || null,
        hasSessionId: Boolean(sessionId?.trim()),
      });
      return NextResponse.json(
        {
          error:
            "No restaurant linked to this ElevenLabs agent or phone line. Connect a dedicated agent on Live Agent first.",
          code: "restaurant_not_linked",
        },
        { status: 404 }
      );
    }

    const effectiveAgentId = agentId || resolved.linkedAgentId;
    if (!effectiveAgentId) {
      return NextResponse.json(
        {
          error:
            "Could not resolve ElevenLabs agent (provide agent_id or a called_number linked to a provisioned location)",
        },
        { status: 400 }
      );
    }

    const agentPlaceholders = await readAgentPlaceholdersForInit(effectiveAgentId);
    const initPayload = buildElevenLabsConversationInitPayload({
      restaurantId: resolved.restaurantId,
      restaurantName: resolved.restaurantName,
      sessionId,
      agentPlaceholders,
    });
    if (sessionId) {
      await persistElevenLabsConversationStarted({
        restaurantId: resolved.restaurantId,
        linkedAgentId: effectiveAgentId,
        sessionId,
        callerPhone,
        calledNumber,
        resolvedVia: resolved.resolvedVia,
        upsellExperimentVariant:
          initPayload.dynamic_variables.upsell_experiment_variant,
      }).catch(() => null);
    }

    return NextResponse.json(initPayload);
  } catch {
    return NextResponse.json(
      { error: "Failed to build conversation initiation data" },
      { status: 500 }
    );
  }
}

/** ElevenLabs Twilio personalization webhook — supplies required dynamic variables. */
export async function GET(req: Request) {
  return handleInit(req);
}

export async function POST(req: Request) {
  return handleInit(req);
}
