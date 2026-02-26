# Describe Weightlifting Program

Generate a clear, non-ambiguous description of a weightlifting program in markdown. The program is: $ARGUMENTS

## Research Phase (CRITICAL - Do This Thoroughly)

You MUST deeply research the program before writing anything. Program descriptions found online are often ambiguous, incomplete, or contradictory. Your job is to resolve all ambiguity by cross-referencing multiple sources.

### Step 1: Find the Original Source
- Search for the original author's writeup (blog post, Reddit post, book, PDF)
- This is the primary authority. Fetch and read it completely.

### Step 2: Find the Spreadsheet
- Search liftvault.com for the program spreadsheet (search: "site:liftvault.com [program name]")
- Spreadsheets are often the most precise source for exact sets/reps/percentages/progression
- Fetch and analyze the spreadsheet page - it usually has the actual numbers that blog posts gloss over

### Step 3: Cross-Reference with Community Sources
- Search Reddit (/r/fitness, /r/weightroom, /r/gzcl, /r/531Discussion) for discussions via WebSearch (do NOT use WebFetch on reddit.com — it blocks automated requests)
- Look for "program review" posts from people who actually ran it
- Look for common questions - these reveal where the original description was ambiguous
- Search for FAQ posts or wiki entries about the program

### Step 4: Resolve Ambiguities
- Where sources disagree, prefer: original author > spreadsheet > community consensus > individual opinions
- If something is genuinely ambiguous (e.g., "do 3-5 sets" with no guidance on which), note it explicitly and give a practical recommendation
- If the program has been updated over time, describe the latest version but note major differences from older versions

You should fetch at LEAST 3-4 different sources before writing. More for complex programs.

## Learning Liftoscript

Before writing Liftoscript code, you MUST read these files to understand the language and see high-quality examples:

1. `llms/liftoscript.md` — full language reference (syntax, progression types, templates, reuse patterns)
2. `llms/liftoscript_examples.md` — complete program examples (Basic Beginner, 5/3/1, GZCLP, nSuns, Madcow, etc.)
3. `llms/exercises.md` — full list of built-in exercises. Always prefer built-in exercises over custom ones.
4. Browse `programs/builtin/` for existing programs to match the expected format and quality level

Pay special attention to:
- Template/reuse patterns (`...main`, `...t1`) for DRY code
- `[1-N]` syntax for repeating exercises across weeks
- `dp()` for double progression — manages its own rep range, so NEVER use rep ranges in the set notation with `dp()` (e.g., `3x8 / progress: dp(5lb, 8, 12)` is correct, `3x8-12 / progress: dp(...)` is WRONG)
- `lp()` for linear progression
- `custom() {~ ~}` for complex progression logic
- Set variation syntax for stage-based progression
- How percentages, rest times, and weights are specified
- Starting weights: If the program uses 1RM percentages or RPE targets, use those notations. Otherwise, ALWAYS set a default starting weight for every exercise. Look up sensible defaults from `startingWeightLb` in `src/models/exercise.ts`.

## Output Format

Write the description as a markdown file. The file must have YAML frontmatter and a description section ABOVE the `<!-- more -->` separator, followed by the full description, then a `<!-- faq -->` separator with FAQ content, and ending with a ```liftoscript code block.

### File Structure

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

### Exercise Reference Syntax

When mentioning exercises in the description text, use this syntax: `[{Exercise Name}]`

For example: `[{Squat}]`, `[{Bench Press}]`, `[{Romanian Deadlift}]`

### Program Cross-Reference Syntax

When mentioning other Liftosaur programs in the description text, always link to them using internal links. Use markdown link syntax with the program's URL path:

`[Program Name](/programs/program-id)`

For example: `[GZCLP](/programs/gzclp)`, `[5/3/1: Boring But Big](/programs/the531bbb)`, `[The Rippler](/programs/gzcl-the-rippler)`

Check the existing programs in `programs/builtin/` to find the correct `id` from their YAML frontmatter. Only link to programs that exist in the app — do not link to external programs that aren't built in.

This applies everywhere a program is mentioned: body text, transition recommendations, FAQ answers, pros/cons, etc.

### Description Sections

Write in a clear, direct, authoritative tone. Avoid fluff and filler. Be specific with numbers (sets, reps, percentages, pounds) whenever possible.

#### 1. Origin & Philosophy
- Who created it and when
- What problem it was designed to solve
- The core training philosophy or principle behind it (e.g., GZCL's tiered approach, Wendler's "start light, progress slow", etc.)
- Link to original source material

#### 2. Who It's For
- Experience level: beginner (0-12 months), intermediate (1-3 years), advanced (3+ years)
- Prerequisites (minimum strength levels or gym experience)
- Primary goal: strength, hypertrophy, both, power, athletic performance
- Cut/bulk/maintenance suitability

#### 3. Pros & Cons
Write as two bullet lists.

**Pros** - specific, concrete advantages. Examples:
- "High frequency on main lifts (squat/bench 2x/week) builds technique fast"
- "Auto-regulated progression means you won't stall as often as linear programs"
- "Sessions take ~45 minutes"

**Cons** - specific, concrete disadvantages. Examples:
- "No direct arm work - you'll need to add your own"
- "Sessions can take 90+ minutes due to 9 working sets of T1"
- "Rotating schedule doesn't fit a fixed Mon/Wed/Fri routine"

Do NOT write vague pros/cons like "well-balanced" or "can be complex". Be specific about WHY.

Do NOT list "lack of exercise variety" as a con. Repeating the same exercises is how you build technique, track progressive overload, and get stronger. Every proven program (5/3/1, GZCLP, Starting Strength) repeats the same lifts. Exercise variety is not required for hypertrophy — progressive overload is.

#### 4. Program Structure
Do NOT include days per week, number of weeks per cycle, approximate session duration, or exercises per day — the app shows all of this in widgets on the program detail page.
- Split type: full body, upper/lower, PPL, bro split, etc.
- Periodization style: linear progression, linear periodization, undulating periodization (DUP/WUP), block periodization, conjugate, auto-regulated, etc.
- Whether it's a rotating schedule or fixed weekly
- What a typical week looks like (which days have which focus)

#### 5. Exercise Selection & Rationale
Do NOT list sets/reps here — the program detail page has an interactive preview widget that shows the full exercise/sets/reps breakdown. Focus only on:
- WHY each exercise was chosen (movement pattern, muscle group, how it supports the main lifts)
- The logic behind exercise pairing across days (e.g., back squat on power day → front squat on hypertrophy day)
- Which exercises can be swapped and for what

#### 6. Set & Rep Scheme
- Describe the rep ranges used for each category of exercise (e.g., "power compounds: 3-5 reps", "hypertrophy accessories: 8-12 reps")
- Intensity (% of 1RM, RPE, or rep max)
- Whether any sets are AMRAP and why
- Explain the reasoning: why these rep ranges were chosen (strength adaptation at 1-5, hypertrophy at 6-12, endurance at 12+)

#### 7. Progressive Overload
- How and when weight increases (every session, every week, every cycle)
- Exact weight increments (e.g., 5lb upper, 10lb lower)
- What happens when you fail/stall
- Deload protocol if any
- Stages or phases if applicable (like GZCLP's stage system)

#### 8. How Long to Run It / What Next
- Recommended duration
- Signs it's time to move on (stalling frequently, etc.)
- What programs to transition to afterward

#### 9. Equipment Needed
- What equipment the program uses as written
- For any machine or cable exercise, suggest a free-weight or bodyweight substitute so the program can be run in a home gym (e.g., lat pulldown → pull-up, leg press → Bulgarian split squat, cable row → dumbbell row)

#### 10. Rest Times
- Between sets for each exercise type/tier
- Between exercises if specified

#### 11. How to Pick Starting Weights
- Method for determining initial weights (% of 1RM, RPE test, trial and error)
- Common mistake: starting too heavy
- How to find your 1RM if you don't know it

#### 12. Common Modifications
- Popular exercise substitutions
- Adding accessories for weak points
- 3-day vs 4-day vs 5-day variants if they exist
- Adaptations for different equipment availability

#### 13. FAQ Section (after `<!-- faq -->` separator)

Write 5-8 frequently asked questions about the program. These generate FAQPage structured data (JSON-LD) which produces expandable FAQ rich snippets in Google search results.

**Format:** Each question is an H3 (`### Question?`) followed by a paragraph answer. Place after the `<!-- faq -->` separator and before the liftoscript code block.

**How to find good questions:**
- Search Reddit for "[program name] questions" or "[program name] help"
- Look at common confusions in program review threads
- Check what people ask in r/fitness, r/weightroom, r/gzcl, etc.
- Include the most basic questions ("Is X good for beginners?", "How many days?", "How long to run it?")
- Include program-specific questions about stalling, accessories, modifications

**Guidelines:**
- Questions should be how real people would ask them in Google (e.g., "Is GZCLP good for beginners?" not "Suitability for novice trainees")
- Answers should be 2-4 sentences, direct and specific
- Include the program name in at least 2-3 questions for SEO
- Don't repeat information verbatim from the main description — rephrase and summarize

## Validation Phase (AFTER Writing)

After writing the full description with Liftoscript code, you MUST validate it:

### Step 1: Save the file
Write the complete markdown file to `programs/builtin/<program-id>.md`.

### Step 2: Validate
Run:
```bash
TS_NODE_TRANSPILE_ONLY=1 npx ts-node lambda/scripts/validate_liftoscript.ts programs/builtin/<program-id>.md
```

### Step 3: Handle validation errors
If validation fails, fix the Liftoscript code based on the error message and re-validate. Repeat until it passes.

The validation script outputs two pieces of feedback:

1. **Approx Workout Duration Per Day** — use this to sanity-check session length claims in your description (e.g., if you mention "quick sessions" but the script says 75+ min, fix it).
2. **Weekly Volume Per Muscle Group** — use this to sanity-check the program and mention any glaring gaps (e.g., zero direct ab work) in the Pros & Cons section.

Do NOT add separate volume or duration sections — the app shows this data in widgets on the program detail page. Just use the data to verify your description is accurate.

## Writing Style

- Be direct and specific. "Add 5lb to bench press every successful session" not "progressively increase the weight over time"
- Use concrete numbers wherever possible
- When explaining WHY something is done, keep it to 1-2 sentences. Don't lecture.
- If the program has known issues or common criticisms, mention them honestly in the cons section
- Write for someone who knows basic gym terminology (sets, reps, 1RM, AMRAP) but doesn't know this specific program
- Do not pad sections with filler. If a section has 2 bullet points of real content, that's fine. Don't stretch it to 5.

## Quality Checks

Before finishing, verify:
- [ ] Liftoscript code validates successfully (no errors from validation script)
- [ ] Every section has specific numbers, not vague descriptions
- [ ] Pros and cons are concrete and actionable, not generic
- [ ] Exercise selection explains WHY, not just WHAT (no sets/reps tables — the widget handles that)
- [ ] Progressive overload section covers both success AND failure cases
- [ ] The description would let someone understand the program's approach without reading any other source
- [ ] All ambiguities from original sources have been resolved or explicitly called out
- [ ] Numbers match across sources (sets/reps in Liftoscript match the spreadsheet)
- [ ] All exercises used in Liftoscript are from the built-in list in `llms/exercises.md`
- [ ] Liftoscript uses appropriate patterns (templates, reuse, dp/lp/custom) — compare with examples in `llms/liftoscript_examples.md`
