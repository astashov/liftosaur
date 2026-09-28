---
id: liftoscript
title: "Liftoscript"
shortDescription: "Write a program as text: one line per exercise with sets, reps, weight, 1RM percentages and RPE. Split it into weeks and days, and reuse lines."
category: "Programs"
order: 30
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [liftoscript-exercise-sheet, liftoscript-full-program]
---

## Write an exercise as one line

![The exercise sheet with the Bench Press line, pills and a hint](/images/features/liftoscript/liftoscript-exercise-sheet.webp)

Every program in Liftosaur is text. Each exercise is one line. The exercise name comes first, then sections separated by `/`:

```liftoscript
Bench Press / 3x8
```

`3x8` is 3 sets of 8 reps. `3x8-12` is a rep range. Commas join set groups:

```liftoscript
Bench Press / 1x5, 1x3, 1x1, 5x5
```

Add the weight after the reps. It can be lb or kg, or a percentage of your 1RM:

```liftoscript
Bench Press / 3x12 60kg
Bench Press / 3x12 80%
```

Add `@` and a number from 1 to 10 for an RPE target. With no weight, the app looks up the weight from your 1RM, the reps and the RPE:

```liftoscript
Bench Press / 3x12 @8
```

Each set group can have its own weight, percentage or RPE:

```liftoscript
Bench Press / 1x5 @8, 1x3 @9, 1x1 @10, 5x5 50%
```

A value that applies to every set goes in its own section:

```liftoscript
Bench Press / 1x12, 5x5 / 20s 60%
```

With no weight and no RPE, the weight field stays empty in the workout. You type it when you complete the set. To change the equipment, name it after a comma, as in `Bench Press, Dumbbell / 3x5`.

A `+` after the reps makes an AMRAP set. A `+` after the RPE or the weight asks you to log the real value. [Set types](/features/set-types) explains those. `90s` after the reps is the rest time, see [Rest timer](/features/rest-timer). `60s|30s` is a timed set, see [Timed sets](/features/timed-sets). `progress: lp(5lb)` is a progression, see [Progressions](/features/progressions).

## Split the program into weeks and days

![The full program text with week and day headings](/images/features/liftoscript/liftoscript-full-program.webp)

In the full program text, `#` starts a week and `##` starts a day:

```liftoscript
# Week 1
## Day 1
Squat / 5x5 / progress: lp(5lb)

## Day 2
Squat / 3x8

# Week 2
## Day 1
Squat / 5x4
```

A `//` line above an exercise is its description. The workout screen shows it. It takes Markdown. A `///` line is a note for you and never shows in the workout:

```liftoscript
/// Not shown in the workout
// Pause **2 seconds** at the bottom
Squat / 5x5 / progress: lp(5lb)
```

The description carries over to the same exercise in later weeks until you write a new one. An empty `//` line stops that.

A `//` line above `# Week 1` or `## Day 1` describes the week or the day. The week description shows on the Home screen, the day description on the workout screen.

## Repeat, reuse and label exercises

A week range after the name repeats the line on the same day in those weeks:

```liftoscript
Bench Press[1-5] / 3x8
```

The repeated weeks stay empty in the text. `...` reuses the sets, weights, warmups and scripts of another exercise in the current week:

```liftoscript
Bench Press / 5x5 / progress: lp(5lb)
Squat / ...Bench Press
```

`...Bench Press[2]` reuses day 2 of the current week. `...Bench Press[2:1]` reuses week 2, day 1. A section after the reuse overrides that part. `Bench Press / ...Squat / 150lb` keeps the sets of Squat and changes the weight.

`used: none` makes a template. The line never appears in a workout, and the name does not need to be a real exercise:

```liftoscript
t1 / used: none / 1x10+, 3x10 / 70% / progress: lp(5lb)
t1: Bench Press / ...t1
```

A word and a colon before the name is a label. `main: Squat` and `accessory: Squat` are two different exercises, each with its own progression. A name in parentheses after a set group is a set label, up to 8 characters. It shows next to the set in the workout:

```liftoscript
Squat / 4x5 (Main), 1x5+ (AMRAP)
```

[The Liftoscript reference](/doc/liftoscript) covers the rest: warmups, set variations, `update` scripts, state variables and tags.

## Type it in the app

![The per-day text mode with one editor per day](/images/features/liftoscript/liftoscript-per-day.webp)

Tap **Program** in the footer, then **Edit**. The toolbar has four mode buttons. The third shows one text editor per day. An exercise repeated from an earlier week is listed under the editor. The fourth shows the whole program as one text, with the `# Week` and `## Day` headings. [Program editor](/features/program-editor) covers the grid and the UI mode.

On the grid, tap an exercise and then the pencil. A sheet opens with that exercise line. Tap a value like `3x5`, `155lb` or `lp(5lb)`. A hint explains it, such as "Percentage: weight as a % of your 1RM for this exercise." Pills add the next part: **Add weight**, **Add RPE**, **Add rest timer**, **Make rep range**, **Add warmups**, **Reuse…**, **Repeat…**, **Add used: none**, **Add progress** and more.

Double-tap the text to type it as plain text. A suggestion strip on the keyboard offers exercise names, section names and reuse targets. Tap **Apply**, then **Save**.

With a syntax error, the grid, UI and **Save** buttons grey out until the text parses again.

## Try the program before you run it

![The Playground tab with a runnable workout](/images/features/liftoscript/liftoscript-playground.webp)

The **Playground** tab next to **Edit** runs the program without saving anything. Complete sets and see how the reps, weights and sets change for the next workout. [Playground](/features/playground) covers it.
