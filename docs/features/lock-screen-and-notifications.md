---
id: lock-screen-and-notifications
title: "Lock Screen, Notifications and Audio"
shortDescription: "Complete sets and adjust rest from the iOS Live Activity, Dynamic Island or Android Live Update, and get a notification with the next set and plates."
category: "Workout"
order: 70
datePublished: "2026-09-27"
dateModified: "2026-09-28"
screenshots: [lock-screen-and-notifications-live-activity, lock-screen-and-notifications-sound]
---

## Run the workout from the iOS lock screen

![Live Activity on the lock screen after completing a set](/images/features/lock-screen-and-notifications/lock-screen-and-notifications-live-activity.webp)

With Premium, an ongoing workout shows as a **Live Activity** on the lock screen.

The top row has the workout time, **Set: 2/5**, and one dot per set. Green is done, orange partial, red failed, gray still to do. Warmup dots are dimmer.

Below it is the next set: the exercise image, the name, **Target: 5 × 100lb**, and **Plates: 45, 2.5** with the plates for one side of the bar.

On the right is the set card, like **5 × 100lb** with a checkmark. Tap it to complete that set without unlocking the phone. The rest timer starts, and the card moves to the next set.

Some sets need an answer from you: AMRAP reps, an RPE, or a weight. For those, the tap opens the app at that set instead.

While you rest, the top right corner has **+15s**, the elapsed time, the target, and **-15s**. The elapsed time turns red past the target. The timer itself is on the [Rest Timer](/features/rest-timer) page.

When every set is done, the Live Activity says **All exercises completed!**. It closes when you finish or discard the workout. Timed sets get their own layout, see [Timed Sets](/features/timed-sets).

## Use the Dynamic Island

![Rest timer in the Dynamic Island](/images/features/lock-screen-and-notifications/lock-screen-and-notifications-dynamic-island.webp)

In another app, the Dynamic Island shows the exercise image and the rest timer. The timer turns red when the rest is over.

Long press the island to expand it. The expanded view adds the exercise name, **Set: 2/5**, the target and the plates.

## Run the workout from the Android notification

![Live Update notification on Android with -15s, +15s and Done](/images/features/lock-screen-and-notifications/android-lock-screen-and-notifications-live-update.webp)

With Premium, Android shows an ongoing notification for the workout. Its title is the exercise and the rest target, like **Bench Press (1:30)**. The text is **Set 2/5 • Target: 5 × 100lb • Plates: 45, 2.5**.

A clock in the notification counts the rest. The notification turns red when the rest is over.

It has three buttons: **-15s**, **+15s**, and **✓ Done**. **✓ Done** completes the set and starts the next rest. For a timed set the button is **▶ Start**. A set that needs an answer opens the app instead.

In another app, the rest timer shows as a small chip next to the clock.

## Get a notification when the rest is over

If the app is in the background when the rest ends, a notification arrives:

- Title: **It's time for the next set!**
- Subtitle: **Next Set: Bench Press, 5 reps, 100lb**
- Body: **Plates per side: 45, 2.5**

If the next set has no weight, the body is **The rest is over: Time to lift!**.

The notification plays the chime. With volume 0 it arrives silent. On Android it also wakes the screen, and vibrates three times if **Vibration** is on.

The app asks for notification permission the first time it schedules a rest timer. Android also asks for the alarm permission.

## Get a reminder about an unfinished workout

![Me → Timers, Reminders section](/images/features/lock-screen-and-notifications/lock-screen-and-notifications-reminder.webp)

Leave the app with a workout still running, and a notification comes after a delay. It says **Workout reminder**, "You have an ongoing workout, make sure to finish it if you're done".

Coming back to the app cancels it. Finishing or discarding the workout cancels it too.

Set the delay in **Me → Timers**, under **Reminders**, in **About ongoing workout**. It is in seconds. The default is 900, which is 15 minutes. Set it to 0 to turn the reminder off.

## Set the chime, volume and vibration

![Sound section on the Me screen](/images/features/lock-screen-and-notifications/lock-screen-and-notifications-sound.webp)

When the rest ends, the app plays a chime and vibrates. Both are on the **Me** screen, under **Sound**: a **Vibration** toggle and a **Volume** slider.

Volume 0 with vibration on gives a vibration without sound.

The chime plays over other audio, so you hear it over a podcast on your AirPods. The podcast gets quieter for a moment.

Timed sets have their own sounds for the end of **Get Ready** and the end of the set.

## Hear the chime through headphones while locked

On iOS, when the phone is locked, the rest-over notification is what plays the chime.

With an Apple Watch paired and headphones connected, the phone plays the chime through the headphones instead. Bluetooth, wired, USB and AirPlay all count. The phone keeps a silent audio session open in the background for that. It removes the notification, so you do not hear the chime twice.

Take the headphones out during the rest, and the notification plays instead. See [Apple Watch](/features/apple-watch) for the chirp on the watch itself.

## Play the chime in Silent or Do Not Disturb mode

On Android with Premium, the **Me** screen has an **Ignore Do Not Disturb** toggle under **Sound**. With it on, the rest-over notification makes a sound even in Silent or Do Not Disturb mode. The app switches the ringer to normal for about four seconds, then restores it.

Android needs the Do Not Disturb access permission for this. The first time, the app opens the system settings page for it.

## Turn notifications off

- Set **Warmup** and **Workout** to 0 in **Me → Timers**. No timer runs, so no rest-over notification comes.
- Set **About ongoing workout** to 0 in **Me → Timers** to turn off the reminder.
- Set **Volume** to 0 on the **Me** screen to keep the notifications silent.
