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

if [[ -f firestore.rules ]]; then
  echo ""
  read -r -p "Deploy Firestore rules (npx firebase-tools deploy --only firestore:rules)? [y/N] " DEPLOY_RULES
  case "$DEPLOY_RULES" in
    [yY]|[yY][eE][sS]) npx firebase-tools deploy --only firestore:rules ;;
  esac
fi

echo ""
echo "==> Next steps (manual)"
echo "  1. Set production env vars on your host (see docs/DEPLOYMENT.md §3)"
echo "  2. Deploy to Netlify (git push) or your server"
echo "  3. Firebase console → Authentication → Settings → Authorized domains: add the production domain"
echo "  4. Run: SMOKE_BASE_URL=https://your-domain ./scripts/smoke-test-production.sh"
echo "  5. KDS → Connect / Re-sync ElevenLabs per restaurant"
