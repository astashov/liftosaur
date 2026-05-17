---
name: fix-rollbar
description: Fix a production exception from Rollbar in an interactive Claude Code session. Fetches the occurrence data, analyzes the error, and either implements a fix or adds the error to the ignore list. Use when given a Rollbar occurrence ID.
disable-model-invocation: true
argument-hint: [occurrence-id]
---

# Fix Rollbar Exception (Interactive)

Fix a production exception from Rollbar. The occurrence ID is: $ARGUMENTS

This is the interactive-session counterpart to `aihelpers/rollbar/` (which runs the same flow headlessly in Docker). Unlike the headless variant, you fetch the Rollbar data yourself, and you stop after the fix is implemented — no worktree, no verification, no commit/push/PR. The user reviews and tests.

## Prerequisites

`ROLLBAR_READ_TOKEN` must be set in the environment (used by both API calls and the `get_exception.ts`/`user_events_markdown.ts`/`get_logs.ts` scripts).

## Steps

### 1. Fetch Rollbar / User Data

Stage the artifacts under `.tmp/rollbar-$ARGUMENTS/`. Skip any step gracefully if it fails — only `rollbar.json` is required to proceed.

```bash
install -d .tmp/rollbar-$ARGUMENTS
```

**rollbar.json** (required):
```bash
curl -sS -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/instance/$ARGUMENTS" \
  -o .tmp/rollbar-$ARGUMENTS/rollbar.json
```

Extract `item_id`, `liftosaur_exception_id`, `person.id`, `timestamp`:
```bash
jq -r '.result.item_id, .result.data.liftosaur_exception_id, .result.data.person.id, .result.data.timestamp' \
  .tmp/rollbar-$ARGUMENTS/rollbar.json
```

**item.json** (using the `item_id` above):
```bash
curl -sS -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/item/<ITEM_ID>" \
  -o .tmp/rollbar-$ARGUMENTS/item.json
```

**exception.json** (only if `liftosaur_exception_id` is non-null):
```bash
TS_NODE_TRANSPILE_ONLY=1 npx ts-node ./lambda/scripts/get_exception.ts <EXCEPTION_ID> \
  > .tmp/rollbar-$ARGUMENTS/exception.json
```

**user_events.md** (only if `person.id` is non-null):
```bash
TS_NODE_TRANSPILE_ONLY=1 npx ts-node ./lambda/scripts/user_events_markdown.ts <USER_ID> \
  > .tmp/rollbar-$ARGUMENTS/user_events.md
```

**server_logs.txt** (only if both `timestamp` and `person.id` are present). The script writes `logs-<date>-<userid>.txt` into the cwd, so run it from the tmp dir and rename:
```bash
DATE=$(node -e "console.log(new Date(<TIMESTAMP> * 1000).toISOString().slice(0,10))")
(cd .tmp/rollbar-$ARGUMENTS && TS_NODE_TRANSPILE_ONLY=1 npx ts-node ../../lambda/scripts/get_logs.ts $DATE <USER_ID>)
mv .tmp/rollbar-$ARGUMENTS/logs-$DATE-<USER_ID>.txt .tmp/rollbar-$ARGUMENTS/server_logs.txt 2>/dev/null || true
```

### 2. Parse Exception Data

If `exception.json` was fetched, parse the nested JSON to get `lastState` and `lastActions`:

```bash
jq -r '.data' .tmp/rollbar-$ARGUMENTS/exception.json | jq '.lastActions | fromjson' | tee .tmp/rollbar-$ARGUMENTS/lastActions.json | jq '.[-10:]'
```

```bash
jq -r '.data' .tmp/rollbar-$ARGUMENTS/exception.json | jq '.lastState | fromjson' | tee .tmp/rollbar-$ARGUMENTS/lastState.json | jq '{screenStack, progressCount: (.storage.progress | length)}'
```

The parsed data contains:
- `lastState` — full `IState` (see `src/models/state.ts:109`), including `storage`, `screenStack`, and (possibly empty) `progress`
- `lastActions` — recent Redux actions in reverse-chronological order (newest first)

### 3. Review User Events Timeline

If `user_events.md` was fetched, look for the error markers and their surrounding context:

```bash
grep -B 5 -A 5 "❌ \*\*ERROR\*\*" .tmp/rollbar-$ARGUMENTS/user_events.md || echo "No error markers found"
```

### 4. Review Server Logs (if available)

`server_logs.txt` can be large — don't read the whole file. Use the timestamp from `rollbar.json` to grep the surrounding window.

### 5. Fix or Ignore

Key files for reference:
- `src/types.ts` — Core type definitions (IStorage, IProgram, IHistoryRecord, …)
- `src/models/state.ts` — IState definition
- `src/ducks/reducer.ts` — Redux reducer
- `src/ducks/thunks.ts` — Async actions

**Option A — add to ignore list** when the error isn't worth fixing (browser-extension noise, unsupported browser, third-party script, generic unactionable message, transient already-handled network error, etc.). Append a unique substring of the message to `exceptionIgnores` in `src/utils/rollbar.ts`. Use the most specific part; don't ignore so broadly that legitimate errors get swept up.

**Option B — fix the bug**:
1. Identify the root cause from the stack trace + state + actions
2. Make the fix minimal and focused — handle the actual edge case, don't rewrite surrounding code
3. Ensure the fix doesn't break other scenarios
4. If the logic is non-trivial, add a unit test that reproduces the bug. Use nearby tests as a style reference.

Once the change is in place, stop and hand back to the user — they'll verify and commit.
