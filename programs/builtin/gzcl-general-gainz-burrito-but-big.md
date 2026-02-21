---
id: gzcl-general-gainz-burrito-but-big
name: "GZCL: General Gainz - Burrito But Big"
author: /u/benjaminbk
url: "https://www.liftosaur.com/programs/gzcl-general-gainz-burrito-but-big"
shortDescription: Hypertrophy adaptation of General Gainz, as a 12-week program.
isMultiweek: true
tags: []
frequency: 4
age: "more_than_year"
duration: "60-90"
goal: "hypertrophy"
---

Fun adaptation of GZCL: General Gainz program, with several variations of really interesting progression schemes available.

By default the program is set up with Classic progressions, but in the there're all possible progressions in the exercise library available. Just add/change an exercise, and specify "Reuse logic" to one of the progression schemes you wish.

Make sure to read the [original post on Reddit](https://www.reddit.com/r/gzcl/comments/12ggfn7/burrito_but_big_a_general_gainzbased_12week/) describing the program before starting!

<!-- more -->

Burrito But Big is a weightlifting program created by the Reddit user [u/benjaminbk](https://www.reddit.com/user/benjaminbk/), based on the **GZCL principle** from [Cody Lefever](https://www.gainzfever.com/). This program is a hypertrophy adaptation of the [General Gainz program](/programs/gzcl-general-gainz), presented as a 12-week program. There're several fun progression schemes, you can mix and match in your program, and generally the program is fun and efficient to run.

## GZCL principle

Before diving in, here's some basic terminology:

- **Rep Max**: This refers to the maximum weight you can lift for a given number of reps. For instance, if you can do 5 reps (and no more) with 100 kg, then your 5 rep max is 100 kg. When measuring this, you should not go to full failure, but stop when you can't maintain good form for another rep.

Now, let's talk about exercises. Exercises in GZCL programs are split into **3 tiers**:

- **T1**: These are main compound exercises (e.g., [{Squat}], [{Deadlift}], [{Bench Press}], [{Overhead Press}]). These exercises involve the highest intensity (i.e., the largest weights, about **85-100%** of your 2-3 rep max), but with lower volume (fewer reps and sets). Typically, you will perform 10-15 total reps, usually within **1-3 reps** per set.
- **T2**: These are secondary compound exercises (e.g., [{Front Squat}], [{Romanian Deadlift}], [{Incline Bench Press}], etc). These exercises have lower intensity (lower weights), but higher volume (more reps and sets). You should pick exercises that will assist with your T1 exercises. These exercises are performed with **65-85%** of your 2-3 rep max, usually within **5-8 reps** per set.
- **T3**: These are isolation exercises (e.g., [{Leg Press}], [{Seated Leg Curl}], [{Triceps Extension}], [{Lateral Raise}]). These exercises have the lowest intensity (lightest weights), but highest volume (most reps and sets). These are performed with less than **65%** of your 2-3 rep max, usually with **8 or more reps** per set.

A useful rule of thumb is the **1:2:3 rule** - for every rep you perform in T1, do 2 reps in T2, and 3 in T3.

This is a very short description of the GZCL principle. For more information, and more details, I REALLY recommend to read [Cody's blogpost](http://swoleateveryheight.blogspot.com/2012/11/the-gzcl-method-for-powerlifting.html).

## Application of the GZCL Principle to the Burrito But Big program

I highly recommend to read [the Reddit post](https://www.reddit.com/r/gzcl/comments/12ggfn7/burrito_but_big_a_general_gainzbased_12week/) describing the program and all the progressions and details.

Check the interactive playground below to see how the program works, and what the weights/sets/reps look like for each week. You can edit the 2RM, 5RM, etc weights for each exercise, and see how the weight changes.

You can run GZCL: General Gainz - Burrito But Big program in the Liftosaur app. You only would need to set initial RM weights for each exercise, and the app will automatically calculate the weights, change the sets, autobalance the T3 weights, and do all the math for you.

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
