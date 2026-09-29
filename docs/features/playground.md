---
id: playground
title: "Playground"
shortDescription: "Simulate workouts to see how weights, reps and state variables change from week to week. Nothing you do there touches your history, settings or program."
category: "Programs"
order: 50
datePublished: "2026-09-27"
dateModified: "2026-09-28"
screenshots: [playground-day, playground-finished]
---

## Test a program before you train

![The Playground tab on the Program screen](/images/features/playground/playground-day.webp)

Open the **Program** tab and tap **Playground**. It sits next to **Preview** and **Edit**.

The Playground shows every day of the current week, one after another. Each day looks like a workout: a row of exercise thumbnails, and the sets of the selected exercise below. Tap a thumbnail to switch to another exercise.

Everything you do here is ephemeral. It does not change your settings, your workouts or your program. Leave the tab and come back, and the Playground starts from the program as it is now.

## Complete sets and change reps

![All Bench Press sets completed, with the coming weight change listed under the sets](/images/features/playground/playground-completed.webp)

Sets work the same way as on the workout screen:

- Tap the check on a set to complete it.
- Type a different number in the reps or weight field to log a set that did not go to plan.
- Long press a set to open the set editor and change its target.
- Tap **Add Warmup Set** or **Add Set** to add sets.
- An AMRAP set asks for the reps in a popup, like in a real workout.

The check icon at the top right of the exercise card completes every set of that exercise, warmups included, in one tap.

No rest timer runs in the Playground. A timed set has no get-ready countdown and does not advance on its own. Tap the next set to continue.

Under the sets, the app lists what the progression will do when you finish the day. For a `lp(5lb)` exercise with every set completed, you see **Exercise Changes** with the weight going from 155lb to 160lb. A custom progress script that calls `print()` shows its output there as **Progress Prints**.

## Finish the day and see the next week

![Bench Press after finishing the day, now at the increased weight](/images/features/playground/playground-finished.webp)

Tap **Finish this day** at the bottom of a day. The app runs the finish day scripts of that day, applies the result to the Playground's copy of the program, and rebuilds every day from it. Bench Press now shows 160lb on Upper A.

Repeat this to walk through weeks of training in a minute. Finish the days in order and watch a linear progression climb, or a double progression move from 8 to 12 reps before the weight goes up. See [Progressions](/features/progressions) for how each kind works.

In a program with more than one week, a week bar appears above the days. Tap a week name to move between weeks.

## Change weights and state variables

![The 1 Rep Max and state variables editor for Bench Press](/images/features/playground/playground-variables.webp)

Tap the edit icon at the top right of an exercise card. A sheet opens with:

- **1 Rep Max** for the exercise, used by percentage-based sets like `1x5 60%`.
- **Edit state variables** with every `state.` variable of the exercise, like `increment` for `lp(5lb)`. A variable marked **User Prompted** is one the program asks you for during a workout.

Change a value and tap **Done**. The Playground re-evaluates the program with the new values. Only the Playground sees the change. To change 1RM or state variables for real, use the **Preview** tab, which saves them.

## Start over

There is no reset button. Switch to **Preview** or **Edit** and back to **Playground**, and every day is rebuilt from the saved program. Editing the program in the **Edit** tab also rebuilds the Playground the next time you open it, so you can fix a progress script and try it again right away.

## Playground on a program preview

The program preview screen, which opens when you look at a program before choosing it, has an **Enable Playground** switch. Turn it on to try the program's logic the same way before you start it. See [Built-in programs](/features/built-in-programs) for how to preview a program.
