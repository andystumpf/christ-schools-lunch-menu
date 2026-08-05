#!/usr/bin/env bash
set -euo pipefail

SKILL_ID="amzn1.ask.skill.dc4a98f9-ff3f-4f16-bef6-a421364c411f"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_ROOT"

if [[ ! -f "$HOME/.ask/cli_config" ]]; then
  echo "ASK CLI is not configured yet."
  echo "Run: ask configure --no-browser"
  echo "Then paste the authorization code from the browser."
  exit 1
fi

if ! git remote get-url origin 2>/dev/null | grep -q 'codecommit'; then
  echo "Linking Alexa-hosted skill (adds Amazon CodeCommit remote)..."
  ask init --hosted-skill-id "$SKILL_ID"
fi

echo "Deploying to Alexa hosted skill (master -> development)..."
if git show-ref --verify --quiet refs/heads/master; then
  git checkout master
else
  git checkout -b master
fi

git add lambda/ skill-package/
git commit -m "Deploy Christ Schools Menu updates" || true
git push origin master

echo "Simulating: ask christ schools menu what's for lunch today"
ask smapi simulate-skill \
  --skill-id "$SKILL_ID" \
  --stage development \
  --input-content "ask christ schools menu what's for lunch today" \
  --device-locale en-US

echo "Done. Check the simulation result above."
