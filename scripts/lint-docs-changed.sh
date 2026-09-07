#!/bin/bash
# Stop-hook gate. Reports through systemMessage rather than blocking: a Stop hook that blocks can
# trap the session in a loop when the lint cannot be satisfied, and the PostToolUse hook already
# covers every edit made through Write/Edit.
#
# archdocs and plans live in the lambda/scripts submodule, so the parent repo's status never shows
# them — it reports the submodule as one entry.
set -u
root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$root" || exit 0

sub="lambda/scripts"
# Every archdoc is currently untracked in the submodule, so git alone reports all seven on every
# stop. The mtime window narrows that to this working session. Drop it once they are committed.
files=$(git -C "$sub" status --porcelain -- archdocs plans 2>/dev/null \
  | awk '{print $NF}' | grep -E '\.md$' | sed "s|^|$sub/|" \
  | while read -r f; do [ -n "$(find "$f" -newermt '-2 hours' 2>/dev/null)" ] && printf '%s\n' "$f"; done || true)
[ -z "$files" ] && exit 0

# Anchors are graspcode's half of the split, so both linters run and their counts are added.
# Hooks do not inherit the plugin's PATH entry, hence the fallback to its installed location.
grasp_bin=$(command -v grasp || echo "$HOME/.claude/plugins/marketplaces/graspcode/plugins/graspcode/bin/grasp")
archdocs=$(printf '%s\n' "$files" | grep '/archdocs/' || true)

out=""
# shellcheck disable=SC2086
prose=$(TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/lint-docs.ts $files --quiet 2>&1) || out="$prose"
if [ -x "$grasp_bin" ] && [ -n "$archdocs" ]; then
  # shellcheck disable=SC2086
  anchors=$("$grasp_bin" archdoc lint $archdocs --quiet 2>&1) || out="$out
$anchors"
fi
[ -z "$out" ] && exit 0

count=$(printf '%s\n' "$out" | grep -c ERROR)
msg="docs lint: $count error(s) in changed docs under $sub. Run: npx ts-node scripts/lint-docs.ts <file> and grasp archdoc lint <file>"
printf '%s\n' "$msg" | python3 -c 'import json,sys; print(json.dumps({"systemMessage": sys.stdin.read().strip()}))'
exit 0
