---
id: gzcl-general-gainz-burrito-but-big
name: "GZCL: General Gainz - Burrito But Big"
author: /u/benjaminbk
url: "https://www.liftosaur.com/programs/gzcl-general-gainz-burrito-but-big"
shortDescription: Hypertrophy adaptation of General Gainz, as a 12-week program.
isMultiweek: true
tags: []
---

Fun adaptation of GZCL: General Gainz program, with several variations of really interesting progression schemes available.

By default the program is set up with Classic progressions, but in the there're all possible progressions in the exercise library available. Just add/change an exercise, and specify "Reuse logic" to one of the progression schemes you wish.

Make sure to read the [original post on Reddit](https://www.reddit.com/r/gzcl/comments/12ggfn7/burrito_but_big_a_general_gainzbased_12week/) describing the program before starting!

```liftoscript
# Week 1
## Day 1
/// Classic variations of T1 and T2

// **T1 Leader Classic**. Work up to the RM of the first set, then record the weight.
// Then do 4-6 "half" sets (same weight, half of the reps).
t1_classic / used: none / 1+x6 85%+, 4x3 85% / 180s / progress: custom() {~
  weights = completedWeights[1]
~} / update: custom() {~
  if (setIndex == 1) {
    weights = completedWeights[1]
  }
~}
// **T2 Leader Classic**. Work up to the RM of the first set, then record the weight.
// Then do 4-6 "half" sets (same weight, half of the reps).
t2_classic / used: none / 1+x8 80%+, 4x4 80% / 180s  / progress: custom() {~
  weights = completedWeights[1]
~} / update: custom() {~
  if (setIndex == 1) {
    weights = completedWeights[1]
  }
~}

/// Additional variations of T1 and T2
/// Those are "templates" (i.e. with `used: none`), you can reuse them in your exercises

// **T1 Leader Conditioning**. Similar to Classic, but after
// the first set, do the conditioning part - do the **"conditioning"** part - 
// **12-18 reps** total within **10** minutes with the same weight. You can do
// them by sets of 1 rep, 2 reps or 3 reps, every 60 seconds or so.
// Use "+" button to add the sets.
t1_leader_cond / used: none / 1+x6 85%+ 180s / update: custom() {~
  var.threshold = reps[1] == 6 ? 12 :
    reps[1] == 8 ? 14 :
    reps[1] == 9 ? 16 : 18
  if ((sum(completedReps) - reps[1]) < var.threshold) {
    numberOfSets += 1
    sets(numberOfSets, numberOfSets, 1, 3, 0, completedWeights[1], 60, 0, 0)
  }
~}

// **T2 Leader Conditioning**. Similar to Classic, but after
// the first set, do the conditioning part - do the **"conditioning"** part - 
// **16-27 reps** total within **10** minutes with the same weight. You can do
// them by sets of 1 rep, 2 reps or 3 reps, every 60 seconds or so.
// Use "+" button to add the sets.
t2_leader_cond / used: none / 1+x8 80%+ 180s / progress: custom() {~
  weights = completedWeights[1]
~} / update: custom() {~
  var.threshold = reps[1] == 8 ? 16 :
    reps[1] == 10 ? 18 :
    reps[1] == 11 ? 20 : 22 
  if ((sum(completedReps) - reps[1]) < var.threshold) {
    numberOfSets += 1
    sets(numberOfSets, numberOfSets, 1, 3, 0, completedWeights[1], 60, 0, 0)
  }
~}

// **T2 Leader High-Volume**. Similar to Classic, but after
// the first set do the **"high volume"** part - 3 sets of **5-7 reps**.
// Try to get as close to the top range as possible!
t2_leader_high_volume / used: none / 1+x10 80%+ 180s, 3x5-7 80% / progress: custom() {~
  weights = completedWeights[1]
~} / update: custom() {~
  if (setIndex == 1) {
    weights = completedWeights[1]
  }
~}

// **T2 Leader Widowmaker**. Initially pick the weight you want to have **20 RM** of on **week 4**.
// Attempt it (staying within 10-20 range), record the weight.
// Each week you'll work towards that goal, trying to get closer and closer to the goal.
// After the attempt, do "half-sets" - do 4 sets with half of your RM set reps.
t2_leader_widowmaker / used: none / 1x10-20 70%+, 4x5 70% / 180s / update: custom() {~
  if (setIndex == 1) {
    weights = completedWeights[1]
    reps = floor(completedReps[1] / 2)
  }
~} / progress: custom() {~
  weights = completedWeights[1]
~}

// **T3**. Do Max Reps Sets, going close to failure, but in the rep range >= 10 reps.
t3[3,1-12] / used: none / 3x10+ 70% / 60s

/// Actual exercises

// ...t1_classic
t1: Squat[1,1-8] / ...t1_classic
// ...t2_classic
t2: Romanian Deadlift, Barbell[2,1-8] / ...t2_classic
// ...t3
t3: Bicep Curl, EZ Bar[3,1-12] / ...t3
// ...t3
t3: Reverse Fly[3,1-12] / ...t3

## Day 2
// ...t1_classic
t1: Bench Press[1,1-8] / ...t1_classic
// ...t2_classic
t2: Overhead Press[2,1-8] / ...t2_classic
// ...t3
t3: Pendlay Row[3,1-12] / ...t3
// ...t3
t3: Lateral Raise[3,1-12] / ...t3

## Day 3
// ...t1_classic
t1: Deadlift[1,1-8] / ...t1_classic
// ...t2_classic
t2: Front Squat[2,1-8] / ...t2_classic
// ...t3
t3: Hanging Leg Raise[3,1-12] / ...t3
// ...t3
t3: Skullcrusher[3,1-12] / ...t3

## Day 4
// ...t1_classic
t1: Overhead Press[1,1-8] /...t1_classic
// ...t2_classic
t2: Bench Press Close Grip[2,1-8] / ...t2_classic
// ...t3
t3: Pullover, EZ Bar[3,1-12] / ...t3
// ...t3
t3: Bicep Curl, EZ Bar[3,1-12] / ...t3


# Week 2
## Day 1
// **T1 Leader Classic**. Now use the same weight, but attempt to do 1-2 reps more.
t1_classic / 1+x7-8 85%, 4x4 85% / 180s
// **T2 Leader Classic**. Now use the same weight, but attempt to do 1-2 reps more.
t2_classic / 1+x9-10 80%, 2x4 80%, 2x5 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 3
## Day 1
t1_classic / 1+x8-9 85%, 2x4 85%, 2x5 85% / 180s
t2_classic / 1+x10-11 80%, 4x5 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 4
## Day 1
t1_classic / 1+x9-10 85%, 4x5 85% / 180s
t2_classic / 1+x11-12 80%, 2x5 80%, 2x6 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 5
## Day 1
// **T1 Leader Classic**. Beginning of the second mesocycle - again, work up to the RM of the first set, then record the weight.
// Then do 4-6 "half" sets (same weight, half of the reps).
t1_classic / 1+x6 85%+, 4x3 85% / 180s
// **T2 Leader Classic**. Beginning of the second mesocycle - again, work up to the RM of the first set, then record the weight.
// Then do 4-6 "half" sets (same weight, half of the reps).
t2_classic / 1+x8 80%+, 4x4 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 6
## Day 1
// **T1 Leader Classic**. Now use the same weight, but attempt to do 1-2 reps more.
t1_classic / 1+x7-8 85%, 4x4 85% / 180s
// **T2 Leader Classic**. Now use the same weight, but attempt to do 1-2 reps more.
t2_classic / 1+x9-10 80%, 2x4 80%, 2x5 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 7
## Day 1
t1_classic / 1+x8-9 85%, 2x4 85%, 2x5 85% / 180s
t2_classic / 1+x10-11 80%, 4x5 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 8
## Day 1
t1_classic / 1+x9-10 85%, 4x5 85% / 180s
t2_classic / 1+x11-12 80%, 2x5 80%, 2x6 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 9
## Day 1
// **T1 Anchor Classic**. Work up to the RM of the first set, then record the weight.
// Then do single sets (same weight, just one rep for each set).
t1_anchor / used: none / 1x6 85%+, 6x1 85% / 180s / update: custom() {~
  if (setIndex == 1) {
    weights = weights[1]
  }
~} / progress: custom() {~
  if (week == 12) {
    rm1 = weights[1] / rpeMultiplier(completedReps[1], 10)
  }
~}
// **T2 Anchor Classic**. Work up to the RM of the first set, then record the weight.
// Then do 4 "half" sets (same weight, half of the reps).
t2_anchor / used: none / 1x8 80%+, 4x4 80% / 180s / update: custom() {~
  if (setIndex == 1) {
    weights = weights[1]
  }
~}

// ...t1_anchor
t1: Squat[9-12]  / ...t1_anchor
// ...t2_anchor
t2: Romanian Deadlift, Barbell[9-12]  / ...t2_anchor

## Day 2
// ...t1_anchor
t1: Bench Press[9-12] / ...t1_anchor
// ...t2_anchor
t2: Overhead Press[9-12] / ...t2_anchor

## Day 3
// ...t1_anchor
t1: Deadlift[9-12] / ...t1_anchor
// ...t2_anchor
t2: Front Squat[9-12] / ...t2_anchor

## Day 4
// ...t1_anchor
t1: Overhead Press[9-12] / ...t1_anchor
// ...t2_anchor
t2: Bench Press Close Grip[9-12] / ...t2_anchor


# Week 10
## Day 1
t1_anchor / 1x5 85%+, 5x1 85% / 180s
t2_anchor / 1x7 80%+, 2x3 80%, 2x4 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 11
## Day 1
t1_anchor / 1x4 85%+, 4x1 85% / 180s
t2_anchor / 1x6 80%+, 4x3 80% / 180s

## Day 2


## Day 3


## Day 4



# Week 12
## Day 1
// **T1 Anchor Classic**. No single sets this time.
t1_anchor / 1x3 85%+ / 180s
// **T2 Anchor Classic**. No single sets this time.
t2_anchor / 1x5 80%+ / 180s

## Day 2


## Day 3


## Day 4
```
