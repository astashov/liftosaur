---
id: gzcl-uhf-5-weeks
name: "GZCL: UHF 5 weeks"
author: Cody Lefever
url: "https://www.gainzfever.com/"
shortDescription: 5-week GZCL program adopting a Daily Undulating Periodization model of progression. Ultra High Frequency.
isMultiweek: true
tags: []
---

It's a 5-week variant of original 9-week GZCL: UHF program

Please read the [program explanation](https://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html) before starting the program!

```liftoscript
# Week 1
## Day 1
// **T1**. Before starting the sets, set your 1RM - by clicking "Edit" icon at the exercise.
t1: Squat / 2x4 81%, 1x4+ 81% / 180s 
// **T2**. Same - set your 1RM before starting the sets
t2: Incline Bench Press / 3x10 57%, 1x10+ 57% / 120s
// **T3**. Work up to the RM for the first set, then use the same weight for the rest of the sets
t3: Seated Row / 1x12-15 60%+, 4x1+ 60% / 60s / update: custom() {~
  if (setIndex == 1) {
    weights = completedWeights[1]
  }
~}
// ...t3: Seated Row
t3: Bicep Curl[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Seated Leg Curl[1-5] / ...t3: Seated Row/ update: custom() { ...t3: Seated Row }

## Day 2
// ...t1: Squat
t1: Bench Press / 2x4 81%, 1x4+ 81% / 180s
// **T2**. Pause Squat. Same - set your 1RM before starting the sets
t2: Squat / 6x3 67%, 1x3+ 67% / 120s
// ...t3: Seated Row
t3: Shoulder Press[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Lateral Raise[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Pec Deck[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }

## Day 3
// **T1**. 3" Deficit Deadlift. Before starting the sets, set your 1RM - by clicking "Edit" icon at the exercise.
t1: Deadlift / 2x4 71%, 1x4+ 71% / 180s
// ...t2: Incline Bench Press
t2: Legs Up Bench Press / 3x10 57%, 1x10+ 57% / 120s
// ...t3: Seated Row
t3: Pull Up[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Reverse Hyperextension[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Reverse Fly[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }

## Day 4
// ...t1: Squat
t1: Sling Shot Bench Press / 2x4 86%, 1x4+ 86% / 180s
// **T2**. Paused Deadlift. Same - set your 1RM before starting the sets
t2: Deadlift / 6x3 57%, 1x3+ 57% / 120s
// ...t3: Seated Row
t3: Incline Bench Press Wide Grip[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Chest Dip[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row

## Day 5
// ...t1: Squat
t1: Front Squat / 2x4 81%, 1x4+ 81% / 180s
// ...t2: Incline Bench Press
t2: Bench Press Close Grip / 3x10 62%, 1x10+ 62% / 120s
// ...t3: Seated Row
t3: Stiff Leg Deadlift[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Lunge[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Lat Pulldown[1-5] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }


# Week 2
## Day 1
// **T1**
t1: Squat / 3x3 86%, 1x3+ 86% / 190s
// **T2**
t2: Incline Bench Press / 4x8 62% / 128s
t3: Seated Row / 1x12-15 60%+, 4x1+ 60% / 64s

## Day 2
t1: Bench Press / 3x3 86%, 1x3+ 86% / 190s
// **T2**. Pause Squat.
t2: Squat / 8x2 71% / 128s

## Day 3
// **T1**. 3" Deficit Deadlift
t1: Deadlift / 3x3 76%, 1x3+ 76% / 190s
// **T2**
t2: Legs Up Bench Press / 4x8 62% / 128s

## Day 4
t1: Sling Shot Bench Press / 3x3 90%, 1x3+ 90% / 190s
// **T2**. Paused Deadlift.
t2: Deadlift / 8x2 62% / 128s

## Day 5
t1: Front Squat / 3x3 86%, 1x3+ 86% / 190s
t2: Bench Press Close Grip / 4x8 67% / 128s


# Week 3
## Day 1
t1: Squat / 1x3 83%, 1x2 88%, 2x1 93%, 1x1+ 93% / 200s
t2: Incline Bench Press / 4x6 67% / 136s
t3: Seated Row / 1x8-10 73%+, 3x1+ 73% / 68s

## Day 2
t1: Bench Press / 1x3 83%, 1x2 88%, 2x1 93%, 1x1+ 93% / 200s
t2: Squat / 9x1 76%, 1x1+ 76% / 136s

## Day 3
// **T1**. 2" Deficit Deadlift
t1: Deadlift / 4x2 81%, 1x2+ 81% / 200s
t2: Legs Up Bench Press / 4x6 67% / 136s

## Day 4
t1: Sling Shot Bench Press / 1x3 88%, 1x2 93%, 2x1 97%, 1x1+ 97% / 200s
t2: Deadlift / 9x1 67%, 1x1+ 67% / 136s

## Day 5
t1: Front Squat / 1x3 83%, 1x2 88%, 2x1 93%, 1x1+ 93% / 200s
t2: Bench Press Close Grip / 4x6 71% / 136s


# Week 4
## Day 1
t1: Squat / 4x1 90%, 1x1+ 90% / 210s
t2: Incline Bench Press / 4x5 71%, 1x5+ 71% / 144s
t3: Seated Row / 1x6-8 79%+, 2x1+ 79% / 72s

## Day 2
t1: Bench Press / 4x1 90%, 1x1+ 90% / 210s
// **T2**
t2: Squat / 4x5 74%, 1x5+ 74% / 144s

## Day 3
// **T1**. 1" Deficit Deadlift
t1: Deadlift / 1x3 83%, 1x2 88%, 2x1 93%, 1x1+ 93% / 210s
t2: Legs Up Bench Press / 4x5 71%, 1x5+ 71% / 144s

## Day 4
t1: Sling Shot Bench Press / 4x1 95%, 1x1+ 95% / 210s
// **T2**
t2: Deadlift / 4x5 71%, 1x5+ 71% / 144s

## Day 5
t1: Front Squat / 4x1 90%, 1x1+ 90% / 210s
t2: Bench Press Close Grip / 4x5 76%, 1x5+ 76% / 144s


# Week 5
## Day 1
t1: Squat / 1x3 86%, 1x2 90%, 1x1+ 95% / 220s
t2: Incline Bench Press / 1x1+ 52% / 152s
t3: Seated Row / 1x10 73%+ / 76s

## Day 2
t1: Bench Press / 1x3 86%, 1x2 90%, 1x1+ 95% / 220s
t2: Squat / 1x1+ 57% / 152s

## Day 3
// **T1**
t1: Deadlift / 1x3 86%, 1x2 90%, 1x1+ 95% / 220s
t2: Legs Up Bench Press / 1x1+ 52% / 152s

## Day 4
t1: Sling Shot Bench Press / 1x3 90%, 1x2 95%, 1x1+ 100% / 220s
t2: Deadlift / 1x1+ 52% / 152s

## Day 5
t1: Front Squat / 1x3 86%, 1x2 90%, 1x1+ 95% / 220s
t2: Bench Press Close Grip / 1x1+ 57% / 152s
```
