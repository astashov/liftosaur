#!/usr/bin/env bash
# One turn of a resumable Claude <-> Codex conversation, rendered live into a
# markdown transcript the user can `tail -f`.
#
#   codex-chat.sh --transcript <file.md> --title "Architecture · round 1" \
#                 --prompt-file <file> [--resume] [--schema <file.json>] \
#                 [--model gpt-5.4] [--effort high] [--timeout 900]
#
# Side files, all derived from --transcript <base>.md:
#   <base>.thread    codex thread id (used by --resume)
#   <base>.jsonl     raw event stream
#   <base>.err       codex stderr
#   <base>.last.md   codex's final message only — this is what the caller reads
set -uo pipefail

TRANSCRIPT=""; TITLE="Codex"; PROMPT_FILE=""; SCHEMA=""; RESUME=0
MODEL="gpt-5.4"; EFFORT="high"; TIMEOUT=900

while [ $# -gt 0 ]; do
  case "$1" in
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

[ -n "$TRANSCRIPT" ] || { echo "--transcript is required" >&2; exit 2; }
[ -n "$PROMPT_FILE" ] && [ -f "$PROMPT_FILE" ] || { echo "--prompt-file must exist" >&2; exit 2; }
command -v codex >/dev/null || { echo "codex CLI not found — npm i -g @openai/codex" >&2; exit 127; }

DIR="$(cd "$(dirname "$TRANSCRIPT")" && pwd)"
BASE="$DIR/$(basename "${TRANSCRIPT%.md}")"
TRANSCRIPT="$BASE.md"
THREAD_FILE="$BASE.thread"; RAW="$BASE.jsonl"; ERR="$BASE.err"; LAST="$BASE.last.md"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$TRANSCRIPT" ]; then
  printf '# Codex conversation — %s\n\n*Live transcript. `tail -f %s` to watch.*\n' \
    "$(basename "$BASE")" "$TRANSCRIPT" > "$TRANSCRIPT"
fi

{
  printf '\n---\n\n## %s\n\n**Claude → Codex** · %s\n\n' "$TITLE" "$(date '+%Y-%m-%d %H:%M:%S')"
  printf '~~~~\n'; cat "$PROMPT_FILE"; printf '\n~~~~\n\n**Codex → Claude**\n\n'
} >> "$TRANSCRIPT"

echo "watch it live:  tail -f $TRANSCRIPT"

# read-only goes through -c, not --sandbox: `exec resume` rejects the flag
ARGS=(--json -m "$MODEL"
      -c sandbox_mode="read-only"
      -c model_reasoning_effort="$EFFORT"
      -c stream_idle_timeout_ms=900000
      -o "$LAST")
[ -f ./CLAUDE.md ] && ARGS+=(-c project_doc="./CLAUDE.md")
[ -n "$SCHEMA" ] && ARGS+=(--output-schema "$SCHEMA")

if [ "$RESUME" = "1" ] && [ -s "$THREAD_FILE" ]; then
  # `resume` parses flags only before the session id positional
  set -- exec resume "${ARGS[@]}" "$(cat "$THREAD_FILE")" -
else
  set -- exec "${ARGS[@]}" -
fi

timeout "$TIMEOUT" codex "$@" < "$PROMPT_FILE" 2> "$ERR" \
  | tee -a "$RAW" \
  | node "$HERE/codex-render.js" "$TRANSCRIPT" "$THREAD_FILE"
STATUS=${PIPESTATUS[0]}

if [ "$STATUS" != "0" ]; then
  printf '\n> ❌ codex exited %s\n' "$STATUS" >> "$TRANSCRIPT"
  echo "codex exited $STATUS — stderr:" >&2; tail -20 "$ERR" >&2
  exit "$STATUS"
fi

echo
echo "final answer: $LAST"
