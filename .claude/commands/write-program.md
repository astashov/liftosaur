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

This is the most important step. Follow ALL of the instructions below thoroughly.

All file paths below are relative to the worktree (`./worktrees/SLUG/`):
- Write the program file to `./worktrees/SLUG/programs/builtin/SLUG.md`
- Validate with: `TS_NODE_TRANSPILE_ONLY=1 npx ts-node ./worktrees/SLUG/scripts/validate_liftoscript.ts ./worktrees/SLUG/programs/builtin/SLUG.md`
- Reference files (`llms/liftoscript.md`, `llms/liftoscript_examples.md`, `llms/exercises.md`, `programs/builtin/`) can be read from the repo root — same content.

#### 3a. Research Phase (CRITICAL - Do This Thoroughly)

You MUST deeply research the program before writing anything. Program descriptions found online are often ambiguous, incomplete, or contradictory. Your job is to resolve all ambiguity by cross-referencing multiple sources.

**Step 1: Find the Original Source**
- Search for the original author's writeup (blog post, Reddit post, book, PDF)
- This is the primary authority. Fetch and read it completely.

**Step 2: Find the Spreadsheet**
- Search liftvault.com for the program spreadsheet (search: "site:liftvault.com [program name]")
- Spreadsheets are often the most precise source for exact sets/reps/percentages/progression
- Fetch and analyze the spreadsheet page - it usually has the actual numbers that blog posts gloss over

**Step 3: Cross-Reference with Community Sources**
- Search Reddit (/r/fitness, /r/weightroom, /r/gzcl, /r/531Discussion) for discussions. Use WebSearch to find relevant threads, then fetch their content with: `npm run r ./lambda/scripts/fetch_reddit.ts <reddit-url>` (do NOT use WebFetch on reddit.com — it blocks automated requests)
- Look for "program review" posts from people who actually ran it
- Look for common questions - these reveal where the original description was ambiguous
- Search for FAQ posts or wiki entries about the program

**Step 4: Resolve Ambiguities**
- Where sources disagree, prefer: original author > spreadsheet > community consensus > individual opinions
- If something is genuinely ambiguous (e.g., "do 3-5 sets" with no guidance on which), note it explicitly and give a practical recommendation
- If the program has been updated over time, describe the latest version but note major differences from older versions

You should fetch at LEAST 3-4 different sources before writing. More for complex programs.

#### 3b. Learning Liftoscript

Before writing Liftoscript code, you MUST read these files to understand the language and see high-quality examples:

1. `llms/liftoscript.md` — full language reference (syntax, progression types, templates, reuse patterns)
2. `llms/liftoscript_examples.md` — complete program examples (Basic Beginner, 5/3/1, GZCLP, nSuns, Madcow, etc.)
3. `llms/exercises.md` — full list of built-in exercises. Always prefer built-in exercises over custom ones.
4. Browse `programs/builtin/` for existing programs to match the expected format and quality level

Pay special attention to:
- Template/reuse patterns (`...main`, `...t1`) for DRY code
- `[1-N]` syntax for repeating exercises across weeks. `[5-6]` means "start from week 5 through week 6." **CRITICAL: `[1,3,5]` is NOT week selection** — commas in brackets are forced display ordering, not "only on these weeks." For exercises on non-contiguous weeks, define them explicitly in each week header.
- Superset syntax: `/ superset: groupName` groups exercises within a day. Same group name = same superset. Scope is per-day, so you can reuse group names across days.
- `dp()` for double progression — manages its own rep range, so NEVER use rep ranges in the set notation with `dp()` (e.g., `3x8 / progress: dp(5lb, 8, 12)` is correct, `3x8-12 / progress: dp(...)` is WRONG)
- `lp()` for linear progression
- `custom() {~ ~}` for complex progression logic
- Set variation syntax for stage-based progression
- How percentages, rest times, and weights are specified
- Starting weights: If the program uses 1RM percentages or RPE targets, use those notations. Otherwise, ALWAYS set a default starting weight for every exercise. Look up sensible defaults from `startingWeightLb` in `src/models/exercise.ts`.

#### 3c. Output Format

Write the description as a markdown file. The file must have YAML frontmatter and a description section ABOVE the `<!-- more -->` separator, followed by the full description, then a `<!-- faq -->` separator with FAQ content, and ending with a ```liftoscript code block.

**File Structure:**

```
---
id: program-id
name: "Program Name"
author: Author Name
url: "https://original-source-url"
shortDescription: One sentence summary
isMultiweek: true/false
tags: []
frequency: 3
age: "less_than_3_months"
duration: "45-60"
goal: "strength"
---

Valid values for `frequency`, `age`, `duration`, and `goal` are defined in `src/models/builtinPrograms.ts`. Pick values based on the program's characteristics.

One paragraph summary of the program (shown in program list previews).

<!-- more -->

[Full description with all sections below]

<!-- faq -->

### Question 1?

Answer text here.

### Question 2?

Answer text here.

```liftoscript
[program code]
`` `
```

**Exercise Reference Syntax:** When mentioning exercises in the description text, use this syntax: `[{Exercise Name}]` (e.g., `[{Squat}]`, `[{Bench Press}]`)

**Program Cross-Reference Syntax:** When mentioning other Liftosaur programs, link to them: `[Program Name](/programs/program-id)` (e.g., `[GZCLP](/programs/gzclp)`). Check existing programs in `programs/builtin/` for correct IDs. Only link to programs that exist.

#### 3d. Description Sections

Write in a clear, direct, authoritative tone. Avoid fluff and filler. Be specific with numbers (sets, reps, percentages, pounds) whenever possible.

**1. Origin & Philosophy**
- Who created it and when
- What problem it was designed to solve
- The core training philosophy or principle behind it
- Link to original source material

**2. Who It's For**
- Experience level: beginner (0-12 months), intermediate (1-3 years), advanced (3+ years)
- Prerequisites (minimum strength levels or gym experience)
- Primary goal: strength, hypertrophy, both, power, athletic performance
- Cut/bulk/maintenance suitability

**3. Pros & Cons**
Write as two bullet lists. Be specific and concrete.

**Pros** examples: "High frequency on main lifts (squat/bench 2x/week) builds technique fast", "Sessions take ~45 minutes"

**Cons** examples: "No direct arm work - you'll need to add your own", "Sessions can take 90+ minutes due to 9 working sets of T1"

Do NOT write vague pros/cons like "well-balanced" or "can be complex". Do NOT list "lack of exercise variety" as a con.

**4. Program Structure**
Do NOT include days per week, number of weeks per cycle, approximate session duration, or exercises per day — the app shows all of this in widgets.
- Split type: full body, upper/lower, PPL, bro split, etc.
- Periodization style: linear progression, linear periodization, undulating periodization (DUP/WUP), block periodization, conjugate, auto-regulated, etc.
- Whether it's a rotating schedule or fixed weekly
- What a typical week looks like (which days have which focus)

**5. Exercise Selection & Rationale**
Do NOT list sets/reps here — the program detail page has an interactive preview widget. Focus only on:
- WHY each exercise was chosen
- The logic behind exercise pairing across days
- Which exercises can be swapped and for what

**6. Set & Rep Scheme**
- Rep ranges for each category of exercise
- Intensity (% of 1RM, RPE, or rep max)
- Whether any sets are AMRAP and why
- Reasoning for the rep ranges chosen

**7. Progressive Overload**
- How and when weight increases (every session, every week, every cycle)
- Exact weight increments (e.g., 5lb upper, 10lb lower)
- What happens when you fail/stall
- Deload protocol if any
- Stages or phases if applicable

**8. How Long to Run It / What Next**
- Recommended duration
- Signs it's time to move on
- What programs to transition to afterward

**9. Equipment Needed**
- What equipment the program uses as written
- For machine/cable exercises, suggest free-weight or bodyweight substitutes

**10. Rest Times**
- Between sets for each exercise type/tier
- Between exercises if specified

**11. How to Pick Starting Weights**
- Method for determining initial weights (% of 1RM, RPE test, trial and error)
- Common mistake: starting too heavy
- How to find your 1RM if you don't know it

**12. Common Modifications**
- Popular exercise substitutions
- Adding accessories for weak points
- Day count variants if they exist
- Adaptations for different equipment availability

**13. FAQ Section (after `<!-- faq -->` separator)**

Write 5-8 frequently asked questions. Each question is an H3 (`### Question?`) followed by a paragraph answer.

How to find good questions:
- Search Reddit for "[program name] questions" or "[program name] help"
- Look at common confusions in program review threads
- Include basic questions ("Is X good for beginners?", "How many days?", "How long to run it?")
- Include program-specific questions about stalling, accessories, modifications

Guidelines:
- Questions should be how real people would ask them in Google
- Answers should be 2-4 sentences, direct and specific
- Include the program name in at least 2-3 questions for SEO
- Don't repeat information verbatim from the main description
- **Do NOT use exercise directives** (`[{Exercise Name}]`) in the FAQ section. Use plain capitalized exercise names instead (e.g., write "Squat" not `[{Squat}]`). The FAQ content generates structured data for Google search results, where directives won't render.

#### 3e. Validation Phase (CRITICAL - MUST DO)

After writing the full description with Liftoscript code, you MUST validate it.

**Save the file**, then run:
```bash
TS_NODE_TRANSPILE_ONLY=1 npx ts-node ./worktrees/SLUG/scripts/validate_liftoscript.ts ./worktrees/SLUG/programs/builtin/SLUG.md
```

If validation fails, fix the Liftoscript code based on the error message and re-validate. **Repeat until it passes.** Do NOT skip this step.

The validation script outputs:
1. **Approx Workout Duration Per Day** — sanity-check session length claims in your description
2. **Weekly Volume Per Muscle Group** — sanity-check the program and mention any glaring gaps in Pros & Cons

Do NOT add separate volume or duration sections — the app shows this data in widgets.

#### 3f. Writing Style

- Be direct and specific. "Add 5lb to bench press every successful session" not "progressively increase the weight over time"
- Use concrete numbers wherever possible
- When explaining WHY something is done, keep it to 1-2 sentences. Don't lecture.
- If the program has known issues or common criticisms, mention them honestly in the cons section
- Write for someone who knows basic gym terminology but doesn't know this specific program
- Do not pad sections with filler

#### 3g. Quality Checks

Before moving to step 4, verify:
- [ ] Liftoscript code validates successfully (no errors from validation script)
- [ ] Every section has specific numbers, not vague descriptions
- [ ] Pros and cons are concrete and actionable, not generic
- [ ] Exercise selection explains WHY, not just WHAT
- [ ] Progressive overload section covers both success AND failure cases
- [ ] The description would let someone understand the program without reading any other source
- [ ] All ambiguities from original sources have been resolved or explicitly called out
- [ ] Numbers match across sources (sets/reps in Liftoscript match the spreadsheet)
- [ ] All exercises used in Liftoscript are from the built-in list in `llms/exercises.md`
- [ ] Liftoscript uses appropriate patterns (templates, reuse, dp/lp/custom) — compare with examples in `llms/liftoscript_examples.md`

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
Get the commit hash for the preview link:
```bash
COMMIT_HASH=$(git -C ./worktrees/SLUG rev-parse HEAD)
```

```bash
GH_TOKEN=$GH_TOKEN_AI gh pr create --repo astashov/liftosaur --head astashovai:add-program/SLUG --title "add-program: NAME" --body "## Summary
- Add built-in program: NAME

## Description
<1-2 sentence summary of what this program is and who it's for>

## Preview
https://www.liftosaur.com/program-preview?user=astashovai&commit=${COMMIT_HASH}&program=SLUG

## Test plan
- [ ] Liftoscript validates without errors
- [ ] build:programs passes"
```

### 7. Cleanup

After PR is created, remove worktree:

```bash
git worktree remove ./worktrees/SLUG
```
