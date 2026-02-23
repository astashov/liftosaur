---
id: gzcl-vdip
name: "GZCL: VDIP"
author: Cody Lefever
url: "https://www.liftosaur.com/programs/gzcl-vdip"
shortDescription: Beginner-intermediate program where each set is AMRAP.
isMultiweek: true
tags: []
frequency: 5
age: "3_to_12_months"
duration: "60-90"
goal: "strength"
---

VDIP - Volume-dependent Intensity Progression. A bit unusual program, where each set for each exercise is AMRAP, and we increase the weight based on total completed reps for all sets.

Before starting the program, please read [the program explanation on author's blog](https://swoleateveryheight.blogspot.com/2016/11/volume-dependent-intensity-progression.html) first!

<!-- more -->

GZCL: VDIP (Volume-dependent Intensity Progression) is a weightlifting program based on the **GZCL principle**, created by [Cody Lefever](https://www.gainzfever.com/). The GZCL name comes from his Reddit username - [u/gzcl](https://www.reddit.com/u/gzcl). It's a beginner-intermediate program, with the main idea is that each set is an AMRAP.

## GZCL principle

Before diving in, here's some basic terminology:

- **Rep Max**: This refers to the maximum weight you can lift for a given number of reps. For instance, if you can do 5 reps (and no more) with 100 kg, then your 5 rep max is 100 kg. When measuring this, you should not go to full failure, but stop when you can't maintain good form for another rep.

Now, let's talk about exercises. Exercises in GZCL programs are split into **3 tiers**:

- **T1**: These are main compound exercises (e.g., [{Squat}], [{Deadlift}], [{Bench Press}], [{Overhead Press}]). These exercises involve the highest intensity (i.e., the largest weights, about **85-100%** of your 2-3 rep max), but with lower volume (fewer reps and sets). Typically, you will perform 10-15 total reps, usually within **1-3 reps** per set.
- **T2**: These are secondary compound exercises (e.g., [{Front Squat}], [{Romanian Deadlift}], [{Incline Bench Press}], etc). These exercises have lower intensity (lower weights), but higher volume (more reps and sets). You should pick exercises that will assist with your T1 exercises. These exercises are performed with **65-85%** of your 2-3 rep max, usually within **5-8 reps** per set.
- **T3**: These are isolation exercises (e.g., [{Leg Press}], [{Seated Leg Curl}], [{Triceps Extension}], [{Lateral Raise}]). These exercises have the lowest intensity (lightest weights), but highest volume (most reps and sets). These are performed with less than **65%** of your 2-3 rep max, usually with **8 or more reps** per set.

A useful rule of thumb is the **1:2:3 rule** - for every rep you perform in T1, do 2 reps in T2, and 3 in T3.

This is a very short description of the GZCL principle. For more information, and more details, I REALLY recommend to read [Cody's blogpost](http://swoleateveryheight.blogspot.com/2012/11/the-gzcl-method-for-powerlifting.html).

## Application of the GZCL Principle to the VDIP program

### T1 Exercise

First, you come up with the initial weight - which is **~85%** of your 2RM for that exercise.

There are **3 sets**, and every set of every exercise in this program is a Max Rep Set (or AMRAP - As Many Reps As Possible). You don't go to complete failure, but leave 1-2 reps in the tank, and do as many as you can. For the following sets, you will likely be able to do fewer and fewer reps, but that's okay. There's an autoregulating part of the program that will increase the weight by **10lbs** if the sum of all the reps is **15** or more, and by **5lb** if it's **10** or more.

It's important to track the Rest Timer here, which should be **3-5** minutes for T1.

### T2 Exercise

Similar to T1, but initial weight - **~65%** of your 2RM for that exercise (so you should be able to do more reps per set).

It'll bump the weight by **10lb** if you got **30** or more total reps, and by **5lb** - if **25** or more total reps.

The Rest Timer is smaller - **2-3** minutes for T2.

### T3 Exercise

All the same as in T1/T2, but **4 sets**. Initial weight - **~55%** of your 2RM for that exercise.

It'll increase the weight by **5lb** if you got **50** reps or more total.

The Rest Timer is even smaller - **30-90** seconds for T3.

Again, this is just a brief description, and for full information and details, please read the [original post with the GZCL VDIP application](http://swoleateveryheight.blogspot.com/2016/11/volume-dependent-intensity-progression.html).

Check the interactive playground below to see how the program works, and what the weights/sets/reps look like for each day. You can finish the sets, and see how the weight would be changed for the next workout.

You can run GZCL: VDIP program in the Liftosaur app.

<!-- faq -->

### What makes GZCL VDIP different from other GZCL programs?

VDIP's unique feature is that every single set is AMRAP (as many reps as possible). Weight increases are based on total reps achieved across all sets, making progression entirely volume-dependent. This creates a natural autoregulation — you progress faster on good days and maintain on bad days.

### Is GZCL VDIP good for beginners?

VDIP works for beginner to intermediate lifters. The AMRAP-based system is forgiving because you don't have fixed rep targets to hit. However, you need the discipline to push yourself on every set since there are no prescribed rep numbers — just "do as many as you can."

### How many days a week is GZCL VDIP?

VDIP is a 5-day program. Each day has T1, T2, and T3 exercises following the GZCL tier system. The higher training frequency means each muscle group is hit multiple times per week.

### How does progression work in GZCL VDIP?

Weight increases when your total reps across all sets hit a threshold. For T1 (3 sets): 15+ total reps adds 10lb, 10+ adds 5lb. For T2 (3 sets): 30+ adds 10lb, 25+ adds 5lb. For T3 (4 sets): 50+ total reps adds 5lb.

### What rest times should I use for GZCL VDIP?

Rest 3-5 minutes between T1 sets, 2-3 minutes between T2 sets, and 30-90 seconds between T3 sets. Keeping to these rest times is important — longer rest would let you do more reps and game the progression thresholds.

### How long should I run GZCL VDIP?

Run VDIP as long as you keep making progress. Most lifters get 3-6 months before progression slows significantly. After that, move to a more periodized GZCL program like The Rippler or Jacked & Tan 2.0.

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
