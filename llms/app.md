# Liftosaur

It's a mobile and web app. Users can create weightlifting programs with it (single and multi-weeks) and track their
progress by following those programs. There're built-in popular programs, like 5/3/1, GZCLP, Starting Strength, Strong Curves, and many others. Users also can create their own programs.

The app is available as:

- [PWA](https://www.liftosaur.com/app).
- [Android app](https://play.google.com/store/apps/details?id=com.liftosaur.www.twa?referrer=utm_source%3Dgithub) - it mostly runs as a thin wrapper around the PWA, rendering app in a web view.
- [iOS app](https://apps.apple.com/app/apple-store/id1661880849?pt=126680920&mt=8&ct=github) - same thing as Android.

The unique feature of the app is that all the weightlifting programs are text based, and written in a special language called [Liftoscript](https://www.liftosaur.com/docs).

Liftoscript is a scripting/markup language, similar to Markdown, with some JavaScript-like scripting capabilities. Like you can use ifs for branching and fors for loops, it has variables and can preserve state across workouts. But it doesn't have any complex data structures, mostly operating with numbers, percentages and lb/kg values.

Under the hood, for programs - Liftoscript text for a program is a source of truth. You can edit the program text in the app, as well as in the web editor. The app has both UI-mode - where you can add exercises, sets, reps, weight, progress, etc by tapping on buttons, and the two text modes - where you can edit the program text for each day separately, or the whole program at once.

Programs are only used to define what the next workout will look like - what exercises, sets, reps, weights, etc it will have. They have "next day" option, and that will define the next workout.

When you start a workout, the app evaluates the program text, and creates next workout. User then taps checkmark 
to complete sets, and may change completed reps and weight. After each completion, the app may run optional 'update' script (defined on exercise level) to modify the reminder sets based on user's performance.

When user finishes the workout, the app executes optional 'progress' scripts defined on the exercise level, which will tell the app how to update the program text. E.g. it could say `weights += 5lb`, and that will increase all the weights for that exercise by 5lb. Then, the app saves the new program text.

The program text is the source of truth, it's a current snapshot of the weightlifting program. Users can share the programs via links, or via the program text, and import links into the app. It shares the current snapshot of the program, so if you share a program, it's its state at that moment of time. All those links are immutable.

The app supports tracking RPE, custom timers per exercise set, 1RM percentages for weights. It shows what's the weekly volume per muscle group for a program, and what was the volume you actually did (e.g. if you lifted more than prescribed, or missed workouts).

One unique feature is the concept of equipment. User can define what plates with what weight they have, and what's the weight of the bar, and the app will use it to round the weights prescribed by the program. If equipment is set - it always rounds down.

Program itself doesn't know anything about equipment, exercise's 1RM, and also what was previous - it's a snapshot. 1RM, equipment, etc is app's settings, that are applied on top of a program.

The app has premium features - graphs, week insights, plates calculator, and push notifications. The rest is free.
Graphs will have exercise graphs for sets and volume, and also volume per muscle group graphs.

You can also add body measurements (weight, bodyfat, bicep size, etc), and present it on the graphs as well.