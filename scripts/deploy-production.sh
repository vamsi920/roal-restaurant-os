#!/usr/bin/env bash
# Production deploy helper — runs checks; prompts before remote changes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "ROAL production deploy helper"
echo "Full runbook: docs/DEPLOYMENT.md"
echo ""

step() {
  echo ""
  echo "==> $1"
}

step "Install dependencies"
npm ci

step "Lint"
npm run lint

step "Tests"
npm test

step "Production build"
npm run build

if command -v supabase >/dev/null 2>&1; then
  echo ""
  read -r -p "Apply Supabase migrations to linked remote? [y/N] " APPLY_DB
  case "$APPLY_DB" in
    [yY]|[yY][eE][sS]) supabase db push ;;
  esac

  echo ""
  read -r -p "Deploy Edge Functions (get-menu, sync-draft-order, finalize-order)? [y/N] " DEPLOY_EDGE
  case "$DEPLOY_EDGE" in
    [yY]|[yY][eE][sS]) bash "$ROOT/scripts/deploy-edge-functions.sh" ;;
  esac
else
  echo "skip: supabase CLI not installed — run migrations and edge deploy manually"
fi

echo ""
echo "==> Next steps (manual)"
echo "  1. Set production env vars on your host (see docs/DEPLOYMENT.md §3)"
echo "  2. Deploy .next build to Vercel/Netlify/your server"
echo "  3. Configure Supabase Auth redirect URLs"
echo "  4. Run: SMOKE_BASE_URL=https://your-domain ./scripts/smoke-test-production.sh"
echo "  5. KDS → Connect / Re-sync ElevenLabs per restaurant"
