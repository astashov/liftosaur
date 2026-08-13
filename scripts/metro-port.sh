#!/bin/sh
set -eu

# Prints the Metro port for this checkout. Each worktree gets its own (localdomain.js), so nothing
# here may assume 8081.

if [ -n "${RCT_METRO_PORT:-}" ]; then
  echo "$RCT_METRO_PORT"
  exit 0
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=$(sed -n 's/^[[:space:]]*metroPort:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$ROOT/localdomain.js" 2>/dev/null | head -1)
echo "${PORT:-8081}"
