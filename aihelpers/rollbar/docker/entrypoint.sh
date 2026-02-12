#!/bin/bash
set -euo pipefail

export NODE_OPTIONS="--max-old-space-size=8192"
export TS_NODE_TRANSPILE_ONLY=1

cd /app

git fetch origin master
git reset --hard origin/master

# localdomain.js is gitignored and mounted from host
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

# CLAUDE_CODE_OAUTH_TOKEN is picked up automatically by claude CLI

ORCHESTRATOR="${1:-rollbar}"

case "$ORCHESTRATOR" in
    rollbar)
        exec npx ts-node aihelpers/rollbar/rollbar-orchestrator.ts
        ;;
    pr-feedback)
        exec npx ts-node aihelpers/rollbar/pr-feedback-orchestrator.ts
        ;;
    both)
        npx ts-node aihelpers/rollbar/rollbar-orchestrator.ts
        exec npx ts-node aihelpers/rollbar/pr-feedback-orchestrator.ts
        ;;
    bash|shell)
        exec /bin/bash
        ;;
    *)
        echo "Unknown orchestrator: $ORCHESTRATOR"
        echo "Usage: entrypoint.sh [rollbar|pr-feedback|both|bash]"
        exit 1
        ;;
esac
