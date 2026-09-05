#!/bin/sh
set -eu

# Builds and runs the watch app on a watchOS simulator. Idempotent, and worktree-aware the same way
# scripts/worktree-ios.sh is: the base repo drives the golden pair, a worktree gets its own clones.
#
#   npm run ios-watch            # Debug
#   npm run ios-watch-release    # Release
#
# The watch has no Metro. It launches on the bundle embedded at build time by
# ios/scripts/embed-watch-bundle.sh, then asks <baseUrl>/api/updates/manifest for an OTA update and runs
# whatever it downloads - so it can silently end up on another stage's JS. baseUrl lives in
# ios/Shared/Settings.swift and is set by `sync:updates-url`; the check below warns when it doesn't point
# at this checkout.

GOLDEN_SIM="iPhone 17e RNW"
# By UDID, not by name: two installed simulators are both called "Apple Watch Series 11 (46mm)", so a
# name lookup is ambiguous.
GOLDEN_WATCH_UDID="6D3DDA86-DDC2-4D24-8908-21839A099D79"
WATCH_BUNDLE_ID="com.liftosaur.www.watchkitapp"
CONFIGURATION="${CONFIGURATION:-Debug}"

MAIN=$(node -p "require('./localdomain').main")
if [ "$MAIN" = "local" ]; then
  SIM_NAME="$GOLDEN_SIM"
  WATCH_NAME="$(xcrun simctl list devices | sed -n "s/^ *\(.*\) ($GOLDEN_WATCH_UDID).*/\1/p")"
else
  SIM_NAME="$GOLDEN_SIM $(basename "$PWD")"
  WATCH_NAME="Liftosaur Watch $(basename "$PWD")"
fi

EXPECTED_HOST="https://$MAIN.liftosaur.com:$(node -p "require('./localdomain').port || 8080")"
ACTUAL_HOST=$(node -e "
const fs = require('fs');
const s = fs.readFileSync('ios/Shared/Settings.swift', 'utf8');
const debugBlock = s.slice(s.indexOf('#if DEBUG'), s.indexOf('#else'));
const m = debugBlock.match(/^(?!\s*\/\/)\s*let baseUrl = URL\(string: \"([^\"]+)\"\)!/m);
console.log(m ? m[1] : '');
")
if [ "$ACTUAL_HOST" != "$EXPECTED_HOST" ]; then
  echo ""
  echo "  WARNING: the watch will fetch OTA updates from ${ACTUAL_HOST:-<unset>}, not this checkout"
  echo "  ($EXPECTED_HOST). It has no Metro and runs whatever bundle it downloads, so it can"
  echo "  silently replace the bundle this build embeds with another stage's JS."
  echo ""
  echo "  Fix it by running:  LOCAL=1 npm run sync:updates-url"
  echo ""
fi

echo "==> watch bundle ($CONFIGURATION)"
if [ "$CONFIGURATION" = "Release" ]; then
  NODE_ENV=production npm run build:watch-bundle
else
  npm run build:watch-bundle
fi

echo "==> pods"
[ -d ios/Pods ] || npm run pod-install

sim_udid() {
  xcrun simctl list devices | sed -n "s/^ *$1 (\([0-9A-F-]*\)).*/\1/p" | head -1
}

if [ "$MAIN" = "local" ]; then
  WATCH_UDID="$GOLDEN_WATCH_UDID"
else
  WATCH_UDID="$(sim_udid "$WATCH_NAME")"
  if [ -z "$WATCH_UDID" ]; then
    echo "==> cloning watch '$WATCH_NAME'"
    WATCH_UDID="$(xcrun simctl clone "$GOLDEN_WATCH_UDID" "$WATCH_NAME")"
  else
    echo "==> watch simulator '$WATCH_NAME' already exists"
  fi

  # Pair it to this worktree's phone so WatchConnectivity (storage sync) has somewhere to talk to.
  # simctl refuses to pair a booted device, so this runs before either is booted.
  PHONE_UDID="$(sim_udid "$SIM_NAME")"
  if [ -n "$PHONE_UDID" ] && ! xcrun simctl list pairs | grep -q "$WATCH_UDID"; then
    echo "==> pairing '$WATCH_NAME' <-> '$SIM_NAME'"
    xcrun simctl pair "$WATCH_UDID" "$PHONE_UDID" >/dev/null 2>&1 || \
      echo "    (pairing failed - the watch still runs standalone, only phone<->watch sync is affected)"
  fi
fi

if [ -z "$WATCH_UDID" ]; then
  echo "error: could not resolve a watch simulator"
  exit 1
fi

echo "==> booting watch '$WATCH_NAME' ($WATCH_UDID)"
xcrun simctl boot "$WATCH_UDID" 2>/dev/null || true
open -a Simulator

DERIVED="ios/build/WatchSim"
echo "==> building LiftosaurWatch ($CONFIGURATION)"
RCT_USE_PREBUILT_RNCORE=1 RCT_NEW_ARCH_ENABLED=1 USE_FRAMEWORKS=static xcodebuild \
  -workspace ios/Liftosaur.xcworkspace \
  -scheme LiftosaurWatch \
  -configuration "$CONFIGURATION" \
  -destination "platform=watchOS Simulator,id=$WATCH_UDID" \
  -derivedDataPath "$DERIVED" \
  build

APP="$DERIVED/Build/Products/$CONFIGURATION-watchsimulator/LiftosaurWatch.app"
if [ ! -d "$APP" ]; then
  echo "error: built app not found at $APP"
  exit 1
fi

echo "==> installing + launching"
xcrun simctl install "$WATCH_UDID" "$APP"
xcrun simctl launch "$WATCH_UDID" "$WATCH_BUNDLE_ID"
echo "==> running '$WATCH_NAME'"
