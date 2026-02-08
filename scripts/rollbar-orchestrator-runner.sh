#!/bin/bash
# Wrapper script for rollbar-orchestrator that loads environment variables
# This is called by launchd which doesn't have access to shell profiles

set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load secrets from file (create this file with your tokens)
SECRETS_FILE="$HOME/liftosaur-secrets/secrets.env"
if [[ -f "$SECRETS_FILE" ]]; then
    set -a
    source "$SECRETS_FILE"
    set +a
else
    echo "ERROR: $SECRETS_FILE not found"
    echo "Create it with: ROLLBAR_READ_TOKEN=your_token"
    exit 1
fi

# Ensure log directory exists
mkdir -p "$PROJECT_DIR/logs/rollbar-orchestrator"

# Run the orchestrator
cd "$PROJECT_DIR"
exec npx ts-node scripts/rollbar-orchestrator.ts
