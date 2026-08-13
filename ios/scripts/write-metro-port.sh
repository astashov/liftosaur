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
