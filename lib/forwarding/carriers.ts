/**
 * Call-forwarding instructions by phone type. Pure data + formatting, safe for client components.
 * Codes match the public /tools/call-forwarding-codes page.
 */

export type ForwardingMode = "backup" | "all";

export type CarrierId =
  | "landline"
  | "gsm_mobile"
  | "verizon_wireless"
  | "comcast_business"
  | "spectrum_business"
  | "ringcentral"
  | "ooma"
  | "other_voip";

export type CarrierKind = "dial" | "portal";

export type Carrier = {
  id: CarrierId;
  label: string;
  hint: string;
  kind: CarrierKind;
};

export const CARRIERS: Carrier[] = [
  { id: "landline", label: "Regular landline", hint: "Verizon, AT&T, Frontier, Lumen and most desk phones", kind: "dial" },
  { id: "gsm_mobile", label: "AT&T or T-Mobile cell", hint: "The store number rings a cell phone", kind: "dial" },
  { id: "verizon_wireless", label: "Verizon cell", hint: "The store number rings a Verizon cell phone", kind: "dial" },
  { id: "comcast_business", label: "Comcast Business", hint: "Comcast Business Voice", kind: "portal" },
  { id: "spectrum_business", label: "Spectrum Business", hint: "Spectrum Business Voice", kind: "portal" },
  { id: "ringcentral", label: "RingCentral", hint: "RingCentral app or desk phones", kind: "portal" },
  { id: "ooma", label: "Ooma Office", hint: "Ooma base station or app", kind: "portal" },
  { id: "other_voip", label: "Something else", hint: "Another internet phone service, or not sure", kind: "portal" },
];

export const FORWARDING_MODES: Array<{ id: ForwardingMode; label: string; detail: string; recommended?: boolean }> = [
  {
    id: "backup",
    label: "When we're busy or don't pick up",
    detail: "Your phone rings first. If nobody answers, or the line is busy, your host takes the call.",
    recommended: true,
  },
  {
    id: "all",
    label: "Every call",
    detail: "Your host answers every call right away. Your store phone stops ringing.",
  },
];

/** One thing to dial (or do), in order. `code` is shown big and copyable. */
export type ForwardingStep = { label: string; code?: string };

export type ForwardingInstructions = {
  carrier: Carrier;
  mode: ForwardingMode;
  steps: ForwardingStep[];
  /** How to turn it back off. */
  cancel: ForwardingStep[];
  /** Shown under the steps. */
  note: string | null;
};

/** "4175551234": what you type after a star code (US numbers, no +1). */
export function dialableDigits(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function findCarrier(id: string | null | undefined): Carrier | null {
  return CARRIERS.find((c) => c.id === id) ?? null;
}

export function forwardingInstructions(carrierId: CarrierId, mode: ForwardingMode, roalNumberE164: string): ForwardingInstructions {
  const carrier = findCarrier(carrierId) ?? CARRIERS[0];
  const n = dialableDigits(roalNumberE164);
  const pretty = n.length === 10 ? `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}` : roalNumberE164;
  const fromStorePhone = "From the store phone, dial:";

  switch (carrier.id) {
    case "landline":
      return mode === "all"
        ? {
            carrier,
            mode,
            steps: [{ label: fromStorePhone, code: `*72${n}` }],
            cancel: [{ label: "To turn it off, dial:", code: "*73" }],
            note: "Wait for someone to answer at the other end or for two short beeps, then hang up.",
          }
        : {
            carrier,
            mode,
            steps: [
              { label: "For when nobody answers, dial:", code: `*92${n}` },
              { label: "Then, for when the line is busy, dial:", code: `*90${n}` },
            ],
            cancel: [
              { label: "To turn off no-answer forwarding, dial:", code: "*93" },
              { label: "To turn off busy forwarding, dial:", code: "*91" },
            ],
            note: "Some phone companies have to switch on busy and no-answer forwarding first. If you hear an error tone, call them and ask for it, or choose Every call instead.",
          };
    case "gsm_mobile":
      return mode === "all"
        ? {
            carrier,
            mode,
            steps: [{ label: "On the store cell phone, dial and press call:", code: `**21*${n}#` }],
            cancel: [{ label: "To turn it off, dial:", code: "##21#" }],
            note: "You'll see a message on the screen saying forwarding is on.",
          }
        : {
            carrier,
            mode,
            steps: [{ label: "On the store cell phone, dial and press call:", code: `**004*${n}#` }],
            cancel: [{ label: "To turn it off, dial:", code: "##004#" }],
            note: "This covers busy, no answer, and phone switched off. You'll see a message saying it's on.",
          };
    case "verizon_wireless":
      return mode === "all"
        ? {
            carrier,
            mode,
            steps: [{ label: "On the store cell phone, dial and press call:", code: `*72${n}` }],
            cancel: [{ label: "To turn it off, dial:", code: "*73" }],
            note: "You'll hear a short confirmation, then the call ends on its own.",
          }
        : {
            carrier,
            mode,
            steps: [{ label: "On the store cell phone, dial and press call:", code: `*71${n}` }],
            cancel: [{ label: "To turn it off, dial:", code: "*73" }],
            note: "You'll hear a short confirmation, then the call ends on its own.",
          };
    case "comcast_business":
      return portal(carrier, mode, pretty, [
        "Sign in to Business VoiceEdge or the Comcast Business app.",
        "Open your store number, then Call Forwarding.",
        mode === "all" ? "Turn on Always forward." : "Turn on Forward when busy and Forward when no answer.",
      ]);
    case "spectrum_business":
      return portal(carrier, mode, pretty, [
        "Sign in to your Spectrum Business Voice account online.",
        "Go to Voice, then Call Forwarding for your store number.",
        mode === "all" ? "Choose Forward all calls." : "Choose Forward when busy and Forward when no answer.",
      ]);
    case "ringcentral":
      return portal(carrier, mode, pretty, [
        "Sign in to the RingCentral Admin Portal.",
        "Open your store number's Call Handling and Forwarding.",
        mode === "all"
          ? "Add the number below as a forwarding number and set calls to go to it right away."
          : "Add the number below as the last forwarding step, after your desk phones ring.",
      ]);
    case "ooma":
      return portal(carrier, mode, pretty, [
        "Sign in to Ooma Office Manager.",
        "Open your store number's call settings, then Call Forwarding.",
        mode === "all" ? "Forward all calls to the number below." : "Send unanswered calls to the number below.",
      ]);
    default:
      return portal(carrier, mode, pretty, [
        "Sign in to your phone service's website or app, or call their support line.",
        "Find Call Forwarding for your store number.",
        mode === "all"
          ? "Forward all calls to the number below."
          : "Forward calls when busy and when nobody answers to the number below.",
      ]);
  }
}

function portal(carrier: Carrier, mode: ForwardingMode, pretty: string, lines: string[]): ForwardingInstructions {
  return {
    carrier,
    mode,
    steps: [...lines.map((label) => ({ label })), { label: "Forward to:", code: pretty }],
    cancel: [{ label: "To turn it off, switch Call Forwarding off in the same place." }],
    note: "Stuck? Your phone company's support line can switch it on for you in a couple of minutes.",
  };
}
