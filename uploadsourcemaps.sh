#!/bin/bash

ENDPOINT="https://api.rollbar.com/api/1/sourcemap"
VERSION=$(git rev-parse HEAD)
URL_PREFIX="//www.liftosaur.com"
DIST_DIR="./dist"
MAX_CONCURRENT_UPLOADS=3
MAX_RETRIES=3
CURL_TIMEOUT=60

function limit_jobs() {
    while [ "$(jobs -r | wc -l)" -ge "$MAX_CONCURRENT_UPLOADS" ]; do
        sleep 1
    done
}

if [ -z "$VERSION" ]; then
    echo "Error: Git commit hash not found. Are you in a Git repository?"
    exit 1
fi

if [ -z "$ROLLBAR_POST_SERVER_ITEM" ]; then
    echo "Error: Rollbar Post Server Item token is not found."
    exit 1
fi

for jsfile in $DIST_DIR/*.js; do
    mapfile="${jsfile}.map"
    if [[ -f "$mapfile" ]]; then
        jsfilename=$(basename $jsfile)
        
        echo ""
        echo "Uploading $jsfilename source map, version $VERSION"

        (
            for ((i=1; i<=MAX_RETRIES; i++)); do
                curl -m $CURL_TIMEOUT $ENDPOINT \
                    -F access_token=$ROLLBAR_POST_SERVER_ITEM \
                    -F version=$VERSION \
                    -F minified_url="$URL_PREFIX/$jsfilename" \
                    -F source_map=@$mapfile
                if [ $? -eq 0 ]; then
                    break
                else
                    echo "Retry $i for $jsfilename..."
                    sleep 2
                fi
            done
        ) &

        limit_jobs
    fi
done

wait