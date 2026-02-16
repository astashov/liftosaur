---
id: gzcl-general-gainz
name: "GZCL: General Gainz"
author: Cody Lefever
url: "https://www.liftosaur.com/programs/gzcl-general-gainz"
shortDescription: Latest GZCL program combining learnings from all other GZCL programs.
isMultiweek: true
tags: []
---

It's the latest Cody program, combining the elements and best parts of other GZCL programs: GZCLP, VDIP, Jacked & Tan 2.0, etc.

Before starting the program, please read [the program explanation on Reddit](https://www.reddit.com/r/gzcl/comments/aqkdgo/happy_gday_gainerz/) first!

```liftoscript
# Week 1
## Day 1
// **T1**.
// * **Find**: Initially set your 1RM for the exercise, and work up to the first set.
// * **Extend**: Do the same amount of singles (1 rep) as it was your RM, with the same weight. E.g. if you did 4RM, do 4 sets x 1 rep after. You can extend the number of sets up to 3 extra sets (e.g. for 4RM - up to 7 sets x 1 rep max) if 4RM was easy.
// * Next time, you'd either try to do the same number of reps with the same weight (**Hold**), or try to **Push** and do more reps.
// * If you are able to do 6 reps with 6 extensions, the weight will be increased next time
t1 / used: none / 1+x3-6 85% / 180s / update: custom() {~
  if (setIndex == 1) {
    numberOfSets = completedReps[1] > 2 ? completedReps[1] + 1 : 2
    sets(2, 99, 1, 1, 0, completedWeights[1], 180, 0, 0)
  }
~} / progress: custom() {~
  if (completedReps >= reps && numberOfSets == 7) {
    weights += 5lb
  }
~}

// **T2**.
// * **Find**: Initially set your 1RM for the exercise, and work up to the first set.
// * **Extend**: Do the of "halfes" sets (your RM from the first set / 2) so the volume would be double of your RM. E.g. if you did 10RM, do 4 sets x 5 reps (20 total) after. You can extend the number of sets up to 2 extra sets if 10RM was easy.
// * Next time, you'd either try to do the same number of reps with the same weight (**Hold**), or try to **Push** and do more reps.
// * If you are able to do 10RM with 4 extensions, the weight will be increased next time
t2 / used: none / 1+x6-10 75%, 4x1 75% / 120s / update: custom() {~
  if (setIndex == 1) {
    sets(2, 99, floor(completedReps[1] / 2), floor(completedReps[1] / 2), 0, completedWeights[1], 120, 0, 0)
  }
~} / progress: custom() {~
  if (completedReps >= reps) {
    weights += 5lb
  }
~}

// **T3**. All sets are Max Rep Sets (AMRAP).
t3 / used: none / 3x10+ 50% / 90s

// ...t1
t1: Squat / ...t1
// ...t2
t2: Romanian Deadlift, Barbell / ...t2
// ...t3
t3: Seated Leg Curl / ...t3
// ...t3
t3: Leg Extension / ...t3

## Day 2
// ...t1
t1: Bench Press / ...t1
// ...t2
t2: Incline Bench Press / ...t2
// ...t3
t3: Seated Row / ...t3
// ...t3
t3: Lat Pulldown / ...t3

## Day 3
// ...t1
t1: Deadlift / ...t1
// ...t2
t2: Front Squat / ...t2
// ...t3
t3: Crunch, Cable / ...t3
// ...t3
t3: Good Morning / ...t3

## Day 4
// ...t1
t1: Overhead Press / ...t1
// ...t2
t2: Chin Up / ...t2
// ...t3
t3: Bicep Curl / ...t3
// ...t3
t3: Skullcrusher / ...t3
```
