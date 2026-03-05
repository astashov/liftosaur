# Describe Weightlifting Technique

Generate a clear, practical page about a weightlifting technique with copy-pasteable Liftoscript snippets. The technique is: $ARGUMENTS

## Research Phase (CRITICAL - Do This Thoroughly)

You MUST deeply research the technique before writing anything. Training technique advice found online is often vague, contradictory, or lacking practical implementation details. Your job is to resolve all ambiguity.

### Step 1: Find Authoritative Sources
- Search for the original description or the researcher/coach who popularized the technique
- Look for peer-reviewed research or well-known coaches' writeups (e.g., Mike Israetel, Greg Nuckols, Eric Helms)
- Fetch and read these sources completely

### Step 2: Find Practical Implementations
- Search for how real programs implement this technique
- Look at existing Liftosaur built-in programs in `programs/builtin/` to see if any use this technique
- Search Reddit (/r/fitness, /r/weightroom, /r/naturalbodybuilding) for practical application discussions. Use WebSearch to find relevant threads, then fetch their content with: `npm run r ./lambda/scripts/fetch_reddit.ts <reddit-url>` (do NOT use WebFetch on reddit.com — it blocks automated requests)

### Step 3: Cross-Reference
- Where sources disagree, prefer: peer-reviewed research > well-known coaches > community consensus > individual opinions
- If something is genuinely debated, note it explicitly and give a practical recommendation

You should fetch at LEAST 3-4 different sources before writing. More for complex techniques.

## Learning Liftoscript

Before writing Liftoscript snippets, you MUST read these files to understand the language:

1. `llms/liftoscript.md` — full language reference (syntax, progression types, templates, reuse patterns)
2. `llms/liftoscript_examples.md` — complete program examples
3. `llms/exercises.md` — full list of built-in exercises. Always prefer built-in exercises over custom ones.
4. Browse `programs/builtin/` for existing programs to see how techniques are implemented in practice

Pay special attention to:
- `progress: lp()` for linear progression
- `progress: dp()` for double progression — manages its own rep range, so NEVER use rep ranges in the set notation with `dp()` (e.g., `3x8 / progress: dp(5lb, 8, 12)` is correct, `3x8-12 / progress: dp(...)` is WRONG)
- `progress: custom() {~ ~}` for complex progression logic. **CRITICAL**: Progress fires once per exercise after **every workout day** that has it. In multi-day programs, `weights +=` applies to ALL days by default — you MUST guard with `dayInWeek` to prevent firing multiple times per week
- `update: custom() {~ ~}` for mid-workout adjustments (drop sets, back-off sets, etc.)
- Set variations for stage-based schemes
- `progress: sum()` for sum-of-reps progression
- Templates via `/ used: none` for reusable patterns
- Rest times: `20s`, `90s`, `120s`
- AMRAP sets: `1x5+`
- RPE: `3x5 @8`

## Output Format

Write the technique page as a markdown file with YAML frontmatter.

### File Structure

```
---
slug: technique-slug
name: "Technique Name"
shortDescription: One sentence summary of the technique
category: "set-technique" or "progression-method"
relatedTechniques:
  - related-slug-1
  - related-slug-2
relatedPrograms:
  - program-id-1
  - program-id-2
---

One paragraph summary of the technique (shown in technique list previews).

<!-- more -->

[Full description with all sections below]

<!-- faq -->

### Question 1?

Answer text here.

### Question 2?

Answer text here.
```

### Frontmatter Fields

- `slug`: URL-safe identifier (e.g., `drop-sets`, `linear-progression`, `myo-reps`)
- `name`: Display name (e.g., "Drop Sets", "Linear Progression")
- `shortDescription`: One sentence, max ~120 chars
- `category`: Either `set-technique` or `progression-method`
- `relatedTechniques`: List of slugs for related technique pages (2-4 items)
- `relatedPrograms`: List of program IDs from `programs/builtin/` that use this technique. Check the actual program files to verify — do NOT guess.

### Exercise Reference Syntax

When mentioning exercises in the description text, use this syntax: `[{Exercise Name}]`

For example: `[{Squat}]`, `[{Bench Press}]`, `[{Romanian Deadlift}]`

### Program Cross-Reference Syntax

When mentioning Liftosaur programs, use markdown links: `[GZCLP](/programs/gzclp)`

Check the existing programs in `programs/builtin/` to find the correct `id`. Only link to programs that exist in the app.

### Technique Cross-Reference Syntax

When mentioning other techniques, use markdown links: `[Drop Sets](/techniques/drop-sets)`

### Description Sections

#### 1. What It Is
- 2-3 sentences defining the technique clearly
- If there's a formal name or origin, mention it briefly
- Don't pad with filler — get to the point

#### 2. When to Use / When Not to Use

Write as two sub-sections or a clear comparison.

**When to use:**
- What training goals it serves (strength, hypertrophy, endurance)
- Experience level requirements
- Where in a workout or program it fits best (main lifts, accessories, etc.)
- What training phase it suits (accumulation, peaking, deload, etc.)

**When not to use:**
- Situations where it's counterproductive or risky
- Common misapplications
- Who should avoid it (beginners, people with specific limitations)

Be specific. "Good for hypertrophy" is vague. "Effective for adding volume to isolation exercises without extending session length" is specific.

#### 3. Liftoscript Snippet

Provide ONE primary snippet that demonstrates the technique clearly. The snippet should be:
- A realistic, copy-pasteable exercise line (or small group of lines)
- Using a common exercise that makes sense for the technique
- Including the progression/update logic if applicable
- Self-contained — someone can paste it into their program

After the code block, add a brief walkthrough (3-5 bullet points max) explaining the key parts of the snippet. Focus on what's non-obvious — don't explain that `3x8` means 3 sets of 8 reps.

If the technique has important variations, add a second snippet showing the variation. No more than 2 snippets total.

#### 4. How to Combine with Other Techniques
- 2-3 practical examples of combining this technique with others
- Be specific: "Use linear progression on your main T1 lifts and drop sets for T3 accessories" not "can be combined with other methods"
- Mention which combinations to avoid if relevant

#### 5. Programs That Use This Technique
- List 2-5 built-in Liftosaur programs that use this technique
- For each, briefly explain how the program applies it (1 sentence)
- Link to each program page: `[Program Name](/programs/program-id)`
- CRITICAL: Actually check the program files in `programs/builtin/` to verify they use the technique. Do NOT fabricate connections.

#### 6. FAQ Section (after `<!-- faq -->` separator)

Write 3-5 frequently asked questions. These generate FAQPage structured data (JSON-LD) for Google search results.

**How to find good questions:**
- Search Reddit/forums for common questions about this technique
- Include the most basic questions ("What are drop sets?", "How many drop sets should I do?")
- Include practical questions about implementation

**Guidelines:**
- Questions should be how real people would ask them in Google
- Answers should be 2-4 sentences, direct and specific
- Include the technique name in at least 2-3 questions for SEO
- Don't repeat information verbatim from the main description — rephrase and summarize
- **Do NOT use exercise directives** (`[{Exercise Name}]`) in the FAQ section. Use plain capitalized exercise names instead. The FAQ generates structured data for Google, where directives won't render.

## Validation Phase (AFTER Writing)

After writing the full technique page:

### Step 1: Save the file
Write the complete markdown file to `techniques/<slug>.md`.

### Step 2: Verify Liftoscript syntax
Manually review the Liftoscript snippets against the language reference in `llms/liftoscript.md`. Check:
- Exercise names exist in `llms/exercises.md`
- Progression syntax is correct (`lp()`, `dp()`, `custom()`, `sum()`)
- `update: custom()` vs `progress: custom()` used correctly
- Set notation is valid
- State variables are properly declared in `custom()` parentheses

### Step 3: Verify program references
Check that every program listed in `relatedPrograms` actually exists in `programs/builtin/` and actually uses the technique described.

## Writing Style

Follow the full writing style guide in `.claude/skills/writing-style/SKILL.md`. Key points for technique pages:

- Be direct and specific. "Add 5lb each session you complete all reps" not "progressively increase the weight over time"
- Use concrete numbers wherever possible
- When explaining WHY something works, keep it to 1-2 sentences. Don't lecture.
- Write for someone who knows basic gym terminology (sets, reps, 1RM, AMRAP) but may not know this specific technique
- Do not pad sections with filler. If a section has 2 bullet points of real content, that's fine. Don't stretch it to 5.
- Vary sentence length deliberately - mix short punchy fragments with longer explanatory sentences
- Use conversational tone with direct reassurance where appropriate
- The Liftoscript snippet is the centerpiece of each page. Make it practical and correct.
- Use a single hyphen (-) for dashes, not double hyphens (--). "Linear progression - simple and effective" not "Linear progression -- simple and effective"

## Quality Checks

Before finishing, verify:
- [ ] Liftoscript snippets use correct syntax (cross-reference `llms/liftoscript.md`)
- [ ] All exercises in snippets are from the built-in list in `llms/exercises.md`
- [ ] Every section has specific, actionable content — not vague generalities
- [ ] "When to use / When not to use" gives clear, practical guidance
- [ ] Snippet walkthrough explains what's non-obvious, not what's self-evident
- [ ] Related programs actually use this technique (verified by reading program files)
- [ ] Related techniques are correct and the slugs match expected naming
- [ ] FAQ questions sound like real Google searches, not textbook headings
- [ ] FAQ answers don't use exercise directives (`[{...}]`)
