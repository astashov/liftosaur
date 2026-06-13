#!/bin/bash
# Bump the Android version, build a release AAB, and publish it to the Google
# Play internal testing track via the Gradle Play Publisher plugin.
#
# Usage:
#   ./scripts/release-android-internal.sh            # bump versionCode, build, publish
#   ./scripts/release-android-internal.sh --dry-run  # build the AAB only, skip upload
#   ./scripts/release-android-internal.sh --dry-run --no-bump  # build current version, no upload
#
# A real publish ALWAYS bumps versionCode: Play rejects duplicate versionCodes,
# and an unchanged AAB makes Gradle skip the upload (it commits an empty edit
# that "succeeds" but publishes nothing). So --no-bump is only allowed with
# --dry-run.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GRADLE="$ROOT/android/app/build.gradle"
KEY="$ROOT/lambda/scripts/liftosaur-google-service-account-key.json"

BUMP=1
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --no-bump) BUMP=0 ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

if [[ $BUMP -eq 0 && $DRY_RUN -eq 0 ]]; then
  echo "ERROR: --no-bump is only allowed with --dry-run." >&2
  echo "A real publish must bump versionCode (Play rejects duplicates, and an" >&2
  echo "unchanged AAB makes Gradle skip the upload and commit an empty edit)." >&2
  exit 1
fi

if [[ $DRY_RUN -eq 0 && ! -f "$KEY" ]]; then
  echo "ERROR: service account key not found at:" >&2
  echo "  $KEY" >&2
  echo "This is the liftosaur-android-api service account (private submodule)." >&2
  exit 1
fi

if [[ $BUMP -eq 1 ]]; then
  CURRENT=$(grep -E 'versionCode [0-9]+' "$GRADLE" | grep -oE '[0-9]+')
  NEXT=$((CURRENT + 1))
  echo "Bumping versionCode $CURRENT -> $NEXT (versionName \"$NEXT.0\")"
  sed -i '' -E "s/versionCode [0-9]+/versionCode $NEXT/" "$GRADLE"
  sed -i '' -E "s/versionName \"[0-9.]+\"/versionName \"$NEXT.0\"/" "$GRADLE"
else
  CURRENT=$(grep -E 'versionCode [0-9]+' "$GRADLE" | grep -oE '[0-9]+')
  echo "Keeping versionCode $CURRENT"
fi

cd "$ROOT/android"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "Dry run: building AAB only, skipping upload."
  ./gradlew bundleRelease
  echo "AAB: android/app/build/outputs/bundle/release/app-release.aab"
else
  echo "Building and publishing to the internal track..."
  ./gradlew publishReleaseBundle
  echo "Published to Google Play internal testing track."
fi
