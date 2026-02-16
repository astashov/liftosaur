---
id: arnoldgoldensix
name: "Arnold's Golden Six"
author: Arnold Schwarzenegger
url: "https://liftvault.com/programs/bodybuilding/arnold-schwarzenegger-workout-routine-golden-six/"
shortDescription: Arnold Schwarzenegger’s 3 day beginner hypertrophy program
isMultiweek: true
tags: []
---

Very simple hypertrophy program - just 6 exercises repeated each day, with progression if you hit 13+ reps on last set.

Choose starting weights and set them to the `weight` variable. Tend to go on the light side - autoprogression will balance it soon anyway

```liftoscript
# Week 1
## Day 1
Squat / 3x10, 1x10+ / progress: custom() {~
  if (
    completedReps >= reps &&
    completedReps[numberOfSets] >= reps[numberOfSets] + 3
  ) {
    weights += 5lb
  }
~}
Bench Press Wide Grip / 2x10, 1x10+ / progress: custom() { ...Squat }
Chin Up / 3x1+ / 0lb / warmup: none / progress: custom(weight: 0lb, reps: 1) {~
  if (completedReps >= reps) {
    reps = completedReps[ns] + 1
  }
~}
Overhead Press / 4x10 / warmup: 1x5 50%
Bicep Curl / 3x10 / warmup: none
Crunch / 3x1+ / 60s / warmup: none
```
