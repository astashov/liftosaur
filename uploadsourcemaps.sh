#!/bin/bash

ENDPOINT="https://api.rollbar.com/api/1/sourcemap"
VERSION=$(git rev-parse HEAD)
URL_PREFIX="//www.liftosaur.com"
DIST_DIR="./dist"
MAX_CONCURRENT_UPLOADS=8
MAX_RETRIES=3
CURL_TIMEOUT=20
RETRY_DELAY=2

if [ -z "$VERSION" ]; then
    echo "Error: Git commit hash not found. Are you in a Git repository?"
    exit 1
fi

if [ -z "$ROLLBAR_POST_SERVER_ITEM" ]; then
    echo "Error: Rollbar Post Server Item token is not found."
    exit 1
fi

# --fail makes curl treat Rollbar HTTP errors (429/5xx) as failures, and
# --retry-all-errors then retries on those *and* on -m timeouts. Without --fail,
# curl exits 0 on an HTTP error and the upload silently fails.
upload_one() {
    local mapfile="$1"
    local minified_url="$2"
    curl --silent --show-error --fail \
        -m "$CURL_TIMEOUT" \
        --retry "$MAX_RETRIES" --retry-delay "$RETRY_DELAY" --retry-all-errors \
        "$ENDPOINT" \
        -F access_token="$ROLLBAR_POST_SERVER_ITEM" \
        -F version="$VERSION" \
        -F minified_url="$minified_url" \
        -F source_map=@"$mapfile" \
        -o /dev/null
}

upload_bundle() {
    local jsfile="$1"
    local mapfile="${jsfile}.map"
    local relpath="${jsfile#$DIST_DIR/}"

    if upload_one "$mapfile" "$URL_PREFIX/$relpath" \
        && upload_one "$mapfile" "liftosaur:$URL_PREFIX/$relpath"; then
        echo "✓ $relpath"
    else
        echo "✗ FAILED $relpath" >&2
        return 1
    fi
}

pids=()

while IFS= read -r jsfile; do
    mapfile="${jsfile}.map"
    if [[ -f "$mapfile" ]]; then
        upload_bundle "$jsfile" &
        pids+=("$!")

        while [ "$(jobs -r | wc -l)" -ge "$MAX_CONCURRENT_UPLOADS" ]; do
            sleep 0.2
        done
    fi
done < <(find "$DIST_DIR" -type f -name "*.js")

failed=0
if [ "${#pids[@]}" -gt 0 ]; then
    for pid in "${pids[@]}"; do
        wait "$pid" || failed=$((failed + 1))
    done
fi

if [ "$failed" -gt 0 ]; then
    echo ""
    echo "Error: $failed bundle(s) failed to upload source maps."
    exit 1
fi

echo ""
echo "All source maps uploaded for version $VERSION."
