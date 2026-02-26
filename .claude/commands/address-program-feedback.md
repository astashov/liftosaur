# Address Program PR Feedback

Address review comments on a program PR. The PR number is: $ARGUMENTS

## Running in Headless Mode

To run this command non-interactively with full permissions:
```bash
claude -p "/address-program-feedback $ARGUMENTS" --settings .claude/settings.headless.json
```

## Bash Command Guidelines

To avoid permission issues in headless mode:
- **Don't chain commands** with `&&` - run each command separately
- **For commit messages**: write to a file first, then use `git commit -F <file>` instead of `-m`

## Prerequisites

Required environment variables:
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

### 1. Fetch PR Details

Get the PR metadata and current diff:

```bash
gh pr view $ARGUMENTS --repo astashov/liftosaur --json title,body,headRefName,baseRefName,commits
```

```bash
gh pr diff $ARGUMENTS --repo astashov/liftosaur
```

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

First, fetch the latest from the fork (PR branches live on the fork):
```bash
git fetch fork {headRefName}
```

Clean up any existing worktree at this path, then create one from the PR branch:
```bash
git worktree remove ./worktrees/pr-$ARGUMENTS 2>/dev/null || true
```

```bash
git worktree add ./worktrees/pr-$ARGUMENTS fork/{headRefName}
```

```bash
npm install --prefix ./worktrees/pr-$ARGUMENTS
```

Copy gitignored config file needed for builds:
```bash
cp ./localdomain.js ./worktrees/pr-$ARGUMENTS/localdomain.js
```

### 4. Learn Liftoscript

Read `@.claude/skills/liftoscript` for idiomatic patterns, then read the full reference files it points to.

### 5. Read the Program File

Find and read the program file from the PR diff. It will be at `./worktrees/pr-$ARGUMENTS/programs/builtin/{slug}.md`.

### 6. Make Requested Changes

Based on the review comments:
1. Identify what changes are being requested
2. Make the changes in the worktree (`./worktrees/pr-$ARGUMENTS/...`)
3. Keep changes minimal and focused on what was requested

### 7. Re-Validate Liftoscript

```bash
TS_NODE_TRANSPILE_ONLY=1 npx ts-node ./worktrees/pr-$ARGUMENTS/lambda/scripts/validate_liftoscript.ts ./worktrees/pr-$ARGUMENTS/programs/builtin/{slug}.md
```

If validation fails, fix the Liftoscript code and re-validate until it passes.

### 8. Build Programs

```bash
npm run build:programs --prefix ./worktrees/pr-$ARGUMENTS
```

If it fails, fix the issue and re-run.

### 9. Commit and Push

```bash
git -C ./worktrees/pr-$ARGUMENTS add -A
```

Write commit message to file using the Write tool at `./worktrees/pr-$ARGUMENTS/.tmp/commit-msg.txt`:
```
address review feedback: <brief description of changes>
```

Then commit:
```bash
install -d ./worktrees/pr-$ARGUMENTS/.tmp
```
```bash
git -C ./worktrees/pr-$ARGUMENTS commit --author="astashovai <astashovai@users.noreply.github.com>" -F /Users/anton/projects/liftosaur/worktrees/pr-$ARGUMENTS/.tmp/commit-msg.txt
```

Push to the fork:
```bash
GH_TOKEN=$GH_TOKEN_AI git -C ./worktrees/pr-$ARGUMENTS push fork HEAD:{headRefName}
```

### 10. Reply on PR

Leave a comment on the PR summarizing what was addressed:

```bash
GH_TOKEN=$GH_TOKEN_AI gh pr comment $ARGUMENTS --repo astashov/liftosaur --body "## Feedback Addressed

<bullet points of what was changed in response to review comments>"
```

### 11. Cleanup

```bash
git worktree remove ./worktrees/pr-$ARGUMENTS
```
