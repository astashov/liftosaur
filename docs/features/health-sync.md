---
id: health-sync
title: "Apple Health and Health Connect"
shortDescription: "Send finished workouts and body measurements to Apple Health or Health Connect, and read bodyweight, body fat, sleep, calories and protein back into the app."
category: "Progress"
order: 40
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [health-sync-settings, health-sync-share]
---

## What syncs

Liftosaur connects to **Apple Health** on iOS 15 and newer, and to **Health Connect** on Android 14 and newer. It needs the app from the App Store or Google Play. The web app has no health sync.

The app writes:

- Finished workouts, with start time, end time and active calories.
- Bodyweight and body fat that you log in the app. On iOS, waist too.

The app reads:

- Bodyweight and body fat. On iOS, waist too.
- Sleep, dietary calories and protein, one total per day.

## Turn it on

![The Apple Health settings screen](/images/features/health-sync/health-sync-settings.webp) ![The Health Connect settings screen on Android](/images/features/health-sync/android-health-sync-settings.webp)

Go to **Me**, scroll to the **Sync** group, and tap **Apple Health**. On Android the row is **Google Health Connect**. The screen has four toggles:

- **Sync Workouts** sends each workout when you finish it.
- **Confirm each workout sync?** asks before every send.
- **Sync Measurements** reads bodyweight, body fat and waist from Health.
- **Sync Sleep & Nutrition** reads sleep, calories and protein.

On Android, turning on **Sync Workouts** or **Sync Measurements** opens the Health Connect permission screen right away. On iOS, the Health permission sheet opens the first time the app reads or writes. Turning on **Sync Sleep & Nutrition** starts a read at once on both platforms.

Sync runs when the app opens and when it comes back to the foreground. The app reads from Health at those moments. It writes to Health when you finish a workout or save a measurement.

## Send a workout

Turn on **Sync Workouts**. When you tap **Finish** on a workout, the app saves it to Health as a strength training workout. The start and end times come from the workout timer. Active calories are 6 kcal per minute of workout time. Paused time does not count.

Turn on **Confirm each workout sync?** and the app asks first: "Do you want to sync this workout to Apple Health?" Tap **OK** to send it or **Cancel** to skip it. With the toggle off, the workout goes to Health without a question.

If you finish the workout on the Apple Watch and the watch saves it to Health, the phone does not save it a second time.

If the save fails, the app shows "Couldn't save workout to Apple Health".

## Send a past workout

![The share sheet of a past workout with Sync to Apple Health](/images/features/health-sync/health-sync-share.webp)

Open a past workout from the **Home** tab. Tap the menu icon in the top right, then **Share**. The sheet has **Sync to Apple Health**, or **Sync to Google Health** on Android. Tap it, and the app writes that workout with its original times. It shows "Synced to Apple Health" when done.

## Send measurements

![The Sync to Apple Health toggle on the add measurements screen](/images/features/health-sync/health-sync-measurements.webp)

Go to **Me → Measurements** and tap the add button. At the bottom of the form is a **Sync to Apple Health** toggle. On Android it is **Sync to Google Health Connect**. It starts in the same state as **Sync Measurements** in the Health settings, and you can flip it for one save.

With the toggle on, saving sends bodyweight, body fat and waist to Apple Health. Health Connect gets bodyweight and body fat. Other body sites stay in the app. See [Measurements](/features/measurements) for the form itself.

## Read measurements

With **Sync Measurements** on, the app reads bodyweight, body fat and waist from Apple Health. On Android it reads bodyweight and body fat from Health Connect. The values appear in **Me → Measurements** in your units, next to the ones you typed.

After the first read, the app skips the values it wrote itself, so nothing shows twice. A value you deleted in the app does not come back on the next read.

The read is one way. If you delete a value in Health, it stays in the app until you delete it there.

## Read sleep and nutrition

![The Sleep and Nutrition screen](/images/features/health-sync/health-sync-sleep-nutrition.webp)

With **Sync Sleep & Nutrition** on, the app reads three metrics and stores one total per day:

- **Sleep**, the minutes asleep. Time awake in bed does not count.
- **Calories**, the dietary calories you logged in a food app, in kcal.
- **Protein**, in grams.

On iOS the app reads the last 90 days. On Android it reads the last 30, because Health Connect does not return older records. If a day's total changes in the source, the next read replaces it in the app.

The app never writes these metrics. Open **Me → Sleep & Nutrition** to see a graph and a list per metric. You can hide a day from the list and unhide it later. The data syncs to your account and is available through the REST API and the MCP server as the `health` category. See [Measurements](/features/measurements) for the screen.
