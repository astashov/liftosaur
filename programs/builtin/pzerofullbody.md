---
id: pzerofullbody
name: P-Zero Full Body
author: Cody Lefever
url: "https://www.amazon.com/P-Zero-Revisiting-Method-Cody-Lefever-ebook/dp/B0FB43HYVJ"
shortDescription: "Latest GZCL program, it's like GZCLP 2.0"
isMultiweek: false
tags: []
frequency: 4
age: "3_to_12_months"
duration: "60-90"
goal: "strength_and_hypertrophy"
---

This is a program from the latest Cody's book. Unlike GZCLP, it prioritizes higher volume, and higher variety in exercises. It's in-between powerlifting and bodybuilding, but leans a bit more to bodybuilding, with higher rep ranges.

Make sure to read the book before doing the program! It gives a detailed explanation how things should work

```liftoscript
# Week 1
## Workout A1
// ...T1
T1: Deadlift / ...T1

// ...T2
T2: Bench Press / ...T2

// ...T3
T3: T Bar Row / ...T3

// ...T3
T3: Leg Press / ...T3

// ...T3
T3: Chest Dip / ...T3

// ...T3
T3: Cable Crunch / ...T3

## Workout B1
// ...T1
T1: Overhead Press / ...T1

// ...T2
T2: Squat / ...T2

// ...T3
T3: Pull Up / ...T3

// ...T3
T3: Incline Bench Press, Dumbbell / ...T3

// ...T3
T3: Seated Leg Curl / ...T3

// ...T3
T3: Bicep Curl / ...T3

## Workout A2
// ...T1
T1: Bench Press / ...T1

// ...T2
T2: Deadlift / ...T2

// ...T3
T3: Seated Row / ...T3

// ...T3
T3: Shoulder Press / ...T3

// ...T3
T3: Leg Extension / ...T3

// ...T3
T3: Side Crunch, Cable / ...T3

## Workout B2
// ...T1
T1: Squat / ...T1

// ...T2
T2: Overhead Press / ...T2

// ...T3
T3: Romanian Deadlift, Barbell / ...T3

// ...T3
T3: Bench Press, Dumbbell / ...T3

// ...T3
T3: Lateral Raise, Cable / ...T3

// ...T3
T3: Flat Leg Raise / ...T3



// **T1**. Set your 1RM before start.

// **T1**.
T1 / used: none / 3x4, 1x5+ / 3x3, 1x4+ / 3x2, 1x3+ / 72% / progress: custom(increase: 5lb, stage1weight: 0lb) {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (setVariationIndex == 1) {
    state.stage1weight = weights[ns]
  }
  weights += state.increase
  if (completedReps[ns] < reps[ns]) {
    if (setVariationIndex == 3) {
      setVariationIndex = 1
      weights = state.stage1weight + state.increase
    } else {
      setVariationIndex += 1
    }
  }
~}


// **T2**. Set your 1RM before start.

// **T2**.
T2 / used: none / 4x12 / 4x10 / 4x8 / 52% 120s / progress: custom(increase: 5lb, stage1weight: 0lb) {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (setVariationIndex == 1) {
    state.stage1weight = weights[ns]
  }
  weights += state.increase
  if (!(completedReps >= reps)) {
    if (setVariationIndex == 3) {
      setVariationIndex = 1
      weights = state.stage1weight + state.increase
    } else {
      setVariationIndex += 1
    }
  }
~}


// **T3**. You need to get total reps indicated by max reps in range in
// as few sets as possible. Complete a set with some reps, then add another
// set and complete again. If you do all required reps in <= 4 sets, weight goes up.
// If more than 4 sets - it goes to the next stage (dropping the goal reps)
T3 / used: none / 1x1-60+ / 50% 90s / progress: custom(increase: 5lb, initialReps: 60, diff: 15, stage1weight: 0lb) {~
  if (reps[ns] == state.initialReps) {
    state.stage1weight = weights[ns]
  }
  if (sum(completedReps) >= reps[ns]) {
    if (completedNumberOfSets <= 4) {
      weights += state.increase
    } else {
      if (reps[ns] == state.initialReps - state.diff * 2) {
        weights = state.stage1weight + state.increase
        reps = state.initialReps
      } else {
        reps -= state.diff
      }
    }
  }
~}

// **T1 Ultra**.
// It asks you if want to go switch to the next stage at the end (0 - keep, 1 - switch).
// Switch to the next stage if the last set is significantly slower than first one.
T1Ultra / used: none / 3x1 / 2x1 / 1x1 / 90% / progress: custom(increase: 5lb, nextstage+: 0) {~
  weights += state.increase
  if (state.nextstage > 0) {
    setVariationIndex += 1
  }
~}
```
