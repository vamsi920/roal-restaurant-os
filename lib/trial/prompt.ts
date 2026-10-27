import type { ScannedMenu } from "@/lib/menu-import/types";
import {
  buildHoursPromptSection,
  evaluateRestaurantHours,
  type WeeklyHourInput,
} from "@/lib/restaurant-hours/core";
import type {
  TrialKnowledgeEntry,
  TrialPersona,
  TrialProfile,
} from "@/lib/trial/types";

function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "price not listed";
  return `$${value.toFixed(2).replace(/\.00$/, "")}`;
}

export function formatMenuForPrompt(menu: ScannedMenu, maxItems = 140): string {
  const lines: string[] = [];
  let count = 0;
  for (const cat of menu.categories) {
    lines.push(`\n### ${cat.name}`);
    for (const item of cat.items) {
      if (count >= maxItems) break;
      const mods = (item.modifiers ?? [])
        .map((m) =>
          m.extra_price
            ? `${m.modifier_name} (+${money(m.extra_price)})`
            : m.modifier_name
        )
        .slice(0, 6);
      const desc = item.description?.trim() ? ` — ${item.description.trim().slice(0, 90)}` : "";
      const availability = item.base_availability === false ? " [SOLD OUT today]" : "";
      lines.push(
        `- ${item.name}: ${money(item.price)}${desc}${mods.length ? ` · options: ${mods.join(", ")}` : ""}${availability}`
      );
      count += 1;
    }
  }
  return lines.join("\n").trim();
}

export type BuildTrialPromptInput = {
  restaurantName: string;
  profile: TrialProfile | null;
  weeklyHours: WeeklyHourInput[] | null;
  menu: ScannedMenu | null;
  menuIsSample: boolean;
  knowledge: TrialKnowledgeEntry[];
  persona: TrialPersona;
  offersDelivery?: boolean;
  now?: Date;
};

/**
 * Self-contained prompt for the shared trial agent: no tools, menu inline.
 * Mirrors the production order-taker voice but confirms orders verbally only.
 */
export function buildTrialAgentPrompt(input: BuildTrialPromptInput): string {
  const name = input.restaurantName.trim() || "the restaurant";
  const p = input.profile;
  const address = p
    ? [p.address_line1, p.city, p.region, p.postal_code].filter(Boolean).join(", ")
    : "";

  const identity = [
    `## Who you are`,
    `You are ${input.persona.agentName}, the phone host for ${name}.${p?.cuisine ? ` ${name} serves ${p.cuisine}.` : ""}${p?.tagline ? ` ${p.tagline}` : ""}`,
    address ? `Address: ${address}.` : `Address: not on file — say you will have staff confirm.`,
    p?.phone ? `Restaurant phone: ${p.phone}.` : "",
    `Service: pickup orders${input.offersDelivery ? " and delivery" : " only (no delivery on this line)"}. Typical pickup time: about 20 minutes.`,
  ]
    .filter(Boolean)
    .join("\n");

  const behavior = `## How you talk
- Sound like a friendly person behind the counter, not a script. Use contractions and everyday phrasing ("Sure thing", "Perfect", "Got it"), and vary them so you never repeat the same acknowledgment twice in a row.
- Keep most replies under 15 words. One question at a time. Never robotic recaps.
- Say prices the way people do ("five ninety-nine"). When asked what you have, name two or three favorites, never read the whole menu.
- Match the caller's mood: calm and unhurried if they are frustrated, warm and a little playful if they are cheerful. A light laugh is fine when they joke.
- Never invent menu items, prices, hours, or policies. If it is not in this prompt, say you do not have it on file and offer to have staff follow up.
- Do not narrate what you are doing in words (no "*smiles*", no "let me check that for you" filler). Your voice carries the emotion.
- Match the caller's language if they switch (Spanish, Hindi, etc.).
- This is a live demonstration for the restaurant owner. If they ask what you are, say you are ${name}'s AI phone host built by ROAL, then keep helping like a real call.

## Taking an order
1. Greet once (already done by your first line). Ask what they would like.
2. Confirm each item briefly ("Got it, one Margherita"). Offer at most one natural add-on from the menu, once.
3. Handle sold-out items honestly and suggest a real alternative from the menu.
4. When they are done: one tight recap with the total, then ask for a name and callback number in the same breath.
5. Close with the pickup time and a thank-you. Do not repeat the full order again.

## Questions you can answer
- Menu, prices, descriptions, and options listed below.
- Hours and open/closed status from the hours block below.
- Address, parking, reservations, catering, dietary, or policies ONLY from the knowledge entries below.
- If a caller wants a manager, catering for a large group, or has a complaint: say you will pass it to the team and take their name and number. You cannot transfer calls, so never say you are connecting them or putting someone on the line.`;

  const menuBlock = input.menu
    ? `## Menu${input.menuIsSample ? " (sample menu — the owner has not uploaded theirs yet; say so if asked)" : ""}\n${formatMenuForPrompt(input.menu)}`
    : `## Menu\nNo menu is loaded. Politely say the menu is being set up and offer to take a message.`;

  const knowledgeBlock =
    input.knowledge.length > 0
      ? `## Knowledge entries (operator-approved facts)\n${input.knowledge
          .map((k) => `- Q: ${k.question}\n  A: ${k.answer}`)
          .join("\n")}`
      : `## Knowledge entries\nNone yet. For parking, reservations, or policies say you do not have that on file.`;

  let hoursBlock = "## Hours\nHours are not on file yet. If asked, say you will confirm with staff, and still take the order.";
  if (input.weeklyHours && input.weeklyHours.length > 0) {
    const evaluation = evaluateRestaurantHours({
      profile: {
        timezone: p?.timezone || "America/Chicago",
        temporarily_closed: false,
        temporarily_closed_reason: null,
      },
      weekly: input.weeklyHours,
      exceptions: [],
      at: input.now,
    });
    hoursBlock = buildHoursPromptSection({
      profile: {
        timezone: p?.timezone || "America/Chicago",
        temporarily_closed: false,
        temporarily_closed_reason: null,
      },
      weekly: input.weeklyHours,
      exceptions: [],
      evaluation,
    })
      .replace(/get_menu_items operations\.ordering_allowed[^\n]*\n?/g, "")
      .replace(/Do not call sync_draft_order or finalize_order[^\n]*\n?/g, "")
      .replace(/If ordering_allowed is yes but[^\n]*\n?/g, "")
      .replace(/If both allow ordering[^\n]*\n?/g, "")
      .concat(
        "\nIf ordering is not allowed right now: say when you open next and offer to take a note. Because this is a demo, if the caller says they know you are closed and want to test an order anyway, go ahead and take it."
      );
  }

  return [identity, behavior, menuBlock, knowledgeBlock, hoursBlock].join("\n\n");
}

export function buildTrialGreeting(input: {
  restaurantName: string;
  persona: TrialPersona;
  offersDelivery?: boolean;
}): string {
  const name = input.restaurantName.trim() || "the restaurant";
  const who = input.persona.agentName;
  if (input.offersDelivery) {
    return `Hi, thanks for calling ${name}, this is ${who}. Are you picking up today, or would you like delivery?`;
  }
  return `Hi, thanks for calling ${name}, this is ${who}. What can I get started for you?`;
}
