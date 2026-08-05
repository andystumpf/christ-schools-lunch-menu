#!/usr/bin/env bash
# Run after six-viewport certification publishes to live.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APL="$ROOT/lambda/apl.js"

if grep -q 'var LIVE_MANIFEST_ALIGNED = true' "$APL"; then
  echo "LIVE_MANIFEST_ALIGNED is already true."
  exit 0
fi

sed -i '' 's/var LIVE_MANIFEST_ALIGNED = false/var LIVE_MANIFEST_ALIGNED = true/' "$APL"
echo "Set LIVE_MANIFEST_ALIGNED = true in lambda/apl.js"
echo "Run: cd lambda && node test-apl-response.js"
echo "Then deploy to prod on the Alexa hosted skill repo."
