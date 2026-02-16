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

<!-- more -->

GZCL: UHF (Ultra High Frequency) is a weightlifting program based on the **GZCL principle**, created by [Cody Lefever](https://www.gainzfever.com/). The GZCL name comes from his Reddit username - [u/gzcl](https://www.reddit.com/u/gzcl). It's a program that combines GZCL principles and the Daily Undulated Periodization (DUP) principle. It's somewhat similar to [GZCL: The Rippler](/programs/gzcl-the-rippler), but The Rippler used week-to-week undulating, while UHF sticks closer to the DUP principle and changes volume and intensity daily.

Another difference is that The Rippler sticks to Upper/Lower days, while in UHF every day is pretty much a full-body workout (if T1 is Upper, T2 is Lower, and vice versa).

The volume is also significantly higher, making it more like an advanced program.

## GZCL principle

Before diving in, here's some basic terminology:

- **Rep Max**: This refers to the maximum weight you can lift for a given number of reps. For instance, if you can do 5 reps (and no more) with 100 kg, then your 5 rep max is 100 kg. When measuring this, you should not go to full failure, but stop when you can't maintain good form for another rep.

Now, let's talk about exercises. Exercises in GZCL programs are split into **3 tiers**:

- **T1**: These are main compound exercises (e.g., [{Squat}], [{Deadlift}], [{Bench Press}], [{Overhead Press}]). These exercises involve the highest intensity (i.e., the largest weights, about **85-100%** of your 2-3 rep max), but with lower volume (fewer reps and sets). Typically, you will perform 10-15 total reps, usually within **1-3 reps** per set.
- **T2**: These are secondary compound exercises (e.g., [{Front Squat}], [{Romanian Deadlift}], [{Incline Bench Press}], etc). These exercises have lower intensity (lower weights), but higher volume (more reps and sets). You should pick exercises that will assist with your T1 exercises. These exercises are performed with **65-85%** of your 2-3 rep max, usually within **5-8 reps** per set.
- **T3**: These are isolation exercises (e.g., [{Leg Press}], [{Seated Leg Curl}], [{Triceps Extension}], [{Lateral Raise}]). These exercises have the lowest intensity (lightest weights), but highest volume (most reps and sets). These are performed with less than **65%** of your 2-3 rep max, usually with **8 or more reps** per set.

A useful rule of thumb is the **1:2:3 rule** - for every rep you perform in T1, do 2 reps in T2, and 3 in T3.

This is a very short description of the GZCL principle. For more information, and more details, I REALLY recommend to read [Cody's blogpost](http://swoleateveryheight.blogspot.com/2012/11/the-gzcl-method-for-powerlifting.html).

## Application of the GZCL Principle to the UHF program

### T1 Exercise

In the UHF program, we use the 2 rep max (2RM) weight as Training Max (TM). This is a **5-week** program, and each week we use different 2RM% weight and reps for various T1 exercises. E.g. for week 1, we use 85% of 2RM weight for [{Squat}], 75% for [{Deadlift}], 90% for [{Sling Shot Bench Press}], etc.

As in any Linear Periodization program, the weight generally goes up, while volume goes down. The weight goes up non-linearly though, but in the wave form, where each wave is 3 weeks.

:::exercise-example{exercise="squat" equipment="barbell" key="t1-squat_barbell"}

### T2 Exercise

Same as T1, we use a 2RM weight for the TM and various T1 exercises. But unlike T1, we use a linear increase in weight (non-wavy) and a somewhat wavy decrease in volume. The peaks of the waves are mostly due to AMRAP (As Many Reps As Possible) sets.

For T2, we use the 'opposite' side for exercise selection - if T1 is Upper, T2 is Lower, and vice versa. This sort of makes the UHF program technically a full-body program.

:::exercise-example{exercise="inclineBenchPress" equipment="barbell" key="t2-inclinebenchpress_barbell"}

### T3 Exercise

For T3, the first set is a Rep Max set, where you work up to your Rep Max. For the first week, it's a 15RM, for the second week, it's a 12RM, and so on. To work up to your 15RM, you need to estimate your approximate 15RM weight and then perform 'warm-up' sets (3-4 of them) that are not fatiguing, gradually increasing the weight. For example, let's say you estimated your 15RM for [{Bicep Curl}] is 50lb. So, you would do:

- 5 reps with an empty bar
- 5 reps with 30lb
- 3 reps with 40lb
- and 15 reps with 50lb.

If you missed and chose a weight that is too heavy, let's say you could only do 8 reps, or if it was too light and you did 12 reps, that's okay! You'll improve over time, so just record the weight and reps, and move on to the Max Rep Sets.

For the Max Rep Sets, simply try to do as many reps as possible with the same weight as the first set (50lb in our case). For the second, third, and so on, Max Reps Sets, you will likely be able to do fewer and fewer reps, but that's okay and expected as you accumulate fatigue.

:::exercise-example{exercise="bicepCurl" equipment="dumbbell" key="t3-bicepcurl_dumbbell"}

Again, this is just a short description, and for full information and details, please read the [original post with the GZCL applications](http://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html).

Check the interactive playground below to see how the program works, and what the weights/sets/reps look like for each week. You can edit the 2RM, 5RM, etc weights for each exercise, and see how the weight changes.

You can run the GZCL: UHF 5 weeks program in the Liftosaur app.

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
