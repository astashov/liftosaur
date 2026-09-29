---
id: rest-timer
title: "Rest Timer"
shortDescription: "Starts on its own after every set, using the rest time from your program. Adjust it with one tap, on the lock screen, through headphones or on Apple Watch."
category: "Workout"
order: 10
datePublished: "2026-09-27"
dateModified: "2026-09-28"
screenshots: [rest-timer-collapsed, rest-timer-expanded]
---

## How it works

Complete a set, and the rest timer starts. No extra tap. A small pill appears in the bottom right corner of the workout screen. The big number is how long you have rested so far. The small number is your target rest.

A progress bar fills the pill as you rest. When you reach the target, the pill turns red, and the timer keeps counting so you can see how far past your rest you are.

Tap the pill to expand it. The expanded bar has:

- **-15s** and **+15s** to adjust the target.
- **Trash** to cancel the timer.
- The elapsed and target times. Tap them to collapse the bar again.

If you complete an AMRAP set, or a set that asks for your RPE or weight, the timer starts when you submit that popup, not when you tap the set.

## Where the rest time comes from

Liftosaur picks the rest time for each set in this order. The first match wins.

1. A per-set rest time in your program, like `Bench Press / 5x5 / 90s`.
2. The **Superset** timer, if the exercise is in a superset and you set one.
3. The **Warmup** timer for warmup sets, or the **Workout** timer for working sets.

If the value that wins is empty or 0, no timer runs for that set.

## Changing the defaults

![Me → Timers](/images/features/rest-timer/rest-timer-settings.webp)

Go to **Me → Timers**. You can set, in seconds:

- **Warmup** rest between warmup sets. Default 90.
- **Workout** rest between working sets. Default 180.
- **Superset** rest between exercises in a superset. Empty by default, so supersets use the Workout timer.
- **Get ready** countdown before a timed set. Default 5.

## Rest times in your program

You can write rest times right in the program text, per exercise or per set:

```liftoscript
Bench Press / 5x5 / 90s
Squat / 1x12 60s, 5x5 120s
```

Timed sets use two values, the set duration and the rest after it:

```liftoscript
Plank / 3x1 60s|30s
```

`60s|?` keeps your default rest. `30s+|60s` counts the set up past the target instead of down. Add `auto` to move to the next set on its own when the rest ends, for EMOM or Tabata style work. See [Liftoscript](/doc/liftoscript) for the full syntax.

## Sounds and vibration

![Sound settings on the Me screen](/images/features/rest-timer/rest-timer-sound.webp)

When the rest ends, the app plays a chime and vibrates. Both are in **Me → Settings**, under **Sound**: a **Vibration** toggle and a **Volume** slider. Set volume to 0 for silence. Adding time with +15s arms the chime again for the new target.

## Lock screen, notifications, and headphones

![Rest timer in the Live Activity on the lock screen](/images/features/rest-timer/rest-timer-lock-screen.webp) ![Rest timer in the Dynamic Island](/images/features/rest-timer/rest-timer-dynamic-island.webp) ![Rest timer notification on Android](/images/features/rest-timer/android-rest-timer-live-update.webp)

With Premium, the timer follows you out of the app:

- A notification arrives when the rest is over, with the next set and the plates to load: "It's time for the next set! Next set: Bench Press, 5 × 100lb".
- On iOS, the rest timer runs in the **Live Activity** on the lock screen and in the **Dynamic Island**, with -15s and +15s buttons.
- On Android, the rest timer shows in the **Live Update** chip next to the clock.
- If you wear an Apple Watch and have headphones in, the phone plays the chime through the headphones even while the phone is locked, so you don't need to look at the screen.

## Apple Watch

![Rest timer on the Apple Watch](/images/features/rest-timer/watch-rest-timer.webp)

With Premium, the watch app has its own **Rest Timer** screen: -15s, elapsed and target, +15s, and a delete button. When the rest ends, the watch taps your wrist and chirps, unless volume is 0.

## Timed sets and the countdown

![The Get Ready countdown before a timed set](/images/features/rest-timer/rest-timer-get-ready.webp)

For a timed set, the first tap starts a **Get ready** countdown, then the set clock. The rest starts when the set clock ends. For `auto` sets, the countdown comes out of the rest time: with `30s|60s` and a 5 second countdown, you rest 55 seconds, then the 5 second countdown starts. Write `30s|0s` to skip the countdown.
