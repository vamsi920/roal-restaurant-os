/**
 * Tests run during the Netlify production build, where real provider keys and site settings are in the
 * environment. Remove them before any test module loads so no test can reach live Stripe,
 * Twilio, ElevenLabs, OpenAI, Google, Clover or Firestore. Tests that need a key set a fake one.
 */
const LIVE_KEYS = [
  "FIREBASE_SERVICE_ACCOUNT",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_AGENT_ID",
  "ELEVENLABS_WEBHOOK_SECRET",
  "ELEVENLABS_CONVERSATION_INIT_SECRET",
  "OPENAI_API_KEY",
  "GOOGLE_PLACES_API_KEY",
  "CLOVER_APP_ID",
  "CLOVER_APP_SECRET",
  "CLOVER_ENVIRONMENT",
  "AGENT_TOOL_SIGNING_SECRET",
  "AGENT_TOOL_SECRET",
  "NEXT_PUBLIC_META_PIXEL_ID",
  // Site/app settings that change URLs and defaults tests assert on.
  "NEXT_PUBLIC_APP_URL",
  "ROAL_AGENT_TOOLS_BASE_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "OPENAI_MODEL",
] as const;

for (const key of LIVE_KEYS) delete process.env[key];
