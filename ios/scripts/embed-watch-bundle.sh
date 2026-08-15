#!/bin/bash
set -euo pipefail

SRC="$SRCROOT/../dist/watch-bundle.js"
DEST_DIR="$BUILT_PRODUCTS_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
DEST="$DEST_DIR/watch-bundle.js"

if [ ! -f "$SRC" ]; then
  echo "error: $SRC not found. Run 'npm run build:watch-bundle' (or 'npm run build:dev') before building the watch app."
  exit 1
fi

# webpack appends /* LFTEND */ to every emitted asset, so a missing tail means a truncated
# or half-written file — which QuickJS would only fail on at eval time, inside the watch app.
if ! tail -c 32 "$SRC" | grep -q "LFTEND"; then
  echo "error: $SRC looks truncated (no LFTEND marker at end of file)."
  exit 1
fi

# __HOST__ is inlined into the bundle at webpack time. A dev bundle baked into a release build
# would point the watch at a machine that only exists on the developer's LAN.
if [ "${CONFIGURATION:-}" != "Debug" ]; then
  if grep -q "local\.liftosaur\.com" "$SRC"; then
    echo "error: $SRC is a development bundle (points at local.liftosaur.com)."
    echo "Rebuild it with NODE_ENV=production before making a $CONFIGURATION build."
    exit 1
  fi
fi

mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST"
echo "embedded watch bundle: $(wc -c < "$SRC" | tr -d ' ') bytes -> $DEST"
