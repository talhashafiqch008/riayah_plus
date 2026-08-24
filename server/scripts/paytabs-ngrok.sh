#!/usr/bin/env bash
# Expose local API over HTTPS so PayTabs can POST payment webhooks (IPN).
# Usage: from server/ → ./scripts/paytabs-ngrok.sh
# Requires: ngrok installed (https://ngrok.com) and API running on PORT (default 5001).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
PORT="${PORT:-5001}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  line="$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | tail -1 || true)"
  if [[ -n "$line" ]]; then
    PORT="${line#PORT=}"
  fi
fi

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok not found. Install: https://ngrok.com/download"
  exit 1
fi

echo "Starting ngrok → http://localhost:${PORT}"
echo ""
echo "After ngrok starts:"
echo "  1. Copy the https://….ngrok-free.app URL from the ngrok UI or terminal"
echo "  2. Set in server/.env:"
echo "       BACKEND_URL=https://YOUR-SUBDOMAIN.ngrok-free.app"
echo "  3. Restart the API (pnpm dev)"
echo "  4. Family → Billing → Pay Now (callback will be sent to PayTabs)"
echo ""
echo "Webhook endpoint PayTabs will call:"
echo "  https://YOUR-SUBDOMAIN.ngrok-free.app/api/wallet/paytabs/webhook"
echo ""
echo "Press Ctrl+C to stop ngrok."
echo "---"

exec ngrok http "$PORT"
