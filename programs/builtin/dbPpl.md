---
id: dbPpl
name: Dumbbell P/P/L
author: /u/gregariousHermit
url: "https://old.reddit.com/r/Fitness/comments/2e79y4/dumbbell_ppl_proposed_alternative_to_dumbbell/"
shortDescription: Dumbbell-only push/pull/legs split. Great if you only have dumbbells.
isMultiweek: true
tags: []
---

This is a great starting routine for beginners if you only have dumbbells available. If you have a barbell, then your better bet is 'Basic Beginner Routine'.

It's a Push/Pull/Legs routine with linear progressing, each day is focused on either Push, Pull or Legs.

You'll need a bench, adjustable dumbbells and a pull-up bar.

```liftoscript
# Week 1
## Push Day
main / used: none / 3x12 / progress: custom(increment: 2.5lb, lastReps: 0, failures: 0) {~
  if (completedReps >= reps) {
    weights += state.increment
    state.failures = 0
    state.lastReps = 0
  } else {
    if (sum(completedReps) <= state.lastReps) {
      state.failures += 1
    } else {
      state.lastReps = sum(completedReps)
    }
    if (state.failures >= 3) {
      weights -= 5lb
      state.lastReps = 0
      state.failures = 0
    }
  }
~}

Bench Press, Dumbbell / ...main / 40lb
Incline Chest Fly / 30lb / ...main
Arnold Press / 50lb / ...main
Triceps Extension / 50lb / ...main
Hanging Leg Raise, Bodyweight / 3x12 / 0lb

## Pull Day
Pull Up, Bodyweight / 3x12 / 0lb
Bent Over Row, Dumbbell / 40lb / ...main
Lateral Raise / 20lb / ...main
Shrug / 50lb / ...main
Bicep Curl / 20lb / ...main

## Legs Day
Goblet Squat / 40lb / ...main
Lunge, Dumbbell / 20lb / ...main
Single Leg Deadlift, Bodyweight / 50lb / ...main
Standing Calf Raise / 50lb / ...main
Hanging Leg Raise, Bodyweight / 3x12 / 0lb
```
