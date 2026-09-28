---
id: changing-a-workout
title: "Changing Today's Workout"
shortDescription: "Swap, add or remove exercises mid-workout, train without a program, turn an ad-hoc workout into a program day, or edit the program day from the workout."
category: "Workout"
order: 50
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [changing-a-workout-swapped, changing-a-workout-adhoc]
---

## Swap an exercise

![The Swap Exercise picker](/images/features/changing-a-workout/changing-a-workout-swap-picker.webp) ![Incline Bench Press with adjusted weights](/images/features/changing-a-workout/changing-a-workout-swapped.webp)

Tap the cog on the exercise card and pick **Swap Exercise**. The picker has two tabs: **Ad-hoc Exercise** and **From Program**. Pick one exercise and tap **Swap Exercise** at the bottom.

On the **Ad-hoc Exercise** tab, the weights change with the exercise. For each set, the app looks at your history for the new exercise. It takes the completed set closest in reps to the target, and converts its weight to the target reps and RPE. Same reps and RPE give you the weight you lifted last time.

If you never did the new exercise, the app uses your 1RM for it, or the exercise's default starting weight. Percentage weights use the new exercise's 1RM. Sets you already completed keep their numbers.

Warmups are rebuilt for the new exercise, from your program if it defines warmups for it on any day, otherwise from the exercise's defaults.

The **From Program** tab lists every exercise of your current program, by exercise and day. Pick one, and it comes with its sets. Its progression runs when you finish the workout. Exercises already in this workout are greyed out.

A swap changes this workout only. The program stays as it was.

## Repeat a swap

![The Recent section at the top of the picker](/images/features/changing-a-workout/changing-a-workout-swap-recent.webp)

The app remembers the last 5 exercises you swapped to, per exercise. Next time you swap the same exercise, they are in a **Recent** section at the top of the picker. Recent shows while the search field is empty and no filter is on.

## Add an exercise

![The From Program tab when adding exercises](/images/features/changing-a-workout/changing-a-workout-add-from-program.webp) ![Pull Up added at the end of the workout](/images/features/changing-a-workout/changing-a-workout-added.webp)

Tap **+** at the end of the exercise strip at the top. The picker opens as **Add Exercises**. You can select several at once. The button at the bottom says **Add to this workout (2)** with your count.

An ad-hoc exercise arrives with no sets. Tap **Add Set** on its card. Its sets carry an **Ad-hoc** label. An exercise from the **From Program** tab arrives with its sets and runs its progression when you finish.

Added exercises land at the end of the workout. Long-tap a thumbnail in the strip and drag it to move it.

## Remove an exercise

![The confirmation before removing an exercise](/images/features/changing-a-workout/changing-a-workout-remove.webp)

Tap the cog on the card and pick **Remove Exercise**. The app asks "Do you want to remove this exercise in this workout only?". Tap **OK**. The program does not change. If the exercise was in a superset, its partner leaves the superset too.

## Work out without a program

![The picker opens right away for an ad-hoc workout](/images/features/changing-a-workout/changing-a-workout-adhoc-picker.webp) ![An ad-hoc workout with Chest Dip](/images/features/changing-a-workout/changing-a-workout-adhoc.webp)

Finish or delete the ongoing workout. Tap **Workout** in the footer. The **New Workout** sheet opens. Tap **Ad-Hoc Workout**.

The workout starts empty, and the **Add Exercises** picker opens on its own. Pick exercises, tap **Add to this workout**, then **Add Set** on each card. You set the reps and weight yourself.

You can also skip programs from the start. The program choice screen has **Go without program**, and the **Change Next Workout** sheet has **Go without a program**.

## Save an ad-hoc workout as a program day

![The Program day from Adhoc workout sheet](/images/features/changing-a-workout/changing-a-workout-program-day.webp)

Tap **Finish**. When the workout came from no program of yours, the **Congratulations!** screen shows **Create Program Day**. Tap it. The sheet **Program day from Adhoc workout** opens.

- **Create a new program with this workout** starts a new program with this day.
- Or pick a program and tap a day. The app inserts a new day named **Day N** right after it, with the exercises, sets and weights you did. It confirms with "Added to program 'Name', at Day N".

The same **Create Program Day** is in the kebab menu of a past workout, when that workout is not from one of your programs.

## Edit the program from the workout

![The exercise editor opened from the workout](/images/features/changing-a-workout/changing-a-workout-edit-exercise.webp) ![The day editor opened from the workout](/images/features/changing-a-workout/changing-a-workout-edit-day.webp)

Tap the cog on a program exercise and pick **Edit Program Exercise**. A [Liftoscript](/doc/liftoscript) editor sheet opens with that exercise's line, headed by its week and day. Change sets, weights, warmups or progression, and tap **Save**. The program is updated, and the ongoing workout picks up the change.

Tap the kebab at the top and pick **Edit Program Day**. The same editor opens with the whole day. Add, remove or reorder exercises, then tap **Save**. A new exercise appears in the ongoing workout after the exercise it follows in the text.

If you change an exercise that is set up separately on several days, the app asks: **Change only this day** or **Change across whole program**. If you already logged sets for the old exercise, it asks "You've already logged sets for Bench Press in this workout. Switch them to Incline Bench Press too?".

**Edit Program Exercise** is not in the menu of an ad-hoc or swapped exercise.

## Change state variables

Exercises with `progress: custom(...)` keep values between workouts, like `increment: 5lb`. See [Progressions](/features/progressions).

In the exercise editor, tap the `custom(...)` part of the progress. A **State vars…** chip appears above the keyboard. It opens the **State Variables** sheet with every variable and its value. Change a value, add a variable, or delete one that no script uses. Tap **Save** in the editor to write it to the program.

A variable marked **User Prompted** is asked when you complete the last set of the exercise, under **Enter new state variables values**.

Under the sets, the card shows **State Variables changes** when finishing the workout would change a variable. Each line reads `increment: 5lb -> 10lb`, so you see the progression before it happens.
