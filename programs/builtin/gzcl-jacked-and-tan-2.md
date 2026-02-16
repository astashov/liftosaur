---
id: gzcl-jacked-and-tan-2
name: "GZCL: Jacked & Tan 2.0"
author: Cody Lefever
url: "https://www.gainzfever.com"
shortDescription: Another good next step after GZCLP.
isMultiweek: true
tags: []
---

A good next step after GZCLP. It's a twelve-week strength and hypertrophy training regimen that focuses on a higher volume and intensity approach, employing varying rep ranges and periodization to maximize muscle growth and strength gains.

Before starting the program, please read the [program explanation](https://swoleateveryheight.blogspot.com/2016/07/jacked-tan-20.html) first!

```liftoscript
# Week 1
## Day 1
// **T1**. Warmup up to **10 RM** for the first set, then try a 10RM, tap the first
// set and enter the 10RM weight you get. Then, do the drop sets (based on 1RM)
t1 / used: none / 1x10 75%+ (10RM), 2x6 65% (TM 70%), 1x6+ 65% (TM 70%) / update: custom() {~
  if (week >= 7 && week <= 11 && setIndex == 1) {
    weights = completedWeights[1] * (week >= 10 ? 0.9 : 0.85)
  }
~} / progress: custom() {~
  if (week == 6 || week == 12) {
    rm1 = completedWeights[1]
  }
~}

// **T2a.**
t2a / used: none / 4x10 50% (TM 50%)

// **T2b.** Same as in T1 - work up to 15RM, then record the weight.
// Then, do MRS (Max Rep Sets) - i.e. AMRAP, as many reps as possible
t2b / used: none / 1x15 60%+ (15RM), 3x10+ 60% (MRS) / update: custom() {~ if (setIndex == 1) { weights = completedWeights[1] } ~}

// **T3.**. Similar to T2b, but different first set 1RM weight
t3 / used: none / 1x20 50%+ (20RM), 3x10+ 50% (MRS) / update: custom() {~ if (setIndex == 1) { weights = completedWeights[1] } ~}

// ...t1
Squat[1,1-12] / ...t1

// ...t2a
Deficit Deadlift[2,1-5] / ...t2a

// ...t2b
Incline Row[3,1-5] / ...t2b

// ...t3
Triceps Pushdown[4,1-6] / ...t3

// **T3.**
Bent Over Row, Cable[4,1-6] / ...t3

// **T3.**
Hammer Curl, Dumbbell[4,1-6] / ...t3

## Day 2
// ...t1
Bench Press[1,1-12] / ...t1
// ...t2a
Bench Press Close Grip[2,1-5] / ...t2a
// ...t2b
Shoulder Press[3,1-5] / ...t2b
// ...t3
Shrug[4,1-6] / ...t3
// ...t3
Pec Deck[4,1-6] / ...t3
// ...t3
Face Pull, Cable[4,1-6] / ...t3

## Day 3
// ...t1
Deadlift[1,1-12] / ...t1
// ...t2a
Front Squat[2,1-5] / ...t2a
// ...t2b
Lat Pulldown[3,1-5] / ...t2b
// ...t3
Leg Extension[4,1-6] / ...t3
// ...t3
Bent Over One Arm Row[4,1-6] / ...t3
// ...t3
Bicep Curl, EZ Bar[4,1-6] / ...t3

## Day 4
// ...t1
Overhead Press[1,1-12] / ...t1
// ...t2a
Incline Bench Press[2,1-5] / ...t2a
// ...t2b
Push Press[3,1-5] / ...t2b
// ...t3
Triceps Pushdown[4,1-6] / ...t3
// ...t3
Shrug[4,1-6] / ...t3
// ...t3
Incline Curl[4,1-6] / ...t3


# Week 2
## Day 1
// **T1**. Warmup up to **8 RM** for the first set, then try a 8RM, tap the first
// set and enter the 8RM weight you get. Then, do the drop sets (based on 1RM)
t1 / 1x8 80%+ (8RM), 2x6 70% (TM 75%), 1x6+ 70% (TM 75%)
t2a / 4x8 60% (TM 60%)
// **T2b.** Same as in T1 - work up to 12RM, then record the weight.
// Then, do MRS (Max Rep Sets) - i.e. AMRAP, as many reps as possible
t2b / 1x12 68%+ (12RM), 3x8+ 68% (MRS)
// **T3.** Same as **T2b**, just 18RM
t3 / 1x18 50%+ (18RM), 3x10+ 50% (MRS)

## Day 2


## Day 3


## Day 4



# Week 3
## Day 1
// **T1**. Warmup up to **6 RM** for the first set, then try a 6RM, tap the first
// set and enter the 6RM weight you get. Then, do the drop sets (based on 1RM)
t1 / 1x6 85%+ (6RM), 2x4 75% (TM 80%), 1x4+ 75% (TM 80%)
t2a / 4x6 70% (TM 70%)
// **T2b.** Same as in T1 - work up to 10RM, then record the weight.
// Then, do MRS (Max Rep Sets) - i.e. AMRAP, as many reps as possible
t2b / 1x10 73%+ (10RM), 3x6+ 73% (MRS)
// **T3.** Same as **T2b**, just 16RM
t3 / 1x16 55%+ (16RM), 3x8+ 55% (MRS)

## Day 2


## Day 3


## Day 4



# Week 4
## Day 1
// **T1**.
t1 / 1x4 90%+ (4RM), 2x4 75% (TM 80%), 1x4+ 75% (TM 80%)
// **T2a.**
t2a / 5x4 70% (TM 70%)
// **T2b.**
t2b / 1x8 73%+ (8RM), 3x5+ 73% (MRS)
// **T3.** Same as **T2b**, just 14RM
t3 / 1x14 65%+ (14RM), 3x8+ 65% (MRS)

## Day 2


## Day 3


## Day 4



# Week 5
## Day 1
t1 / 1x2 95%+ (2RM), 3x2 80% (TM 85%), 1x2+ 80% (TM 85%)
t2a / 7x2 80% (TM 80%)
t2b / 1x6 83%+ (6RM), 3x3+ 83% (MRS)
// **T3.** Same as **T2b**, just 12RM
t3 / 1x12 70%+ (12RM), 3x7+ 70% (MRS)

## Day 2


## Day 3


## Day 4



# Week 6
## Day 1
// **T1**. Testing your 1RM! This set will update 1RM of this exercise.
t1 / 1x1 100%+ (1RM)
// **T3.** Same as **T2b**, just 10RM
t3 / 1x10 75%+ (10RM), 3x5+ 75% (MRS)

## Day 2


## Day 3


## Day 4



# Week 7
## Day 1
// **T1**. It's start of the next cycle, where drop sets are based on your first set.
// Work up to your 6RM, after that, do the drop sets, that are 85% of your new 6RM.
t1 / 1x6 85%+ (6RM), 4x3 72.5% (6RM 85%), 1x3+ 72.5% (6RM 85%)
t2a/ 6x5 70% (TM 70%)
t2b / 1x12 68%+ (12RM), 3x8+ 68% (MRS)

Deficit Deadlift[2,7-10] / ...t2a
Incline Row[3,7-10] / ...t2b

## Day 2
Bench Press Close Grip[2,7-10] / ...t2a
Shoulder Press[3,7-10] / ...t2b

## Day 3
Front Squat[2,7-10] / ...t2a
Lat Pulldown[3,7-10] / ...t2b

## Day 4
Incline Bench Press[2,7-10] / ...t2a
Push Press[3,7-10] / ...t2b


# Week 8
## Day 1
// **T1**.
t1 / 1x4 90%+ (4RM), 4x2 75% (4RM 85%), 1x2+ 75% (4RM 85%)
// **T2a**.
t2a / 5x5 75% (TM 75%)
// **T2b**.
t2b / 1x10 73%+ (10RM), 3x6+ 73% (MRS)
// **T3.**
t3 / 1x18 50%+ (18RM), 3x10+ 50% (MRS)

// ...t3
Triceps Pushdown[4,8-10] / ...t3
// ...t3
Bent Over Row, Cable[4,8-10] / ...t3
// ...t3
Hammer Curl, Dumbbell[4,8-10] / ...t3

## Day 2
// ...t3
Shrug[4,8-10] / ...t3
// ...t3
Pec Deck[4,8-10] / ...t3
// ...t3
Face Pull, Cable[4,8-10] / ...t3

## Day 3
// ...t3
Leg Extension[4,8-10] / ...t3
// ...t3
Bent Over One Arm Row[4,8-10] / ...t3
// ...t3
Bicep Curl, EZ Bar[4,8-10] / ...t3

## Day 4
// ...t3
Triceps Pushdown[4,8-10] / ...t3
// ...t3
Shrug[4,8-10] / ...t3
// ...t3
Incline Curl[4,8-10] / ...t3


# Week 9
## Day 1
t1 / 1x2 95%+ (2RM), 4x1 80% (2RM 85%), 1x1+ 80% (2RM 85%)
t2a / 5x4 80% (TM 80%)
t2b / 1x8 78%+ (8RM), 3x4+ 78% (MRS)
t3 / 1x16 55%+ (16RM), 3x8+ 55% (MRS)

## Day 2


## Day 3


## Day 4



# Week 10
## Day 1
t1 / 1x5 85%+ (5RM), 2x2 75% (5RM 90%), 1x2+ 75% (5RM 90%)
t2a / 6x3 82.5% (TM 82.5%)
t2b / 1x6 83%+ (6RM), 3x3+ 83% (MRS)
t3 / 1x14 65%+ (14RM), 3x8+ 65% (MRS)

## Day 2


## Day 3


## Day 4



# Week 11
## Day 1
t1 / 1x3 92%+ (3RM), 2x1 82% (3RM 90%), 1x1+ 82% (3RM 90%)

## Day 2


## Day 3


## Day 4



# Week 12
## Day 1
// **T1**. It's week 12 - last week, it's time to test your 1RM! This set will update 1RM of this exercise.
t1 / 1x1 100%+ (1RM)

## Day 2


## Day 3


## Day 4
```
