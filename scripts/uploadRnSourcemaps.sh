#!/bin/bash
set -euo pipefail

OUTPUT_DIR="${OUTPUT_DIR:-dist-rn}"
ENDPOINT="https://api.rollbar.com/api/1/sourcemap"
CURL_TIMEOUT=30

if [ -z "${ROLLBAR_POST_SERVER_ITEM:-}" ]; then
  echo "ROLLBAR_POST_SERVER_ITEM is not set"
  exit 1
fi
if [ -z "${FULL_COMMIT_HASH:-}" ]; then
  echo "FULL_COMMIT_HASH is not set"
  exit 1
fi
if [ -z "${HOST:-}" ] || [ -z "${UPDATE_ID:-}" ]; then
  echo "HOST and UPDATE_ID must be set"
  exit 1
fi
if [ -z "${IOS_RUNTIME_VERSION:-}" ] || [ -z "${ANDROID_RUNTIME_VERSION:-}" ]; then
  echo "IOS_RUNTIME_VERSION and ANDROID_RUNTIME_VERSION must be set"
  exit 1
fi

shopt -s nullglob
uploaded=0
for PLATFORM in ios android; do
  if [ "$PLATFORM" = "ios" ]; then
    RUNTIME_VERSION="$IOS_RUNTIME_VERSION"
  else
    RUNTIME_VERSION="$ANDROID_RUNTIME_VERSION"
  fi
  JS_DIR="$OUTPUT_DIR/_expo/static/js/$PLATFORM"
  echo "Looking for sourcemaps in $JS_DIR"
  for mapfile in "$JS_DIR"/*.map; do
    uploaded=$((uploaded + 1))
    bundle="${mapfile%.map}"
    if [ ! -f "$bundle" ]; then
      continue
    fi
    bundle_basename="$(basename "$bundle")"
    canonical_basename="${bundle_basename%.hbc}"
    canonical_basename="${canonical_basename%.js}.js"
    minified_url="https://www.liftosaur.com/bundle/${canonical_basename}"
    echo "Uploading RN sourcemap: platform=$PLATFORM map=$(basename "$mapfile") version=$FULL_COMMIT_HASH"
    curl -m "$CURL_TIMEOUT" "$ENDPOINT" \
      -F access_token="$ROLLBAR_POST_SERVER_ITEM" \
      -F version="$FULL_COMMIT_HASH" \
      -F minified_url="$minified_url" \
      -F source_map=@"$mapfile"
    echo
  done
done
echo "Uploaded $uploaded RN sourcemap(s) to Rollbar"
