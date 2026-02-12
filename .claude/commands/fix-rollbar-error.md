# Fix Rollbar Exception

Fix a production exception from Rollbar. The occurrence ID is: $ARGUMENTS

## Running in Headless Mode

To run this command non-interactively with full permissions:
```bash
claude -p "/fix-rollbar-error $ARGUMENTS" --settings .claude/settings.headless.json
```

## Bash Command Guidelines

To avoid permission issues in headless mode:
- **Don't chain commands** with `&&` - run each command separately
- **For commit messages**: write to a file first, then use `git commit -F <file>` instead of `-m`

## Prerequisites

Required environment variables:
- `ROLLBAR_READ_TOKEN` - Rollbar project read token (Settings -> Project Access Tokens)
- `GH_TOKEN_AI` - GitHub PAT for the `astashovai` bot account (fine-grained, scoped to the fork `astashovai/liftosaur`)

## Fork-Based Workflow

All pushes go to the fork `astashovai/liftosaur`, and PRs are created cross-fork to `astashov/liftosaur`. Ensure the fork remote exists:
```bash
git remote add fork "https://astashovai:${GH_TOKEN_AI}@github.com/astashovai/liftosaur.git" 2>/dev/null || true
```

## Important: Worktrees as Subdirectories

Worktrees are created inside the main project (`./worktrees/`) to avoid Claude Code's directory permission issues.
The `worktrees/` directory is gitignored.

## Steps

### 1. Create Isolated Worktree

Create a separate working directory to avoid disrupting ongoing development.

First, clean up any existing worktree/branch from a previous run:
```bash
git worktree remove ./worktrees/$ARGUMENTS 2>/dev/null || true
git branch -D fix/rollbar-$ARGUMENTS 2>/dev/null || true
```

Then create fresh:
```bash
git worktree add ./worktrees/$ARGUMENTS -b fix/rollbar-$ARGUMENTS master
npm install --prefix ./worktrees/$ARGUMENTS
```

Copy gitignored config file needed for builds:
```bash
cp ./localdomain.js ./worktrees/$ARGUMENTS/localdomain.js
```

### 2. Fetch Rollbar Occurrence

Get the occurrence details from Rollbar API. Save to a temp file to avoid large output issues:

```bash
install -d ./worktrees/$ARGUMENTS/.tmp
curl -s -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/instance/$ARGUMENTS" \
  -o ./worktrees/$ARGUMENTS/.tmp/rollbar.json
```

Extract the Rollbar item counter (the short number from the Rollbar URL, e.g. `3190` in `/item/liftosaur/3190/`). First get the internal item ID:
```bash
jq -r '.result.item_id' ./worktrees/$ARGUMENTS/.tmp/rollbar.json
```

Then fetch the item details using that ID to get the counter:
```bash
curl -s -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/item/{item_id}" \
  -o ./worktrees/$ARGUMENTS/.tmp/item.json
```
```bash
jq -r '.result.counter' ./worktrees/$ARGUMENTS/.tmp/item.json
```
Save this counter — you will need it for the PR title in Step 11.

Extract key information using jq:
```bash
jq -r '.result.data | {liftosaur_exception_id, person, body}' ./worktrees/$ARGUMENTS/.tmp/rollbar.json
```

Look for:
- Exception message and type in `body.trace.exception`
- Stack trace in `body.trace.frames`
- `liftosaur_exception_id` - the ID to fetch user state
- Environment, timestamp, browser info
- Browser/client info in `client` field

### 3. Download User State and Actions

Using the `liftosaur_exception_id` from step 2, fetch exception data.

**IMPORTANT:** Use `api3.liftosaur.com` (not `api.liftosaur.com`):

```bash
curl -s "https://api3.liftosaur.com/api/exception/{liftosaur_exception_id}" \
  -o ./worktrees/$ARGUMENTS/.tmp/exception.json
```

The response has nested JSON that needs double-parsing. Use `tee` to save parsed files:
```bash
# Extract and parse lastActions (save to file, show last 10)
jq -r '.data.data' ./worktrees/$ARGUMENTS/.tmp/exception.json | jq '.lastActions | fromjson' | tee ./worktrees/$ARGUMENTS/.tmp/lastActions.json | jq '.[-10:]'

# Extract and parse lastState (save to file, show summary)
jq -r '.data.data' ./worktrees/$ARGUMENTS/.tmp/exception.json | jq '.lastState | fromjson' | tee ./worktrees/$ARGUMENTS/.tmp/lastState.json | jq '{screenStack, progressCount: (.storage.progress | length)}'
```

The parsed data contains:
- `lastState` - Full IState object (see src/models/state.ts:109), contains:
  - `storage` - User's IStorage (programs, history, settings, etc.)
  - `screenStack` - Current navigation state
  - `progress` - In-progress workout data (array, may be empty if workout finished)
- `lastActions` - Array of recent Redux actions that led to the error (reverse chronological - newest first)

### 4. Fetch User Events Timeline

Get the user's event log to see what happened around the error. The user ID is in `person.id` from the Rollbar response:

```bash
curl -s "http://${SIDECAR_URL:-localhost:9888}/user_events_markdown?userid={userid}" | jq -r '.stdout' | tee ./worktrees/$ARGUMENTS/.tmp/user_events.md | grep -B 5 -A 5 "❌ \*\*ERROR\*\*"
```

This shows:
- The exact sequence of user actions leading to the error
- Whether the error is recurring (multiple errors for same action)
- Context about what the user was doing (which screen, what buttons clicked)

### 5. Download Server Logs (if needed)

If the error involves a server-side request (API call, sync, login, etc.) and you need more context about what happened on the backend, download the server logs.

Extract the occurrence timestamp and user ID from the Rollbar data:
```bash
jq -r '.result.data | {timestamp, person_id: .person.id}' ./worktrees/$ARGUMENTS/.tmp/rollbar.json
```

Convert the Unix timestamp to a date (YYYY-MM-DD format) and run:
```bash
curl -s "http://${SIDECAR_URL:-localhost:9888}/get_logs?date={YYYY-MM-DD}&userid={userid}" | jq -r '.stdout' > ./worktrees/$ARGUMENTS/.tmp/server_logs.txt
```

The output can be large, so don't read the whole thing. Instead, use the occurrence timestamp to find the relevant section — search for log entries around that time and read only the surrounding context.

### 6. Analyze and Decide

First, check the environment from the Rollbar data:
```bash
jq -r '.result.data.environment' ./worktrees/$ARGUMENTS/.tmp/rollbar.json
```

**SKIP entirely if the environment is NOT `production` or `prod-lambda`.** Android errors and other non-webapp environments are out of scope — do not fix or add to ignore list. Clean up the worktree (Step 12) and stop.

With the stack trace, state, actions, and user events, **decide if this error is worth fixing**.

**IGNORE the error (add to ignore list) if:**
- Error originates from a browser extension (stack trace mentions `chrome-extension://`, `moz-extension://`, etc.)
- Error is from an unsupported/ancient browser (check `client.browser` in Rollbar data)
- Error message is generic and not actionable (e.g., "Script error" with no stack trace)
- Error is from third-party scripts we don't control
- Error is a known browser quirk or race condition that doesn't affect functionality
- Network-related transient errors (fetch failures, timeouts) that are already handled gracefully
- Error only affects a tiny fraction of users with unusual setups

**FIX the error if:**
- Error is in our code and affects normal user flows
- Error is reproducible based on the state and actions
- Error causes data loss or corrupted state
- Error blocks users from completing workouts or core features
- Error is happening frequently (check user events for pattern)

**Proceed to Step 7 if ignoring, or Step 8 if fixing.**

Key files for reference:
- `src/types.ts` - Core type definitions (IStorage, IProgram, IHistoryRecord, etc.)
- `src/models/state.ts` - IState definition
- `src/ducks/reducer.ts` - Redux reducer handling actions
- `src/ducks/thunks.ts` - Async actions

### 7. Add to Ignore List (if not worth fixing)

If you decided the error should be ignored, add it to the `exceptionIgnores` array in `./worktrees/$ARGUMENTS/src/utils/rollbar.ts`:

```typescript
export const exceptionIgnores = [
  "Script error",
  "Failed to fetch",
  // ... existing ignores ...
  "Your new ignore string here",  // Add a unique, identifying part of the error message
];
```

**Guidelines for ignore strings:**
- Use the most specific/unique part of the error message
- Don't be too broad (avoid ignoring legitimate errors)
- Add a comment if the ignore reason isn't obvious

Then proceed to Step 9 (Build and Test).

### 8. Fix the Bug (if worth fixing)

Based on analysis:
1. Identify root cause
2. Create a fix that handles the edge case
3. Ensure the fix doesn't break other scenarios
4. Keep the fix minimal and focused
5. If the fix involves non-trivial logic, add a unit test that reproduces the bug and verifies the fix. Look at existing tests nearby for conventions.

All edits should be in `./worktrees/$ARGUMENTS/src/...`

### 9. Build, Lint, and Unit Tests

```bash
npm run build:prepare --prefix ./worktrees/$ARGUMENTS
```
```bash
npx tsc --noEmit --project ./worktrees/$ARGUMENTS/tsconfig.json
```
```bash
npm run lint --prefix ./worktrees/$ARGUMENTS
```

If there are type errors, lint errors, or formatting issues, fix them before proceeding.

```bash
npm test --prefix ./worktrees/$ARGUMENTS
```

### 10. Playwright E2E Tests

**This step is required — do NOT skip it.**

The webpack-dev-server (:8080) and devserver (:3000) are already running on the host as LaunchD services. Do NOT start or stop them.

Run Playwright:
```bash
npm run playwright --prefix ./worktrees/$ARGUMENTS
```

Note: The `subscriptions.spec.ts` test may be flaky — failures there can be ignored if unrelated to your changes.

### 11. Create Pull Request

From the worktree directory:

```bash
git -C ./worktrees/$ARGUMENTS add <changed-files>
```

Write commit message to file using the Write tool at `./worktrees/$ARGUMENTS/.tmp/commit-msg.txt`.
Use the Rollbar item counter extracted in Step 2 as ITEM_COUNTER:
```
fix-rollbar (ITEM_COUNTER/$ARGUMENTS): <brief description>
```

Then commit using the file (note the `--author` flag for the bot account):
```bash
git -C ./worktrees/$ARGUMENTS commit --author="astashovai <astashovai@users.noreply.github.com>" -F ./worktrees/$ARGUMENTS/.tmp/commit-msg.txt
```

Push to the fork and create a cross-fork PR to the main repo:
```bash
GH_TOKEN=$GH_TOKEN_AI git -C ./worktrees/$ARGUMENTS push -u fork fix/rollbar-$ARGUMENTS
GH_TOKEN=$GH_TOKEN_AI gh pr create --repo astashov/liftosaur --head astashovai:fix/rollbar-$ARGUMENTS --title "fix-rollbar (ITEM_COUNTER/$ARGUMENTS): <brief description>" --body "## Summary
- <bullet points of changes>

## Rollbar
https://app.rollbar.com/a/astashov/fix/item/liftosaur/ITEM_COUNTER/occurrence/$ARGUMENTS

## Decision
<Why this was fixed OR why this was added to ignore list>

## Root Cause
<What caused this error>

## Test plan
- [ ] <test steps>"
```

**Important:** Replace ITEM_COUNTER with the actual Rollbar item counter from Step 2 in the commit message, PR title, and Rollbar link in the PR body.

### 12. Cleanup

After PR is created, remove worktree:

```bash
git worktree remove ./worktrees/$ARGUMENTS
```
