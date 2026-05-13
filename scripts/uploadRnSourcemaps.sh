#!/bin/bash
set -euo pipefail

OUTPUT_DIR="${OUTPUT_DIR:-dist-rn}"
UPDATE_ID="${UPDATE_ID:-$(git rev-parse HEAD)}"
ENDPOINT="https://api.rollbar.com/api/1/sourcemap"
CURL_TIMEOUT=30

if [ -z "${ROLLBAR_POST_SERVER_ITEM:-}" ]; then
  echo "ROLLBAR_POST_SERVER_ITEM is not set"
  exit 1
fi

shopt -s nullglob
for PLATFORM in ios android; do
  JS_DIR="$OUTPUT_DIR/_expo/static/js/$PLATFORM"
  for mapfile in "$JS_DIR"/*.map; do
    bundle="${mapfile%.map}"
    if [ ! -f "$bundle" ]; then
      continue
    fi
    bundle_basename="$(basename "$bundle")"
    version="${UPDATE_ID}-${PLATFORM}"
    minified_url="https://www.liftosaur.com/static/updates/_/${PLATFORM}/_/_expo/static/js/${PLATFORM}/${bundle_basename}"
    echo "Uploading RN sourcemap: platform=$PLATFORM map=$(basename "$mapfile") version=$version"
    curl -m "$CURL_TIMEOUT" "$ENDPOINT" \
      -F access_token="$ROLLBAR_POST_SERVER_ITEM" \
      -F version="$version" \
      -F minified_url="$minified_url" \
      -F source_map=@"$mapfile"
    echo
  done
done
