# Liftosaur features

One section per page of https://www.liftosaur.com/features, generated from docs/features by scripts/build-llms-features.ts. Liftoscript syntax is in liftoscript.md.

## First Run and Settings

Category: Start here. Page: https://www.liftosaur.com/features/first-run-and-settings

Pick your units, equipment and program on the first run, then tune the Me tab: dark mode, text size, week start, Always On Display and more.

### Starting for the first time

The first screen shows five short slides about the app. They change on their own every 5 seconds.

Tap **Get started** to begin setup. Tap **I have an account** to sign in and pull your data from the cloud. See [Account](/features/account) for sign-in options.

### Picking your units

The **Pick your units** screen has two buttons: **Pounds (lb)** and **Kilograms (kg)**. Pick one and tap **Continue**.

This becomes the default unit for programs and weights. You can change it later under **Me → Weight Units**, or per equipment type.

### Setting up equipment and plates

The **What equipment do you have?** screen lists equipment types with a toggle for each. Turn on the ones your gym has. The app uses them to round program weights to what you can load.

Tap **Set up plates** to enter the bar weight and plates for each equipment type, then tap **Continue**. Tap **Skip** to keep the defaults.

Next, a short survey asks where you heard about Liftosaur. You can tap **Skip**.

See [Equipment and gyms](/features/equipment-and-gyms) for how rounding works and how to change this later.

### Choosing a program

The **Choose your program** screen has four options:

- **Pick a built-in program**: choose from routines like 5/3/1 and GZCLP. See [Built-in programs](/features/built-in-programs).
- **Create a program**: build your own from scratch. See [Program editor](/features/program-editor).
- **Import from link**: paste a link from the program web editor. See [Sharing programs](/features/sharing-programs).
- **Go without program**: run ad hoc workouts and build the program along the way.

After you pick a program, the app opens the Home tab.

### Tours and help tips

Until you have finished 4 workouts, the app shows a tour the first time you open the workout screen, the program editor, and the program exercise editor. Each tour is a set of cards with **Next →**, **← Back**, and **Done** buttons. Tap the X in the corner to close it early.

Every screen with a tour or a help page has a question-mark icon in the top right corner. Tap it to replay the tour or open the help page. The **Me** tab opens a help page about settings.

Some screens show a tip box with a question-mark icon. Tap its X to close it. A closed tip stays closed.

### The Me tab

Tap **Me** in the footer. The top row is **Program**, showing the current program name. Tap it to switch programs. Below it, the settings are grouped:

- **Account**: **Account** shows your email or "Not signed in" ([Account](/features/account)). **Nickname** is used on your profile page. **Is Profile Page Public?** appears when you are signed in. **API Keys** opens the keys for the [API](/features/api).
- **My Measurements**: **Bodyweight** and **Bodyfat** show your latest values. **Measurements** and **Sleep & Nutrition** open the tracking screens ([Measurements](/features/measurements)).
- **Workout**: **Exercises** ([Exercise library](/features/exercise-library)), **Muscle Groups**, **Timers** ([Rest timer](/features/rest-timer)), **Available Equipment** ([Equipment and gyms](/features/equipment-and-gyms)), **Weight Units**, **Length Units**, **Week starts from:**, and **Always On Display**. **Current Gym** appears when you have more than one gym.
- **Sound**: a **Vibration** toggle and a volume slider for the rest timer chime. On Android with [Premium](/features/premium), **Ignore Do Not Disturb** lets the notification sound play in Silent mode.
- **Sync**: **Apple Health** on iOS or **Google Health Connect** on Android ([Health sync](/features/health-sync)).
- **Appearance**: the text size slider and **Dark mode**.
- **Import / Export**: export to JSON, CSV, or a text file, and import history and programs ([Import and export](/features/import-export)).
- **Miscellaneous**: **Changelog**, **Contact Us**, **Discord Server**, **Privacy Policy**, **Terms & Conditions**, **Licenses**, **Documentation**, **Source Code on Github**, and **Roadmap**.

### Units, week start, and automatic conversion

**Weight Units** is kg or lb. **Length Units** is cm or in, used for body measurements.

When you clone a built-in program, the app converts its weights to your unit. When you import a program from a link with the other unit, the app asks: "The program has weights in kg, do you want to convert them to lb?".

**Week starts from:** is Sunday or Monday. It sets the first day in the week calendar on the Home tab and in [Week insights](/features/week-insights).

### Dark mode and text size

By default the app follows your phone's light or dark theme. Turn **Dark mode** on or off under **Appearance** to override it.

The text size slider, marked **A A**, goes from 12 to 24 in steps of 2. It starts from your device text size, and the label under it says **Matching your device text size**. Move it, and the label changes to **Set in the app**. Tap **Use device size** to follow the device again. Icons and exercise thumbnails scale with the text.

### Keeping the screen on

Turn on **Always On Display** under **Workout** to stop the screen from sleeping while the app is open. It is off by default.
## Using AI with Liftosaur

Category: Start here. Page: https://www.liftosaur.com/features/chatgpt-claude-and-ai

Add Liftosaur to ChatGPT, or connect Claude and Gemini through the MCP server, and ask the assistant to write programs, log workouts and analyze your history.

### Add Liftosaur to ChatGPT

Liftosaur is in the ChatGPT plugin directory. There is nothing to configure and no URL to paste.

1. Open [Liftosaur in the ChatGPT plugin directory](https://chatgpt.com/plugins/plugin_asdk_app_6a5bb283d24481918813e6efbc3d66ad), or open **Plugins** in ChatGPT and search for **Liftosaur**.
2. Select **Connect**.
3. Sign in with your Liftosaur account and approve access.
4. In a chat, write **@Liftosaur** before your request, or select **+** → **More** and pick Liftosaur.

From then on you talk to it like this:

- "@Liftosaur create a 4-day upper/lower program with linear progression."
- "@Liftosaur I did 3x5 squats at 225 lb today, log it."
- "@Liftosaur how has my bench press progressed over the last month?"
- "@Liftosaur my program does not have enough back work, fix it."

The change lands in the app right away. There is no need to close and reopen it.

Plugin availability depends on your ChatGPT plan, region and workspace settings. If **Connect** is greyed out in a workspace, ask the administrator to enable Liftosaur for your role.

### What the assistant can do

Behind the plugin is the Liftosaur MCP server. MCP (Model Context Protocol) is an open standard that lets an AI assistant call tools in another app. The assistant gets these tools:

- **Programs**: list your programs, read a program's Liftoscript source, create a program, update it, or delete it.
- **Workout history**: list your workouts with date filters, read one workout, log a new workout, edit one, or delete one.
- **Custom exercises**: list, read, create, update and delete your custom exercises.
- **Gyms and equipment**: list your gyms, add one, rename one or make it current, and edit bars, plates and fixed weights.
- **Exercise settings**: read and set your 1RM, weight rounding, equipment and notes per exercise.
- **Measurements**: read your bodyweight, body part and body fat history, add a value, edit one, or delete one.
- **Testing and analysis**: `run_playground` simulates a workout to check that a progression works. `get_program_stats` reports duration per day, weekly volume per muscle group, and the strength vs hypertrophy split.
- **Reference**: the Liftoscript language reference, complete program examples, the program design guide, the workout record format, the built-in exercise list, and the source of every built-in program.

Everything that touches your account needs [Premium](/features/premium). The reference tools work without an account.

### Write a program with an assistant

Ask for the program you want. The assistant reads the Liftoscript reference, writes the program, tests it with `run_playground`, and saves it to your account with `create_program`. If it skips the reference and the syntax comes out wrong, tell it to call `get_liftoscript_reference` first.

To change a program, describe the change. The assistant reads your current program with `get_program`, edits the Liftoscript, and saves it with `update_program`.

To check balance, ask for `get_program_stats`. It returns volume per muscle group and session length.

### Connect Claude, Gemini and other clients

Any MCP client can use the same server. The URL is `https://www.liftosaur.com/mcp`.

- **Claude.ai and Claude Desktop**: Liftosaur is in the [Claude connectors directory](https://claude.ai/directory/liftosaur). Go to **Customize → Connectors**, search for **Liftosaur**, and click **Connect**. A browser window opens to sign in with your Liftosaur account.
- **Claude Code**: if you log in with your claude.ai account, the connector from claude.ai is already there. Run `/mcp` to see it. Otherwise run `claude mcp add liftosaur --transport http https://www.liftosaur.com/mcp`.
- **Gemini CLI**: add the server to `~/.gemini/settings.json` with `"httpUrl": "https://www.liftosaur.com/mcp"`, then run `/mcp auth liftosaur`.

Sign-in uses OAuth 2.1. The client opens a browser window once, and then refreshes the token on its own. Command-line clients and config-file setups can skip the browser and send an [API key](/features/api) as `Authorization: Bearer lftsk_your_key_here` instead. Every client's exact steps are in the [MCP server docs](/doc/mcp).

### Without Premium

The reference tools are open to everyone. An assistant can read the Liftoscript reference, the examples, the design guide and the built-in programs, and write valid Liftoscript for you. Paste the result into the [Web Editor](/planner), or into the program editor in the app. See [Liftoscript](/doc/liftoscript) for the syntax.

### Autofill muscles for a custom exercise

When you create a custom exercise, the form has an **Autofill Muscles and Types** button. Type the exercise name and tap the button. The app asks an AI model to fill the target muscles, synergist muscles and exercise types from the name. Check the result and adjust anything that looks wrong. If the name is unknown, the app says "Couldn't autofill the muscles for this exercise. Try a different name!". See [Custom Exercises](/features/custom-exercises) for the rest of the form.

### The old prompt generator

The page at `liftosaur.com/ai/prompt` used to build a large prompt with the docs and examples. You copied it into ChatGPT, Claude or Gemini, and pasted the answer back into the web editor. That page is retired. The ChatGPT plugin and the MCP server replace the round trip, and the free reference tools cover the same ground without an account.
## Premium

Category: Start here. Page: https://www.liftosaur.com/features/premium

One subscription unlocks plates per side, graphs, muscle views, Week Insights, the Apple Watch app and the API. Monthly, yearly or lifetime.

### What Premium unlocks

Premium turns on these features:

- **Plates Calculator**. The plates to load on each side of the bar, next to the set, under the weight keyboard, and as the **Plates** column on the workout screen. Without Premium, the set shows a **See plates for each side** link instead. See [Logging a Workout](/features/workout-screen).
- **Graphs**. The **Graphs** tab, the graph under an exercise on the workout screen, the exercise stats screen, and the bodyweight, measurements and sleep graphs. Without Premium, the tab opens the Premium screen. The other graphs are blurred, with an **Unlock** button. The **Moving Average Window Size** setting on the measurements graph is Premium too. See [Graphs](/features/graphs).
- **Muscles**. The muscle group views for a program and for a day. Without Premium they are blurred.
- **Rest Timer Notifications**. A push notification when the rest ends, the Live Activity and Dynamic Island on iOS, and the Live Update chip on Android. On Android, the **Ignore Do Not Disturb** toggle under **Sound** on the **Me** tab appears with Premium. See [Rest Timer](/features/rest-timer).
- **Week Insights**. The week card on the Home tab. Without Premium it shows **See Week Insights**, which opens the Premium screen. See [Week Insights](/features/week-insights).
- **Apple Watch App**. Without Premium, the watch shows **Premium Required**. See [Apple Watch](/features/apple-watch).
- **API & MCP**. API keys in **Me → API Keys**. Without Premium the screen shows **Subscribe to unlock**. See [API](/features/api).

Everything else is free: programs and the editor, Liftoscript, logging workouts, history, measurements entry, equipment, sharing, import and export.

### See a feature before you buy

Tap a feature name on the Premium screen. A sheet opens with a short description and a screenshot of that feature.

### Choose a plan

The Premium screen shows three cards:

- **Start with Yearly**, the highlighted card, with a **Save 33%** badge.
- **Start with Monthly**.
- **Lifetime**, a **One-time payment**. It never renews.

Monthly and Yearly come with a **Free 14-day trial**. The store charges you after the trial, then every month or every year. When a discount offer is running, the cards show the old price crossed out and the note **Discount applies for the first year**. The trial note is hidden then.

The store sets the price, adjusted per country, and shows it in your currency.

You can cancel any time from your App Store or Google Play subscription settings. Premium stays on until the end of the period you already paid for, or until the end of the trial if you cancel during it, so cancelling on day one of the trial still gives you the full 14 days. You cannot buy Lifetime while a subscription is active. The card says **Cancel your subscription first**, or **Available after** the end date of a cancelled one.

### Where to buy and where it works

You buy Premium in the iOS app or the Android app. The web app cannot sell it. Tapping a plan on the web tells you to install Liftosaur from Google Play or the App Store, subscribe there, then log in with the same method on the web.

Premium is tied to your account. The receipt syncs with your data, so the features unlock on iOS, Android and the web at once. If you bought on the other platform, the Premium screen says **You bought this subscription on the App Store. Manage or cancel it from an Apple device.**, or the same for Google Play and an Android device. The features stay unlocked.

### See your plan and manage it

Go to **Me → Account**. Under **🌟 Liftosaur Premium** one row shows your plan:

- **Free plan** with **Get Premium**. Tap it to open the Premium screen.
- **Premium — Yearly** or **Premium — Monthly**, with **Renews on** the next date, and **Manage**. A **Cancel subscription** link opens the store's subscription manager.
- **Ends on** the date, **won't renew**, after you cancel. **Manage** opens the Premium screen, where **Resubscribe** takes you back to the store.
- **Lifetime Premium**, **All features unlocked forever**.
- **Free access**, **All features unlocked**, when Liftosaur granted you a free key.
- On the web, **Premium** with **Manage on the mobile app**.

A subscriber also sees **Switch to Monthly** or **Switch to Yearly** on the Premium screen. A switch to Yearly starts at your next renewal. A switch to Monthly credits the time left on the yearly plan.

### Restore a purchase

If Premium is off after a reinstall or on a new phone, open the Premium screen and tap **Restore Subscription** at the bottom. The app asks the store for your purchases and unlocks the features. If the store has nothing, the app says **No active purchases to restore.**

**Redeem coupon** on the same screen opens the App Store code sheet on iOS, or a code field on Android.
## Logging a Workout

Category: Workout. Page: https://www.liftosaur.com/features/workout-screen

Tap the checkmark to complete a set. See big reps and weight fields, plates per side, and your last and best results. Swipe between exercises, then finish.

### Complete a set

Go to **Workout** and tap the next day of your program.

The next set is expanded. It has big **Reps** and **Weight** fields and a big checkmark. Tap the checkmark to complete the set. The phone vibrates once, and the [rest timer](/features/rest-timer) starts.

Under the fields, the expanded set shows:

- The plates to load per side, as a bar and a list. Free accounts see a **See plates for each side** link instead.
- **Last**, **Best** and **Same day** results for this set, each with its date. An AMRAP set shows **Best AMRAP**. **Same day** appears only in multi-week programs.

Sets that end in `+` ask a question after the tap. `5+` asks for reps, `?+` asks for weight, `@8+` asks for RPE.

### Change reps, weight and RPE

Tap a **Reps** or **Weight** field. A keypad opens with digits, **+**, **-**, backspace and a close button. On the weight field, **+** and **-** step by the smallest weight your equipment can load. On reps they step by 1.

The RPE column shows the RPE you logged after a `@8+` set, as `@8`.

### Change what a set asks for

Tap the pencil icon on the expanded set and pick **Edit Target**. The **Edit Set Target** sheet has **Min** and **Max** reps, an **AMRAP?** switch, the target **Weight** with an **Ask?** switch, and switches for **Enable RPE?**, **Enable Set Timer?** and **Enable Custom Rest Timer?**. The change applies to this workout only. **Delete Set** in the same menu removes the set.

### Add sets, expand and collapse

Tap a set row to expand it. Tap it again to collapse it. After you complete the expanded set, the next unfinished set expands. If you collapsed a set yourself, the sets stay collapsed after that.

**Add Warmup Set** and **Add Set** under the sets add one row each. **Add Set** copies the last set of the exercise, or the last set from your previous workout when there are none.

### See plates, the rounded weight, and estimated 1RM

The second column header is **Target**. Tap it to cycle: **Target**, **Previous Set**, **Plates**, **e1RM**. **Plates** needs Premium and equipment set for the exercise. **e1RM** is the estimated one rep max for each set: the set's weight divided by the share of 1RM that the RPE chart gives for its reps at its RPE, with RPE 10 assumed when none is logged.

When the program's weight does not match your plates, the target shows the exact weight crossed out like ~~212lb~~ and the rounded weight underlined, 210lb. Tap the underlined weight. A sheet titled **Why is the weight adjusted?** explains the percentage of your 1RM, the kg to lb conversion, the bar weight, the plates per side, or the closest fixed dumbbell.

### Move between exercises

Swipe left or right to move between exercises, or tap a thumbnail in the strip at the top. Each thumbnail shows completed sets over total, like `2/5`, and a check when the exercise is done. Exercises in a superset share a colored line under their thumbnails. Long-tap a thumbnail and drag it to reorder.

The cog on the exercise card opens a menu letting you to edit program exercise, swap exercise for this workout only, etc.

The card header has **Equipment** and, when the program uses percentages, **1RM**. Tap either value to change it.

### Notes and descriptions

Tap the cog, then **Show Exercise Notes**. A text field appears: "Add workout notes for this exercise here...". Next time, the card shows it as **Previous Note** with its date, for two months. The card also shows the exercise description from the program and the notes from its stats screen.

For notes on the whole workout, tap the kebab at the top and pick **Show Workout Notes**.

### Past history, graphs and PRs

Scroll below the sets. The graph shows your weights over time for this exercise, after two or more past workouts. It needs Premium. **Hide Graphs and PRs** hides this block.

**Personal Records** lists **Max Weight** and **Max 1RM** with their dates. **Max 1RM** is an estimate (e1RM), not a lift you did. The app takes the weight of a set and divides it by the share of your 1RM that the RPE chart gives for that many reps at that RPE. A set without a logged RPE counts as RPE 10, so 5 reps at 200 lb become 200 lb ÷ 0.865 ≈ 231 lb. The chart follows the OpenPowerlifting RPE calculator. Under the records is every past workout of this exercise.

### Muscles worked today

Tap the kebab at the top and pick **Day Muscles**. The **Muscles Map** screen opens for the program day: **Strength** and **Hypertrophy** tabs, a front and back body drawing, and **Muscles used, relatively to each other** with percentages.

### Pause and keep the screen on

The header shows the workout time with a blinking colon. Tap the pause icon next to it to pause, and the play icon to resume.

To stop the phone from locking, go to **Me → Settings** and turn on **Always On Display**. The screen stays on while the app is open.

### Finish the workout

Tap **Finish** in the top right. If some sets are not completed, the app asks "Are you sure you want to FINISH this workout? Some sets are not marked as completed." Then the progress scripts run and update the program. If you enabled it in the Health settings, the workout goes to Apple Health or Google Health.

The **Congratulations!** screen shows **Totals**: time, volume, sets and reps. Below are **Exercises** with their sets, **Sets per muscle group**, new personal records, and share buttons. **Continue** takes you back to Home.
## Rest Timer

Category: Workout. Page: https://www.liftosaur.com/features/rest-timer

Starts on its own after every set, using the rest time from your program. Adjust it with one tap, on the lock screen, through headphones or on Apple Watch.

### How it works

Complete a set, and the rest timer starts. No extra tap. A small pill appears in the bottom right corner of the workout screen. The big number is how long you have rested so far. The small number is your target rest.

A progress bar fills the pill as you rest. When you reach the target, the pill turns red, and the timer keeps counting so you can see how far past your rest you are.

Tap the pill to expand it. The expanded bar has:

- **-15s** and **+15s** to adjust the target.
- **Trash** to cancel the timer.
- The elapsed and target times. Tap them to collapse the bar again.

If you complete an AMRAP set, or a set that asks for your RPE or weight, the timer starts when you submit that popup, not when you tap the set.

### Where the rest time comes from

Liftosaur picks the rest time for each set in this order. The first match wins.

1. A per-set rest time in your program, like `Bench Press / 5x5 / 90s`.
2. The **Superset** timer, if the exercise is in a superset and you set one.
3. The **Warmup** timer for warmup sets, or the **Workout** timer for working sets.

If the value that wins is empty or 0, no timer runs for that set.

### Changing the defaults

Go to **Me → Timers**. You can set, in seconds:

- **Warmup** rest between warmup sets. Default 90.
- **Workout** rest between working sets. Default 180.
- **Superset** rest between exercises in a superset. Empty by default, so supersets use the Workout timer.
- **Get ready** countdown before a timed set. Default 5.

### Rest times in your program

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

### Sounds and vibration

When the rest ends, the app plays a chime and vibrates. Both are in **Me → Settings**, under **Sound**: a **Vibration** toggle and a **Volume** slider. Set volume to 0 for silence. Adding time with +15s arms the chime again for the new target.

### Lock screen, notifications, and headphones

With Premium, the timer follows you out of the app:

- A notification arrives when the rest is over, with the next set and the plates to load: "It's time for the next set! Next set: Bench Press, 5 × 100lb".
- On iOS, the rest timer runs in the **Live Activity** on the lock screen and in the **Dynamic Island**, with -15s and +15s buttons.
- On Android, the rest timer shows in the **Live Update** chip next to the clock.
- If you wear an Apple Watch and have headphones in, the phone plays the chime through the headphones even while the phone is locked, so you don't need to look at the screen.

### Apple Watch

With Premium, the watch app has its own **Rest Timer** screen: -15s, elapsed and target, +15s, and a delete button. When the rest ends, the watch taps your wrist and chirps, unless volume is 0.

### Timed sets and the countdown

For a timed set, the first tap starts a **Get ready** countdown, then the set clock. The rest starts when the set clock ends. For `auto` sets, the countdown comes out of the rest time: with `30s|60s` and a 5 second countdown, you rest 55 seconds, then the 5 second countdown starts. Write `30s|0s` to skip the countdown.
## Timed Sets, Intervals and Circuits

Category: Workout. Page: https://www.liftosaur.com/features/timed-sets

Time the set itself, not only the rest. Planks, carries, EMOM and Tabata get a countdown, a set clock and a recorded time, with auto-advance between rounds.

### Writing a timed set

A plain `90s` after the sets is the rest timer. Put a `|` in it and the left side becomes the set timer, how long the set itself lasts:

```liftoscript
Plank / 3x1 60s|30s / 0lb
```

That is 3 sets of plank, 60 seconds each, then 30 seconds of rest. In the workout, a timed set shows a play button instead of the check mark. Give a bodyweight exercise `0lb`, or the app asks you for the weight when the set ends.

`60s|?` keeps your default rest from **Me → Timers**. See [Liftoscript](/doc/liftoscript) for the full syntax, and [Rest Timer](/features/rest-timer) for how the rest side works.

### Starting the set

Tap the play button. The app opens a **Get Ready** countdown, 5 seconds by default. The phone vibrates on each of the last 5 seconds if **Vibration** is on in **Me → Settings**.

- Tap **Start now**, or tap the ring, to skip the countdown.
- Tap **Discard & close** to close the sheet without starting.

### During the set

When the countdown ends, the set clock starts. The big number is the elapsed time, and the progress bar fills toward the target.

- When the clock reaches the target, the app records the target time and completes the set on its own. The rest timer starts.
- **Stop & record** stops the clock early and records the elapsed time. The rest timer starts.
- **Log 0:12, keep timing** records the elapsed time now but leaves the clock running to the target. The rest starts when the clock ends.
- **Discard & close** closes the clock without recording.

For a set written as `8x1+ 20s|10s`, the app asks for the reps you did when the clock ends, like any AMRAP set.

### After the set

The recorded time appears in the set row under **Time**.

### Editing the recorded time

Tap the recorded time in the set row. The **Edit recorded time** sheet takes minutes and seconds. **Save** writes the new time, **Clear** removes it.

### Counting up past the target

Add `+` after the set timer and the clock does not stop at the target. You stop it yourself with **Stop & record**, and the elapsed time is recorded. This is the AMRAP of timers, "hold the plank as long as you can":

```liftoscript
Plank / 2x1 30s|60s, 1x1 30s+|60s
```

You can also set this on one set during a workout. Tap the pencil on the set, then **Edit Target**. **Enable Set Timer?** adds a set timer, and the **Count up past target?** switch in the keypad adds the `+`.

In `progress` and `update` blocks, the target is `setTime` and the recorded time is `completedSetTime`, for example `setTime[1] = completedSetTime[1] + 5`.

### EMOM, Tabata and circuits with `auto`

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

### Changing the countdown

Go to **Me → Timers**. Under **Timed sets**, **Get ready** is the countdown length in seconds. Default 5. Set it to 0 to start the clock on the first tap.

### Unilateral exercises: two clocks

For a unilateral exercise, like Bulgarian Split Squat, Lunge, Step Up or a dumbbell Bicep Curl, one timed set runs two clocks. The sheet shows **Left side** first. When you stop it, a countdown starts and then the **Right side** clock runs. The set row records both as **L** and **R**, and the **Edit recorded time** sheet has a row for each side.

Whether an exercise is unilateral comes from the **Is Unilateral** checkbox on its Exercise Stats screen.

### Lock screen and Apple Watch

With Premium, the countdown and the set clock also run in the **Live Activity** on the iOS lock screen and in the Dynamic Island, in the **Live Update** on Android, and on the Apple Watch, with buttons to stop and record the set from there.
## AMRAP, RPE, Ask-Weight and Unilateral Sets

Category: Workout. Page: https://www.liftosaur.com/features/set-types

Add a + in your program and the app asks what you did: AMRAP reps, RPE, the weight lifted, or a progression value. Unilateral sets track reps per side.

### How it works

In Liftoscript, a `+` after a value means "ask me when I finish the set". There are four places you can put it:

```liftoscript
Overhead Press / 3x5+ / 85lb
Romanian Deadlift / 3x8 @8+ / 165lb
Bench Press / 3x8 / 100lb+
Bicep Curl / 3x10 @8 ?+
Squat / 3x5 / progress: custom(shouldBumpWeight+: 0) {~
  if (state.shouldBumpWeight > 0) { weights += 5lb }
~}
```

- `5+` is an AMRAP set. The app asks how many reps you did.
- `@8+` asks for your RPE after the set.
- `100lb+` asks for the weight, with 100lb filled in. `?+` asks for the weight with no target at all.
- `shouldBumpWeight+` asks for a state variable value after the last set of the exercise.

Tap the checkmark on such a set and a popup opens instead of completing the set right away. The popup shows only the fields that set needs. Tap **Done** to complete the set. Tap **Cancel** to leave the set as it was. The rest timer starts when you tap **Done**, see [Rest Timer](/features/rest-timer).

### Mark a set as AMRAP

Write `5+` and the set target shows as `5+` on the workout screen. When you tap the checkmark, the popup asks for **Completed reps**. It starts at the target reps. Use the **-** and **+** buttons or type the number.

The number you enter is saved as the completed reps of that set. Progressions read it as `completedReps`. The demo program uses it like this:

```liftoscript
Overhead Press / 3x5+ / 85lb / progress: custom(increment: 5lb) {~
  if (completedReps[ns] >= 8) {
    weights += state.increment
  } else if (completedReps[ns] < 5) {
    weights -= state.increment
  }
~}
```

Do 8 or more reps on the last set, and the next workout has 90lb. Do fewer than 5, and it drops to 80lb.

A set with a rep range, like `3x8-12+`, works the same way. `+` goes after the top of the range.

### Log your RPE

RPE, Rate of Perceived Exertion, is how hard a set felt, on a scale from 1 to 10. 10 means you could not have done one more rep. 9 means one rep was left, 8 means two, and so on down. Logging it tells the app and your progression scripts how close to failure a set was, which the reps and weight alone do not show.

`@8` alone sets a target RPE and the app does not ask anything. `@8+` shows the target as `@8+` and asks for your **Completed RPE** when you tap the checkmark. The field goes from 0 to 10 in steps of 0.5, and starts at the target RPE.

After **Done**, the set row shows the RPE you entered next to the set. Progressions read it as `completedRPE`, and the target as `RPE`:

```liftoscript
Romanian Deadlift / 3x8 @8+ / 165lb / progress: custom() {~
  if (completedRPE[ns] < 8) {
    weights += 10lb
  }
~}
```

### Enter the weight you lifted

Add `+` after a weight, like `100lb+` or `70%+`, and the popup asks for the **Weight** you used. The field starts at the target weight. The **-** and **+** buttons step through the weights your equipment can make. The calculator button opens the rep max calculator.

Write `?+` when you do not want a target weight at all, for example `Bicep Curl / 3x10 @8 ?+`. The target column shows `?+ @8`. A set with no weight in the program, like `Bench Press / 3x12`, asks for the weight too, with no `+` needed.

When one set asks for both weight and RPE, the popup shows both fields.

The entered weight is saved as the completed weight of the set. Progressions read it as `completedWeights`:

```liftoscript
Bicep Curl / 3x10 @8 ?+ / progress: custom() {~
  weights = increment(completedWeights[1])
~}
```

`increment` returns the next weight your equipment can make.

### Reps per side for unilateral exercises

Built-in one-side exercises, like Bulgarian Split Squat, Lunge, Step Up, Bicep Curl, Hammer Curl, Concentration Curl or Bent Over One Arm Row, track reps per side. Each set row has an **L:** and an **R:** reps field. An AMRAP set on such an exercise asks for **Completed reps (left)** and **Completed reps (right)**.

Volume adds the reps of both sides. The estimated 1RM uses the average of the two sides. Progressions read the right side as `completedReps` and the left side as `completedRepsLeft`.

To change this for an exercise, tap the exercise name on the workout screen to open Exercise Stats, and switch **Is Unilateral**.

### Ask for a state variable

Add `+` after a state variable name in `progress: custom(...)`:

```liftoscript
Bench Press / 3x8 / progress: custom(shouldBumpWeight+: 0) {~
  if (shouldBumpWeight > 0) {
    weights += 5lb
  }
~}
```

When you complete the last set of the exercise, the popup shows **Enter new state variables values** with one field per such variable. The values go into the state before the progress script runs, so the script above adds 5lb only when you entered 1 or more. Use it for progressions you decide yourself, like RPE or RIR based programs, or to type the next weight by hand.

### Turn the markers on for one set during a workout

Tap a set to expand it, tap its options button, and choose **Edit Target**. The **Edit Set Target** sheet has an **AMRAP?** switch next to reps, an **Ask?** switch next to weight, and a **Log?** switch next to RPE. This changes only the current workout, the program text stays the same.

Scripts can also set them. `amraps`, `logrpes` and `askweights` work like `reps` or `weights`, `1` turns a marker on and `0` turns it off:

```liftoscript
Squat / 3x8 100lb / progress: custom() {~
  amraps = 1
  askweights[ns] = 1
~}
```
## Supersets

Category: Workout. Page: https://www.liftosaur.com/features/supersets

Group two or more exercises, and the workout screen moves to the next one after every set. Set the groups in the program text, the editor or the workout.

### How it works

A superset is a group of exercises you do in turn: one set of the first, one set of the second, then back to the first. In Liftosaur, every exercise in the group carries the same group name, like `A`.

On the workout screen, each exercise in a group shows a line **Supersets with:** and the name of the next exercise in the group. The thumbnails at the top get a colored line under them, one color per group. The line is colored for the group you are working on now, and gray for the other groups.

Groups only match within one day. `A` on Monday and `A` on Wednesday are two different groups.

### Move to the next exercise after each set

Complete a working set of an exercise in a group. The workout screen moves to the next exercise in the group. Complete a set there, and it moves on again, and back to the first one after the last. Warmup sets do not move you.

When an exercise in the group has no sets left, the app skips it and goes to the next one that still has work. When only one exercise has sets left, you stay on it.

Sets are never locked. You can tap any thumbnail to go to any exercise at any time.

### Group exercises during a workout

You can build or change groups without touching the program. Tap the exercise name next to **Supersets with:**, or tap the cog on the exercise card and pick **Edit Superset**. The **Select Superset Group** sheet opens with:

- **None** to take the exercise out of its group.
- Each existing group in this workout, with the exercises in it.
- **Create New Group** to name a new group. A name can be any text except the characters `/ { } ( ) # [ ] | !`.

Changes made here apply to this workout only. Your program stays as it was.

### Group exercises in the program editor

Open an exercise in the program editor, or pick **Edit Program Exercise** from the cog on the workout screen. The exercise line opens in the Liftoscript editor sheet. Tap the **Enable superset** pill to add `/ superset: A` to the line. Change the letter in the text to move the exercise to another group, and delete the `superset:` part to take it out of its group.

### Write it in Liftoscript

Add a `superset:` section to each exercise in the group:

```liftoscript
Lateral Raise / 3x12-15 / 15lb / superset: A
Face Pull / 3x15 / 40lb / superset: A
```

The group name after `superset:` can be any string, like `A` or `ChestDay1`. In the text editor, an exercise line without a group offers an **Enable superset** action that inserts ` / superset: A` for you. See [Liftoscript](/doc/liftoscript) for the rest of the syntax.

### Rest between superset exercises

Go to **Me → Timers** and set **Superset**, in seconds, for example 15. This rest runs after every working set of an exercise in a group, instead of the **Workout** timer. It is empty by default, so groups use the Workout timer until you set it. A per-set rest time in the program text, like `Face Pull / 3x15 180s / superset: A`, takes priority over both. See [Rest Timer](/features/rest-timer) for how the timer works.

### History and program preview

A finished workout in your history draws the same colored line next to each exercise that was in a group. The program preview shows **Supersets with:** under each grouped exercise, so you can check the groups before you start.

### Keep exercises in a fixed order

This is separate from supersets. When a program repeats an exercise across weeks, the app keeps the order of exercises in the day as well as it can. When exercises start repeating on different weeks, that order can become unclear. Write the position in square brackets after the exercise name to fix it:

```liftoscript
Squat[1,1-4] / 3x8
Bench Press[2,1-4] / 3x8
Bicep Curl[3,1-4] / 3x8
```

The first number is the position, the range is the weeks the exercise repeats. `Squat[1]` works for an exercise that does not repeat. In the editor, the day card's three-dot menu has **Enable Forced Order**, which adds a **Forced order:** number field.
## Changing Today's Workout

Category: Workout. Page: https://www.liftosaur.com/features/changing-a-workout

Swap, add or remove exercises mid-workout, train without a program, turn an ad-hoc workout into a program day, or edit the program day from the workout.

### Pick which day to do

Tap **Workout** in the footer when no workout is ongoing. The **New Workout** sheet shows the next day of your program with its exercises, and a **Start** button. Tap **Select next workout** to do another day instead. The picker lists every day of the program. Tap one, and it becomes the next day, so the program continues from there. **Ad-Hoc Workout** on the same sheet starts an empty workout, see below.

### Swap an exercise

Tap the cog on the exercise card and pick **Swap Exercise**. The picker has two tabs: **Ad-hoc Exercise** and **From Program**. Pick one exercise and tap **Swap Exercise** at the bottom.

On the **Ad-hoc Exercise** tab, the weights change with the exercise. For each set, the app looks at your history for the new exercise. It takes the completed set closest in reps to the target, and converts its weight to the target reps and RPE. Same reps and RPE give you the weight you lifted last time.

If you never did the new exercise, the app uses your 1RM for it, or the exercise's default starting weight. Percentage weights use the new exercise's 1RM. Sets you already completed keep their numbers.

Warmups are rebuilt for the new exercise, from your program if it defines warmups for it on any day, otherwise from the exercise's defaults.

The **From Program** tab lists every exercise of your current program, by exercise and day. Pick one, and it comes with its sets. Its progression runs when you finish the workout. Exercises already in this workout are greyed out.

A swap changes this workout only. The program stays as it was.

### Repeat a swap

The app remembers the last 5 exercises you swapped to, per exercise. Next time you swap the same exercise, they are in a **Recent** section at the top of the picker. Recent shows while the search field is empty and no filter is on.

### Add an exercise

Tap **+** at the end of the exercise strip at the top. The picker opens as **Add Exercises**. You can select several at once. The button at the bottom says **Add to this workout (2)** with your count.

An ad-hoc exercise arrives with no sets. Tap **Add Set** on its card. Its sets carry an **Ad-hoc** label. An exercise from the **From Program** tab arrives with its sets and runs its progression when you finish.

Added exercises land at the end of the workout. Long-tap a thumbnail in the strip and drag it to move it.

### Remove an exercise

Tap the cog on the card and pick **Remove Exercise**. The app asks "Do you want to remove this exercise in this workout only?". Tap **OK**. The program does not change. If the exercise was in a superset, its partner leaves the superset too.

### Work out without a program

Finish or delete the ongoing workout. Tap **Workout** in the footer. The **New Workout** sheet opens. Tap **Ad-Hoc Workout**.

The workout starts empty, and the **Add Exercises** picker opens on its own. Pick exercises, tap **Add to this workout**, then **Add Set** on each card. You set the reps and weight yourself.

You can also skip programs from the start. The program choice screen has **Go without program**, and the **Change Next Workout** sheet has **Go without a program**.

### Save an ad-hoc workout as a program day

Tap **Finish**. When the workout came from no program of yours, the **Congratulations!** screen shows **Create Program Day**. Tap it. The sheet **Program day from Adhoc workout** opens.

- **Create a new program with this workout** starts a new program with this day.
- Or pick a program and tap a day. The app inserts a new day named **Day N** right after it, with the exercises, sets and weights you did. It confirms with "Added to program 'Name', at Day N".

The same **Create Program Day** is in the kebab menu of a past workout, when that workout is not from one of your programs.

### Edit the program from the workout

Tap the cog on a program exercise and pick **Edit Program Exercise**. A [Liftoscript](/doc/liftoscript) editor sheet opens with that exercise's line, headed by its week and day. Change sets, weights, warmups or progression, and tap **Save**. The program is updated, and the ongoing workout picks up the change.

Tap the kebab at the top and pick **Edit Program Day**. The same editor opens with the whole day. Add, remove or reorder exercises, then tap **Save**. A new exercise appears in the ongoing workout after the exercise it follows in the text.

If you change an exercise that is set up separately on several days, the app asks: **Change only this day** or **Change across whole program**. If you already logged sets for the old exercise, it asks "You've already logged sets for Bench Press in this workout. Switch them to Incline Bench Press too?".

**Edit Program Exercise** is not in the menu of an ad-hoc or swapped exercise.
## History and Calendar

Category: Workout. Page: https://www.liftosaur.com/features/workout-history

Every finished workout is a card on the Home tab, under a week strip and a month calendar. Open a past one to fix sets, move it, add a note or delete it.

### Read a finished workout

Go to **Home**. The first card is your next workout, with a **Start** button. If a workout is running, the card says **Ongoing workout** and the button says **Continue**. Under it, every finished workout is a card, newest first.

Each card shows the date, the program day and the program name. Then one row per exercise: the image, the name, and the sets as weight and reps. A trophy next to the name means you set a personal record in that workout. Notes you wrote for an exercise appear under its name.

The bottom row of the card has four numbers: workout time, total weight lifted, sets and reps. A workout note appears under them as **Note:**.

### Move through weeks

The strip at the top of the feed shows one week. Days with a workout are filled circles. Today has a border. Swipe the strip left or right, or tap the arrows on its sides, to see another week.

While you scroll the feed, the strip and the week card follow the workout at the top of the screen.

The week starts on Sunday. To start it on Monday, go to **Me → Settings** and set **Week starts from:** to **Monday**.

### See the week's totals

The card under the strip sums up the selected week: the date range, the volume, the number of sets, and the number of personal records. For a past week, the volume and sets show the difference from the week before, in green or red.

Tap **Show More**. The details list the week's personal records, the total sets, and the **Strength** and **Hypertrophy** split with percentages. Then the sets per **Upper**, **Lower**, **Core**, **Push**, **Pull**, **Legs**, and per muscle group, with a body drawing.

A muscle group line reads like `Chest: 8↑ (3s, 5h), 2d`: 8 sets in total, of which 3 counted as strength (`s`, under 8 reps) and 5 as hypertrophy (`h`, 8 reps or more), on 2 days (`d`). The total is colored against your weekly set range for that group, 10 to 12 sets by default. The arrow says which way to go: **↑** below the minimum, **↓** above the maximum, none inside the range. **Change Set Range Settings** at the bottom changes the ranges and the day targets. [Week Insights](/features/week-insights) explains every number and color.

Week Insights needs Premium. Without it, the card says **See Week Insights** and opens the subscription screen.

### Find a workout in the month calendar

Tap the week strip. A sheet opens with one block per month, back to your first workout. Each month has a header with the number of workouts and personal records, like **12 workouts · 🏆 3 PRs**. Days with a workout are filled circles. The selected week has a shaded background. Days in the future are grey.

Tap a day with a workout. The sheet closes and the feed scrolls to that workout. **This week** at the top of the sheet scrolls the calendar back to the selected week.

### Open and edit a past workout

Tap a card. The workout screen opens with the date as the title and the workout length under it. The button in the top right says **Save** instead of **Finish**.

Edit it the same way as a live workout: tap a set to change reps and weight, complete or uncomplete sets, add sets, swap or remove exercises. See [Logging a Workout](/features/workout-screen) for the controls.

Tap **Save**. The app asks "Are you sure you want to SAVE this PAST workout?". Tap **OK**. Saving replaces that one record. It does not run your program's progressions again, so your next workout stays as planned. To leave without saving, go back.

### Change the date or the length

Open the past workout and tap the date in the title. A sheet opens with **Please enter new date** and a date picker, then **Please enter workout length** in hh:mm. Pick the day and tap **Save** on the sheet. The workout keeps its time of day, only the calendar day changes. Then tap **Save** in the top right to store it.

The card moves to its new place in the feed, and the week strip and month calendar mark the new day.

### Add a note

Open the workout, tap the kebab in the top right, and pick **Show Workout Notes**. A field with "Add workout notes here..." appears under the program name. Type the note and tap **Save**. The card shows it as **Note:**.

The field stays on for every workout, live or past, until you pick **Hide Workout Notes** from the same menu.

For a note on one exercise, tap the cog on the exercise card and pick **Show Exercise Notes**. The exercise notes show under the exercise name in the feed. On the exercise stats screen you can hide the workouts that have no notes.

### Share a workout

Tap the kebab on a past workout and pick **Share**. You can **Copy link to workout**, **Copy as Text** for a message or a notes app, or share a picture to Instagram or TikTok.

The same menu has **Edit Program Day**, **Day Muscles**, **Show Tour** and **Delete Workout**. A workout from a program you no longer have also gets **Create Program Day**, which adds it as a day to a program.

### Delete a workout

Tap the kebab and pick **Delete Workout**. The app asks "Are you sure you want to delete this PAST workout?". Tap **OK**. The workout leaves the feed, the week strip and the calendar, and the app returns to **Home**. The same item on a running workout asks about the ONGOING workout and discards it.
## Lock Screen, Notifications and Audio

Category: Workout. Page: https://www.liftosaur.com/features/lock-screen-and-notifications

Complete sets and adjust rest from the iOS Live Activity, Dynamic Island or Android Live Update, and get a notification with the next set and plates.

### Run the workout from the iOS lock screen

With Premium, an ongoing workout shows as a **Live Activity** on the lock screen.

The top row has the workout time, **Set: 2/5**, and one dot per set. Green is done, orange partial, red failed, gray still to do. Warmup dots are dimmer.

Below it is the next set: the exercise image, the name, **Target: 5 × 100lb**, and **Plates: 45, 2.5** with the plates for one side of the bar.

On the right is the set card, like **5 × 100lb** with a checkmark. Tap it to complete that set without unlocking the phone. The rest timer starts, and the card moves to the next set.

Some sets need an answer from you: AMRAP reps, an RPE, or a weight. For those, the tap opens the app at that set instead.

While you rest, the top right corner has **+15s**, the elapsed time, the target, and **-15s**. The elapsed time turns red past the target. The timer itself is on the [Rest Timer](/features/rest-timer) page.

When every set is done, the Live Activity says **All exercises completed!**. It closes when you finish or discard the workout. Timed sets get their own layout, see [Timed Sets](/features/timed-sets).

### Use the Dynamic Island

In another app, the Dynamic Island shows the exercise image and the rest timer. The timer turns red when the rest is over.

Long press the island to expand it. The expanded view adds the exercise name, **Set: 2/5**, the target and the plates.

### Run the workout from the Android notification

With Premium, Android shows an ongoing notification for the workout. Its title is the exercise and the rest target, like **Bench Press (1:30)**. The text is **Set 2/5 • Target: 5 × 100lb • Plates: 45, 2.5**.

A clock in the notification counts the rest. The notification turns red when the rest is over.

It has three buttons: **-15s**, **+15s**, and **✓ Done**. **✓ Done** completes the set and starts the next rest. For a timed set the button is **▶ Start**. A set that needs an answer opens the app instead.

In another app, the rest timer shows as a small chip next to the clock.

### Get a notification when the rest is over

If the app is in the background when the rest ends, a notification arrives:

- Title: **It's time for the next set!**
- Subtitle: **Next Set: Bench Press, 5 reps, 100lb**
- Body: **Plates per side: 45, 2.5**

If the next set has no weight, the body is **The rest is over: Time to lift!**.

The notification plays the chime. With volume 0 it arrives silent. On Android it also wakes the screen, and vibrates three times if **Vibration** is on.

The app asks for notification permission the first time it schedules a rest timer. Android also asks for the alarm permission.

### Get a reminder about an unfinished workout

Leave the app with a workout still running, and a notification comes after a delay. It says **Workout reminder**, "You have an ongoing workout, make sure to finish it if you're done".

Coming back to the app cancels it. Finishing or discarding the workout cancels it too.

Set the delay in **Me → Timers**, under **Reminders**, in **About ongoing workout**. It is in seconds. The default is 900, which is 15 minutes. Set it to 0 to turn the reminder off.

### Set the chime, volume and vibration

When the rest ends, the app plays a chime and vibrates. Both are on the **Me** screen, under **Sound**: a **Vibration** toggle and a **Volume** slider.

Volume 0 with vibration on gives a vibration without sound.

The chime plays over other audio, so you hear it over a podcast on your AirPods. The podcast gets quieter for a moment.

Timed sets have their own sounds for the end of **Get Ready** and the end of the set.

### Hear the chime through headphones while locked

On iOS, when the phone is locked, the rest-over notification is what plays the chime.

With an Apple Watch paired and headphones connected, the phone plays the chime through the headphones instead. Bluetooth, wired, USB and AirPlay all count. The phone keeps a silent audio session open in the background for that. It removes the notification, so you do not hear the chime twice.

Take the headphones out during the rest, and the notification plays instead. See [Apple Watch](/features/apple-watch) for the chirp on the watch itself.

### Play the chime in Silent or Do Not Disturb mode

On Android with Premium, the **Me** screen has an **Ignore Do Not Disturb** toggle under **Sound**. With it on, the rest-over notification makes a sound even in Silent or Do Not Disturb mode. The app switches the ringer to normal for about four seconds, then restores it.

Android needs the Do Not Disturb access permission for this. The first time, the app opens the system settings page for it.

### Turn notifications off

- Set **Warmup** and **Workout** to 0 in **Me → Timers**. No timer runs, so no rest-over notification comes.
- Set **About ongoing workout** to 0 in **Me → Timers** to turn off the reminder.
- Set **Volume** to 0 on the **Me** screen to keep the notifications silent.
## Apple Watch

Category: Workout. Page: https://www.liftosaur.com/features/apple-watch

Run your workout from your wrist. Log sets with the Digital Crown, answer AMRAP and RPE prompts, run timed sets and see your heart rate.

### What you need

The watch app comes with the iPhone app. It needs Premium. Without it, the watch shows **Premium Required** with a **Recheck** button.

Open Liftosaur on the phone once after pairing, or the watch shows **Sync Required**.

### Start or continue a workout

The home screen shows a **New Workout** card with the day name and the program name. Tap **Start**. If you started the workout on the phone, the card says **Ongoing Workout** and the button says **Continue**. Starting a workout on the phone opens the watch app on its own.

The workout screen lists every exercise with one dot per set. The dots turn green, orange or red as you log sets. Tap the **Total time** line to pause or resume the workout.

### Log a set

Tap an exercise to open it. Turn the crown, or swipe up and down, to move between exercises. Swipe left and right to move between sets. The header shows **Set 2/7** and a dot per set. The **Plates** line shows what to load.

Tap the check mark to log the set as written. The watch moves to the next set on its own.

To change a number, tap the reps or the weight field. It gets a purple border, and the crown now turns that value. The weight field steps only through weights you can build from your equipment. The watch saves the change one second after you stop turning.

Past the last set there is an **Add** page that adds a set. The **…** button in the header opens **Delete set**. You cannot swap exercises or change the targets on the watch.

When every set is done, the watch shows **All Sets Completed!** with **Finish Workout** and **Continue**.

### AMRAP, RPE and asked weight

A set written as `5+` opens a prompt after you tap the check mark. Tap **Reps**, turn the crown, then tap **Done**. The same prompt asks **Weight (lb)** for a `?` weight, **RPE** in steps of 0.5 for an `@8+` set, and any user-prompted state variable. A one-sided exercise asks **Reps (left)** and **Reps (right)**. See [Set Types](/features/set-types) for the syntax.

### Rest timer

After a set, the rest timer sits at the top of the exercise screen and turns red once you are over. Tap it for **-15**, **+15** and **Delete**. When the rest ends, the watch taps your wrist and plays a chime, unless the volume in **Me → Settings** is 0. See [Rest Timer](/features/rest-timer).

### Timed sets

For a set like `Plank / 3x1 60s|30s`, the check mark becomes a play button. Tap it and a **Get Ready** ring counts down, 5 seconds by default. Tap the ring to start right away, or the **X** in the corner to close it.

Then the set clock runs, `0:12 of 1:00`. At the target, the watch logs the set and starts the rest. **Log & Stop** logs the elapsed time early. **Log & Keep** logs it and lets the clock run on. A one-sided exercise runs **Left** and then **Right**, with **Next side** between them. The logged time shows on the Plates line. Tap it to edit or clear it. See [Timed Sets](/features/timed-sets) for the syntax.

### Heart rate

Starting a workout on the watch starts an Apple Health strength workout session. Your heart rate then shows under the clock on every workout screen, in beats per minute. It reads `--` until the first reading arrives. If a reading never comes, tap the heart to start the session again. If it still shows `--`, check that Liftosaur may read heart rate: on the watch, open **Settings → Privacy & Security → Health**, and on the iPhone, open the **Health** app, then **Sharing → Apps and Services → Liftosaur**.

### Finish the workout and Apple Health

Tap **Finish** on the workout screen. The **Summary** shows time, volume, sets, reps, the exercises, sets per muscle group and any personal records. **Done** returns to the home screen.

The workout goes to Apple Health when **Sync Workouts** is on in **Me → Settings**, under **Sync → Apple Health**. Turn on **Confirm each workout sync?** and the watch asks **Sync to Apple Health?** first. Finishing on the phone finishes on the watch too, and the workout is saved to Health only once.

### Without the phone

The watch keeps its own copy of the program and the ongoing workout, so it works with the phone in the locker. When the phone is in reach, the watch sends the changes over, and the phone's Live Activity shows the set you just completed. When it is not, and you are signed in on the phone, the watch talks to the Liftosaur server directly.

A set you log on the phone shows up on the watch, and the watch jumps to the next set. A spinner in the top left corner means a sync is running. A red cloud means it failed. **Sync** on the home screen retries.

### The complication

Add the Liftosaur complication to a watch face to open the app. The rectangular one shows **Up Next** or **Ongoing** with the program and day name. The corner and inline ones show the day name next to the dinosaur.
## Built-in Programs

Category: Programs. Page: https://www.liftosaur.com/features/built-in-programs

About 60 popular programs like GZCLP, 5/3/1, Starting Strength and PHUL. Filter by experience, days a week and goal, preview every day, start with one tap.

### Open the library

Open the **Program** tab and tap the swap icon next to the program name. Or go to **Me → Program**. Both open the **Choose a program** screen.

When you already have a program, the screen has two tabs: **Yours** and **Built-in**. Without one, it shows the built-in list right away. The search field at the top filters by name.

Each card shows the program name, the workout length range like "30-45 mins", a short description and the exercise images. The line below lists weeks, days a week and exercises per day, like "3 weeks, 3x/week, 4-6 exercises per day". The last line is the equipment the program needs.

The footer has two more options. **Create New Program** starts an empty program of your own. **Go Without Program** is described below.

### Filter by experience, days and time

Above the list is one sentence with four dotted links. Tap a link to pick a value:

- **I've been lifting for**: less than 3 months, 3 to 12 months, more than a year.
- **I can work out**: 3, 4, 5 or 6 days a week.
- **for**: 30-45, 45-60, 60-90 or 90+ minutes.
- **My goal is**: strength, hypertrophy, or strength and hypertrophy.

The list keeps only programs that match every value you picked. Pick the empty option, like "any time", to clear a filter. If nothing matches, the screen says "No programs found with selected filters".

**Sort ascending by** orders the list by **Age**, **Frequency** or **Duration**.

### Check the program before you start

Tap a card to open the program info sheet. It shows the author, the full description and **Average time of a workout**, like 0:45.

The app estimates that time from the program text. Each set counts 20 seconds of setup, 7 seconds per rep, and the rest after it. The rest is the set's own timer, the **Superset** timer, or your **Workout** timer from **Me → Timers**. See [Rest Timer](/features/rest-timer) for how those timers are picked.

The program name is a link to the program's page on the site.

### Preview the whole program

Tap **Preview** on the info sheet. The **Program Preview** screen lists every week, every day and every exercise with its sets, reps and weights. The **Program** selector at the top switches to another built-in program without going back.

Turn on **Enable Playground** to run the program without saving anything. Tap the set squares to complete sets and watch the weights and set schemes change. Tap the edit icon to set your own weights and variables. The muscles icon next to the name shows the muscle groups the program trains.

### Start the program

The purple button on the info sheet says **Start** when you have no programs yet, and **Clone** when you already have one. Tap it, and the app copies the program into your own programs and makes it current. Weights are converted to the unit from your settings, lb or kg. Your other programs stay under the **Yours** tab.

If the program uses 1RM weights and some of yours are not set, the **Set 1 Rep Maxes** screen opens first. Otherwise the app opens the Home tab.

### Import a program from a link

Tap **Import** in the top right corner of the **Choose a program** screen. Paste a link from the [web editor](/program) or a link somebody shared with you, then tap **Add**.

The app asks "Do you want to import program X?". If the program uses the other weight unit, it also asks to convert the weights to yours. If you already have a program with the same id, it asks before overwriting it. The imported program becomes current.

### Go without a program

Tap **Go Without Program** at the bottom of the library. The app creates an empty program called "Ad-Hoc Workout" and opens the Home tab. You add exercises during each workout and build the program along the way.

When you open the app for the first time, the **Choose your program** screen offers the same four choices: **Pick a built-in program**, **Create a program**, **Import from link** and **Go without program**.

### Browse programs on the site

Every built-in program also has a page at [liftosaur.com/programs](/programs). The page has the same filters and sort as the app, plus the full description, the preview and the Liftoscript text of each program. The link in the info sheet opens that page.
## Program Editor

Category: Programs. Page: https://www.liftosaur.com/features/program-editor

Build a program on a calendar grid, in a per-day UI, or as Liftoscript text. Edit sets, reps, weight, RPE and timers, and go back to any earlier version.

### Open the editor

Tap **Program** in the footer, then the **Edit** tab. The header shows the program name, the number of weeks, days and exercises, and the average workout time. **Next Day** sets where the next workout starts.

The toolbar has undo, redo, four mode buttons and **Save**. The modes are the grid, the per-day UI, per-day text and full-program text. All four edit the same Liftoscript text. **Save** writes the program.

### Lay out weeks and days on the grid

The grid is the default mode. Weeks are columns, days are rows, and every exercise is a strip. An exercise that repeats across weeks is one strip crossing those weeks.

- Long-press an exercise and drag it to reorder it, or to move it to another day.
- Long-press a day name and drag it. The day moves in every week, so a multi-week program keeps its layout.
- Long-press a week name and drag it to reorder the weeks.
- Drag the end of a strip into more weeks. The app rewrites the repeat range.
- Pinch to zoom the weeks, in the iOS and Android apps.

Tap an exercise, a day name or a week name to select it. A dock appears above the footer. The pencil opens the editor for an exercise, or **Edit day** and **Edit week** for a name and a description. The three-dot menu duplicates, swaps or deletes an exercise, duplicates or deletes a day or a week, and opens **Exercise stats**, **Day stats** or **Week stats**.

**+ Exercise**, **+ Day** and **+ Week** add new ones.

### Edit sets, reps, weight, RPE and timers

Tap the pencil on an exercise. A bottom sheet opens with the exercise line in Liftoscript. Tap a value, like `3x5` or `155lb`, to get a hint and a row of pills. Swipe to move between values.

The pills depend on the value you tapped. Each one inserts or rewrites a piece of Liftoscript for you, so you never have to remember the syntax:

- Tap the exercise name for line-level pills: **Add sets**, **Add warmups**, **Add set variation**, **Add progress**, **Add update**, **Enable superset**, **Add label**, **Reuse…**, **Repeat…** and **Add forced order…**.
- Tap a set group like `3x5` for set pills: **Add weight**, **Add RPE**, **Add rest timer**, **Add set timer**, **Add auto**, **Add set label** and **Add another set group**.
- Tap the `progress:` part for **Add state var**, **Require 2 successes**, **Add deload on failure** and **Reuse script from…**. Tap a state variable inside `custom(...)` for **Rename…**, **Make weight** and **Make number**, which switch its value between a weight and a plain number.

Reps with a `+` are AMRAP. RPE with a `+` asks you to log the real RPE.

Double-tap the text to edit it as plain text. A suggestion strip on the keyboard offers exercise names, equipment variants, reuse targets like `...t1`, section names, progress functions and state variables. Tap **Apply** to fold the text back, then **Save**.

When a line reuses another exercise, the preview icon right of the pills shows the line **With reuses filled in**. Edit a value there, and the original line gets the override.

[Liftoscript](/features/liftoscript) and [the syntax reference](/doc/liftoscript) cover the text form of all of these.

### Name weeks and days, add descriptions

Select a day or a week on the grid and tap **Edit day** or **Edit week**. The sheet has a **Name** field and a Markdown description. The week description shows on the Home screen, the day description on the workout screen.

### Edit one day at a time in the UI mode

The second mode button shows one week, with a card per day. A day card has the name, a description, the exercise count and the time. An exercise card shows the warmups, the working sets, the superset group and the progression. Its icons swap the exercise, open its stats, open the editor sheet, or duplicate it.

### Type the program as text

The third mode button shows every day as its own text editor. The fourth shows the whole program as one text, with `# Week 1` and `## Upper A` headings:

```liftoscript
# Week 1
### Upper A
Bench Press / 1x5 60%, 1x3 70%, 3x5 / 155lb / warmup: 1x5 45%, 1x3 65% / progress: lp(5lb)
```

Both text modes have the same pills and suggestion strip. A syntax error keeps you on the **Edit** tab and greys out the grid and UI buttons until you fix it.

### Check the sets per muscle group

Tap the week muscles icon next to the week name in the UI mode, or select a week on the grid and pick **Week stats**. The sheet shows **Total Sets**, **Strength Sets** and **Hypertrophy Sets**, then the sets and the weekly frequency per muscle group.

Each muscle group line reads like `Chest: 8↑ (3s, 5h), 2d`: 8 sets in total that week, of which 3 are strength (`s`, under 8 reps) and 5 hypertrophy (`h`, 8 reps or more), on 2 days (`d`). A synergist set counts as a fraction, 0.5 by default, and each number is rounded on its own, so the parts may not add up to the total.

Every muscle group has a weekly set range, 10 to 12 sets unless you change it, and a frequency target, 2 days by default. The total is green inside the range, yellow between 70% of the minimum and 130% of the maximum, red further off. The arrow tells you which way to go: **↑** means add sets, you are below the minimum, **↓** means you are above the maximum, no arrow means inside the range. The day count is green at the target, yellow at half of it, red below.

To change the ranges, the frequency targets or the synergist multiplier, tap **Edit Weekly Muscle Range Settings** at the bottom of the sheet. The same settings drive [Week Insights](/features/week-insights) for your finished workouts.

A front and back muscle map colors the muscles by volume. Tap a number to see which exercises count towards it.

The day muscles icon, or **Day stats** on the grid, shows one day.

### Go back to an earlier version

Tap the three-dot menu in the top right and pick **Show program versions**. You need to be signed in. Pick a date, read that version's text, and tap **Restore** to load it into the editor.

### Create a new program

Go to **Me → Program** to reach **Choose a program**. Tap **Create New Program**, enter a **Program Name** and tap **Create**. The new program opens in the editor with one week and one empty day.
## Liftoscript

Category: Programs. Page: https://www.liftosaur.com/features/liftoscript

Write a program as text: one line per exercise with sets, reps, weight, 1RM percentages and RPE. Split it into weeks and days, and reuse lines.

### Write an exercise as one line

Every program in Liftosaur is text. Each exercise is one line. The exercise name comes first, then sections separated by `/`:

```liftoscript
Bench Press / 3x8
```

`3x8` is 3 sets of 8 reps. `3x8-12` is a rep range. Commas join set groups:

```liftoscript
Bench Press / 1x5, 1x3, 1x1, 5x5
```

Add the weight after the reps. It can be lb or kg, or a percentage of your 1RM:

```liftoscript
Bench Press / 3x12 60kg
Bench Press / 3x12 80%
```

Add `@` and a number from 1 to 10 for an RPE target. With no weight, the app looks up the weight from your 1RM, the reps and the RPE:

```liftoscript
Bench Press / 3x12 @8
```

Each set group can have its own weight, percentage or RPE:

```liftoscript
Bench Press / 1x5 @8, 1x3 @9, 1x1 @10, 5x5 50%
```

A value that applies to every set goes in its own section:

```liftoscript
Bench Press / 1x12, 5x5 / 20s 60%
```

With no weight and no RPE, the weight field stays empty in the workout. You type it when you complete the set. To change the equipment, name it after a comma, as in `Bench Press, Dumbbell / 3x5`.

A `+` after the reps makes an AMRAP set. A `+` after the RPE or the weight asks you to log the real value. [Set types](/features/set-types) explains those. `90s` after the reps is the rest time, see [Rest timer](/features/rest-timer). `60s|30s` is a timed set, see [Timed sets](/features/timed-sets). `progress: lp(5lb)` is a progression, see [Progressions](/features/progressions).

### Split the program into weeks and days

In the full program text, `#` starts a week and `##` starts a day:

```liftoscript
# Week 1
### Day 1
Squat / 5x5 / progress: lp(5lb)

### Day 2
Squat / 3x8

# Week 2
### Day 1
Squat / 5x4
```

A `//` line above an exercise is its description. The workout screen shows it. It takes Markdown. A `///` line is a note for you and never shows in the workout:

```liftoscript
/// Not shown in the workout
// Pause **2 seconds** at the bottom
Squat / 5x5 / progress: lp(5lb)
```

The description carries over to the same exercise in later weeks until you write a new one. An empty `//` line stops that.

A `//` line above `# Week 1` or `## Day 1` describes the week or the day. The week description shows on the Home screen, the day description on the workout screen.

### Repeat, reuse and label exercises

A week range after the name repeats the line on the same day in those weeks:

```liftoscript
Bench Press[1-5] / 3x8
```

The repeated weeks stay empty in the text. `...` reuses the sets, weights, warmups and scripts of another exercise in the current week:

```liftoscript
Bench Press / 5x5 / progress: lp(5lb)
Squat / ...Bench Press
```

`...Bench Press[2]` reuses day 2 of the current week. `...Bench Press[2:1]` reuses week 2, day 1. A section after the reuse overrides that part. `Bench Press / ...Squat / 150lb` keeps the sets of Squat and changes the weight.

`used: none` makes a template. The line never appears in a workout, and the name does not need to be a real exercise:

```liftoscript
t1 / used: none / 1x10+, 3x10 / 70% / progress: lp(5lb)
t1: Bench Press / ...t1
```

A word and a colon before the name is a label. `main: Squat` and `accessory: Squat` are two different exercises, each with its own progression. A name in parentheses after a set group is a set label, up to 8 characters. It shows next to the set in the workout:

```liftoscript
Squat / 4x5 (Main), 1x5+ (AMRAP)
```

[The Liftoscript reference](/doc/liftoscript) covers the rest: warmups, set variations, `update` scripts, state variables and tags.

### Type it in the app

Tap **Program** in the footer, then **Edit**. The toolbar has four mode buttons. The third shows one text editor per day. An exercise repeated from an earlier week is listed under the editor. The fourth shows the whole program as one text, with the `# Week` and `## Day` headings. [Program editor](/features/program-editor) covers the grid and the UI mode.

On the grid, tap an exercise and then the pencil. A sheet opens with that exercise line. Tap a value like `3x5`, `155lb` or `lp(5lb)`. A hint explains it, such as "Percentage: weight as a % of your 1RM for this exercise." Pills add the next part: **Add weight**, **Add RPE**, **Add rest timer**, **Make rep range**, **Add warmups**, **Reuse…**, **Repeat…**, **Add used: none**, **Add progress** and more.

Double-tap the text to type it as plain text. A suggestion strip on the keyboard offers exercise names, section names and reuse targets. Tap **Apply**, then **Save**.

With a syntax error, the grid, UI and **Save** buttons grey out until the text parses again.

### Try the program before you run it

The **Playground** tab next to **Edit** runs the program without saving anything. Complete sets and see how the reps, weights and sets change for the next workout. [Playground](/features/playground) covers it.
## Progressions and State

Category: Programs. Page: https://www.liftosaur.com/features/progressions

Tell the app how to add weight or reps over time. Pick a built-in linear, double or sum-of-reps progression, or write your own script with state variables.

### How progressions work

A progression is a rule on one exercise in your program. It runs when you finish the workout and rewrites the program text. Write it with `progress:` after the sets:

```liftoscript
Bench Press / 3x5 / 155lb / progress: lp(5lb)
```

Complete all three sets of five, and after you finish the workout the line reads `160lb`. Miss a rep, and it stays at `155lb`.

You write it once per exercise. The app applies it on every day and week where that exercise appears. Write `progress: none` on a deload day to skip it there.

Complete all working sets of an exercise, and the app shows what the rule will do under the sets. **Exercise Changes** lists the new weights or reps. **State Variables changes** lists the values the script remembers.

### Adding weight after a good session

Linear progression (`lp`) adds a fixed weight after you complete every set and rep:

```liftoscript
Squat / 3x8 / progress: lp(5lb, 2)
Squat / 3x8 / progress: lp(5lb, 2, 0, 10lb, 3)
```

The second number is how many good sessions you need. The fourth and fifth are the weight to drop and how many failed sessions it takes. The app adds the increment to the weight you lifted, so a weight you changed during the workout carries over.

To edit it in the app, tap the cog on the exercise during a workout and pick **Edit Program Exercise**. The exercise line opens in the Liftoscript editor sheet. Change the `progress:` part of the line and tap **Save**, and the program is updated.

### Adding reps first, then weight

Double progression (`dp`) grows the reps inside a range, then adds weight and resets the reps:

```liftoscript
Bent Over Row / 3x8-12 / 115lb / progress: dp(5lb, 8, 12)
```

With `3x8-12` the range narrows from below until you hit 12 on every set, then the weight goes up. With plain `3x8` the reps climb from 8 to 12 one session at a time. In the app the section shows **Increase weight by** and **Reps range**.

Sum of reps (`sum`) adds weight when the reps of all sets add up to a number:

```liftoscript
Bench Press / 3x10+ / progress: sum(30, 5lb)
```

### Writing your own rule

`progress: custom()` runs a script between `{~` and `~}`. It reads what you did and writes new values into the program:

```liftoscript
Overhead Press / 3x5+ / 85lb / progress: custom(increment: 5lb) {~
  if (completedReps[ns] >= 8) {
    weights += state.increment
  } else if (completedReps[ns] < 5) {
    weights -= state.increment
  }
~}
```

`completedReps[ns]` is the reps of the last set. `weights += 5lb` changes every set, `weights[2] += 5lb` only set two. You can also assign `reps`, `minReps`, `RPE`, `timers`, `numberOfSets`, and `rm1`.

In the app, pick **Custom** in the **Progress** picker and tap **Edit Script**. The **Progress Script** editor checks the script as you type and disables **Save** on an error. Reuse another exercise's script with `progress: custom(increment: 10lb) { ...Bench Press }`.

### Remembering values between workouts

State variables live in the parentheses of `custom()`. The script reads and writes them as `state.name`, and the app saves them in the program text:

```liftoscript
Bench Press / 3x8 / progress: custom(attempt: 0) {~
  if (completedReps >= reps) {
    state.attempt += 1
    if (state.attempt > 3) {
      weights += 5lb
      state.attempt = 0
    }
  }
~}
```

A `+` after the name, as in `custom(shouldBumpWeight+: 0)`, makes the app ask you for the value after the last set.

In the exercise editor, tap **State vars…** on a `custom(...)` line to open the list of variables with their current values. Change a value there, and the app writes it back into the program text.

### Changing sets during the workout

`update: custom()` runs before the first set and after every set you complete. It changes the sets of the current workout only. `setIndex` is the set you just tapped, 0 on the first run:

```liftoscript
Bench Press / 3x8 / update: custom() {~
  if (setIndex == 1 && completedReps[1] >= reps[1]) {
    numberOfSets = 4
  }
~}
```

Completed sets never change. Turn the section on from the 3-dot menu of **Edit Program Exercise** with **Enable Update**.

### Skipping the progression once

Tap **Suppress** under the preview to keep the program as it is after this workout. The listed changes get a line through them. Tap **Enable** to turn the rule back on.

### Rounded weights in the workout

A progression writes exact weights into the program. When the increment is not a weight your plates can make, like `2.5lb` with only 5 lb plates, the program soon holds a weight like `162.5lb` that you cannot load. Percentages of your 1RM do the same: `70%` of a 235 lb max is 164.5 lb. In the workout, the app rounds such a weight to what you can load and underlines it. Tap the set to expand it, then tap the underlined weight. The **Why is the weight adjusted?** sheet shows the program's weight, the 1RM math for a percentage, and the bar and plates it used. See [Logging a Workout](/features/workout-screen) for the sheet.

### More tools for scripts

- `bodyweight` is your latest bodyweight from measurements. `weights = bodyweight` in an update script tracks pull-ups. [Equipment, Plates and Gyms](/features/equipment-and-gyms) shows the full setup for weighted and assisted pull-ups.
- Tags let one exercise change another's state. Write `Squat / 3x8 / id: tags(1)`, then `state[1].rating = 10` from another script.
- Progression ladders: `Split Squat | ! Bulgarian Split Squat | Pistol Squat / 3x8 0lb`. `exerciseVariationIndex += 1` moves to the next movement.
- Built-in functions: `floor`, `ceil`, `round`, `sum`, `min`, `max`, `increment`, `decrement`, `roundWeight`, `rpeMultiplier`, `calculate1RM`, `zeroOrGte`, and `print` to show values in the preview.

See [Liftoscript](/doc/liftoscript) for every variable and function.
## Playground

Category: Programs. Page: https://www.liftosaur.com/features/playground

Simulate workouts to see how weights, reps and state variables change from week to week. Nothing you do there touches your history, settings or program.

### Test a program before you train

Open the **Program** tab and tap **Playground**. It sits next to **Preview** and **Edit**.

The Playground shows every day of the current week, one after another. Each day looks like a workout: a row of exercise thumbnails, and the sets of the selected exercise below. Tap a thumbnail to switch to another exercise.

Everything you do here is ephemeral. It does not change your settings, your workouts or your program. Leave the tab and come back, and the Playground starts from the program as it is now.

### Complete sets and change reps

Sets work the same way as on the workout screen:

- Tap the check on a set to complete it.
- Type a different number in the reps or weight field to log a set that did not go to plan.
- Long press a set to open the set editor and change its target.
- Tap **Add Warmup Set** or **Add Set** to add sets.
- An AMRAP set asks for the reps in a popup, like in a real workout.

The check icon at the top right of the exercise card completes every set of that exercise, warmups included, in one tap.

No rest timer runs in the Playground. A timed set has no get-ready countdown and does not advance on its own. Tap the next set to continue.

Under the sets, the app lists what the progression will do when you finish the day. For a `lp(5lb)` exercise with every set completed, you see **Exercise Changes** with the weight going from 155lb to 160lb. A custom progress script that calls `print()` shows its output there as **Progress Prints**.

### Finish the day and see the next week

Tap **Finish this day** at the bottom of a day. The app runs the finish day scripts of that day, applies the result to the Playground's copy of the program, and rebuilds every day from it. Bench Press now shows 160lb on Upper A.

Repeat this to walk through weeks of training in a minute. Finish the days in order and watch a linear progression climb, or a double progression move from 8 to 12 reps before the weight goes up. See [Progressions](/features/progressions) for how each kind works.

In a program with more than one week, a week bar appears above the days. Tap a week name to move between weeks.

### Change weights and state variables

Tap the edit icon at the top right of an exercise card. A sheet opens with:

- **1 Rep Max** for the exercise, used by percentage-based sets like `1x5 60%`.
- **Edit state variables** with every `state.` variable of the exercise, like `increment` for `lp(5lb)`. A variable marked **User Prompted** is one the program asks you for during a workout.

Change a value and tap **Done**. The Playground re-evaluates the program with the new values. Only the Playground sees the change. To change 1RM or state variables for real, use the **Preview** tab, which saves them.

### Start over

There is no reset button. Switch to **Preview** or **Edit** and back to **Playground**, and every day is rebuilt from the saved program. Editing the program in the **Edit** tab also rebuilds the Playground the next time you open it, so you can fix a progress script and try it again right away.

### Playground on a program preview

The program preview screen, which opens when you look at a program before choosing it, has an **Enable Playground** switch. Turn it on to try the program's logic the same way before you start it. See [Built-in programs](/features/built-in-programs) for how to preview a program.
## Editing on Desktop

Category: Programs. Page: https://www.liftosaur.com/features/web-editor

Write your program in a browser with a full keyboard, autocomplete and weekly volume stats, then send it to the phone with one link.

### Open the editor

Go to [liftosaur.com/planner](/planner), the **Web Editor** link in the site menu. You do not need an account to write a program there. The page starts with **Week 1** and **Day 1** and a help box that shows the syntax.

The editor is built for a big screen. On a laptop the stats sit to the right of the text, and the page can use up to 2400 pixels of width.

### Write the program

Each day has an **Exercises** text box. Type one exercise per line, with sets and reps after a slash:

```liftoscript
Bench Press / 5x5 / 90s
Squat / 3x8 @8
```

Autocomplete suggests exercise names as you type. Errors show inline, in the text. See [Liftoscript](/doc/liftoscript) for the full syntax.

Weeks are tabs. Inside a week you can **Add Day**, **Delete Day**, **Add Week**, **Duplicate Week** and **Delete Week**. **Add Week Description** and **Add Day Description** add Markdown notes.

Click the document icon in the toolbar to switch to **Full Program** mode. The whole program becomes one text, with `# Week 1` and `## Day 1` headings. This mode has find and replace with regular expressions, and multiple cursors with Cmd+click or Ctrl+click. Click **Apply** to go back to the per-day view, or **Cancel** to drop the changes.

### Check volume and balance

To the right of the editor is **Week Stats**. It shows **Total Sets**, **Strength Sets** and **Hypertrophy Sets**, then sets for **Upper**, **Lower**, **Core**, **Push**, **Pull** and **Legs**, then sets per muscle group.

Each line reads like `Chest: 8↑ (3s, 5h), 2d`: 8 sets in total that week, of which 3 are strength (`s`, under 8 reps) and 5 hypertrophy (`h`, 8 reps or more), on 2 days (`d`). A synergist set counts as a fraction, 0.5 by default, and each number is rounded on its own, so the parts may not add up to the total.

Every muscle group has a weekly set range, 10 to 12 sets unless you change it, and a frequency target, 2 days by default. The total is green inside the range, yellow between 70% of the minimum and 130% of the maximum, red further off. The arrow tells you which way to go: **↑** means add sets, you are below the minimum, **↓** means you are above the maximum, no arrow means inside the range. The day count is green at the target, yellow at half of it, red below. The type lines have no range, so no color and no arrow.

Hover a number to see which exercises count toward it and how much.

A front and back body figure below the numbers shades the muscles you train that week.

The cog icon opens **Settings**. There you set the **Strength sets %** and **Hypertrophy sets %** split, the **Synergist multiplier**, and the **Min**, **Max** and **Freq, days** targets under **Weekly Sets Per Muscle Group**. When you are signed in, these settings save to your account and the app uses them too.

In Full Program mode, three toolbar icons open week stats, day stats, and exercise stats for the line under the cursor. The exercise stats graph volume and intensity per week.

### Try the program before you run it

Click the eye icon to open **Program Preview**. It lists every workout the program will produce. Turn on **Enable Playground** to complete sets by tapping the squares. The preview then runs the progress scripts, so you can see how the weights change after a finished workout.

### Send it to your phone

Click the link icon. The editor copies a link to the clipboard and shows a QR code for it. The link holds the full program, so it never changes after you copy it. Editing the program again makes a new link.

In the app, open **Choose your program** and tap **Import from link**. The sheet says **Paste link from /program web editor**. Paste the link and tap **Add**. The app accepts `liftosaur.com/p/...` and `liftosaur.com/n/...` short links, and long links with the program data inside.

If you are signed in on the web, the banner above the editor has a second way. Click **Add this program to your account**. The program goes straight to your account, and the page opens it in saved mode.

### Edit an app program on a laptop

Sign in on the web and open [liftosaur.com/user/programs](/user/programs), the **My Programs** link in the site menu. Click a program name to open it in the editor. **New Program in Your Account** creates one there. **New Standalone Program** opens a blank `/planner` page.

From the phone, open the program, tap the three dots in the top right, then **Copy Private Link to Program**. Open the copied `liftosaur.com/user/p/...` link on the laptop. This item needs an account.

A program from your account opens with a **Save** button. There is no autosave. **Save** stays off until you change something, and the browser warns you if you leave with unsaved changes. Once saved, the phone gets the new program without a restart.

Every save on the web or in the app stores a snapshot. The **Versions** link next to the title opens the list, and you can restore any of the last 100.

### Train from a laptop

The app itself runs in a browser at [liftosaur.com/app](/app), with the same screens as the phone, including **Import from link**. Sign in with the same account and history and programs sync between the browser and the phone.

The page is a PWA (installable web app). Add it to your home screen or dock, and it opens full screen with the Liftosaur icon.
## Exercises

Category: Exercises and equipment. Page: https://www.liftosaur.com/features/exercise-library

Hundreds of built-in exercises with muscle maps. Search, filter by equipment and muscle, swap mid-workout, and open each one's history, records and 1RM.

### Add exercises to a workout

On the workout screen, tap the **+** at the end of the exercise thumbnails. The **Add Exercises** sheet opens with two groups, **Custom Exercises** and **Built-in Exercises**.

Each row shows the image, the name, the equipment, and the **Type**, **Target** and **Synergist** muscle groups. The muscles icon in the header switches those lines to single muscles. Tap the star on a row to mark a favorite, and the star in the header to show favorites only. Exercises already in this workout are greyed out.

Custom exercises are created from the same sheet. See [Custom Exercises](/features/custom-exercises).

### Search by name

Type in **Search by name**. Words match the name and the equipment, so `incline dumbbell` finds Incline Bench Press, Dumbbell. The default equipment version comes first.

### Add several at once

Tap the circle on each exercise you want. The button counts them: **Add to this workout (2)**, and the names of the selected exercises are listed under it, so you can check your picks after scrolling on. In the program editor it says **Add Exercises (2)**. A swap picks one exercise only.

### Filter by equipment and muscles

Tap the filter button next to the search field. The **Filter and sort** screen has:

- **Sort by**: **Name, A to Z** or **Similar Muscles**. Similar Muscles works only when you swap or edit an exercise.
- **Show only available equipment**, which hides exercises on equipment you hid in [Equipment](/features/equipment-and-gyms).
- **Equipment**, and **Type**: Core, Pull, Push, Legs, Upper, Lower.
- **Muscles**: whole **Muscle Groups** or single **Muscles**.

Back in the list, the filter button shows how many filters are on, and the line under the search says **Sorted by** and **Filters**.

### Swap an exercise mid-workout

Tap the three dots on an exercise card, then **Swap Exercise**. The picker opens with a **Current Exercise** card on top. Sort by **Similar Muscles** to see the closest matches first. Muscles that match the current exercise are green, the rest red.

A **Recent** group lists the last 5 exercises you swapped this one to. It hides while a search or a filter is on.

The weights come along. The app takes the weight from your history for the new exercise at the closest reps, converted to your target reps and RPE, or from your 1RM when there is no history.

### Pick from your program

The **From Program** tab lists your current program's exercises by week and day, and an exercise added from here keeps its progression. **Ad-hoc Exercise** adds a plain exercise.

A swap to an ad-hoc exercise drops the old exercise's progression. The settings icon at the top left of the sheet has one switch to keep it: **Keep existing program exercise logic when pick adhoc exercise**.

### Keep your usual alternatives ready

If you often swap the same exercises in, say Incline Bench Press when the flat bench is taken, define them in the program once with `used: none`. Such a line is not part of any day, so it never shows up in a workout on its own, but it carries its own sets, weight and progression:

```liftoscript
Incline Bench Press / 3x8 / 115lb / used: none / progress: dp(5lb, 8, 10)
```

When you swap during a workout, pick it from the **From Program** tab. It comes in with these sets and this weight instead of a guess from history, and its progression runs when you finish, so the next swap starts from the updated weight. See [Liftoscript](/doc/liftoscript) for `used: none` and [Changing Today's Workout](/features/changing-a-workout) for swapping.

### Your exercises list

Go to **Me → Exercises**. The list has **Custom Exercises**, **Current program exercises** and **Exercises from history**. Each row shows the **1RM** and the **Equipment**, or the **Default rounding** when no equipment is set. **Filter by name** and **Filter by type** narrow the list. Tap a row to open the exercise screen. The exercise name on the workout screen opens it too.

### The exercise screen

Under the name, the screen says **Built-in exercise** or **Custom exercise**, then **Type**, **Target** and **Synergist**. Tap them to see single muscles.

- **Notes**: notes in Markdown that stay with the exercise, not with one workout.
- **Default Rounding**: 5 lb or 2.5 kg unless you change it. Used when Equipment is not set.
- **Equipment**: one setting per gym. See [Equipment](/features/equipment-and-gyms).
- **Is Unilateral**: on by default for one-side exercises like Lunge, and for dumbbell curls. Reps count per side, and both sides add up for volume.
- **Two weights (count both)**: on by default for dumbbell exercises. Volume counts both dumbbells.
- **1 Rep Max**: the `rm1` variable in Liftoscript. Until you set it, the app uses the exercise's starting weight.

### Records, graph and history

With more than one workout, the screen shows the exercise graph. **Personal Records** lists **Max Weight** and **Max 1RM**, with the reps and weight of the set behind it and the date. Tap a record to open that workout.

The history below shows each workout's sets, **Volume**, program state and notes. Tap an entry to edit that workout. The filter icon has **Ascending sort by date**, **Hide entries without exercise notes** and **Hide entries without workout notes**.

### The rep max calculator

Tap the calculator icon next to **1 Rep Max**. Enter the reps, RPE and weight you can do, then the reps and RPE you want. **Use it!** writes the result into the field. The weight keypad has the same calculator key. Reps go from 1 to 24, RPE from 1 to 10.

The same calculator is on the site at [/rep-max-calculator](/rep-max-calculator), with a page per rep count like [/five-rep-max-calculator](/five-rep-max-calculator). **Other Rep Maxes** and **1RM Percentages** sit under the result.

### Override muscles

Every built-in exercise comes with target and synergist muscles, and the app counts your sets per muscle group from them in the week insights, the volume on the Program screen, and the graphs. Those defaults do not fit everyone. A wide-grip pull-up may be mostly back for you, while the default also counts biceps. A Romanian deadlift you do for the glutes still counts as hamstrings. And a custom exercise may have no muscles at all. The override fixes the counts for you without changing the exercise for anyone else.

Tap **Override Muscles** at the top of the exercise screen. Pick the muscles and give each a multiplier from 0 to 1. At 1 it is a target muscle, and each set counts in full. Below 1 it is a synergist, and a set counts as that share, the same way the default synergist multiplier works in [Week Insights](/features/week-insights). The override applies everywhere sets per muscle are counted.

### The exercises directory on the site

[/exercises](/exercises) lists every built-in exercise, with **Filter by name** and **Filter by type** like the app. Each exercise page is titled **How to perform ... with proper form** and lists its **Muscle Groups** and **Muscles**, target and synergist.
## Custom Exercises and Muscle Groups

Category: Exercises and equipment. Page: https://www.liftosaur.com/features/custom-exercises

Add exercises missing from the built-in list, with muscles, types, notes and an image. Let AI fill the muscles, and split or hide muscle groups.

### Where to create one

Two places open the same form. In a workout, tap the **+** button after the last exercise. The exercise picker opens. Find the **Custom Exercises** header and tap **Create** next to it. Or go to **Me → Exercises** and tap **Create custom exercise**. The exercise picker in the program editor has the same header.

### Fill in the form

The form has a **Name**, an image, an **Autofill Muscles and Types** button, **Target Muscles**, **Synergist Muscles**, **Types** and **Exercise Notes**. Only the name is required. It cannot contain `/ { } ( ) # [ ] | ! :`. **Save** in the top right stays disabled until the name is valid. Notes take Markdown.

### Let AI fill the muscles and types

Type the name, then tap **Autofill Muscles and Types**. The app sends the name to the Liftosaur server, and an AI model picks the target muscles, the synergist muscles and the types. If the name is not a known exercise, the app says "Couldn't autofill the muscles for this exercise. Try a different name!". You can change any field by hand after that.

### Clone another exercise

Tap **Clone from another exercise** above the name. A sheet lists every built-in exercise, per equipment, and your other custom exercises. Search by name and tap one. The app copies its image, target muscles, synergist muscles and types into your form. The name stays the one you typed. Use this for a variation, like a "Paused Bench Press" cloned from **Bench Press**.

### Pick muscles and types by hand

Tap the **Target Muscles** or **Synergist Muscles** field. The sheet shows every muscle with a small image, grouped by muscle group, including your custom groups. Tap a muscle to select or unselect it, then tap **Done**. The **Types** field opens a list of **Core**, **Pull**, **Push**, **Legs**, **Upper** and **Lower**. The muscles count towards sets and volume per muscle group in the week stats and the graphs. The exercise picker filters use both the muscles and the types.

### Add an image

Tap **Add image**. The sheet asks for a 2:3 aspect ratio and gives three sources:

- **From Image Library** opens the images of all built-in exercises, plus every image you uploaded before. Search by name and tap one.
- **From Camera** takes a photo with the phone camera.
- **From Photo Library** picks a photo from your phone.

Uploads need a signed-in account. Otherwise the app says "You need to be logged in to upload custom exercise images". On the web the second option is **Upload Image**, which picks a file from your computer. Once an image is set, tap **Change Image** to replace it. The image shows in the workout screen, in program previews and on the exercise stats screen.

### Use the exercise

Tap **Save**. The exercise appears under **Custom Exercises** in the picker. Select it and tap **Add to this workout**. In a program, write it by name like any built-in exercise:

```liftoscript
Landmine Press / 3x10 / 60s
```

To edit it later, open the picker and tap the pencil icon next to the exercise. Renaming it updates your current program text too. The **Delete Exercise** button at the bottom of the form asks for a confirmation first. See [Liftoscript](/doc/liftoscript) for the program syntax.

### Custom muscle groups

Go to **Me → Muscle Groups**. The built-in groups are Shoulders, Triceps, Back, Abs, Glutes, Hamstrings, Quadriceps, Chest, Biceps, Calves and Forearms. Each row shows the group image, the name and its muscles. Tap **Add custom muscle group**, type a name, and tap **Add**. The new group starts with no muscles. Use this to split a built-in group, like Front, Side and Rear Delts instead of one Shoulders group. Custom groups get their own weekly volume graph and their own row in the week stats. The same editor opens from **Edit Muscle Groups** under **Weekly Sets Per Muscle Group** in the program editor's muscle settings, in the app and on the web.

### Choose the muscles in a group

Tap the pencil icon next to a group. The **Choose Muscles** sheet lists every muscle. Tap one to add or remove it, then tap **Done**. This works for built-in groups too, and a muscle can be in more than one group.

### Hide and restore built-in groups

Tap the crossed eye icon on a built-in group to hide it. Tap the trash icon on a custom group to delete it. Hidden built-in groups are listed under **Unhide muscle groups:** at the bottom of the screen. Tap a name there to bring the group back.
## Equipment, Plates and Gyms

Category: Exercises and equipment. Page: https://www.liftosaur.com/features/equipment-and-gyms

Tell Liftosaur what bar, plates and fixed weights you have, and it rounds every target weight to what you can load. Keep a separate equipment list for each gym.

### Why a weight is crossed out

Your program asks for `60%` of a 135 lb 1RM, which is 81 lb. So the set shows 81 lb crossed out, and 80 lb underlined next to it.

Tap the underlined weight. The **Why is the weight adjusted?** popup shows the percentage and the 1RM, any kg to lb conversion, the bar weight, and the plates per side.

The rule for each kind of equipment:

- Bar and plates: the bar plus the heaviest plate combination that does not go over the target. 45 lb bar + 10 + 5 + 2.5 per side is 80 lb.
- Fixed weights: the heaviest fixed weight that does not go over the target, or the lightest one if all are heavier.
- No equipment: the nearest multiple of the exercise's **Default Rounding**, 5 lb or 2.5 kg unless you change it.

Rounding happens on the workout screen only. Program state variables stay exact. With Premium, the expanded set also lists the plates for each side.

### Where your equipment lives

Go to **Me → Available Equipment**. Each row is one piece of equipment with a summary, like `Bar: 45 lb · 45 lb×8, 25 lb×4`. Tap the arrow to expand it.

You start with **Barbell**, **Trap Bar**, **Leverage Machine**, **Smith Machine**, **Dumbbell**, **EZ Bar**, **Cable** and **Kettlebell**.

### Set the bar, plates and sides

Expand a row to edit it:

- **Bar** is the weight of the empty bar or machine.
- **Sides** is how many sides take plates, 1 to 4. A barbell has 2. A machine with one peg has 1.
- **Number of Barbell plates available** lists each plate weight and how many you own in total. A plate only counts when you have one for every side, so 3 plates of 45 lb count as 2 on a barbell.
- **Add New Plate Weight** asks for a weight and adds it with a count of 2. The trash icon on a plate row removes that weight.

### Fixed weights

Dumbbells, kettlebells and weight stacks come in fixed steps. Turn on **Is Fixed Weight** for that row. The plate fields go away, and **Available fixed weight for Kettlebell** lists one line per weight. **Add New Fixed Weight** adds one, the trash icon removes one.

### lb or kg per equipment

Every row has a **Unit** field: **Default**, **lb** or **kg**. Pick **kg** for a machine with a kg stack in a lb gym. Exercises on that equipment show kg in the workout and in history. Graphs stay in your default unit.

### Bodyweight, weighted and assisted pull-ups

Two switches on each plate-loaded row cover pull-ups, dips and the like. **Bodyweight for Bar** uses your current bodyweight as the bar, and the **Bar** field turns gray to show it. **Is assisting?** makes the plates reduce the total instead of adding to it. Your bodyweight comes from **Me → Measurements**, and from Apple Health or Health Connect when that sync is on.

**Weighted pull-ups.** Add a custom equipment, for example **Belt**, turn on **Bodyweight for Bar**, leave **Is assisting?** off, and enter the plates you hang from the belt. In the program, the weight is the extra load, and an `update` script adds your bodyweight when the workout starts:

```liftoscript
Pull Up, Belt / 3x8 25lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight + originalWeights[ns]
  }
~} / progress: lp(5lb)
```

The sets show bodyweight plus 25 lb, the plates calculator shows what to hang, and a good session makes it 30 lb next time.

**Assisted pull-ups.** Use the assisted machine equipment, or a custom one, turn on both **Bodyweight for Bar** and **Is assisting?**, and enter the machine's stack as plates. For bands, add one "plate" per band with the weight it takes off. In the program, the weight is the assistance, and the script subtracts it:

```liftoscript
Pull Up, Leverage Machine / 3x8 50lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight - originalWeights[ns]
  }
~} / progress: lp(-5lb)
```

A good session lowers the assistance to 45 lb. If a weight drops to 0 by surprise, the **Why is the weight adjusted?** popup says when **Is assisting?** is the reason.

**Plain bodyweight.** Write `0lb` and keep the `update` script, so the sets show your bodyweight and the history records it. See [Progressions](/features/progressions) for `update` scripts and the `bodyweight` variable.

### Hide equipment you do not have

Tap the eye icon on a built-in row to hide it. Hidden rows collect in one line at the bottom, **Hidden Equipment: Smith Machine**. Tap the name there to bring it back.

By default the exercise picker leaves out every exercise that uses hidden equipment, so a gym without a Smith machine never offers Smith machine exercises. To see them anyway, open the filter screen in the picker and turn off **Show only available equipment**. The switch is remembered until you change it back.

### Add your own equipment

Tap **Add New Equipment Type**, enter a name and tap **Add**. The new row starts with a 0 lb bar and four 10 lb plates. Expand it to rename it and set its plates. The trash icon deletes it after **Are you sure?**.

### Attach equipment to an exercise

Each exercise uses its built-in equipment unless you change it. Bench Press uses the Barbell.

During a workout, tap the **Equipment:** link under the exercise name. The popup lists **None** and every visible piece of equipment in the current gym. With **None**, it shows the **Default Rounding** field instead.

The same settings live in **Me → Exercises**. Tap an exercise to open its stats page. **Default Rounding** applies when no equipment is set. Below it is one equipment field per gym, under **Equipments for each Gym**.

Program scripts can step by your plates too:

```liftoscript
weights[1] = increment(completedWeights[1]);
```

`increment` and `decrement` return the next or previous weight you can load with the exercise's equipment. See [Liftoscript](/doc/liftoscript) for the rest.

### More than one gym

Tap **Manage Gyms** at the top of the equipment screen, then **Add Gym**. Name it and tap **Add**. The new gym gets the default equipment list.

On the **Gyms** screen, the pencil opens that gym's equipment, with a **Gym Name** field on top. The copy icon duplicates the gym with its equipment. The trash deletes it, and only shows with more than one gym.

### Switch gyms

With two or more gyms, **Me** gets a **Current Gym** field. Pick a gym there, and every exercise switches to the equipment you attached for that gym. **Available Equipment** now opens the **Gyms** screen first.

A travel gym needs no setup. Leave its exercises on **None**, and the app rounds to **Default Rounding** until you are back.
## Graphs

Category: Progress. Page: https://www.liftosaur.com/features/graphs

See max weight, volume and estimated 1RM per exercise, weekly volume per muscle group, and bodyweight. Long-press a point to see the workout behind it.

### Where the graphs live

Tap **Graphs** in the footer. Graphs are a Premium feature. Without Premium, the tab opens the subscription screen instead.

The first time, the screen says "Select graphs you want to display by tapping filter icon at right top corner." Every graph you pick stays on this screen, in the order you set, until you remove it.

Each graph is a line chart with the date on the X axis.

### Choosing which graphs to show

Tap the filter icon at the top right. A sheet opens with four groups:

- **Selected Graphs**. The graphs on the screen. Drag the handle on the left to reorder. Tap the X on the right to remove.
- **Available Exercise Graphs**. Every exercise in your history that is not on the screen yet. Tap one to add it.
- **Available Muscle Groups Graphs**. One graph per muscle group, plus **Total Weekly Volume**.
- **Available Stats Graphs**. **Bodyweight** and every length or body fat measurement you have logged.

If you have no history and no measurements, the sheet says "You haven't tracked any workouts or measurements yet."

### Reading an exercise graph

The dropdown at the top right of each exercise graph switches between **Max Weight** and **Volume**.

- **Max Weight** shows the heaviest set of that exercise in each workout. A second line shows the estimated one rep max (e1RM) of your best set that day: its weight divided by the share of 1RM that the RPE chart gives for its reps at its RPE, with RPE 10 assumed when none is logged. It is the same number as the **e1RM** column on the workout screen, see [Logging a Workout](/features/workout-screen).
- **Volume** shows weight × reps summed over all sets in the workout.

Long-press a point. A legend appears above the chart with the date, the weight and reps, and the e1RM. It also shows the notes you wrote for that exercise or workout, and the state variables of the exercise on that day, like `rm1` or `increment`. Tap **Workout** in the legend to open that workout. Tap the X to close the legend.

With **Add program lines to graphs** on, a vertical line marks each date you switched programs, labelled with the program name.

### Zooming in

Pinch with two fingers to zoom the date range. Drag with two fingers to move the zoomed area. Double-tap the chart to reset the zoom.

### Muscle group volume per week

A muscle group graph has one point per week. The dropdown switches between **Volume** and **Sets**.

Liftosaur counts only sets you finished. A set for a target muscle counts once. A set for a synergist muscle counts by the synergist multiplier from your settings. The **Total** graph counts every finished set once. The week starts on Monday or Sunday, following **Week starts from** in **Me → Settings**.

The built-in groups are shoulders, triceps, back, abs, glutes, hamstrings, quadriceps, chest, biceps, calves and forearms. Custom muscle groups get a graph too. To change which muscles an exercise trains, open the exercise from **Me → Exercises** and tap **Override Muscles**.

### Bodyweight and measurements

Add **Bodyweight** from the **Available Stats Graphs** group. It plots every bodyweight entry you logged. Length measurements, like waist or chest, and body fat percentage each get their own graph in the same way.

Once the bodyweight graph is on the screen, a new toggle appears in settings: **Add bodyweight to all graphs**. It draws your bodyweight as a green line on every exercise graph, so you can see how your lifts moved with your weight.

### Graph settings

The **Settings** group at the top of the picker sheet has:

- **Default exercise graph type**. **Weight** or **Volume**. New exercise graphs open with this type.
- **Default muscle group graph type**. **Volume** or **Sets**.
- **Same range for X axis for all graphs**. Off by default. Each graph starts at its first date and ends at its last. On, every graph shares one date range, capped to the last year, so you can compare them.
- **Add bodyweight to all graphs**. Shown once the bodyweight graph is selected.
- **Add calculated 1RM to graphs**. On by default. Turns the e1RM line on the Max Weight graphs on or off.
- **Add program lines to graphs**. Turns the program change lines on or off.

### Personal records for one exercise

Every exercise also has its own **Exercise Stats** screen. Open it from **Me → Exercises** and tap the exercise, or tap the exercise name during a workout.

The screen shows the exercise graph with the e1RM line and program lines always on. Below the graph, the **Personal Records** card lists your **Max Weight** and **Max 1RM**, each with the date. The 1RM row also shows the set behind it, like `5 x 225lb`. Tap a record to open that workout. The exercise history follows below.

Without Premium, the graph on this screen is blurred and does not respond to touch. The personal records stay visible.
## Week Insights

Category: Progress. Page: https://www.liftosaur.com/features/week-insights

See this week's total sets, volume, PRs, strength and hypertrophy split, and sets per muscle group against your target range. Tap a number for details.

### Read the week card

Open the **Home** tab. Under the week calendar there is a card with a fire icon and the date range of the week. It shows three numbers for that week:

- Total volume, in your units.
- The number of sets you completed.
- The number of new personal records, with a trophy.

Only sets with at least one completed rep count. A skipped set adds nothing.

For a past week, a green or red number next to volume and sets shows the change against the week before. **+12** next to sets means twelve more sets than last week. The current week has no comparison yet.

The card follows the week you are looking at. Scroll the workout list, and the calendar and the card move to the week of the top workout. Tap the week calendar to open the month view and jump to any workout.

### Open the details

Tap **Show More** on the card. A sheet opens with the full breakdown for that week.

If you set a personal record that week, the sheet starts with **Personal Records**: the exercise, the new max weight or estimated 1RM, and the previous best.

Below that is the total number of sets, and the split:

- **Strength**: sets with fewer than 8 completed reps, and their share in percent.
- **Hypertrophy**: sets with 8 or more completed reps, and their share.

The percent is green when it reaches your target share, yellow when it is within 10 points below it, red otherwise. The default target is 30% strength and 70% hypertrophy.

Next come six exercise types: **Upper**, **Lower**, **Core**, **Push**, **Pull** and **Legs**. Each line reads like `24 (8s, 16h), 3d`: 24 sets in total, of which 8 counted as strength (`s`, under 8 reps) and 16 as hypertrophy (`h`, 8 reps or more), spread over 3 days (`d`). Types have no target range, so these lines have no color and no arrow.

### Sets per muscle group against your target range

The last block lists every muscle group you trained that week: **Shoulders**, **Triceps**, **Back**, **Abs**, **Glutes**, **Hamstrings**, **Quadriceps**, **Chest**, **Biceps**, **Calves**, **Forearms**, and any custom groups. A body drawing next to the list shades the muscles by how much work they got.

Each line uses the same form as the type lines, plus an arrow. `Hamstrings: 3↑ (2s, 2h), 1d` means 3 sets in total, of which 2 counted as strength (`s`, under 8 reps) and 2 as hypertrophy (`h`, 8 reps or more), spread over 1 day (`d`). The parts may not add up to the total, because synergist sets count as a fraction and each number is rounded to a whole set on its own. 1.5 strength and 1.5 hypertrophy sets show as `3 (2s, 2h)`.

Every muscle group has a weekly set range, 10 to 12 sets unless you change it. The total is colored against that range:

- Green: inside the range.
- Yellow: between 70% of the minimum and 130% of the maximum.
- Red: further off than that.

The arrow after the total tells you which way to go. **↑** means you are below the minimum and should add sets. **↓** means you are above the maximum. No arrow means you are inside the range. In the example, 3 sets of hamstrings against a 10 to 12 range gives a red `3↑`.

Every group also has a frequency target, 2 days unless you change it. The day count is green when you reach it, yellow at half of it, red below.

To change the range or the frequency for one group or for all of them, tap **Change Set Range Settings** at the bottom of the sheet. The **Muscle Settings** sheet on the right has a **Min**, **Max** and **Freq, days** row per group. The section on target ranges below walks through it.

An exercise counts one set for each of its target muscle groups. For a synergist muscle group it counts a fraction of a set, 0.5 by default. You can change the target and synergist muscles of one exercise with **Override Muscles** at the top of its Exercise Stats screen, under **Me → Exercises**.

### See which exercises count

Tap any number in the sheet, a type like **Push** or a group like **Chest**. A sheet lists the exercises that made it up, one per line: `Bench Press: 12 (4s, 8h)`. Synergist exercises show in grey.

### Change the target ranges

Tap **Change Set Range Settings** at the bottom of the Week Insights sheet. The **Muscle Settings** sheet opens. These settings apply to your whole account, and the Week Stats on the Program screen use the same values.

At the top:

- **Synergist multiplier**: how much of a set a synergist muscle group gets. Default 0.5.
- **Sets split preset**: **Strength** sets the targets to 70% strength and 30% hypertrophy, **Hypertrophy** sets 30% and 70%.
- **Strength sets %** and **Hypertrophy sets %**: type your own targets.

Under **Weekly Sets Per Muscle Group**:

- **Muscle Groups sets preset**: **Novice** is 10 to 12 sets, 2 days. **Intermediate** is 13 to 15 sets, 3 days. **Advanced** is 16 to 20 sets, 4 days.
- **Change All**: one **Min**, **Max** and **Freq, days** for every group at once.
- One row per muscle group with its own **Min**, **Max** and **Freq, days**.

Changes save on their own. Close the sheet and the colors in Week Insights update.

### Customize the muscle groups

Tap **Edit Muscle Groups** in Muscle Settings, or go to **Me → Muscle Groups**. Each group shows its image and the muscles in it. You can:

- Hide a built-in group with the eye icon. It comes back from **Unhide muscle groups** at the bottom.
- Tap the pencil to change which muscles belong to a group.
- Tap **Add custom muscle group** to make a new one, for example Rear Delts.

Custom groups get their own row in the weekly ranges and their own line in Week Insights.

### Premium

Week Insights is a Premium feature. Without Premium, the card on the Home tab shows **See Week Insights**. Tap it to open the subscription screen.
## Measurements, Sleep and Nutrition

Category: Progress. Page: https://www.liftosaur.com/features/measurements

Log bodyweight, body fat and 13 body sites, with a moving average graph, and see sleep, calories and protein from Apple Health or Health Connect.

### What you can track

Liftosaur keeps three kinds of body measurements:

- **Bodyweight**, in your weight unit, kg or lb.
- **Bodyfat**, in percent.
- 13 body sites, in your length unit, in or cm: Neck, Shoulders, Bicep Left, Bicep Right, Forearm Left, Forearm Right, Chest, Waist, Hips, Thigh Left, Thigh Right, Calf Left, Calf Right.

Each measurement is a value with a date. You can log as often as you like, and you can backfill old dates.

### See your history

Go to **Me → Measurements**. The **My Measurements** group on the Me screen also shows your latest **Bodyweight** and **Bodyfat**. Tap either row to open that type.

At the top, **Type** picks the measurement to show. Only types with at least one value are listed. With three or more values, a graph appears above the list. Tap the graph to see the value on a given date. The graph needs Premium. Without it, the graph is blurred.

Below the graph is the **List of measurements**. Each row has the date, the value and a trash icon. Tap the date to change it. Tap the value to edit it. The trash icon deletes the row after an **Are you sure?** confirmation.

### Smooth the graph with a moving average

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

### Look at one body site

Tap **Type** and pick a site, such as **Waist**. The graph and the list switch to that site, in your length unit. A site you never logged does not appear in the list.

### Add a measurement

Tap **Add measurements** at the top of the Measurements screen. Every enabled type gets a field with its unit. Each field starts with your last value, so you only change what moved. **Clear All Fields** empties them. All fields are optional. An empty field adds nothing.

Pick the **Date** if you are logging for another day. Today is the default.

On iOS, a **Sync to Apple Health** toggle sends bodyweight, body fat and waist to Apple Health. On Android, **Sync to Google Health Connect** sends bodyweight and body fat to Health Connect. See [Health sync](/features/health-sync) for the settings behind those toggles.

Tap **Done** to save.

### Choose which measurements to track

On the Add Measurements screen, tap the filter icon in the top right. The **Enabled measurement types** sheet lists Weight, Bodyfat and the 13 sites, each with a switch. Only the enabled types get a field on the Add Measurements screen. Turning a type off keeps the values you already logged.

### Sleep, calories and protein

Go to **Me → Sleep & Nutrition**. The screen has three tabs: **Sleep**, **Calories** and **Protein**. Each tab has a graph, with three or more days, and a list of days below it. Sleep shows as hours and minutes, calories in kcal, protein in g.

The app does not let you type these values. They come from Apple Health on iOS or Health Connect on Android. Turn on **Sync Sleep & Nutrition** in **Me → Apple Health** or **Me → Google Health Connect**. See [Health sync](/features/health-sync) for the permissions.

The app reads the data when it opens. It stores one total per day. On iOS it reads the last 90 days, on Android the last 30, because Health Connect does not return older records. If a day's total changes in the source, the next read replaces it in the app.

You cannot delete an imported day, because the next read would bring it back. Tap the trash icon to hide it instead. Hidden days move under a **Show N hidden records** link. Tap the undo icon there to bring one back. Days that disappear from the source stay in the app until you hide them.

The data syncs to your account with the rest of your measurements. It is available through the REST API and the MCP server as the `health` category, so an AI assistant can compare your sleep or protein with your training.

### Measurements next to your lifts

On the **Graphs** screen, the graph picker has an **Available Stats Graphs** group. Add a measurement graph there to see it under your exercise graphs. The **Add bodyweight to all graphs** option in the same picker draws your bodyweight on every graph.
## Apple Health and Health Connect

Category: Progress. Page: https://www.liftosaur.com/features/health-sync

Send finished workouts and body measurements to Apple Health or Health Connect, and read bodyweight, body fat, sleep, calories and protein back into the app.

### What syncs

Liftosaur connects to **Apple Health** on iOS 15 and newer, and to **Health Connect** on Android 14 and newer. It needs the app from the App Store or Google Play. The web app has no health sync.

The app writes:

- Finished workouts, with start time, end time and active calories.
- Bodyweight and body fat that you log in the app. On iOS, waist too.

The app reads:

- Bodyweight and body fat. On iOS, waist too.
- Sleep, dietary calories and protein, one total per day.

### Turn it on

Go to **Me**, scroll to the **Sync** group, and tap **Apple Health**. On Android the row is **Google Health Connect**. The screen has four toggles:

- **Sync Workouts** sends each workout when you finish it.
- **Confirm each workout sync?** asks before every send.
- **Sync Measurements** reads bodyweight, body fat and waist from Health.
- **Sync Sleep & Nutrition** reads sleep, calories and protein.

On Android, turning on **Sync Workouts** or **Sync Measurements** opens the Health Connect permission screen right away. On iOS, the Health permission sheet opens the first time the app reads or writes. Turning on **Sync Sleep & Nutrition** starts a read at once on both platforms.

Sync runs when the app opens and when it comes back to the foreground. The app reads from Health at those moments. It writes to Health when you finish a workout or save a measurement.

### Send a workout

Turn on **Sync Workouts**. When you tap **Finish** on a workout, the app saves it to Health as a strength training workout. The start and end times come from the workout timer. Active calories are 6 kcal per minute of workout time. Paused time does not count.

Turn on **Confirm each workout sync?** and the app asks first: "Do you want to sync this workout to Apple Health?" Tap **OK** to send it or **Cancel** to skip it. With the toggle off, the workout goes to Health without a question.

If you finish the workout on the Apple Watch and the watch saves it to Health, the phone does not save it a second time.

If the save fails, the app shows "Couldn't save workout to Apple Health".

### Send a past workout

Open a past workout from the **Home** tab. Tap the menu icon in the top right, then **Share**. The sheet has **Sync to Apple Health**, or **Sync to Google Health** on Android. Tap it, and the app writes that workout with its original times. It shows "Synced to Apple Health" when done.

### Send measurements

Go to **Me → Measurements** and tap the add button. At the bottom of the form is a **Sync to Apple Health** toggle. On Android it is **Sync to Google Health Connect**. It starts in the same state as **Sync Measurements** in the Health settings, and you can flip it for one save.

With the toggle on, saving sends bodyweight, body fat and waist to Apple Health. Health Connect gets bodyweight and body fat. Other body sites stay in the app. See [Measurements](/features/measurements) for the form itself.

### Read measurements

With **Sync Measurements** on, the app reads bodyweight, body fat and waist from Apple Health. On Android it reads bodyweight and body fat from Health Connect. The values appear in **Me → Measurements** in your units, next to the ones you typed.

After the first read, the app skips the values it wrote itself, so nothing shows twice. A value you deleted in the app does not come back on the next read.

The read is one way. If you delete a value in Health, it stays in the app until you delete it there.

### Read sleep and nutrition

With **Sync Sleep & Nutrition** on, the app reads three metrics and stores one total per day:

- **Sleep**, the minutes asleep. Time awake in bed does not count.
- **Calories**, the dietary calories you logged in a food app, in kcal.
- **Protein**, in grams.

On iOS the app reads the last 90 days. On Android it reads the last 30, because Health Connect does not return older records. If a day's total changes in the source, the next read replaces it in the app.

The app never writes these metrics. Open **Me → Sleep & Nutrition** to see a graph and a list per metric. You can hide a day from the list and unhide it later. The data syncs to your account and is available through the REST API and the MCP server as the `health` category. See [Measurements](/features/measurements) for the screen.
## Sharing Workouts

Category: Sharing and data. Page: https://www.liftosaur.com/features/sharing-workouts

Post a finished workout to Instagram Story, Feed or TikTok as an image, share it anywhere, copy it as text or a link, or show it on a public profile page.

### Share right after the workout

Tap **Finish** on a workout. The summary screen shows your time, volume, sets, reps and sets per muscle group. Under **Share it!** you get five buttons:

- **IG Story** posts the workout image to an Instagram Story.
- **IG Feed** posts it to your Instagram Feed.
- **Tiktok** opens TikTok with the image.
- **Text** copies the workout as text.
- **More** renders the image and opens the system share sheet.

Below the row, **or just copy a link** copies a web link to this workout. Tap **Continue** when you are done.

### Share a past workout

Open any past workout from the **Home** tab. Tap the three-dot menu in the top right and pick **Share**. A sheet opens with:

- **Share to Instagram Story**
- **Share to Instagram Feed**
- **Share to Tiktok**
- **Sync to Apple Health** or **Sync to Google Health**, when the app can write to it.
- **Copy link to workout**
- **Share Image...**
- **Copy as Text**

The Instagram and TikTok items are only in the iOS and Android apps. The web app offers **Image**, **Text** and **Copy Link**.

### What the image shows

Every share option builds the same workout card:

- The Liftosaur logo, and a trophy with the number of personal records you set in this workout.
- The program name and the day name.
- **Time**, **Volume**, **Sets** and **Reps** totals.
- One row per exercise, with its picture, its name, a trophy if it was a PR, and the sets you did.

Pick **Share to Instagram Story**, **Share to Instagram Feed** or **Share to Tiktok** and the app shows a preview before it hands off. The first frame is **Default Background**. The Feed image is square, the Story and TikTok images are tall. Tap **Share** to send it. Instagram or TikTok opens with the image already attached, and you finish the post there.

### Use your own photo as the background

Swipe the preview to the left. The second frame has a camera icon and the link **Your photo as background**. Tap either one and choose **From Camera** or **From Photo Library**. The workout card is drawn over your photo. The preview scales the card so it fits the bottom of the photo. Tap **Share** to send this frame instead of the default one.

### Share the image anywhere else

**More** on the finish screen and **Share Image...** in the share sheet render the same card to a PNG named `workout.png` and open the system share sheet. Pick any app or save it to your photos. In the web app the file downloads instead.

### Copy the workout as text

**Text** on the finish screen and **Copy as Text** in the share sheet put the workout on the clipboard in a compact text form. The app shows **Copied!**. The text starts with the date, the program and day, and the duration in seconds. Then one line per exercise with completed sets, warmups and targets:

```
2026-09-27 10:15:00 +02:00 / program: "Demo Program" / dayName: "Upper A" / week: 1 / dayInWeek: 1 / duration: 3120s / exercises: {
  Bench Press / 3x5 135lb / warmup: 1x10 45lb, 1x5 95lb
  Bent Over Row / 1x8 95lb, 1x6 95lb
}
```

Sets with the same reps and weight are grouped, like `3x5 135lb`. Different sets are listed one by one, like `1x8 95lb, 1x6 95lb`. Workout notes and exercise notes go in as `//` lines. Exercises where you completed no set are left out.

### Copy a link to the workout

**or just copy a link** on the finish screen and **Copy link to workout** in the share sheet copy a web link like `https://www.liftosaur.com/record?id=<workout id>&user=<your user id>`. You must be signed in, otherwise the app says "You should be logged in to copy link to a workout". The page shows the program and day, the date, a **New Personal Records** block when you set any, your max weights, and every exercise with its sets. Anyone with the link can open it.

### Your public profile page

Go to **Me**. Under **Account**:

- **Nickname** is the name shown on your profile page. The app says "Used for profile page if you have an account".
- **Is Profile Page Public?** appears when you are signed in. Turn it on, and two links appear under it: **Copy Link To Clipboard** and **Open Public Profile Page**.

The link is `https://www.liftosaur.com/profile/<your user id>`. The page title is your nickname and "Profile Page". It shows your current program, then **Main Lifts Progress** for Bench Press, Overhead Press, Squat and Deadlift, then **Rest Lifts Progress** for every other exercise. Each exercise has "Max lifted reps x weight" and a **Progress Graph** with your program lines and estimated 1RM. Turn the toggle off, and the link answers "The user's profile is not public".
## Sharing Programs

Category: Sharing and data. Page: https://www.liftosaur.com/features/sharing-programs

Copy a public link to any program, generate an image with a QR code, or grab a private link to edit it on your laptop. Anyone with the link can add it.

### How it works

A program in Liftosaur is text, and a link is a snapshot of that text. Sharing a program means sharing the snapshot as it is right now. If you edit the program later, the link still opens the old version. To share the new version, generate a new link.

All sharing starts on the **Program** tab. Tap the **⋮** menu in the top right corner. The menu has:

- **Copy Shareable Link to Program**, to send the program to somebody.
- **Generate program image**, to post it as a picture.
- **Copy Private Link to Program**, to edit it on your laptop in a browser. Only shown when you are signed in.
- **Show program versions**, covered on the [Program Editor](/features/program-editor) page.

### Share a public link

Tap **Copy Shareable Link to Program**. The app packs the program, its custom exercises, your units and timer settings into a short link. It looks like `https://www.liftosaur.com/p/abc123`. The app copies the link to the clipboard and shows it in a popup.

The link does not need your account. Anyone can open it. It never changes, so what you shared is what they get, even if you keep editing the program.

If you turned on the **Affiliate Program** under **Me → Earn money with Liftosaur**, the link carries your affiliate id. The menu item says **as an affiliate link** in that case.

### What a public link opens

Opening `/p/...` in a browser shows the program in the **Web Editor** on liftosaur.com. Near the top, a yellow box says **To use this program**:

- If they are signed in, they tap **Add this program to your account**. If the program uses the other weight unit, the site asks: "The program has weights in kg, do you want to convert them to lb?". The program is saved to their account and opens at `/user/p/...`.
- If they are not signed in, the box shows the App Store and Google Play badges. They install the app, copy the link with the link icon under the program, and import it on the **Choose Program** screen.

Someone who edits the program in the Web Editor sees a red bar: "Made changes to the program, but the link still goes to the original version. If you want to share updated version, generate a new link."

### Import a link into the app

Go to **Me → Program** and tap **Import** in the top right corner. Paste the link into the popup and tap **Add**. The app asks "Do you want to import program Demo Program?". If a program with the same id is already there, it asks to overwrite it. If the weights are in the other unit, it offers to convert them.

The link can be a short `/p/...` link or a long link with the program encoded in it. Custom exercises come along. A custom exercise you already have, with the same name, is kept as yours.

### Share the program as an image

Tap **Generate program image** in the **⋮** menu. The **Settings** tab has:

- **Include program details**, the program name with the week and day count at the top.
- **Include QR Code**. The QR code opens the public link, so a reader can scan the picture and import the program.
- **Include week descriptions** and **Include day descriptions**.
- **Columns**, how many days go side by side. Default 1.
- **Days to show**, one toggle per week and per day, with **Select All** and **Deselect All**.

The **Preview** tab shows the picture with your options applied. Tap **Generate image** to render it, then the system share sheet opens to save or send the PNG. A very long program may not fit in one picture. The app then asks for more columns or fewer days.

### Edit on a laptop with a private link

Tap **Copy Private Link to Program**. The app copies `https://www.liftosaur.com/user/p/<program id>` to the clipboard. Open it in a browser where you are signed in to the same account. The site asks you to sign in first if you are not.

The private link opens the live program from your account, with a **Save** button and a **Versions** list. Edits saved there sync back to the app. The link is useless to others. Another account gets "Not Found", and a signed-out browser gets the login page.

### Export every program as text

Go to **Me** and scroll to **Import / Export**. Tap **Export all programs to text file**. The app writes one `.txt` file with every program in [Liftoscript](/doc/liftoscript), each under a header like `======= Demo Program =======`, and opens the share sheet to save it. The text is the same as the full text mode of the editor, so you can paste a program back into a new program later.

Backups, CSV export and JSON program files are on the [Import and Export](/features/import-export) page.
## Import and Export

Category: Sharing and data. Page: https://www.liftosaur.com/features/import-export

Import workout history from Hevy or a CSV file, with a preview and undo. Export everything as JSON, your history as CSV, or your programs as text.

### Where to find it

Go to **Me** and scroll to the **Import / Export** section. It has three export rows and four import rows. On the phone, every export opens the system share sheet, so you can save the file to Files or send it to another app. In the browser, the file downloads.

### Back up all your data

Tap **Export data to JSON file**. The app writes everything it stores about you into one file: history, programs, settings, measurements, and custom exercises. The file is named `liftosaur-YYYYMMDD.json`, with today's date.

Keep this file as a backup. It is the only export that you can load back into the app in full.

### Export your history as a spreadsheet

Tap **Export history to CSV file**. The app writes one row per set into `liftosaur_YYYYMMDD.csv`. Warmup sets are rows too, with **Is Warmup Set?** set to 1.

The columns are: Workout DateTime, Program, Day Name, Exercise, Is Warmup Set?, Required Reps, Completed Reps, Is AMRAP?, Required RPE, Completed RPE, Log RPE?, Required Weight Value, Required Weight Unit, Completed Weight Value, Completed Weight Unit, Ask Weight?, Completed Reps Time, Target Muscles, Synergist Muscles, Notes.

Open it in Excel, Google Sheets, or any tool that reads CSV. The same file can be imported back.

### Export your programs as text

Tap **Export all programs to text file**. The app writes every program as Liftoscript text into `liftosaur_all_programs_YYYYMMDD.txt`. Each program starts with a line like `======= Demo Program =======`, followed by its full text.

You can paste that text back into the program editor to recreate a program. See [Program Editor](/features/program-editor) for the editor and [Liftoscript](/doc/liftoscript) for the syntax.

### Import history from Hevy

Export your workouts from Hevy as a CSV file first. Then go to **Me → Import history from other apps** and tap **Upload CSV file from Hevy**. Pick the file.

The app maps Hevy exercise names to Liftosaur exercises, for example "Bench Press (Barbell)" becomes Bench Press with a barbell. A name it does not know becomes a custom exercise. Warmup sets, weights in kg or lb, and exercise notes come along.

If you pick a Liftosaur CSV here by mistake, the app tells you and points you to the right row.

### Import history from a Liftosaur CSV

Tap **Import history from CSV file** and pick the file. The file must use the same columns as **Export history to CSV file**. The app checks the header row for **Workout DateTime**, **Exercise** and **Is Warmup Set?**. Tap the help icon next to the row for a link to an example file and formatting instructions.

Rows the app cannot read are skipped and listed on the preview. If more than half the rows fail, the import stops with an error instead.

### Check the preview before you import

Both CSV imports open an **Import Preview** screen. Nothing is saved yet. The screen shows:

- How many workouts will be imported and their date range.
- Every workout, drawn the way it will look on the Home screen.
- Which exercises will be created as custom. Tap **Show** to see the names.
- Rows skipped because they could not be parsed, with the row number and the reason.
- Values that look suspicious: a weight over 3000 lb, more than 1000 reps, a date before 2000 or more than a day in the future.
- Workouts that look like duplicates of your existing history. A workout is a duplicate when it starts within one minute of one you already have. Duplicates are skipped by default. Tap **Skipped - Include?** to import them anyway.

Tap **Import** in the top right to save. The app returns to Home and shows "Successfully imported N workouts".

### Undo an import

After your first import, a **Recent imports** row appears in the **Import / Export** section. It lists your last 5 imports, each with the source, the date, and the number of workouts and new exercises.

Tap **Undo** next to an import. The app asks to confirm, and warns you if you edited some of those workouts after the import. Undo removes the workouts from that import. It also removes the custom exercises that import created, unless a program or another workout uses them.

### Restore from a JSON backup

Tap **Import data from JSON file** and pick a file made by **Export data to JSON file**. The app warns you first: "Importing new data will wipe out your current data." Tap OK to replace everything in the app with the contents of the file.

Old backups work too. The app runs its data migrations on the file before loading it.

### Import a program from a JSON file

Tap **Import program from JSON file** to load a single program from a program JSON file. If a program with the same id already exists, the app overwrites it. Otherwise it creates a new one. The app asks you to confirm first.
## Sync and Offline

Category: Sharing and data. Page: https://www.liftosaur.com/features/sync-and-offline

Sign in once and your workouts, programs and settings follow you across iOS, Android and web. Train offline and sync when you are back online.

### Where your data lives

Everything you do in Liftosaur is saved on the device first. Workouts, programs, measurements, settings, and the workout you have open right now. You can use the app without an account and without a connection.

An account adds a copy in the cloud. Sign in on another device, and the same data appears there.

### Sign in

Go to **Me → Account**. The row shows your email when you are signed in, and **Not signed in** when you are not.

The Account screen has three ways to sign in: **Sign in with Google**, **Sign in with Apple**, and **or use email login** for an email and password.

When you sign up on a device that already has data, that data becomes the account. Nothing is lost.

When you sign in to an account that already exists, the app loads the account's data. The data that was on the device stays as a separate local account. Scroll to **Other local accounts** on the Account screen to switch back to it.

**Sign Out** signs the device out. The data stays on the device.

### Use it on every platform

Liftosaur runs as an iOS app, an Android app, and a web app at [liftosaur.com/app](/app). One account works on all of them.

In the browser, add the web app to your home screen. It then opens full screen, like an installed app.

### When the app syncs

Sync runs on its own. You do not tap anything. The app syncs:

- After every change. Completing a set, editing a program, adding a measurement.
- When you open the app, and when you bring it back from the background.
- When another device changes something. The server tells your other phones and tablets, and they pull the change right away. This works in the iOS and Android apps when you are signed in.

The web app syncs when you open it and after each change.

While a sync runs, a spinner shows in the top left corner of the screen. If a sync fails, a red **Sync failed** pill shows there instead. The app retries three times, one second apart. After that, it tries again on the next change, or the next time you open the app.

### Continue a workout on another device

The workout you have open syncs too. Start on your phone, complete a few sets, then open the web app. The same workout is there, with the same sets done. Finish it on either device.

The cloud keeps one open workout per account. If two devices each start a different workout, the one started last is kept.

### Edit on two devices

Every piece of data carries the time of its last change. When two devices change the same thing, the later change is kept and the earlier one is dropped. Changes to different things merge, so both devices end up with both.

What counts as one thing:

- A finished workout is one thing. Edit the same workout on two devices, and the later edit replaces the whole workout.
- A program's name, its next day, and its text are three separate things. Rename it on the phone and edit the text on the web, and both changes are kept.
- In the open workout, each exercise is tracked on its own. Complete Bench Press sets on the phone and Squat sets on the web, and both are kept.
- Deleting is a change too. Delete a workout on one device, and it disappears from the others.

### Train without a connection

No connection is needed to train. Start a workout, complete sets, edit programs, add measurements. The app saves to the device and syncs when it is online again.

The web app keeps a copy of itself in the browser, so it opens without a connection too.

The list of built-in programs comes from the server, so it needs a connection. Programs you already have stay on the device.

For a file backup that does not depend on an account, see [Import and Export](/features/import-export).
## Account and Sign-in

Category: Sharing and data. Page: https://www.liftosaur.com/features/account

Sign in with Apple, Google or email to sync workouts, share links and keep Premium on every device. Keep several local accounts on one phone.

### What signing in gives you

You can use Liftosaur without an account. Everything stays on the phone. Signing in adds:

- **Cloud sync.** The app uploads your data and keeps it in sync. Lose your phone, sign in on the new one, and your history is back.
- **Links.** **Copy Private Link to Program**, **Copy link to workout** and the public profile page need you signed in. See [Sharing programs](/features/sharing-programs) and [Sharing workouts](/features/sharing-workouts).
- **Premium on every device.** Subscribe in the iOS or Android app, then sign in with the same method on the web or another phone.
- **Apple Watch.** When the phone is signed in, the watch talks to the Liftosaur server directly, even with the phone out of reach.
- **API keys.** The keys for the REST API and the MCP server belong to the account.

### Sign in

Go to **Me → Account**. The row under **Account** on the Me screen says "Not signed in" until you do. On a fresh install, **I have an account** on the first screen opens the same choices.

You get three options:

- **Sign in with Google**
- **Sign in with Apple**, on iOS and on Android
- **or use email login**

Sign in to an existing account, and the app loads that account's data from the cloud. What was on the phone before stays as a separate local account, listed under **Other local accounts**.

Create a new account, and the app keeps what is on the phone and uploads it.

### Email and password

Tap **or use email login**. The **Sign in with Email** sheet has an **Email** field, a **Password** field and a **Sign In** button.

Tap **Create account** to switch the sheet to sign-up mode. The button becomes **Create Account**. A password is 8 to 256 characters. The app sends a "Liftosaur - verify your email" message with a link that works for 7 days. Verifying makes sure you can reset the password later.

If the email already signs in with Google or Apple, the app does not create a second account. It emails a link to set a password for the existing one, and says "This email already has a Liftosaur account".

After too many wrong passwords, the app shows "Too many attempts, try again in 15 minutes".

### Reset a forgotten password

Tap **Forgot password?** on the email sheet. Enter your email and tap **Send Reset Link**. The app says "We've sent an email with instructions to" and your address.

The email is "Liftosaur - reset your password". Its link opens a web page where you choose a new password. The link expires in 1 hour. The web page does not sign you in. Go back to the app and sign in with the new password.

If the email signs in with Google or Apple and has no password, the app says "This email signs in with Google or Apple".

When you are signed in, **Change password** sits under **Sign Out** on the Account screen. Leave the current password blank if you sign in with Google or Apple and never set one.

### Several accounts on one phone

The Account screen shows **Current Account** first: your nickname or id, the number of programs, the number of workouts, and "Signed in as" with your email, or "Not signed in to cloud".

Every account on the phone keeps its own copy of programs, history and settings. Under **Other local accounts**:

- Tap an account to switch to it. The app asks "Want to switch to this account? You WILL NOT lose your current account, you'll be able to switch back to it later."
- **Create New Local Account** signs you out and starts an empty account. The current one stays in the list.
- **Edit** shows a trash icon next to each account. Tap it and type `delete` to remove that copy from the phone.

### Sign out and delete

**Sign Out** signs the phone out of the cloud. Your data stays on the phone, and sync stops. The watch is signed out too.

**Delete Current Local Account** asks you to type `delete`. It signs out, removes this account's data from the phone, and starts a new empty local account. The cloud copy is not touched.

**Delete Current Cloud Account** appears only when you are signed in. Type `delete` to confirm. The server removes your programs, workout history, measurements, settings, uploaded images, API keys, push subscriptions and logs. Payment records stay, tax law requires it. The app then signs out and says "Account deleted from cloud." If it fails, it asks you to email info@liftosaur.com.
## API

Category: Sharing and data. Page: https://www.liftosaur.com/features/api

Create an API key in the app, then read and write programs, history, measurements and equipment from any script. Run whole workouts through the engine.

### Create an API key

Go to **Me → API Keys**. The row is in the **Account** group. Type a name under **Create New Key** and tap **Create**. If you leave the name empty, the key is called "API Key".

The new key appears under **Your Keys** with its name and creation date. It starts with `lftsk_`. Tap **Copy** to put it on the clipboard. The label changes to **Copied!** for two seconds.

Keep the key secret. Anyone who has it can read and change your training data. If you lose it, delete it and create a new one.

API keys need Premium and a signed-in account. Without an account, the screen shows a **Log in** button. Without Premium, it shows **Subscribe to unlock**.

### Revoke a key

Tap **Delete** next to a key. The app asks "Are you sure you want to delete this API key?". Tap **OK**. Every request with that key now gets a `401` error. With no keys left, the screen says "No API keys yet".

### What a key can do

A key acts as you. It reaches everything the app stores for your account:

- **Programs**: list, read, create, update and delete. Program text is Liftoscript. A syntax error returns `422` with the line number.
- **History**: list with date filters and paging, read one record, create, update, delete. Records use the Liftoscript Workouts text format.
- **Playground**: run a program day with commands like `complete_set(1, 1)` and `finish_workout()`, without saving. Returns the workout and the updated program text.
- **Program stats**: sets per muscle group, strength versus hypertrophy split and workout length estimates for any program text.
- **Gyms and equipment**: create gyms, switch the current gym, and change bars, plates and fixed weights.
- **Exercise data**: 1RM, rounding, notes, muscle overrides and per-gym equipment per exercise.
- **Measurements**: bodyweight, body parts, body fat, and the read-only `sleep`, `calories` and `protein` series from Health sync.

### Call the API

Every request goes to `https://www.liftosaur.com/api/v1` with the key as a Bearer token:

```
curl https://www.liftosaur.com/api/v1/programs \
  -H "Authorization: Bearer lftsk_your_key_here"
```

The reply is JSON with a `data` object. Errors come back as an `error` object with a `code` and a `message`:

- `401` missing or invalid key.
- `403` no active Premium subscription.
- `400` invalid input, like deleting the active program.
- `404` record or program not found.
- `409` conflict, like a duplicate measurement timestamp.
- `422` Liftoscript parse error, or a program script that failed.

Use `id=current` in the programs endpoints for the active program. Lists page with `hasMore` and `nextCursor`, 50 records by default and 200 at most.

Request and response bodies for every endpoint are in the [REST API reference](/doc/api).

### Run a workout from another app

The endpoints under `/api/v1/workout/*` run the program engine on the server. Your app reports what the lifter did, and the server applies progressions, updates 1RMs and writes history, the same as finishing in the app.

- `GET /api/v1/workout/next` previews the next day, with weights rounded to your gym, plates per side and rest timers resolved.
- `POST /api/v1/workout/start` starts it.
- `POST /api/v1/workout/set` logs one set by `setId`. `POST /api/v1/workout/sets` logs several in one call.
- `POST /api/v1/workout/finish` saves it, runs progressions and advances the next-workout pointer.
- `GET /api/v1/workout/current` returns the live workout, so your app can pick up sets logged on the phone.
- `DELETE /api/v1/workout/current` discards the live workout.

Writes need two extra headers, `X-Liftosaur-Device-Id` and `X-Liftosaur-Client`. Every write is safe to repeat after a lost reply. An AMRAP set or a set with `askWeight` returns `400 missing_set_input` until you send the value.

### AI assistants and MCP

The same key also powers the MCP server, so Claude, ChatGPT or Gemini can edit programs and log workouts for you. See [Using AI with Liftosaur](/features/chatgpt-claude-and-ai).
