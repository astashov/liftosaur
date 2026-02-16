---
id: madcow
name: Madcow 5x5
author: Bill Starr
url: "https://marathonhandbook.com/madcow/"
shortDescription: Intermediate strength program
isMultiweek: true
tags: []
---

Strength program, using Medium/Light/Heavy day approach, and weekly weight progression for main exercises.

```liftoscript
# Week 1
## Workout A
main / used: none / 1x5 40%, 1x5 55%, 1x5 65%, 1x5 75%, 1x5 85% / progress: custom(increment: 5lb) {~
  if (completedReps >= reps && dayInWeek == 3) {
    weights += state.increment
  }  
~} / update: custom() {~
  if (dayInWeek == 3 && setIndex == 4) {
    if (completedReps[setIndex] >= reps[setIndex]) {
      weights[5] = weights[5] + state.increment
    }
  }
~}
Squat / ...main[1]
Bench Press / ...main[1] / progress: custom(increment: 2.5lb) { ...main }
Bent Over Row / ...main[1] / progress: custom(increment: 2.5lb) { ...main }
Bicep Curl / 3x8-12 / progress: lp(5lb)

## Workout B
main / 1x5 40%, 1x5 55%, 2x5 65%
Squat / ...main[2]
Incline Bench Press / ...main[2] / progress: lp(2.5lb)
Deadlift / ...main[2] / progress: lp(5lb)
Skullcrusher / 3x8-12 / progress: lp(5lb)

## Workout C
main / 1x5 40%, 1x5 55%, 1x5 65%, 1x5 75%, 1x3 85%, 1x8 65%
Squat / ...main[3]
Bench Press / ...main[3]
Bent Over Row / ...main[3]
Hammer Curl / 3x8-12 / progress: lp(5lb)
```
