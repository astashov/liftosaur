#!/bin/bash
set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

SECRETS_FILE="$HOME/liftosaur-secrets/secrets.env"
if [[ -f "$SECRETS_FILE" ]]; then
    set -a
    source "$SECRETS_FILE"
    set +a
else
    echo "ERROR: $SECRETS_FILE not found"
    exit 1
fi

ORCHESTRATOR="${1:-rollbar}"

mkdir -p "$PROJECT_DIR/logs/docker-orchestrator"

cd "$SCRIPT_DIR/docker"
exec docker compose run --rm orchestrator "$ORCHESTRATOR"
