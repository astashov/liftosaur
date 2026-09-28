---
id: measurements
title: "Measurements, Sleep and Nutrition"
shortDescription: "Log bodyweight, body fat and 13 body sites, with a moving average graph, and see sleep, calories and protein from Apple Health or Health Connect."
category: "Progress"
order: 30
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [measurements-bodyweight, measurements-moving-average]
---

## What you can track

Liftosaur keeps three kinds of body measurements:

- **Bodyweight**, in your weight unit, kg or lb.
- **Bodyfat**, in percent.
- 13 body sites, in your length unit, in or cm: Neck, Shoulders, Bicep Left, Bicep Right, Forearm Left, Forearm Right, Chest, Waist, Hips, Thigh Left, Thigh Right, Calf Left, Calf Right.

Each measurement is a value with a date. You can log as often as you like, and you can backfill old dates.

## See your history

![Bodyweight graph and list on the Measurements screen](/images/features/measurements/measurements-bodyweight.webp)

Go to **Me → Measurements**. The **My Measurements** group on the Me screen also shows your latest **Bodyweight** and **Bodyfat**. Tap either row to open that type.

At the top, **Type** picks the measurement to show. Only types with at least one value are listed. With three or more values, a graph appears above the list. Tap the graph to see the value on a given date. The graph needs Premium. Without it, the graph is blurred.

Below the graph is the **List of measurements**. Each row has the date, the value and a trash icon. Tap the date to change it. Tap the value to edit it. The trash icon deletes the row after an **Are you sure?** confirmation.

## Smooth the graph with a moving average

![Bodyweight graph with the blue moving average line](/images/features/measurements/measurements-moving-average.webp)

Bodyweight and body fat jump from day to day. **Moving Average Window Size** adds a second, blue line to the graph. It averages the last 2, 3, 4 or 5 values. Pick **Off** to hide it. The setting is per type, so bodyweight and waist can use different windows. This option needs Premium.

The moving average also feeds your programs. The `bodyweight` variable in Liftoscript returns the latest moving average when a window is set for Bodyweight, and the latest raw value otherwise. This helps for weighted or assisted pull ups and dips:

```liftoscript
Pull Up / 3x8 0lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight
  }
~}
```

See [Liftoscript](/doc/liftoscript) for the full syntax.

## Look at one body site

Tap **Type** and pick a site, such as **Waist**. The graph and the list switch to that site, in your length unit. A site you never logged does not appear in the list.

## Add a measurement

![The Add Measurements screen](/images/features/measurements/measurements-add.webp)

Tap **Add measurements** at the top of the Measurements screen. Every enabled type gets a field with its unit. Each field starts with your last value, so you only change what moved. **Clear All Fields** empties them. All fields are optional. An empty field adds nothing.

Pick the **Date** if you are logging for another day. Today is the default.

On iOS, a **Sync to Apple Health** toggle sends bodyweight, body fat and waist to Apple Health. On Android, **Sync to Google Health Connect** sends bodyweight and body fat to Health Connect. See [Health sync](/features/health-sync) for the settings behind those toggles.

Tap **Done** to save.

## Choose which measurements to track

![The Enabled measurement types sheet](/images/features/measurements/measurements-types.webp)

On the Add Measurements screen, tap the filter icon in the top right. The **Enabled measurement types** sheet lists Weight, Bodyfat and the 13 sites, each with a switch. Only the enabled types get a field on the Add Measurements screen. Turning a type off keeps the values you already logged.

## Sleep, calories and protein

![The Sleep & Nutrition screen](/images/features/measurements/measurements-sleep-nutrition.webp)

Go to **Me → Sleep & Nutrition**. The screen has three tabs: **Sleep**, **Calories** and **Protein**. Each tab has a graph, with three or more days, and a list of days below it. Sleep shows as hours and minutes, calories in kcal, protein in g.

The app does not let you type these values. They come from Apple Health on iOS or Health Connect on Android. Turn on **Sync Sleep & Nutrition** in **Me → Apple Health** or **Me → Google Health Connect**. See [Health sync](/features/health-sync) for the permissions.

The app reads the data when it opens. It stores one total per day. On iOS it reads the last 90 days, on Android the last 30, because Health Connect does not return older records. If a day's total changes in the source, the next read replaces it in the app.

You cannot delete an imported day, because the next read would bring it back. Tap the trash icon to hide it instead. Hidden days move under a **Show N hidden records** link. Tap the undo icon there to bring one back. Days that disappear from the source stay in the app until you hide them.

The data syncs to your account with the rest of your measurements. It is available through the REST API and the MCP server as the `health` category, so an AI assistant can compare your sleep or protein with your training.

## Measurements next to your lifts

On the **Graphs** screen, the graph picker has an **Available Stats Graphs** group. Add a measurement graph there to see it under your exercise graphs. The **Add bodyweight to all graphs** option in the same picker draws your bodyweight on every graph.
