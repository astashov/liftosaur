---
id: supersets
title: "Supersets"
shortDescription: "Group two or more exercises, and the workout screen moves to the next one after every set. Set the groups in the program text, the editor or the workout."
category: "Workout"
order: 40
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [supersets-workout, supersets-next-exercise]
---

## How it works

A superset is a group of exercises you do in turn: one set of the first, one set of the second, then back to the first. In Liftosaur, every exercise in the group carries the same group name, like `A`.

On the workout screen, each exercise in a group shows a line **Supersets with:** and the name of the next exercise in the group. The thumbnails at the top get a colored line under them, one color per group. The line is colored for the group you are working on now, and gray for the other groups.

Groups only match within one day. `A` on Monday and `A` on Wednesday are two different groups.

## Move to the next exercise after each set

Complete a working set of an exercise in a group. The workout screen moves to the next exercise in the group. Complete a set there, and it moves on again, and back to the first one after the last. Warmup sets do not move you.

When an exercise in the group has no sets left, the app skips it and goes to the next one that still has work. When only one exercise has sets left, you stay on it.

Sets are never locked. You can tap any thumbnail to go to any exercise at any time.

## Group exercises during a workout

![Select Superset Group sheet](/images/features/supersets/supersets-picker.webp)

You can build or change groups without touching the program. Tap the exercise name next to **Supersets with:**, or tap the cog on the exercise card and pick **Edit Superset**. The **Select Superset Group** sheet opens with:

- **None** to take the exercise out of its group.
- Each existing group in this workout, with the exercises in it.
- **Create New Group** to name a new group. A name can be any text except the characters `/ { } ( ) # [ ] | !`.

Changes made here apply to this workout only. Your program stays as it was.

## Group exercises in the program editor

![Lateral Raise in the exercise editor with superset: A on its line](/images/features/supersets/supersets-program-editor.webp)

Open an exercise in the program editor, or pick **Edit Program Exercise** from the cog on the workout screen. The exercise line opens in the Liftoscript editor sheet. Tap the **Enable superset** pill to add `/ superset: A` to the line. Change the letter in the text to move the exercise to another group, and delete the `superset:` part to take it out of its group.

## Write it in Liftoscript

![Per-day text editor with superset: A on two lines](/images/features/supersets/supersets-liftoscript.webp)

Add a `superset:` section to each exercise in the group:

```liftoscript
Lateral Raise / 3x12-15 / 15lb / superset: A
Face Pull / 3x15 / 40lb / superset: A
```

The group name after `superset:` can be any string, like `A` or `ChestDay1`. In the text editor, an exercise line without a group offers an **Enable superset** action that inserts ` / superset: A` for you. See [Liftoscript](/doc/liftoscript) for the rest of the syntax.

## Rest between superset exercises

![Me → Timers with the Superset timer set to 15 seconds](/images/features/supersets/supersets-timer.webp)

Go to **Me → Timers** and set **Superset**, in seconds, for example 15. This rest runs after every working set of an exercise in a group, instead of the **Workout** timer. It is empty by default, so groups use the Workout timer until you set it. A per-set rest time in the program text, like `Face Pull / 3x15 180s / superset: A`, takes priority over both. See [Rest Timer](/features/rest-timer) for how the timer works.

## History and program preview

A finished workout in your history draws the same colored line next to each exercise that was in a group. The program preview shows **Supersets with:** under each grouped exercise, so you can check the groups before you start.

## Keep exercises in a fixed order

This is separate from supersets. When a program repeats an exercise across weeks, the app keeps the order of exercises in the day as well as it can. When exercises start repeating on different weeks, that order can become unclear. Write the position in square brackets after the exercise name to fix it:

```liftoscript
Squat[1,1-4] / 3x8
Bench Press[2,1-4] / 3x8
Bicep Curl[3,1-4] / 3x8
```

The first number is the position, the range is the weeks the exercise repeats. `Squat[1]` works for an exercise that does not repeat. In the editor, the day card's three-dot menu has **Enable Forced Order**, which adds a **Forced order:** number field.
