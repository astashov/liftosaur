---
id: juggernaut-method
name: "The Juggernaut Method 2.0"
author: Chad Wesley Smith
url: "https://www.amazon.com/Juggernaut-Method-2-0-Strength-Athlete-ebook/dp/B00DRIYWBU"
shortDescription: "A 16-week block periodized strength program using submaximal AMRAP-driven progression across four waves of decreasing reps."
isMultiweek: true
tags: []
frequency: 4
age: "more_than_year"
duration: "45-60"
goal: "strength_and_hypertrophy"
---

A 16-week block periodized program by Chad Wesley Smith that cycles through four waves of decreasing reps (10s, 8s, 5s, 3s). Each wave has three working phases - accumulation, intensification, and realization - plus a deload. AMRAP sets at the end of each wave auto-regulate your training max for the next wave.

<!-- more -->

## Origin & Philosophy

The Juggernaut Method was created by [Chad Wesley Smith](https://www.jtsstrength.com/coaches/chad-wesley-smith-2/), founder of Juggernaut Training Systems and holder of the American squat record at 905 lbs. First published as an e-book in 2012 and updated to [version 2.0](https://www.amazon.com/Juggernaut-Method-2-0-Strength-Athlete-ebook/dp/B00DRIYWBU), the program draws from Jim Wendler's [5/3/1](/programs/the531bbb), Doug Young's rep-record-based progression, and Soviet block periodization.

The core philosophy: submaximal training done for high volume with maximal bar speed. Smith argues that training at 60-90% of your max - moved explosively - fully recruits muscle fibers, ingrains proper technique, and avoids the CNS fatigue that comes from grinding heavy singles. You never miss reps. Instead, you set rep records at submaximal weights and let those records drive your progression.

## Who It's For

- **Experience level**: Intermediate to advanced (1+ years of consistent barbell training)
- **Prerequisites**: Known or estimated 1RMs for [{Squat}], [{Bench Press}], [{Deadlift}], and [{Overhead Press}]. You need solid technique on all four lifts since you'll be performing high-rep sets where form tends to break down.
- **Primary goal**: Strength with substantial hypertrophy in the early waves. The 10s and 8s waves build muscle; the 5s and 3s waves peak strength.
- **Best suited for**: Bulking or maintenance. The accumulation phases are demanding and benefit from adequate caloric intake. Can work on a mild cut through the first two waves, but the 3s wave benefits from full recovery.

## Pros & Cons

**Pros**

- The auto-regulated progression means stronger lifters progress faster and weaker lifts don't stall - each lift advances based on actual AMRAP performance
- The 10s and 8s waves build serious work capacity and muscle mass while keeping intensity manageable - most lifters report visible size gains by week 8
- Submaximal training keeps you fresh and injury-free - you never grind reps, which is easier on joints and connective tissue than programs that push to failure
- Block periodization provides natural peaking toward the 3s wave - great for planning around a competition or testing cycle
- Only requires a barbell, squat rack, and bench for the main work

**Cons**

- Each lift is trained once per week - [{Bench Press}] especially may respond better to higher frequency for some lifters
- The 16-week cycle is a long commitment before you see the strength payoff - early waves prioritize volume over intensity
- Accumulation sessions with 5+ working sets of 10 reps plus accessories run 45-60 minutes
- No prescribed accessory work in the original program - you need to program your own based on weak points (this implementation includes a sensible default selection)
- The progression formula only advances weights every 4 weeks, which can feel slow compared to weekly progression programs

## Program Structure

- **Split type**: One main lift per day across 4 days ([{Squat}] / [{Bench Press}] / [{Overhead Press}] / [{Deadlift}])
- **Periodization**: Block periodization with four 4-week waves. Each wave has three working phases (accumulation → intensification → realization) plus a deload week.
- **Schedule**: Fixed weekly - each main lift is trained once per week on its own day (e.g., Mon/Tue/Thu/Fri)

The four waves move from high-rep, lower-intensity work to low-rep, higher-intensity work:

| Wave | Weeks | Rep Target | Focus |
|------|-------|-----------|-------|
| 10s | 1-4 | 10+ reps | Hypertrophy & work capacity |
| 8s | 5-8 | 8+ reps | Hypertrophy with rising intensity |
| 5s | 9-12 | 5+ reps | Strength-speed transition |
| 3s | 13-16 | 3+ reps | Maximal strength |

Within each wave, the three working phases follow a predictable pattern:

- **Accumulation** (week 1): High volume at moderate intensity. Multiple sets at the wave's rep target.
- **Intensification** (week 2): ~60% of accumulation volume at higher intensity. Fewer working sets but heavier weight.
- **Realization** (week 3): Low volume, highest intensity. Ramp up to one all-out AMRAP set. This set drives your progression.
- **Deload** (week 4): Light recovery work at 36-54% of 1RM.

## Exercise Selection & Rationale

The four main lifts - [{Squat}], [{Bench Press}], [{Overhead Press}], [{Deadlift}] - are the same foundation as [5/3/1](/programs/the531bbb). Each gets its own day so you can focus entirely on one movement pattern and give it maximum effort on the AMRAP sets.

Accessories in this implementation target common weak points for each main lift:

- **Squat day**: [{Leg Press}] adds quad volume without spinal loading. [{Lying Leg Curl}] balances the quad-dominant squatting with hamstring work. [{Ab Wheel}] builds the anterior core stability needed for heavy squats.
- **Bench day**: [{Incline Bench Press, Dumbbell}] develops the upper chest and addresses single-arm imbalances. [{Bent Over One Arm Row}] balances pressing volume with horizontal pulling and addresses single-arm imbalances. [{Face Pull}] protects shoulder health and builds the rear delts.
- **OHP day**: [{Lateral Raise}] builds the medial delts that overhead pressing alone doesn't fully develop. [{Chin Up}] adds vertical pulling to balance the pressing. [{Triceps Pushdown}] isolates the lockout muscles.
- **Deadlift day**: [{Bent Over Row}] strengthens the upper back for maintaining deadlift position. [{Hanging Leg Raise}] builds core strength and hip flexor endurance. [{Bicep Curl}] provides direct arm work and keeps biceps healthy for heavy pulling.

All accessories can be freely swapped based on your weak points.

## Set & Rep Scheme

The main lifts follow a fixed percentage scheme across all 16 weeks. All percentages in this implementation are expressed as **% of 1RM** (pre-converted from the book's Training Max percentages by multiplying by 0.9).

Each phase within a wave has a distinct structure:

**Accumulation** - high volume, moderate weight. The last set is AMRAP but leave 2-3 reps in reserve:
- 10s wave: 4x10 + 1x10+ at 54%
- 8s wave: 4x8 + 1x8+ at 59%
- 5s wave: 5x5 + 1x5+ at 63%
- 3s wave: 6x3 + 1x3+ at 68%

**Intensification** - reduced volume (~60% of accumulation), higher intensity. The last working set is AMRAP with 1-2 reps in reserve:
- 10s wave: ramp to 3x10 at 61%
- 8s wave: ramp to 3x8 at 65%
- 5s wave: ramp to 4x5 at 70%
- 3s wave: ramp to 5x3 at 74%

**Realization** - ramp up to a single all-out AMRAP set. No reps left in the tank:
- 10s wave: build to 1x10+ at 68%
- 8s wave: build to 1x8+ at 72%
- 5s wave: build to 1x5+ at 77%
- 3s wave: build to 1x3+ at 81%

### Main lift week over week (same pattern for all four lifts)

:::exercise-example{exercise="squat" equipment="barbell" key="squat_barbell" weeks="1-16" weekLabels="10s Accum,10s Intens,10s Real,10s Deload,8s Accum,8s Intens,8s Real,8s Deload,5s Accum,5s Intens,5s Real,5s Deload,3s Accum,3s Intens,3s Real,3s Deload"}

**Deload** weeks use the same light percentages regardless of wave: 1x5 at 36%, 1x5 at 45%, 1x5 at 54%.

Accessories use 3 sets with double progression (hit the top of the rep range on all sets, then increase weight).

## Progressive Overload

Progression happens once per wave, after the realization AMRAP set (weeks 3, 7, 11, 15). The formula:

**(AMRAP Reps - Standard Reps) × Increment Per Rep = 1RM Increase**

Where:
- **Standard reps** = the wave's target (10 for the 10s wave, 8 for the 8s, 5 for the 5s, 3 for the 3s)
- **Increment** = 5lb per extra rep for [{Squat}] and [{Deadlift}], 2.5lb per extra rep for [{Bench Press}] and [{Overhead Press}]
- **Cap** = maximum 10 extra reps count toward progression (to prevent unrealistic jumps)

**Example**: On the 8s wave realization, you hit 12 reps on [{Squat}] at 72%. Extra reps = 12 - 8 = 4. Squat 1RM increases by 4 × 5lb = 20lb. All subsequent wave percentages automatically scale up.

If you don't beat the standard rep count, your 1RM stays the same. This is fine - the program is designed to auto-regulate. If you're consistently not beating the standard, your 1RM input was too high. Reduce it by 5-10%.

## How Long to Run It / What Next

Run one full 16-week cycle. After the final 3s wave realization, your new 1RMs should be meaningfully higher. You can either:

1. **Test maxes**: Take a week to work up to new 1RMs, enter them, and start a fresh 16-week cycle
2. **Run it again**: Simply start over - your updated 1RMs from the progression formula carry forward automatically

**Signs it's time to move on**: Your AMRAP sets consistently fail to beat the standard reps across multiple waves, or you want higher training frequency on specific lifts.

**Transition options**: [Bullmastiff](/programs/bullmastiff) for a similar wave periodization approach with more developmental lift variety. [5/3/1: Boring But Big](/programs/the531bbb) for a simpler, shorter cycle with built-in hypertrophy volume. [GZCL: The Rippler](/programs/gzcl-the-rippler) for an intermediate program with higher frequency per lift.

## Equipment Needed

- Barbell, squat rack, and flat bench
- Leg press machine - substitute [{Bulgarian Split Squat}] if unavailable
- Lying leg curl machine - substitute [{Romanian Deadlift, Barbell}] or [{Stiff Leg Deadlift}]
- Cable station (for face pulls, triceps pushdown) - substitute [{Reverse Fly}] for face pulls, [{Skullcrusher}] for pushdowns
- Dumbbells (for incline dumbbell bench, dumbbell rows, lateral raises, curls)
- Pull-up bar (for chin-ups, hanging leg raises)

## Rest Times

- **Accumulation phases**: 120 seconds between main lift sets - enough recovery for high-rep sets without letting the session drag
- **Intensification phases**: 120 seconds between main lift sets
- **Realization phases**: 180 seconds - you need full recovery before the AMRAP set
- **Deload phases**: 90 seconds - keep it moving, the weights are light
- **Accessories**: 60-90 seconds

## How to Pick Starting Weights

Enter your current 1RM for each of the four main lifts. All working weights are calculated as percentages. The program already applies a built-in 10% reduction from true 1RM (all book percentages have been multiplied by 0.9), so enter your actual 1RM, not a Training Max.

If you don't know your 1RM, use a calculator: take a recent heavy set (e.g., 5 reps at 225lb) and estimate. Common formula: Weight × Reps × 0.0333 + Weight.

**Common mistake**: Using numbers from months ago or inflated gym estimates. Use a weight you've actually lifted in the last 4-6 weeks. Starting too heavy defeats the purpose of submaximal training - the high-rep waves will be miserable, and your AMRAP sets won't produce meaningful rep records.

## Common Modifications

- **Inverted Juggernaut Method**: Flip the set/rep scheme on accumulation and intensification - instead of 5 sets of 10, do 10 sets of 5. This keeps rep quality high on every set since fatigue doesn't accumulate within a set. Popular for lifters whose technique degrades on high-rep sets.
- **Adding bench frequency**: The most common tweak. Add 3-4 sets of [{Bench Press}] at 60-65% on OHP day, or run a separate bench variation (close grip, incline) as an accessory.
- **3-day variant**: Combine [{Overhead Press}] and [{Deadlift}] into one day. OHP follows the Juggernaut progression, then deadlift follows or vice versa. Sessions will be longer.
- **Skipping deloads**: If you're recovering well, you can skip the deload weeks (4, 8, 12, 16) and jump straight to the next wave. Most lifters benefit from keeping at least the week 12 and 16 deloads.
- **Pairing with 5/3/1**: Run [{Squat}] and [{Deadlift}] on the Juggernaut Method while running [{Bench Press}] and [{Overhead Press}] on [5/3/1](/programs/the531bbb). This is popular because the pressing lifts benefit from the higher intensity exposure that 5/3/1 provides.

<!-- faq -->

### Is the Juggernaut Method good for beginners?

No. The Juggernaut Method is designed for intermediate to advanced lifters with at least a year of consistent barbell training. Beginners make faster progress on a linear program where weight increases every session, like Starting Strength or GZCLP. You also need to know your 1RMs to set up the program correctly.

### How long is one Juggernaut Method cycle?

One full cycle is 16 weeks: four 4-week waves (10s, 8s, 5s, 3s), each containing an accumulation week, intensification week, realization week, and deload week. After 16 weeks, you update your 1RMs based on AMRAP performance and can start another cycle.

### What's the difference between the Juggernaut Method and 5/3/1?

Both use submaximal percentages of a training max and AMRAP sets, but they differ in cycle length and progression speed. 5/3/1 runs in 3-4 week cycles with weight increases every cycle. The Juggernaut Method runs 16-week cycles with four distinct rep phases, building from high-volume hypertrophy (10s wave) to peak strength (3s wave). Juggernaut also adjusts your training max based on how many extra reps you get on the AMRAP, rather than a fixed increment.

### What accessories should I do on the Juggernaut Method?

The original book doesn't prescribe specific accessories. Pick 2-4 exercises per session that target your weak points. Common choices: rows and chin-ups for back, leg press or lunges for quads, hamstring curls for posterior chain, lateral raises and face pulls for shoulders, and direct arm work. This Liftosaur implementation includes a default accessory selection you can swap freely.

### Can I skip the deload weeks on the Juggernaut Method?

You can, especially during the first two waves (10s and 8s) when the training intensity is moderate. However, keep the deloads for the later waves (5s and 3s) when intensity is higher. If you skip deloads, monitor your recovery closely - if AMRAP performance drops, you probably needed the rest.

### What is the Inverted Juggernaut Method?

The Inverted Juggernaut Method flips the set and rep scheme. Instead of 5 sets of 10 on accumulation, you do 10 sets of 5. This keeps every rep fast and technically sound since fatigue doesn't build within a set. The total volume stays the same, but rep quality improves. It's popular for lifters who struggle with form on high-rep sets.

### How do I calculate my training max for the Juggernaut Method?

In this Liftosaur implementation, you don't need to calculate a separate training max. Just enter your actual 1RM for each lift - the percentages are already pre-converted to account for the ~90% training max factor. If you don't know your 1RM, use a calculator with a recent heavy set: Weight x Reps x 0.0333 + Weight.

### What do I do if I can't beat the rep standard on my AMRAP set?

If you hit exactly the standard reps or fewer, your training max stays the same for the next wave. This is fine - the auto-regulation is working as intended. If this happens on multiple lifts or multiple waves, your starting 1RM was probably too high. Reduce it by 5-10% and continue.

```liftoscript
# Week 1 - 10s Accumulation
## Squat Day
main / used: none / 4x10, 1x10+ / 54% / 120s / progress: custom(increment: 5lb) {~
  if (week == 3) {
    if (completedReps[ns] > 20) { rm1 += 10 * state.increment } else
    if (completedReps[ns] > 10) { rm1 += (completedReps[ns] - 10) * state.increment }
  }
  if (week == 7) {
    if (completedReps[ns] > 18) { rm1 += 10 * state.increment } else
    if (completedReps[ns] > 8) { rm1 += (completedReps[ns] - 8) * state.increment }
  }
  if (week == 11) {
    if (completedReps[ns] > 15) { rm1 += 10 * state.increment } else
    if (completedReps[ns] > 5) { rm1 += (completedReps[ns] - 5) * state.increment }
  }
  if (week == 15) {
    if (completedReps[ns] > 13) { rm1 += 10 * state.increment } else
    if (completedReps[ns] > 3) { rm1 += (completedReps[ns] - 3) * state.increment }
  }
~}
Squat[1-16] / ...main
Leg Press[1-16] / 3x10 135lb / 90s / progress: dp(10lb, 10, 15) / warmup: none
Lying Leg Curl[1-16] / 3x12 60lb / 90s / progress: dp(5lb, 12, 15) / warmup: none
Ab Wheel[1-16] / 3x12 0lb / 60s / warmup: none

## Bench Day
Bench Press[1-16] / ...main / progress: custom(increment: 2.5lb) { ...main }
Incline Bench Press, Dumbbell[1-16] / 3x10 30lb / 90s / progress: dp(5lb, 10, 12) / warmup: none
Bent Over One Arm Row[1-16] / 3x10 30lb / 90s / progress: dp(5lb, 10, 12) / warmup: none
Face Pull[1-16] / 3x15 30lb / 60s / progress: dp(5lb, 15, 20) / warmup: none

## OHP Day
Overhead Press[1-16] / ...main / progress: custom(increment: 2.5lb) { ...main }
Lateral Raise[1-16] / 3x12 10lb / 60s / progress: dp(2.5lb, 12, 15) / warmup: none
Chin Up[1-16] / 3x8 0lb / 90s / progress: dp(5lb, 8, 12) / warmup: none
Triceps Pushdown[1-16] / 3x12 40lb / 90s / progress: dp(5lb, 12, 15) / warmup: none

## Deadlift Day
Deadlift[1-16] / ...main
Bent Over Row[1-16] / 3x10 95lb / 90s / progress: dp(5lb, 10, 12) / warmup: none
Hanging Leg Raise[1-16] / 3x12 0lb / 60s / warmup: none
Bicep Curl[1-16] / 3x12 20lb / 60s / progress: dp(5lb, 12, 15) / warmup: none


# Week 2 - 10s Intensification
## Squat Day
main / 1x5 50%, 1x5 56%, 2x10 61%, 1x10+ 61% / 120s
## Bench Day
## OHP Day
## Deadlift Day


# Week 3 - 10s Realization
## Squat Day
main / 1x5 45%, 1x3 54%, 1x1 63%, 1x10+ 68% / 180s
## Bench Day
## OHP Day
## Deadlift Day


# Week 4 - 10s Deload
## Squat Day
main / 1x5 36%, 1x5 45%, 1x5 54% / 90s
## Bench Day
## OHP Day
## Deadlift Day


# Week 5 - 8s Accumulation
## Squat Day
main / 4x8, 1x8+ / 59% / 120s
## Bench Day
## OHP Day
## Deadlift Day


# Week 6 - 8s Intensification
## Squat Day
main / 1x3 54%, 1x3 61%, 2x8 65%, 1x8+ 65% / 120s
## Bench Day
## OHP Day
## Deadlift Day


# Week 7 - 8s Realization
## Squat Day
main / 1x5 45%, 1x3 54%, 1x2 63%, 1x1 68%, 1x8+ 72% / 180s
## Bench Day
## OHP Day
## Deadlift Day


# Week 8 - 8s Deload
## Squat Day
main / 1x5 36%, 1x5 45%, 1x5 54% / 90s
## Bench Day
## OHP Day
## Deadlift Day


# Week 9 - 5s Accumulation
## Squat Day
main / 5x5, 1x5+ / 63% / 120s
## Bench Day
## OHP Day
## Deadlift Day


# Week 10 - 5s Intensification
## Squat Day
main / 1x2 59%, 1x2 65%, 3x5 70%, 1x5+ 70% / 120s
## Bench Day
## OHP Day
## Deadlift Day


# Week 11 - 5s Realization
## Squat Day
main / 1x5 45%, 1x3 54%, 1x2 63%, 1x1 68%, 1x1 72%, 1x5+ 77% / 180s
## Bench Day
## OHP Day
## Deadlift Day


# Week 12 - 5s Deload
## Squat Day
main / 1x5 36%, 1x5 45%, 1x5 54% / 90s
## Bench Day
## OHP Day
## Deadlift Day


# Week 13 - 3s Accumulation
## Squat Day
main / 6x3, 1x3+ / 68% / 120s
## Bench Day
## OHP Day
## Deadlift Day


# Week 14 - 3s Intensification
## Squat Day
main / 1x1 63%, 1x1 70%, 4x3 74%, 1x3+ 74% / 120s
## Bench Day
## OHP Day
## Deadlift Day


# Week 15 - 3s Realization
## Squat Day
main / 1x5 45%, 1x3 54%, 1x2 63%, 1x1 68%, 1x1 72%, 1x1 77%, 1x3+ 81% / 180s
## Bench Day
## OHP Day
## Deadlift Day


# Week 16 - 3s Deload
## Squat Day
main / 1x5 36%, 1x5 45%, 1x5 54% / 90s
## Bench Day
## OHP Day
## Deadlift Day
```
