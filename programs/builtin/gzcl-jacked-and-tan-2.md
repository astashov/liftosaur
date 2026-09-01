---
id: gzcl-jacked-and-tan-2
name: "GZCL: Jacked & Tan 2.0"
author: Cody Lefever
url: "https://www.gainzfever.com"
shortDescription: Another good next step after GZCLP.
isMultiweek: true
tags: []
frequency: 4
age: "more_than_year"
duration: "60-90"
goal: "strength_and_hypertrophy"
---

A good next step after GZCLP. It's a twelve-week hypertrophy and strength regimen that uses high volume, varied rep ranges, and periodization to prioritize muscle growth and work capacity while also building strength.

Before starting the program, please read the [program explanation](https://swoleateveryheight.blogspot.com/2016/07/jacked-tan-20.html) first!

<!-- more -->

Jacked & Tan 2.0 is a weightlifting program based on the **GZCL principle**, created by [Cody Lefever](https://www.gainzfever.com/). The GZCL name comes from his Reddit username - [u/gzcl](https://www.reddit.com/u/gzcl). It's a 12-week weightlifting program, following GZCL principles, and offering quite a lot of volume. It's designed both for hypertrophy and strength. It starts with lower intensity / higher volume, then progresses to higher intensity / lower volume. It's a fun program to run, offering somewhat unusual and interesting rep schemes, with testing for different RMs each workout.

The program is primarily aimed at intermediates, who are likely to benefit most from its exercise variety, volume, and frequent hard efforts. Cody notes that lifters from novice to elite can benefit, provided they can manage the workload and autoregulate their rep-max attempts.

You can run it after beginner [GZCLP](/programs/gzclp) program, or after beginner/intermediate [GZCL: The Rippler](/programs/gzcl-the-rippler) program.

## GZCL principle

Before diving in, here's some basic terminology:

- **Rep Max (RM)**: In this program, this is the heaviest weight you can lift for the target reps with clean form while keeping **1-2 reps in reserve**. It is not a failure set. If you reach the target and judge that one or two more clean reps were possible, you found the intended RM.

Now, let's talk about exercises. Exercises in GZCL programs are split into **3 tiers**:

- **T1**: These are main compound exercises (e.g., [{Squat}], [{Deadlift}], [{Bench Press}], [{Overhead Press}]). These exercises involve the highest intensity (i.e., the largest weights, about **85-100%** of your 2-3 rep max), but with lower volume (fewer reps and sets). Typically, you will perform 10-15 total reps, usually within **1-3 reps** per set.
- **T2**: These are secondary compound exercises (e.g., [{Front Squat}], [{Romanian Deadlift}], [{Incline Bench Press}], etc). These exercises have lower intensity (lower weights), but higher volume (more reps and sets). You should pick exercises that will assist with your T1 exercises. These exercises are performed with **65-85%** of your 2-3 rep max, usually within **5-8 reps** per set.
- **T3**: These are lighter accessory exercises (e.g., [{Leg Press}], [{Seated Leg Curl}], [{Triceps Extension}], [{Lateral Raise}], or rows). They often isolate smaller muscle groups, but bodyweight and lighter compound movements are also valid. T3 has the lowest intensity (lightest weights) and highest volume (most reps and sets), usually using **8 or more reps** per set.

A useful rule of thumb is the **1:2:3 rule** - for every rep you perform in T1, do 2 reps in T2, and 3 in T3.

This is a very short description of the GZCL principle. For more information, and more details, I REALLY recommend to read [Cody's blogpost](http://swoleateveryheight.blogspot.com/2012/11/the-gzcl-method-for-powerlifting.html).

## Application of the GZCL Principle to the Jacked And Tan 2.0 program

### T1 Exercise

For the T1 exercise, we start with high volume and low intensity (high reps, lower weight), and progress to lower volume and higher intensity (lower reps, higher weight) - so called Linear Periodization.

The official program uses a training max (TM), approximately equal to your 2RM (2 Rep Max), as the basis for the T1 "drop sets" performed after the Rep Max set.

Liftoscript calculates percentages from an exercise's 1RM field. For **T1**, enter your true current 1RM, not your TM. This implementation estimates Cody's TM - an estimated daily 2RM - as 93.75% of true 1RM using the Epley formula, then rounds the converted percentages to the nearest 2.5 percentage points. The set labels show Cody's original TM percentages. If you know your personal TM, you can edit a drop-set weight to match the labeled percentage exactly.

The first set is a Rep Max set, where you have to work up to your Rep Max. For the first week it's 10RM, for the second - 8RM, etc. So, to work up your 10RM, you need to guess your approximate 10RM weight, and then do "warmup" sets, that are not fatiguing, slowly increasing the weight. Like, let's say you guessed your 10RM for [{Bench Press}] is 185lb. So, you do:

- 5 reps with empty bar
- 5 reps with 95lb
- 3 reps with 135lb
- 10 reps with 185lb

If you chose a weight that was too heavy and could only do 8 reps, or too light and reached 10 reps with more than two reps still in reserve, that's okay. Record what you did, adjust the later work if needed, and move to the drop sets.

Drop sets are sets that are based on the Training Max. For example, in week 1 you do 3 sets of 6 at 70% of TM. The last set is As Many Reps As Possible (AMRAP) - try to do as many reps as possible while leaving 1-2 reps in the tank. It's a good way to push yourself and gauge the drop-set intensity. If you get more than 12 reps on this set during the first mesocycle, Cody recommends increasing the later drop-set intensity.

In week 6, work up to a conservative single that you could confidently double. Cody expects this to be within about 5% of your actual 1RM. You don't do any T1 drop sets or T2 exercises.

After that, for the next 5 weeks, instead of %TM for the drop sets, you use percentage of your Rep Max for that week. E.g. on Week 7 you do your 6RM set first, and then the drop sets would be 85% of 6RM.

At the end, at the week 12, you do another 1RM measurement, without T1 drop sets and T2 exercises again.

It sounds pretty complicated, but should be way more clear when you look at the example below, and also after playing around with the interactive example at the bottom of this page.

### Example of a T1 exercise sets/reps/weight week over week

Note that first RM sets are approximate in this example

:::exercise-example{exercise="squat" equipment="barbell" key="squat_barbell"}


### T2a Exercise

Each T2a exercise needs an appropriate movement-specific Training Max. Cody defines that TM as a recent or reasonably estimated 2RM that you could lift on any given day. In the author workbook, close variations such as close-grip bench and deficit deadlift borrow the related main lift's TM, Front Squat uses a separate TM, and an independent Incline Bench TM field is provided. This Liftosaur variant programs both [{Front Squat}] and [{Incline Bench Press}] as T2a movements, so use their movement-specific TMs.

Unlike the converted T1 load suggestions, the T2a percentages below are literal TM percentages. Liftoscript applies them to the selected exercise's 1RM field, so set each T2a exercise's 1RM in Exercise Stats to the TM or reference TM it should use.

The weight/volume is also changing week over week in a wave pattern, adding sets on lower weights, to compensate drop in volume.

Before week 7, update borrowed T2a reference maxes from the T1 results found in week 6 where applicable. Reassess separate movement-specific TMs, such as Front Squat and Incline Bench Press, independently.

Skip T2a in weeks 6 and 12, when you test the T1 1RM.

:::exercise-example{exercise="deficitDeadlift" equipment="barbell" key="deficitdeadlift_barbell"}


### T2b and T3 Exercises

T2b and T3 exercises are pretty similar to each other, they just use different first set RM value. So, for the first set, you attempt to do RM for the reps of that set (similar to T1), record the weight, and then you do the so-called Max Rep Sets (MRS). Simply, try to do as many reps as possible with the same weight as you did for the first set, leaving 1-2 reps in the tank and resting 30-60 seconds between sets. For the 2nd, 3rd, etc Max Reps Set you likely will be able to do less and less reps, but that's okay and expected, as you're accumulating fatigue.

T2b rests in weeks 6, 11, and 12. T3 rests in weeks 7 and 12.

:::exercise-example{exercise="tricepsPushdown" equipment="cable" key="tricepspushdown_cable"}


Again, this is just a short description, and for full information and details, please read the [original post with the GZCL applications](http://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html).

Check the interactive playground below to see how the program works, and what the weights/sets/reps look like for each week. You can edit the 2RM, 5RM, etc. weights for each exercise, and see how the weight changes.

You can run the GZCL: Jacked And Tan 2.0 program in the Liftosaur app.

<!-- faq -->

### Is Jacked and Tan 2.0 good for beginners?

Cody says lifters from novice to elite can benefit from Jacked and Tan 2.0, but its high volume and autoregulated rep-max work make it most useful for intermediates who can estimate rep maxes and manage fatigue. If you're still making straightforward session-to-session progress, [GZCLP](/programs/gzclp) is usually the simpler place to start.

### How many days a week is Jacked and Tan 2.0?

Jacked and Tan 2.0 is a 4-day program. Each day has a different T1 main lift (Squat, Bench, Deadlift, Overhead Press) along with T2 and T3 accessory work.

### How long is the Jacked and Tan 2.0 program?

The program runs for 12 weeks. Weeks 1-5 build volume at increasing intensity, week 6 takes a conservative single you could confidently double, weeks 7-11 shift to intensity-focused work with drop sets based on your rep max, and week 12 is a final 1RM test.

### What should I run after Jacked and Tan 2.0?

You can run it again with updated maxes, or switch to [The Rippler](/programs/gzcl-the-rippler) for a pure strength focus. Many lifters alternate between JT2.0 and The Rippler for continued progress across both strength and hypertrophy goals.

### How do the Rep Max sets work in Jacked and Tan 2.0?

For the T1 first set each week, warm up to the target rep max (10RM in week 1, 8RM in week 2, etc.), stop with 1-2 clean reps in reserve, and record the weight you hit. Don't worry if you overshoot or undershoot the target — record what you did, adjust later work if needed, and move to the drop sets.

### Can I swap exercises in Jacked and Tan 2.0?

Yes, especially T2b and T3 exercises. Pick movements that support your T1 lifts and address your weak points. Keep T1 exercises as safe, heavily loadable compound movements and preserve the alternating lower/upper structure; T2a exercises should remain close variations of the relevant T1 movements.

```liftoscript
# Week 1
## Day 1
// **T1**. Warm up to **10 RM** for the first set, then try a 10RM, tap the first
// set and enter the 10RM weight you get. Then, do the drop sets (based on TM)
t1 / used: none / 1x10 75%+ (10RM), 2x6 65% (TM 70%), 1x6+ 65% (TM 70%) / update: custom() {~
  if (setIndex == 0) {
    askweights[1] = 1
  }
  if (week >= 7 && week <= 11 && setIndex == 1) {
    weights = completedWeights[1] * (week >= 10 ? 0.9 : 0.85)
  }
~} / progress: custom() {~
  if ((week == 6 || week == 12) && completedReps[1] >= reps[1]) {
    rm1 = completedWeights[1]
  }
~}

// **T2a.**
// Set each T2a exercise's 1RM to the TM it should reference, and reassess it before week 7.
t2a / used: none / 4x10 50% (TM 50%)

// **T2b.** Same as in T1 - work up to 15RM, then record the weight.
// Then, do MRS (Max Rep Sets) - i.e. AMRAP, as many reps as possible
t2b / used: none / 1x15 60%+ (15RM), 3x1+ 60% (MRS) / 60s / update: custom() {~ if (setIndex == 1) { weights = completedWeights[1] } ~}

// **T3.** Similar to T2b, but with a different first-set RM target.
t3 / used: none / 1x20 50%+ (20RM), 3x1+ 50% (MRS) / 60s / update: custom() {~ if (setIndex == 1) { weights = completedWeights[1] } ~}

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
Push Press, Barbell[3,1-5] / ...t2b
// ...t3
Triceps Pushdown[4,1-6] / ...t3
// ...t3
Shrug[4,1-6] / ...t3
// ...t3
Incline Curl[4,1-6] / ...t3


# Week 2
## Day 1
// **T1**. Warm up to **8 RM** for the first set, then try an 8RM, tap the first
// set and enter the 8RM weight you get. Then, do the drop sets (based on TM)
t1 / 1x8 80%+ (8RM), 2x5 70% (TM 75%), 1x5+ 70% (TM 75%)
t2a / 4x8 60% (TM 60%)
// **T2b.** Same as in T1 - work up to 12RM, then record the weight.
// Then, do MRS (Max Rep Sets) - i.e. AMRAP, as many reps as possible
t2b / 1x12 68%+ (12RM), 3x1+ 68% (MRS) / 60s
// **T3.** Same as **T2b**, just 18RM
t3 / 1x18 50%+ (18RM), 3x1+ 50% (MRS) / 60s

## Day 2


## Day 3


## Day 4



# Week 3
## Day 1
// **T1**. Warm up to **6 RM** for the first set, then try a 6RM, tap the first
// set and enter the 6RM weight you get. Then, do the drop sets (based on TM)
t1 / 1x6 85%+ (6RM), 2x4 75% (TM 80%), 1x4+ 75% (TM 80%)
t2a / 4x6 70% (TM 70%)
// **T2b.** Same as in T1 - work up to 10RM, then record the weight.
// Then, do MRS (Max Rep Sets) - i.e. AMRAP, as many reps as possible
t2b / 1x10 73%+ (10RM), 3x1+ 73% (MRS) / 60s
// **T3.** Same as **T2b**, just 16RM
t3 / 1x16 55%+ (16RM), 3x1+ 55% (MRS) / 60s

## Day 2


## Day 3


## Day 4



# Week 4
## Day 1
// **T1**.
t1 / 1x4 90%+ (4RM), 2x3 77.5% (TM 82.5%), 1x3+ 77.5% (TM 82.5%)
// **T2a.**
t2a / 5x4 75% (TM 75%)
// **T2b.**
t2b / 1x8 78%+ (8RM), 3x1+ 78% (MRS) / 60s
// **T3.** Same as **T2b**, just 14RM
t3 / 1x14 65%+ (14RM), 3x1+ 65% (MRS) / 60s

## Day 2


## Day 3


## Day 4



# Week 5
## Day 1
t1 / 1x2 95%+ (2RM), 3x2 80% (TM 85%), 1x2+ 80% (TM 85%)
t2a / 7x2 80% (TM 80%)
t2b / 1x6 83%+ (6RM), 3x1+ 83% (MRS) / 60s
// **T3.** Same as **T2b**, just 12RM
t3 / 1x12 70%+ (12RM), 3x1+ 70% (MRS) / 60s

## Day 2


## Day 3


## Day 4



# Week 6
## Day 1
// **T1**. Work up to a conservative single you could confidently double. This set updates the exercise 1RM.
t1 / 1x1 100%+ (1RM)
// **T3.** Same as **T2b**, just 10RM
t3 / 1x10 75%+ (10RM), 3x1+ 75% (MRS) / 60s

## Day 2


## Day 3


## Day 4



# Week 7
## Day 1
// **T1**. It's start of the next cycle, where drop sets are based on your first set.
// Work up to your 6RM, after that, do the drop sets, that are 85% of your new 6RM.
t1 / 1x6 85%+ (6RM), 4x3 72.5% (6RM 85%), 1x3+ 72.5% (6RM 85%)
t2a / 5x6 70% (TM 70%)
t2b / 1x12 68%+ (12RM), 3x1+ 68% (MRS) / 60s

Deficit Deadlift[2,7-11] / ...t2a
Incline Row[3,7-10] / ...t2b

## Day 2
Bench Press Close Grip[2,7-11] / ...t2a
Shoulder Press[3,7-10] / ...t2b

## Day 3
Front Squat[2,7-11] / ...t2a
Lat Pulldown[3,7-10] / ...t2b

## Day 4
Incline Bench Press[2,7-11] / ...t2a
Push Press, Barbell[3,7-10] / ...t2b


# Week 8
## Day 1
// **T1**.
t1 / 1x4 90%+ (4RM), 4x2 75% (4RM 85%), 1x2+ 75% (4RM 85%)
// **T2a**.
t2a / 5x5 75% (TM 75%)
// **T2b**.
t2b / 1x10 73%+ (10RM), 3x1+ 73% (MRS) / 60s
// **T3.**
t3 / 1x18 50%+ (18RM), 3x1+ 50% (MRS) / 60s

// ...t3
Triceps Pushdown[4,8-11] / ...t3
// ...t3
Bent Over Row, Cable[4,8-11] / ...t3
// ...t3
Hammer Curl, Dumbbell[4,8-11] / ...t3

## Day 2
// ...t3
Shrug[4,8-11] / ...t3
// ...t3
Pec Deck[4,8-11] / ...t3
// ...t3
Face Pull, Cable[4,8-11] / ...t3

## Day 3
// ...t3
Leg Extension[4,8-11] / ...t3
// ...t3
Bent Over One Arm Row[4,8-11] / ...t3
// ...t3
Bicep Curl, EZ Bar[4,8-11] / ...t3

## Day 4
// ...t3
Triceps Pushdown[4,8-11] / ...t3
// ...t3
Shrug[4,8-11] / ...t3
// ...t3
Incline Curl[4,8-11] / ...t3


# Week 9
## Day 1
t1 / 1x2 95%+ (2RM), 4x1 80% (2RM 85%), 1x1+ 80% (2RM 85%)
t2a / 5x4 80% (TM 80%)
t2b / 1x8 78%+ (8RM), 3x1+ 78% (MRS) / 60s
t3 / 1x16 55%+ (16RM), 3x1+ 55% (MRS) / 60s

## Day 2


## Day 3


## Day 4



# Week 10
## Day 1
t1 / 1x5 85%+ (5RM), 2x2 75% (5RM 90%), 1x2+ 75% (5RM 90%)
t2a / 6x3 82.5% (TM 82.5%)
t2b / 1x6 83%+ (6RM), 3x1+ 83% (MRS) / 60s
t3 / 1x14 65%+ (14RM), 3x1+ 65% (MRS) / 60s

## Day 2


## Day 3


## Day 4



# Week 11
## Day 1
t1 / 1x3 92%+ (3RM), 2x1 82% (3RM 90%), 1x1+ 82% (3RM 90%)
t2a / 7x2 85% (TM 85%)
t3 / 1x12 70%+ (12RM), 3x1+ 70% (MRS) / 60s

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
