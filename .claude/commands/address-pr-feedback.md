# Address PR Feedback

Address review comments on a Rollbar fix PR. The PR number is: $ARGUMENTS

## Running in Headless Mode

To run this command non-interactively with full permissions:
```bash
claude -p "/address-pr-feedback $ARGUMENTS" --settings .claude/settings.headless.json
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

### 1. Fetch PR Details

Get the PR metadata and current diff:

```bash
gh pr view $ARGUMENTS --repo astashov/liftosaur --json title,body,headRefName,baseRefName,commits
```

```bash
gh pr diff $ARGUMENTS --repo astashov/liftosaur
```

Extract the **occurrence ID** from the branch name. The branch follows the pattern `fix/rollbar-{OCCURRENCE_ID}`.
Also extract the **Rollbar item ID** from the PR title, which follows the pattern `fix-rollbar (ITEM_ID/OCCURRENCE_ID): ...`.

### 2. Fetch Review Comments

Get all comments on the PR (both review comments and issue comments):

```bash
gh api repos/astashov/liftosaur/pulls/$ARGUMENTS/comments --jq '.[] | {id, path, line, body, created_at, user: .user.login}'
```

```bash
gh pr view $ARGUMENTS --repo astashov/liftosaur --json comments --jq '.comments[] | {body, author: .author.login, createdAt}'
```

These are the comments you need to address. Read them carefully and understand what changes are being requested.

### 3. Set Up Worktree

Extract the branch name from the PR metadata (the `headRefName` field from Step 1).

First, fetch the latest from origin:
```bash
git fetch origin {headRefName}
```

Clean up any existing worktree at this path, then create one from the PR branch:
```bash
git worktree remove ./worktrees/pr-$ARGUMENTS 2>/dev/null || true
```

```bash
git worktree add ./worktrees/pr-$ARGUMENTS origin/{headRefName}
```

```bash
npm install --prefix ./worktrees/pr-$ARGUMENTS
```

Copy gitignored config file needed for builds:
```bash
cp ./localdomain.js ./worktrees/pr-$ARGUMENTS/localdomain.js
```

### 4. Fetch Rollbar Context

Using the occurrence ID extracted from the branch name in Step 1, fetch the original error context. This may be needed to understand the full picture when addressing feedback.

```bash
install -d ./worktrees/pr-$ARGUMENTS/.tmp
```

```bash
curl -s -H "X-Rollbar-Access-Token: $ROLLBAR_READ_TOKEN" \
  "https://api.rollbar.com/api/1/instance/{OCCURRENCE_ID}" \
  -o ./worktrees/pr-$ARGUMENTS/.tmp/rollbar.json
```

Extract the Rollbar item ID:
```bash
jq -r '.result.item_id' ./worktrees/pr-$ARGUMENTS/.tmp/rollbar.json
```

Extract key information using jq:
```bash
jq -r '.result.data | {liftosaur_exception_id, person, body}' ./worktrees/pr-$ARGUMENTS/.tmp/rollbar.json
```

Look for:
- Exception message and type in `body.trace.exception`
- Stack trace in `body.trace.frames`
- `liftosaur_exception_id` - the ID to fetch user state
- Environment, timestamp, browser info
- Browser/client info in `client` field

### 5. Download User State and Actions

Using the `liftosaur_exception_id` from step 4, fetch exception data.

**IMPORTANT:** Use `api3.liftosaur.com` (not `api.liftosaur.com`):

```bash
curl -s "https://api3.liftosaur.com/api/exception/{liftosaur_exception_id}" \
  -o ./worktrees/pr-$ARGUMENTS/.tmp/exception.json
```

The response has nested JSON that needs double-parsing. Use `tee` to save parsed files:
```bash
# Extract and parse lastActions (save to file, show last 10)
jq -r '.data.data' ./worktrees/pr-$ARGUMENTS/.tmp/exception.json | jq '.lastActions | fromjson' | tee ./worktrees/pr-$ARGUMENTS/.tmp/lastActions.json | jq '.[-10:]'
```

```bash
# Extract and parse lastState (save to file, show summary)
jq -r '.data.data' ./worktrees/pr-$ARGUMENTS/.tmp/exception.json | jq '.lastState | fromjson' | tee ./worktrees/pr-$ARGUMENTS/.tmp/lastState.json | jq '{screenStack, progressCount: (.storage.progress | length)}'
```

The parsed data contains:
- `lastState` - Full IState object (see src/models/state.ts:109), contains:
  - `storage` - User's IStorage (programs, history, settings, etc.)
  - `screenStack` - Current navigation state
  - `progress` - In-progress workout data (array, may be empty if workout finished)
- `lastActions` - Array of recent Redux actions that led to the error (reverse chronological - newest first)

### 6. Fetch User Events Timeline

Get the user's event log to see what happened around the error. The user ID is in `person.id` from the Rollbar response:

```bash
npm run r ./lambda/scripts/user_events_markdown.ts {userid} 2>/dev/null | tee ./worktrees/pr-$ARGUMENTS/.tmp/user_events.md | grep -B 5 -A 5 "❌ \*\*ERROR\*\*"
```

This shows:
- The exact sequence of user actions leading to the error
- Whether the error is recurring (multiple errors for same action)
- Context about what the user was doing (which screen, what buttons clicked)

### 7. Understand the Current Fix

Read the files that were changed in the PR to understand the current state:

```bash
gh pr diff $ARGUMENTS --repo astashov/liftosaur --name-only
```

Read each changed file from the worktree (`./worktrees/pr-$ARGUMENTS/...`) to understand the existing fix.

Key files for reference:
- `src/types.ts` - Core type definitions (IStorage, IProgram, IHistoryRecord, etc.)
- `src/models/state.ts` - IState definition
- `src/ducks/reducer.ts` - Redux reducer handling actions
- `src/ducks/thunks.ts` - Async actions

### 8. Make Requested Changes

Based on the review comments and the full Rollbar context:
1. Identify what changes are being requested
2. Make the changes in the worktree (`./worktrees/pr-$ARGUMENTS/...`)
3. Keep changes minimal and focused on what was requested
4. Use the Rollbar error data, user state, and user events to inform your approach if the reviewer suggests a different fix strategy

### 9. Build and Test

Verify the changes:

```bash
npm run build --prefix ./worktrees/pr-$ARGUMENTS
```

```bash
npm test --prefix ./worktrees/pr-$ARGUMENTS
```

### 10. Commit and Push

```bash
git -C ./worktrees/pr-$ARGUMENTS add -A
```

Write commit message to file using the Write tool at `./worktrees/pr-$ARGUMENTS/.tmp/commit-msg.txt`:
```
address review feedback: <brief description of changes>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

```bash
git -C ./worktrees/pr-$ARGUMENTS commit -F ./worktrees/pr-$ARGUMENTS/.tmp/commit-msg.txt
```

```bash
git -C ./worktrees/pr-$ARGUMENTS push origin HEAD:{headRefName}
```

### 11. Reply on PR

Leave a comment on the PR summarizing what was addressed:

```bash
gh pr comment $ARGUMENTS --repo astashov/liftosaur --body "## Feedback Addressed

<bullet points of what was changed in response to review comments>

---
*Automated follow-up by Claude Code*"
```

### 12. Cleanup

```bash
git worktree remove ./worktrees/pr-$ARGUMENTS
```
