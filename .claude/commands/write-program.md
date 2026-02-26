# Write Weightlifting Program

Write a weightlifting program and create a PR for it.

`$ARGUMENTS` is either:
- `<name>` — derive SLUG by slugifying the name (lowercase, replace non-alphanumeric runs with `-`, strip leading/trailing `-`)
- `<slug> <name>` — if the first word contains only `[a-z0-9-]`, treat it as a pre-computed SLUG and the rest as the program name

Store the program name as NAME and the slug as SLUG for use in all subsequent steps.

## Running in Headless Mode

To run this command non-interactively with full permissions:
```bash
claude -p "/write-program <slug> <name>" --settings .claude/settings.headless.json
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

### 1. Create Isolated Worktree

First, clean up any existing worktree/branch from a previous run:
```bash
git worktree remove ./worktrees/SLUG 2>/dev/null || true
git branch -D add-program/SLUG 2>/dev/null || true
```

Then create fresh:
```bash
git worktree add ./worktrees/SLUG -b add-program/SLUG master
npm install --prefix ./worktrees/SLUG
```

Copy gitignored config file needed for builds:
```bash
cp ./localdomain.js ./worktrees/SLUG/localdomain.js
```

### 2. Learn Liftoscript

Read `.claude/skills/liftoscript/SKILL.md` for idiomatic patterns, then read the full reference files it points to.

### 3. Write the Program

Follow ALL instructions from `.claude/commands/describe-program.md` (read it first!) — research phase, output format, description sections, validation, quality checks, everything.

The only difference: write all files into the worktree instead of the repo root:
- Write the program file to `./worktrees/SLUG/programs/builtin/SLUG.md`
- Validate with: `TS_NODE_TRANSPILE_ONLY=1 npx ts-node ./worktrees/SLUG/lambda/scripts/validate_liftoscript.ts ./worktrees/SLUG/programs/builtin/SLUG.md`
- Reference files (`llms/liftoscript.md`, `llms/liftoscript_examples.md`, `llms/exercises.md`, `programs/builtin/`) can be read from the repo root — same content.

### 4. Remove from PROGRAMSTODO.md

Remove the exact line matching `NAME` from `./worktrees/SLUG/PROGRAMSTODO.md`.

### 5. Build Programs

```bash
npm run build:programs --prefix ./worktrees/SLUG
```

If it fails, fix the issue and re-run.

### 6. Create Pull Request

```bash
git -C ./worktrees/SLUG add programs/builtin/SLUG.md PROGRAMSTODO.md
```

Write commit message to file using the Write tool at `./worktrees/SLUG/.tmp/commit-msg.txt`:
```
add-program: NAME
```

Then commit:
```bash
install -d ./worktrees/SLUG/.tmp
```
```bash
git -C ./worktrees/SLUG commit --author="astashovai <astashovai@users.noreply.github.com>" -F ./worktrees/SLUG/.tmp/commit-msg.txt
```

Push to the fork and create a cross-fork PR:
```bash
GH_TOKEN=$GH_TOKEN_AI git -C ./worktrees/SLUG push -u fork add-program/SLUG
```
```bash
GH_TOKEN=$GH_TOKEN_AI gh pr create --repo astashov/liftosaur --head astashovai:add-program/SLUG --title "add-program: NAME" --body "## Summary
- Add built-in program: NAME

## Description
<1-2 sentence summary of what this program is and who it's for>

## Test plan
- [ ] Liftoscript validates without errors
- [ ] build:programs passes"
```

### 7. Cleanup

After PR is created, remove worktree:

```bash
git worktree remove ./worktrees/SLUG
```
