#!/bin/sh
set -eu

# On-demand native iOS run for a worktree. Idempotent: installs pods once,
# clones a dedicated simulator once, then boots + runs. Safe to re-run.
# Reads the worktree's own localdomain.js for the metro port.

GOLDEN_SIM="iPhone 17e RNW"

MAIN=$(node -p "require('./localdomain').main")
METROPORT=$(node -p "require('./localdomain').metroPort || 8081")

# Base repo (main == "local") uses the golden sim directly; worktrees get their own clone.
if [ "$MAIN" = "local" ]; then
  SIM_NAME="$GOLDEN_SIM"
else
  SIM_NAME="$GOLDEN_SIM $(basename "$PWD")"
fi

echo "==> pods"
[ -d ios/Pods ] || npm run pod-install

if [ "$SIM_NAME" != "$GOLDEN_SIM" ]; then
  if xcrun simctl list devices | grep -q "$SIM_NAME ("; then
    echo "==> simulator '$SIM_NAME' already exists"
  else
    echo "==> cloning '$GOLDEN_SIM' -> '$SIM_NAME'"
    xcrun simctl clone "$GOLDEN_SIM" "$SIM_NAME"
  fi
fi

echo "==> booting '$SIM_NAME'"
xcrun simctl boot "$SIM_NAME" 2>/dev/null || true

echo "==> run-ios (metro on $METROPORT)"
RCT_METRO_PORT="$METROPORT" IOS_SIM="$SIM_NAME" npm run ios
