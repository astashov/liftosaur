---
id: gzcl-uhf-9-weeks
name: "GZCL: UHF 9 weeks"
author: Cody Lefever
url: "https://www.gainzfever.com/"
shortDescription: 9-week GZCL program adopting a Daily Undulating Periodization model of progression. Ultra High Frequency.
isMultiweek: true
tags: []
---

The T1 resets base intensities and volumes every fourth week. The T2 progresses in the same three-week blocks but with other controls in place to maintain progression sustainability from weeks four through nine.

In the UHF model greater importance is placed on the effort of the T1, which is accomplished by AMRAP sets every workout. T2 movements experience AMRAP sets every fourth week because the decreased T1 intensity necessitates an increase in overall effort. Using an AMRAP in the T2 accomplishes this task.

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
t3: Bicep Curl[1-8] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Seated Leg Curl[1-9] / ...t3: Seated Row/ update: custom() { ...t3: Seated Row }

## Day 2
// ...t1: Squat
t1: Bench Press / ...t1: Squat
// **T2**. Pause Squat. Set your 1RM before starting the sets.
t2: Squat / 6x3 67%, 1x3+ 67% / 120s
// ...t3: Seated Row
t3: Shoulder Press[1-9] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Lateral Raise[1-8] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Pec Deck[1-9] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }

## Day 3
// **T1**. 3" Deficit Deadlift. Before starting the sets, set your 1RM - by clicking "Edit" icon at the exercise.
t1: Deadlift / 2x4 71%, 1x4+ 71% / 180s
// ...t2: Incline Bench Press 
t2: Legs Up Bench Press / 3x10 57%, 1x10+ 57% / 120s
// ...t3: Seated Row
t3: Pull Up[1-9] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Reverse Hyperextension[1-8] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Reverse Fly[1-9] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }

## Day 4
// ...Squat
t1: Sling Shot Bench Press / 2x4 86%, 1x4+ 86% / 180s
// **T2**. Paused Deadlift. Set your 1RM before starting the sets.
t2: Deadlift / 6x3 67%, 1x3+ 67% / 120s
// ...t3: Seated Row
t3: Incline Bench Press Wide Grip[1-9] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Chest Dip[1-8] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Triceps Extension[1-9] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }

## Day 5
// ...t1: Squat
t1: Safety Squat Bar Squat / 2x4 67%, 1x4+ 67% / 180s
// ...t2: Incline Bench Press 
t2: Bench Press Close Grip / 3x10 62%, 1x10+ 62% / 120s
// ...t3: Seated Row
t3: Stiff Leg Deadlift[1-9] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Lunge[1-8] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }
// ...t3: Seated Row
t3: Lat Pulldown[1-9] / ...t3: Seated Row / update: custom() { ...t3: Seated Row }


# Week 2
## Day 1
// **T1**
t1: Squat / 3x3 86%, 1x3+ 86% / 190s
// **T2**
t2: Incline Bench Press / 4x8 62% / 128s
// **T3**
t3: Seated Row / 1x12-15 60%+, 4x1+ 60% / 64s

## Day 2
// **T1**
t1: Bench Press / 3x3 86%, 1x3+ 86% / 190s
// **T2**. Pause Squat.
t2: Squat / 8x2 71% / 128s

## Day 3
// **T1**. 3" Deficit Deadlift.
t1: Deadlift / 3x3 76%, 1x3+ 76% / 190s
// **T2**
t2: Legs Up Bench Press / 4x8 62% / 128s

## Day 4
// **T1**
t1: Sling Shot Bench Press / 3x3 90%, 1x3+ 90% / 190s
// **T2**. Paused Deadlift.
t2: Deadlift / 8x2 73% / 128s

## Day 5
// **T1**
t1: Safety Squat Bar Squat / 3x3 71%, 1x3+ 71% / 190s
// **T2**
t2: Bench Press Close Grip / 4x8 67% / 128s


# Week 3
## Day 1
t1: Squat / 4x2 90%, 1x2+ 90% / 200s
t2: Incline Bench Press / 4x6 67% / 136s
t3: Seated Row / 1x10-12 68%+, 3x1+ 68% / 68s

## Day 2
t1: Bench Press / 4x2 90%, 1x2+ 90% / 200s
t2: Squat / 10x1 76% / 136s

## Day 3
t1: Deadlift / 4x2 81%, 1x2+ 81% / 200s
t2: Legs Up Bench Press / 4x6 67% / 136s

## Day 4
t1: Sling Shot Bench Press / 4x2 95%, 1x2+ 95% / 200s
t2: Deadlift / 10x1 78% / 136s

## Day 5
t1: Safety Squat Bar Squat / 4x2 76%, 1x2+ 76% / 200s
t2: Bench Press Close Grip / 4x6 71% / 136s


# Week 4
## Day 1
t1: Squat / 1x3 83%, 1x2 86%, 4x1 88%, 1x1+ 88% / 210s
t2: Incline Bench Press / 4x5 71%, 1x5+ 71% / 144s
t3: Seated Row / 1x10-12 68%+, 3x1+ 68% / 72s

## Day 2
t1: Bench Press / 1x3 83%, 1x2 86%, 4x1 88%, 1x1+ 88% / 210s
// **T2**
t2: Squat / 4x5 74%, 1x5+ 74% / 144s

## Day 3
// **T1**. 2" Deficit Deadlift
t1: Deadlift / 1x3 74%, 1x2 76%, 4x1 88%, 1x1+ 88% / 210s
t2: Legs Up Bench Press / 4x5 71%, 1x5+ 71% / 144s

## Day 4
t1: Sling Shot Bench Press / 1x3 88%, 1x2 90%, 4x1 93%, 1x1+ 93% / 210s
// **T2**
t2: Deadlift / 4x5 84%, 1x5+ 84% / 144s

## Day 5
t1: Safety Squat Bar Squat / 1x3 69%, 1x2 71%, 4x1 74%, 1x1+ 74% / 210s
t2: Bench Press Close Grip / 4x5 76%, 1x5+ 76% / 144s


# Week 5
## Day 1
t1: Squat / 1x3 86%, 1x2 88%, 3x1 90%, 1x1+ 90% / 220s
t2: Incline Bench Press / 5x4 74% / 152s
t3: Seated Row / 1x8-10 73%+, 2x1+ 73% / 76s

## Day 2
t1: Bench Press / 1x3 86%, 1x2 88%, 3x1 90%, 1x1+ 90% / 220s
t2: Squat / 5x4 76% / 152s

## Day 3
t1: Deadlift / 1x3 76%, 1x2 78%, 3x1 81%, 1x1+ 81% / 220s
t2: Legs Up Bench Press / 5x4 74% / 152s

## Day 4
t1: Sling Shot Bench Press / 1x3 90%, 1x2 93%, 3x1 95%, 1x1+ 95% / 220s
t2: Deadlift / 5x4 87% / 152s

## Day 5
t1: Safety Squat Bar Squat / 1x3 71%, 1x2 74%, 3x1 76%, 1x1+ 76% / 220s
t2: Bench Press Close Grip / 5x4 78% / 152s


# Week 6
## Day 1
t1: Squat / 1x3 88%, 1x2 90%, 2x1 93%, 1x1+ 93% / 230s
t2: Incline Bench Press / 5x3 76% / 160s
t3: Seated Row / 1x8-10 73%+, 2x1+ 73% / 80s

## Day 2
t1: Bench Press / 1x3 88%, 1x2 90%, 2x1 93%, 1x1+ 93% / 230s
t2: Squat / 5x3 78% / 160s

## Day 3
t1: Deadlift / 1x3 78%, 1x2 81%, 2x1 83%, 1x1+ 83% / 230s
t2: Legs Up Bench Press / 5x3 76% / 160s

## Day 4
t1: Sling Shot Bench Press / 1x3 93%, 1x2 95%, 2x1 97%, 1x1+ 97% / 230s
t2: Deadlift / 5x3 89% / 160s

## Day 5
t1: Safety Squat Bar Squat / 1x3 74%, 1x2 76%, 2x1 78%, 1x1+ 78% / 230s
t2: Bench Press Close Grip / 5x3 81% / 160s


# Week 7
## Day 1
t1: Squat / 2x3 86%, 1x3+ 86% / 240s
t2: Incline Bench Press / 9x2 78%, 1x2+ 78% / 168s
t3: Seated Row / 1x6-8 79%+, 1x1 79% / 84s

## Day 2
t1: Bench Press / 2x3 86%, 1x3+ 86% / 240s
// **T2**. Pause Squat.
t2: Squat / 4x2 71%, 1x2+ 71% / 168s

## Day 3
// **T1**.
t1: Deadlift / 2x3 86%, 1x3+ 86% / 240s
t2: Legs Up Bench Press / 4x2 78%, 1x2+ 78% / 168s

## Day 4
t1: Sling Shot Bench Press / 2x3 90%, 1x3+ 90% / 240s
t2: Deadlift / 4x2 92%, 1x2+ 92% / 168s

## Day 5
t1: Safety Squat Bar Squat / 2x3 71%, 1x3+ 71% / 240s
t2: Bench Press Close Grip / 4x2 83%, 1x2+ 83% / 168s


# Week 8
## Day 1
t1: Squat / 4x1 88%, 1x1+ 88% / 250s
t2: Incline Bench Press / 10x1 81% / 176s
t3: Seated Row / 1x6-8 79%+, 1x1 79% / 88s

## Day 2
t1: Bench Press / 4x1 88%, 1x1+ 88% / 250s
t2: Squat / 10x1 74% / 176s

## Day 3
t1: Deadlift / 4x1 88%, 1x1+ 88% / 250s
t2: Legs Up Bench Press / 10x1 81% / 176s

## Day 4
t1: Sling Shot Bench Press / 4x1 93%, 1x1+ 93% / 250s
t2: Deadlift / 10x1 95% / 176s

## Day 5
t1: Safety Squat Bar Squat / 4x1 74%, 1x1+ 74% / 250s
t2: Bench Press Close Grip / 10x1 86% / 176s


# Week 9
## Day 1
t1: Squat / 1x3 90%, 1x2 93%, 1x1 95% / 260s
t3: Seated Row / 1x10 73%+ / 92s

## Day 2
t1: Bench Press / 1x3 90%, 1x2 93%, 1x1 95% / 260s

## Day 3
t1: Deadlift / 1x3 90%, 1x2 93%, 1x1 95% / 260s

## Day 4
t1: Sling Shot Bench Press / 1x3 95%, 1x2 97%, 1x1 100% / 260s
// **T2**. 4" Block Deadlift
t2: Deadlift / 3x5, 1x5+ / 90% 176s

## Day 5
t1: Safety Squat Bar Squat / 1x3 76%, 1x2 78%, 1x1 81% / 260s
```
