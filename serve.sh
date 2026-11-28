#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
PORT="${1:-8000}"
OG_PORT="${2:-$((PORT + 1))}"
APP_PID=""
OG_PID=""

cleanup() {
  trap - EXIT INT TERM
  for pid in "$APP_PID" "$OG_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$APP_PID" "$OG_PID"; do
    if [[ -n "$pid" ]]; then
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

echo "Serving 1-Min Quiz at http://localhost:${PORT}/"
if command -v node >/dev/null 2>&1 && [[ -d node_modules/@vercel/og ]]; then
  echo "Serving OG Preview  at http://localhost:${OG_PORT}/"
  node --watch scripts/preview-og.mjs "$OG_PORT" &
  OG_PID=$!
  python3 -m http.server "$PORT" --bind :: &
  APP_PID=$!
  wait "$APP_PID"
else
  echo "Tip: install dependencies (e.g. npm install) to also launch the OG preview at http://localhost:${OG_PORT}/"
  exec python3 -m http.server "$PORT" --bind ::
fi
