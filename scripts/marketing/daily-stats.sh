#!/bin/sh
# Runs the daily stats against production Firestore. The service account is read
# from Netlify at run time and never written to disk.
set -e
cd "$(dirname "$0")/../.."
FIREBASE_SERVICE_ACCOUNT="$(npx -y netlify-cli env:get FIREBASE_SERVICE_ACCOUNT 2>/dev/null)"
export FIREBASE_SERVICE_ACCOUNT
exec npx tsx --env-file=.env.local scripts/marketing/daily-stats.ts "$@"
