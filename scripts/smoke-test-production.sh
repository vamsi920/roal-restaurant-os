#!/usr/bin/env bash
# Post-deploy smoke checks (no secrets required for basic health).
set -euo pipefail

BASE="${SMOKE_BASE_URL:-http://localhost:3000}"
BASE="${BASE%/}"

PASS=0
FAIL=0

check() {
  local name="$1"
  local ok="$2"
  if [[ "$ok" == "1" ]]; then
    echo "  OK   $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "Smoke tests against: $BASE"
echo ""

# --- Health ---
HEALTH_JSON="$(curl -sf "$BASE/api/health" 2>/dev/null || true)"
if [[ -n "$HEALTH_JSON" ]]; then
  STATUS="$(echo "$HEALTH_JSON" | node -e "try{const j=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(j.status||'')}catch{}" 2>/dev/null || echo "")"
  OK_HEALTH=0
  [[ "$STATUS" == "healthy" || "$STATUS" == "degraded" ]] && OK_HEALTH=1
  check "GET /api/health (status=$STATUS)" "$OK_HEALTH"

  REQ_ID="$(echo "$HEALTH_JSON" | node -e "try{const j=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(j.request_id||'')}catch{}" 2>/dev/null || echo "")"
  OK_RID=0
  [[ -n "$REQ_ID" ]] && OK_RID=1
  check "health returns request_id" "$OK_RID"
else
  check "GET /api/health" "0"
fi

# --- Public pages ---
for path in "/" "/login" "/pricing"; do
  CODE="$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path" || echo "000")"
  OK=0
  [[ "$CODE" == "200" || "$CODE" == "307" || "$CODE" == "308" ]] && OK=1
  check "GET $path ($CODE)" "$OK"
done

# --- Dashboard redirects to login when unauthenticated ---
CODE="$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE/dashboard/restaurants" || echo "000")"
OK_DASH=0
[[ "$CODE" == "200" ]] && OK_DASH=1
check "GET /dashboard/restaurants (auth gate, final $CODE)" "$OK_DASH"

echo ""
echo "Result: $PASS passed, $FAIL failed"
echo ""
echo "Manual checks (see docs/DEPLOYMENT.md §7):"
echo "  - Menu scan, Realtime, ElevenLabs connect, order finalize"
echo "  - Supabase Edge OPTIONS from /api/health checks.edge_*"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
