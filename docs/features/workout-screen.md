---
id: workout-screen
title: "Logging a Workout"
shortDescription: "Tap the checkmark to complete a set. See big reps and weight fields, plates per side, and your last and best results. Swipe between exercises, then finish."
category: "Workout"
order: 5
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [workout-screen-overview, workout-screen-next-set]
---

## Complete a set

Go to **Workout** and tap the next day of your program.

The next set is expanded. It has big **Reps** and **Weight** fields and a big checkmark. Tap the checkmark to complete the set. The phone vibrates once, and the [rest timer](/features/rest-timer) starts.

Under the fields, the expanded set shows:

- The plates to load per side, as a bar and a list. Free accounts see a **See plates for each side** link instead.
- **Last**, **Best** and **Same day** results for this set, each with its date. An AMRAP set shows **Best AMRAP**. **Same day** appears only in multi-week programs.

Sets that end in `+` ask a question after the tap. `5+` asks for reps, `?+` asks for weight, `@8+` asks for RPE.

## Change reps, weight and RPE

![The keypad with + and - on the reps field](/images/features/workout-screen/workout-screen-keypad.webp)

Tap a **Reps** or **Weight** field. A keypad opens with digits, **+**, **-**, backspace and a close button. On the weight field, **+** and **-** step by the smallest weight your equipment can load. On reps they step by 1.

The RPE column shows the RPE you logged after a `@8+` set, as `@8`.

## Change what a set asks for

![The Edit Set Target sheet](/images/features/workout-screen/workout-screen-edit-target.webp)

Tap the pencil icon on the expanded set and pick **Edit Target**. The **Edit Set Target** sheet has **Min** and **Max** reps, an **AMRAP?** switch, the target **Weight** with an **Ask?** switch, and switches for **Enable RPE?**, **Enable Set Timer?** and **Enable Custom Rest Timer?**. The change applies to this workout only. **Delete Set** in the same menu removes the set.

## Add sets, expand and collapse

Tap a set row to expand it. Tap it again to collapse it. After you complete the expanded set, the next unfinished set expands. If you collapsed a set yourself, the sets stay collapsed after that.

**Add Warmup Set** and **Add Set** under the sets add one row each. **Add Set** copies the last set of the exercise, or the last set from your previous workout when there are none.

## See plates, the rounded weight, and estimated 1RM

![The e1RM column](/images/features/workout-screen/workout-screen-e1rm.webp) ![Why is the weight adjusted? sheet for a 212 lb target rounded to 210 lb](/images/features/workout-screen/workout-screen-rounding.webp)

The second column header is **Target**. Tap it to cycle: **Target**, **Previous Set**, **Plates**, **e1RM**. **Plates** needs Premium and equipment set for the exercise. **e1RM** is the estimated one rep max for each set: the set's weight divided by the share of 1RM that the RPE chart gives for its reps at its RPE, with RPE 10 assumed when none is logged.

When the program's weight does not match your plates, the target shows the exact weight crossed out like ~~212lb~~ and the rounded weight underlined, 210lb. Tap the underlined weight. A sheet titled **Why is the weight adjusted?** explains the percentage of your 1RM, the kg to lb conversion, the bar weight, the plates per side, or the closest fixed dumbbell.

## Move between exercises

Swipe left or right to move between exercises, or tap a thumbnail in the strip at the top. Each thumbnail shows completed sets over total, like `2/5`, and a check when the exercise is done. Exercises in a superset share a colored line under their thumbnails. Long-tap a thumbnail and drag it to reorder.

![The exercise menu](/images/features/workout-screen/workout-screen-exercise-menu.webp)

The cog on the exercise card opens a menu letting you to edit program exercise, swap exercise for this workout only, etc.

The card header has **Equipment** and, when the program uses percentages, **1RM**. Tap either value to change it.

## Notes and descriptions

![Exercise notes on the card](/images/features/workout-screen/workout-screen-exercise-notes.webp)

Tap the cog, then **Show Exercise Notes**. A text field appears: "Add workout notes for this exercise here...". Next time, the card shows it as **Previous Note** with its date, for two months. The card also shows the exercise description from the program and the notes from its stats screen.

For notes on the whole workout, tap the kebab at the top and pick **Show Workout Notes**.

## Past history, graphs and PRs

![Graph and personal records under the sets](/images/features/workout-screen/workout-screen-history.webp)

Scroll below the sets. The graph shows your weights over time for this exercise, after two or more past workouts. It needs Premium. **Hide Graphs and PRs** hides this block.

**Personal Records** lists **Max Weight** and **Max 1RM** with their dates. **Max 1RM** is an estimate (e1RM), not a lift you did. The app takes the weight of a set and divides it by the share of your 1RM that the RPE chart gives for that many reps at that RPE. A set without a logged RPE counts as RPE 10, so 5 reps at 200 lb become 200 lb ÷ 0.865 ≈ 231 lb. The chart follows the OpenPowerlifting RPE calculator. Under the records is every past workout of this exercise.

## Muscles worked today

Tap the kebab at the top and pick **Day Muscles**. The **Muscles Map** screen opens for the program day: **Strength** and **Hypertrophy** tabs, a front and back body drawing, and **Muscles used, relatively to each other** with percentages.

## Pause and keep the screen on

The header shows the workout time with a blinking colon. Tap the pause icon next to it to pause, and the play icon to resume.

To stop the phone from locking, go to **Me → Settings** and turn on **Always On Display**. The screen stays on while the app is open.

## Finish the workout

![The summary after finishing, with totals, sets per muscle group and a new record](/images/features/workout-screen/workout-screen-summary.webp)

Tap **Finish** in the top right. If some sets are not completed, the app asks "Are you sure you want to FINISH this workout? Some sets are not marked as completed." Then the progress scripts run and update the program. If you enabled it in the Health settings, the workout goes to Apple Health or Google Health.

The **Congratulations!** screen shows **Totals**: time, volume, sets and reps. Below are **Exercises** with their sets, **Sets per muscle group**, new personal records, and share buttons. **Continue** takes you back to Home.
