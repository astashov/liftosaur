---
id: apple-watch
title: "Apple Watch"
shortDescription: "Run your workout from your wrist. Log sets with the Digital Crown, answer AMRAP and RPE prompts, run timed sets and see your heart rate."
category: "Workout"
order: 80
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [watch-apple-watch-exercise, watch-apple-watch-get-ready]
---

## What you need

![New Workout card on the Apple Watch](/images/features/apple-watch/watch-apple-watch-home.webp)

The watch app comes with the iPhone app. It needs Premium. Without it, the watch shows **Premium Required** with a **Recheck** button.

Open Liftosaur on the phone once after pairing, or the watch shows **Sync Required**.

## Start or continue a workout

![Workout screen on the Apple Watch](/images/features/apple-watch/watch-apple-watch-workout.webp)

The home screen shows a **New Workout** card with the day name and the program name. Tap **Start**. If you started the workout on the phone, the card says **Ongoing Workout** and the button says **Continue**. Starting a workout on the phone opens the watch app on its own.

The workout screen lists every exercise with one dot per set. The dots turn green, orange or red as you log sets. Tap the **Total time** line to pause or resume the workout.

## Log a set

![Exercise screen on the Apple Watch](/images/features/apple-watch/watch-apple-watch-exercise.webp) ![Crown editing reps on the Apple Watch](/images/features/apple-watch/watch-apple-watch-crown.webp)

Tap an exercise to open it. Turn the crown, or swipe up and down, to move between exercises. Swipe left and right to move between sets. The header shows **Set 2/7** and a dot per set. The **Plates** line shows what to load.

Tap the check mark to log the set as written. The watch moves to the next set on its own.

To change a number, tap the reps or the weight field. It gets a purple border, and the crown now turns that value. The weight field steps only through weights you can build from your equipment. The watch saves the change one second after you stop turning.

Past the last set there is an **Add** page that adds a set. The **…** button in the header opens **Delete set**. You cannot swap exercises or change the targets on the watch.

When every set is done, the watch shows **All Sets Completed!** with **Finish Workout** and **Continue**.

## AMRAP, RPE and asked weight

![AMRAP prompt on the Apple Watch](/images/features/apple-watch/watch-apple-watch-amrap.webp)

A set written as `5+` opens a prompt after you tap the check mark. Tap **Reps**, turn the crown, then tap **Done**. The same prompt asks **Weight (lb)** for a `?` weight, **RPE** in steps of 0.5 for an `@8+` set, and any user-prompted state variable. A one-sided exercise asks **Reps (left)** and **Reps (right)**. See [Set Types](/features/set-types) for the syntax.

## Rest timer

After a set, the rest timer sits at the top of the exercise screen and turns red once you are over. Tap it for **-15**, **+15** and **Delete**. When the rest ends, the watch taps your wrist and plays a chime, unless the volume in **Me → Settings** is 0. See [Rest Timer](/features/rest-timer).

## Timed sets

![Get Ready countdown on the Apple Watch](/images/features/apple-watch/watch-apple-watch-get-ready.webp) ![Set clock on the Apple Watch](/images/features/apple-watch/watch-apple-watch-set-clock.webp)

For a set like `Plank / 3x1 60s|30s`, the check mark becomes a play button. Tap it and a **Get Ready** ring counts down, 5 seconds by default. Tap the ring to start right away, or the **X** in the corner to close it.

Then the set clock runs, `0:12 of 1:00`. At the target, the watch logs the set and starts the rest. **Log & Stop** logs the elapsed time early. **Log & Keep** logs it and lets the clock run on. A one-sided exercise runs **Left** and then **Right**, with **Next side** between them. The logged time shows on the Plates line. Tap it to edit or clear it. See [Timed Sets](/features/timed-sets) for the syntax.

## Heart rate

Starting a workout on the watch starts an Apple Health strength workout session. Your heart rate then shows under the clock on every workout screen, in beats per minute. It reads `--` until the first reading arrives. If a reading never comes, tap the heart to start the session again. If it still shows `--`, check that Liftosaur may read heart rate: on the watch, open **Settings → Privacy & Security → Health**, and on the iPhone, open the **Health** app, then **Sharing → Apps and Services → Liftosaur**.

## Finish the workout and Apple Health

![Apple Health settings on the phone](/images/features/apple-watch/apple-watch-health-settings.webp)

Tap **Finish** on the workout screen. The **Summary** shows time, volume, sets, reps, the exercises, sets per muscle group and any personal records. **Done** returns to the home screen.

The workout goes to Apple Health when **Sync Workouts** is on in **Me → Settings**, under **Sync → Apple Health**. Turn on **Confirm each workout sync?** and the watch asks **Sync to Apple Health?** first. Finishing on the phone finishes on the watch too, and the workout is saved to Health only once.

## Without the phone

The watch keeps its own copy of the program and the ongoing workout, so it works with the phone in the locker. When the phone is in reach, the watch sends the changes over, and the phone's Live Activity shows the set you just completed. When it is not, and you are signed in on the phone, the watch talks to the Liftosaur server directly.

A set you log on the phone shows up on the watch, and the watch jumps to the next set. A spinner in the top left corner means a sync is running. A red cloud means it failed. **Sync** on the home screen retries.

## The complication

Add the Liftosaur complication to a watch face to open the app. The rectangular one shows **Up Next** or **Ongoing** with the program and day name. The corner and inline ones show the day name next to the dinosaur.
