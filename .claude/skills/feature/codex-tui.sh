#!/usr/bin/env bash
# One turn of a resumable Claude <-> Codex conversation in the interactive Codex TUI,
# in its own agterm session, so the user watches it and can keep talking to codex there.
# Takes the codex-chat.sh arguments plus --session-name. --transcript only names the
# side files <base>.thread and <base>.last.md; no transcript is written.
#
#   codex-tui.sh --session-name codex-bugs --transcript <file.md> --title "..." \
#                --prompt-file <file> [--resume] [--schema <file.json>] \
#                [--model gpt-6-astra] [--effort high] [--timeout 900]
#
# The TUI has no -o and no --output-schema, and its `notify` hook does not run in codex
# 0.162, so the answer comes from the `task_complete` event in the codex rollout file.
set -uo pipefail

SESSION_NAME=""; TRANSCRIPT=""; TITLE="Codex"; PROMPT_FILE=""; SCHEMA=""; RESUME=0
MODEL="gpt-6-astra"; EFFORT="high"; TIMEOUT=900

while [ $# -gt 0 ]; do
  case "$1" in
    --session-name) SESSION_NAME="$2"; shift 2;;
    --transcript) TRANSCRIPT="$2"; shift 2;;
    --title) TITLE="$2"; shift 2;;
    --prompt-file) PROMPT_FILE="$2"; shift 2;;
    --schema) SCHEMA="$2"; shift 2;;
    --model) MODEL="$2"; shift 2;;
    --effort) EFFORT="$2"; shift 2;;
    --timeout) TIMEOUT="$2"; shift 2;;
    --resume) RESUME=1; shift;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

[ -n "$SESSION_NAME" ] || { echo "--session-name is required" >&2; exit 2; }
[ -n "$TRANSCRIPT" ] || { echo "--transcript is required" >&2; exit 2; }
[ -n "$PROMPT_FILE" ] && [ -f "$PROMPT_FILE" ] || { echo "--prompt-file must exist" >&2; exit 2; }
command -v codex >/dev/null || { echo "codex CLI not found — npm i -g @openai/codex" >&2; exit 127; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGTERM_RUN="$HERE/../../../scripts/agterm-run.sh"
SESSIONS_DIR="${CODEX_HOME:-$HOME/.codex}/sessions"
DIR="$(cd "$(dirname "$TRANSCRIPT")" && pwd)"
BASE="$DIR/$(basename "${TRANSCRIPT%.md}")"
THREAD_FILE="$BASE.thread"; LAST="$BASE.last.md"

TAG="codex-turn-$(openssl rand -hex 6)"
PROMPT="$(cat "$PROMPT_FILE")"
if [ -n "$SCHEMA" ]; then
  PROMPT+=$'\n\n'"Reply with only one JSON object that matches this JSON schema, no prose and no code fence:"$'\n'"$(cat "$SCHEMA")"
fi
PROMPT+=$'\n\n'"[$TAG]"

ARGS=(-s read-only -a never -m "$MODEL" -c model_reasoning_effort="$EFFORT")
[ -f ./CLAUDE.md ] && ARGS+=(-c project_doc="./CLAUDE.md")
if [ "$RESUME" = "1" ] && [ -s "$THREAD_FILE" ]; then
  CMD=(codex resume "${ARGS[@]}" "$(cat "$THREAD_FILE")" "$PROMPT")
else
  CMD=(codex "${ARGS[@]}" "$PROMPT")
fi

MARK="$(mktemp "${TMPDIR:-/tmp}/codex-tui-mark.XXXXXX")" || exit 3
trap 'rm -f "$MARK"' EXIT
SID="$("$AGTERM_RUN" --replace "$SESSION_NAME" "${CMD[@]}")" || exit 3

ROLLOUT=""; RESULT=""; DEADLINE=$((SECONDS + TIMEOUT))
while [ -z "$RESULT" ]; do
  sleep 3
  [ -n "$ROLLOUT" ] || ROLLOUT="$(find "$SESSIONS_DIR" -name 'rollout-*.jsonl' -newer "$MARK" -print0 2>/dev/null \
    | xargs -0 grep -l "$TAG" 2>/dev/null | head -1)"
  [ -n "$ROLLOUT" ] && RESULT="$(node "$HERE/codex-rollout-answer.js" "$ROLLOUT" "$TAG")"
  [ -n "$RESULT" ] && break
  agtermctl tree --json --socket "$AGTERM_SOCKET" | grep -q "\"$SID\"" \
    || { echo "codex session closed before the turn finished" >&2; exit 3; }
  [ "$SECONDS" -lt "$DEADLINE" ] || { echo "no answer after ${TIMEOUT}s" >&2; exit 124; }
done

node -e 'const r = JSON.parse(process.argv[1]); process.stdout.write(r.thread)' "$RESULT" > "$THREAD_FILE"
node -e 'const r = JSON.parse(process.argv[1]); process.stdout.write(r.message + "\n")' "$RESULT" > "$LAST"

echo "final answer: $LAST"
