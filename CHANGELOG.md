<!--
  This file is the source of truth for the in-app "What's new?" modal.
  It is bundled into the JS at build time by scripts/build-markdown.js.

  Format: each entry is a YAML-frontmatter block delimited by ---.
  Required keys: date (YYYY-MM-DD), title.
  Body is markdown. Each paragraph in the body becomes a paragraph in the modal.
  Use bullet lists (- ...) only when you want bullets to render as actual bullets.

  Custom inline directives:
    ::icon-discord::, ::icon-doc::, ::icon-swap::, ::icon-help::
    [label](internal:/path)        — internal app/website link
    ```liftoscript ... ```          — Liftoscript code block with syntax highlighting
-->

---
date: 2026-07-01
title: Added time-based exercises and intervals/circuits support
---

You can now time the set itself, not just the rest after it. Great for planks, timed cardio, or any "hold for X seconds" exercise. Use the `setTimer|restTimer` syntax:

```liftoscript
Plank / 3x1 0lb 60s|30s
```

That's 3 sets of plank, holding each for 60s, then resting 30s. Add `+` to count up past the target instead of stopping automatically (like `30s+|60s`). Add `auto` to auto-advance to the next set when the rest ends - which is how you build circuits like EMOM or Tabata:

```liftoscript
// EMOM - 5 rounds, 5 reps, 1-minute window
Power Clean / 5x5 135lb 60s|0s auto
// Tabata - 8 rounds of 20s work / 10s rest
Squat, Bodyweight / 8x1+ 0lb 20s|10s auto
```

In the UI (in the app, in Live Activity / Live Update, and in Apple Watch as well), you'll get a set timer modal if the current set has time.

Read more in the [docs](internal:/docs/liftoscript). You need an iOS/Android native app update (from App Store / Google Play) to get this feature.

---
date: 2026-06-17
title: Added Apple Watch complications
---

To get them - update the app from App Store

---
date: 2026-06-15
title: Added API / MCP for body measurements
---

Now you can manage your body measurements through the API and MCP server - bodyweight, bodyfat, and body parts (neck, chest, waist, biceps, thighs, and the rest).

Read your full measurement history, record new values (with a custom date if you're backfilling), edit a value, or delete one - all from an AI assistant or directly over the REST API.

---
date: 2026-06-14
title: Added API / MCP for the equipment and exercise data
---

Now you can manage your gyms and equipment through API and MCP, as well as managing the exercise data:

* 1RM value
* Muscle overrides
* Equipment assigned to exercises
* Default rounding
* Whether the exercise is unilateral
* Exercise persistent notes

---
date: 2026-06-13
title: Added subscription management to the Account screen
---

It was somewhat confusing that you couldn't see your current subscription status within the app, so I added it
to the Account screen. So now you see what's your subscription status there, and can manage it from there as well.

---
date: 2026-06-08
title: Improved import history flow
---

Import history although a pretty rarely used feature - is one of the most dangerous. With slightly wrong CSV file,
you can massively mess up your workout history, and cleaning it up or restoring the account may be hard and painful.

Now that functionality is way less destructive. When you import Liftosaur CSV or Hevy CSV, it'll show you
a preview screen, where it will display:

* The workout history preview - the way you'd see it on the Home screen
* Warnings - like if some weights or reps look suspicious, if there are duplicated workouts, if dates look wrong, etc
* Summary stats - like how many workouts, exercises, sets, etc would be imported
* The list of custom exercises that would be created by the import

And after your import it - there's still a way to "undo" the import - you can go to Me -> Recent Imports, and there you'll see the list of 5 last imports, with the option to undo each of them. Undoing the import would remove all workouts that were imported in that import, as well as custom exercises that were created in that import (unless they already used in other workouts or programs).

---
date: 2026-05-31
title: New native iOS and Android apps
---

Before, the iOS and Android Liftosaur apps were webapps. Basically, a site, that is rendered inside a little browser window, wrapped as a native app. It worked fine, but didn't have that native feeling, screen navigations, gestures, native-looking modals, etc.

From now on, the new versions of the apps on App Store and Google Play are native apps. They look the same, but have smoother animations, native navigation and modals. Update and check them out!

That was a massive ground-up rewrite of Liftosaur, so in case you find any bugs - please let me know in Discord or at **info@liftosaur.com**!

---
date: 2026-05-02
title: Huge update where nothing changed
---

In preparation for migrating the app from a webapp (like it is right now) to a native app, I had to do a massive rewrite of the whole codebase. But the functionality stays the same. The only difference is graphs look slightly different (had to rewrite the graphs engine from the scratch).

So, in case you find any new bugs after this - please let me know in Discord or at **info@liftosaur.com**. Thanks!

---
date: 2026-03-16
title: Added "tour" modals
---

If you're a new user (did less than 4 workouts), you'll see a "tour" modal on key screens in the app - **workout screen**, **program editor**, and **program exercise editor**. It walks you through the key features of each screen, so you don't miss out on anything important. You can also access those tours anytime by tapping the ::icon-help:: in the top right corner of those screens.

---
date: 2026-03-08
title: MCP Server and REST API
---

Liftosaur now has an [MCP server](internal:/docs/mcp) - connect AI assistants like Claude, ChatGPT, or Gemini to manage your programs and workout history through natural conversation. Ask the AI to create programs, tweak progressions, log workouts, or analyze your training - it knows Liftoscript and can do it all for you.

There's also a [REST API](internal:/docs/api) - if you want direct programmatic access. Generate an API key in Settings and make HTTP requests to create programs, log workouts, simulate progressions, pull stats, etc.

Both require a premium subscription.

---
date: 2026-03-03
title: Export workouts as text
---

You can now copy your workout as a compact text format. After finishing a workout, tap the "Text" button on the finish screen, or open any past workout from history and use the share menu to copy as text.

The text format is human-readable and can be pasted into notes, messages, or social media.

---
date: 2026-02-28
title: Improved Double Progression (dp) to support rep ranges
---

Double Progression now properly handles rep range exercises (like 3x8-12). It auto-detects whether your exercise uses ranges, and progressively narrows the range from below until you hit the top, then increases weight and resets.

For non-range exercises (like 3x8), it works as before — increasing reps from min to max, then bumping weight and resetting reps.

If you adjust weight during a workout (e.g. the programmed weight wasn't available), the next weight increase will now be based on the weight you actually used, not the originally programmed weight.

---
date: 2026-02-22
title: New /programs page on the liftosaur.com site
---

Not the app, but the site update. There's now the /programs page on the liftosaur.com site, where you can find all the programs available in the app, along with full description (pros/cons, program philosophy, how to run it, etc), preview, Liftoscript code, etc.

If you're currently figuring out the next program, it could be a great resource to check it out, compare different programs, and pick the one that suits you the best.

---
date: 2026-02-08
title: Exerciser Picker by default now hides exercises with hidden equipment
---

If you hide some equipment in the "Available Equipment" screen, it used to not affect exercise picker, it still was showing e.g. cable, smith machine, etc exercises even though you disabled them in the "Available Equipment".

So from now on, those exercises are hidden. You still can make them show if you tap the checkmark in the filter section inside the exercise picker.

Also, sorting order (by Name, by Similar Muscles) persists between picker opens from now on.

---
date: 2026-01-29
title: ⌚ Add Apple Watch Support
---

If you have Premium and iPhone, you can now use Liftosaur on your Apple Watch to track your workouts. You can complete sets, see rest timers, view upcoming exercises, etc. You cannot modify the workout though (like change exercises or add sets, or change targets), for that you'll need to grab your phone.

Make sure to update the native iOS app to >= 6.31 to get the Watch app as well.

That was a huge and complex project, so definitely let me know if you notice any bugs or issues - in Discord, Reddit, or by [info@liftosaur.com](mailto:info@liftosaur.com)

---
date: 2026-01-24
title: Workout now syncs to Apple/Google health when you finish a workout
---

Previously, the workout would sync to Apple or Google health when you tap "Continue" on the "Congratulations" screen. But some users never did that, exiting the app right after they finished a workout, so the workout never got synced to Apple/Google Health.

So, now the workout syncs to Apple/Google Health right when you finish a workout. You can toggle "Ask for confirmation" in the Health settings, if you want. Without it, it just will always submit the workout right away.

You can also submit past workouts to Apple/Google Health - if you open a past workout, and tap the share icon - there'll be an option to "Sync to Apple/Google Health".

---
date: 2026-01-20
title: The current ongoing workout now syncs to the server
---

Previously, if you start a workout e.g. on a phone, and then open a webapp, you won't be able to see it there. The ongoing workout would only exist locally, and syncs to the server when you finish it.

From now on, the ongoing workout also syncs to the server. So, you can start a workout on a phone, but continue in the webapp, and then switch back to phone.

---
date: 2026-01-03
title: Changes in progress - lp() and dp() behavior
---

If you omit the weight in the program initially, like this:

```liftoscript
Squat / 3x8 / progress: lp(5lb)
```

the **lp** and **dp** behave weird. They consider the program weight as 0lb, add 5lb to it, and the program weight becomes 5lb. But user may entered e.g. 100lb there for each set, and then they see 5lb as the weight next time, and got confused.

To address that, there're 2 breaking changes in lp/dp built-in progressions:

- If the weight wasn't specified in the program, it'll set the completed weights to the program.
- It will increment based on the completed weight, not the target weight in the program from now on.

---
date: 2025-11-25
title: Added Live Updates on Android
---

Similarly to iOS, there's now Live Updates notification on the lock screen, with the timer, next exercise, set, reps, weights, plates, etc.

You can adjust the rest timer from there, or complete a set.

There's also rest timer in the little chip near the clock, which is shown if you're currently in another app.

It's a **Premium feature**, so you'd need to have Premium subscription to use it.

---
date: 2025-11-23
title: Added Live Activity / Dynamic Island on iOS
---

On the lock screen, it'll show Live Activity, with the timer, next exercise, set, reps, weights, plates, etc.

You can adjust the rest timer from there, or complete a set.

There's also rest timer in the **dynamic island**, and if you long press it - it'll expand into the same info as in the live activity.

It's a **Premium feature**, so you'd need to have Premium subscription to use it.

---
date: 2025-11-09
title: Added unilateral exercise support
---

For unilateral exercises (like one-arm dumbbell rows, bicep curls, bulgarian split squats, etc) you can now specify reps per side. It's enabled by default for built-in unilateral exercises, but you can override it on the Exercise Stats screen, via "Is Unilateral" checkbox.

The volume is calculated by summing up reps from both sides. The e1RM is calculated by taking the average from reps of both sides.

---
date: 2025-11-03
title: Added ability to customize muscle groups
---

If you don't like the current split by muscle group, you can customize it now! Go to Me -> Muscle Groups, and you can hide built-in muscle groups, and create new ones.

For example, you may want to have Front/Side/Rear delts instead of just "Shoulders", or Upper/Lower Back instead of just "Back".

You can also customize it through the "Planner Settings" modal (where you set up set ranges for muscle groups), both inside of the app, and in the web editor.

---
date: 2025-11-01
title: Add supersets
---

Now you can add exercises to superset groups, and within that group it will switch between exercises each time you finish a workout set. E.g. if you have 3 exercises in a superset group, you'd do 1 set of the first exercise, it'll switch to the seocond exercise, you finish a set there, it'll switch to the third exercise, and then back to the first one again.

You can set those groups both in a program and in a workout. In a program, you can do it both in the text and UI. In the text, it looks like this:

```liftoscript
Squat / 3x8 / superset: A
Deadlift / 3x8 / superset: A
Bent Over Row / 3x8 / superset: A
```

So, you add **superset: GROUP_NAME** to each exercise you want to be in a superset group. GROUP_NAME could be any string, e.g. A, B, ChestDay1, etc.

There's a new timer setting for the rest timers within supersets - in Me -> Timers. It takes precedence over the default rest timer, but the per-set rest timers take precedence over both.

The supersets will be highlighted by a colored line on the bottom side of exercise thumbnails during workout, as well as within the exercise card.

---
date: 2025-10-13
title: Override target/synergist muscles of exercises with custom synergist multipliers
---

If you disagree with the built-in target/synergist muscles of some exercise, you can now override them! Go to the Exercise Stats screen (e.g. from Me - Exercises), and tap on "Override Muscles" at the very top. You can choose the muscles and the multiplier there. If it's **1** - it's a target muscle, if less than 1 - it's a synergist muscle. This will be taken into account in the week insights, in the week volume stats on the Program screen, on the graphs, etc.

---
date: 2025-10-01
title: Added estimated 1 Rep Max column to the workout screen
---

If you tap on the swap icon at the second column header (where the "Target" is) - the last variant would be the estimated 1 Rep Max for the set. Would be semi-transparent for non-completed set, and solid for completed set. It uses completed reps/weight/RPE for calculation, but if not available yet - uses target reps/weight/RPE.

---
date: 2025-09-24
title: 🏋️‍♂️ Improved custom exercises
---

Added a bunch of changes to address most requests/feedback about the custom exercises:

- People noted it's hard to add target/synergist muscles because you don't know on the top of your head what muscles exercise works, and from what muscle group each muscle is. So now:
  1. Each muscle has a **little image**
  2. They're **grouped by a muscle group**
  3. There's **"Autofill"** button, that tries to prefill all the muscles/types based on the exercise name using AI.
- Added ability to **add exercise notes** to the custom exercise form as well
- You now can **upload an image** for a custom exercise from your phone (it requires being signed up though, to avoid abusing API for uploading images).
- You also can pick an image from **"Image library"** for your custom exercise. The Image Library has images of built-in exercises, as well as previously uploaded ones.
- You can **clone from existing** built-in (or existing custom) exercises, and it will prefill the image, the muscles and the types of the cloned exercise to your custom one.

There's one **breaking change** though - you won't be able to specify URLs of images anymore for custom exercises. It was a temporary hack (which survived for like 2 years!), and external images sometimes don't work if you generate workout or program images. It still will work for existing exercises, but you won't be able to change their image URLs anymore. You can only change the image there by uploading a new one, or picking from a library.

---
date: 2025-09-14
title: Exercise and equipment notes
---

You can now add exercise and equipment notes.

Those are not tied to a program, those are associated with exercises or equipment. You can use exercise notes to e.g. list form cues for a specific exercise, and the equipment notes to e.g. list tweaks of equipment, e.g. bench angle, cable setup, etc.

So, this way you have 3 note types in the app:

- **Program exercise description** - the ones you add right in the program text via **// comment**. You can use them to add program-specific details for the exercise, e.g. progression explanation.
- **Exercise notes** - those would be not tied to a program, but to an exercise. You can use them to add general notes for the exercise, e.g. form cues. You can edit them on the Exercise Stats screen.
- **Equipment notes** - those would be tied to a specific equipment. You can use them to add details about the equipment, e.g. bench angle, cable setup, etc. You can edit them on the Available Equipment screen.

All of them would be displayed on the workout screen.

Also, from now on the previous workout exercise note only would be displayed for two months on the workout screen.

---
date: 2025-09-05
title: Preview tab on the Program screen now changes 1RM/Equipment/State vars
---

It used to be ephemeral like Playground, but it's non obvious that it behaves that way. Also, seems like a lot of people go there after cloning a program, so this is the place where they'd expect to configure equipment and 1RMs.

So, now you can change 1RM and Equipment there, adjust state variables, and all those changes would be persisted.

Tapping on the name or exercise image also goes to the Exercise Stats screen.

---
date: 2025-09-04
title: Add new variables - 'amraps', 'logrpes' and 'askweights'
---

They allow to mark a set AMRAP, ask for actual RPE after completing a set or ask for actual weight. Basically the same as adding **+** after appropriate value.

You can use them in exactly the same way you use **reps** or **weights**.

To disable, assign 0 to them, to enable - assign any non-zero value. E.g.:

```liftoscript
Squat / 3x8 100lb / progress: custom() {~
  amraps = 1  // Mark all sets AMRAP
  askweights[ns] = 1 // Ask for the last set actual weight
~}
```

---
date: 2025-08-30
title: Bar == Bodyweight and "Assisted" equipment
---

You can now set the bar == your current bodyweight, and also switch the equipment to "Assisted" mode.

If the equipment is in the "Assisted" mode, the plates calculator will show the plates you need to add to reduce the weight, not to add to it.

This is mostly useful for e.g. assisted pull ups or dips. You can set the bar to your bodyweight, check "Is Assisted", and enter the plates you have for the leverage machine. It will round to the weight to bodyweight minus plates, so properly would show what you need to load on the machine.

---
date: 2025-08-26
title: 🌑 Dark Theme
---

Now there's Dark Theme! By default it uses your phone's current system theme (Dark or Light), but you can override it in Me - Appearance - Dark mode.

Make sure to update iOS or Android native apps too, otherwise there'll be some parts that are not dark.

Let me know if some colors look weird or contrast is bad - info@liftosaur.com, or our Discord or /r/liftosaur subreddit.

---
date: 2025-08-13
title: Hiding equipment, and changes in default exercise equipment
---

Now you can hide the built-in equipment you don't have / not going to use on the "Available Equipment" screen.

Also **POTENTIALLY BREAKING CHANGE** - if you never ever set the equipment for some exercises, it will be automatically set to matching equipment now. E.g. the exercise is **Bench Press, Barbell** - it will have **Barbell** equipment set by default - only if you never set it before (and it was **None**).

Did that because there was a lot of confusion for new users - like why they set up Barbell equipment, but it's not applied to barbell exercises by default.

---
date: 2025-08-10
title: Redesign of the exercise picker
---

Redesigned the exercise picker. The biggest change is that now you can add/edit not only ad-hoc, but also **program exercises from the current program**, both used and unused. They'll be added with all their sets, and will run the progression logic on workout completion.

So, now you can define a bunch of unused exercises you may want to switch to (e.g. if some machines are often busy in your gym - you can define alternatives), and quickly add / replace them during the workout.

There's also ability to "star" exercises, so you can quickly find them in the future. There're redesigned filters, with images for each muscle and muscle group. **Substitute** tab is gone, and replaced by sorting by similar muscles (which is exactly the same) in the filters section.

When you add exercises to a workout, you can pick multiple exercises now. And when you start an ad-hoc workout, the picker will be open automatically, so you can add exercises right away.

Hopefully the whole experience now makes more sense, and it's more logical - you can either add an ad-hoc exercise (and then you set up the sets yourself), or you add program exercise, and it behaves like you defined it in the program.

---
date: 2025-07-06
title: Improved syncing mechanism
---

Rewrote the syncing mechanism to make it more reliable, and resolve conflicts better. Ideally you shouldn't notice any changes, and hopefully it'll prevent rare cases when the app doesn't data sync properly between the web editor, web app, and phone app.

It's a HUGE under the hood change, so if you notice any issues with syncing - please let me know at **info@liftosaur.com** or via Discord/Reddit.

---
date: 2025-06-22
title: Added bodyweight varaible
---

Now there's a **bodyweight** variable that would return the latest bodyweight moving average from **Measurements** screen. You can use it e.g. for pull ups or some other bodyweight exercises.

```liftoscript
Pull Up / 3x8 0lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight
  }
~}
```

---
date: 2025-06-21
title: Added increment() and decrement() functions
---

They'll accept a weight, and return the previous/next possible weight based on your equipment. E.g. if you have 2x2.5lb smallest plates, **increment()** would increase the weight by 5lb. Or if you have 10lb and then 20lb fixed dumbbells, it would increment by 10lb. Use it like this:

```liftoscript
Squat / 3x8 100lb / progress: custom() {~
  weights = increment(weights[1])
~}
```

Same thing for **decrement()**. They work exactly the same way as the +/- buttons on the weight keyboard

---
date: 2025-06-19
title: AI prompt generator
---

To help you write Liftoscript, there's now a page - [liftosaur.com/ai/prompt](internal:/ai/prompt) - that you could use to generate a prompt e.g. for ChatGPT, Claude, Gemini, etc that would help you to write your program in Liftoscript. It combines all the documentation and a bunch of examples into that huge prompt, and you can copy it, and paste into AI or your choice, and it'll generate a program for you.

It's not perfect, and sometimes makes mistakes - in that case just copy the errors back to AI chat, and it should be able to fix them.

You can also paste a URL to some web page, or even a google sheet into the input field on that page, and it will try to generate a program from there.

Currently works best with Claude, but should provide decent results with ChatGPT too.

You can access it through the website, tap on "AI Helper" at the nav bar.

---
date: 2025-06-13
title: Suppressing progress
---

Now you can suppress progress for an exercise, if you won't want it to run the progress logic and updates weights/reps/etc after finishing a workout.

For that, after finishing all sets of an exercise, tap "Suppress" link near the progress changes info.

Super optional, but sometimes you may want to do it.

---
date: 2025-06-07
title: Redesigned the "Program" screen
---

Made the structure more logical - now there're very prominent tabs for Editing and for Playground, and also 4 icons/tabs to switch between sorting, UI mode, per day code mode and full code mode.

Also, when you edit a program exercise - it navigates to a separate "Edit Program Exercise" screen. On that screen you can edit everything related to the exercise - sets, warmups, descriptions, as well as progress and update logic.

So from now on, everything you could do in the full text mode is pretty much possible to do via UI, including custom progressions and updates.

Also, you can go straight to that "Edit Program Exercise" screen from the workout screen - so if you need to quickly tweak warmups or e.g. adjust weight for the program exercise during workout - it's now easier to do so.

It's a **VERY large and complex change**, so if you notice any issues / bugs / etc - don't hesitate to email me at **info@liftosaur.com**, or contact me via Discord/Reddit.

---
date: 2025-04-24
title: Redesigned "Choose Program" screen
---

It now has filters (by frequency, duration of a workout, experience, etc) to help you find a suitable program.

Builtin and your programs are now separated into separate tabs, and the cards for your programs look similar to built-in programs.

Also, you can skip selecting a program now, and go without a program. Could be useful if you want to build a program iteratively over time from ad-hoc workouts.

---
date: 2025-04-21
title: Sets are now optional in the program
---

If you don't specify any sets for an exercise - it won't be an error anymore. So, a program like this is a valid program now:

```liftoscript
Squat
Bench Press
Bicep Curl
```

It could be also useful for "templates", where you could define a template without sets, but e.g. with progress and warmups:

```liftoscript
main / used: none / warmup: 1x5 45lb, 1x5 135lb / progress: lp(5lb)
Squat / 3x8 100lb / ...main
```

One **BREAKING CHANGE** is that if you don't specify the weight - it won't add 1RM percentage anymore based on reps/RPE. It'd be just empty weight field now, and will ask you about the weight on completion.

---
date: 2025-04-17
title: Add a way to create program days from Ad-hoc workouts
---

If you did an ad-hoc workout, you may want to create a program day from it (either in a new or existing program) - so you could do it again, or incorporate it into your programs.

It also lowers the barrier for creating programs - you don't have to create programs upfront, you can build them over time iteratively. You do ad-hoc workouts, then create program days from it, slap some progression logic on top of it, and you're good to go.

You can do that either after finishing the workout - from the congratulations screen, or if you tap on the past workout on Home screen.

---
date: 2025-04-13
title: Add "programNumberOfSets" and "completedNumberOfSets" read-only variables
---

Those could be useful for number of sets-based progressions.

Currently, there is **numberOfSets** variable, but it only shows how many sets currently in the workout total. There's currently no way to read how many sets are in the program for that week/day, or how many sets is currently completed.

Those 2 new variables return that. You can use them both in the progress and update scripts.

---
date: 2025-04-09
title: 📅 Tweaked the Calendar (Home screen)
---

Bringing back the infinite scroll to the Home screen!

A few months ago I added calendar to the Home screen, and removed the infinite scroll, showing only the currently selected week workouts instead.

The downside of that was that now the scrolling happens in 2 directions - horizontally (switching weeks) and vertically (scrolling the workouts) - not as convenient. Also, it used to be nice to see the currently ongoing workout on the top of the screen - that was removed with per-week workouts.

So, now the infinite scroll is back, and it will show the currently ongoing workout (if any) at the top of home screen. While you're scrolling the list, it will update the week insights and week calendar on top. And if you open the month calendar (by tapping on the week calendar) and then tap on the workout there - it will scroll to that workout.

---
date: 2025-03-30
title: New Workout Screen!
---

Workout screen was completely redesigned.

It now looks closer to all the rest of the workout apps, where each row is a set, and reps and weights are input fields. It still will prefill the fields with the values from the program, but you can change them if necessary. You don't need to change the fields though, just tap the checkmark if they already look right.

The **Target** column contains the requirements for the set - from the program. We still use the same color coding to distinguish between success sets (green), failed sets (red) and in-range sets (yellow).

You can swipe the sets, to edit the target, or delete the set.

Instead of one long list with all exercises, now there're tabs for each exercise at the top, and you can see the progress of each exercise there. Under each exercise there's graphs and history for that exercise.

🚨 **There's a breaking change!!!** 🚨. Completed weights now are contained in the **completedWeights** array var (used to be in **weights**). **weights** now contains the program weights. There's automated migration that should run and theoretically you don't need to do anything, but check your scripts to make sure it looks good.

---
date: 2025-03-09
title: Big changes in Liftoscript reuse syntax
---

The reuse syntax like **Squat / ...Bench Press** just became way more powerful.

- It now reuses **progress** and **update** scripts as well, including built-in like **lp** or **dp**.
- For "template" exercises (the **/ used: none /** ones) it's not required to have a custom or built-in exercise matching the name anymore. So, you can name your templates like **T1** or something like that, and don't create custom exercises with **T1** name.
- If you reuse **progress: custom()**, you don't have to list all the state variables again in the reusing **progress: custom()** arguments. They will be inherited, you only need to list the ones that have different value from the original ones.
- You can reuse exercises with multiple set variations too now.

It's a slightly breaking change because if you previously used **...Squat** it didn't reuse progress and update scripts, and now it does. So, if you want to reuse everything except progress/update - you'd need to overwrite them in the reusing exercise, like:

```liftoscript
Squat / ...Bench Press / progress: custom() {~ ~}
```

---
date: 2025-03-05
title: Added negative weights support
---

You can now use negative values for weights, e.g. **-5lb**.

That could be useful e.g. for the assisted Pull Ups with Leverage Machine, e.g. you can define it as:

```liftoscript
Pull Up / 3x8 40lb / progress: lp(-5lb)
```

and it will decrease the weight you load on the machine by 5lb each time you finish a workout.

Or you could do it like:

```liftoscript
Pull Up / 3x8 -40lb / progress: lp(5lb)
```

i.e. use negative weight as a base, and incrementing it over time.

---
date: 2025-03-04
title: Massive update where nothing is changed
---

I rewrote the Liftoscript engine from the ground up, to simplify it and remove the dependency on the old-style programs. It's now way easier to add new features to it, but that also means I'm replacing a system that was battle-tested for years with a new one. So, there could be bugs.

In case you see any issues with the Liftoscript or your programs - please please please let me know at **info@liftosaur.com**! Please include the account name (from Me -> Account) in the email. Thanks!

---
date: 2025-02-10
title: 📅 Added calendar
---

Now instead of a flat list of workouts on the Workout History screen, there's a calendar now.

At the top there's week calendar now, that you can swipe left and right to change the week. If you tap it - it opens monthly calendar.

You can switch whether a week starts from Monday or Sunday in Settings.

---
date: 2025-02-02
title: Redesigning the navigation
---

Changing the navigation quite drastically, to accomodate upcoming calendar. The following things changed:

- Footer buttons got changed - now there's "Home" for the history, "Settings" is renamed to "Me", and **"Measurements" got moved into "Me"**.
- To start a new workout, tap the Dumbbell button in the footer. **No way to start a workout from the history screen anymore!**
- If there's ongoing workout, tap the Dumbbell button again to get back to it.
- Each button in the footer resets the navigation stack. So if you go from Home to Program, there'd be no "Back" button. This is to make the app navigation more similar to other apps (like Instagram, Facebook, etc)

---
date: 2025-01-19
title: Redesigned the sets, and added PRs to history/exercise stats
---

Changed what the sets (on the history screen, in the program, etc) look like - now they laid out vertically, and it's easier to scan weight/reps for the sets.

Also added PRs indication to the history and to the exercise stats screens - highlighting if some set was a PR.

---
date: 2025-01-17
title: Share workouts on Social Media
---

You can share your finished workouts on Instagram (and once Tiktok approves Liftosaur app - on Tiktok)

You can do it from the congratulations screen, or if you tap on one of the past workouts. This replaces outdated "Share" functionality where you could share via a post on Facebook or Twitter.

It generates an image of a workout that you could share on some default background, or use your photo as a background. Or you can just generate a workout image via "... More" menu, and share it through native share sheet.

---
date: 2024-12-23
title: Added a way to generate program images
---

You can share them in the social media, chats, etc.

You can configure what the image would look like - how many columns (days) would it have, what days to include, etc.

Available in the Web Editor (the picture icon on the right), or in the kebab menu in the top right corner on the Program screen in the app.

---
date: 2024-12-14
title: Added day/week descriptions
---

Now you can add week and day descriptions, in Markdown format. Current week description will be shown on the history screen, and the day description will be shown on the ongoing workout screen.

You can do that through UI, or in the full program mode you just add comments above the day or week, similarly how you do that for the exercises. Like:

```liftoscript
// This is a description for week 1
// * Do this
// * Then do that
# Week 1

// This is a description for day 1
// **Do those exercises:**
## Day 1

Squat / 5x5 / progress: lp(5lb)
```

---
date: 2024-12-08
title: Added `print` function
---

Useful for debugging your scripts. Use it like:

```liftoscript
Squat / 3x3 / progress: custom() {~
  print(1, completedReps[1])
~}
```

It accepts any number of arguments, and outputs them in the playground or during a workout. Unfortunately Liftoscript still doesn't support strings, but you can use numbers to distinguish prints, like:

```liftoscript
Squat / 3x3 / progress: custom() {~
  var.a = 10%
  print(1, completedReps[1])
  print(2, 30lb)
  print(3, var.a)
~}
```

You can use them both in **progress** and **update** scripts.

---
date: 2024-12-07
title: Added ongoing workout reminder push notification
---

In case you forget to finish the workout, there will be an additional push notification that will remind you that you have an ongoing workout.

It's mostly useful if you keep forgetting to finish it, and then you open it in like 5 hours, and it syncs to Apple/Google Health, and your calories stats go crazy.

You can control the delay when it will notify you on the Settings - Timers screen. By default it's set to 15 minutes.

You need to update the app from App Store or Google Play to get the feature.

---
date: 2024-11-30
title: Added Week Insights
---

After each week workouts on the Workout History screen - there'll be a card with "Week Insights".

It's pretty much the same as "Week Stats" on the Program screen, but for the actual week - it'll show how many sets total, hypertrophy/strength split, sets per muscle group you did with the workouts that week.

It can help you analyze your performace in case you skipped workouts, or did Ad-Hoc workouts, or mixed different programs.

It's a Premium-only feature! 💵

---
date: 2024-11-17
title: Added some convenience shortcuts
---

Now you can change the next day or start empty ("Ad-Hoc") workout from the history screen.

On the workout screen there's "Equipment" and (if exercises uses it) - "1RM" links. They open modal to edit those, and in Equipment you can define availables plates right from the modal.

Added big bold "Start" and "Continue" buttons to the start workout card, because some new users were confused how to start a workout.

---
date: 2024-11-09
title: Improve experience with kg units
---

Now all the newly cloned programs will be automatically converted to the unit (kg or lb) you have selected in Settings. And if you import a program via link, and it has different units from the Settings one, it'll ask you if you want to convert into the Settings units.

Also, for the new users the app will ask to pick your units before choosing a program.

---
date: 2024-11-03
title: Change numberOfSets in progress scripts
---

Now you can change **numberOfSets** in the progress scripts. So, sets based progressions just got way easier to do. Before you had to use either **numsets** state variable + update script, or use multiple set variations. Now you can just do **numberOfSets = 4** or **numberOfSets += 1** in your progress scripts.

**numberOfSets** also behaves a bit differently now both in **progress** and **update** scripts - if you add sets, it'll add them the same as the last set you had before. So, most of the time you don't need to pair it with the **sets()** function anymore. E.g. if you have **2x4, 3x8 / 100lb** and you do **numberOfSets += 1** - you'll end up with **2x4, 4x8 / 100lb**.

In **progress** scripts you can also specify what week/day/set variation specifically you want to change number of sets for, by doing **numberOfSets[week:day:setvariation] = 3**, for example: **numberOfSets[2:*:2] = 3**.

---
date: 2024-10-11
title: Apple Health and Google Health Connect integration
---

Now you can submit workouts and body measurements to **Apple Health** and **Google Health Connect**.

For the body measurements - it will submit your bodyweight, body fat, and (Apple Health only) - waist circumference.

It will also read the bodyweight/bodyfat and (Apple Health only) waist circumference from Apple Health or Google Health Connect, and add them to the app.

You can enable that in the Settings - Sync - Apple (or Google) Health.

It's available for **Android 14** and for **iOS 15** and higher.

---
date: 2024-09-22
title: Pausing a workout
---

You can now pause the workout, by tapping the pause button in the workout screen header. It'll stop the total workout timer.

You can unpause it the same way, or just log any set - it'll unpause it too.

---
date: 2024-09-14
title: Custom unit (lb/kg) for equipment
---

Now equipment can override the default unit (lb or kg).

The weight of an exercise would be converted to that unit if that equipment is attached to the exercise. You would see the weight in that unit in the history too, but not on graphs - graphs still use default unit.

That could be useful if you have equipment with different units in your gym - like some machines are in lb, some plates are in kg - that way you can properly track all of them.

To make it even better - you may want to use a matching unit in the program exercise as well, to avoid any conversions at all. Like if you live in the US, and you have default unit as lbs, but the gym you usually go has "Lat Pulldown" cable machine in kgs - it makes sense to specify weights in kg for Lat Pulldown, and set it to the kg-based equipment.

---
date: 2024-08-25
title: 💸 Introducing localized pricing
---

It was a bit unfair to ask the same price for users from US and e.g. Afganistan or Phillipines, since the purchasing power is so different in those countries.

So now the pricing is adjusted according to the country GDP per capita. E.g. it now costs **$5/$40/$80** for monthly/yearly/lifetime in **US**, and **$2.5/$20/$40** in **Turkey**, and **$1/$8/$16** in **Phillipines**.

---
date: 2024-08-10
title: Custom Exercise Images
---

Now you can optionally set exercise images to your custom exercises. You can provide URLs for a small image (used across the workout screen/program preview/etc) and a large image (used on the exercise stats screen).

---
date: 2024-08-08
title: Settings - Exercises screen
---

A lot of users were finding it weird you can only make 1RM or equipment adjustments for exercises during a workout. Which makes sense, so I added a separate "Exercises" screen that you can access from the "Settings" screen ("Workout" section).

You can see exercises grouped by the ones used in your current program, and the ones you did previously, but not included into the current program. You can filter them by name, type, muscle groups, etc.

And for each exercise you can see their 1RM and currently attached equipment (or default rounding if no equipment attached).

---
date: 2024-08-03
title: Program Version History
---

There's still a way to lose your program changes you did e.g. in the Web Editor, if immediately after saving on the Web you change a program in the app (e.g. by finishing a workout, or changing a program weight) - then the changes from the app will overwrite the changes from the Web.

That could be super frustrating. So as a way to fix that, I'm adding **Program Version History**.

Now each time you save a program (both on the web or in the app), it creates a snapshot of the program. You can access the history of all the snapshots in the Web Editor (there's **Versions** link there, that opens a modal with all the snapshots), and restore any of the past snapshots. I'll store up to 100 recent snapshots.

Hopefully it'll reduce the chances of losing your program changes, and make the process less frustrating!

---
date: 2024-07-31
title: Updates related to syncing and program saving
---

I did a massive under the hood update how the app syncs changes with the server, to ensure it only sends the necessary (that actually changed) data. Hopefully it'll make the data sync faster and more reliable. There're also some user-facing changes related to that:

- The Web Editor now has the "Save" button, and the programs don't autosave anymore. Autosaving sometimes worked pretty inconsistently, and it wasn't clear whether the changes got saved or not, so I'm trying to solve it with explicit saving.
- The app now has "Pull-to-refresh" functionality - pull the screen to the bottom to force fetch the data from the server. Could be useful if you make the changes on the Web Editor, and want to sync them immediately to the app.
- The app also will try to sync when it goes from background to foreground.

---
date: 2024-06-12
title: Changed how equipment works and added multi-gym support
---

⚠️ This is a breaking change! Please read! ⚠️

Exercises in Liftosaur used to consist of 2 parts - exercise name and equipment. For example: **Bench Press** and **Dumbbell**, or **Squat** and **Barbell**. And when you select an exercise, you have to pick both equipment and name.

There were several issues with that, but mainly two:

- It was confusing for new users to **pick the equipment AND exercise name**. The fact that you need to pick equipment first, and then tap on the exercise name, even if you just want to change the equipment for the current exercise was very weird.
- **Equipment was tied to the available plates**. So, if you wanted to change bar/plates (like to a different barbell) - but keep the old ones - you'd get a new exercise, with the new history, graphs, etc - which sometimes was undesirable.

In this change I'm trying to simplify it - now exercise only consists of the exercise name. So, there're exercises like **Bench Press, Dumbbell** and **Bench Press, Barbell** - but those are 2 different exercises and exercise names.

Equipment is separated from the exercise now, and it defines only the plates/bar/fixed weights. You can attach equipment to your exercises, and that will be used for rounding and plates calculator - but that's optional!

So, for example, you can have **Squat, Barbell** exercise, and attach e.g. **Olymplic Barbell** equipment with 45lb bar and one set of plates. Or attach **Standard Barbell** with 35lb bar, and a different set of plates. Or don't attach any equipment - and just specify the default rounding - but in that case you won't have plates calculated.

Or you may have **Bicep Curl, Dumbbell**, and attach **Fixed Dumbbells** or **Loaded Dumbbells** to it for rounding and plates calculation.

It also changes how custom exercises work. You cannot choose equipment for custom exercises anymore - only the name. So, if you had custom exercises with different equipment or even custom equipment - they will be migrated to "equipment-less" new exercises.

Another new feature is **Gyms**. You can create another **Gym** and specify different set of equipment for it. For each exercise you can specify equipment from each gym. And you can change the current gym in Settings, and that will define what equipment would be used for exercises.

Gyms are totally optional, and by default you only have one. But it could be useful if you **go to multiple gyms**, or if you're **travelling** - then you can just create a new gym but don't attach equipment from it to exercises. In that case they'd just use default rounding, which could be good enough for travelling - you probably don't want to enter all the equipment details for temporary gyms.

I know I say that a lot, but - that's a very big new feature, so could be bugs - so don't hesitate to email me at **info@liftosaur.com** or contact via Discord/Reddit if there're issues!

---
date: 2024-05-25
title: Add UI for tweaking programs
---

Liftoscript is an amazing way to define weightlifting programs, but typing on the phone could be tedious. Sometimes you need to tweak your program on a phone, while you're in a gym - adjust warmups, reps, weights, replace/add some exercises. But it's not very convenient to do it in a plain text editor on a phone.

So now there's a UI mode for editing the programs, which is the default mode on a phone. You can do almost anything you could do in a plain text editor except defining progress, update blocks, descriptions and tags.

You can still switch to the plain text mode by tapping on ::icon-doc::, and adjust the program text. Also, for the Web Editor the plain text mode is still the main way of editing programs.

That's a very big feature, so could be bugs - don't hesitate to email me at **info@liftosaur.com** or contact via Discord if there're issues.

---
date: 2024-05-06
title: "Quick-add sets" is now per set variations
---

It used to be per whole exercise, so even if you add **1+x5** in one of the days/weeks for your exercise, it'd apply to ALL days/weeks (or set variations) in a program for that exercise.

It's a bit inconvenient if you only want to have this feature enabled on certain days/weeks. So, now "Quick-add sets" is per set variation - if you have **1+x5** on day 1, and **1x5** on day 2, you won't have "Quick-add sets" enabled on day 2.

⚠️ This is a breaking change though! ⚠️ If you use this feature, you likely would need to change your program to enable it across all weeks/days where you want to have it, not only the first week/day of the exercise!!!

---
date: 2024-04-21
title: Added rich reps / weight / rpe inputs
---

Now all the modals (like modal when you edit a set for the current exercise, modal when you edit weights, or the AMRAP modal) have "rich" inputs for reps, weight and RPE. They have buttons allowing to adjust the values, weight inputs have a Rep Max Calculator, and the buttons increment and decrement various values properly.

For example, it'd increment/decrement weights according to available equipment - getting next possible weight with your plates. And for reps - it increments by 1, and for RPE - by 0.5

---
date: 2024-04-20
title: Added tags
---

Now you can add **id: tags(123)** to your exercises, and then change state variables of that exercise from a progress block of another exercise. For example:

```liftoscript
Squat / 3x8 / id: tags(123) / progress: custom(rating: 0) {~ ~}
Bench Press / 3x8 / progress: custom() {~
  state[123].rating = 2
~}
```

That **state[123].rating = 2** will set state variable rating in **Squat** to **2**.

It's kinda a niche feature, but could be useful for some programs.

---
date: 2024-04-17
title: update - custom() improvements
---

You can use state variables defined in **progress: custom()** in your **update: custom()** scripts.

Also kinda breaking change, but also now **update: custom()** script would run right after starting a workout. Before completing any sets. With **setIndex == 0**.

You can use that to programmatically configure your workout

---
date: 2024-04-15
title: Added a bunch of new programs
---

Namely:

- 5/3/1: Boring But Big
- 5/3/1: Building The Monolith
- nSuns LP
- Madcow 5x5
- PHUL
- Phrak's Greyskull LP

---
date: 2024-04-13
title: Quickly change weights in a program exercise
---

For the old programs, it was pretty convenient to just change **state.weight** state variable to adjust the weight across the sets of the exercise.

In the new plain-text syntax, it got more complicated - if the program is not 1RM-based, you'd need to edit the absolute weight in the program text. Which could be quite cumbersome, especially if you have multiple weeks to adjust.

So I added a way to quickly change the weights in the program exercise, in the "Edit" modal on the workout screen. It lists all the weights used by the exercise in a program, and you can quickly adjust them, either by typing, or by buttons, and there's also a Rep Max Calculator for convenience.

---
date: 2024-04-03
title: All built-in programs are migrated to the new syntax
---

All the built-in programs now use the new **Liftoscript 2.0 (aka Workout Planner)** syntax.

Also, by default you now create the programs with the new syntax.

---
date: 2024-04-01
title: Loops
---

You can now write **for** loops in the Liftoscripts.

Looks like this:

```liftoscript
Bench Press / 3x8 / progress: custom() {~
  for (var.i in completedReps) {
    weights[var.i] = weights[var.i] + 5lb
  }
~}
```

In this case, **var.i** would contain an index of a set, starting from 1.

---
date: 2024-03-28
title: Improved reusing of sets, reps, weight, RPE, timer and warmups
---

Now the **...Squat** syntax would also reuse the warmups.

Also, you can override the reused weights, RPE and timer. For example, if you do:

```liftoscript
Squat / ...Bench Press / 200lb
```

Then it would reuse sets x reps, timer, RPE and warmups from Bench Press - everything except the weight.

---
date: 2024-03-18
title: Redesigned exercise picker and ability to replace exercises from the workout and new editor screens.
---

There's a new exercise picker modal, that now combines equipment selection + exercise selection, and also the "Substitute" feature.

There's also a new "Swap" exercise feature on the workout screen (the ::icon-swap:: icon), where you can replace exercise for this workout only, or for the whole program.

And now you can replace the exercise across whole program in the new Liftoscript 2.0 editor, both in Web and app. You were able to do it before as well with Find & Replace, but now there's simpler UI for it.

---
date: 2024-02-05
title: New update - custom() syntax for updates after completed sets (in the "Experimental" programs)
---

Now you can dynamically make updates in reps, sets or weights. Like for example, if you want to have AMRAP on the first set, and then based on the completed reps of that set adjust the reps of the rest sets, you can do it now. Do something like:

```liftoscript
Squat / 1x6+, 3x3 / update: custom() {~
    if (setIndex == 1) {
      reps = floor(completedReps[1] / 2)
    }
  ~}
```

and that will make the rest of the sets update after finishing the first set.

That **update** script is run after completing every set or updating completed reps on the set. It's available only in the new "Experimental" programs.

In that script, you may change **reps**, **minReps**, **weights**, and **RPE** variables. It doesn't change a program, and you cannot access state variables, but you can access any other built-in variable.

You can target all incompleted sets (by using **reps = 3**, **weights = 40lb**, etc), or you can target specific sets (e.g. **reps[3] = 10**)

---
date: 2024-01-27
title: ✨ New "Experimental" programs (aka "in-app Workout Planner") ✨
---

Massive update - now there's a way to build Liftosaur programs using completely different syntax - the one that you used in the [Workout Planner](https://www.liftosaur.com/planner)

The syntax got extended with the new features, making it pretty much as powerful as a regular way of building programs. You now can use Liftoscript within the new syntax to describe the progressions.

Basically, the new programs is just one blob of text, and it changes over time based on your progressions. You can define set variations, quick add sets, descriptions, ways to switch between them, etc - everything is possible!

To create that "experimental" program, just go to **"Choose Program"** screen, tap on **"Create"**, and tap the **"Create experimental program"** button.

Read more about new syntax and how to write programs that way [in the blogpost.](https://www.liftosaur.com/blog/posts/new-experimental-program-editor/)

IMHO it should be much easier to build programs this way. Eventually I'd like to make it a default way of writing programs in Liftosaur. So, check it out, and don't hesitate to ask questions in our Discord channel, subreddit, or just shooting email to **info@liftosaur.com**!

---
date: 2024-01-06
title: Added ability to set 1 Rep Max for exercises
---

1RM would be reused across programs, and is tied to exercise themselves, not programs. You still can access it in the Liftoscript scripts via **rm1** variable, and you can set it in the Finish Day Script too.

I.e. you can do things like `rm1 * 0.9` in your Weight Liftoscript expressions, or things like `rm1 += 5lb` in your Finish Day Scripts

You can edit 1RM on the Exercise Stats screen (when you tap on the exercise name on the workout screen). Also, it'll show up on the "Edit" modal (when you tap on the Edit icon on the working screen) in case it was used anywhere in the program exercise scripts.

That should be a good way to make 1RM of the exercises transferrable between programs.

---
date: 2024-01-03
title: Added "Full Program" mode to the Workout Planner
---

Now there's a new "Full Program" mode in the [Workout Planner](https://www.liftosaur.com/planner). You can activate it by clicking on the ::icon-doc:: icon near the "Convert to Liftosaur program" button. It represents the planner program as one big text blob. That could be pretty convenient for editing programs, especially multi-week ones. You can save those programs as text files, edit them in any text editor, share them as text blobs.

It adds 2 new syntax constructions you need to use in the "Full Program" mode - for weeks and for days. To create a week, you type a week name from a new line, starting with a hash sign. Like **# Week 1**. To create a week - same thing, just starting with 2 hash signs, like **## Day 1**.

There's also a bunch of features built-in into the Workout Planner editor:

**Find & Replace** - you can even use regular expressions for powerful replacing

**Multicursor typing** - you can set several cursors (by Cmd+click or Ctrl+click), and type in multiple places simultaneously.

---
date: 2023-12-25
title: Improved Program Preview in the app and Web Editor
---

🎄 Merry Christmas! I tweaked the program preview page in the app (both for built-in and your programs), and also added Program Preview for the Web Editor.

You can use it to get a quick glance at the whole program, try your state var values (e.g. your weights) there. You can also enable "Playground" mode, and try how finish day scripts work for various exercises when you finish all sets.

It should be especially useful for the Web Editor, before it was sometimes pretty tricky to understand if your program works properly, especially if it has a bunch of set variations. There was Exercise-level Playground, but wasn't Program-level Playground, and now there is!

---
date: 2023-12-07
title: You can now fully delete your account
---

Added deleting account on the cloud. It's available on the Settings - Account screen.

Now you can be in control of your data, and fully wipe out all your data from the Liftosaur servers if necessary!

---
date: 2023-10-16
title: Changed how Web Editor program links work
---

It used to be that when you edit a program in a web editor, it'd update the link right in the URL bar, and the short links like /p/123abc would just redirect to the long links with whole program presented into a URL.

But apprently there's 10K limit in the URL length, so it was breaking for some large programs. So, I had to change how it works. Now, when you edit a program, you need to generate a link to "Save" it, each change won't automatically update the browser history. It'll also show a warning (that you can close) when you change a linked program that in order to "Save" the changes, you need to generate a new link that'll represent a changed program.

---
date: 2023-09-27
title: Offline mode
---

Liftosaur now can work offline. If there's no Internet, it of course won't be able to load all the built-in programs, and it won't be able to sync your data to the server. But it'll still work, all your history and programs would be there, and it will just sync the data next time when Internet is available if you're logged in.

---
date: 2023-09-22
title: Moving Average on the Measurement Graphs
---

Now, on the Measurement screen, for the graphs there you can add moving average graph. It's super useful especially for tracking bodyweight or body fat, due to high volatility of those measurements. This was added by awesome [@123marvin123](https://github.com/123marvin123), thank you so so much for contributing and adding this feature! It'll help a lot of people tracking their weight, and it's a great addition to Liftosaur. Thank you very very much!

---
date: 2023-09-20
title: Added Rep Max Calculator
---

It's located near weight state variables. You can enter the known weight, reps and RPE, and target reps and RPE, and it'll calculate the weight for you.

For actual Rep Max, use RPE = 10.

---
date: 2023-09-02
title: Added rep ranges support
---

There's a new "Extra Feature" you can enable for exercises now - **Rep Ranges**. If you turn it on, you can specify optional **Min Reps** Liftoscript scripts for each set in an exercise. On the sets, you'll see rep ranges instead of just a single rep number.

If the reps are less than max reps, but more or equal than min reps, the set will be yellow, both in the workout and in the history.

If the min reps are enabled and provided, you'll have them available in the **minReps** variable in the Finish Day scripts. If they're not enabled or provided, they'll use **reps** (i.e. max reps) variable values. For example, you don't have min reps for the first set, but max reps are **5**. Then, `minReps[1]` would be **5**.

---
date: 2023-08-31
title: Added multi-week support
---

Now for programs you can enable "Multi-week" mode. That adds **Weeks** - they are similar to **Days**. Like you add exercises to Days and can reuse exercises between days - now you can add Days to Weeks and reuse Days between Weeks.

That makes it easier to create multi-week programs with mesocycles, deload weeks, 1RM testing weeks, etc. You can create regular days, deload days or testing RM days, and then create e.g. 6 weeks with regular days, and then 1 week with deload days.

When multi-week mode is enabled, the program follows the order of days in weeks. I.e. when you finish a workout, it'll go to the next day in the week, or when it was the last day in the week - goes to the first day of the next week.

There are also new variables available for all the Liftoscript scripts - **week** and **dayInWeek**. You can use them to define logic based on the week number, or week day number.

---
date: 2023-08-22
title: Added visual cues when rounding weights
---

It's currently very confusing when and why we round the weights, especially for the new users of the app. It looks like a bug in the app because it's unexpected, but it just tries to round the weights to your available equipment.

So, from now on, it'll show strikethrough original weights, and the weight it was rounded to. Also, will show a little help message, explaining where you can adjust the equipment.

The rounding logic is slightly different now - we round the weights only at the very end, during the workouts. State variable changes are not rounded at all.

If this change somehow breaks the rounding logic in your program, please contact in Discord or by [info@liftosaur.com](mailto:info@liftosaur.com). It shouldn't break anything, but I could miss some edge cases...

---
date: 2023-08-04
title: Added RPE support
---

RPE (Rating of Perceived Exertion) now is well supported in Liftosaur. It's how hard was the exercise, on the scale of 0-10, where 10 is the hardest (you couldn't make any more reps)

Now you can enable RPE support for your exercises (in Extra Features section), and each set will have 2 additional fields: **RPE** and **Log RPE**.

For RPE, you can provide Liftoscript expression, that would define required RPE for that set.

If you enable "Log RPE", it'll ask you for YOUR perceived RPE value when you finish the set.

You can access the required RPE values via `RPE` and logged RPE in `completedRPE` variables in the Finish Day Script.

Using that, you can define progressions based on RPE, e.g. comparing if your RPE was lower than required RPE - then increase the weight, or something like that.

On the history and workout screens, we show required RPE like **@8** (gray color) and logged RPE like **@9** (orange color), prefixed by **@** sign.

---
date: 2023-07-29
title: Add better volume support
---

Now there's a switch between volume and max weight for exercise graphs.

There are also muscle group volume per week graphs

There's also volume in lbs added to the exercise stats screen and also previous workouts.

---
date: 2023-07-27
title: Import history from Hevy app
---

There's a new item in Settings - "Import history from other apps". It opens a modal, where you can choose Hevy app, and upload CSV file - and it'll import the history from the file into Liftosaur.

---
date: 2023-07-24
title: Make the rest timer adjustable
---

Now you can adjust a running rest timer. Tap on the timer on the right bottom corner, it'll expand, and you can add time, reduce time, or cancel the timer completely.

---
date: 2023-07-16
title: Improve exercise selection modal
---

Now listing target, synergetic muscle groups, and also the "type" of the exercise (pull, push, upper, lower, etc) for each exercise.

Also, now you can filter by the "type" and by muscle groups. E.g. you can list all the pull exercises with the chest muscle group, or something like that.

You can assign the "type" to your custom exercises now too.

---
date: 2023-07-12
title: Add Custom Equipment
---

Now you can create your own **custom equipment** (in Settings -> Available Equipment).

It could be useful if you have multiple Cable machines with different plate weights for different exercises, or you want to create some custom equipment like "Safety Squat Bar", where the bar weights more than regular olympic bar.

Custom Equipment has all the same properties as built-in equipment (fixed/non-fixed, plates configuration), but also additionally you can specify the name, and "Similar To" field.

"Similar To" for now only used for the exercise images, so if you create new equipment "Cable 2", with different plates, you can set "Similar To" to "Cable", and it'll use cable exercise image.

You now also can edit equipment in the Web Editor's Settings modal. You can create new equipment there (e.g. Safety Squat Bar), and assign to your exercises there. Custom equipment is properly exported into a link when you create a link of a program to share.

---
date: 2023-07-04
title: Switched "reps x sets" to "sets x reps" on the history screen
---

It was kinda confusing since widely used format is "sets x reps".

So now it's "sets x reps"

---
date: 2023-06-30
title: Bodyfat tracking
---

Liftosaur is [open-source](https://github.com/astashov/liftosaur), so anyone can see the code, and potentially add features. Amazing [@codymurdoc](https://github.com/codymurdoc) went ahead and added bodyfat tracking support to Liftosaur! This is so cool, thank you so much! It's really impressing you were able to figure out how to do that in pretty large codebase, and add it in a clean and nice way, it's a pretty big feature. I'm really impressed!

---
date: 2023-06-25
title: Added Long Press to edit the quickly edit the sets in current workout
---

Now, you can do long press on a set square (for 1 second), and it'll open the edit set modal - the same one that you get if you press on the Edit icon, choose "Only in this workout", and then tap on a set.

That works both on the workout screen, and also in playgrounds on the edit program exercise screen. But on the playground, it won't change the program! It's just to simulate the logic if you change the sets only in current running workout.

Hopefully that'll make it easier to handle the cases when you want to deviate from a program for some reason only for that workout (change the weight for some set, or number of required reps, etc).

---
date: 2023-06-24
title: Made "Quick Add Set" supported in playgrounds
---

So it's easier to test your program exercise logic when you have "Quick Add Set" feature enabled.

---
date: 2023-06-13
title: Added sound controls to iOS / Android apps
---

If the sound of the rest timer is too loud or too quiet, you can now adjust it in the app. There's a Volume slider now, as well as a toggle to enable vibration when rest timer ends.

You need to get the new version of the app from App Store / Google Play to get this feature.

---
date: 2023-06-11
title: Added a way to add labels to sets
---

Similar like there's a label "Warmup" for the warmup sets, you can add short labels to workout sets as well. You can use it to mark sets as **"Drop set"**, or **"RPE 7"**, or **"TM 70%"**, or something like that. The space is limited, so the label is 8 characters max.

You can specify labels on the "Edit Program Exercise" screen, where you specify reps, weights and AMRAP.

---
date: 2023-06-09
title: Added new functions - sum, min and max
---

You can use them in your scripts to find e.g. min or max completed reps, or sum of all reps. They work on variables that are arrays, like `reps`, `weights` and `completedReps`.

Like this: `state.allCompletedReps = sum(completedReps)`

---
date: 2023-05-24
title: Added "Always On Display" in Settings
---

If you want to keep your screen always on during the workouts, you can enable it in Settings. You need to update the app for that though.

---
date: 2023-05-11
title: Improved program exercise timer expressions
---

Now you can use not only state variables there, but also the workout variables. Like, `completedReps`, `weights`, `numberOfSets`, etc.

Also, added new variable specifically for the timer expression - `setIndex`. It contains the index of the just completed set. You can use it to change timer based on the set number. Or to set a timer between exercises (`setIndex == numberOfSets ? 90 : 180`).

---
date: 2023-05-01
title: More Liftoscript features
---

Added modulo operator **%** to Liftoscript. I.e. **7 % 2 == 1**, or **5 % 5 == 0**. It's useful for creating programs with repeating patterns.

Then, added functions **floor**, **ceil** and **round**. You use them like **state.foo = floor(23.4)**. Use them if you need rounding.

Also, finally added increment assignment operators, like **+=**, **-=**, **\*=** and **/=**. Use them like **state.foo += 5lb** - that'd increase `foo` variable by 5lb.

---
date: 2023-04-30
title: New Liftoscript Engine
---

The internals of Liftoscript are fully rewrote to a new engine. It's more strict, and it will better find syntax errors, missing variables, and it's generally more correct. Also, it will be way easier to add features to it now.

⚠️ But because it's stricter, it may consider your previously valid scripts invalid now. **If you get an error - please go to edit exercise screen, and fix the errors!**. Otherwise, it may not calculate your reps/weights properly when you finish exercise.

---
date: 2023-04-22
title: Quick add sets
---

Add a way to enable "quick add sets" feature for a program exercise. When enabled, there'll be a button on the workout screen after last set, that allows to add another set. On press, there'll be a modal, where you specify required sets and weight. It also is marked as completed automatically.

Also, there are 2 new variables available in Finish Day Script - **numberOfSets**, and an alias for it - **ns**. They contain the number of sets for the exercise at the end of the workout.

You can use this to create set-based programs. E.g. increase weight if you did more than 5 sets with 4 reps each, or if you did at least 5 sets, and last set reps were more than 8. To access last set weight or reps, you can use **weights[numberOfSets]** or **reps[numberOfSets]**.

---
date: 2023-04-19
title: Program Exercise Descriptions
---

You can now add exercise descriptions when you edit a program exercise. You can add any tips how to do it, reminders, or some notes, that'll persist between workouts. You can use markdown for formatting.

---
date: 2023-04-09
title: Edit state variables from workout screen
---

You don't need to go to the edit exercise screen to edit the state variables anymore. Now you can do it right from a modal that pops up when you tap "edit" icon on the exercise card, on the workout screen.

---
date: 2023-03-30
title: User entered state variables
---

Now you can make a user to provide a value for the state variable when they finish an exercise. For that, there's a checkbox when you create a state variable.

That's useful e.g. for the programs that use RPE (Rating of Perceived Exertion) or RIR (Reps in Reserve) for progressions. Or if you want to manually choose the weight for the next workout. Or something like that.

---
date: 2023-03-24
title: Per Exercise Rest Timers
---

Now you can specify custom exercise rest timers. By default it still would use your workout timer from Settings, but you can override it for some exercises. So now you can have different rest timers for Deadlift and Bicep Curls!

You specify timer as a Liftoscript expression, similar to reps and weight, so you can define logic there too, and use state variables. Progressive overload in your rest timer? Why not! :)

---
date: 2023-03-19
title: Discord Server
---

We've got a Discord server now! You can join it here: [::icon-discord:: Discord Server](https://discord.com/invite/AAh3cvdBRs)

Join and ask questions there, suggest features, leave feedback, or just chat with other Liftosaur users.

---
date: 2023-03-01
title: Notes
---

Added ability to add notes to the overall workouts and specific exercises during workout. You can then see those notes on the History screen, on the exercise details screen, and also on the Graphs.

You can also filter the history on the exercise details screen by whether the history record had notes for that exercise.

---
date: 2023-02-24
title: Inspirations in the Advanced Edit Mode
---

Now in the "Advanced" mode of the exercise editor (both on a phone and in the web editor), there's a link at the top that opens a modal with various examples of the reps/weight and finish day scripts.

You could use it for "inspiration", to reuse some of the recipes, or come up with your own based on those. Or just to see what you can do with **Liftoscript**.

---
date: 2023-02-22
title: Web Editor for programs
---

There's a new web editor for programs, so you could edit the programs from a laptop - [liftosaur.com/program](internal:/program). You can create a program there, then copy the link, and paste it into the app (on the program selection screen). You can also generate a link for any of your programs (on the program edit screen), and open in the web editor, edit there, copy link again, and paste it into the app to import the changes.

Those links are immutable - any change in the program would change the link. You can share those links if you want to share your program with somebody else, and they'll be able to import the program into their app.

---
date: 2023-02-09
title: Choose Programs screen redesign
---

Now it shows all the exercise images a built-in program contains, as well as the required equipment and approximate time to finish a workout from the program. Hopefully it'll help with choosing the right program.

---
date: 2023-02-07
title: Footer navigation
---

We've got complains that the footer navigation is confusing. And indeed, the left part was different from screen to screen, and it sometimes was hard to understand where are you.

So, now the footer nav is always the same across all screens. The screen-based buttons got moved to either 3-dot menu in the navbar, or to regular buttons right on the screen.

Also, had to move the rest timer from the footer, now it's a floating timer, that is visible on all screens. If you tap on it, you will go to the currently ongoing workout.

---
date: 2023-01-21
title: Exercise Stats
---

Added Exercise Stats - a new screen that shows various statistics for an exercise. It shows the graph, the personal records, the history of the exercise. You can switch between different exercises right on that screen.

The entrypoint to that screen is from the workout screen - when you tap on the exercise name, exercise image, or when you open the bottom sheet - there's an option "Exercise Stats"

---
date: 2023-01-15
title: Program Preview
---

Added Program Preview, that shows the high-level overview of a program. It lists all the days and exercises, all the sets variations (sets/reps/weight), you could see the formulas/scripts for each exercise, and muscles for each day and the whole program. You can use it for 2 cases:

- When you pick a built-in program, there's a "Preview" button in the modal with the program info. So you could see now what you sign up for.
- When you build your own program, there's "Preview" footer button. If will give you high-level overview of the program, and could help to make sure everything works right there.

---
date: 2023-01-11
title: Graph Improvements
---

- Using 2 fingers, you can pinch-zoom graphs now.
- Also using 2 fingers you can move the zoomed area.
- By double-tapping a graph, you can reset the zoom and return to its original size.
- Added vertical lines on the graphs when program was changed.
- Added a link in the legend to the selected workout on the graph.
- Removed the horizontal line on the cursor, since it was pretty useless.

---
date: 2022-12-28
title: Add Reuse Logic feature
---

If you have multiple exercises in a program that share the same logic for sets, reps and weight, and also logic for updating those, you now can "reuse logic" from other exercises. This way you can avoid repeating the same logic over and over again, and you'll have a single source of truth for that logic (in the exercise you reuse).

It should be useful for most programs, since usually they have multiple exercises following the same progression/deload pattern.

Each exercise still has its own state variables values, but it must have the same variable names and types.

---
date: 2022-12-26
title: New Account Management.
---

Now you can have multiple local accounts, and manage them and switch between them. Also, the whole Account screen was updated.

---
date: 2022-12-25
title: Redesign.
---

Big redesign of the whole app! Hopefully it's more visually pleasant, and makes more sense than the previous one.

---
date: 2022-08-08
title: Big changes in the equipment settings.
---

You can now specify plates separately for each equipment type - barbell, dumbbell, cable, etc.

Each equipment type now supports "fixed" weights, without plates, e.g. if you use fixed weight dumbbells.

---
date: 2022-06-04
title: Add 1 Rep Max line to the exercises graphs.
---

It better shows the progress trend, since it combines weight and reps into one value. We use [Epley formula](https://en.wikipedia.org/wiki/One-repetition_maximum) to calculate it. It's enabled by default, but you can disable it in settings on Graphs screen.

---
date: 2022-02-19
title: Import/Export of all data and also specific programs.
---

You can now export all your data into a file (history, settings, etc), and then import it later on.

Also can export and import programs. Could use it to e.g. share a workout program with a friend, or as a backup, or for some other reason.
