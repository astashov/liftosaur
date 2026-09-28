---
id: exercise-library
title: "Exercises"
shortDescription: "Hundreds of built-in exercises with muscle maps. Search, filter by equipment and muscle, swap mid-workout, and open each one's history, records and 1RM."
category: "Exercises and equipment"
order: 10
datePublished: "2026-09-27"
dateModified: "2026-09-27"
screenshots: [exercise-library-picker, exercise-library-stats]
---

## Add exercises to a workout

![The Add Exercises picker](/images/features/exercise-library/exercise-library-picker.webp)

On the workout screen, tap the **+** at the end of the exercise thumbnails. The **Add Exercises** sheet opens with two groups, **Custom Exercises** and **Built-in Exercises**.

Each row shows the image, the name, the equipment, and the **Type**, **Target** and **Synergist** muscle groups. The muscles icon in the header switches those lines to single muscles. Tap the star on a row to mark a favorite, and the star in the header to show favorites only. Exercises already in this workout are greyed out.

Custom exercises are created from the same sheet. See [Custom Exercises](/features/custom-exercises).

## Search by name

![Search results for "Incline"](/images/features/exercise-library/exercise-library-search.webp)

Type in **Search by name**. Words match the name and the equipment, so `incline dumbbell` finds Incline Bench Press, Dumbbell. The default equipment version comes first.

## Add several at once

![Two exercises selected, Add to this workout (2)](/images/features/exercise-library/exercise-library-multi-add.webp)

Tap the circle on each exercise you want. The button counts them: **Add to this workout (2)**. In the program editor it says **Add Exercises (2)**. A swap picks one exercise only.

## Filter by equipment and muscles

Tap the filter button next to the search field. The **Filter and sort** screen has:

- **Sort by**: **Name, A to Z** or **Similar Muscles**. Similar Muscles works only when you swap or edit an exercise.
- **Show only available equipment**, which hides exercises on equipment you hid in [Equipment](/features/equipment-and-gyms).
- **Equipment**, and **Type**: Core, Pull, Push, Legs, Upper, Lower.
- **Muscles**: whole **Muscle Groups** or single **Muscles**.

Back in the list, the filter button shows how many filters are on, and the line under the search says **Sorted by** and **Filters**.

## Swap an exercise mid-workout

![The Swap Exercise picker with the current exercise on top](/images/features/exercise-library/exercise-library-swap.webp)

Tap the three dots on an exercise card, then **Swap Exercise**. The picker opens with a **Current Exercise** card on top. Sort by **Similar Muscles** to see the closest matches first. Muscles that match the current exercise are green, the rest red.

A **Recent** group lists the last 5 exercises you swapped this one to. It hides while a search or a filter is on.

The weights come along. The app takes the weight from your history for the new exercise at the closest reps, converted to your target reps and RPE, or from your 1RM when there is no history.

## Pick from your program

![The From Program tab](/images/features/exercise-library/exercise-library-from-program.webp)

The **From Program** tab lists your current program's exercises by week and day, and an exercise added from here keeps its progression. **Ad-hoc Exercise** adds a plain exercise.

A swap to an ad-hoc exercise drops the old exercise's progression. The settings icon at the top left of the sheet has one switch to keep it: **Keep existing program exercise logic when pick adhoc exercise**.

## Your exercises list

![Me → Exercises](/images/features/exercise-library/exercise-library-list.webp)

Go to **Me → Exercises**. The list has **Custom Exercises**, **Current program exercises** and **Exercises from history**. Each row shows the **1RM** and the **Equipment**, or the **Default rounding** when no equipment is set. **Filter by name** and **Filter by type** narrow the list. Tap a row to open the exercise screen. The exercise name on the workout screen opens it too.

## The exercise screen

![The Exercise Stats screen for Bench Press](/images/features/exercise-library/exercise-library-stats.webp)

Under the name, the screen says **Built-in exercise** or **Custom exercise**, then **Type**, **Target** and **Synergist**. Tap them to see single muscles.

- **Notes**: notes in Markdown that stay with the exercise, not with one workout.
- **Default Rounding**: 5 lb or 2.5 kg unless you change it. Used when Equipment is not set.
- **Equipment**: one setting per gym. See [Equipment](/features/equipment-and-gyms).
- **Is Unilateral**: on by default for one-side exercises like Lunge, and for dumbbell curls. Reps count per side, and both sides add up for volume.
- **Two weights (count both)**: on by default for dumbbell exercises. Volume counts both dumbbells.
- **1 Rep Max**: the `rm1` variable in Liftoscript. Until you set it, the app uses the exercise's starting weight.

## Records, graph and history

![Personal Records and history on the exercise screen](/images/features/exercise-library/exercise-library-prs.webp)

With more than one workout, the screen shows the exercise graph. **Personal Records** lists **Max Weight** and **Max 1RM**, with the reps and weight of the set behind it and the date. Tap a record to open that workout.

The history below shows each workout's sets, **Volume**, program state and notes. Tap an entry to edit that workout. The filter icon has **Ascending sort by date**, **Hide entries without exercise notes** and **Hide entries without workout notes**.

## The rep max calculator

![The Rep Max Calculator](/images/features/exercise-library/exercise-library-calculator.webp)

Tap the calculator icon next to **1 Rep Max**. Enter the reps, RPE and weight you can do, then the reps and RPE you want. **Use it!** writes the result into the field. The weight keypad has the same calculator key. Reps go from 1 to 24, RPE from 1 to 10.

The same calculator is on the site at [/rep-max-calculator](/rep-max-calculator), with a page per rep count like [/five-rep-max-calculator](/five-rep-max-calculator). **Other Rep Maxes** and **1RM Percentages** sit under the result.

## Override muscles

![The Override Muscles sheet](/images/features/exercise-library/exercise-library-override-muscles.webp)

Tap **Override Muscles** at the top of the exercise screen. Pick the muscles and give each a multiplier from 0 to 1. At 1 it is a target muscle, and each set counts in full. Below 1 it is a synergist. The override applies to the week insights, the volume on the Program screen, and the graphs.

## The exercises directory on the site

[/exercises](/exercises) lists every built-in exercise, with **Filter by name** and **Filter by type** like the app. Each exercise page is titled **How to perform ... with proper form** and lists its **Muscle Groups** and **Muscles**, target and synergist.
