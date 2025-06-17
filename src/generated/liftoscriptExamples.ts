// Auto-generated from ./llms/liftoscript_examples.md
// Do not edit manually - run npm run build:markdown to update

export const content = `# Liftoscript Examples

## Basic Beginner Program

3 days a week, focusing on basic lifts, using linear progression for all lifts - adding 2.5lb in case of success, drop by 10% weight in case of a failure.

\`\`\`
# Week 1
## Workout A
Bent Over Row / 2x5, 1x5+ / 95lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Bench Press / 2x5, 1x5+ / 45lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Squat / 2x5, 1x5+ / 45lb / progress: lp(5lb, 1, 0, 10%, 1, 0)

## Workout B
Chin Up / 2x5, 1x5+ / 0lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Overhead Press / 2x5, 1x5+ / 45lb / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Deadlift / 2x5, 1x5+ / 95lb / progress: lp(5lb, 1, 0, 10%, 1, 0)

## Workout A
Bent Over Row / 2x5, 1x5+ / 95lb
Bench Press / 2x5, 1x5+ / 45lb
Squat / 2x5, 1x5+ / 45lb


# Week 2
## Workout A
Chin Up / 2x5, 1x5+ / 0lb
Overhead Press / 2x5, 1x5+ / 45lb
Deadlift / 2x5, 1x5+ / 95lb

## Workout B
Bent Over Row / 2x5, 1x5+ / 95lb
Bench Press / 2x5, 1x5+ / 45lb
Squat / 2x5, 1x5+ / 45lb

## Workout B
Chin Up / 2x5, 1x5+ / 0lb
Overhead Press / 2x5, 1x5+ / 45lb
Deadlift / 2x5, 1x5+ / 95lb
\`\`\`

## 5/3/1 for beginners

3-week program, using 5/3/1 set scheme for main lifts. On finishing 3rd week it adds weight to 1RM.
It uses 1RM percentages for weights instead of Training Max percentages like in the original program, because Liftosaur doesn't have the concept of Training Max.

Here we use a "template" \`main\`, and all the main lifts just reuse it, so we could keep the logic in one place, and if we change it - it applies to all the main exercises.

\`\`\`
# Week 1
## Day 1
main / used: none / 1x5 58%, 1x5 67%, 1x5+ 76%, 5x5 58% / progress: custom(increment: 10lb) {~
  if (dayInWeek > 1 && week == 3) {
    rm1 += state.increment
  } 
~}

Squat[1-3] / ...main
Bench Press[1-3] / ...main / progress: custom(increment: 5lb) { ...main }
Hanging Leg Raise[1-3] / 5x10 0lb
Chin Up[1-3] / 5x10 0lb
Push Up[1-3] / 5x15 0lb

## Day 2
Deadlift[1-3] / ...main
Overhead Press[1-3] / ...main / progress: custom(increment: 5lb) { ...main }
Triceps Dip[1-3] / 5x10 0lb
Inverted Row[1-3] / 5x10 0lb
Bulgarian Split Squat[1-3] / 5x10 0lb

## Day 3
Bench Press[1-3] / ...main
Squat[1-3] / ...main
Hanging Leg Raise[1-3] / 5x10 0lb
Pull Up[1-3] / 5x10 0lb
Push Up[1-3] / 5x15 0lb


# Week 2
## Day 1
main / 1x3 63%, 1x3 72%, 1x3+ 81%, 5x5 63%

## Day 2


## Day 3



# Week 3
## Day 1
main / 1x5 67%, 1x3 76%, 1x1+ 85%, 5x5 67%

## Day 2


## Day 3
\`\`\`

## 5/3/1: Boring But Big

Also 5/3/1 program, but with volume-heavy 5x10 sets of the same main exercises after the main sets.
Here instead of defining "main" template, we just reuse another exercise. It's less preferable though, because it makes it harder to change the root exercise name that every other main exercise reuses.

\`\`\`
# Week 1
## Day 1
Overhead Press / 1x5 58%, 1x5 67%, 1x5+ 76%, 5x10 50% / progress: custom(increment: 10lb) {~
  if (week % 3 == 0) {
    rm1 += state.increment
  }
~}
Lat Pulldown[1-4] / 5x10

## Day 2
Deadlift[1-4] / ...Overhead Press / progress: custom(increment: 5lb) { ...Overhead Press }
Ab Wheel[1-4] / 5x10

## Day 3
Bench Press[1-4] / ...Overhead Press / progress: custom(increment: 5lb) { ...Overhead Press }
Chin Up[1-4] / 5x10 / 0lb

## Day 4
Squat[1-4] / ...Overhead Press / progress: custom(increment: 10lb) { ...Overhead Press }
Hanging Leg Raise[1-4] / 5x10


# Week 2
## Day 1
Overhead Press / 1x3 63%, 1x3 72%, 1x3+ 81%, 5x10 50%


## Day 2


## Day 3


## Day 4



# Week 3
## Day 1
Overhead Press / 1x5 67%, 1x3 76%, 1x1+ 85%, 5x10 50%


## Day 2


## Day 3


## Day 4



# Week 4 - Deload
## Day 1
Overhead Press / 1x5 36%, 1x5 45%, 1x5 54%, 5x10 40%

## Day 2


## Day 3


## Day 4
\`\`\`

## 5/3/1: Building the monolith

Very challenging variation of 5/3/1, with high-rep Squats.

\`\`\`
# Week 1
## Day 1
Squat / 1x5 60%, 1x5 68%, 5x5 76% / progress: custom(increase: 10lb) {~
  if (dayInWeek > 1 && week % 3 == 0) {
    weights += state.increase
  }
~}
Overhead Press / 1x5 60%, 1x5 68%, 1x5 76%, 1x5+ 60% / progress: custom(increase: 5lb) { ...Squat }
Chin Up[1-6] / 5x20 0lb / warmup: none
Face Pull, Cable[1-6] / 5x20 / warmup: none
Chest Dip[1-6] / 5x30 0lb / warmup: none

## Day 2
Deadlift / 1x5 60%, 1x5 68%, 3x5 76% / progress: custom(increase: 10lb) { ...Squat }
Bench Press / 1x5 60%, 1x5 68%, 5x5 76% / progress: custom(increase: 5lb) { ...Squat }
Bent Over One Arm Row[1-6] / 5x10-20 / warmup: none
Bicep Curl[1-6] / 5x20 / warmup: none

## Day 3
Squat / 1x5 60%, 1x5 68%, 1x5 76%, 1x20 40%
Overhead Press / 10x5 60%
Chin Up[1-6] / 5x5 / warmup: none
Face Pull, Cable[1-6] / 5x20 / warmup: none
Shrug[1-6] / 5x20 / warmup: none


# Week 2
## Day 1
Squat / 1x5 55%, 1x5 64%, 5x5 72%
Overhead Press / 1x5 55%, 1x5 64%, 1x5 72%, 1x5+ 55%

## Day 2
Deadlift / 1x5 55%, 1x5 64%, 3x5 72%
Bench Press / 1x5 55%, 1x5 64%, 5x5 72%

## Day 3
Squat / 1x5 55%, 1x5 64%, 1x5 72%, 1x20 45%
Overhead Press / 10x5 42%


# Week 3
## Day 1
Squat / 1x5 64%, 1x5 72%, 5x5 80%
Overhead Press / 1x5 64%, 1x5 72%, 1x5 80%, 1x5+ 64%

## Day 2
Deadlift / 1x5 64%, 1x5 72%, 3x5 80%
Bench Press / 1x5 64%, 1x5 72%, 5x5 80%

## Day 3
Squat / 1x5 64%, 1x5 72%, 1x5 80%, 1x20 45%
Overhead Press / 10x5 64%


# Week 4
## Day 1
Squat / 1x5 60%, 1x5 68%, 5x5 76%
Overhead Press / 1x5 60%, 1x5 68%, 1x5 76%, 1x5+ 60%

## Day 2
Deadlift / 1x5 60%, 1x5 68%, 3x5 76%
Bench Press / 1x5 60%, 1x5 68%, 5x5 76%

## Day 3
Squat / 1x5 60%, 1x5 68%, 1x5 76%, 1x20 42.5%
Overhead Press / 12x5 51%


# Week 5
## Day 1
Squat / 1x5 55%, 1x5 64%, 5x5 72%
Overhead Press / 1x5 55%, 1x5 64%, 1x5 72%, 1x5+ 55%

## Day 2
Deadlift / 1x5 55%, 1x5 64%, 3x5 72%
Bench Press / 1x5 55%, 1x5 64%, 5x5 72%

## Day 3
Squat / 1x5 55%, 1x5 64%, 1x5 72%, 1x20 55%
Overhead Press / 15x5 55%


# Week 6
## Day 1
Squat / 1x5 64%, 1x5 72%, 5x5 80%
Overhead Press / 1x5 64%, 1x5 72%, 1x5 80%, 1x5+ 64%

## Day 2
Deadlift / 1x5 64%, 1x5 72%, 3x5 80%
Bench Press / 1x5 64%, 1x5 72%, 5x5 80%

## Day 3
Squat / 1x5 64%, 1x5 72%, 1x5 80%, 1x20 60%
Overhead Press / 12x5 64%
\`\`\`

## nSuns LP

Pretty similar to 5/3/1, but uses more sophisticated set scheme. Also tries to increase weights every week (instead of every 3 weeks like in 5/3/1):

\`\`\`
# Week 1
## Day 1
Bench Press / 1x8 58%, 1x6 67%, 3x4 76%, 1x5 72%, 1x6 67%, 1x7 63%, 1x8+ 58% / progress: custom() {~
  if (dayInWeek > 1 && completedReps >= reps) {
    if (completedReps[3] > 5) { rm1 += 15lb } else
    if (completedReps[3] >= 4) { rm1 += 10lb } else
    if (completedReps[3] >= 2) { rm1 += 5lb }
  }
~}
Overhead Press / 1x6 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(2.5lb)
Bicep Curl / 4x8-12 / progress: lp(5lb)

## Day 2
Squat / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58% / progress: custom() { ...Bench Press }
Sumo Deadlift / 1x5 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(5lb)
Hanging Leg Raise / 3x8-12

## Day 3
Bench Press / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58%
Bench Press Close Grip / 1x6 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(2.5lb)
Hammer Curl / 4x8-12 / progress: lp(5lb)

## Day 4
Deadlift / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58% / progress: custom() { ...Bench Press }
Front Squat / 1x5 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(5lb)
Ab Wheel / 3x8-12
\`\`\`

## GZCLP

It's a linear progression program based on the GZCL principle.

### GZCL principle

Exercises in GZCL programs are split into 3 tiers:

T1: These are main compound exercises (e.g.,  Squat,  Deadlift,  Bench Press,  Overhead Press ). These exercises involve the highest intensity (i.e., the largest weights, about 85-100% of your 2-3 rep max), but with lower volume (fewer reps and sets). Typically, you will perform 10-15 total reps, usually within 1-3 reps per set.

T2: These are secondary compound exercises (e.g.,  Front Squat,  Romanian Deadlift,  Incline Bench Press, etc). These exercises have lower intensity (lower weights), but higher volume (more reps and sets). You should pick exercises that will assist with your T1 exercises. For example, if you want to improve your Squat, you could do Front Squats as a T2 exercise. These exercises are performed with 65-85% of your 2-3 rep max, usually within 5-8 reps per set.

T3: These are isolation exercises (e.g.,  Leg Press,  Leg Curl, Triceps Extension, Lateral Raise). These exercises have the lowest intensity (lightest weights), but highest volume (most reps and sets). The goal is to choose exercises that will assist with your T1 and T2 exercises. These are performed with less than 65% of your 2-3 rep max, usually with 8 or more reps per set.

A useful rule of thumb is the 1:2:3 rule - for every rep you perform in T1, do 2 reps in T2, and 3 in T3.

### Application of the GZCL Principle to GZCLP program

The GZCLP program has three workouts per week, but it's comprised of four different days - A1, A2, B1, and B2. So, you might do A1 on Monday, A2 on Wednesday, B1 on Friday, and then start the next week with B2 on Monday. You keep rotating through these workouts.

For T1 exercises, we utilize main lifts: Squat,  Deadlift,  Bench Press,  Overhead Press . You start with 5 sets of 3 reps. The last rep should be as many as you can do (AMRAP), but don't push to total exhaustion. Stop when you feel you have 1-2 reps left. You'll know you're close to your limit when the bar gets much slower, or your form starts to go wrong.

If you manage to finish all sets, you add 5lb to the Bench Press and Overhead Press, and 10lb to the Squat and Deadlift. If you can't finish, you keep the weight the same, but move on to "Stage 2" - 6 sets of 2 reps. You keep adding weight following the same rules. If you still can't finish - you move to "Stage 3" - 10 sets of 1 rep.

If you can't manage "Stage 3", you either establish your new 5 reps max (5RM) and use that to restart "Stage 1", or you reduce your current weight by 10% and revert to "Stage 1".

So, to summarize:

Stage 1 - 5 sets of 3 reps, AMRAP on the last set
Stage 2 - 6 sets of 2 reps, AMRAP on the last set
Stage 3 - 10 sets of 1 rep, AMRAP on the last set
For T2 exercises, we also do the same main lifts as in T1: Squat,  Deadlift,  Bench Press,  Overhead Press . When you're doing Squats as T1 exercise, you do Bench Press as T2. When Bench Press is T1, Squat is T2. You flip flop the T1 and T2.

There are also 3 stages in T2, but you don't do AMRAP on the last set. You use the same progression rules as in T1 - if you successfully finish all sets, you increase the weight by 5lb for Bench Press and Overhead Press, and by 10lb for Squat and Deadlift. If you couldn't finish all sets, you switch to the next stage.

There're the following stages:

Stage 1 - 3 sets of 10 reps, no AMRAP
Stage 2 - 3 sets of 8 reps, no AMRAP
Stage 3 - 3 sets of 6 reps, no AMRAP
If you fail "Stage 3", you revert to your last weight from "Stage 1", add 15lb to it, and transition back to "Stage 1".

For the T3 exercises, we use Lat Pulldown, and  Dumbbell Bent Over Row

There are no stages, just do 3 sets of 15 reps, with AMRAP as a last set.

Once you can do 25 reps or more - add 5lb to the weight.

Liftoscript for it is the following. Note we use templates for T1/T2 and T3 exercises - it makes it simpler to reuse the templates. If we'd instead e.g. specified all the logic on T1: Squat, and the rest of exercises would reuse T1: Squat - changing T1: Squat to another exercises would require changing the name everywhere in all the reuse lines.

\`\`\`
# Week 1
## Day 1
// ...t1
t1: Squat / ...t1

// ...t2
t2: Bench Press / ...t2

// ...t3
t3: Lat Pulldown / ...t3

## Day 2
// ...t1
t1: Overhead Press / ...t1 / progress: custom(increase: 5lb) { ...t1 }

// ...t2
t2: Deadlift / ...t2 / progress: custom(increase: 10lb, stage3increase: 15lb) { ...t2 }

// ...t3
t3: Bent Over Row / ...t3

## Day 3
// ...t1
t1: Bench Press / ...t1 / progress: custom(increase: 5lb) { ...t1 }

// ...t2
t2: Squat / ...t2 / progress: custom(increase: 10lb, stage3increase: 15lb) { ...t2 }

// ...t3
t3: Lat Pulldown / ...t3

## Day 4
// ...t1
t1: Deadlift / ...t1

// ...t2
t2: Overhead Press / ...t2

// ...t3
t3: Bent Over Row / ...t3


// **T1**. It starts with **85% of 5RM** (or approximately **75% or 1RM**).
// You can adjust your 1RM by clicking the **1RM** link under the exercise name.
// There's the RM calculator there to help find it out if you don't know it

// **T1**.

// **T1**. Retest week, you may skip warmups. Find your new 5RM (5 rep max), as follows
// * Start with the bar, do 5 reps.
// * Throw on some more weight, do 5 reps.
// * Repeat, when the bar starts to get heavy, make smaller jumps.
// * When you finally get to a set that is hard, but you do it - take that number, and enter into "5RM Test" set weight
// * Mark it completed!
t1 / used: none / 4x3, 1x3+ / 5x2, 1x2+ / 9x1, 1x1+ / 1x5 (5RM Test) / 75% / progress: custom(increase: 10lb) {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (setVariationIndex == 4) {
    descriptionIndex = 2
    setVariationIndex = 1
    weights = completedWeights[1] * 0.85
    rm1 = completedWeights[1] / rpeMultiplier(5, 10)
  } else if (completedReps >= reps) {
    weights = completedWeights[ns] + state.increase
  } else if (setVariationIndex == 3) {
    descriptionIndex = 3
    setVariationIndex += 1
  } else {
    setVariationIndex += 1
  }
~}

// **T2**. Start with **35% of 1RM**.
// You can adjust your 1RM by clicking the **edit** icon, and setting the **1 Rep Max** value.
// There's the RM calculator there to help find it out if you don't know it

// **T2**.
t2 / used: none / 3x10 / 3x8 / 3x6 / 62% / progress: custom(stage1weight: 0lb, increase: 5lb, stage3increase: 10lb) {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (completedReps >= reps) {
    weights = completedWeights[ns] + state.increase
  } else if (setVariationIndex == 1) {
    state.stage1weight = completedWeights[ns]
    setVariationIndex += 1
  } else if (setVariationIndex == 2) {
    setVariationIndex += 1
  } else {
    setVariationIndex = 1
    weights = state.stage1weight + state.stage3increase
  }
~}

// **T3**.
t3 / used: none / 2x15, 1x15+ / 60% 90s / progress: custom() {~
  if (completedReps[ns] >= 25) {
    weights = completedWeights[ns] + 5lb
  }
~}
\`\`\`

`;

export default content;
