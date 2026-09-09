#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GRADLE="$ROOT/android/app/build.gradle"
KEY="$ROOT/lambda/scripts/liftosaur-google-service-account-key.json"
NOTES_DIR="$ROOT/android/app/src/main/play/release-notes/en-US"
NOTES_FILE="$NOTES_DIR/production.txt"
PLAY_NOTES_LIMIT=500

if [[ ! -f "$KEY" ]]; then
  echo "ERROR: service account key not found at:" >&2
  echo "  $KEY" >&2
  echo "This is the liftosaur-android-api service account (private submodule)." >&2
  exit 1
fi

read_version_code() {
  grep -oE 'versionCode [0-9]+' | grep -oE '[0-9]+'
}

CURRENT=$(read_version_code < "$GRADLE")

git -C "$ROOT" fetch -q origin master || echo "WARN: could not fetch origin/master, comparing against the local ref" >&2
if git -C "$ROOT" rev-parse --verify -q origin/master >/dev/null; then
  MASTER_REF="origin/master"
else
  MASTER_REF="master"
fi
MASTER=$(git -C "$ROOT" show "$MASTER_REF:android/app/build.gradle" | read_version_code)

if [[ "$CURRENT" -le "$MASTER" ]]; then
  echo "ERROR: versionCode $CURRENT is not higher than $MASTER_REF ($MASTER)." >&2
  echo "Bump versionCode and versionName in android/app/build.gradle first." >&2
  exit 1
fi
echo "versionCode $CURRENT (> $MASTER_REF: $MASTER)"

if [[ -z "${EDITOR:-}" ]]; then
  echo "ERROR: \$EDITOR is not set, cannot ask for release notes." >&2
  exit 1
fi

DRAFT=$(mktemp "${TMPDIR:-/tmp}/android-release-notes.XXXXXX")
trap 'rm -f "$DRAFT"' EXIT
if [[ -f "$NOTES_FILE" ]]; then
  cat "$NOTES_FILE" > "$DRAFT"
else
  echo > "$DRAFT"
fi
cat >> "$DRAFT" <<EOF

# Release notes for Android versionCode $CURRENT (production track).
# Pre-filled from the last saved notes when present. Clear them to cancel.
# Lines starting with '#' are dropped. Save an empty message to cancel.
# Plain text only: no <en-US></en-US> tags, the locale comes from the file path.
# Google Play caps release notes at $PLAY_NOTES_LIMIT characters.
EOF

sh -c "$EDITOR \"\$@\"" sh "$DRAFT"

NOTES=$(grep -v -E '^#|^[[:space:]]*</?en-US>[[:space:]]*$' "$DRAFT" | sed -e 's/[[:space:]]*$//' | awk '/./ { started = 1 } started { print }')
NOTES="${NOTES%"${NOTES##*[![:space:]]}"}"

if [[ -z "${NOTES//[[:space:]]/}" ]]; then
  echo "Aborting release: empty release notes."
  exit 1
fi

if [[ ${#NOTES} -gt $PLAY_NOTES_LIMIT ]]; then
  echo "ERROR: release notes are ${#NOTES} characters, Play allows $PLAY_NOTES_LIMIT." >&2
  exit 1
fi

mkdir -p "$NOTES_DIR"
printf '%s\n' "$NOTES" > "$NOTES_FILE"

echo
echo "Release notes (${#NOTES} chars):"
echo "----------------------------------------"
echo "$NOTES"
echo "----------------------------------------"
echo

cd "$ROOT/android"
echo "Building and uploading versionCode $CURRENT to the production track..."
./gradlew publishReleaseBundle --rerun --track production --release-status completed
echo
cd "$ROOT"
TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/releaseAndroid/verifyProductionTrack.ts --versionCode "$CURRENT"
echo
echo "With managed publishing on, the release waits in Play Console"
echo "(Publishing overview) until you press Publish after review."
echo "Release notes saved to android/app/src/main/play/release-notes/en-US/production.txt"
