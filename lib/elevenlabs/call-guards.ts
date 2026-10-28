/**
 * Spend and safety caps for every phone host (restaurant lines and the demo line).
 *
 * Voice minutes are nearly all of ROAL's cost per order, so calls must never run on by
 * accident: silent lines, pocket dials, voicemail, hold music, robocalls. The platform caps
 * below are the hard stop; the prompt section tells the host how to get there politely.
 */

/** Hard ceiling on one call. Real orders take 1–3 minutes. */
export const MAX_CALL_SECONDS = 480;

/** Caller silence before the host checks in ("Are you still there?"); repeats once. */
export const SILENCE_CHECK_IN_SECONDS = 8;

/**
 * Seconds since the caller last spoke before the platform ends the call. Leaves room for two
 * check-ins (~8s and ~16s) and a short "hold on" before hanging up.
 */
export const SILENCE_HANG_UP_SECONDS = 30;

export const CALL_GUARD_TURN = {
  turn_timeout: SILENCE_CHECK_IN_SECONDS,
  silence_end_call_timeout: SILENCE_HANG_UP_SECONDS,
} as const;

export const CALL_GUARD_CONVERSATION = {
  max_duration_seconds: MAX_CALL_SECONDS,
} as const;

const MAX_CALL_MINUTES = MAX_CALL_SECONDS / 60;

export const CALL_LENGTH_PROMPT_SECTION = `## Call length, silence, and ending calls
- Every second on the line costs the restaurant. Keep replies to one short sentence (under 15 words) unless the caller asks for detail.
- While they order, acknowledge each item in two or three words ("Got it.", "Sure thing."). Repeat an item back only when size, spice, or options were unclear.
- Read the full order back exactly once, at the end, with the total. Never read it again unless they ask.
- Silence: if the caller goes quiet, check in once ("Are you still there?"). If still quiet, try once more ("I can't hear you—are you there?"). After two unanswered check-ins, say "I'll let you go—feel free to call back anytime. Bye!" and use end_call.
- If they ask you to hold ("one sec", "hold on"), say "Sure, take your time." and wait quietly. Check in once if the pause runs long.
- Bad audio: ask them to repeat at most twice. Then suggest calling back from a quieter spot and use end_call.
- Answering machine, voicemail greeting, hold music, an automated phone menu, fax tones, or a recorded message: do not take an order; end the call (voicemail_detection when available, otherwise end_call).
- Sales pitches, robocalls, surveys, or vendors: "Thanks, but we're not interested on this line. Bye!" then end_call.
- Rude or abusive callers: one calm warning; end_call if it continues.
- Caller says bye, thanks, or "that's all": one short goodbye and end_call—no recap.
- After a confirmed order: one closing line with the pickup time, then end_call once they say bye or go quiet.
- Calls are capped at ${MAX_CALL_MINUTES} minutes. If an order is still going after about ${MAX_CALL_MINUTES - 2} minutes, move to the recap and contact details.

## Not ordering? (hours, directions, "are you open?")
- Answer the question in one sentence from your data.
- Then ask once, kindly: "Were you looking to place an order, or just checking?"
- If they want to order, go straight into the order. If they are just checking or say no: "No problem—thanks for calling, have a great day!" and use end_call.
- Never push an order on someone who said no. Aim to finish these calls in under 20 seconds.`;
