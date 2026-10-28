#!/usr/bin/env bash
# Run codex-chat.sh turns in an agterm overlay on the right split pane, so the user
# watches codex live and keeps talking to Claude in the left pane. ⌘D hides the split;
# the turns keep running and reappear when it is shown again.
#
#   codex-overlay.sh --label bugs <codex-chat.sh args...> [--label arch <codex-chat.sh args...>]
#
# Several labels run in parallel in the one overlay, each line prefixed `[label]`.
# Blocks until every turn exits and exits with the first non-zero status; 3 means the
# overlay never ran. Outside agterm the turns run headless in this shell.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOLD_SECONDS=30

LABELS=(); JOBS=()
while [ $# -gt 0 ]; do
  [ "$1" = "--label" ] && [ $# -ge 2 ] || { echo "expected --label <name> <codex-chat.sh args...>" >&2; exit 2; }
  LABELS+=("$2"); shift 2
  job=""
  while [ $# -gt 0 ] && [ "$1" != "--label" ]; do job+=" $(printf '%q' "$1")"; shift; done
  JOBS+=("$job")
done
[ ${#JOBS[@]} -gt 0 ] || { echo "no turns given" >&2; exit 2; }

run_one() {
  local prefix="$1" job="$2"
  eval "\"\$HERE/codex-chat.sh\" $job" 2>&1 | awk -v p="$prefix" '{ print p $0; fflush() }'
  return "${PIPESTATUS[0]}"
}

run_all() {
  local pids=() status=0 i s prefix
  for i in "${!JOBS[@]}"; do
    prefix=""; [ ${#JOBS[@]} -gt 1 ] && prefix="[${LABELS[$i]}] "
    run_one "$prefix" "${JOBS[$i]}" &
    pids+=($!)
  done
  for i in "${!pids[@]}"; do
    wait "${pids[$i]}"; s=$?
    echo "[${LABELS[$i]}] exited $s"
    [ "$s" != "0" ] && [ "$status" = "0" ] && status=$s
  done
  return "$status"
}

if [ -n "${CODEX_OVERLAY_STATUS:-}" ]; then
  run_all; status=$?
  echo "$status" > "$CODEX_OVERLAY_STATUS"
  read -r -t "$HOLD_SECONDS" -p "done, exit $status. Enter closes, or wait ${HOLD_SECONDS}s " _ || true
  exit "$status"
fi

if [ -z "${AGTERM_SESSION_ID:-}" ] || ! command -v agtermctl >/dev/null; then
  run_all; exit $?
fi

SID="$AGTERM_SESSION_ID"
LAUNCHER="$(mktemp "${TMPDIR:-/tmp}/codex-overlay.XXXXXX")" || exit 3
STATUS_FILE="$(mktemp "${TMPDIR:-/tmp}/codex-overlay-status.XXXXXX")" || exit 3
trap 'rm -f "$LAUNCHER" "$STATUS_FILE"' EXIT
: > "$STATUS_FILE"

# the overlay runs with the GUI PATH, which lacks codex, node and timeout
{
  printf 'export PATH=%q CODEX_OVERLAY_STATUS=%q\n' "$PATH" "$STATUS_FILE"
  printf 'cd %q\n' "$PWD"
  printf 'exec %q' "$HERE/codex-overlay.sh"
  for i in "${!JOBS[@]}"; do printf ' --label %q%s' "${LABELS[$i]}" "${JOBS[$i]}"; done
  printf '\n'
} > "$LAUNCHER"

agtermctl session split on --target "$SID" >/dev/null || exit 3
agtermctl session overlay open "/bin/bash $LAUNCHER" --pane right --block --cwd "$PWD" --target "$SID" >/dev/null

if [ ! -s "$STATUS_FILE" ]; then
  echo "overlay did not run the turns to the end" >&2
  exit 3
fi
exit "$(cat "$STATUS_FILE")"
