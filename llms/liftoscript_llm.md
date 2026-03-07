# Liftoscript Reference

Liftoscript is a DSL for weightlifting programs in Liftosaur. Syntax is slash-separated sections per exercise line.

## Exercise Line

```
ExerciseName[, Equipment] / sets / weight / timer / warmup / progress / update / superset / used
```

All sections after name are optional and order-independent (except sets come before set variations).

## Sets & Reps

```
Bench Press / 3x8
Bench Press / 3x8-12
Bench Press / 1x5, 1x3, 1x1
Bench Press / 4x5, 1x5+
Bench Press / 4x5 (Main), 1x5+ (AMRAP)
```

## Weight, RPE, Timer

```
Bench Press / 3x8 135lb
Bench Press / 3x8 60kg
Bench Press / 3x8 75%
Bench Press / 3x8 @8
Bench Press / 3x8 @8+
Bench Press / 3x8 100lb+
Bench Press / 3x8 / 120s
Bench Press / 1x12 20s 60%, 5x5 20s 60%
```

Weight, RPE, timer and 1RM% can be specified per-set OR in a separate global section that applies to all sets:
```
Bench Press / 1x12, 5x5 / 20s 60%
Bench Press / 1x5 @8, 3x5 @9 / 60%
```

IMPORTANT: Every exercise MUST have a weight specified — either explicit (`135lb`), percentage (`75%`), or RPE (`@8`). If none is set, the weight will be empty during workout and the user will have to enter it manually for every set. For non-percentage, non-RPE programs, ALWAYS set sensible starting weights:
```
Squat / 3x8 / 135lb              /// good - explicit weight
Bench Press / 3x8 / 95lb         /// good - explicit weight
Lateral Raise / 3x10 / 15lb      /// good - light weight for isolation
Pull Up / 3x8 / 0lb              /// good - bodyweight (0lb)
Bench Press / 3x8 @8             /// good - RPE infers weight from 1RM table
Squat / 3x8                      /// BAD - no weight, will be empty!
```

## Equipment

Each exercise has a default equipment type. You can use a short alias (just the name) for the default, or specify non-default equipment after a comma:
```
Bench Press / 3x8                  /// short for "Bench Press, Barbell"
Bench Press, Dumbbell / 3x8        /// non-default equipment
Squat / 3x8                        /// short for "Squat, Barbell"
Bicep Curl / 3x8                   /// short for "Bicep Curl, Dumbbell"
Lateral Raise / 3x8                /// short for "Lateral Raise, Dumbbell"
Lat Pulldown / 3x8                 /// short for "Lat Pulldown, Cable"
```

Almost every exercise has a short alias for its default equipment. Use `list_exercises` tool to find valid exercise names, their default equipment, and available variants.

## Warmups

```
Squat / 5x5 / warmup: 1x5 45lb, 1x3 135lb, 1x1 80%
Lateral Raise / 3x15 / warmup: none
```

Default warmups auto-added unless overridden. Warmup percentages are % of first working set weight (not 1RM). Use `warmup: none` for isolation/bodyweight exercises.

## Comments and Descriptions

Outside of script blocks (`{~ ~}`), there are two types of comments:

- `//` (double-slash) — **exercise descriptions**, shown to the user during workout. Supports Markdown. Must appear on the line immediately before the exercise.
- `///` (triple-slash) — **general comments**, NOT shown to the user. Use for notes, explanations, section markers.

Inside `{~ ~}` script blocks, `//` is just a regular code comment (not shown to users).

```
/// This is a general comment - not shown to user
// Pause **2 seconds** at the bottom (shown as description during workout)
Squat / 5x5 / progress: lp(5lb)

/// Another invisible comment
Bench Press / 3x8 / progress: custom() {~
  // this is a regular code comment inside a script block
  if (completedReps >= reps) { weights += 5lb }
~}
```

Exercise descriptions carry forward to subsequent weeks until overridden. Empty `//` stops inheritance:
```
# Week 1
## Day 1
// Pause **2s** at bottom
Squat / 5x5

# Week 2
## Day 1
/// Week 2 inherits "Pause 2s at bottom" description automatically
Squat / 5x5

# Week 3
## Day 1
//
/// Empty // stops description inheritance - week 3+ has no description
Squat / 5x5
```

### Week and Day Descriptions

You can add descriptions to weeks and days using `//` comments before the `#` / `##` headers. Day descriptions also carry forward like exercise descriptions.

```
// This is a description for week 1
// * Focus on form
# Week 1

// This is a description for day 1
// **Push day**
## Day 1

Squat / 5x5
```

### Reuse Descriptions

```
// T1 exercise. Work up to 3RM, then do singles.
Squat / 1x3 80%+, 4x1 80%

// ...Squat
Bench Press / 1x3 80%+, 4x1 80%
```

Target specific day/week: `// ...Squat[3]` (day 3 current week), `// ...Squat[2:1]` (week 2 day 1).

### Advanced Descriptions (Multiple Per Exercise)

You can define multiple descriptions separated by an empty comment line, and switch between them via `descriptionIndex`:

```
// This is the first description.
// Explains how to do the exercise.

// This is the second description.
// Users already know what to do.
Squat / 5x3 / progress: custom() {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
~}
```

Current description is marked with `!` after switching: `// ! This is the second description.`

## Days & Weeks

```
# Week 1
## Day 1
Squat / 5x5 / progress: lp(5lb)

## Day 2
Bench Press / 3x8

# Week 2
## Day 1
Squat / 5x4
```

`#` = week header, `##` = day header. Day headers can have custom names: `## Push Day`.

## Progression

Progression is defined ONCE per exercise (across the whole program). No need to repeat it on every week/day. Use `progress: none` to skip on specific days (e.g. deload):

```
# Week 1
## Day 1
Squat / 3x8 / progress: lp(5lb)

# Week 2
## Day 1
/// No need to repeat progress here - lp(5lb) still applies
Squat / 3x8

# Week 3 - Deload
## Day 1
Squat / 3x5 / progress: none
```

### Linear Progression (lp)

```
lp(increment[, successAttempts[, currentSuccess[, decrement[, failAttempts[, currentFail]]]]])
```

```
Squat / 3x8 / progress: lp(5lb)
Squat / 3x8 / progress: lp(5lb, 2)
Squat / 3x8 / progress: lp(5lb, 2, 1)
Squat / 3x8 / progress: lp(5lb, 1, 0, 10lb, 3)
Squat / 3x8 / progress: lp(5%)
```

### Double Progression (dp)

Increases reps within range per-set independently, then bumps weight and resets reps.

```
dp(weightIncrement, minReps, maxReps)
```

```
Bench Press / 3x8 / progress: dp(5lb, 8, 12)
```

IMPORTANT: Use starting reps (minReps) in set notation, NOT the range: `3x8` not `3x8-12`.

### Sum of Reps (sum)

```
sum(repsThreshold, weightIncrement)
```

```
Bench Press / 3x10+ / progress: sum(30, 5lb)
```

### Custom Progression

```
Bench Press / 3x8 / progress: custom() {~
  if (completedReps >= reps) {
    weights += 5lb
  }
~}
```

Script goes between `{~` and `~}`. Runs after workout finishes.

#### Read-only variables (progress)
- `weights[n]` / `w[n]` - prescribed weight of set N (1-indexed)
- `completedWeights[n]` / `cw[n]` - actual weight used
- `reps[n]` / `r[n]` - prescribed reps
- `completedReps[n]` / `cr[n]` - actual reps done
- `RPE[n]`, `completedRPE[n]` - prescribed/actual RPE
- `timers[n]` - set timer
- `rm1` - exercise 1RM
- `day`, `week`, `dayInWeek` - current position (1-indexed)
- `numberOfSets` / `ns`, `programNumberOfSets`, `completedNumberOfSets`
- `setVariationIndex`, `descriptionIndex`

Omitting index compares/assigns ALL sets: `completedReps >= reps` checks all sets, `weights += 5lb` increments all.

#### Writable variables (progress)
- `weights[week:day:setvariation:set]` - default `[*:*:*:*]`
- `reps[week:day:setvariation:set]`
- `RPE[week:day:setvariation:set]`
- `timers[week:day:setvariation:set]`
- `rm1`
- `numberOfSets[week:day:setvariation]`
- `setVariationIndex`, `descriptionIndex`

Omitted leading dimensions default to `*` (all): `weights[5]` = `weights[*:*:*:5]`.

CRITICAL: `weights +=` applies to ALL weeks/days. In multi-day programs, guard with `dayInWeek`:
```
// WRONG - fires on every day that has this exercise
if (week == 1) { weights += 10lb }
// CORRECT
if (week == 1 && dayInWeek == 4) { weights += 10lb }
```

#### State Variables

Persist values between workouts:
```
Bench Press / 3x8 / progress: custom(attempt: 0) {~
  if (completedReps >= reps) {
    state.attempt += 1
    if (state.attempt >= 3) {
      weights += 5lb
      state.attempt = 0
    }
  }
~}
```

User-prompted state vars (asks user for input after last set): add `+` after name:
```
progress: custom(rating+: 0) {~ ... ~}
```

#### Temporary Variables

```
var.x = floor(completedReps[1] / 2)
reps[2] = var.x
```

#### Loops

```
for (var.i in completedReps) {
  weights[var.i] = weights[var.i] + 5lb
}
```

`var.i` iterates 1..length of the array.

#### Built-in Functions
- `floor(x)`, `ceil(x)`, `round(x)` - rounding
- `sum(array)` - sum all values: `sum(completedReps)`
- `min(array)`, `max(array)` - min/max of array
- `rpeMultiplier(reps, rpe)` - returns 1RM multiplier
- `increment(weight)`, `decrement(weight)` - next/prev possible weight based on equipment
- `sets(from, to, minReps, maxReps, isAmrap, weight, timer, rpe, logRpe)` - update only
- `print(val1, val2, ...)` - debug output, accepts numbers/weights/percentages; visible in playground or after finishing exercise

#### Operators
- Math: `+`, `-`, `*`, `/`, `%`
- Comparison: `>`, `<`, `>=`, `<=`, `==`
- Logic: `&&`, `||`
- Ternary: `a > b ? x : y`
- If/else: `if (...) { } else if (...) { } else { }`

### Update Scripts

Runs DURING workout (on each set tap and once initially with `setIndex == 0`). Similar to progress but more limited scope:
```
Bench Press / 3x8 / update: custom() {~
  if (setIndex == 1 && completedReps[1] >= reps[1]) {
    numberOfSets = 4
    sets(2, 4, floor(reps[1] / 2), floor(reps[1] / 2), 0, weights[1], 0, 0, 0)
  }
~}
```

Extra read var: `setIndex` (0 = initial run before any sets). Writable: `weights[set]`, `reps[set]`, `RPE[set]`, `timers[set]`, `numberOfSets` (no week/day targeting). Cannot modify already-completed sets.

You can specify both `update: custom()` and any `progress:` on the same exercise.

## DRY Patterns

### Reuse with `...ExerciseName`

Copies sets/reps/weight/timer/warmup/progress/update from another exercise:
```
Squat / 3x8 200lb 60s / progress: lp(5lb)
Bench Press / ...Squat / 150lb
```

Target specific day: `...Squat[2]` (day 2, current week). Specific week+day: `...Squat[2:1]`.

In multi-week programs, `...Squat` looks in **any** day of the **same** week by default.

### Templates with `used: none`

Exercises not shown in workout, just used as reuse targets:
```
t1 / used: none / 3x5 / 75% / progress: lp(5lb)
Squat / ...t1
Bench Press / ...t1 / progress: lp(2.5lb)
```

Template names can be arbitrary (don't need to match real exercises). Only declare `used: none` once (in Week 1).

### Repeat across weeks with `[from-to]`

Ranges let an exercise auto-repeat across weeks WITHOUT re-listing it each week. Only use them with template reuse (`...template`) where later weeks just redefine the template:

```
# Week 1
## Day 1
t1 / used: none / 3x5 / 75%
Squat[1-4] / ...t1
Leg Press / 3x10 / 200lb / progress: dp(10lb, 10, 12)

# Week 2
## Day 1
t1 / 3x4 / 80%

# Week 3
## Day 1
t1 / 3x3 / 85%
```

Here `Squat[1-4]` appears in weeks 1-4 automatically (pulling sets from the redefined `t1`). `Leg Press` has no range — it also appears in weeks 2-3 because it's unchanged (exercises carry forward by default when the day exists).

Ranges are also useful to repeat an exercise for a subset of weeks without re-listing it:
```
# Week 1
## Day 1
Squat / 4x5 72% / progress: none
Leg Press[1-6] / 3x10 / 200lb / progress: dp(10lb, 10, 12)

# Week 2
## Day 1
Squat / 4x4 76%

...
# Week 7 - Taper
## Day 1
/// Leg Press automatically stops here (range was 1-6)
Squat / 3x2 60%
```

**IMPORTANT**: Do NOT use ranges when you explicitly list the exercise in every subsequent week. If week 2+ already has `Squat / 4x4 76%`, then `Squat[1-7]` in week 1 is redundant — just write `Squat / 4x5 72%`.

Empty `## Day` headers REQUIRED in later weeks for ranged exercises (so the day exists for them to appear in).

Ordering: `Exercise[order,from-to]` if ambiguous: `Squat[1,1-4]`, `Bench Press[2,1-4]`.

NOTE: `[1,3,5]` is NOT "only weeks 1,3,5". It means "order=1, weeks 3-5". Non-contiguous weeks must be defined explicitly.

### Reuse progress/update scripts

```
Bench Press / 3x8 / progress: custom(increment: 5lb) {~
  if (completedReps >= reps) { weights += state.increment }
~}
Squat / 3x8 / progress: custom(increment: 10lb) { ...Bench Press }
```

When reusing, only specify state vars that differ. Same syntax works for `update: custom() { ...Bench Press }`.

## Set Variations

Multiple set schemes, switchable via `setVariationIndex`:
```
Squat / 5x3 / 6x2 / 10x1 / progress: custom() {~
  if (completedReps >= reps) {
    weights = completedWeights[ns] + 5lb
  } else {
    setVariationIndex += 1
  }
~}
```

Current variation marked with `!`: `Squat / 5x3 / ! 6x2 / 10x1`.

## Number of Sets Progression

You can change `numberOfSets` in `progress` scripts for set-based progressions:
```
Squat / 3x8 / progress: custom() {~
  if (completedReps >= reps) {
    if (numberOfSets < 5) {
      numberOfSets += 1
    } else {
      weights += 5lb
      numberOfSets = 3
    }
  }
~}
```

Target specific weeks/days: `numberOfSets[2:3:1] += 1` (week 2, day 3, set variation 1).

## Supersets

```
Bench Press / 3x8 / superset: A
Bent Over Row / 3x8 / superset: A
```

Label scope is per-day.

## Labels

Same exercise with different progressions:
```
power: Squat / 3x3 / progress: lp(10lb)
volume: Squat / 3x10 / progress: dp(5lb, 10, 15)
```

## Tags

Cross-exercise state variable access:
```
Squat / 3x8 / id: tags(1) / progress: custom(rating: 0) {~ ~}
Bench Press / 3x8 / id: tags(1, 101) / progress: custom(rating: 0) { ...Squat }
OHP / 3x8 / progress: custom() {~
  state[1].rating = 10   // changes rating in both Squat and Bench Press (tag 1)
  state[101].rating = 5  // changes rating only in Bench Press (tag 101)
~}
```

## Line Splitting

```
Squat / 1x5 @8, 3x8 @9 \
  / warmup: 1x5, 1x3 \
  / progress: lp(5lb)
```

## Percentage-Based Programs

Use `rm1 += state.increment` (not `weights +=`) to preserve percentage relationships:
```
main / used: none / 1x5 58%, 1x5 67%, 1x5+ 76% / progress: custom(increment: 5lb) {~
  if (completedReps >= reps && week == 3) {
    rm1 += state.increment
  }
~}
```

## Common Mistakes

1. Using `3x8-12` with `dp()` — use `3x8` instead (dp manages the range itself)
2. Not guarding `weights +=` with `dayInWeek` in multi-day programs
3. Missing empty `## Day` headers for repeated exercises in later weeks
4. Repeating `used: none` in later weeks (only declare once in Week 1)
5. Using `weights +=` instead of `rm1 +=` in percentage-based programs
6. Using `[1,3,5]` thinking it means "weeks 1,3,5" (it means "order=1, weeks 3-5")
7. Using `//` instead of `///` for non-description comments outside script blocks — `//` shows text to the user during workout
8. Omitting weight on exercises — without explicit weight, RPE, or percentage, the weight will be empty during workout
9. Adding ranges like `Squat[1-7]` when the exercise is explicitly listed in every subsequent week — ranges are only useful with template reuse or to limit which weeks an exercise appears in
10. Using `progress: none` on exercises that have no progression — exercises have no progression by default. `progress: none` is only needed to override/skip an existing progression on specific weeks (e.g. deload)
