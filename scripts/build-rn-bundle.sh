#!/bin/bash
set -euo pipefail

STAGE="${STAGE:-dev}"
CHANNEL="${CHANNEL:-production}"

if [ "${BUILD_RN_BUNDLE:-0}" != "1" ]; then
  echo "BUILD_RN_BUNDLE != 1 — skipping RN OTA publish"
  exit 0
fi

if [ "$STAGE" = "dev" ]; then
  BUCKET="lftstaticdev"
  HOST="stage.liftosaur.com"
  DISTRIBUTION_ID_VAR="CDN_DISTRIBUTION_ID_DEV"
else
  BUCKET="lftstatic"
  HOST="www.liftosaur.com"
  DISTRIBUTION_ID_VAR="CDN_DISTRIBUTION_ID_PROD"
fi
DISTRIBUTION_ID="${!DISTRIBUTION_ID_VAR:-}"
if [ -z "$DISTRIBUTION_ID" ]; then
  echo "missing $DISTRIBUTION_ID_VAR env var"
  exit 1
fi

UPDATE_ID="$(node -e 'console.log(require("crypto").randomUUID())')"
CREATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
OUTPUT_DIR="dist-rn"

echo "Publishing RN OTA: stage=$STAGE channel=$CHANNEL updateId=$UPDATE_ID"

IOS_RUNTIME_VERSION="$(grep -m1 -E 'MARKETING_VERSION = ' ios/Liftosaur.xcodeproj/project.pbxproj | sed -E 's/.*MARKETING_VERSION = ([^;]+);.*/\1/' | xargs)"
ANDROID_RUNTIME_VERSION="$(grep -m1 -E 'versionCode[[:space:]]+[0-9]+' android/app/build.gradle | grep -oE '[0-9]+')"

if [ -z "$IOS_RUNTIME_VERSION" ]; then
  echo "failed to read MARKETING_VERSION from ios/Liftosaur.xcodeproj/project.pbxproj"
  exit 1
fi
if [ -z "$ANDROID_RUNTIME_VERSION" ]; then
  echo "failed to read versionCode from android/app/build.gradle"
  exit 1
fi

echo "  iOS runtimeVersion (MARKETING_VERSION): $IOS_RUNTIME_VERSION"
echo "  Android runtimeVersion (versionCode):   $ANDROID_RUNTIME_VERSION"

rm -rf "$OUTPUT_DIR"
EXPORT_FLAGS=""
if [ "${OTA_NO_BYTECODE:-0}" = "1" ]; then
  echo "  (OTA_NO_BYTECODE=1) emitting plain JS bundle, no Hermes bytecode"
  EXPORT_FLAGS="$EXPORT_FLAGS --no-bytecode"
fi
CI=1 npx expo export --platform ios --platform android --output-dir "$OUTPUT_DIR" $EXPORT_FLAGS

for PLATFORM in ios android; do
  if [ "$PLATFORM" = "ios" ]; then
    RUNTIME_VERSION="$IOS_RUNTIME_VERSION"
  else
    RUNTIME_VERSION="$ANDROID_RUNTIME_VERSION"
  fi

  URL_PREFIX="https://$HOST/static/updates/$RUNTIME_VERSION/$PLATFORM/$UPDATE_ID"
  S3_PREFIX="s3://$BUCKET/updates/$RUNTIME_VERSION/$PLATFORM/$UPDATE_ID"
  METADATA_FILE="$OUTPUT_DIR/metadata-$PLATFORM.json"

  TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/buildRnBundle/buildMetadata.ts \
    --platform "$PLATFORM" \
    --runtimeVersion "$RUNTIME_VERSION" \
    --updateId "$UPDATE_ID" \
    --createdAt "$CREATED_AT" \
    --inputDir "$OUTPUT_DIR" \
    --urlPrefix "$URL_PREFIX" \
    --outputFile "$METADATA_FILE"

  aws s3 cp "$METADATA_FILE" "$S3_PREFIX/metadata.json" --content-type application/json
  if [ -d "$OUTPUT_DIR/_expo/static/js/$PLATFORM" ]; then
    aws s3 cp "$OUTPUT_DIR/_expo/static/js/$PLATFORM/" "$S3_PREFIX/_expo/static/js/$PLATFORM/" --recursive
  fi
  if [ -d "$OUTPUT_DIR/assets" ]; then
    aws s3 cp "$OUTPUT_DIR/assets/" "$S3_PREFIX/assets/" --recursive
  fi

  POINTER_KEY="updates-pointers/$RUNTIME_VERSION/$PLATFORM/$CHANNEL.json"
  POINTER_TMP="$(mktemp)"
  printf '{"updateId":"%s","createdAt":"%s"}\n' "$UPDATE_ID" "$CREATED_AT" > "$POINTER_TMP"
  aws s3 cp "$POINTER_TMP" "s3://$BUCKET/$POINTER_KEY" --content-type application/json
  rm -f "$POINTER_TMP"

  echo "  published $PLATFORM"
done

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/api/updates/manifest*"

if [ -n "${ROLLBAR_POST_SERVER_ITEM:-}" ]; then
  UPDATE_ID="$UPDATE_ID" OUTPUT_DIR="$OUTPUT_DIR" ./scripts/uploadRnSourcemaps.sh
else
  echo "ROLLBAR_POST_SERVER_ITEM unset — skipping RN sourcemap upload"
fi

echo "Done."
