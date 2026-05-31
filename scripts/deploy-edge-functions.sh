#!/usr/bin/env bash
# Deploy ROAL Supabase Edge Functions (ElevenLabs server tools).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not found. Install: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

echo "==> Checking Supabase project link"
if ! supabase projects list >/dev/null 2>&1; then
  echo "error: run 'supabase login' first" >&2
  exit 1
fi

echo "==> Reminder: set Edge secrets to match Next.js (same project):"
echo "    supabase secrets set AGENT_TOOL_SIGNING_SECRET='...'"
echo "    # optional: AGENT_TOOL_SECRET='...'"
echo ""

FUNCTIONS=(get-menu sync-draft-order finalize-order get-order-status get-caller-history submit-reservation-request get-restaurant-info)

for fn in "${FUNCTIONS[@]}"; do
  echo "==> Deploying $fn"
  supabase functions deploy "$fn" --no-verify-jwt
done

echo ""
echo "Done. Edge base: https://<project-ref>.supabase.co/functions/v1/"
echo "Next: redeploy Next.js, then Re-sync each restaurant on the KDS."
