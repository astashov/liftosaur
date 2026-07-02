#!/bin/sh
set -eu

# Tear down a dev worktree: kill its servers, remove DNS records, delete its
# dedicated simulator (if created), and remove the worktree. Certs are kept
# (reusable, and certbot rate-limits re-issue).

NAME="${1:-}"
if [ -z "$NAME" ]; then
  echo "Usage: scripts/worktree-remove.sh <name>"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/worktrees/$NAME"

if [ ! -d "$DIR" ]; then
  echo "$DIR does not exist"
  exit 1
fi

SIM_NAME="iPhone 17e RNW $NAME"

echo "==> killing servers bound to this worktree's ports"
for key in port apiPort streamingApiPort metroPort; do
  p=$(node -p "require('$DIR/localdomain').$key || ''" 2>/dev/null || echo "")
  if [ -n "$p" ]; then
    pids=$(lsof -ti "tcp:$p" 2>/dev/null || true)
    [ -n "$pids" ] && echo "  port $p -> kill $pids" && kill $pids 2>/dev/null || true
  fi
done

echo "==> removing DNS records"
( cd "$DIR" && sh lambda/scripts/delete_liftosaur_dev_api.sh )

if xcrun simctl list devices | grep -q "$SIM_NAME ("; then
  echo "==> deleting simulator '$SIM_NAME'"
  xcrun simctl shutdown "$SIM_NAME" 2>/dev/null || true
  xcrun simctl delete "$SIM_NAME"
else
  echo "==> no dedicated simulator to delete"
fi

echo "==> git worktree remove"
cd "$ROOT"
git worktree remove "worktrees/$NAME" --force
git branch -D "$NAME" 2>/dev/null || true

echo "Removed worktree '$NAME'."
