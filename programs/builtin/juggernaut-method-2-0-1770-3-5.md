---
id: juggernaut-method-2-0-1770-3-5
name: "Juggernaut Method 2.0"
author: Chad Wesley Smith
url: "https://www.jtsstrength.com/"
shortDescription: A 16-week block-periodized strength program cycling through 10s, 8s, 5s, and 3s waves with AMRAP-driven auto-regulation.
isMultiweek: true
tags: []
frequency: 4
age: "3_to_12_months"
duration: "45-60"
goal: "strength_and_hypertrophy"
---

Chad Wesley Smith's 16-week block-periodized program built on submaximal training and auto-regulation. Four 4-week waves (10s, 8s, 5s, 3s) each cycle through accumulation, intensification, realization, and deload phases. The realization week AMRAP set determines your training max for the next wave, letting the program adapt to your actual rate of progress.

<!-- more -->

## Origin & Philosophy

The Juggernaut Method was created by [Chad Wesley Smith](https://www.jtsstrength.com/) of Juggernaut Training Systems, an elite powerlifter who squatted 905 lbs and totaled 2,165 lbs in competition. Version 2.0, published in his ebook *The Juggernaut Method 2.0*, refined the original with better auto-regulation and periodization.

The program draws from three influences: Jim Wendler's 5/3/1 (percentage-based progression, submaximal training), Doug Young's AMRAP-driven weight adjustments, and block periodization (distinct accumulation/intensification/realization phases). The core philosophy is that submaximal training builds more work capacity, better technique, and more sustainable progress than constantly grinding near maxes. The program never exceeds 90% of training max (81% of true 1RM).

## Who It's For

- **Experience level**: Intermediate (1-3 years of consistent barbell training). You need established 1RMs for [{Squat}], [{Bench Press}], [{Deadlift}], and [{Overhead Press}].
- **Primary goal**: Strength with a significant hypertrophy component, especially in the early waves (10s and 8s)
- **Best suited for**: Athletes who want both size and strength, or powerlifters in an off-season building block. The submaximal approach also works well for lifters who do other sports alongside their lifting. Suitable for bulking or maintenance — the 10s wave volume is demanding.

## Pros & Cons

**Pros**

- Built-in auto-regulation via realization AMRAPs adjusts your training max every 4 weeks — stronger lifters progress faster, weaker sessions don't derail the program
- The 10s and 8s waves build meaningful muscle mass while developing technique through high-rep practice on the main lifts
- Submaximal loading (never exceeds 81% of true 1RM) is joint-friendly and reduces injury risk compared to programs that push near-max weights frequently
- Flexible assistance work — you choose accessories based on your own weak points rather than following a rigid template
- Each wave provides a natural deload week, preventing fatigue accumulation over the 16-week cycle

**Cons**

- Each lift is only trained once per week — lifters who respond better to higher frequency (2-3x/week per lift) may find progress slower on technique-dependent lifts like [{Bench Press}]
- The 10s wave can feel tediously light for experienced lifters — some reviewers report not getting much from the first 8 weeks
- No prescribed assistance work means you need the knowledge to select your own accessories effectively
- The 16-week commitment is long — if your 1RM estimates are off, you'll spend multiple weeks at incorrect percentages before the auto-regulation corrects it

## Program Structure

- **Split**: One main lift per day across 4 days ([{Squat}], [{Bench Press}], [{Overhead Press}], [{Deadlift}])
- **Periodization**: Block periodization with four 4-week waves. Each wave has accumulation (high volume), intensification (moderate volume, higher intensity), realization (low volume, AMRAP test), and deload phases
- **Schedule**: Fixed 4-day weekly split — typically Mon/Tue/Thu/Fri or any arrangement that allows rest between sessions
- **Progression direction**: Volume decreases and intensity increases across the 16 weeks — from 5x10 @ 54% in Week 1 to a single AMRAP @ 81% in Week 15

## Exercise Selection & Rationale

The program trains four barbell lifts — [{Squat}], [{Bench Press}], [{Overhead Press}], and [{Deadlift}] — each on its own day. These are the only lifts that follow the Juggernaut percentage progression.

Chad Wesley Smith chose these four lifts because they cover all major movement patterns (squat, hip hinge, horizontal press, vertical press) and allow precise percentage-based loading with a barbell. Each lift gets dedicated focus on its own day, which is important because the accumulation weeks involve high total reps (50+ per session) that would be difficult to sustain across multiple compounds.

Assistance work is not prescribed in the original program. Smith recommends choosing 2-4 accessories per session targeting your weak points, performed for 1-5 sets of 8-20 reps. This implementation includes [{Bent Over Row}], [{Chin Up}], [{Lat Pulldown}], [{Hanging Leg Raise}], [{Lateral Raise}], [{Triceps Pushdown}], [{Bicep Curl, Barbell}], and [{Face Pull}] as sensible defaults. All can be freely swapped.

## Set & Rep Scheme

All percentages in this implementation are expressed as **% of 1RM directly**. The original program uses a Training Max (TM = 90% of 1RM) — all TM percentages have been pre-converted to 1RM percentages.

Each 4-week wave follows this pattern:

**Accumulation week** — High volume at moderate intensity. The last set is AMRAP but leave 2-3 reps in reserve:
- 10s wave: 4x10, 1x10+ @ 54%
- 8s wave: 4x8, 1x8+ @ 59%
- 5s wave: 5x5, 1x5+ @ 63%
- 3s wave: 6x3, 1x3+ @ 68%

**Intensification week** — Volume drops ~60%, intensity increases. Includes ramp-up sets leading into working sets. Leave 1-2 reps in reserve on the AMRAP:
- 10s wave: ramp-up sets, then 2x10, 1x10+ @ 61%
- 8s wave: ramp-up sets, then 2x8, 1x8+ @ 65%
- 5s wave: ramp-up sets, then 3x5, 1x5+ @ 70%
- 3s wave: ramp-up sets, then 4x3, 1x3+ @ 74%

**Realization week** — Minimal volume, one all-out AMRAP set at peak intensity. Go to failure:
- 10s wave: ramp-up sets → 1x10+ @ 68%
- 8s wave: ramp-up sets → 1x8+ @ 72%
- 5s wave: ramp-up sets → 1x5+ @ 77%
- 3s wave: ramp-up sets → 1x3+ @ 81%

**Deload week** — Recovery. 3 light sets of 5, no AMRAP: 1x5 @ 36%, 1x5 @ 45%, 1x5 @ 54%

## Progressive Overload

After each realization week (weeks 3, 7, 11, 15), the AMRAP performance drives training max adjustments for the next wave. The formula: take the weight and reps from the AMRAP, estimate a new 1RM using an e1RM calculator, then set your new training max at 90% of that estimated 1RM.

In this Liftosaur implementation, 1RM updates happen automatically after the realization AMRAP. For each rep beyond the minimum prescribed, 1% of your current 1RM is added. This approximates the formula from the book while keeping the math simple.

**Example**: On the 10s realization week, you do 15 reps at 68% (prescribed minimum is 10). That's 5 extra reps × 1% of 1RM = 5% increase to your 1RM, shifting all future percentages up proportionally.

If you only hit the minimum reps, the 1RM stays the same. If you fail to hit the minimum, the weights were too heavy — reduce your 1RM by 5-10% in the app.

**Deload**: Every 4th week. Light sets of 5 at 36-54% with no AMRAP. Assistance volume is halved. Don't skip deloads.

## How Long to Run It / What Next

Run the full 16 weeks as one cycle. Many lifters run it 2-3 times consecutively, as the auto-regulation keeps the weights appropriate across cycles.

**Signs it's time to move on**: Your realization AMRAPs are barely hitting the minimum reps despite honest effort (the program has extracted most of what it can), or you want higher frequency per lift.

**Transition to**: The **Inverted Juggernaut Method** (flips sets/reps in the 10s and 8s waves for more intensity earlier), [5/3/1: Boring But Big](/programs/the531bbb) (higher frequency per pattern, more hypertrophy focus), or [Bullmastiff](/programs/bullmastiff) (similar wave periodization with AMRAP auto-regulation but higher frequency per lift).

## Equipment Needed

Barbell, squat rack, bench, and weight plates for all main work. A cable machine and pull-up bar for the default assistance exercises.

**Home gym substitutions**:
- [{Lat Pulldown}] → [{Pull Up}] or [{Chin Up}]
- [{Triceps Pushdown}] → [{Skullcrusher}] or [{Bench Dip}]
- [{Face Pull}] → [{Reverse Fly}]

## Rest Times

- **Main lift working sets**: 2-3 minutes during accumulation and intensification (moderate intensity, higher volume). 3-5 minutes during realization (max effort AMRAP).
- **Ramp-up sets**: 60-90 seconds (these are light and serve as extended warmups)
- **Assistance work**: 60-90 seconds

## How to Pick Starting Weights

Enter your 1RM for each main lift in the app. The program calculates all working weights from there using a built-in training max of 90% of 1RM.

**If you don't know your 1RM**: Work up to a weight you can do for 3-5 clean reps. Use a rep-max calculator (or the built-in one in the app) to estimate your 1RM. Then enter that value.

**Common mistake**: Using an inflated 1RM. The 10s accumulation week starts at 54% of 1RM — this should feel moderate for sets of 10. If it feels heavy from Week 1, your 1RM is too high. Reduce by 5-10%. Smith's core principle: start conservatively and let the AMRAP auto-regulation drive the weights up.

## Common Modifications

- **Inverted Juggernaut Method**: Flips the set/rep scheme for the 10s and 8s waves — more sets with fewer reps at the same percentages. More intensity-focused from the start.
- **Juggernaut + 5/3/1 hybrid**: After the main Juggernaut work, do the corresponding 5/3/1 sets for the opposite lift (e.g., Juggernaut [{Squat}] then 5/3/1 [{Deadlift}]). Use 90-95% of your Juggernaut TM as the 5/3/1 TM to avoid excessive fatigue.
- **Skip deloads selectively**: Some lifters skip the deload after the 10s wave since the intensity is still low. Keep the deload after the 5s and 3s waves at minimum.
- **Add a second exposure per lift**: On Day 2 (bench day), add light [{Overhead Press}] as assistance, and vice versa. On Day 1 (squat day), add light [{Romanian Deadlift, Barbell}] as assistance.
- **Bench press frequency**: If bench is lagging, add [{Incline Bench Press}] or [{Bench Press Close Grip}] as assistance on OHP day.

<!-- faq -->

### Is the Juggernaut Method 2.0 good for beginners?

No. The Juggernaut Method 2.0 requires established 1RMs and the ability to gauge effort levels across different rep ranges. Beginners should run a linear progression program first, such as Starting Strength or GZCLP, until they stop making weekly weight increases.

### How many days a week is the Juggernaut Method?

The Juggernaut Method is a 4-day program. Each day focuses on one main barbell lift — Squat, Bench Press, Overhead Press, or Deadlift — followed by assistance work. A typical schedule is Monday/Tuesday/Thursday/Friday.

### How does progression work on the Juggernaut Method 2.0?

Every third week of each 4-week wave, you perform an all-out AMRAP set at the peak intensity for that wave. The number of reps you achieve determines your new training max for the next wave. For every rep beyond the minimum, your estimated 1RM increases by approximately 1%, and your training max (90% of 1RM) adjusts accordingly.

### Can I run the Juggernaut Method while doing other sports?

Yes — this is one of its strengths. Chad Wesley Smith designed it for athletes, not just powerlifters. The submaximal loading and built-in deload weeks manage fatigue well alongside other training. Many users run it while playing sports or doing conditioning work. Adjust assistance volume if recovery becomes an issue.

### What assistance work should I do with the Juggernaut Method 2.0?

The program doesn't prescribe specific accessories. Chad Wesley Smith recommends 2-4 exercises per session for 1-5 sets of 8-20 reps, targeting your weak points. Common choices include rows, pull-ups, dips, lateral raises, curls, and core work. During deload weeks, cut assistance volume in half.

### How long should I run the Juggernaut Method 2.0?

Run the full 16-week cycle, then reassess. Many lifters run 2-3 consecutive cycles because the AMRAP auto-regulation keeps the weights progressing appropriately. Move on when your realization AMRAPs consistently barely hit the minimum prescribed reps.

### Is the Juggernaut Method better than 5/3/1?

They serve different purposes. The Juggernaut Method has more volume in the early waves (10s and 8s) which builds more muscle, and its 4-week auto-regulation cycle adjusts faster than 5/3/1's 3-week cycle. However, 5/3/1 offers more template variety and hits each lift with heavier weights more frequently. Juggernaut is better for off-season building; 5/3/1 is more versatile for year-round training.

### What if I can't complete the minimum reps on the realization AMRAP?

Your training max is too high. Reduce your 1RM in the app by 5-10% and continue into the next wave with the adjusted numbers. This is rare if you start conservatively — the accumulation and intensification weeks should feel manageable if your 1RM is set correctly.

```liftoscript
# Week 1 - 10s Accumulation
## Squat Day
main / used: none / 4x10, 1x10+ / 54% / 150s / progress: custom() {~
  if (week == 3 || week == 7 || week == 11 || week == 15) {
    var.extra = completedReps[ns] - reps[ns]
    if (var.extra > 0) {
      rm1 += var.extra * rm1 / 100
    }
  }
~}
acc / used: none / 3x10 / 60s / progress: dp(5lb, 10, 15)

Squat[1-16] / ...main
Bent Over Row[1-16] / ...acc / 95lb
Hanging Leg Raise[1-16] / ...acc / 0lb / warmup: none

## Bench Day
Bench Press[1-16] / ...main
Chin Up[1-16] / ...acc / 0lb / warmup: none
Triceps Pushdown[1-16] / ...acc / 30lb

## OHP Day
Overhead Press[1-16] / ...main
Lat Pulldown[1-16] / ...acc / 80lb
Lateral Raise[1-16] / ...acc / 15lb / warmup: none

## Deadlift Day
Deadlift[1-16] / ...main
Face Pull[1-16] / ...acc / 30lb
Bicep Curl, Barbell[1-16] / ...acc / 45lb

# Week 2 - 10s Intensification
## Squat Day
main / 1x5 50%, 1x3 54%, 2x10, 1x10+ / 61% / 150s
acc / 3x10
## Bench Day
## OHP Day
## Deadlift Day

# Week 3 - 10s Realization
## Squat Day
main / 1x5 45%, 1x3 54%, 1x1 63%, 1x10+ / 68% / 180s
acc / 2x10
## Bench Day
## OHP Day
## Deadlift Day

# Week 4 - 10s Deload
## Squat Day
main / 1x5 36%, 1x5 45%, 1x5 54% / progress: none
acc / 2x10
## Bench Day
## OHP Day
## Deadlift Day

# Week 5 - 8s Accumulation
## Squat Day
main / 4x8, 1x8+ / 59% / 150s
acc / 3x8
## Bench Day
## OHP Day
## Deadlift Day

# Week 6 - 8s Intensification
## Squat Day
main / 1x3 54%, 1x3 59%, 1x2 63%, 1x1 68%, 2x8, 1x8+ / 65% / 150s
acc / 3x8
## Bench Day
## OHP Day
## Deadlift Day

# Week 7 - 8s Realization
## Squat Day
main / 1x5 45%, 1x3 54%, 1x2 63%, 1x1 68%, 1x8+ / 72% / 180s
acc / 2x8
## Bench Day
## OHP Day
## Deadlift Day

# Week 8 - 8s Deload
## Squat Day
main / 1x5 36%, 1x5 45%, 1x5 54% / progress: none
acc / 2x8
## Bench Day
## OHP Day
## Deadlift Day

# Week 9 - 5s Accumulation
## Squat Day
main / 5x5, 1x5+ / 63% / 180s
acc / 3x8
## Bench Day
## OHP Day
## Deadlift Day

# Week 10 - 5s Intensification
## Squat Day
main / 1x2 59%, 1x2 65%, 1x1 70%, 3x5, 1x5+ / 70% / 180s
acc / 3x8
## Bench Day
## OHP Day
## Deadlift Day

# Week 11 - 5s Realization
## Squat Day
main / 1x5 45%, 1x3 54%, 1x2 63%, 1x1 68%, 1x1 72%, 1x5+ / 77% / 180s
acc / 2x8
## Bench Day
## OHP Day
## Deadlift Day

# Week 12 - 5s Deload
## Squat Day
main / 1x5 36%, 1x5 45%, 1x5 54% / progress: none
acc / 2x8
## Bench Day
## OHP Day
## Deadlift Day

# Week 13 - 3s Accumulation
## Squat Day
main / 6x3, 1x3+ / 68% / 180s
acc / 3x6
## Bench Day
## OHP Day
## Deadlift Day

# Week 14 - 3s Intensification
## Squat Day
main / 1x1 63%, 1x1 70%, 1x1 74%, 4x3, 1x3+ / 74% / 180s
acc / 3x6
## Bench Day
## OHP Day
## Deadlift Day

# Week 15 - 3s Realization
## Squat Day
main / 1x5 45%, 1x3 54%, 1x2 63%, 1x1 68%, 1x1 72%, 1x1 77%, 1x3+ / 81% / 240s
acc / 2x6
## Bench Day
## OHP Day
## Deadlift Day

# Week 16 - 3s Deload
## Squat Day
main / 1x5 36%, 1x5 45%, 1x5 54% / progress: none
acc / 2x6
## Bench Day
## OHP Day
## Deadlift Day
```
