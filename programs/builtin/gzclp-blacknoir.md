---
id: gzclp-blacknoir
name: "GZCLP: Blacknoir version"
author: /u/blacknoir
url: "https://www.reddit.com/r/gzcl/comments/1207bs7/announce_as_requested_single_spreadsheet_versions/"
shortDescription: Variation of GZCLP from Reddit user u/blacknoir
isMultiweek: true
tags: []
frequency: 3
age: "3_to_12_months"
duration: "45-60"
goal: "strength"
---

Modification of the GZCLP program, with slightly different set x rep schemes and progressions (maybe for somebody who doesn't like 10x1 sets :)).
Based on a popular set of elaborate spreadsheets created by a Reddit user **/u/blacknoir.**

It contains example exercises from both **Default** GZCLP, **Modified** GZCLP and **Advanced**, making it easy to mix and match various types of T1/T2/T3 exercises and craft a weightlifting program for your needs.

<!-- faq -->

### How is GZCLP Blacknoir different from regular GZCLP?

The Blacknoir version uses different set and rep schemes and progressions compared to standard GZCLP. The most notable change is avoiding the 10x1 stage that some lifters dislike. It also includes Default, Modified, and Advanced exercise templates you can mix and match.

### Is GZCLP Blacknoir good for beginners?

Yes, like standard GZCLP it's designed for beginner to early intermediate lifters. It uses the same GZCL tier system (T1/T2/T3) but with modified progression schemes that some lifters find more enjoyable. You should have a few months of training experience before starting.

### How many days a week is GZCLP Blacknoir?

GZCLP Blacknoir is a 3-day program. You rotate through workouts on non-consecutive days, typically Monday/Wednesday/Friday, just like standard GZCLP.

### Can I customize exercises in GZCLP Blacknoir?

Yes, the program includes exercise templates from Default, Modified, and Advanced GZCLP configurations. You can swap T2 and T3 exercises to match your equipment and goals while keeping the progression logic intact.

### What should I run after GZCLP Blacknoir?

Once you can no longer make linear progress (adding weight each session), move to an intermediate GZCL program like The Rippler for strength or Jacked & Tan 2.0 for hypertrophy. Both use periodized progression instead of linear.

```liftoscript
# Week 1
## Day 1
// ...t1_modified
t1: Squat / ...t1_modified

// ...t2_modified
t2: Bench Press / ...t2_modified

// ...t3_modified
t3: Lat Pulldown / ...t3_modified

## Day 2
// ...t1_modified
t1: Overhead Press / ...t1_modified / progress: custom(increase: 5lb) { ...t1_modified }

// ...t2_modified
t2: Deadlift / ...t2_modified / progress: custom(stage1weight: 0lb, increase: 10lb, stage3increase: 15lb) { ...t2_modified }

// ...t3_modified
t3: Bent Over Row / ...t3_modified

## Day 3
// ...t1_modified
t1: Bench Press / ...t1_modified / progress: custom(increase: 5lb) { ...t1_modified }

// ...t2_modified
t2: Squat / ...t2_modified / progress: custom(stage1weight: 0lb, increase: 10lb, stage3increase: 15lb) { ...t2_modified }

// ...t3_modified
t3: Lat Pulldown / ...t3_modified

## Day 4
// ...t1_modified
t1: Deadlift / ...t1_modified

// ...t2_modified
t2: Overhead Press / ...t2_modified

// ...t3_modified
t3: Bent Over Row / ...t3_modified

// **T1**. It starts with **85% of 5RM** (or approximately **75% or 1RM**).
// You can adjust your 1RM by clicking the **edit** icon, and setting the **1 Rep Max** value.
// There's the RM calculator there to help find it out if you don't know it

// **T1**.

// **T1**. Retest week, you may skip warmups. Find your new 5RM (5 rep max), as follows
// * Start with the bar, do 5 reps.
// * Throw on some more weight, do 5 reps.
// * Repeat, when the bar starts to get heavy, make smaller jumps.
// * When you finally get to a set that is hard, but you do it - take that number, and enter into "5RM Test" set weight
// * Mark it completed!
t1_modified / used: none / 2x5, 1x5+ / 3x3, 1x3+ / 4x2, 1x2+ / 1x5 (5RM Test) / 75% / progress: custom(increase: 10lb) {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (setVariationIndex == 4) {
    descriptionIndex = 2
    setVariationIndex = 1
    weights = completedWeights[1] * 0.85
    rm1 = completedWeights[1] / rpeMultiplier(5, 10)
  } else if (completedReps >= reps) {
    weights = completedWeights[ns] + state.increase
  } else if (setVariationIndex == 3) {
    descriptionIndex = 3
    setVariationIndex += 1
  } else {
    setVariationIndex += 1
  }
~}

// **T2**. Start with **55% of 1RM**.
// You can adjust your 1RM by clicking the **edit** icon, and setting the **1 Rep Max** value.
// There's the RM calculator there to help find it out if you don't know it

// **T2**.
t2_modified / used: none / 4x8 / 4x6 / 4x4 / 55% / progress: custom(stage1weight: 0lb, increase: 5lb, stage3increase: 10lb) {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (completedReps >= reps) {
    weights = completedWeights[ns] + state.increase
  } else if (setVariationIndex == 1) {
    state.stage1weight = completedWeights[ns]
    setVariationIndex += 1
  } else if (setVariationIndex == 2) {
    setVariationIndex += 1
  } else {
    setVariationIndex = 1
    weights = state.stage1weight + state.stage3increase
  }
~}

// **T3**.
t3_modified / used: none / 3x12, 1x12+ / 60% 90s / progress: custom() {~
  if (completedReps[ns] >= 18) {
    weights = completedWeights[ns] + 5lb
  }
~}

/// Other variations of T1 and T3:
/// To use them, reuse those templates in your other exercises.
t1_advanced / used: none / 4x5, 1x5+ / 2x5, 1x5+ / 2x3, 1x3+ / 1x5 (5RM Test) / 75% / progress: custom(increase: 5lb) {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (setVariationIndex == 4) {
    descriptionIndex = 2
    setVariationIndex = 1
    weights = completedWeights[1] * 0.85
    rm1 = completedWeights[1] / rpeMultiplier(5, 10)
  } else if (completedReps >= reps) {
    weights = completedWeights[ns] + state.increase
  } else if (setVariationIndex == 3) {
    descriptionIndex = 3
    setVariationIndex += 1
  } else {
    setVariationIndex += 1
  }
~}


t3_linear / used: none / 3x15 / 3x12 / 3x8 / 60% 90s / progress: custom(stage1weight: 0lb, increase: 5lb, stage3increase: 10lb) {~
  if (completedReps >= reps) {
    weights = completedWeights[ns] + state.increase
  } else if (setVariationIndex == 1) {
    state.stage1weight = completedWeights[ns]
    setVariationIndex += 1
  } else if (setVariationIndex == 2) {
    setVariationIndex += 1
  } else {
    setVariationIndex = 1
    weights = state.stage1weight + state.stage3increase
  }
~}
```
