#!/bin/bash
# PostToolUse hook for the "Where logic lives" rule. Reports through additionalContext and never
# blocks: the finding is a question for the agent, and a function that should stay long is
# answered by a baseline entry with the reason, not by fighting the hook.
set -u
f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
case "$f" in
  */src/components/*.tsx|*/src/navigation/*.tsx|*/src/pages/*.tsx) ;;
  *) exit 0 ;;
esac
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
out=$(cd "$root" && TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/lint-views.ts "$f" --quiet 2>&1) && exit 0
msg="lint-views on $(basename "$f"):
$out

Judge each one. A state machine, a save rule or a text transform moves to a pure module with a test. A function that reads as one unit stays, with an entry in scripts/lint-views-baseline.json carrying the reason."
printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": sys.stdin.read()}}))'
exit 0
