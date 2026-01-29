#!/usr/bin/env bash
# Устанавливает вебхук Telegram-бота на Supabase Edge Function.
# Использование:
#   TELEGRAM_BOT_TOKEN=your_token SUPABASE_URL=https://xxx.supabase.co ./scripts/set-telegram-webhook.sh
# или:
#   ./scripts/set-telegram-webhook.sh YOUR_BOT_TOKEN https://xxx.supabase.co

set -e

if [ -n "$1" ] && [ -n "$2" ]; then
  TELEGRAM_BOT_TOKEN="$1"
  SUPABASE_URL="$2"
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$SUPABASE_URL" ]; then
  echo "Usage: TELEGRAM_BOT_TOKEN=xxx SUPABASE_URL=https://PROJECT.supabase.co $0"
  echo "   or: $0 YOUR_BOT_TOKEN https://PROJECT.supabase.co"
  exit 1
fi

# Убираем trailing slash у URL
SUPABASE_URL="${SUPABASE_URL%/}"
WEBHOOK_URL="${SUPABASE_URL}/functions/v1/telegram-bot"

echo "Setting webhook to: $WEBHOOK_URL"
RESPONSE=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}")
echo "$RESPONSE" | head -1

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "Webhook set successfully. Test by sending /start to your bot in Telegram."
else
  echo "Failed to set webhook. Check token and URL."
  exit 1
fi
