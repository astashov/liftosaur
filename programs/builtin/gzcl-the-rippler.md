---
id: gzcl-the-rippler
name: "GZCL: The Rippler"
author: Cody Lefever
url: "https://www.gainzfever.com/"
shortDescription: A 12-week GZCL program optimizing bi-weekly undulation in intensity, weight and reps. A good next step after GZCLP.
isMultiweek: true
tags: []
---

A four-day upper/lower, with bi-weekly undulation in intensity, weight and reps.

More volume and slower progression than in GZCLP, which makes it a good program for intermediate lifters.
The bi-weekly waving patterns of weight change and gradual reducing of volume and increasing the weight makes it quite fun to follow!

Please read the [program explanation](https://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html) before start!

```liftoscript
# Week 1
## Day 1
// **T1**. Set your 1RM before starting the sets.
t1 / used: none / 3x5 (80%) / 80% / progress: custom() {~
  if (week == 12) {
    rm1 = completedWeights[ns]
  }
~}

// **T2**. Set your 1RM before starting the sets.
t2 / used: none / 5x6 (68%) / 68%

// **T3**. Also start your 1RM. Don't be afraid to choose lighter
// weights - it'll autobalance in later workouts.
t3 / used: none / 5x10+ (75%) / 75% / progress: custom() {~
  if (week == 3 || week == 6 || week == 9) {
    if (sum(completedReps) > (week == 3 ? 70 : week == 2 ? 60 : 50)) {
      rm1 += 15lb
    } else if (sum(completedReps) > (week == 3 ? 60 : week == 2 ? 50 : 40)) {
      rm1 += 10lb
    } else if (sum(completedReps) > (week == 3 ? 50 : week == 2 ? 40 : 30)) {
      rm1 += 5lb
    }
  }
~}

// ...t1
t1: Bench Press[1-12] / ...t1

// ...t2
t2: Incline Bench Press[1-10] / ...t2

// ...t3
t3: Behind The Neck Press[1-10] / ...t3

// ...t3
t3: Lateral Raise[1-10] / ...t3

## Day 2
// ...t1
t1: Squat[1-12] / ...t1

//  ...t2
t2: Stiff Leg Deadlift[1-10] / ...t2

// ...t3
t3: Pull Up[1-10] / ...t3

// ...t3
t3: Bicep Curl[1-10] / ...t3

## Day 3
// ...t1
t1: Overhead Press[1-12] / ...t1

//  ...t2
t2: Bench Press Close Grip[1-10] / ...t2

// ...t3
t3: Incline Bench Press[1-10] / ...t3

// ...t3
t3: Pullover[1-10] / ...t3

## Day 4
// ...t1
t1: Deadlift[1-12] / ...t1

//  ...t2
t2: Front Squat[1-10] / ...t2

// ...t3
t3: Bent Over Row[1-10] / ...t3

// ...t3
t3: Reverse Fly[1-10] / ...t3


# Week 2
## Day 1
// **T1**.
t1 / 3x3 (85%), 1x3+ (85%) / 85%

// **T2**.
t2 / 5x5 (72%) / 72%

// **T3**.
t3[2-3] / 5x10+ (75%) / 75%

## Day 2


## Day 3


## Day 4



# Week 3
## Day 1
t1 / 3x4 (82.5%) / 82.5%
t2 / 4x4 (76%), 1x4+ (76%) / 76%

## Day 2


## Day 3


## Day 4



# Week 4
## Day 1
t1 / 5x2 (87.5%) / 87.5%
t2 / 4x6 (70%) / 70%
t3[4-6] / 4x10+ (75%) / 75%

## Day 2


## Day 3


## Day 4



# Week 5
## Day 1
t1 / 2x4 (85%), 1x4+ (85%) / 85%
t2 / 4x5 (74%) / 74%

## Day 2


## Day 3


## Day 4



# Week 6
## Day 1
t1 / 4x2 (90%) / 90%
t2 / 3x4 (78%), 1x4+ (78%) / 78%

## Day 2


## Day 3


## Day 4



# Week 7
## Day 1
t1 / 3x3 (87.5%) / 87.5%
t2 / 3x6 (72%) / 72%
t3[7-9] / 3x10+ (75%) / 75%

## Day 2


## Day 3


## Day 4



# Week 8
## Day 1
t1 / 8x1 (92.5%), 1x1+ (92.5%) / 92.5%
t2 / 3x5 (76%) / 76%

## Day 2


## Day 3


## Day 4



# Week 9
## Day 1
t1 / 2x2 (90%), 1x2+ (90%) / 90%
t2 / 2x4 (80%), 1x4+ (80%) / 80%

## Day 2


## Day 3


## Day 4



# Week 10
## Day 1
t1 / 1x1 (95%) / 95%
t2 / 4x3 (85%), 1x3+ (85%) / 85%
t3 / 2x10+ (75%) / 75%

## Day 2


## Day 3


## Day 4



# Week 11
## Day 1
t1 / 3x2 (85%), 1x2+ (85%) / 85%

## Day 2


## Day 3


## Day 4



# Week 12
## Day 1
// **T1**. It's **week 12**, time to test your **1RM**. Do that, and then set the weight
// you did, and then complete the set.
t1 / 1x1 (95%) / 95%

## Day 2


## Day 3


## Day 4
```
