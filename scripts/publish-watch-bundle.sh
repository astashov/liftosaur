#!/bin/bash
set -euo pipefail

# Publishes dist/watch-bundle.js as a watchOS OTA update. Called by build-rn-bundle.sh during a
# real deploy, but also runnable on its own to push a watch-only update while testing — it does
# no Metro/Hermes work, so it takes seconds.
#
#   npm run build:watch-bundle && STAGE=dev ./scripts/publish-watch-bundle.sh
#
# STAGE=dev publishes to lftstaticdev / stage.liftosaur.com, STAGE=prod to the production bucket.
# UPDATE_ID and CREATED_AT are inherited when build-rn-bundle.sh calls this, so one deploy lands
# all three platforms under the same id.

STAGE="${STAGE:-dev}"
CHANNEL="${CHANNEL:-production}"
OUTPUT_DIR="${OUTPUT_DIR:-dist-rn}"
PLATFORM="watchos"

if [ "$STAGE" = "dev" ]; then
  BUCKET="lftstaticdev"
  HOST="stage.liftosaur.com"
else
  BUCKET="lftstatic"
  HOST="www.liftosaur.com"
fi

UPDATE_ID="${UPDATE_ID:-$(node -e 'console.log(require("crypto").randomUUID())')}"
CREATED_AT="${CREATED_AT:-$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")}"

# Xcode writes buildSettings alphabetically, so MARKETING_VERSION always precedes
# PRODUCT_BUNDLE_IDENTIFIER within the same block.
marketing_version_for() {
  awk -v bid="$1" '
    index($0, "MARKETING_VERSION = ") > 0 {
      mv = $0
      sub(/.*MARKETING_VERSION = /, "", mv)
      sub(/;.*/, "", mv)
      gsub(/[ \t]/, "", mv)
    }
    index($0, "PRODUCT_BUNDLE_IDENTIFIER = " bid ";") > 0 { print mv; exit }
  ' ios/Liftosaur.xcodeproj/project.pbxproj
}

IOS_RUNTIME_VERSION="$(marketing_version_for com.liftosaur.www)"
RUNTIME_VERSION="$(marketing_version_for com.liftosaur.www.watchkitapp)"

# The watch app asks for updates at its own CFBundleShortVersionString. If it drifts from the
# phone's, the pointer is published under a runtimeVersion nobody requests and watch OTA goes
# silently dead — the watch keeps running its embedded bundle and never reports an error.
if [ "$RUNTIME_VERSION" != "$IOS_RUNTIME_VERSION" ]; then
  echo "MARKETING_VERSION mismatch between targets:"
  echo "  Liftosaur (com.liftosaur.www):                  ${IOS_RUNTIME_VERSION:-<not found>}"
  echo "  LiftosaurWatch (com.liftosaur.www.watchkitapp): ${RUNTIME_VERSION:-<not found>}"
  echo "Set them to the same value in ios/Liftosaur.xcodeproj — watch OTA is keyed on it."
  exit 1
fi

BUNDLE_PATH="dist/watch-bundle.js"
BUNDLE_NAME="$(basename "$BUNDLE_PATH")"
if [ ! -f "$BUNDLE_PATH" ]; then
  echo "missing $BUNDLE_PATH — run 'npm run build:watch-bundle' (or build:prepare) first"
  exit 1
fi
if ! grep -q "https://$HOST" "$BUNDLE_PATH"; then
  echo "$BUNDLE_PATH was not built for $HOST — refusing to publish a bundle aimed elsewhere"
  exit 1
fi
if ! tail -c 32 "$BUNDLE_PATH" | grep -q "LFTEND"; then
  echo "$BUNDLE_PATH looks truncated (no LFTEND marker at end of file)"
  exit 1
fi

echo "Publishing watchOS OTA: stage=$STAGE channel=$CHANNEL rv=$RUNTIME_VERSION updateId=$UPDATE_ID"

mkdir -p "$OUTPUT_DIR"
BUNDLE_URL="https://$HOST/static/updates/$RUNTIME_VERSION/$PLATFORM/$UPDATE_ID/$BUNDLE_NAME"
S3_PREFIX="s3://$BUCKET/updates/$RUNTIME_VERSION/$PLATFORM/$UPDATE_ID"
METADATA_FILE="$OUTPUT_DIR/metadata-$PLATFORM.json"

TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/buildRnBundle/buildMetadata.ts \
  --platform "$PLATFORM" \
  --runtimeVersion "$RUNTIME_VERSION" \
  --updateId "$UPDATE_ID" \
  --createdAt "$CREATED_AT" \
  --bundlePath "$BUNDLE_PATH" \
  --bundleUrl "$BUNDLE_URL" \
  --outputFile "$METADATA_FILE"

aws s3 cp "$METADATA_FILE" "$S3_PREFIX/metadata.json" --content-type application/json
aws s3 cp "$BUNDLE_PATH" "$S3_PREFIX/$BUNDLE_NAME" --content-type application/javascript

POINTER_KEY="updates-pointers/$RUNTIME_VERSION/$PLATFORM/$CHANNEL.json"
POINTER_TMP="$(mktemp)"
printf '{"updateId":"%s","createdAt":"%s"}\n' "$UPDATE_ID" "$CREATED_AT" > "$POINTER_TMP"
aws s3 cp "$POINTER_TMP" "s3://$BUCKET/$POINTER_KEY" --content-type application/json
rm -f "$POINTER_TMP"

echo "  published $PLATFORM ($BUNDLE_URL)"
