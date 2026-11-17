#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
PORT="${1:-8000}"

echo "Serving 1-Min Quiz at http://localhost:${PORT}/"
exec python3 -m http.server "$PORT" --bind ::
