---
name: liftoscript
description: Write idiomatic Liftoscript code for weightlifting programs. Use when creating or editing program files in programs/builtin/.
disable-model-invocation: true
argument-hint: [program name]
---

# Write Liftoscript Program

Write a Liftoscript program for: $ARGUMENTS

Before writing any code, read these reference files:

1. `llms/liftoscript.md` — full language reference
2. `llms/liftoscript_examples.md` — complete program examples
3. `llms/exercises.md` — built-in exercise list (always prefer built-in exercises)
4. `src/models/builtinPrograms.ts` — valid values for frontmatter fields
5. Browse `programs/builtin/` for format and quality reference

## Idiomatic Liftoscript Patterns

### Templates are the foundation

Define templates with `used: none` once, then reuse everywhere with `...templateName`. This is the #1 pattern for DRY code.

```
cluster / used: none / 4x6 / 67% / 60s / progress: custom(increment: 5lb) {~
  if (completedReps >= reps && week == 6) {
    rm1 += state.increment
  }
~}

Bench Press[1-6] / ...cluster
Squat[1-6] / ...cluster / progress: custom(increment: 10lb) { ...cluster }
```

Key rules:
- `used: none` only needs to be declared **once** per template (in Week 1). Do NOT repeat it when redefining the template in later weeks.
- Templates can have arbitrary names — they don't need to match an exercise.
- Override specific parts (progress, weight, timer) on the reusing exercise while inheriting everything else.

### Repeat exercises with `[1-N]`, define only in Week 1

Exercises that appear every week should use `[fromWeek-toWeek]` syntax and only be written out in Week 1. Later weeks only redefine templates:

```
# Week 1
## Day 1
t1 / used: none / 3x5 / 75% / progress: lp(5lb)
Squat[1-4] / ...t1
Bench Press[1-4] / ...t1

## Day 2
Deadlift[1-4] / ...t1

# Week 2
## Day 1
t1 / 3x4 / 80%
## Day 2

# Week 3
## Day 1
t1 / 3x3 / 85%
## Day 2
```

**Critical**: Empty `## Day` headers are REQUIRED in later weeks for repeated exercises to show up. Without them, those days won't exist.

### Forced ordering is usually unnecessary

Use `Exercise[1-6]` not `Exercise[1,1-6]` unless you have multiple exercises starting on different days/weeks that need explicit ordering. The first number is a forced display order — only add it when the order would be ambiguous.

### Supersets

Use `superset: A` where `A` is an identifier shared across exercises in the same group. The scope is per-day, so you can reuse the same label across different days:

```
Bench Press[1-6] / ...cluster / superset: A
Squat[1-6] / ...cluster / superset: A
Pull Up[1-6] / ...cluster / superset: A
```

### Progression patterns

**Linear progression** — simplest, for beginners:
```
Squat / 3x5 / 135lb / progress: lp(5lb)
```

**Double progression** — increase reps in range, then bump weight. NEVER use rep ranges in set notation with `dp()`:
```
Bench Press / 3x8 / 135lb / progress: dp(5lb, 8, 12)   // correct
Bench Press / 3x8-12 / progress: dp(5lb, 8, 12)         // WRONG
```

**Custom progression** — for percentage-based or block programs. Use `rm1 +=` to preserve percentage relationships:
```
main / used: none / 1x5 58%, 1x5 67%, 1x5+ 76% / progress: custom(increment: 5lb) {~
  if (completedReps >= reps && week == 3) {
    rm1 += state.increment
  }
~}
```

**Reusing progress logic** with different parameters:
```
Squat[1-3] / ...main
Bench Press[1-3] / ...main / progress: custom(increment: 5lb) { ...main }
```

When reusing, only specify state variables that differ from the template. Omitted variables inherit the template's values.

### Percentage-based programs

Use `rm1 += state.increment` (not `weights +=`) so that all percentage-based sets adjust proportionally. The `weights +=` approach breaks percentage relationships.

### Week/day guards in custom progress

Progress fires once per exercise after each workout. Use `week` and `dayInWeek` to control WHEN it fires:

```
// Fire only on the last day of the last week in a 6-week block
if (completedReps >= reps && dayInWeek == 3 && week == 6) {
  rm1 += state.increment
}
```

### Warmups

- Default warmups are auto-added. Use `warmup: none` for bodyweight exercises (Pull Up, Chin Up, Dip, etc.) or exercises where warmups don't make sense.
- Custom warmups: `warmup: 1x5 45lb, 1x3 135lb, 1x1 80%` (percentages are of first working set, not 1RM).

### Set variations (stage-based progression)

Separate set schemes with `/` and switch between them via `setVariationIndex`:

```
t1 / used: none / 4x3, 1x3+ / 5x2, 1x2+ / 9x1, 1x1+ / 75% / progress: custom() {~
  if (completedReps >= reps) {
    weights = completedWeights[ns] + 5lb
  } else {
    setVariationIndex += 1
  }
~}
```

### Starting weights

- If the program uses 1RM percentages, use `%` notation: `3x5 / 75%`
- If the program uses RPE, use `@` notation: `3x5 @8`
- Otherwise, ALWAYS set a default starting weight: `3x8 / 135lb`. Look up sensible defaults from `startingWeightLb` in `src/models/exercise.ts`.

### Labels for same exercise with different roles

If the same exercise appears in different contexts (e.g., heavy and light), use labels:

```
power: Bench Press / 3x3 / 85% / progress: dp(5lb, 3, 5)
hyper: Bench Press / 3x10 / 60% / progress: dp(5lb, 10, 15)
```

### AMRAP sets

Add `+` after the rep count: `4x3, 1x3+`. The last set becomes as-many-reps-as-possible.

### Rest times

Specify per-exercise or per-set: `3x5 / 120s` or `1x5 60s, 3x5 120s`.

## Validation

After writing, ALWAYS validate:

```bash
TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/validate_liftoscript.ts programs/builtin/<id>.md
```

Use validation output to sanity-check:
- **Workout duration** — does it match claims in the description?
- **Weekly volume per muscle group** — any glaring gaps to mention in pros/cons?

Fix errors and re-validate until it passes.

## Common Mistakes

1. Repeating `used: none` on template redefinitions in later weeks
2. Missing empty `## Day` headers in later weeks (exercises won't appear)
3. Using `weights +=` in percentage-based programs (use `rm1 +=` instead)
4. Using rep ranges with `dp()`: `3x8-12 / dp(...)` is WRONG
5. Adding forced order numbers when not needed: `[1,1-6]` vs `[1-6]`
6. Forgetting `warmup: none` on bodyweight exercises
7. Defining exercises in every week instead of using `[1-N]` and template redefinitions
