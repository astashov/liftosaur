---
name: debug-user
description: Investigate a user-reported issue using server logs, user events, storage snapshots, and Rollbar. Use when given a user id or email plus an issue description (e.g. from a support email).
argument-hint: [user-id-or-email] [issue description]
---

# Debug User Issue

Investigate a user-reported issue: $ARGUMENTS

Fetch the user's server-side data incrementally, correlate it with their description of the problem and the source code, and explain the root cause. If the data isn't conclusive, instrument the suspect code paths with `lgDebug` and hand off for deploy.

## Prerequisites

- `ROLLBAR_READ_TOKEN` must be set in the environment for the Rollbar steps.
- All scripts run via `npm run r ./lambda/scripts/<script>.ts ...`. Their stdout includes DynamoDB/log noise around the useful output — when saving to a file, extract the relevant part (e.g. the JSON object) afterwards.

## Step 1: Resolve the user id

- Looks like a user id (short lowercase string) → use directly.
- Looks like an email → resolve it:
  ```bash
  npm run r ./lambda/scripts/get_user_id_by_email.ts <email>
  ```
- Looks like a Rollbar occurrence id (long number) → fetch the occurrence (see Rollbar section below) and take `person.id` from it. If the task is purely "fix this exception" rather than "investigate this user's issue", use `/fix-rollbar` instead.
- No identifier at all → ask for one.

Stage all artifacts under `.tmp/debug-<userid>/`:

```bash
install -d .tmp/debug-<userid>
```

## Step 2: Always fetch the events timeline first

```bash
npm run r ./lambda/scripts/user_events_markdown.ts <userid> > .tmp/debug-<userid>/events.md
```

This is the cheapest and densest source — the last 2 weeks of client events, grouped by day, each line carrying time, platform (Web/Mobile + iOS/Android app version), and short commit hash:

- `❌ **ERROR**` lines — client errors with message, stack, and `rollbar_id`
- `📸 safesnapshot` / `mergesnapshot` lines — storage snapshots with `storage_id` and the sync `update` payload
- Regular named events with `extra` JSON

Read it looking for: the time window matching the user's description, errors near that window, and suspicious event sequences (e.g. repeated syncs, unexpected screen flows). Quick error scan:

```bash
grep -B 3 -A 3 "❌ \*\*ERROR\*\*" .tmp/debug-<userid>/events.md
```

## Step 3: Fetch targeted data based on the issue

### Server-side behavior (sync, payments, API errors)

Server logs for the relevant date(s). The script writes `logs-<date>-<userid>.txt` into the project root:

```bash
npm run r ./lambda/scripts/get_logs.ts <YYYY-MM-DD> <userid>
mv logs-<YYYY-MM-DD>-<userid>.txt .tmp/debug-<userid>/
```

These can be large — don't read whole files; grep around the timestamps identified from events.md.

### State/data issues (wrong weights, missing history, broken program)

Current storage:

```bash
npm run r ./lambda/scripts/get_user_storage.ts <userid> > .tmp/debug-<userid>/storage-raw.txt
```

Extract the JSON object from the surrounding stdout noise into `storage.json`, then query with `jq` (storages are big — don't read whole):

```bash
jq '{version: .storage.version, programs: [.storage.programs[].name], historyCount: (.storage.history | length)}' .tmp/debug-<userid>/storage.json
```

Useful shapes: `.history[]` (workouts, newest first), `.programs[]`, `.settings` (units, equipment, gyms), `.stats`.

### "It was fine before X" (data corrupted or lost at some point)

Diff storage snapshots from before and after the suspect moment. Snapshot ids come from the 📸 lines in events.md:

```bash
npm run r ./lambda/scripts/get_storage_from_snapshot.ts <userid> <storage_id> > .tmp/debug-<userid>/snapshot-<storage_id>.txt
```

Note: this prints via `util.inspect` (JS object notation, possibly ANSI-colored), not JSON. Compare targeted fields between snapshots rather than diffing whole files.

## Step 4: Rollbar errors for the user

**Primary path — from events.md.** `❌ ERROR` lines include `rollbar_id`. For errors near the issue window:

```bash
curl -sS -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/instance/<ROLLBAR_ID>" \
  -o .tmp/debug-<userid>/rollbar-<ROLLBAR_ID>.json
```

Drill down like `/fix-rollbar` does:

```bash
jq -r '.result.item_id, .result.data.liftosaur_exception_id, .result.data.timestamp' .tmp/debug-<userid>/rollbar-<ROLLBAR_ID>.json
```

If `liftosaur_exception_id` is non-null, fetch the captured state/actions:

```bash
npm run r ./lambda/scripts/get_exception.ts <EXCEPTION_ID> > .tmp/debug-<userid>/exception-<EXCEPTION_ID>.json
jq -r '.data' .tmp/debug-<userid>/exception-<EXCEPTION_ID>.json | jq '.lastActions | fromjson | .[-10:]'
jq -r '.data' .tmp/debug-<userid>/exception-<EXCEPTION_ID>.json | jq '.lastState | fromjson | {screenStack, progressCount: (.storage.progress | length)}'
```

**Fallback — when events.md shows no errors but you suspect a crash.** RQL is unavailable on the current Rollbar plan; instead page recent occurrences and filter by person (20 per page, only practical for recent crashes — scan ~10–20 pages max):

```bash
for page in 1 2 3 4 5 6 7 8 9 10; do
  curl -sS -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
    "https://api.rollbar.com/api/1/instances?page=$page" |
    jq -r '.result.instances[] | select(.data.person.id == "<userid>") |
      "\(.id) \(.timestamp) \(.data.body.trace.exception.message // .data.body.message.body // .data.body.trace_chain[0].exception.message // "?")"'
done
```

Matching ids are occurrence ids — feed them back into the primary path above.

## Step 5: Correlate and explain

Cross-reference events, server logs, storage, and Rollbar data against the user's description and the relevant source code. Key files:

- `src/types.ts` — IStorage, IProgram, IHistoryRecord
- `src/models/state.ts` — IState
- `src/ducks/reducer.ts`, `src/ducks/thunks.ts` — state transitions and sync
- `lambda/index.ts` — server endpoints

Produce a root-cause explanation citing specific evidence (event lines, log entries, storage fields), plus a proposed fix when the cause is clear.

## Step 6: If inconclusive — instrument with lgDebug

`lgDebug(name, userId, extra?)` from `src/utils/posthog.ts` logs an event **only** when the running client's tempUserId matches — safe to ship for a single user, works on web and native.

1. Add `lgDebug("descriptive-event-name", "<userid>", { key: value })` calls at the suspect code paths, capturing the values that would confirm or refute each hypothesis.
2. Stop and hand off: summarize what was added, where, which hypothesis each call tests, and what to look for in the events afterwards. The developer deploys.
3. After the user reproduces the issue, re-run Step 2 — the new events appear in `events.md`.
4. When the investigation concludes, remind the developer to remove the `lgDebug` calls.
