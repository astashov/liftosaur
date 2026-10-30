#!/usr/bin/env bash
# Run codex turns in parallel, each in the interactive Codex TUI in its own agterm
# session `codex-<label>` in the caller's workspace (codex-tui.sh), so the user watches
# codex in the sidebar and can keep talking to it there.
#
#   codex-run.sh --label bugs <codex-chat.sh args...> [--label arch <codex-chat.sh args...>]
#
# Blocks until every turn has answered and exits with the first non-zero status; 3 means
# a session never ran its turn. Outside agterm the turns run headless through
# codex-chat.sh in this shell, each line prefixed `[label]`.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
  local label="$1" job="$2"
  if [ -n "${AGTERM_SESSION_ID:-}" ]; then
    eval "\"\$HERE/codex-tui.sh\" --session-name \"codex-\$label\" $job" >/dev/null
    return $?
  fi
  local prefix=""; [ ${#JOBS[@]} -gt 1 ] && prefix="[$label] "
  eval "\"\$HERE/codex-chat.sh\" $job" 2>&1 | awk -v p="$prefix" '{ print p $0; fflush() }'
  return "${PIPESTATUS[0]}"
}

pids=(); status=0
for i in "${!JOBS[@]}"; do
  run_one "${LABELS[$i]}" "${JOBS[$i]}" &
  pids+=($!)
done
for i in "${!pids[@]}"; do
  wait "${pids[$i]}"; s=$?
  echo "[${LABELS[$i]}] exited $s"
  [ "$s" != "0" ] && [ "$status" = "0" ] && status=$s
done
exit "$status"
