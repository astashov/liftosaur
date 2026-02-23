---
id: arnoldgoldensix
name: "Arnold's Golden Six"
author: Arnold Schwarzenegger
url: "https://liftvault.com/programs/bodybuilding/arnold-schwarzenegger-workout-routine-golden-six/"
shortDescription: Arnold Schwarzenegger’s 3 day beginner hypertrophy program
isMultiweek: true
tags: []
frequency: 3
age: "3_to_12_months"
duration: "60-90"
goal: "hypertrophy"
---

Very simple hypertrophy program - just 6 exercises repeated each day, with progression if you hit 13+ reps on last set.

Choose starting weights and set them to the `weight` variable. Tend to go on the light side - autoprogression will balance it soon anyway

<!-- more -->

Arnold Schwarzenegger's Golden Six routine is a classic full-body hypertrophy workout that was popularized by the legendary bodybuilder and actor during the early stages of his career. This program is often recommended for beginners - it's very simple, contains compound exercises, and provides enough volume and frequency for beginners. It's also pretty short - only takes about an hour to finish the workout.

Intermediate / advanced lifters would benefit more from other hypertrophy programs that provide more volume and exercise selection, like 5/3/1 Boring But Big, Dr. Swole Upper Lower program, etc.

The program is very simple - it's just 6 exercises repeated per day, 3 days a week, on alternate days.

1. [{Squat}]: 4 sets of 10 reps. Squats are fundamental for building strength in the lower body and core.
2. [{Bench Press Wide Grip}]: 3 sets of 10 reps. This exercise targets the chest, shoulders, and triceps, with an emphasis on the chest. The wide grip is specifically good for working the pectoral muscles.
3. [{Chin Up}]: AMRAP (as many reps as possible). If you can't do any of these, consider using an assisted chin-up machine or do negative chin-ups to start. These primarily work your back and biceps.
4. [{Behind The Neck Press}]: 4 sets of 10 reps. This exercise targets the shoulders and triceps. Be careful with the 'behind-the-neck' part, it can be tough on the shoulders if done improperly. If it feels uncomfortable, a traditional overhead press to the front is a good alternative.
5. [{Bicep Curl}]: 3 sets of 10 reps. This exercise primarily targets the biceps. Be sure to keep your elbows still throughout the curl to ensure proper muscle engagement. If it feels uncomfortable, a dumbbell curl might be a good alternative.
6. [{Crunch}]: AMRAP (as many reps as possible). This is a good exercise to develop your core.

For progression, you do the last set as AMRAP - as many reps as possible. For [{Chin Up}] and [{Crunch}], next time you'll have to do at least as many as you were able to do this time + one more rep. And for the rest of the exercises, if you've achieved at least 13 reps, you should increase your weight by 5lb or 2.5kg in your next workout.

<!-- faq -->

### Is Arnold's Golden Six good for beginners?

Yes, Arnold's Golden Six is one of the simplest beginner hypertrophy programs available. It has only 6 exercises repeated each session, 3 days per week. The straightforward structure lets you focus on learning the movements and building a training habit without overthinking programming.

### How many days a week is Arnold's Golden Six?

Arnold's Golden Six is a 3-day program trained on alternate days, such as Monday/Wednesday/Friday. Each session uses the same 6 exercises, so there's nothing to memorize or alternate between.

### How does progression work on Arnold's Golden Six?

The last set of each exercise is AMRAP (as many reps as possible). For barbell exercises, if you hit 13 or more reps on that AMRAP set, you increase the weight by 5lb next session. For chin-ups and crunches, you simply aim to beat your previous rep count by at least one rep each session.

### How long should I run Arnold's Golden Six?

Run it for 3-6 months or until you stop making consistent progress and feel you need more exercise variety and volume. At that point, transition to an intermediate hypertrophy program with a proper split structure like PHUL or 5/3/1 Boring But Big.

### Can I substitute exercises in Arnold's Golden Six?

Yes. Behind The Neck Press can be swapped for a standard Overhead Press if it bothers your shoulders. Wide Grip Bench Press can be replaced with regular Bench Press. If you can't do chin-ups, use an assisted chin-up machine or do lat pulldowns instead.

### Is Arnold's Golden Six enough for building muscle?

For beginners, yes. The program provides sufficient volume and frequency across all major muscle groups with compound movements. Intermediate or advanced lifters will likely need more volume, exercise variety, and progressive overload strategies than this program offers.

```liftoscript
# Week 1
## Day 1
Squat / 3x10, 1x10+ / progress: custom() {~
  if (
    completedReps >= reps &&
    completedReps[numberOfSets] >= reps[numberOfSets] + 3
  ) {
    weights += 5lb
  }
~}
Bench Press Wide Grip / 2x10, 1x10+ / progress: custom() { ...Squat }
Chin Up / 3x1+ / 0lb / warmup: none / progress: custom(weight: 0lb, reps: 1) {~
  if (completedReps >= reps) {
    reps = completedReps[ns] + 1
  }
~}
Overhead Press / 4x10 / warmup: 1x5 50%
Bicep Curl / 3x10 / warmup: none
Crunch / 3x1+ / 60s / warmup: none
```
