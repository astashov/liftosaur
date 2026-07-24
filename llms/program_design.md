# Program Design Guide

How to design effective weightlifting programs from scratch, distilled from evidence-based strength and hypertrophy research (Helms, Israetel, Nuckols, and the broader exercise science consensus).

This guide is scoped to BEGINNER and INTERMEDIATE lifters — the audience that doesn't yet have personal data on what works for them. Advanced programming is individualization and pattern-finding over a long horizon, not a rule set; see the Advanced Lifters note below.

Use this guide when DESIGNING a program (e.g. "make me a 3-day hypertrophy program"). Do NOT use it to second-guess a published program the user asked you to transcribe (5/3/1, GZCLP, etc.) — transcribe those faithfully.

These are defaults, not laws. Explicit user requests always win. If the user wants something outside these guidelines, build what they asked for and briefly note the tradeoff.

## Priorities

In order of impact. Never polish a lower item at the expense of a higher one:

1. **Adherence** — a program the user will actually do: fits their days/week, session length, equipment, and exercise preferences. The best program is the one that gets done.
2. **Volume, intensity, frequency** — enough hard sets per muscle per week, at effective loads, spread across enough days.
3. **Progression** — a defined rule for when and how weight/reps increase, and what happens on failure.
4. **Exercise selection** — movements that match the goal and cover all patterns.
5. **Rest periods and tempo** — matter, but don't obsess.

## Before Designing

Establish (ask if unknown, otherwise use defaults):

| Input | Default if unknown |
|---|---|
| Goal | Hypertrophy with some strength work |
| Experience | Classify by how they progress, not years trained. Beginner: new to structured lifting, or still able to add weight every session. Intermediate: session-to-session progress has stalled; progresses week to week. Advanced: progress only comes over months and blocks |
| Days per week | 3 |
| Session length | 45-75 min |
| Equipment | Full gym (barbell, dumbbells, cables, machines) |
| Injuries/limitations | None |

Training age drives more decisions than anything else:
- **Beginners** progress every session, need less volume, benefit from simple full-body plans with few exercises. Do not give beginners RPE-based loading, percentage schemes, or 6-day splits.
- **Intermediates** progress weekly, need moderate volume, benefit from rep ranges and double progression.

**Advanced lifters: individualize instead.** Advanced lifters mostly self-identify — they talk in terms of blocks, PRs, RPE, and programs they've already run, and their progress comes over months, not weeks. For them there is no singular system — what drives progress diverges per lifter, and the answer lives in their history, not in defaults. The principles here (volume landmarks, effort, movement coverage) still hold as boundaries, but the program shape should come from evidence: fetch their training history (`get_history`, `get_exercise_data`), look at what volumes, intensities, and block structures preceded their past PRs, and ask about previous successful programs. One axis to look for: some lifters respond to volume accumulation, others to heavy intensity work — their history usually shows which. An advanced lifter asking for a program usually brings that context — build from it, not from this guide's defaults.

## Split by Days per Week

| Days | Split |
|---|---|
| 2 | Full body |
| 3 | Full body (best default), or upper/lower/full |
| 4 | Upper/lower |
| 5 | Upper/lower/push/pull/legs, or full body ×5 with rotating emphasis |
| 6 | Push/pull/legs ×2 |

Full body 3×/week beats a 3-day "bro split" (chest day / back day / leg day) for almost everyone: it hits every muscle 2-3×/week instead of 1×. Only use one-muscle-per-day splits if the user explicitly asks.

## Weekly Volume Targets

Count hard working sets per muscle per week (warmups don't count). `get_program_stats` counts a set as 1.0 for target muscles and 0.5 for synergists — e.g. Bench Press credits chest 1.0 and triceps/front delts 0.5 per set. The targets below use that same counting.

| Muscle group | Beginner | Intermediate/Advanced | Notes |
|---|---|---|---|
| chest | 8-12 | 10-20 | |
| back | 8-14 | 10-22 | Lats + upper back combined |
| quadriceps | 6-12 | 8-18 | |
| hamstrings | 4-10 | 6-14 | Hinges + leg curls |
| glutes | 4-10 | 6-16 | Mostly covered by squats/hinges |
| shoulders | 6-12 | 8-18 | Pressing covers front delts; add direct side delt work (e.g. Lateral Raise) for hypertrophy goals |
| triceps | 4-10 | 6-14 | Pressing synergist credit counts |
| biceps | 4-10 | 6-14 | Pulling synergist credit counts |
| calves | 0-6 | 6-12 | 0 acceptable if user doesn't care |
| abs | 0-6 | 4-10 | Optional; compounds provide some indirect work |
| forearms | 0 | 0-4 | Indirect work is enough for almost everyone |

Rules:
- **Start at the low end.** More volume is a tool for later, not a starting point. A program at the bottom of the range that progresses beats one at the top that buries the user.
- Returns per set diminish roughly logarithmically — the first ~10 weekly sets per muscle deliver most of the gains. High volume is a targeted tool for a lagging muscle in an experienced lifter, not a default.
- Below the low end = a gap; call it out or fix it. Above ~22 counted sets = junk volume for most; cut it.
- For pure strength goals, per-muscle volume matters less than practice on the main lifts: roughly 6-12 weekly sets of Squat (+variations), 8-15 of Bench Press (+variations), 4-8 of Deadlift (+variations), at the intensities below.

## Frequency

Hit each major muscle ≥2×/week (`frequencyPerWeek` in `get_program_stats`). With total volume equated, frequency itself adds little — its job is distributing volume so per-session quality stays high, which starts dropping after ~6-8 hard sets per muscle per session. So: splitting 12 sets of chest across 2 days beats all 12 in one day, but 1×/week is fine for small muscles, low volumes, or when the user forces a bro split.

## Rep Ranges and Intensity

Hypertrophy works from ~5 to ~30 reps if sets are hard; these are the practical defaults:

| Work | Reps | Intensity |
|---|---|---|
| Strength work on main lifts | 1-6 | 75-90% 1RM |
| Compounds for hypertrophy | 5-10 | ~70-80% |
| Isolation / machine work | 8-15 | — |
| Small muscles, joints-friendly pump work | 12-20 | — |

- Note `get_program_stats` classifies <8 reps as "strength sets" and ≥8 as "hypertrophy sets" — use that breakdown to sanity-check the program matches the goal.
- Beginners: 5-8 reps on main barbell lifts (heavy enough to drive progress, light enough to practice form), 8-12 on accessories.
- Rep ranges (e.g. `3x8-12`) are good for intermediates+ with double progression. Beginners do better with fixed reps (`3x5`) and weight progression.
- Mix ranges across the week for intermediates+: e.g. heavier 5-8 day and lighter 10-15 day per muscle.

## Effort

- Most sets should end 1-3 reps in reserve (RIR), i.e. RPE 7-9.
- Proximity to failure matters for hypertrophy but not much for strength: strength gains are similar anywhere from ~0-4 RIR when loads are heavy, so keep strength work at 2-4 RIR — grinding to failure adds fatigue, not strength. For hypertrophy, closer to failure is somewhat better — push the last set of an exercise, and isolation/machine work generally, to 0-1 RIR.
- Squats and Deadlifts should stay at 2-3 RIR on volume work regardless of goal.
- Beginners shouldn't chase failure — bar speed and form degrade. Their linear progression provides the overload.
- One AMRAP set (`1x5+`) per main lift is a good autoregulation tool for intermediates+ and drives AMRAP-based progressions. Don't make every set AMRAP.
- Prescribe RPE (`@8`) only for experienced lifters who asked for it, or in percentage-less strength programs. Everyone else gets explicit weights or percentages.

## Exercise Selection

- ONLY use exercises from `llms/exercises.md` (via `list_exercises`). Check `list_custom_exercises` and reuse the user's existing custom exercises before creating new ones.
- Cover all movement patterns weekly: squat (Squat, Leg Press, Bulgarian Split Squat), hinge (Deadlift, Romanian Deadlift, Hip Thrust), horizontal push (Bench Press, Chest Dip), vertical push (Overhead Press), horizontal pull (Bent Over Row, Seated Row), vertical pull (Pull Up, Lat Pulldown).
- A big compound anchors each pattern; isolation fills the volume gaps the compounds leave (typically: side delts, biceps, triceps, hamstrings, calves, abs).
- Train full range of motion, and when choosing between variants for hypertrophy, prefer the one that loads the muscle at long lengths — it grows muscle better: Seated Leg Curl over Lying Leg Curl, Incline Curl or Preacher Curl for biceps, overhead Triceps Extension over Triceps Pushdown, deep squats/presses over shallow, calf raises with a full stretch at the bottom. Cutting ROM at the stretched end costs growth.
- Per session: 4-8 exercises. Per muscle per session: 1-3 exercises. More exercise variety across the week, less within a day.
- Roughly balance push and pull volume, and quad vs hamstring/glute volume, across the week.
- Prefer barbell/compound work for strength goals; machines and cables are equally effective for hypertrophy and easier to push close to failure — use both.
- For strength goals, pick main-lift variations by where the lift breaks down, not for variety: weak off the floor → Deficit Deadlift, weak at bench lockout → Bench Press Close Grip, weak out of the squat hole → pause squats or Front Squat, weak off the chest → pause bench. Pause/pin variants are mostly not built-in — create them with `create_custom_exercise`.
- Some bodyweight movements are first-choice even in a full gym, not fallbacks: Pull Up / Chin Up (vertical pull), Chest Dip (push), Inverted Row, Nordic Curl, Back Extension, Ab Wheel, Hanging Leg Raise. Don't "upgrade" them to machines without a reason (e.g. user can't do them yet).
- Respect stated limitations: e.g. bad knees → Leg Press/Hip Thrust over deep barbell squats; bad shoulder → neutral-grip and incline pressing over Overhead Press; home gym → check equipment with `list_equipment` first.

## Bodyweight & Calisthenics

Three legitimate reasons to build around bodyweight work:
1. **Equipment**: no/minimal equipment (home, travel). Upper body and core train near-optimally with bodyweight alone.
2. **Preference**: the user wants calisthenics. Adherence is priority #1 — build it without apologizing.
3. **Skill goals** (Muscle Up, Handstand Push Up, Pistol Squat): treat as strength-skill work — low reps, 2-3 RIR, first in the session, high frequency. Not hypertrophy work.

The design problem is progression, not selection — you can't add 5lb to a push-up. Progress in this order: **reps → harder variation → external load.**

- **Reps**: fixed low reps that ladder up (3x5 → 3x8, add a rep per session), or `dp()` with a wider range for hypertrophy work.
- **Variation ladders**: use exercise variation chains — advance `exerciseVariationIndex` when the top of the rep range is reached, reset reps:
```
Wall Push Up | Incline Push Up | Push Up | Diamond Push Up / 3x5 0lb / 90s / warmup: none / progress: custom(topVar: 4) {~
  if (completedReps >= reps) {
    if (reps >= 8) {
      if (exerciseVariationIndex >= state.topVar) {
        weights += 5lb
      } else {
        exerciseVariationIndex += 1
      }
      reps = 5
    } else {
      reps += 1
    }
  }
~}
```
- **External load**: the endgame for the top rung — weighted Pull Up / Chest Dip via added weight (equipment supports bodyweight + added load), progressed with `dp()` on the weight.

Rules:
- **Cap working sets at ~15-20 reps.** Past that it's endurance work with poor stimulus-per-set — advance the variation or add load instead. `Push Up / 3x30` is a design flaw, not a program. To intensify a movement before graduating: slow the eccentric and pause in the stretched position (bottom of a push-up or dip).
- **Regressions matter as much as progressions.** Many beginners can't do one Pull Up or Chest Dip: start them on band-assisted variants (`Pull Up, Band`), an assisted machine (setup below), Inverted Row, incline push-ups, negatives, or timed holds (Arch Hang, Support Hold via set timers, e.g. `3x1 0lb 20s|90s`).
- **Be honest about lower body.** Bodyweight squat progressions (Squat, Bodyweight → Split Squat → Bulgarian Split Squat → Pistol Squat) and Nordic Curl work, but cap out faster than barbells, and the hinge is nearly unloadable without equipment. Say so in the program description, and recommend swapping to barbell Squat / Romanian Deadlift when equipment appears.
- Pure bodyweight = no percentage or RPE loading; use `0lb` weights, rep-based progressions, and `warmup: none` on easy movements.
- Variation jumps are coarse compared to +5lb — bridge with reps (reach 3x8-3x15 before graduating), never stall waiting for the next rung.

**Assisted and weighted bodyweight setup.** Equipment first (via `update_equipment`/`create_custom_equipment`): set `useBodyweightForBar: true` for the exercise's equipment, and `isAssisting: true` only when added weight reduces effort (assisted pull-up/dip machines — the plate calculator then subtracts instead of adds). Model assistance bands as a custom equipment with "plates" of estimated band weights.

For an assisted machine (e.g. a beginner doing leverage-machine pull-ups), the programmed weight is the assistance load, so progression runs BACKWARDS — reduce assistance as they get stronger:
```
Pull Up, Leverage Machine / 3x8 50lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight - originalWeights[ns]
  }
~} / progress: lp(-5lb)
```
The update script displays the true lifted weight (bodyweight minus 50lb of assistance), and `lp(-5lb)` cuts assistance by 5lb on each success. Graduate to unassisted Pull Up when assistance nears zero. For weighted Pull Ups/Dips (belt or vest), flip the signs: `weights = bodyweight + originalWeights[ns]` with `progress: lp(5lb)`. For pure bodyweight where the true load should be tracked (useful for history and volume), use `0lb` with `weights = bodyweight` in the same update shape. `bodyweight` comes from the user's tracked weight measurements.

The built-in `recommended-routine` program (r/bodyweightfitness Recommended Routine, via `get_builtin_program`) is the canonical example: six variation-ladder progressions in antagonist superset pairs plus a core triplet, reusable `custom()` ladder templates, timed-hold rungs, and weighted endpoints. Study it before designing a calisthenics program.

## Session Structure

1. Main compound lifts first, when fresh. Strength work before hypertrophy work.
2. Order large → small: squat/hinge and presses/rows before curls/raises/abs.
3. Don't put two heavy lower-body compounds back to back (Squat then Deadlift) — separate across days or put one as the lighter movement.
4. Supersets (`/ superset: a`) of antagonist or unrelated muscles (biceps + triceps, calves + abs) save time with no performance cost. Don't superset two heavy compounds.
5. Budget time: ~45 min per day ≈ 12-16 working sets, ~60 min ≈ 16-22, ~90 min ≈ 24-30 (verify with `approxMinutes` from `get_program_stats`). If over budget: cut sets, superset accessories, or trim rest on isolation work — don't silently deliver a 2-hour session.
6. If the user wants cardio too: put it after lifting or on separate days, prefer low-impact modalities (bike, incline walking) over running on leg days. At moderate doses it doesn't meaningfully blunt strength or muscle gains — don't refuse to include it.

## Progression

Every exercise MUST have a progression rule. A program where nothing progresses is a red flag.

**Beginners — session-to-session linear progression:**
```
Squat / 3x5 / 135lb / progress: lp(5lb, 1, 0, 15lb, 3, 0)
```
Add weight every successful session; after 3 consecutive fails, deload 15lb. +5lb per session for upper body, +5-10lb for Squat/Deadlift. ALWAYS include the failure/deload arguments — stalling is guaranteed eventually, and `lp(5lb)` alone leaves the user stuck.

**Accessories (all levels) — double progression:**
```
Lateral Raise / 3x10 / 15lb / progress: dp(5lb, 10, 15)
```
Reps climb through the range; at the top, weight increases and reps reset. Never write a rep range in the set notation with `dp()` (`3x10-15 / progress: dp(...)` is WRONG — `dp` manages the range itself).

**Intermediates — weekly progression.** Options, roughly in order of preference:
- Double progression (`dp`) on most exercises, including compounds.
- AMRAP-driven with tiered increments (nSuns-style): the reps achieved on a `1x5+` top set decide how much to add — big beats earn big jumps, grinding earns none:
```
Bench Press / 4x5, 1x5+ / 75% / progress: custom() {~
  if (dayInWeek == 1) {
    if (completedReps[ns] >= 10) {
      rm1 += 10lb
    } else if (completedReps[ns] >= 7) {
      rm1 += 5lb
    }
  }
~}
```
- Percentage-based with 1RM progression at cycle end — bump `rm1`, not `weights`, so all percentage-based sets scale together:
```
Squat / 3x5 / 80% / progress: custom() {~
  if (week == 4) {
    rm1 += 10lb
  }
~}
```
- Stage progression (GZCLP-style): on failure, instead of deloading, switch to a denser set scheme at the same weight via set variations — weight keeps climbing while volume drops. Deload only after failing the last stage:
```
Squat / 5x3 / 6x2 / 10x1 / 150lb / 180s / progress: custom() {~
  if (completedReps >= reps) {
    weights += 10lb
  } else if (setVariationIndex < 3) {
    setVariationIndex += 1
  } else {
    setVariationIndex = 1
    weights = completedWeights[1] * 0.85
  }
~}
```
- `sum(totalReps, increment)` for total-rep schemes (e.g. `3x10+ / progress: sum(30, 5lb)`). For a bidirectional version (Doggcrapp-style rep window), use `sum(completedReps)` in a `custom()`: add weight above the window, subtract below it, and count stalls in a state variable to trigger an exercise swap or deload.

**Advanced** — individualize from their history (see Advanced Lifters note in Before Designing). Structurally these programs are usually percentage or RPE-based 3-6 week blocks with planned intensity waves, but the specifics should come from what has worked for that lifter before.

Periodization model (linear vs undulating vs block) matters far less than consistent progression and effort. Pick the simplest structure the user will follow; don't build a 12-week block scheme for someone who asked for "a 3-day program".

**Adjusting volume — the second lever.** Load/rep progression is the default lever, but volume progresses too, and reactively — don't front-load it at program creation (starting at the low end of the Weekly Volume Targets is precisely what keeps this lever available):
- Stalled despite good recovery (sleep, nutrition, no injury or aches)? Add ~20% more weekly sets to the stalled lift or muscle (e.g. 10 → 12) instead of reaching for yet another weight increase. Re-run `get_program_stats` after and confirm the muscle stays within its volume range.
- Stalled WITH recovery problems (persistent fatigue, aching joints, bad sleep)? Cut volume ~20% instead — more work is not the answer there.

Builtin programs are worked examples of these patterns — fetch them with `get_builtin_program` when implementing one: `gzclp` (stage progression), `nsuns` (tiered AMRAP, plus rep-max retest weeks that recompute `rm1` with `rpeMultiplier()`), `madcow` (weekly ramp with cycle increment), `doggcrapp` (rep windows + stall-triggered exercise rotation), `recommended-routine` (bodyweight variation ladders).

Validate every progression with `run_playground`: `complete_set` all sets, `finish_workout()`, and confirm `updatedProgramText` changed as intended. Also simulate a failure (via `change_reps`) to confirm the deload path fires.

## Deloads and Stalls

- Reactive beats scheduled: research doesn't show a clear benefit to pre-planned deloads over training straight until performance stalls. Default to reactive deloading — deload when progress stalls for 2-3 weeks or joints ache persistently. Say so in the program description.
- Beginners: the drop built into `lp()` after repeated failure IS their deload — nothing else needed. In `lp(5lb, 1, 0, 15lb, 3, 0)`, the `15lb, 3` means "after 3 consecutive failed sessions, reduce weight 15lb".
- Multiweek percentage/RPE programs can't react to performance, so a built-in deload week every 4-8 weeks is still a sensible default there — more frequent with higher average intensity and volume.

A deload week cuts load, sets, or both (e.g. ~60-80% of working weight, half the sets). Two ways to write it:

Explicit week override — clearest when weeks already differ:
```
# Week 4 (Deload)
## Day 1
Squat / 2x5 / 60% / 180s
```

Update-script scaling — when weeks reuse one definition (`Squat[1-4]`), keep the reuse intact and scale at workout start instead of redefining the deload week:
```
Squat[1-4] / 3x5 / 200lb / 180s / update: custom() {~
  if (setIndex == 0 && week == 4) {
    weights = weights[ns] * 0.7
    numberOfSets = 2
  }
~}
```

**Tapering for a meet or 1RM test** is not a deload — it's a planned fatigue-shedding phase before a known test date, not a reaction to stalling. Over the final 1-3 weeks (longer after harder blocks), cut volume progressively ~40-60% while keeping intensity high — heavy singles/doubles around 85-95% early in the taper, dropping load only in the final days. Keep frequency roughly unchanged. Last very heavy session lands ~7-10 days out; the final week is light and crisp so the lifter arrives recovered, not detrained. Only include a taper when the user has an actual meet or test date — write it as explicit final weeks in a multiweek program.

## Rest Times

Set `/ 180s`-style timers explicitly; don't rely on the app default.

| Work | Rest |
|---|---|
| Heavy compound strength sets (≤6 reps) | 180-300s |
| Compounds for hypertrophy | 120-180s |
| Isolation | 60-90s |

Longer rest is better for both strength AND hypertrophy (more recovery → better set quality). Only cut rest to fit a time budget, and cut it on isolation work first. Remember rest timers are NOT inherited across weeks in Liftoscript — repeat them in every week's override.

## Starting Weights

- Every exercise MUST have a weight: explicit (`135lb`), percentage (`75%`), or RPE (`@8`). Bodyweight movements get `0lb`.
- If the user's 1RM data exists (`list_exercise_data`), derive from it; percentages and RPE also require a known/estimated 1RM to render actual weights.
- Otherwise start deliberately light — around 60-70% of estimated max for beginners. The progression closes the gap in weeks; starting too heavy stalls the program in weeks. Tell the user in the program description that first weeks should feel easy.
- No data at all → use conservative defaults (e.g. empty-to-light bar for beginners: Squat 95lb, Bench Press 65lb, Deadlift 135lb, Overhead Press 45lb; scale up for stated experience) and say they're guesses to adjust, or use `?+` on RPE-based sets so the app asks the user to confirm.

## Final Checklist

Before saving with `create_program`/`update_program`, run `get_program_stats` and `run_playground` and verify:

- [ ] Every muscle group the user cares about is within its weekly set range; no unintentional gaps or >22-set pileups
- [ ] Every major muscle has `frequencyPerWeek` ≥ 2 (unless the user forced a 1×/week split)
- [ ] Strength vs hypertrophy set breakdown matches the stated goal
- [ ] Every day's `approxMinutes` fits the user's session budget
- [ ] Every exercise has a progression rule, including a failure/deload path on main lifts
- [ ] Every exercise has a weight (explicit, %, or RPE) — none render empty
- [ ] Rest timers set explicitly, repeated in every week's overrides
- [ ] All exercises exist in the built-in list or the user's custom exercises
- [ ] `run_playground` confirms: workout renders correctly, progression fires on success, deload fires on failure
- [ ] The program matches what the user asked for (days, length, equipment, preferences) — adherence beats optimality
