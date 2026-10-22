#!/usr/bin/env bash
set -euo pipefail

readonly REPOSITORY='fixtse/esp-ota'

if ! command -v gh >/dev/null 2>&1; then
  echo 'Install GitHub CLI and run gh auth login before configuring Telegram.' >&2
  exit 1
fi

gh auth status --hostname github.com >/dev/null

echo 'Enter the Telegram bot token when GitHub CLI prompts (input is hidden).'
gh secret set TELEGRAM_BOT_TOKEN --repo "$REPOSITORY"

echo 'Enter the destination Telegram chat ID when GitHub CLI prompts (input is hidden).'
gh secret set TELEGRAM_CHAT_ID --repo "$REPOSITORY"

echo 'Telegram settings saved. Edit them under repository Settings → Secrets and variables → Actions.'
