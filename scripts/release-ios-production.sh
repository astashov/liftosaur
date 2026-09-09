#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PBXPROJ="ios/Liftosaur.xcodeproj/project.pbxproj"
KEY_ID="F286YBUYZ7"
KEY_ISSUER_ID="4c82c687-0990-4745-ac91-89ab459a6c5c"
KEY="$ROOT/lambda/scripts/AuthKey_$KEY_ID.p8"
TEAM_ID="7V6ZVS97Z2"
BUNDLE_ID="com.liftosaur.www"
NOTES_DIR="$ROOT/ios/release-notes/en-US"
NOTES_FILE="$NOTES_DIR/production.txt"
ANDROID_NOTES_FILE="$ROOT/android/app/src/main/play/release-notes/en-US/production.txt"
ARCHIVE_DIR="$ROOT/ios/build/archive"
ARCHIVE_PATH="$ARCHIVE_DIR/Liftosaur.xcarchive"
EXPORT_PATH="$ARCHIVE_DIR/export"
EXPORT_OPTIONS="$ARCHIVE_DIR/ExportOptions.plist"
APP_STORE_NOTES_LIMIT=4000

DRY_RUN=0
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    *)
      echo "Unknown arg: $arg" >&2
      echo "Usage: $0 [--dry-run] [--skip-build]" >&2
      echo "  --dry-run     archive and export a signed .ipa locally, no upload, no App Store Connect changes" >&2
      echo "  --skip-build  skip the archive and upload, only submit the already uploaded build for review" >&2
      exit 1
      ;;
  esac
done

if [[ $DRY_RUN -eq 1 && $SKIP_BUILD -eq 1 ]]; then
  echo "ERROR: --dry-run and --skip-build together leave nothing to do." >&2
  exit 1
fi

if [[ ! -f "$KEY" ]]; then
  echo "ERROR: App Store Connect API key not found at:" >&2
  echo "  $KEY" >&2
  echo "It lives in the private lambda/scripts submodule." >&2
  exit 1
fi

build_setting_for() {
  awk -v setting="$1 = " -v bid="$2" '
    index($0, setting) > 0 {
      value = $0
      sub(".*" setting, "", value)
      sub(/;.*/, "", value)
      gsub(/[ \t"]/, "", value)
    }
    index($0, "PRODUCT_BUNDLE_IDENTIFIER = " bid ";") > 0 { print value; exit }
  '
}

VERSION=$(build_setting_for MARKETING_VERSION "$BUNDLE_ID" < "$ROOT/$PBXPROJ")
BUILD_NUMBER=$(build_setting_for CURRENT_PROJECT_VERSION "$BUNDLE_ID" < "$ROOT/$PBXPROJ")
if [[ -z "$VERSION" || -z "$BUILD_NUMBER" ]]; then
  echo "ERROR: could not read MARKETING_VERSION / CURRENT_PROJECT_VERSION for $BUNDLE_ID from $PBXPROJ" >&2
  exit 1
fi

git -C "$ROOT" fetch -q origin master || echo "WARN: could not fetch origin/master, comparing against the local ref" >&2
if git -C "$ROOT" rev-parse --verify -q origin/master >/dev/null; then
  MASTER_REF="origin/master"
else
  MASTER_REF="master"
fi
MASTER_VERSION=$(git -C "$ROOT" show "$MASTER_REF:$PBXPROJ" | build_setting_for MARKETING_VERSION "$BUNDLE_ID")

if [[ "$VERSION" -le "$MASTER_VERSION" ]]; then
  echo "ERROR: MARKETING_VERSION $VERSION is not higher than $MASTER_REF ($MASTER_VERSION)." >&2
  echo "Bump MARKETING_VERSION in $PBXPROJ first (all targets)." >&2
  exit 1
fi
echo "iOS version $VERSION ($BUILD_NUMBER), App Store version $VERSION (> $MASTER_REF: $MASTER_VERSION)"

if [[ -z "${EDITOR:-}" ]]; then
  echo "ERROR: \$EDITOR is not set, cannot ask for release notes." >&2
  exit 1
fi

DRAFT=$(mktemp "${TMPDIR:-/tmp}/ios-release-notes.XXXXXX")
trap 'rm -f "$DRAFT"' EXIT
if [[ -f "$NOTES_FILE" ]]; then
  cat "$NOTES_FILE" > "$DRAFT"
elif [[ -f "$ANDROID_NOTES_FILE" ]]; then
  cat "$ANDROID_NOTES_FILE" > "$DRAFT"
else
  echo > "$DRAFT"
fi
cat >> "$DRAFT" <<EOF

# Release notes for iOS $VERSION ($BUILD_NUMBER), App Store version $VERSION.
# Pre-filled from the last saved iOS notes, or the Android notes, when present. Clear them to cancel.
# Lines starting with '#' are dropped. Save an empty message to cancel.
# App Store caps "What's New" at $APP_STORE_NOTES_LIMIT characters.
EOF

sh -c "$EDITOR \"\$@\"" sh "$DRAFT"

NOTES=$(grep -v '^#' "$DRAFT" | sed -e 's/[[:space:]]*$//' | awk '/./ { started = 1 } started { print }')
NOTES="${NOTES%"${NOTES##*[![:space:]]}"}"

if [[ -z "${NOTES//[[:space:]]/}" ]]; then
  echo "Aborting release: empty release notes."
  exit 1
fi

if [[ ${#NOTES} -gt $APP_STORE_NOTES_LIMIT ]]; then
  echo "ERROR: release notes are ${#NOTES} characters, App Store allows $APP_STORE_NOTES_LIMIT." >&2
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

AUTH_FLAGS=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$KEY"
  -authenticationKeyID "$KEY_ID"
  -authenticationKeyIssuerID "$KEY_ISSUER_ID"
)

run_xcodebuild() {
  local log="$1"
  shift
  if ! RCT_USE_PREBUILT_RNCORE=1 RCT_NEW_ARCH_ENABLED=1 USE_FRAMEWORKS=static xcodebuild "$@" > "$log" 2>&1; then
    echo "xcodebuild failed, last 60 lines of $log:" >&2
    tail -60 "$log" >&2
    exit 1
  fi
}

if [[ $SKIP_BUILD -eq 0 ]]; then
  cd "$ROOT"
  echo "Building the production watch bundle..."
  NODE_ENV=production npm run build:watch-bundle > "$ROOT/ios/build/watch-bundle.log" 2>&1 || {
    tail -30 "$ROOT/ios/build/watch-bundle.log" >&2
    exit 1
  }

  rm -rf "$ARCHIVE_DIR"
  mkdir -p "$ARCHIVE_DIR"

  echo "Archiving Liftosaur $VERSION ($BUILD_NUMBER), log: ios/build/archive/archive.log ..."
  run_xcodebuild "$ARCHIVE_DIR/archive.log" \
    -workspace ios/Liftosaur.xcworkspace \
    -scheme Liftosaur \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE_PATH" \
    "${AUTH_FLAGS[@]}" \
    archive

  if [[ $DRY_RUN -eq 1 ]]; then
    DESTINATION="export"
  else
    DESTINATION="upload"
  fi
  cat > "$EXPORT_OPTIONS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>$DESTINATION</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>$TEAM_ID</string>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
</dict>
</plist>
EOF

  echo "Exporting with destination=$DESTINATION, log: ios/build/archive/export.log ..."
  run_xcodebuild "$ARCHIVE_DIR/export.log" \
    -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -exportPath "$EXPORT_PATH" \
    "${AUTH_FLAGS[@]}"

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "Dry run: signed .ipa exported, nothing uploaded, App Store Connect untouched."
    ls -la "$EXPORT_PATH"/*.ipa
    exit 0
  fi
  echo "Uploaded $VERSION ($BUILD_NUMBER) to App Store Connect."
fi

cd "$ROOT"
echo "Waiting for App Store Connect to process the build, then submitting for review..."
TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/releaseIos/submitToAppStore.ts \
  --version "$VERSION" \
  --build "$BUILD_NUMBER" \
  --notesFile "$NOTES_FILE"
echo "Release notes saved to ios/release-notes/en-US/production.txt"
