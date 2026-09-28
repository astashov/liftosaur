---
id: timed-sets
title: "Timed Sets, Intervals and Circuits"
shortDescription: "Time the set itself, not only the rest. Planks, carries, EMOM and Tabata get a countdown, a set clock and a recorded time, with auto-advance between rounds."
category: "Workout"
order: 20
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [timed-sets-get-ready, timed-sets-running]
---

## Writing a timed set

![Plank with 60s|30s sets in the workout](/images/features/timed-sets/timed-sets-set-row.webp)

A plain `90s` after the sets is the rest timer. Put a `|` in it and the left side becomes the set timer, how long the set itself lasts:

```liftoscript
Plank / 3x1 60s|30s / 0lb
```

That is 3 sets of plank, 60 seconds each, then 30 seconds of rest. In the workout, a timed set shows a play button instead of the check mark. Give a bodyweight exercise `0lb`, or the app asks you for the weight when the set ends.

`60s|?` keeps your default rest from **Me → Timers**. See [Liftoscript](/doc/liftoscript) for the full syntax, and [Rest Timer](/features/rest-timer) for how the rest side works.

## Starting the set

![The Get Ready countdown before a timed set](/images/features/timed-sets/timed-sets-get-ready.webp)

Tap the play button. The app opens a **Get Ready** countdown, 5 seconds by default. The phone vibrates on each of the last 5 seconds if **Vibration** is on in **Me → Settings**.

- Tap **Start now**, or tap the ring, to skip the countdown.
- Tap **Discard & close** to close the sheet without starting.

## During the set

![The set clock with Stop & record and Log & keep timing](/images/features/timed-sets/timed-sets-running.webp)

When the countdown ends, the set clock starts. The big number is the elapsed time, and the progress bar fills toward the target.

- When the clock reaches the target, the app records the target time and completes the set on its own. The rest timer starts.
- **Stop & record** stops the clock early and records the elapsed time. The rest timer starts.
- **Log 0:12, keep timing** records the elapsed time now but leaves the clock running to the target. The rest starts when the clock ends.
- **Discard & close** closes the clock without recording.

For a set written as `8x1+ 20s|10s`, the app asks for the reps you did when the clock ends, like any AMRAP set.

## After the set

![The recorded time in the set row](/images/features/timed-sets/timed-sets-recorded.webp)

The recorded time appears in the set row under **Time**.

## Editing the recorded time

![The Edit recorded time sheet](/images/features/timed-sets/timed-sets-edit-time.webp)

Tap the recorded time in the set row. The **Edit recorded time** sheet takes minutes and seconds. **Save** writes the new time, **Clear** removes it.

## Counting up past the target

![Count up past target in the Edit Target sheet](/images/features/timed-sets/timed-sets-count-up.webp)

Add `+` after the set timer and the clock does not stop at the target. You stop it yourself with **Stop & record**, and the elapsed time is recorded. This is the AMRAP of timers, "hold the plank as long as you can":

```liftoscript
Plank / 2x1 30s|60s, 1x1 30s+|60s
```

You can also set this on one set during a workout. Tap the pencil on the set, then **Edit Target**. **Enable Set Timer?** adds a set timer, and the **Count up past target?** switch in the keypad adds the `+`.

In `progress` and `update` blocks, the target is `setTime` and the recorded time is `completedSetTime`, for example `setTime[1] = completedSetTime[1] + 5`.

## EMOM, Tabata and circuits with `auto`

Add `auto` and the app opens the next timed set on its own when the rest ends. No tap between rounds.

```liftoscript
// EMOM - 5 rounds, 5 reps, 1-minute window
Power Clean / 5x5 135lb 60s|0s auto

// Tabata - 8 rounds of 20s work, 10s rest, record reps
Squat, Bodyweight / 8x1+ 20s|10s auto
```

- With `60s|0s auto` there is no rest and no countdown. The next set's clock starts in the same sheet when the previous one ends.
- With rest, the countdown comes out of the rest, so the round length stays the same. `45s|15s auto` with a 5 second countdown rests 10 seconds, then counts down 5.
- In a superset, `auto` moves to the next exercise in the group, so a circuit of Crunch, Hollow Hold, Crunch runs on its own.

## Changing the countdown

![Me → Timers, the Get ready setting](/images/features/timed-sets/timed-sets-timers.webp)

Go to **Me → Timers**. Under **Timed sets**, **Get ready** is the countdown length in seconds. Default 5. Set it to 0 to start the clock on the first tap.

## Unilateral exercises: two clocks

For a unilateral exercise, like Bulgarian Split Squat, Lunge, Step Up or a dumbbell Bicep Curl, one timed set runs two clocks. The sheet shows **Left side** first. When you stop it, a countdown starts and then the **Right side** clock runs. The set row records both as **L** and **R**, and the **Edit recorded time** sheet has a row for each side.

Whether an exercise is unilateral comes from the **Is Unilateral** checkbox on its Exercise Stats screen.

## Lock screen and Apple Watch

With Premium, the countdown and the set clock also run in the **Live Activity** on the iOS lock screen and in the Dynamic Island, in the **Live Update** on Android, and on the Apple Watch, with buttons to stop and record the set from there.
