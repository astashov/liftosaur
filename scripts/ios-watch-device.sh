#!/bin/sh
set -eu

# Builds and installs the watch app onto a physical Apple Watch.
#
#   npm run ios-watch-device            # Debug
#   CONFIGURATION=Release npm run ios-watch-device
#
# The watch has no Metro: it launches on the bundle embedded here by ios/scripts/embed-watch-bundle.sh,
# then asks <baseUrl>/api/updates/manifest for an OTA update and runs whatever it downloads. baseUrl lives
# in ios/Shared/Settings.swift and is set by `sync:updates-url`; the check below warns when it doesn't
# point at this checkout.
#
# Set WATCH_DEVICE_ID to target a specific watch; otherwise the first paired physical one is used.

CONFIGURATION="${CONFIGURATION:-Debug}"
WATCH_BUNDLE_ID="com.liftosaur.www.watchkitapp"

MAIN=$(node -p "require('./localdomain').main")
EXPECTED_HOST="https://$MAIN.liftosaur.com:$(node -p "require('./localdomain').port || 8080")"
ACTUAL_HOST=$(node -e "
const fs = require('fs');
const s = fs.readFileSync('ios/Shared/Settings.swift', 'utf8');
const debugBlock = s.slice(s.indexOf('#if DEBUG'), s.indexOf('#else'));
const m = debugBlock.match(/^(?!\s*\/\/)\s*let baseUrl = URL\(string: \"([^\"]+)\"\)!/m);
console.log(m ? m[1] : '');
")
if [ "$CONFIGURATION" = "Debug" ] && [ "$ACTUAL_HOST" != "$EXPECTED_HOST" ]; then
  echo ""
  echo "  WARNING: the watch will fetch OTA updates from ${ACTUAL_HOST:-<unset>}, not this checkout"
  echo "  ($EXPECTED_HOST). It has no Metro and runs whatever bundle it downloads, so it can"
  echo "  silently replace the bundle this build embeds with another stage's JS."
  echo ""
  echo "  Fix it by running:  LOCAL=1 npm run sync:updates-url"
  echo ""
fi

if [ -z "${WATCH_DEVICE_ID:-}" ]; then
  DEVICES_JSON="$(mktemp)"
  xcrun devicectl list devices --json-output "$DEVICES_JSON" >/dev/null 2>&1 || true
  WATCH_DEVICE_ID=$(node -e "
const fs = require('fs');
try {
  const j = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const devices = j?.result?.devices ?? [];
  const watch = devices.find(
    (d) =>
      /watch/i.test(d?.hardwareProperties?.deviceType ?? '') ||
      /Watch/.test(d?.hardwareProperties?.marketingName ?? '')
  );
  console.log(watch?.identifier ?? '');
} catch (e) {
  console.log('');
}
" "$DEVICES_JSON")
  rm -f "$DEVICES_JSON"
fi

if [ -z "$WATCH_DEVICE_ID" ]; then
  echo "error: no paired Apple Watch found. Pass WATCH_DEVICE_ID=<identifier> (see 'xcrun devicectl list devices')."
  exit 1
fi

echo "==> watch bundle ($CONFIGURATION)"
if [ "$CONFIGURATION" = "Release" ]; then
  NODE_ENV=production npm run build:watch-bundle
else
  npm run build:watch-bundle
fi

echo "==> pods"
[ -d ios/Pods ] || npm run pod-install

DERIVED="ios/build/WatchDevice$CONFIGURATION"
echo "==> building LiftosaurWatch ($CONFIGURATION) for device"
RCT_USE_PREBUILT_RNCORE=1 RCT_NEW_ARCH_ENABLED=1 USE_FRAMEWORKS=static xcodebuild \
  -workspace ios/Liftosaur.xcworkspace \
  -scheme LiftosaurWatch \
  -configuration "$CONFIGURATION" \
  -destination 'generic/platform=watchOS' \
  -derivedDataPath "$DERIVED" \
  build

APP="$DERIVED/Build/Products/$CONFIGURATION-watchos/LiftosaurWatch.app"
if [ ! -d "$APP" ]; then
  echo "error: built app not found at $APP"
  exit 1
fi

echo "==> installing onto $WATCH_DEVICE_ID"
xcrun devicectl device install app --device "$WATCH_DEVICE_ID" "$APP"
echo "==> installed. Launch it from the watch (devicectl can't launch a watchOS app)."
echo "    bundle id: $WATCH_BUNDLE_ID"
