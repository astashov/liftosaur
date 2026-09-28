---
id: set-types
title: "AMRAP, RPE, Ask-Weight and Unilateral Sets"
shortDescription: "Add a + in your program and the app asks what you did: AMRAP reps, RPE, the weight lifted, or a progression value. Unilateral sets track reps per side."
category: "Workout"
order: 30
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [set-types-amrap-popup, set-types-per-side]
---

## How it works

In Liftoscript, a `+` after a value means "ask me when I finish the set". There are four places you can put it:

```
Overhead Press / 3x5+ / 85lb
Romanian Deadlift / 3x8 @8+ / 165lb
Bench Press / 3x8 / 100lb+
Bicep Curl / 3x10 @8 ?+
Squat / 3x5 / progress: custom(shouldBumpWeight+: 0) {~ ... ~}
```

- `5+` is an AMRAP set. The app asks how many reps you did.
- `@8+` asks for your RPE after the set.
- `100lb+` asks for the weight, with 100lb filled in. `?+` asks for the weight with no target at all.
- `shouldBumpWeight+` asks for a state variable value after the last set of the exercise.

Tap the checkmark on such a set and a popup opens instead of completing the set right away. The popup shows only the fields that set needs. Tap **Done** to complete the set. Tap **Cancel** to leave the set as it was. The rest timer starts when you tap **Done**, see [Rest Timer](/features/rest-timer).

## Mark a set as AMRAP

![The Completed reps popup for an AMRAP set](/images/features/set-types/set-types-amrap-popup.webp)

Write `5+` and the set target shows as `5+` on the workout screen. When you tap the checkmark, the popup asks for **Completed reps**. It starts at the target reps. Use the **-** and **+** buttons or type the number.

The number you enter is saved as the completed reps of that set. Progressions read it as `completedReps`. The demo program uses it like this:

```
Overhead Press / 3x5+ / 85lb / progress: custom(increment: 5lb) {~
  if (completedReps[ns] >= 8) {
    weights += state.increment
  } else if (completedReps[ns] < 5) {
    weights -= state.increment
  }
~}
```

Do 8 or more reps on the last set, and the next workout has 90lb. Do fewer than 5, and it drops to 80lb.

A set with a rep range, like `3x8-12+`, works the same way. `+` goes after the top of the range.

## Log your RPE

![The Completed RPE popup](/images/features/set-types/set-types-rpe-popup.webp) ![The logged RPE next to the completed set](/images/features/set-types/set-types-rpe-logged.webp)

`@8` alone sets a target RPE and the app does not ask anything. `@8+` shows the target as `@8+` and asks for your **Completed RPE** when you tap the checkmark. The field goes from 0 to 10 in steps of 0.5, and starts at the target RPE.

After **Done**, the set row shows the RPE you entered next to the set. Progressions read it as `completedRPE`, and the target as `RPE`:

```
Romanian Deadlift / 3x8 @8+ / 165lb / progress: custom() {~
  if (completedRPE[ns] < 8) {
    weights += 10lb
  }
~}
```

## Enter the weight you lifted

Add `+` after a weight, like `100lb+` or `70%+`, and the popup asks for the **Weight** you used. The field starts at the target weight. The **-** and **+** buttons step through the weights your equipment can make. The calculator button opens the rep max calculator.

Write `?+` when you do not want a target weight at all, for example `Bicep Curl / 3x10 @8 ?+`. The target column shows `?+ @8`. A set with no weight in the program, like `Bench Press / 3x12`, asks for the weight too, with no `+` needed.

When one set asks for both weight and RPE, the popup shows both fields.

The entered weight is saved as the completed weight of the set. Progressions read it as `completedWeights`:

```
Bicep Curl / 3x10 @8 ?+ / progress: custom() {~
  weights = increment(completedWeights[1])
~}
```

`increment` returns the next weight your equipment can make.

## Reps per side for unilateral exercises

![Left and right reps fields for Bicep Curl](/images/features/set-types/set-types-per-side.webp)

Built-in one-side exercises, like Bulgarian Split Squat, Lunge, Step Up, Bicep Curl, Hammer Curl, Concentration Curl or Bent Over One Arm Row, track reps per side. Each set row has an **L:** and an **R:** reps field. An AMRAP set on such an exercise asks for **Completed reps (left)** and **Completed reps (right)**.

Volume adds the reps of both sides. The estimated 1RM uses the average of the two sides. Progressions read the right side as `completedReps` and the left side as `completedRepsLeft`.

To change this for an exercise, tap the exercise name on the workout screen to open Exercise Stats, and switch **Is Unilateral**.

## Ask for a state variable

Add `+` after a state variable name in `progress: custom(...)`:

```
Bench Press / 3x8 / progress: custom(shouldBumpWeight+: 0) {~
  if (shouldBumpWeight > 0) {
    weights += 5lb
  }
~}
```

When you complete the last set of the exercise, the popup shows **Enter new state variables values** with one field per such variable. The values go into the state before the progress script runs, so the script above adds 5lb only when you entered 1 or more. Use it for progressions you decide yourself, like RPE or RIR based programs, or to type the next weight by hand.

## Turn the markers on for one set during a workout

Tap a set to expand it, tap its options button, and choose **Edit Target**. The **Edit Set Target** sheet has an **AMRAP?** switch next to reps, an **Ask?** switch next to weight, and a **Log?** switch next to RPE. This changes only the current workout, the program text stays the same.

Scripts can also set them. `amraps`, `logrpes` and `askweights` work like `reps` or `weights`, `1` turns a marker on and `0` turns it off:

```
Squat / 3x8 100lb / progress: custom() {~
  amraps = 1
  askweights[ns] = 1
~}
```

## What changes in the next workout

![The next workout after the AMRAP progression added 5lb](/images/features/set-types/set-types-next-workout.webp)

Nothing changes until you tap **Finish**. Then the app runs the progress script of every exercise with what you entered: `completedReps`, `completedRepsLeft`, `completedRPE`, `completedWeights` and your state variable values. The script updates the program text, and the next workout shows the new weights and reps. The workout itself is saved in history with the reps, RPE and weight you entered. See [Liftoscript](/doc/liftoscript) for the full list of variables.
