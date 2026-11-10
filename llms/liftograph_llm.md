# Liftograph Reference

Liftograph is the text format of a Liftosaur dashboard. One dashboard is one Liftograph document. The app draws it on the Graphs tab, top to bottom. A user can have up to 20 dashboards, and each document is at most 64 KB.

Workflow for writing a dashboard:

1. Read this reference.
2. Call `list_exercises` or `list_custom_exercises` if you are unsure of an exercise name. Unknown names are errors.
3. Write the text and call `run_dashboard`. Fix every error it returns. A graph series with `pointCount: 0` has no data for this user, so pick another exercise or source.
4. Save with `create_dashboard`, or `update_dashboard` for an existing one.

## A complete dashboard

```liftograph
// ## Strength
row {
  value / name: Squat e1RM / source: exercise(Squat) / y: e1rm / compare: 4w / trend: 3m
  value / name: Bench e1RM / source: exercise(Bench Press) / y: e1rm / compare: 4w / trend: 3m
}

graph / range: 1y {
  name: Squat / source: exercise(Squat) / y: e1rm / smooth: avg(5)
  name: Deadlift / source: exercise(Deadlift) / y: e1rm / smooth: avg(5)
}

/// A hidden comment. The app never shows it.
row {
  muscles / range: 7d / show: map
  calendar / range: 6m
}
```

## Lines

The document is line-based. Indentation has no meaning. Every line is one of these:

- A widget line. It starts with a kind: `graph`, `value`, `muscles` or `calendar`.
- `row {`, which opens a row. `}` closes it.
- A series line, inside a `graph { }` block.
- A text line, starting with `//`. It is Markdown: `**bold**`, `_italic_`, `## heading`, lists, links.
- A hidden comment, starting with `///`. It is never shown.
- A blank line.

A widget outside a row takes the full width.

Text lines directly above a widget or a `row {`, with no blank line between, become its caption. Text lines followed by a blank line are a text block of their own. Inside a row, a text block takes one column.

## Widget lines

```
<kind> / <key>: <value> / <key>: <value> ...
```

The kind comes first. The other parts are `key: value` pairs separated by `/`, in any order.

Put a value in double quotes when it contains `,`, `/`, `(`, `)`, `:`, `{`, `}` or `"`. Example: a custom exercise named `Row (Chest Supported)` is written `source: exercise("Row (Chest Supported)")`. Structured values such as `exercise(Squat)`, `avg(5)` or `muscleSets(chest)` never take quotes.

A line that ends with `\` continues on the next line.

## Kinds

### graph

A chart with one or more series. Keys on the `graph` line apply to the whole graph. The series go in a `{ }` block, one per line.

- `range:` the window the graph opens with. The default is `all`. The user can switch it with the 1M, 3M, 6M, 1Y and All buttons.

```liftograph
graph / range: 6m {
  name: Weight / source: exercise(Bench Press) / y: maxWeight
  name: e1RM / source: exercise(Bench Press) / y: e1rm
}
```

### value

One big number: its series evaluated today. A value has exactly one series, so the series keys go on the `value` line itself.

- `name:` the label above the number.
- `compare: <duration>` shows today's value minus the value one duration ago, such as "▲ 7.5 kg vs 4w". It can't be `all`.
- `trend: <duration>` draws a small line of the value over that window. It is at most `1y` and can't be `all`.

```liftograph
value / name: Workouts this week / source: workout / smooth: count(7d) / compare: 1w
```

### muscles

Sets per week for each muscle group over a window, as a body map, a list, or both. It has no series.

- `range:` the window. The default is `7d`, and the minimum is `7d`.
- `show:` `map`, `sets`, or `map, sets`. The default is `map, sets`. `sets(chest, lats)` limits the list to those groups, in that order.
- `source:` an optional `workout(program: ..., day: ...)` filter.

```liftograph
muscles / range: 4w / show: map, sets(chest, lats, quadriceps)
```

### calendar

Training days as a grid, one square per day. A coloured square is a day with a finished workout. It shows the current week streak.

- `range:` how many days to draw. The default is `3m`.

```liftograph
calendar / range: 6m
```

## Rows

`row { ... }` puts 1 to 4 items side by side, with equal widths. Each kind needs a minimum share of the row:

- `value` and text: 1/4. Up to 4 per row.
- `graph`, `muscles` and `calendar`: 1/2. Up to 2 per row.

A full-width graph reads best. Put `value` widgets in rows of 2 to 4.

## Series

A series is the data behind one line of a graph or one `value`:

```
name: Squat / source: exercise(Squat) / y: e1rm / group: max(1w) / smooth: avg(4w)
```

### Sources

`source:` picks the rows the series reads.

- `exercise(<name>)` gives one row per logged exercise entry. Add equipment as a second word: `exercise(Squat, Barbell)`. Without it, the exercise's default equipment applies.
- `exercise(<name>, label: T1)` keeps entries of the program exercise labelled T1, as in `t1: Squat / 3x5`.
- `exercise(<name>, program: "5/3/1", day: 2)` keeps entries from that program, and from that day.
- `exercise` alone means every exercise entry.
- `workout` gives one row per logged workout. It takes `program:` and `day:` filters: `workout(program: GZCLP)`.
- `stats(<key>)` gives one row per measurement.

Stats keys:

- Body weight: `weight`.
- Body fat: `bodyfat`.
- Lengths: `neck`, `shoulders`, `bicepLeft`, `bicepRight`, `forearmLeft`, `forearmRight`, `chest`, `waist`, `hips`, `thighLeft`, `thighRight`, `calfLeft`, `calfRight`.
- Imported from Apple Health or Health Connect: `sleep` (hours), `calories` (kcal), `protein` (g).

Exercise names must match the user's exercises. The names are the built-in names from `list_exercises`, or the user's custom exercises.

### y: presets

`y:` picks the value per row. It takes a preset name only:

- `maxWeight` (exercise): the heaviest completed weight. This is the default for `exercise`.
- `e1rm` (exercise): the best estimated 1RM of the entry.
- `volume` (exercise, workout): weight times reps. This is the default for `workout`.
- `maxReps` (exercise): the most reps in one set.
- `muscleSets(<group>)` (workout): sets for one muscle group.
- `muscleVolume(<group>)` (workout): volume for one muscle group.
- `duration` (workout): minutes.
- `value` (stats): the measurement. This is the default for `stats`.

Muscle groups for `muscleSets`, `muscleVolume` and `muscles / show: sets(...)`: `chest`, `lats`, `upperBack`, `frontDelts`, `sideDelts`, `rearDelts`, `biceps`, `triceps`, `quadriceps`, `hamstrings`, `glutes`, `calves`, `abs`, `upperTraps`, `lowerBack`, `neck`, `rotatorCuff`, `forearmFlexors`, `forearmExtensors`, `obliques`, `hipFlexors`, `abductors`, `adductors`. A user can also have custom muscle groups. `muscleSets(total)` and `muscleVolume(total)` count every group together. `total` is not allowed in `show: sets(...)`.

A muscle preset counts one point per workout, so it almost always needs `group: sum(1w)`.

### Shaping

The steps run in order: the value per row, then `group`, then `smooth`.

- `group: <agg>(<duration>)` collapses the points in each time bucket into one point. `agg` is `max`, `min`, `sum`, `avg`, `last` or `count`. `1w` buckets start on the user's first day of the week, and `1m` buckets are calendar months. A bucket plots at its start.
- `smooth: <agg>(<window>)` replaces each point with an aggregate of a trailing window and keeps every point. `agg` is `avg`, `sum`, `count`, `max` or `min`. The window is a number of points, such as `avg(5)`, or a duration, such as `avg(30d)`.
- `count` counts points. `group: count(1w)` on `workout` gives workouts per week.

### Display keys

- `name:` the legend name.
- `mark:` `line`, `bars` or `dots`. The default is `line`. Bars always start at 0.
- `axis:` `left` or `right`. Use `right` for a series with a different unit or size, such as bodyweight next to a lift.
- `color:` `red`, `blue`, `green`, `orange`, `purple` or `gray`.

## Durations

A duration is `<n>d`, `<n>w`, `<n>m` or `<n>y`, for days, weeks, months and years. `all` means the whole history. In `range:`, `compare:`, `trend:` and `smooth:` it is a trailing window that ends today. In `group:` it is a calendar bucket.

Limits:

- `range:` takes any duration or `all`.
- `compare:` and `smooth:` take up to `10y`, and never `all`.
- `trend:` takes up to `1y`, and never `all`.
- `muscles / range:` is at least `7d`.

## Scripts

When no preset fits, a series can end with a Liftoscript script in `{~ ~}`. The script runs once per row, oldest first, and adds points with `point(y)`. A run that never calls `point()` adds no point, so an `if` around `point()` filters rows.

```liftograph
graph {
  name: Hard sets / source: exercise(Squat) / group: sum(1w) / mark: bars {~
    var.hard = 0
    for (var.i in completedRPE) {
      if (completedRPE[var.i] >= 8) { var.hard += 1 }
    }
    point(var.hard)
  ~}
}
```

- `var.*` variables reset at every row. `state.*` variables keep their value from row to row and start at 0.
- `point(x, y)` puts a number on the x-axis instead of a date. All series in one graph must use the same form. With numeric x, `group:` takes no duration, as in `group: max`, and `smooth:` takes a number of points.
- Functions: `max`, `min`, `sum`, `avg`, `count`, `floor`, `ceil`, `round`, `calculate1RM(weight, reps)`, `rpeMultiplier`.

Names in an `exercise` row:

- `completedWeights`, `weights`, `e1rm`: weight per set.
- `completedReps`, `reps`, `minReps`, `completedRPE`, `RPE`: per set.
- `numberOfSets`, `completedNumberOfSets`, `volume`, `bodyweight`, `rm1`.
- `day`, `week`, `dayInWeek`: the program position of the workout.
- `exercise`: the entry's name as text. `isExercise("Squat")` and `isProgramExercise("t1: Squat")` test it.
- `programState("rm1")`: a program state variable saved with the entry.

A `workout` row has the same per-set names over every set of the workout, plus `duration` (minutes), `exercises` (count), `muscleSets("chest")`, `muscleVolume("chest")`, `isSetExercise(i, "Squat")` and `isSetProgramExercise(i, "t1: Squat")`.

A `stats` row has `value` and `bodyweight`.

Missing data is a gap, never 0. A `point()` call with a gap adds no point. Arithmetic with a gap gives a gap. `bodyweight` is a gap before the first weigh-in.

## Example dashboards

### Powerlifting

```liftograph
// ## Big three
row {
  value / name: Squat / source: exercise(Squat) / y: e1rm / compare: 4w / trend: 3m
  value / name: Bench / source: exercise(Bench Press) / y: e1rm / compare: 4w / trend: 3m
  value / name: Deadlift / source: exercise(Deadlift) / y: e1rm / compare: 4w / trend: 3m
}

graph / range: 1y {
  name: Squat / source: exercise(Squat) / y: e1rm / group: max(1w)
  name: Bench / source: exercise(Bench Press) / y: e1rm / group: max(1w)
  name: Deadlift / source: exercise(Deadlift) / y: e1rm / group: max(1w)
}

// **Relative strength**
graph {
  name: "Squat / BW" / source: exercise(Squat) / smooth: avg(5) {~ point(max(e1rm) / bodyweight) ~}
}
```

### Hypertrophy

```liftograph
// ## Weekly sets
graph / range: 6m {
  name: Chest / source: workout / y: muscleSets(chest) / group: sum(1w)
  name: Back / source: workout / y: muscleSets(lats) / group: sum(1w)
  name: Quads / source: workout / y: muscleSets(quadriceps) / group: sum(1w)
}

row {
  muscles / range: 7d / show: map
  calendar / range: 3m
}

graph / range: 6m {
  name: Volume / source: workout / y: volume / group: sum(1w) / mark: bars
}
```

### Body composition

```liftograph
row {
  value / name: Bodyweight / source: stats(weight) / smooth: avg(7d) / compare: 4w / trend: 3m
  value / name: Waist / source: stats(waist) / compare: 4w
}

graph / range: 6m {
  name: Weight / source: stats(weight)
  name: 7-day average / source: stats(weight) / smooth: avg(7d)
}

graph / range: 3m {
  name: Protein / source: stats(protein) / group: avg(1w) / mark: bars
  name: Bodyweight / source: stats(weight) / group: avg(1w) / axis: right
}
```

### Consistency

```liftograph
row {
  value / name: Workouts this week / source: workout / smooth: count(7d) / compare: 1w
  value / name: Minutes this week / source: workout / y: duration / smooth: sum(7d) / compare: 1w
}

calendar / range: 6m

graph / range: 6m {
  name: Workouts per week / source: workout / group: count(1w) / mark: bars
  name: Sleep / source: stats(sleep) / group: avg(1w) / axis: right
}
```

### A program's T1 lifts against T2

```liftograph
graph / range: 1y {
  name: T1 / source: exercise(Squat, label: T1) / y: maxWeight
  name: T2 / source: exercise(Squat, label: T2) / y: maxWeight
}
```

### Rep maxes

```liftograph
// **Squat: best weight per rep count, last 12 months**
graph / range: 1y {
  name: Squat / source: exercise(Squat) / group: max {~
    for (var.i in completedReps) { point(completedReps[var.i], completedWeights[var.i]) }
  ~}
}
```

## Errors

`run_dashboard`, `create_dashboard` and `update_dashboard` report errors with a line and a column. Common ones:

- `Unknown exercise 'X'`: the name is not one of the user's exercises.
- `Unknown stat 'X'`: use a key from the stats list.
- `Unknown key 'X'`: a typo, or a key this kind does not take.
- A preset with the wrong source, such as `source: stats(weight) / y: e1rm`.
- `A row holds at most 4 items`, or a widget too wide for its slot.
