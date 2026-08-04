#!/usr/bin/env bash
set -euo pipefail

SKILL_ID="amzn1.ask.skill.8d9936d5-800e-48fd-9a2c-6c5e318348cb"
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

echo "Deploying lambda code to Alexa development stage..."
if git show-ref --verify --quiet refs/heads/master; then
  git checkout master
else
  git checkout -b master
fi

git add lambda/index.js lambda/package.json
git commit -m "Fix calendar fetch for Christ Lincoln Schools lunch menu" || true
git push origin master

echo "Simulating: ask c l s menu what's for lunch today"
ask smapi simulate-skill \
  --skill-id "$SKILL_ID" \
  --stage development \
  --input-content "ask c l s menu what's for lunch today" \
  --device-locale en-US

echo "Done. Check the simulation result above."
