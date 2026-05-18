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

FULL_COMMIT_HASH="$(git rev-parse HEAD)"
COMMIT_HASH="$(git rev-parse --short HEAD)"

echo "Publishing RN OTA: stage=$STAGE channel=$CHANNEL updateId=$UPDATE_ID commit=$COMMIT_HASH"

cat > src/rnBuildInfo.ts <<EOF
export const RN_COMMIT_HASH = "$COMMIT_HASH";
export const RN_FULL_COMMIT_HASH = "$FULL_COMMIT_HASH";
export const RN_UPDATE_ID = "$UPDATE_ID";
EOF
trap 'git checkout -- src/rnBuildInfo.ts 2>/dev/null || true' EXIT

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
mkdir -p "$OUTPUT_DIR/ios" "$OUTPUT_DIR/android"

HERMESC=""
COMPOSE_MAPS="node_modules/react-native/scripts/compose-source-maps.js"
if [ "${OTA_NO_BYTECODE:-0}" != "1" ]; then
  case "$(uname -s)" in
    Darwin) HERMESC="node_modules/hermes-compiler/hermesc/osx-bin/hermesc" ;;
    Linux)  HERMESC="node_modules/hermes-compiler/hermesc/linux64-bin/hermesc" ;;
    *)
      echo "Unsupported host OS for hermesc: $(uname -s)"
      exit 1
      ;;
  esac
  if [ ! -x "$HERMESC" ]; then
    echo "hermesc not found at $HERMESC"
    exit 1
  fi
  if [ ! -f "$COMPOSE_MAPS" ]; then
    echo "compose-source-maps.js not found at $COMPOSE_MAPS"
    exit 1
  fi
else
  echo "  (OTA_NO_BYTECODE=1) shipping plain JS, no Hermes bytecode"
fi

bundle_platform() {
  local PLATFORM="$1"
  local BUNDLE_NAME
  if [ "$PLATFORM" = "ios" ]; then
    BUNDLE_NAME="main.jsbundle"
  else
    BUNDLE_NAME="index.android.bundle"
  fi

  local PLATFORM_DIR="$OUTPUT_DIR/$PLATFORM"
  local BUNDLE_PATH="$PLATFORM_DIR/$BUNDLE_NAME"
  local MAP_PATH="$BUNDLE_PATH.map"

  echo "  bundling $PLATFORM…"
  npx react-native bundle \
    --platform "$PLATFORM" \
    --entry-file index.js \
    --bundle-output "$BUNDLE_PATH" \
    --assets-dest "$PLATFORM_DIR" \
    --dev false \
    --minify true \
    --sourcemap-output "$MAP_PATH"

  if [ -n "$HERMESC" ]; then
    echo "  Hermes-compiling $PLATFORM bundle…"
    local HBC_PATH="$BUNDLE_PATH.hbc"
    local HBC_MAP_PATH="$HBC_PATH.map"
    "$HERMESC" -emit-binary -O -output-source-map -out "$HBC_PATH" "$BUNDLE_PATH"
    mv "$HBC_PATH" "$BUNDLE_PATH"
    node "$COMPOSE_MAPS" "$MAP_PATH" "$HBC_MAP_PATH" -o "$MAP_PATH"
    rm -f "$HBC_MAP_PATH"
  fi
}

bundle_platform ios
bundle_platform android

for PLATFORM in ios android; do
  if [ "$PLATFORM" = "ios" ]; then
    RUNTIME_VERSION="$IOS_RUNTIME_VERSION"
    BUNDLE_NAME="main.jsbundle"
  else
    RUNTIME_VERSION="$ANDROID_RUNTIME_VERSION"
    BUNDLE_NAME="index.android.bundle"
  fi

  PLATFORM_DIR="$OUTPUT_DIR/$PLATFORM"
  BUNDLE_PATH="$PLATFORM_DIR/$BUNDLE_NAME"
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

  echo "  published $PLATFORM"
done

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/api/updates/manifest*"

if [ -n "${ROLLBAR_POST_SERVER_ITEM:-}" ]; then
  UPDATE_ID="$UPDATE_ID" \
  OUTPUT_DIR="$OUTPUT_DIR" \
  FULL_COMMIT_HASH="$FULL_COMMIT_HASH" \
  HOST="$HOST" \
  IOS_RUNTIME_VERSION="$IOS_RUNTIME_VERSION" \
  ANDROID_RUNTIME_VERSION="$ANDROID_RUNTIME_VERSION" \
  ./scripts/uploadRnSourcemaps.sh
else
  echo "ROLLBAR_POST_SERVER_ITEM unset — skipping RN sourcemap upload"
fi

echo "Done."
