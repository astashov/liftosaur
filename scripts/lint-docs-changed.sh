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

# shellcheck disable=SC2086
if out=$(TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/lint-docs.ts $files --quiet 2>&1); then
  exit 0
fi

count=$(printf '%s\n' "$out" | grep -c ERROR)
msg="lint-docs: $count error(s) in changed docs under $sub. Run: npx ts-node scripts/lint-docs.ts <file>"
printf '%s\n' "$msg" | python3 -c 'import json,sys; print(json.dumps({"systemMessage": sys.stdin.read().strip()}))'
exit 0
