---
id: graphs
title: "Graphs"
shortDescription: "See max weight, volume and estimated 1RM per exercise, weekly volume per muscle group, and bodyweight. Long-press a point to see the workout behind it."
category: "Progress"
order: 10
datePublished: "2026-09-27"
dateModified: "2026-09-28"
screenshots: [graphs-exercise, graphs-muscle-group]
---

## Where the graphs live

![Bench Press graph on the Graphs tab](/images/features/graphs/graphs-exercise.webp)

Tap **Graphs** in the footer. Graphs are a Premium feature. Without Premium, the tab opens the subscription screen instead.

The first time, the screen says "Select graphs you want to display by tapping filter icon at right top corner." Every graph you pick stays on this screen, in the order you set, until you remove it.

Each graph is a line chart with the date on the X axis.

## Choosing which graphs to show

![The graph picker with selected and available graphs](/images/features/graphs/graphs-choose.webp)

Tap the filter icon at the top right. A sheet opens with four groups:

- **Selected Graphs**. The graphs on the screen. Drag the handle on the left to reorder. Tap the X on the right to remove.
- **Available Exercise Graphs**. Every exercise in your history that is not on the screen yet. Tap one to add it.
- **Available Muscle Groups Graphs**. One graph per muscle group, plus **Total Weekly Volume**.
- **Available Stats Graphs**. **Bodyweight** and every length or body fat measurement you have logged.

If you have no history and no measurements, the sheet says "You haven't tracked any workouts or measurements yet."

## Reading an exercise graph

![Long-press legend on the Bench Press graph](/images/features/graphs/graphs-legend.webp)

The dropdown at the top right of each exercise graph switches between **Max Weight** and **Volume**.

- **Max Weight** shows the heaviest set of that exercise in each workout. A second line shows the estimated one rep max (e1RM). Liftosaur computes it with the Epley formula from the weight and reps of your best set.
- **Volume** shows weight × reps summed over all sets in the workout.

Long-press a point. A legend appears above the chart with the date, the weight and reps, and the e1RM. It also shows the notes you wrote for that exercise or workout, and the state variables of the exercise on that day, like `rm1` or `increment`. Tap **Workout** in the legend to open that workout. Tap the X to close the legend.

With **Add program lines to graphs** on, a vertical line marks each date you switched programs, labelled with the program name.

## Zooming in

Pinch with two fingers to zoom the date range. Drag with two fingers to move the zoomed area. Double-tap the chart to reset the zoom.

## Muscle group volume per week

![Chest weekly volume graph](/images/features/graphs/graphs-muscle-group.webp)

A muscle group graph has one point per week. The dropdown switches between **Volume** and **Sets**.

Liftosaur counts only sets you finished. A set for a target muscle counts once. A set for a synergist muscle counts by the synergist multiplier from your settings. The **Total** graph counts every finished set once. The week starts on Monday or Sunday, following **Week starts from** in **Me → Settings**.

The built-in groups are shoulders, triceps, back, abs, glutes, hamstrings, quadriceps, chest, biceps, calves and forearms. Custom muscle groups get a graph too. To change which muscles an exercise trains, open the exercise from **Me → Exercises** and tap **Override Muscles**.

## Bodyweight and measurements

![Bodyweight graph](/images/features/graphs/graphs-bodyweight.webp)

Add **Bodyweight** from the **Available Stats Graphs** group. It plots every bodyweight entry you logged. Length measurements, like waist or chest, and body fat percentage each get their own graph in the same way.

Once the bodyweight graph is on the screen, a new toggle appears in settings: **Add bodyweight to all graphs**. It draws your bodyweight as a green line on every exercise graph, so you can see how your lifts moved with your weight.

## Graph settings

![Graph settings at the top of the picker](/images/features/graphs/graphs-settings.webp)

The **Settings** group at the top of the picker sheet has:

- **Default exercise graph type**. **Weight** or **Volume**. New exercise graphs open with this type.
- **Default muscle group graph type**. **Volume** or **Sets**.
- **Same range for X axis for all graphs**. Off by default. Each graph starts at its first date and ends at its last. On, every graph shares one date range, capped to the last year, so you can compare them.
- **Add bodyweight to all graphs**. Shown once the bodyweight graph is selected.
- **Add calculated 1RM to graphs**. On by default. Turns the e1RM line on the Max Weight graphs on or off.
- **Add program lines to graphs**. Turns the program change lines on or off.

## Personal records for one exercise

![Exercise Stats with the graph and personal records](/images/features/graphs/graphs-personal-records.webp)

Every exercise also has its own **Exercise Stats** screen. Open it from **Me → Exercises** and tap the exercise, or tap the exercise name during a workout.

The screen shows the exercise graph with the e1RM line and program lines always on. Below the graph, the **Personal Records** card lists your **Max Weight** and **Max 1RM**, each with the date. The 1RM row also shows the set behind it, like `5 x 225lb`. Tap a record to open that workout. The exercise history follows below.

Without Premium, the graph on this screen is blurred and does not respond to touch. The personal records stay visible.
