#!/bin/sh
set -e

# React-Core ships as a prebuilt xcframework (RCT_USE_PREBUILT_RNCORE=1), so its
# kRCTBundleURLProviderDefaultPort is compiled upstream as 8081 and no build setting can change it.
# We write the port into the app bundle instead, and AppDelegate pins the packager host to it.
[ "${CONFIGURATION}" = "Debug" ] || exit 0

PORT=$("$SRCROOT/../scripts/metro-port.sh")

DEST="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
mkdir -p "$DEST"
echo "$PORT" > "$DEST/metro-port.txt"
echo "note: Metro port for this build is $PORT"

# A device can't reach Metro on "localhost", so AppDelegate's MetroLocation reads this machine's LAN
# address out of the bundle too (see the #else branch there). Simulator builds ignore it.
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
if [ -n "$IP" ]; then
  echo "$IP" > "$DEST/ip.txt"
  echo "note: Metro host for device builds is $IP"
else
  echo "warning: no LAN IP found (en0/en1) - a device build will not be able to reach Metro"
fi
