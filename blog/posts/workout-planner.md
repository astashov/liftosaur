---
title: Workout planner inspired by the software development tools
date: "2023-07-09"
og_title: Workout planner inspired by the software development tools
og_description: "Thoughts about building a weightlifting workout planner, which is inspired by the ideas from the software development tools"
og_image: /images/workout-planner-hero.png
tags: ["tech", "weightlifting"]
---

![Workout Planner Hero image](../../images/workout-planner-hero.png)

I recently finished a bunch of books on weightlifting programming, such as [Art of Lifting and Science of Lifting](https://www.strongerbyscience.com/art-and-science/) by Greg Nuckols, and [The Muscle and Strength Training Pyramid](https://muscleandstrengthpyramids.com/) by Eric Helms, Andy Morgan, and Andrea Valdez. These are excellent books that introduced me to the world of weightlifting programming. They delve into the details of how to approach creating your own weightlifting programs, tailoring them to your needs and goals.

However, building a program is a complex task. You need to balance numerous variables, such as:

- Ensuring you have enough sets per muscle group.
- Ideally spreading out work on muscle groups throughout the week.
- Ensuring you have enough volume, but not too much volume (based on your training age).
- If you're building an intermediate or advanced program, you probably want to include week over week periodization, undulating volume and intensity, and splitting the block into mesocycles, etc.
- Things would be different if you're training for strength or for hypertrophy.
- And there are a lot of other parameters to keep in mind as well.

If you're just starting to get into weightlifting programming, it's a lot to keep in mind. Surprisingly, I couldn't find any tool or app to assist with this (although I could be bad at googling).

It's not an easy problem to solve though. Need to think through UI and UX of such tool, so that it'd be easy to use, and you'd have all the information in front of you, and you could easily tweak it. Would be also cool to be able store the programs you build too, and adjust them when you progress or when your goals change.

## Getting inspiration from software development tools

The software development industry has decades of experience in developing tools for writing programs. A weighlifting program shares some similarities with a software program. For example, we have pretty formalized hierarchy - a weightlifting program consists of weeks, a week consists of workouts, a workout consists of exercises. Each exercise consists of:

- Sets x reps (or reps range)
- RPE (Rate of Perceived Exertion) value - basically how close you should be to failure
- Weight (although it may not be necessary in program planning, and could be replaced by RPE)
- Rest time
- Additional properties (like tempo, if it's a superset, etc)

We can come up with formalized syntax to describe a workout. For example, each line would be an exercise in a workout, and various properties (sets x reps, RPE, etc) would be separated by slashes. For example:

```
Bench Press / 3x5 / @9 / 180s
Shoulder Press / 8+ @9 180s, 3x5 @7 60s
Bicep Curl / 3x8-12 / @8 / 90s
... etc
```

So, we start with the exercise, then after slash we have sets and reps. We can group them together like `3x8`, or we can list them separately by comma, like `2x8, 6, 4`. AMRAP sets would be suffixed by `+`. We can add RPE (via `@` symbol) and rest time (by suffixing a number with `s`) - either to each set, or globally apply to the whole exercise if we add them to separate section separated by slashes `/`.

The order of sections within exercise doesn't really matter, could be `3x5 / @9 / 180s` or `@9 / 3x5 / 180s` or any other order.

Having the whole workout as a plain text has a lot of benefits - we can freely copy/paste it, quickly change it in any text editor, it's easy to read and it's condensed and brief.

In software development, there're a lot of tools that help with writing code - code editors that would colorize the syntax so it's easier to read it, auto-format the code, show various hints and information when you place a cursor on specific words. I think we could get inspired from those tools, and build something similar for weightlifting programming.

## Designing a tool for weightlifting programming

So, I opened Figma, and tried to come up with a design for such tool. I think it could look something like this:

<a href="../../images/workout-planner-collapsed.png" target="_blank">
<img src="../../images/workout-planner-collapsed.png" alt="Workout Planner Collapsed design" />
</a>

And this is description of various sections:

<a href="../../images/workout-planner-collapsed-explained.png" target="_blank">
<img src="../../images/workout-planner-collapsed-explained.png" alt="Workout Planner Collapsed design explained" />
</a>

So, the main part is the workout text field. We type the exercises, sets x reps, RPE, etc there, according to the syntax described above. The editor highlights different sections/parts in different colors to simplify reading.

When you type there, it'll show up the autocompletion with the exercises. You can autocomplete by exercise name, but also by target/synergetic muscles and muscle groups.

At the top, we can switch between different weeks, name a week and name each workout. It shows approximate time
the workout would take (based on rest times, number of sets x reps, if there're any supersets), and also the approximate number of calories it'll burn.

On the right of the workout text field it shows the **Week stats**. There, you could see the total number of sets, and also distribution between strength and hypertrophy sets (based on number of reps). Also, you see the number of sets per muscle group, and the distribution between push, pull, upper and lower exercises.

In the set distributions, the format is: `4 (2s, 2h), 2 days`, meaning it's 4 sets total, 2 sets are strength, 2 sets are hypertrophy. `2 days` is frequency - meaning how many times per week you train that muscle group. Muscle groups are clickable, so you can add exercises targeting specific muscle groups to the workout by clicking on them.

While scrolling all the workouts of the week, the week stats are sticky, so you can always see them.

The set numbers are colored in red, yellow or green, based on whether you're in the recommended range. You can define the range in Settings, with some presets, like 10-12 sets per muscle group for novice, 13-15 for intermediate, etc, and that will define the color of the set numbers.

The **Settings** are accessible by clicking on the cog icon. There, you can define whether you train for strength or hypertrophy (defining percentage of strenght or hypertrophy sets), the recommended set ranges per muscle group, recommended frequency per muscle group, default Rest timer, and also define the custom exercises.

When you click on the workout text field, and place an input cursor to some line with some exercise, 2 new sections appear.

First is **Workout stats**, it shows up between the **Week stats** and the text field for the workout. It has the same data as the **Week stats** except the frequency.

Second is the **Exercise stats**, that will be displayed under the workout text field, showing the details for that exercise. There you'd see the muscles and muscle groups this exercise targets, and the number of sets this week.

<a href="../../images/workout-planner-expanded.png" target="_blank">
<img src="../../images/workout-planner-expanded.png" alt="Workout Planner Expanded design" />
</a>

The main purpose of **Exercise stats** though is to show the week over week change of sets x reps, as well as the week over week graphs of volume and intensity. This is especially useful for planning mesocycles and periodization for intermediate/advanced programs, where you could define the "accumulation" blocks, "intensification" blocks, etc. The graphs would provide a visual clue of how the volume and intensity changes in those blocks.

<a href="../../images/workout-planner-expanded-explained.png" target="_blank">
<img src="../../images/workout-planner-expanded-explained.png" alt="Workout Planner Expanded design explained" />
</a>

## Progressive overload

The workout planner wouldn't help with the progressive overload though. Its purpose is to define exercises, sets and reps for the workouts for all the weeks. Then, you would convert it into the Liftosaur's program, and open in the [Liftosaur's Web Editor (Program Buidler)](/program).

There, you'd add some kind of progressive overload to the exercises, and do final tweaks for your program. E.g. linear progression for novice program, or just adding weight at the end of mesocycle/macrocycle for intermediate/advanced program, adding double progression for isolates, tweaking warmups, etc.

Then, you generate the link for the program, import it into Liftosaur app - and voila! You can now follow your program in the Liftosaur app!

Each program in the workout planner has a unique URL (same as in Liftosaur programs), so you can bookmark it, and then open it later on again. This way, you can get back to your program, tweak it, maybe increase/decrease volume, maybe change exercises. You can also share it with other people if you want.

## Conclusion

This IMHO could be a really useful tool to build your own weightlifting programs. What do you think?
