---
id: program-editor
title: "Program Editor"
shortDescription: "Build a program on a calendar grid, in a per-day UI, or as Liftoscript text. Edit sets, reps, weight, RPE and timers, and go back to any earlier version."
category: "Programs"
order: 20
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [program-editor-grid, program-editor-exercise-sheet]
---

## Open the editor

Tap **Program** in the footer, then the **Edit** tab. The header shows the program name, the number of weeks, days and exercises, and the average workout time. **Next Day** sets where the next workout starts.

The toolbar has undo, redo, four mode buttons and **Save**. The modes are the grid, the per-day UI, per-day text and full-program text. All four edit the same Liftoscript text. **Save** writes the program.

## Lay out weeks and days on the grid

![The grid with an exercise selected and the action dock at the bottom](/images/features/program-editor/program-editor-grid.webp)

The grid is the default mode. Weeks are columns, days are rows, and every exercise is a strip. An exercise that repeats across weeks is one strip crossing those weeks.

- Long-press an exercise and drag it to reorder it, or to move it to another day.
- Long-press a day name and drag it. The day moves in every week, so a multi-week program keeps its layout.
- Long-press a week name and drag it to reorder the weeks.
- Drag the end of a strip into more weeks. The app rewrites the repeat range.
- Pinch to zoom the weeks, in the iOS and Android apps.

Tap an exercise, a day name or a week name to select it. A dock appears above the footer. The pencil opens the editor for an exercise, or **Edit day** and **Edit week** for a name and a description. The three-dot menu duplicates, swaps or deletes an exercise, duplicates or deletes a day or a week, and opens **Exercise stats**, **Day stats** or **Week stats**.

**+ Exercise**, **+ Day** and **+ Week** add new ones.

## Edit sets, reps, weight, RPE and timers

![The Liftoscript editor sheet for Bench Press](/images/features/program-editor/program-editor-exercise-sheet.webp)

Tap the pencil on an exercise. A bottom sheet opens with the exercise line in Liftoscript. Tap a value, like `3x5` or `155lb`, to get a hint and a row of pills. Swipe to move between values.

The pills add the parts of a set: **Add weight**, **Add RPE**, **Add rest timer**, **Add set timer**, **Make rep range**, **Add set label**, **Add set variation**, **Add warmups**, **Add label**, **Enable superset**, **Add progress** and **Add update**. Weight takes lb, kg or a percentage of your 1RM. Reps with a `+` are AMRAP. RPE with a `+` asks you to log the real RPE.

Double-tap the text to edit it as plain text. A suggestion strip on the keyboard offers exercise names, equipment variants, reuse targets like `...t1`, section names, progress functions and state variables. Tap **Apply** to fold the text back, then **Save**.

When a line reuses another exercise, the preview icon right of the pills shows the line **With reuses filled in**. Edit a value there, and the original line gets the override.

[Liftoscript](/features/liftoscript) and [the syntax reference](/doc/liftoscript) cover the text form of all of these.

## Name weeks and days, add descriptions

![Edit day with a name and a Markdown description](/images/features/program-editor/program-editor-day-details.webp)

Select a day or a week on the grid and tap **Edit day** or **Edit week**. The sheet has a **Name** field and a Markdown description. The week description shows on the Home screen, the day description on the workout screen.

## Edit one day at a time in the UI mode

![The per-day UI mode with exercise cards](/images/features/program-editor/program-editor-ui-mode.webp)

The second mode button shows one week, with a card per day. A day card has the name, a description, the exercise count and the time. An exercise card shows the warmups, the working sets, the superset group and the progression. Its icons swap the exercise, open its stats, open the editor sheet, or duplicate it.

## Type the program as text

![The per-day text mode](/images/features/program-editor/program-editor-perday-text.webp)

The third mode button shows every day as its own text editor. The fourth shows the whole program as one text, with `# Week 1` and `## Upper A` headings:

```liftoscript
# Week 1
## Upper A
Bench Press / 1x5 60%, 1x3 70%, 3x5 / 155lb / warmup: 1x5 45%, 1x3 65% / progress: lp(5lb)
```

![The full-program text mode](/images/features/program-editor/program-editor-full-text.webp)

Both text modes have the same pills and suggestion strip. A syntax error keeps you on the **Edit** tab and greys out the grid and UI buttons until you fix it.

## Check the sets per muscle group

![Week Stats with the muscle map](/images/features/program-editor/program-editor-week-stats.webp)

Tap the week muscles icon next to the week name in the UI mode, or select a week on the grid and pick **Week stats**. The sheet shows **Total Sets**, **Strength Sets** and **Hypertrophy Sets**, then the sets and the weekly frequency per muscle group. Colors show if you are inside the range set in **Edit Weekly Muscle Range Settings**. A front and back muscle map colors the muscles by volume. Tap a number to see which exercises count towards it.

The day muscles icon, or **Day stats** on the grid, shows one day.

## Go back to an earlier version

Tap the three-dot menu in the top right and pick **Show program versions**. You need to be signed in. Pick a date, read that version's text, and tap **Restore** to load it into the editor.

## Create a new program

![The Create Program sheet](/images/features/program-editor/program-editor-create.webp)

Go to **Me → Program** to reach **Choose a program**. Tap **Create New Program**, enter a **Program Name** and tap **Create**. The new program opens in the editor with one week and one empty day.
