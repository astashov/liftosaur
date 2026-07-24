---
name: debug-rollbar
description: Interactively investigate a production Rollbar error. Accepts an occurrence id, item id, item counter, or Rollbar URL. Fetches the error data, assesses how widespread it is, drills into affected users (events, logs, storage, captured state), and works with the developer toward a fix or ignore decision. Use for collaborative debugging; use /fix-rollbar for a straight fetch-and-fix of a single occurrence.
disable-model-invocation: true
argument-hint: [occurrence-id | item-id | item-counter | rollbar-url] [optional notes]
---

# Debug Rollbar Error (Interactive)

Investigate a production Rollbar error: $ARGUMENTS

This is a **conversational** investigation, not an autonomous fix. After each stage, summarize what you found and confirm direction with the user before fetching more data or writing code. Use AskUserQuestion when there are distinct paths (e.g. "drill into this user vs. compare occurrences vs. propose a fix"). Never implement a fix without presenting the root-cause analysis and proposed approach first.

## Prerequisites

- `ROLLBAR_READ_TOKEN` must be set in the environment.
- Lambda scripts run via `npm run r ./lambda/scripts/<script>.ts ...`. Their stdout includes DynamoDB/log noise — extract the useful part when saving to files.
- Stage all artifacts under `.tmp/rollbar-debug-<id>/` (use the item counter or occurrence id as `<id>`):
  ```bash
  install -d .tmp/rollbar-debug-<id>
  ```

## Step 1: Resolve the input to an item + occurrence(s)

Figure out what kind of reference was given:

- **URL with `/occurrences/<id>`** → occurrence id.
- **URL like `.../items/<counter>/`** → item counter (small number shown in the Rollbar UI).
- **Bare number, 16+ digits** → occurrence id.
- **Bare number, ≤ 8 digits** → item counter.
- **Bare number in between (9–12 digits)** → item id; if the item fetch errors, retry as an occurrence id.
- **Nothing usable** → ask the user.

**From an item counter**, resolve the internal item id:
```bash
curl -sSL -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/item_by_counter/<COUNTER>" | jq '.result.id'
```

**From an occurrence id**, fetch it and take `item_id` from the result (occurrence fetch command in Step 3).

## Step 2: Item overview — how bad is it?

Fetch the item and recent occurrences:

```bash
curl -sS -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/item/<ITEM_ID>" \
  -o .tmp/rollbar-debug-<id>/item.json
jq '{title: .result.title, level: .result.level, environment: .result.environment,
     total: .result.total_occurrences, first: .result.first_occurrence_timestamp,
     last: .result.last_occurrence_timestamp, status: .result.status}' \
  .tmp/rollbar-debug-<id>/item.json
```

```bash
curl -sS -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/item/<ITEM_ID>/instances" \
  -o .tmp/rollbar-debug-<id>/instances.json
jq -r '.result.instances[] | [.id, (.timestamp | todate),
   (.data.person.id // "-"), (.data.client.javascript.code_version // .data.code_version // "-"),
   (.data.platform // "-")] | @tsv' .tmp/rollbar-debug-<id>/instances.json
```

From this, characterize the blast radius and **brief the user** before going deeper:
- One user repeatedly, or many distinct users?
- Started at a specific `code_version` (regression from a recent deploy), or long-standing?
- Web vs native, app versions, frequency trend.
- Convert epoch timestamps to dates; relate `first`/`last` to recent commits if it looks like a regression (`git log --oneline --since=...`).

Checkpoint: present the summary (title, message, spread, suspected recency) and ask which occurrence/user to drill into — default to the most recent occurrence that has a non-null `person.id`.

## Step 3: Occurrence deep-dive

```bash
curl -sS -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/instance/<OCCURRENCE_ID>" \
  -o .tmp/rollbar-debug-<id>/occurrence-<OCCURRENCE_ID>.json
```

Extract the key fields:
```bash
jq -r '.result | {item_id, timestamp,
   message: (.data.body.trace.exception.message // .data.body.message.body // .data.body.trace_chain[0].exception.message),
   person: .data.person.id, exception_id: .data.liftosaur_exception_id,
   code_version: (.data.client.javascript.code_version // .data.code_version)}' \
  .tmp/rollbar-debug-<id>/occurrence-<OCCURRENCE_ID>.json
```

Read the stack trace (`.data.body.trace.frames` or `.data.body.trace_chain[0].frames`) and locate the failing code in the repo.

**Captured client state** — if `liftosaur_exception_id` is non-null:
```bash
npm run r ./lambda/scripts/get_exception.ts <EXCEPTION_ID> > .tmp/rollbar-debug-<id>/exception-<EXCEPTION_ID>.json
jq -r '.data' .tmp/rollbar-debug-<id>/exception-<EXCEPTION_ID>.json | jq '.lastActions | fromjson | .[-10:]'
jq -r '.data' .tmp/rollbar-debug-<id>/exception-<EXCEPTION_ID>.json | jq '.lastState | fromjson | {screenStack, progressCount: (.storage.progress | length)}'
```
`lastState` is a full `IState` (`src/models/state.ts`); `lastActions` is newest-first. Query them with targeted `jq` — don't dump whole objects.

## Step 4: User context (the /debug-user toolchain)

When `person.id` is present and the user agrees this is the right thread to pull, fetch user data incrementally — cheapest first:

**Events timeline** (always start here):
```bash
npm run r ./lambda/scripts/user_events_markdown.ts <USER_ID> > .tmp/rollbar-debug-<id>/events-<USER_ID>.md
grep -B 5 -A 5 "❌ \*\*ERROR\*\*" .tmp/rollbar-debug-<id>/events-<USER_ID>.md
```
Look at what the user was doing right before the error (screens, syncs, platform/app version on each line), and whether other errors cluster around it.

**Server logs** (sync/payments/API suspicion) — derive the date from the occurrence timestamp:
```bash
npm run r ./lambda/scripts/get_logs.ts <YYYY-MM-DD> <USER_ID>
mv logs-<YYYY-MM-DD>-<USER_ID>.txt .tmp/rollbar-debug-<id>/
```
These are large — grep around the error timestamp, don't read whole files.

**Current storage** (data-shape suspicion — broken program, weird history):
```bash
npm run r ./lambda/scripts/get_user_storage.ts <USER_ID> > .tmp/rollbar-debug-<id>/storage-raw.txt
```
Extract the JSON object from the stdout noise into `storage.json`, then query with `jq`.

**Storage snapshots** ("data was fine before X") — snapshot ids come from 📸 lines in events.md:
```bash
npm run r ./lambda/scripts/get_storage_from_snapshot.ts <USER_ID> <STORAGE_ID> > .tmp/rollbar-debug-<id>/snapshot-<STORAGE_ID>.txt
```
(Prints `util.inspect` notation, not JSON — compare targeted fields, don't diff whole files.)

If the error hits **many users**, consider fetching 2–3 occurrences instead and diffing their circumstances (state, actions, versions) to isolate the common factor — often faster than deep-diving one user.

## Step 5: Hypothesize and discuss

Cross-reference the stack trace, captured state/actions, events, and logs against the source. Key files:
- `src/types.ts` — IStorage, IProgram, IHistoryRecord
- `src/models/state.ts` — IState
- `src/ducks/reducer.ts`, `src/ducks/thunks.ts` — state transitions and sync
- `lambda/index.ts` — server endpoints

Present to the user:
1. **Root cause** (or ranked hypotheses) with specific evidence cited — frame in stack, action sequence, state field, log line.
2. **Recommendation**: fix, ignore, or instrument — with reasoning.

Wait for the user's call before changing code.

## Step 6: Act on the decision

**Ignore** — for unactionable noise (browser extensions, unsupported browsers, third-party scripts, transient already-handled network errors): append a unique, specific substring of the message to `exceptionIgnores` in `src/utils/rollbar.ts`. Don't ignore so broadly that real errors get swept up.

**Fix** — minimal and focused on the actual edge case; don't rewrite surrounding code. If the logic is non-trivial, add a unit test reproducing the bug (use nearby tests as style reference). Stop after the change — the user verifies and commits.

**Instrument** — when inconclusive: add `lgDebug("descriptive-event-name", "<USER_ID>", { key: value })` calls (`src/utils/posthog.ts`) at suspect code paths; they log only for that user's tempUserId and work on web and native. Summarize what each call tests and what to look for in events.md after deploy + repro. Remind the user to remove them once concluded.
