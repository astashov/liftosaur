#!/bin/bash
set -euo pipefail

export NODE_OPTIONS="--max-old-space-size=8192"
export TS_NODE_TRANSPILE_ONLY=1

cd /app

git fetch origin master
git reset --hard origin/master

if [[ ! -f localdomain.js ]]; then
    echo "ERROR: localdomain.js not found — mount it as a volume"
    exit 1
fi

npm install --prefer-offline

git config user.name "astashovai"
git config user.email "astashovai@users.noreply.github.com"

if [[ -n "${GH_TOKEN_AI:-}" ]]; then
    export GH_TOKEN="$GH_TOKEN_AI"
    git remote add fork "https://astashovai:${GH_TOKEN_AI}@github.com/astashovai/liftosaur.git" 2>/dev/null || \
        git remote set-url fork "https://astashovai:${GH_TOKEN_AI}@github.com/astashovai/liftosaur.git"
fi

case "${1:-}" in
    bash|shell)
        exec /bin/bash
        ;;
    *)
        exec bash aihelpers/shared/claude-stream.sh "$1" ${2:+-l "$2"}
        ;;
esac
