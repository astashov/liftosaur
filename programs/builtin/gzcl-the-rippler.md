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

<!-- more -->

The Rippler is a weightlifting program based on the **GZCL principle**, created by [Cody Lefever](https://www.gainzfever.com/). The GZCL name comes from his Reddit username - [u/gzcl](https://www.reddit.com/u/gzcl). This program is an excellent next step following the beginner [GZCLP](/programs/gzclp) program, particularly when your newbie gains have plateaued and you can't increase your weights as quickly.

## GZCL principle

Before diving in, here's some basic terminology:

- **Rep Max**: This refers to the maximum weight you can lift for a given number of reps. For instance, if you can do 5 reps (and no more) with 100 kg, then your 5 rep max is 100 kg. When measuring this, you should not go to full failure, but stop when you can't maintain good form for another rep.

Now, let's talk about exercises. Exercises in GZCL programs are split into **3 tiers**:

- **T1**: These are main compound exercises (e.g., :exercise[Squat]{id="squat" equipment="barbell"}, :exercise[Deadlift]{id="deadlift" equipment="barbell"}, :exercise[Bench Press]{id="benchPress" equipment="barbell"}, :exercise[Overhead Press]{id="overheadPress" equipment="barbell"}). These exercises involve the highest intensity (i.e., the largest weights, about **85-100%** of your 2-3 rep max), but with lower volume (fewer reps and sets). Typically, you will perform 10-15 total reps, usually within **1-3 reps** per set.
- **T2**: These are secondary compound exercises (e.g., :exercise[Front Squat]{id="frontSquat" equipment="barbell"}, :exercise[Romanian Deadlift]{id="romanianDeadlift" equipment="barbell"}, :exercise[Incline Bench Press]{id="inclineBenchPress" equipment="barbell"}, etc). These exercises have lower intensity (lower weights), but higher volume (more reps and sets). You should pick exercises that will assist with your T1 exercises. These exercises are performed with **65-85%** of your 2-3 rep max, usually within **5-8 reps** per set.
- **T3**: These are isolation exercises (e.g., :exercise[Leg Press]{id="legPress" equipment="leverageMachine"}, :exercise[Seated Leg Curl]{id="seatedLegCurl" equipment="leverageMachine"}, :exercise[Triceps Extension]{id="tricepsExtension" equipment="dumbbell"}, :exercise[Lateral Raise]{id="lateralRaise" equipment="dumbbell"}). These exercises have the lowest intensity (lightest weights), but highest volume (most reps and sets). These are performed with less than **65%** of your 2-3 rep max, usually with **8 or more reps** per set.

A useful rule of thumb is the **1:2:3 rule** - for every rep you perform in T1, do 2 reps in T2, and 3 in T3.

This is a very short description of the GZCL principle. For more information, and more details, I REALLY recommend to read [Cody's blogpost](http://swoleateveryheight.blogspot.com/2012/11/the-gzcl-method-for-powerlifting.html).

## Application of the GZCL Principle to The Rippler Program

In The Rippler program, we use the 2 rep max (2RM) weight as a basis. This is a **12-week** program, where the weight for T1 and T2 exercises changes each week according to a specific pattern.

For **T1 exercises**, we increase the weight for 2 weeks, then slightly decrease it, and increase it even more in week 4. This pattern repeats through 4-week blocks. We'll have three 4-week blocks. We use 2 rep max (2RM) as a base weight for T1 exercises. So, for first 4 weeks we do 85%, 87.5%, 90%, 92.5% of 2RM weight. Liftosaur uses 1RM as a basis for the programs though, so the weights are converted into 1RM.

### Example of a T1 exercise sets/reps/weight week over week

:::exercise-example{exercise="benchPress" equipment="barbell" key="t1-benchpress_barbell" weeks="1-12" weekLabels="80%,85%,82.5%,87.5%,85%,90%,87.5%,92.5%,90%,95%,85%,95%"}

For **T2 exercises**, we gradually increase the weights over 3 weeks (e.g., 80%, 85%, 90%), then reset to 82.5%, and increase again (82.5%, 87.5%, 92.5%). We repeat this pattern over four 3-week blocks, creating a wave-like pattern. We use 5 rep max (5RM) as a base weight for T2 exercises. We skip T2 exercises completely on weeks 11 and 12. Again, the weights in Liftosaur are converted into % of 1RM.

### Example of a T2 exercise sets/reps/weight week over week

:::exercise-example{exercise="inclineBenchPress" equipment="barbell" key="t2-inclinebenchpress_barbell" weeks="1-10" weekLabels="68%,72%,76%,70%,74%,78%,72%,76%,80%,85%"}

For **T3 exercises**, we don't vary the weight, but aim to do the maximum reps each time. Start with a weight you can lift for 10 reps, then do as many reps as you can, leaving 1-2 reps in reserve. It's better to err on the side of lighter weights. If the weight you choose is too light, the Liftosaur app will automatically adjust and increase the weight as needed in weeks 3, 6, and 9.

Feel free to substitute exercises if you don't have the necessary equipment or if you wish to target specific muscles, particularly for the T3 exercises. If you use the Liftosaur app, there's a handy "Substitute" exercise feature where you can select similar exercises that require different equipment.

## 1RM test

Starting from week 11, you'll begin preparing for the 1RM test. You won't perform the T2 and T3 exercises at all during this period. On week 11, you will do heavy 2RMs of T1, and on week 12, you'll test your 1RM, and enjoy your new PRs!

Again, this is just a short description, and for full information and details, please read the [original post with the GZCL applications](http://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html).

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
