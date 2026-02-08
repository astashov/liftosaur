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

Extract the Rollbar item ID (you will need this for the PR title in Step 9):
```bash
jq -r '.result.item_id' ./worktrees/$ARGUMENTS/.tmp/rollbar.json
```

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
# Save user events to file and search for errors
npm run r ./lambda/scripts/user_events_markdown.ts {userid} 2>/dev/null | tee ./worktrees/$ARGUMENTS/.tmp/user_events.md | grep -B 5 -A 5 "❌ \*\*ERROR\*\*"
```

This shows:
- The exact sequence of user actions leading to the error
- Whether the error is recurring (multiple errors for same action)
- Context about what the user was doing (which screen, what buttons clicked)

### 5. Analyze and Decide

With the stack trace, state, actions, and user events, first **decide if this error is worth fixing**.

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

**Proceed to Step 6 if ignoring, or Step 7 if fixing.**

Key files for reference:
- `src/types.ts` - Core type definitions (IStorage, IProgram, IHistoryRecord, etc.)
- `src/models/state.ts` - IState definition
- `src/ducks/reducer.ts` - Redux reducer handling actions
- `src/ducks/thunks.ts` - Async actions

### 6. Add to Ignore List (if not worth fixing)

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

Then proceed to Step 8 (Build and Test).

### 7. Fix the Bug (if worth fixing)

Based on analysis:
1. Identify root cause
2. Create a fix that handles the edge case
3. Ensure the fix doesn't break other scenarios
4. Keep the fix minimal and focused

All edits should be in `./worktrees/$ARGUMENTS/src/...`

### 8. Build and Test

Before creating PR, verify the changes:

```bash
# Build (also generates required files)
npm run build:prepare --prefix ./worktrees/$ARGUMENTS

# Run unit tests
npm test --prefix ./worktrees/$ARGUMENTS

# Run Playwright E2E tests (optional but recommended)
# First, kill any existing servers and start fresh:
pkill -f "webpack-dev-server" 2>/dev/null || true
pkill -f "ts-node-dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Start servers in background (from worktree)
npm start --prefix ./worktrees/$ARGUMENTS &
npm run start:server --prefix ./worktrees/$ARGUMENTS &
sleep 15  # Wait for servers to start

# Run E2E tests
npm run playwright --prefix ./worktrees/$ARGUMENTS
```

Note: The `subscriptions.spec.ts` test may be flaky - failures there can be ignored if unrelated to your changes.

### 9. Create Pull Request

From the worktree directory:

```bash
git -C ./worktrees/$ARGUMENTS add <changed-files>
```

Write commit message to file using the Write tool at `./worktrees/$ARGUMENTS/.tmp/commit-msg.txt`.
Use the Rollbar item ID extracted in Step 2 as ITEM_ID:
```
fix-rollbar (ITEM_ID/$ARGUMENTS): <brief description>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Then commit using the file:
```bash
git -C ./worktrees/$ARGUMENTS commit -F ./worktrees/$ARGUMENTS/.tmp/commit-msg.txt
```

```bash
git -C ./worktrees/$ARGUMENTS push -u origin fix/rollbar-$ARGUMENTS
gh pr create --repo astashov/liftosaur --head fix/rollbar-$ARGUMENTS --title "fix-rollbar (ITEM_ID/$ARGUMENTS): <brief description>" --body "## Summary
- <bullet points of changes>

## Decision
<Why this was fixed OR why this was added to ignore list>

## Root Cause
<What caused this error>

## Test plan
- [ ] <test steps>

🤖 Generated with [Claude Code](https://claude.ai/code)"
```

**Important:** Replace ITEM_ID with the actual Rollbar item ID from Step 2 in both the commit message and PR title.

### 10. Cleanup

After PR is created, kill background servers and remove worktree:

```bash
pkill -f "webpack-dev-server" 2>/dev/null || true
pkill -f "ts-node-dev" 2>/dev/null || true
git worktree remove ./worktrees/$ARGUMENTS
```
