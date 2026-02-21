---
id: gzcl-ggbb
name: "GZCL: General Gainz - Bodybuilding"
author: Cody Lefever
url: "https://swoleateveryheight.blogspot.com/2022/01/general-gainz-body-building.html"
shortDescription: General Gainz variation for hypertrophy/bodybuilding
isMultiweek: false
tags: []
frequency: 4
age: "more_than_year"
duration: "90+"
goal: "hypertrophy"
---

It's an intermediate/advanced program for hypertrophy, with very flexible progression logic.

Make sure to read [Cody's program description](https://swoleateveryheight.blogspot.com/2022/01/general-gainz-body-building.html) before starting the program!

The program by default contains A days only (so Day 1A, Day 2A, etc) - feel free to change that by using other days exercises from Cody's GGBB post, or just coming up with your own. The weekly volume per muscle group may help you to come up with proper exercises. Note that the program contains TONS of volume, so feel free to adjust if you don't need that much - remove some sets, maybe the last pair of t3 exercises, etc.

The program is supposed to be done in 4 supersets each day, supersetting t2 and t3, so the exercise order is set like that - t2, t3, t2, t3, t2, t3... The weights for T2s will be automatically bumped up once you hit 6 extensions and 10 reps on the first set, and for T3s - once you hit at least 20 on each set.

In the blogpost Cody also recommends tracking effort, in the app it's done by RPE logging. So, **@8** is easy effort, **@9** is medium, **@10** is hard.

Other than that - it's the same old General Gainz with T2s - so all those find,push,hold,extend actions. The app will show the last week sets/reps/RPE etc for the exercise, so based on that you can make a decision what part you'll push and what parts you'll hold this time.



```liftoscript
# Week 1
## Day 1A: Legs & Abs
// **T2**.
// * **Find**: Initially find your 6RM on the first set. After you found your weight for 6RM - update that weight by tapping on the edit icon and setting weight there, and then tap on the first set to complete it.
// * **Extend**: Do the of "halfes" sets (your RM from the first set / 2) so the volume would be double of your RM. E.g. if you did 10RM, do 4 sets x 5 reps (20 total) after. You can extend the number of sets up to 2 extra sets if 10RM was easy.
// * Next time, try to **Push** one of the variables (e.g. reps or number of sets), and **Hold** (i.e. keep the same) other variables.
// * Once you are able to do 10RM with 6 extensions, the weight will be increased next time
t2 / used: none / 1x6-10, 4+x3 / @8+ 10s 85% / update: custom() {~
  if (setIndex == 1) {
    sets(2, 99, floor(completedReps[1] / 2), floor(completedReps[1] / 2), 0, completedWeights[1], 10, RPE[1], 1)
  }
~} / progress: custom(increase: 10lb) {~
  if (numberOfSets == 7 && completedReps >= reps) {
    weights += state.increase
  }
~}

// **T3**
t3 / used: none / 1x15-20, 3x15-20+ / @8+ 120s 50% / progress: lp(5lb)

// ...t2
t2a: Safety Squat Bar Squat, Barbell / ...t2
// ...t3
t3a: Ab Wheel, Bodyweight / ...t3 / progress: none
// ...t2
t2b: Romanian Deadlift, Barbell / ...t2
// ...t3
t3b: Cable Crunch, Cable / ...t3
// ...t2
t2c: Leg Press, Leverage Machine / ...t2
// ...t3
t3c: Seated Leg Curl, Leverage Machine / ...t3
// ...t3
t3d: Standing Calf Raise, Barbell / ...t3
// ...t3
t3e: Cable Twist, Cable / ...t3

## Day 2A - Shoulders
// ...t2
t2a: Behind The Neck Press, Barbell / ...t2
// ...t3
t3a: Reverse Fly, Dumbbell / ...t3
// ...t2
t2b: Incline Bench Press, Barbell / ...t2
// ...t3
t3b: Lateral Raise, Cable / ...t3
// ...t2
t2c: Chest Dip, Bodyweight / ...t2
// ...t3
t3c: Front Raise, Cable / ...t3
// ...t3
t3d: Push Up, Bodyweight / ...t3
// ...t3
t3e: Lateral Raise, Dumbbell / ...t3

## Day 3A - Back
// ...t2
t2a: Clean, Barbell / ...t2
// ...t3
t3a: Pull Up, Bodyweight / ...t3
// ...t2
t2b: Bent Over Row, Barbell / ...t2
// ...t3
t3b: Lat Pulldown, Cable / ...t3
// ...t2
t2c: Seated Row, Cable / ...t2
// ...t3
t3c: Shoulder Press, Dumbbell / ...t3
// ...t3
t3d: Bent Over One Arm Row, Dumbbell / ...t3
// ...t3
t3e: Shrug, Dumbbell / ...t3

## Day 4A - Arms
// ...t2
t2a: Bicep Curl, EZ Bar / ...t2
// ...t3
t3a: Triceps Pushdown, Cable / ...t3
// ...t2
t2b: Triceps Extension, Dumbbell / ...t2
// ...t3
t3b: Bicep Curl, Cable / ...t3
// ...t3
t3c: Bicep Curl, Band / ...t3
// ...t3
t3d: Triceps Extension, Band / ...t3
// ...t3
t3e: Hammer Curl, Dumbbell / ...t3
// ...t3
t3f: Skullcrusher, EZ Bar / ...t3
```
