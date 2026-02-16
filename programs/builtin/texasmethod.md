---
id: texasmethod
name: Texas Method
author: Mark Rippetoe
url: "https://www.t-nation.com/training/texas-method"
shortDescription: "\"Next step\" program after Starting Strength cycle."
isMultiweek: true
tags: []
---

A good program for intermediate lifters from the famous Mark Rippetoe. A good choice when you can't progress anymore adding weight each workout - here you add weight weekly.

```liftoscript
# Week 1
## Volume Day BP
Squat / 5x5 80% / progress: custom() {~
  if (dayInWeek == 3 && completedReps >= reps) {
    weights += 5lb
  }
~}
Bench Press / 5x5 80% / progress: custom() { ...Squat }
Deadlift / 1x5 80% / progress: lp(5lb)
Bicep Curl / 3x10 / progress: dp(5lb, 10, 15)

## Recovery Day BP
Squat / 2x5 70%
Overhead Press / 3x5 70% / progress: custom() { ...Squat }
Chin Up / 3x1+ / 0lb
Back Extension, Bodyweight / 5x10 / 0lb

## Intensity Day BP
// Work up to your new 5RM!
Squat / 1x5 80%+
// Work up to your new 5RM!
Bench Press / 1x5 80%+
Power Clean / 5x3 / 80% / progress: lp(5lb)


# Week 2
## Volume Day OH
Squat / 5x5 80%
Overhead Press / 5x5 80%
Deadlift / 1x5 / 80%
Bicep Curl / 3x10 / 50lb

## Recovery Day OH
Squat / 2x5 70%
Bench Press / 3x5 70%
Chin Up / 3x1+ / 0lb
Back Extension, Bodyweight / 5x10 / 0lb

## Intensity Day OH
// Work up to your new 5RM!
Squat / 1x5 80%+
// Work up to your new 5RM!
Overhead Press / 1x5 80%+
Power Clean / 5x3 / 80%
```
