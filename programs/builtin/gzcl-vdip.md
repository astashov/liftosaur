---
id: gzcl-vdip
name: "GZCL: VDIP"
author: Cody Lefever
url: "https://www.liftosaur.com/programs/gzcl-vdip"
shortDescription: Beginner-intermediate program where each set is AMRAP.
isMultiweek: true
tags: []
---

VDIP - Volume-dependent Intensity Progression. A bit unusual program, where each set for each exercise is AMRAP, and we increase the weight based on total completed reps for all sets.

Before starting the program, please read [the program explanation on author's blog](https://swoleateveryheight.blogspot.com/2016/11/volume-dependent-intensity-progression.html) first!

```liftoscript
# Week 1
## Day 1
t1 / used: none / 3x1+ 80% / 180s / progress: custom() {~
  if (sum(completedReps) >= 15) {
    weights += 10lb
  } else if (sum(completedReps) >= 10) {
    weights += 5lb
  }
~}
t2 / used: none / 3x1+ 60% / 120s / progress: custom() {~
  if (sum(completedReps) >= 30) {
    weights += 10lb
  } else if (sum(completedReps) >= 25) {
    weights += 5lb
  }
~}
t3 / used: none / 4x1+ 50% / 60s / progress: sum(50, 5lb)

t1: Squat / ...t1
t2: Stiff Leg Deadlift / ...t2
t3: Lunge / ...t3
t3: Pull Up / ...t3

## Day 2
t1: Bench Press / ...t1
t2: Bent Over Row / ...t2
t3: Bench Press Close Grip / ...t3
t3: Shoulder Press / ...t3

## Day 3
t1: Deadlift / ...t1
t2: Front Squat / ...t2
t3: Bent Over One Arm Row / ...t3
t3: Seated Row / ...t3

## Day 4
t1: Overhead Press / ...t1
t2: Push Press, Barbell / ...t2
t3: Incline Bench Press / ...t3
t3: Chest Dip / ...t3

## Day 5
t1: Front Squat / ...t1
t2: Squat / ...t2
t3: Lat Pulldown / ...t3
t3: Bicep Curl, EZ Bar / ...t3
```
