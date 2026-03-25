---
id: gzcl-general-gainz-riptide
name: "GZCL: General Gainz - Riptide"
author: Cody Lefever
url: "https://www.gainzfever.com/"
shortDescription: An 8-week General Gainz program that alternates between finding rep maxes and pushing them higher, biasing hypertrophy through lighter T1 work and higher volume.
isMultiweek: true
tags: []
frequency: 4
age: "more_than_year"
duration: "90+"
goal: "strength_and_hypertrophy"
---

Riptide is an 8-week program from Cody Lefever's General Gainz book. It alternates between "Find" weeks (discover a rep max at a target weight) and "Push" weeks (use the same weight and push for more reps). T1 cycles through progressively heavier RM targets, T2 does the same at moderate loads, and T3 waves through rep ranges twice across the 8 weeks.

<!-- more -->

Riptide is one of several named programs in Cody Lefever's [General Gainz](https://www.amazon.com/General-Gainz-Weight-Training-Framework-ebook/dp/B0GNLQHM6S) book. It builds on the core General Gainz framework - the tiered system (T1/T2/T3), Volume Drop Sets (VDS), and the four actions (Find, Hold, Push, Extend).

**We strongly recommend [buying the book](https://www.amazon.com/General-Gainz-Weight-Training-Framework-ebook/dp/B0GNLQHM6S)** to fully understand the concepts behind this program - effort ratings, Volume Drop Sets, the Effort Gap, Compensatory Acceleration Training (CAT), and the Find/Hold/Push/Extend progression system. The book covers all of this in depth, along with other programs like Abyssal Wake, Iron Tides, Wave Breaker, Steel Helm, etc.

## Quick Overview

Riptide alternates between **Find** weeks (odd - discover your RM at a target effort) and **Push** weeks (even - hold the same weight, push for more reps). RPE guides the target effort: @8 = Easy (2+ RIR), @9 = Moderate (1 RIR), @10 = Hard (0 RIR).

This implementation uses a 4-day upper/lower split. T2 and T3 exercises are freely swappable - keep T1 as the main barbell compounds.

## How to Use This in the App

On **Find weeks**, use warmup sets to work up to your RM weight. Add more via **+ warmup set** if necessary. Once you complete the RM set, the Volume Drop Sets auto-adjust to match your weight and reps.

On **Push weeks**, use the same weight as the previous Find week. The app remembers it. Push for as many reps as possible (AMRAP).

Set your **1RM** for each exercise before starting - the app uses it to suggest initial weights via RPE tables.

## Equipment Substitutions

Home gym alternatives for T3 machine exercises:

- [{Leg Press}] → [{Bulgarian Split Squat}] or [{Goblet Squat}]
- [{Seated Leg Curl}] → lighter [{Romanian Deadlift, Barbell}] or Nordic curls
- [{Leg Extension}] → [{Lunge}] or [{Sissy Squat}]
- [{Lat Pulldown}] → [{Pull Up}] or [{Chin Up}]
- [{Seated Row}] → [{Bent Over Row, Dumbbell}]
- [{Triceps Pushdown}] → [{Skullcrusher}] or [{Triceps Dip}]
- [{Face Pull}] → [{Reverse Fly}] with dumbbells

<!-- faq -->

### Where can I learn more about General Gainz?

Buy the [General Gainz book](https://www.amazon.com/General-Gainz-Weight-Training-Framework-ebook/dp/B0GNLQHM6S) by Cody Lefever. It covers the full framework in depth - effort ratings, Volume Drop Sets, the four actions (Find/Hold/Push/Extend), and several other programs beyond Riptide. It's essential reading to get the most out of this program.

### Is General Gainz Riptide good for intermediates?

Yes, Riptide works well for intermediate lifters with at least a year of training experience. You need to be comfortable estimating rep maxes and rating effort. If you're still making linear progress session to session, stick with [GZCLP](/programs/gzclp) instead.

### How many days a week is Riptide?

Riptide is a 4-day upper/lower split. Each day has 1 T1 heavy compound, 1 T2 moderate compound, and 4 T3 accessory exercises.

### How is Riptide different from Abyssal Wake?

Riptide is 8 weeks vs Abyssal Wake's 12. It has a simpler Find/Push alternation and less heavy T1 work. Riptide is a good entry point to General Gainz fixed-length programs before tackling the longer ones.

### What should I do after finishing Riptide?

The book covers several follow-up options including Undertow (Riptide in reverse), Steel Helm (peaking toward a 1RM), or another Riptide cycle with heavier weights. See the book for details on transitioning between programs.

```liftoscript
# Week 1
## Day 1
// **T1 - Find week**. Use warmup sets to work up to your RM weight.
// Add more via **+ warmup set** if necessary.
// VDS auto-adjust after you complete the RM. Move each rep explosively (CAT).
t1 / used: none / 1x5 (RM) ?+ @8, 5x2 (VDS) 80% / 180s / update: custom() {~
  if (setIndex == 1) {
    weights = completedWeights[1]
    if (week == 8) {
      numberOfSets = 1
    } else if (week <= 2) {
      var.r = max(floor(completedReps[1] / 2), 1)
      sets(2, numberOfSets, var.r, var.r, 0, completedWeights[1], 120, 0, 0)
    } else if (week == 4 || week == 6) {
      if (completedReps[1] >= 5) {
        var.r = max(floor(completedReps[1] / 2), 1)
        sets(2, numberOfSets, var.r, var.r, 0, completedWeights[1], 120, 0, 0)
      } else {
        sets(2, numberOfSets, 1, 1, 0, completedWeights[1], 150, 0, 0)
      }
    } else {
      sets(2, numberOfSets, 1, 1, 0, completedWeights[1], 150, 0, 0)
    }
  }
~} / progress: custom() {~
  if (week % 2 == 1) {
    weights[week + 1:*:*:*] = completedWeights[1]
  }
~}

// **T2 - Find week**. Use warmup sets to work up to your RM weight.
// Add more via **+ warmup set** if necessary. Half-sets auto-adjust after the RM.
t2 / used: none / 1x10 (RM) ?+ @8, 4x5 (VDS) 60% / 120s / update: custom() {~
  if (setIndex == 1) {
    weights = completedWeights[1]
    var.r = max(floor(completedReps[1] / 2), 1)
    sets(2, numberOfSets, var.r, var.r, 0, completedWeights[1], 90, 0, 0)
  }
~} / progress: custom() {~
  if (week % 2 == 1) {
    weights[week + 1:*:*:*] = completedWeights[1]
  }
~}

// **T3** - Max Rep Sets. Easy effort.
t3 / used: none / 4x15-20+ (MRS) ?+ @8 / 60s

// ...t1
t1: Squat[1-8] / ...t1
// ...t2
t2: Romanian Deadlift, Barbell[1-8] / ...t2
// ...t3
t3: Leg Press[1-8] / ...t3
// ...t3
t3: Seated Leg Curl[1-8] / ...t3
// ...t3
t3: Leg Extension[1-8] / ...t3
// ...t3
t3: Standing Calf Raise[1-8] / ...t3

## Day 2
// ...t1
t1: Bench Press[1-8] / ...t1
// ...t2
t2: Overhead Press[1-8] / ...t2
// ...t3
t3: Lat Pulldown[1-8] / ...t3
// ...t3
t3: Seated Row[1-8] / ...t3
// ...t3
t3: Lateral Raise[1-8] / ...t3
// ...t3
t3: Triceps Pushdown[1-8] / ...t3

## Day 3
// ...t1
t1: Deadlift[1-8] / ...t1
// ...t2
t2: Front Squat[1-8] / ...t2
// ...t3
t3: Leg Press[1-8] / ...t3
// ...t3
t3: Seated Leg Curl[1-8] / ...t3
// ...t3
t3: Leg Extension[1-8] / ...t3
// ...t3
t3: Standing Calf Raise[1-8] / ...t3

## Day 4
// ...t1
t1: Overhead Press[1-8] / ...t1
// ...t2
t2: Chin Up[1-8] / ...t2
// ...t3
t3: Seated Row[1-8] / ...t3
// ...t3
t3: Bicep Curl[1-8] / ...t3
// ...t3
t3: Face Pull[1-8] / ...t3
// ...t3
t3: Skullcrusher[1-8] / ...t3


# Week 2
## Day 1
// **T1 - Push week**. Same weight as Week 1. Go for max reps.
t1 / 1x5+ (RM) @10, 5x3 (VDS) 80% / 180s

// **T2 - Push week**. Same weight as Week 1.
t2 / 1x10+ (RM) @10, 4x5 (VDS) 60% / 120s

// **T3** - Easy effort.
t3 / 4x12-15+ (MRS) ?+ @8 / 60s
## Day 2
## Day 3
## Day 4


# Week 3
## Day 1
// **T1 - Find week**. Go heavier than Week 1.
t1 / 1x3 (RM) ?+ @9, 5x1 (VDS) 85% / 180s

// **T2 - Find week**.
t2 / 1x6 (RM) ?+ @9, 4x3 (VDS) 70% / 120s

// **T3** - Moderate effort.
t3 / 4x10-12+ (MRS) ?+ @9 / 60s
## Day 2
## Day 3
## Day 4


# Week 4
## Day 1
// **T1 - Push week**. Same weight as Week 3.
// VDS: if you hit <5 reps, **singles**. If 5+, **half-sets**.
t1 / 1x3+ (RM) @10, 5x1 (VDS) 85% / 180s

// **T2 - Push week**. Same weight as Week 3.
t2 / 1x6+ (RM) @10, 4x3 (VDS) 70% / 120s

// **T3** - Hard effort.
t3 / 3x8-10+ (MRS) ?+ @10 / 60s
## Day 2
## Day 3
## Day 4


# Week 5
## Day 1
// **T1 - Find week**.
t1 / 1x4 (RM) ?+ @8, 5x1 (VDS) 80% / 180s

// **T2 - Find week**.
t2 / 1x8 (RM) ?+ @8, 4x4 (VDS) 65% / 120s

// **T3** - New wave. Easy effort.
t3 / 4x15-20+ (MRS) ?+ @8 / 60s
## Day 2
## Day 3
## Day 4


# Week 6
## Day 1
// **T1 - Push week**. Same weight as Week 5.
// VDS: if you hit <5 reps, **singles**. If 5+, **half-sets**.
t1 / 1x4+ (RM) @10, 5x1 (VDS) 80% / 180s

// **T2 - Push week**. Same weight as Week 5.
t2 / 1x8+ (RM) @10, 4x4 (VDS) 65% / 120s

// **T3** - Easy effort.
t3 / 4x12-15+ (MRS) ?+ @8 / 60s
## Day 2
## Day 3
## Day 4


# Week 7
## Day 1
// **T1 - Find week**. Heaviest of the cycle.
t1 / 1x2 (RM) ?+ @9, 2x1 (VDS) 90% / 180s

// **T2 - Find week**.
t2 / 1x5 (RM) ?+ @9, 4x2 (VDS) 75% / 120s

// **T3** - Moderate effort.
t3 / 4x10-12+ (MRS) ?+ @9 / 60s
## Day 2
## Day 3
## Day 4


# Week 8
## Day 1
// **T1 - Push week**. Same weight as Week 7. No VDS. Final push!
t1 / 1x2+ (RM) @10 / 180s

// **T2 - Push week**. Same weight as Week 7. Final week!
t2 / 1x5+ (RM) @10, 4x2 (VDS) 75% / 120s

// **T3** - Hard effort. Final wave!
t3 / 3x8-10+ (MRS) ?+ @10 / 60s
## Day 2
## Day 3
## Day 4
```
