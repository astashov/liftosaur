#!/bin/bash
# Visual convergence loop for migrating screens to React Native.
# Repeatedly invokes the migrate-screen-rn skill via claude-stream.sh,
# clearing context each time. Stops when the skill signals COMPLETE
# or after --max iterations.
#
# Usage:
#   ./aihelpers/migrate-screen/migrate-loop.sh workout
#   ./aihelpers/migrate-screen/migrate-loop.sh workout "sets table"
#   ./aihelpers/migrate-screen/migrate-loop.sh workout --max 10

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
STREAM="$PROJECT_DIR/aihelpers/shared/claude-stream.sh"
PROGRESS_FILE="$PROJECT_DIR/crossplatform/MIGRATE_PROGRESS.md"
LOG_DIR="$PROJECT_DIR/logs/migrate-screen"

SCREEN="${1:?Usage: migrate-loop.sh <screen-name> [focus-area] [--max N]}"
shift

FOCUS=""
MAX_ITERATIONS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --max)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    *)
      FOCUS="$1"
      shift
      ;;
  esac
done

ARGS="$SCREEN"
if [[ -n "$FOCUS" ]]; then
  ARGS="$SCREEN $FOCUS"
fi

mkdir -p "$LOG_DIR"

ITERATION=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 migrate-loop: visual convergence for '$ARGS'"
echo "   Progress: $PROGRESS_FILE"
echo "   Logs:     $LOG_DIR/"
if [[ "$MAX_ITERATIONS" -gt 0 ]]; then
  echo "   Max:      $MAX_ITERATIONS iterations"
fi
echo "   Press Ctrl+C to stop between iterations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_DIR"

while true; do
  ITERATION=$((ITERATION + 1))

  if [[ "$MAX_ITERATIONS" -gt 0 && "$ITERATION" -gt "$MAX_ITERATIONS" ]]; then
    echo ""
    echo "🛑 Reached max iterations ($MAX_ITERATIONS), stopping."
    break
  fi

  # Check if previous iteration signaled completion
  if [[ -f "$PROGRESS_FILE" ]] && grep -q '<!-- STATUS: COMPLETE -->' "$PROGRESS_FILE"; then
    echo ""
    echo "✅ Migration complete! (signaled by skill in MIGRATE_PROGRESS.md)"
    break
  fi

  TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
  LOG_FILE="$LOG_DIR/iteration-${ITERATION}-${TIMESTAMP}.log"

  echo ""
  echo "🔁 Iteration $ITERATION — $(date '+%H:%M:%S')"
  echo "   Log: $LOG_FILE"
  echo ""

  "$STREAM" "/migrate-screen-rn $ARGS" -l "$LOG_FILE" || true

  # Check completion after this run
  if [[ -f "$PROGRESS_FILE" ]] && grep -q '<!-- STATUS: COMPLETE -->' "$PROGRESS_FILE"; then
    echo ""
    echo "✅ Migration complete! (signaled by skill in MIGRATE_PROGRESS.md)"
    break
  fi

  echo ""
  echo "⏳ Waiting 5s before next iteration (Ctrl+C to stop)..."
  sleep 5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 migrate-loop: finished after $ITERATION iterations"
echo "   See progress: $PROGRESS_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
