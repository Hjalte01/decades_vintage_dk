#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5173}"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]]; then kill "$DEV_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

npm run dev -- --port "$PORT" &
DEV_PID=$!

echo
echo "Local demo: http://localhost:$PORT"
echo "Waiting for the local app before opening a temporary tunnel…"

for _ in {1..30}; do
  if curl --silent --fail "http://localhost:$PORT" >/dev/null; then break; fi
  sleep 1
done

if ! command -v cloudflared >/dev/null 2>&1; then
  echo
  echo "cloudflared is not available. Open the local URL above, or run:"
  echo "  nix develop -c npm run demo"
  wait "$DEV_PID"
  exit
fi

echo
echo "The trycloudflare.com URL below is temporary. Keep this terminal open."
cloudflared tunnel --url "http://localhost:$PORT"
