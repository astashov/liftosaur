#!/usr/bin/env bash
# Run a long-lived command in its own agterm session, in the workspace of the calling
# session, so the user can watch it in the sidebar instead of a hidden background shell.
#
#   agterm-run.sh <name> <command...>          start it, or leave it if <name> already runs
#                                              in this folder
#   agterm-run.sh --block <name> <command...>  start it, wait for exit, exit with its status
#   agterm-run.sh --replace <name> <command...> close <name> even if it runs, then start it
#
# Prints the session id. The session holds its final output until a key press; a finished
# session with the same name is closed first. Exit 3 means the session never ran the
# command. Outside agterm the command runs in this shell.
set -uo pipefail

BLOCK=0; REPLACE=0
while :; do
  case "${1:-}" in
    --block) BLOCK=1; shift;;
    --replace) REPLACE=1; shift;;
    *) break;;
  esac
done
[ $# -ge 2 ] || { echo "usage: agterm-run.sh [--block] [--replace] <name> <command...>" >&2; exit 2; }
NAME="$1"; shift

if [ -z "${AGTERM_SESSION_ID:-}" ] || ! command -v agtermctl >/dev/null; then
  "$@"; exit $?
fi

ctl() { agtermctl "$@" --socket "$AGTERM_SOCKET"; }

read -r WORKSPACE EXISTING AT_PROMPT < <(ctl tree --json --window "$AGTERM_WINDOW_ID" | node -e '
  const [self, name, cwd] = process.argv.slice(1);
  const tree = JSON.parse(require("fs").readFileSync(0, "utf8")).result.tree;
  const ws = tree.workspaces.find((w) => w.sessions.some((s) => s.id === self));
  if (!ws) process.exit(1);
  const s = ws.sessions.find((x) => x.name === name && x.cwd === cwd);
  console.log(ws.id, s ? s.id : "-", s && s.foregroundShell ? "yes" : "no");
' "$AGTERM_SESSION_ID" "$NAME" "$PWD") || { echo "own session not in tree" >&2; exit 3; }

STATE_DIR="${TMPDIR:-/tmp}/agterm-run"
mkdir -p "$STATE_DIR"
STATUS_FILE="$STATE_DIR/$WORKSPACE-$(printf '%s' "$PWD" | shasum | cut -c1-12)-${NAME//\//_}.status"

# A just-created session reports no foreground for a moment, so the status file, written
# empty at launch, is what says "still running"; a shell prompt means agterm restarted it.
if [ "$EXISTING" != "-" ]; then
  if [ "$REPLACE" = "0" ] && [ -f "$STATUS_FILE" ] && [ ! -s "$STATUS_FILE" ] && [ "$AT_PROMPT" = "no" ]; then
    [ "$BLOCK" = "1" ] && { echo "session '$NAME' is still running" >&2; exit 3; }
    echo "$EXISTING"; exit 0
  fi
  ctl session close --target "$EXISTING" >/dev/null
fi

LAUNCHER="$(mktemp "$STATE_DIR/launcher.XXXXXX")" || exit 3
: > "$STATUS_FILE"

# the session runs with the GUI PATH, which lacks node, npm and codex
{
  printf 'export PATH=%q\n' "$PATH"
  printf 'cd %q\n' "$PWD"
  printf '%q ' "$@"; printf '\n'
  printf 'echo $? > %q\n' "$STATUS_FILE"
  printf 'rm -f %q\n' "$LAUNCHER"
} > "$LAUNCHER"

SID="$(ctl session new --workspace "$WORKSPACE" --cwd "$PWD" --name "$NAME" --no-select --wait \
  --command "/bin/bash $LAUNCHER")" || { rm -f "$LAUNCHER" "$STATUS_FILE"; exit 3; }
echo "$SID"

[ "$BLOCK" = "0" ] && exit 0

while [ ! -s "$STATUS_FILE" ]; do
  sleep 2
  ctl tree --json --window "$AGTERM_WINDOW_ID" | grep -q "\"$SID\"" || { echo "session '$NAME' closed before the command finished" >&2; exit 3; }
done
exit "$(cat "$STATUS_FILE")"
