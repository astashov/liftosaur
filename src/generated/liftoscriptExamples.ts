// Auto-generated from ./llms/liftoscript_examples.md
// Do not edit manually - run npm run build:markdown to update

export const content = `# Liftoscript Examples

## Basic Beginner Program

3 days a week, focusing on basic lifts, using linear progression for all lifts - adding 2.5lb in case of success, drop by 10% weight in case of a failure. Consists of just 2 workouts - A and B, alternating them every workout.

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
Also, we're reusing Squat here as a base exercise, which makes it harder to change the name of the exercise later, if needed - you need to change it in all the places where it's reused. So, it's less preferable, although possible to write programs that way.

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
main_progress / used: none / progress: custom() {~
  if (dayInWeek > 1 && completedReps >= reps) {
    if (completedReps[3] > 5) { rm1 += 15lb } else
    if (completedReps[3] >= 4) { rm1 += 10lb } else
    if (completedReps[3] >= 2) { rm1 += 5lb }
  }
~}

Bench Press / 1x8 58%, 1x6 67%, 3x4 76%, 1x5 72%, 1x6 67%, 1x7 63%, 1x8+ 58% / progress: custom() { ...main_progress }
Overhead Press / 1x6 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(2.5lb)
Bicep Curl / 4x8-12 / progress: lp(5lb)

## Day 2
Squat / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58% / progress: custom() { ...main_progress }
Sumo Deadlift / 1x5 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(5lb)
Hanging Leg Raise / 3x8-12

## Day 3
Bench Press / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58%
Bench Press Close Grip / 1x6 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(2.5lb)
Hammer Curl / 4x8-12 / progress: lp(5lb)

## Day 4
Deadlift / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58% / progress: custom() { ...main_progress }
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

## GZCL: The Rippler

This is example of another GZCL program, but using mesocycles and peaking part.
A four-day upper/lower, with bi-weekly undulation in intensity, weight and reps.

More volume and slower progression than in GZCLP, which makes it a good program for intermediate/advanced lifters.

The bi-weekly waving patterns of weight change and gradual reducing of volume and increasing the weight makes it quite fun to follow!

In The Rippler program, we use the 2 rep max (2RM) weight as a basis. This is a 12-week program, where the weight for T1 and T2 exercises changes each week according to a specific pattern.

For T1 exercises, we increase the weight for 2 weeks, then slightly decrease it, and increase it even more in week 4. This pattern repeats through 4-week blocks. We'll have three 4-week blocks. We use 2 rep max (2RM) as a base weight for T1 exercises. So, for first 4 weeks we do 85%, 87.5%, 90%, 92.5% of 2RM weight. Liftosaur uses 1RM as a basis for the programs though, so the weights are converted into 1RM.

For T2 exercises, we gradually increase the weights over 3 weeks (e.g., 80%, 85%, 90%), then reset to 82.5%, and increase again (82.5%, 87.5%, 92.5%). We repeat this pattern over four 3-week blocks, creating a wave-like pattern. We use 5 rep max (5RM) as a base weight for T2 exercises. We skip T2 exercises completely on weeks 11 and 12. Again, the weights in Liftosaur are converted into % of 1RM.

For T3 exercises, we don't vary the weight, but aim to do the maximum reps each time. Start with a weight you can lift for 10 reps, then do as many reps as you can, leaving 1-2 reps in reserve. It's better to err on the side of lighter weights. If the weight you choose is too light, the Liftosaur app will automatically adjust and increase the weight as needed in weeks 3, 6, and 9.

Starting from week 11, you'll begin preparing for the 1RM test. You won't perform the T2 and T3 exercises at all during this period. On week 11, you will do heavy 2RMs of T1, and on week 12, you'll test your 1RM, and enjoy your new PRs!

\`\`\`
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
\`\`\`

## GZCL: General Gainz

Another GZCL program, which is built on the following principles:

### T1 Exercises
The progression is based on 4 actions:

Find: you pick a weight you can do for 3-6 reps (3RM-6RM), make an attempt, and estimate it's complexity. Whether it was easy (RPE 8 - 2 reps in the tank), medium (RPE 9 - 1 rep in the tank), or hard - (RPE 10 - no reps in the tank).
Hold: next time you try to do the same reps with same weight (e.g., for a second chance).
Push: next time you try to do more reps with same weight, push your limits.
Extend: Do 1-rep sets after the first 3-6 RM set. The number of sets matches your first RM set. For example, if you did a 5RM, you do 5 additional 1-rep sets with the same weight. You can extend the number of sets up to an additional 3 sets if the first set was easy or medium.
So, initially you do Find and Extend. In the next workouts, you make a decision - either Hold or Push, and after that - Extend again.

Once you get to 6RM + 6 sets, you can increase the weight.

Rest time is important; otherwise, you can pretty much do the extension sets forever. 3-5 minutes after first set, and 2-3 minutes after extension sets.

### T2 Exercises
Pretty similar to T1 - also have 4 actions with the same meaning:

Find: you pick a weight you can do for 6-10 reps (6RM-10RM), make an attempt, and estimate it's complexity. Whether it was easy (RPE 8 - 2 reps in the tank), medium (RPE 9 - 1 rep in the tank) or hard - (RPE 10 - no reps in the tank).
Hold: next time you try to do the same reps with same weight (e.g., for a second chance).
Push: next time you try to do more reps with same weight, push your limits.
Extend: Do half-sets after the first 6-10 RM set. Your goal is to get 2 times of the reps from the first set, doing sets with half reps of your first set. For example if you did 10RM first set, you want to get 20 reps total in the extension sets. So, you do 4 sets of 5 reps (5 = 10 / 2). You can extend the number of sets up to an additional 2 sets if the first set was easy or medium.
Once you get to 10RM + all extension sets, you can increase the weight.

Rest time is important here too. Rest for 2-4 minutes after the first set, and 1-2 minutes after extension sets.

### T3 Exercises
T3 exercises consist of just 3 sets of AMRAP (or Max Rep Sets - MRS). Keep short rest times between them - 30-90 seconds.

\`\`\`
# Week 1
## Day 1
// **T1**.
// * **Find**: Initially set your 1RM for the exercise, and work up to the first set.
// * **Extend**: Do the same amount of singles (1 rep) as it was your RM, with the same weight. E.g. if you did 4RM, do 4 sets x 1 rep after. You can extend the number of sets up to 3 extra sets (e.g. for 4RM - up to 7 sets x 1 rep max) if 4RM was easy.
// * Next time, you'd either try to do the same number of reps with the same weight (**Hold**), or try to **Push** and do more reps.
// * If you are able to do 6 reps with 6 extensions, the weight will be increased next time
t1 / used: none / 1+x3-6 85% / 180s / update: custom() {~
  if (setIndex == 1) {
    numberOfSets = completedReps[1] > 2 ? completedReps[1] + 1 : 2
    sets(2, 99, 1, 1, 0, completedWeights[1], 180, 0, 0)
  }
~} / progress: custom() {~
  if (completedReps >= reps && numberOfSets == 7) {
    weights += 5lb
  }
~}

// **T2**.
// * **Find**: Initially set your 1RM for the exercise, and work up to the first set.
// * **Extend**: Do the of "halfes" sets (your RM from the first set / 2) so the volume would be double of your RM. E.g. if you did 10RM, do 4 sets x 5 reps (20 total) after. You can extend the number of sets up to 2 extra sets if 10RM was easy.
// * Next time, you'd either try to do the same number of reps with the same weight (**Hold**), or try to **Push** and do more reps.
// * If you are able to do 10RM with 4 extensions, the weight will be increased next time
t2 / used: none / 1+x6-10 75%, 4x1 75% / 120s / update: custom() {~
  if (setIndex == 1) {
    sets(2, 99, floor(completedReps[1] / 2), floor(completedReps[1] / 2), 0, completedWeights[1], 120, 0, 0)
  }
~} / progress: custom() {~
  if (completedReps >= reps) {
    weights += 5lb
  }
~}

// **T3**. All sets are Max Rep Sets (AMRAP).
t3 / used: none / 3x10+ 50% / 90s

// ...t1
t1: Squat / ...t1
// ...t2
t2: Romanian Deadlift, Barbell / ...t2
// ...t3
t3: Seated Leg Curl / ...t3
// ...t3
t3: Leg Extension / ...t3

## Day 2
// ...t1
t1: Bench Press / ...t1
// ...t2
t2: Incline Bench Press / ...t2
// ...t3
t3: Seated Row / ...t3
// ...t3
t3: Lat Pulldown / ...t3

## Day 3
// ...t1
t1: Deadlift / ...t1
// ...t2
t2: Front Squat / ...t2
// ...t3
t3: Crunch, Cable / ...t3
// ...t3
t3: Good Morning / ...t3

## Day 4
// ...t1
t1: Overhead Press / ...t1
// ...t2
t2: Chin Up / ...t2
// ...t3
t3: Bicep Curl / ...t3
// ...t3
t3: Skullcrusher / ...t3
\`\`\`

## Madcow 5x5

Intermediate strength/muscle‑building plan built on Bill Starr’s 5×5; designed for lifters who’ve outgrown beginner linear gains.
Alternates Heavy/Light/Medium (HLM) workouts across three full-body sessions per week

Monday (Heavy): Squat, Bench/OHP, Row/Deadlift with progressive warm-ups leading to a heavy “top” set (1×5).
Wednesday (Light): Same lifts with lighter load (2×5) to aid recovery.
Friday (Medium): Moderate weight (1×3) followed by a heavier top set, plus a back-off set (~8 reps)

Increase your top set week-to-week (≈2.5 % or ~5 lb).
Auxiliary sets scale based on percentages of that top set (50–100 %) 
Example: Squat top set progression from ~315 lb up over several weeks 

\`\`\`
# Week 1
## Workout A
main / used: none / 1x5 40%, 1x5 55%, 1x5 65%, 1x5 75%, 1x5 85% / progress: custom(increment: 5lb) {~
  if (completedReps >= reps && dayInWeek == 3) {
    weights += state.increment
  }  
~} / update: custom() {~
  if (dayInWeek == 3 && setIndex == 4) {
    if (completedReps[setIndex] >= reps[setIndex]) {
      weights[5] = weights[5] + state.increment
    }
  }
~}
Squat / ...main[1]
Bench Press / ...main[1] / progress: custom(increment: 2.5lb) { ...main }
Bent Over Row / ...main[1] / progress: custom(increment: 2.5lb) { ...main }
Bicep Curl / 3x8-12 / progress: lp(5lb)

## Workout B
main / 1x5 40%, 1x5 55%, 2x5 65%
Squat / ...main[2]
Incline Bench Press / ...main[2] / progress: lp(2.5lb)
Deadlift / ...main[2] / progress: lp(5lb)
Skullcrusher / 3x8-12 / progress: lp(5lb)

## Workout C
main / 1x5 40%, 1x5 55%, 1x5 65%, 1x5 75%, 1x3 85%, 1x8 65%
Squat / ...main[3]
Bench Press / ...main[3]
Bent Over Row / ...main[3]
Hammer Curl / 3x8-12 / progress: lp(5lb)
\`\`\`
`;

export default content;
