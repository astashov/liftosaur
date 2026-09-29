---
id: progressions
title: "Progressions and State"
shortDescription: "Tell the app how to add weight or reps over time. Pick a built-in linear, double or sum-of-reps progression, or write your own script with state variables."
category: "Programs"
order: 40
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [progressions-preview, progressions-linear-settings]
---

## How progressions work

![Exercise Changes under the finished sets of Bench Press](/images/features/progressions/progressions-preview.webp)

A progression is a rule on one exercise in your program. It runs when you finish the workout and rewrites the program text. Write it with `progress:` after the sets:

```liftoscript
Bench Press / 3x5 / 155lb / progress: lp(5lb)
```

Complete all three sets of five, and after you finish the workout the line reads `160lb`. Miss a rep, and it stays at `155lb`.

You write it once per exercise. The app applies it on every day and week where that exercise appears. Write `progress: none` on a deload day to skip it there.

Complete all working sets of an exercise, and the app shows what the rule will do under the sets. **Exercise Changes** lists the new weights or reps. **State Variables changes** lists the values the script remembers.

## Adding weight after a good session

![Bench Press in the exercise editor with progress: lp(5lb)](/images/features/progressions/progressions-linear-settings.webp)

Linear progression (`lp`) adds a fixed weight after you complete every set and rep:

```liftoscript
Squat / 3x8 / progress: lp(5lb, 2)
Squat / 3x8 / progress: lp(5lb, 2, 0, 10lb, 3)
```

The second number is how many good sessions you need. The fourth and fifth are the weight to drop and how many failed sessions it takes. The app adds the increment to the weight you lifted, so a weight you changed during the workout carries over.

To edit it in the app, tap the cog on the exercise during a workout and pick **Edit Program Exercise**. The exercise line opens in the Liftoscript editor sheet. Change the `progress:` part of the line and tap **Save**, and the program is updated.

## Adding reps first, then weight

Double progression (`dp`) grows the reps inside a range, then adds weight and resets the reps:

```liftoscript
Bent Over Row / 3x8-12 / 115lb / progress: dp(5lb, 8, 12)
```

With `3x8-12` the range narrows from below until you hit 12 on every set, then the weight goes up. With plain `3x8` the reps climb from 8 to 12 one session at a time. In the app the section shows **Increase weight by** and **Reps range**.

Sum of reps (`sum`) adds weight when the reps of all sets add up to a number:

```liftoscript
Bench Press / 3x10+ / progress: sum(30, 5lb)
```

## Writing your own rule

`progress: custom()` runs a script between `{~` and `~}`. It reads what you did and writes new values into the program:

```liftoscript
Overhead Press / 3x5+ / 85lb / progress: custom(increment: 5lb) {~
  if (completedReps[ns] >= 8) {
    weights += state.increment
  } else if (completedReps[ns] < 5) {
    weights -= state.increment
  }
~}
```

`completedReps[ns]` is the reps of the last set. `weights += 5lb` changes every set, `weights[2] += 5lb` only set two. You can also assign `reps`, `minReps`, `RPE`, `timers`, `numberOfSets`, and `rm1`.

In the app, pick **Custom** in the **Progress** picker and tap **Edit Script**. The **Progress Script** editor checks the script as you type and disables **Save** on an error. Reuse another exercise's script with `progress: custom(increment: 10lb) { ...Bench Press }`.

## Remembering values between workouts

![Overhead Press in the exercise editor with custom(increment: 5lb)](/images/features/progressions/progressions-state-variables.webp)

State variables live in the parentheses of `custom()`. The script reads and writes them as `state.name`, and the app saves them in the program text:

```liftoscript
Bench Press / 3x8 / progress: custom(attempt: 0) {~
  if (completedReps >= reps) {
    state.attempt += 1
    if (state.attempt > 3) {
      weights += 5lb
      state.attempt = 0
    }
  }
~}
```

A `+` after the name, as in `custom(shouldBumpWeight+: 0)`, makes the app ask you for the value after the last set.

In the exercise editor, tap **State vars…** on a `custom(...)` line to open the list of variables with their current values. Change a value there, and the app writes it back into the program text.

## Changing sets during the workout

`update: custom()` runs before the first set and after every set you complete. It changes the sets of the current workout only. `setIndex` is the set you just tapped, 0 on the first run:

```liftoscript
Bench Press / 3x8 / update: custom() {~
  if (setIndex == 1 && completedReps[1] >= reps[1]) {
    numberOfSets = 4
  }
~}
```

Completed sets never change. Turn the section on from the 3-dot menu of **Edit Program Exercise** with **Enable Update**.

## Skipping the progression once

![Exercise Changes with the Suppress link](/images/features/progressions/progressions-preview.webp) ![The changes struck through after Suppress, with Enable](/images/features/progressions/progressions-suppressed.webp)

Tap **Suppress** under the preview to keep the program as it is after this workout. The listed changes get a line through them. Tap **Enable** to turn the rule back on.

## Rounded weights in the workout

A progression writes exact weights into the program. When the increment is not a weight your plates can make, like `2.5lb` with only 5 lb plates, the program soon holds a weight like `162.5lb` that you cannot load. Percentages of your 1RM do the same: `70%` of a 235 lb max is 164.5 lb. In the workout, the app rounds such a weight to what you can load and underlines it. Tap the set to expand it, then tap the underlined weight. The **Why is the weight adjusted?** sheet shows the program's weight, the 1RM math for a percentage, and the bar and plates it used. See [Logging a Workout](/features/workout-screen) for the sheet.

## More tools for scripts

- `bodyweight` is your latest bodyweight from measurements. `weights = bodyweight` in an update script tracks pull-ups. [Equipment, Plates and Gyms](/features/equipment-and-gyms) shows the full setup for weighted and assisted pull-ups.
- Tags let one exercise change another's state. Write `Squat / 3x8 / id: tags(1)`, then `state[1].rating = 10` from another script.
- Progression ladders: `Split Squat | ! Bulgarian Split Squat | Pistol Squat / 3x8 0lb`. `exerciseVariationIndex += 1` moves to the next movement.
- Built-in functions: `floor`, `ceil`, `round`, `sum`, `min`, `max`, `increment`, `decrement`, `roundWeight`, `rpeMultiplier`, `calculate1RM`, `zeroOrGte`, and `print` to show values in the preview.

See [Liftoscript](/doc/liftoscript) for every variable and function.
