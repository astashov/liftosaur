---
date: "2023-09-13"
title: Launched Workout planner!
og_title: Launched Workout planner! | Liftosaur blog
og_image: /images/workout-planner-hero-2.png
og_description: "Description of a workout planner, that helps you design weightlifting programs and run them on Liftosaur"
tags: ["tech", "weightlifting"]
---

![Workout Planner Hero image](../../images/workout-planner-hero-2.png)

A couple months ago [I wrote](../workout-planner) about the idea of building a workout planner, that would help you design weightlifting programs. I've been working on it since then, and now it's ready!

**You can check it out here: [https://liftosaur.com/planner](https://liftosaur.com/planner)**

I believe it's an amazing tool for building weightlifting programs. It's a great way to visualize your programs, and see if you have enough volume per muscle group, and if you're hitting them with enough frequency. Hopefully it'll become a starting point for people to build their programs, especially for those who don't want to mess with coding.

It allows you to plan programs, make sure you have enough weekly volume per muscle group, and can balance it with workout time. You can build multiweek programs, and it'll show weekly undulating of volume and intensity per exercise on a graph. And you can export the program to the Liftosaur app, making it a way faster way to build Liftosaur programs.

It's not as flexible as the Liftosaur's built-in program editor, but it's a lot faster to build programs with it, and it probably be enough for like 80% of use cases. And you can always do the final tweaks in Liftosaur if needed.

**If you would prefer to watch the video instead, here's how I use Planner to build a program**

<div style="text-align: center">
<iframe width="560" height="315" src="https://www.youtube.com/embed/CCFKG1s0u1o?si=MSkcM1mZ_c9EnfxH" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

## How to use it

It's inspired by rich text editors called IDEs (Interactive Development Environment), that are pretty popular in the software engineering world. Those are the text editors that will autocomplete your code, suggest what you should write, check the code you wrote for errors, and generally allow you to write code faster and more efficiently.

The workout planner is similar - it will autocomplete the exercises, equipment, show available progressive overloads, colorize the syntax, etc. It uses a special syntax, so there's some learning curve, but it's very similar to how people generally describe their workout programs, and once you learn it - you can build programs really fast.

Each exercise should go on a separate line. It consists of sections separated by a slash (`/`). The simplest exercise is written like this:

{% plannercode %}
Bench Press / 3x8
{% endplannercode %}

You can do rep ranges too:

{% plannercode %}
Bench Press / 3x8-12
{% endplannercode %}

You can list multiple sets, separated by commas, like this:

{% plannercode %}
Bench Press / 5, 3, 1, 5x5
{% endplannercode %}

That would be 8 sets total - first 5 reps, then 3 reps, 1 rep, and then 5 sets of 5 reps.

If you don't specify the weight, it'll use the weight calculated from
<abbr title="RPE - Rate of Perceived Exertion - is a way to measure how close you are to failure. It's a scale from 1 to 10, where 1 is very easy, and 10 is failure.">RPE</abbr>
tables, like [this one](https://articles.reactivetrainingsystems.com/wp-content/uploads/2015/11/E1RM-TABLE.png). By default it'll assume you want to do exercises til failure (@10 RPE), so e.g. if you write:

{% plannercode %}
Bench Press / 3x12
{% endplannercode %}

It'll check in the RPE table that for if you want to do 12 reps til failure (@10 RPE), you probably should use 65% of 1RM, so it'll set the weight to 65% of 1RM under the hood. If you don't want to go to full failure, you can specify desired RPE:

{% plannercode %}
Bench Press / 3x12 @8
{% endplannercode %}

Then the weight would be lower - 60%. You can specify the weight explicitly, as a percentage of 1RM, like this:

{% plannercode %}
Bench Press / 3x12 80%
{% endplannercode %}

Or you can specify the weight in kg/lb, like this:

{% plannercode %}
Bench Press / 3x12 60kg
{% endplannercode %}

If you specify the weight in kgs though, it'd be static, and not tied to the `state.weight` state variable when you convert it into Liftosaur program.

RPE, percentage and weight can be specified for each set or range of sets individually, so you can mix and match:

{% plannercode %}
Bench Press / 5 @8, 3 @9, 1 @10, 5x5 50%
{% endplannercode %}

You can specify the rest time. E.g. this is how you could do **myo-reps** - i.e. doing heavy 12, and then doing 5x5 with short rest times and same weight:

{% plannercode %}
Bench Press / 12 20s 60%, 5x5 20s 60%
{% endplannercode %}

You can also specify the rest time, weight, 1RM percentage and RPE also, for all sets, so you don't have to repeat yourself. Do it in a separate section like this:

{% plannercode %}
Bench Press / 12, 5x5 / 20s 60%
{% endplannercode %}

So, an example workout may look something like this:

{% plannercode %}
Bench Press / 3x5 80%
Incline Bench Press / 3x8-12 @8 / 90s
Skullcrusher / 3x15 @8
Lateral Raise / 3x15 @8
{% endplannercode %}

By default, it'll use default equipment - e.g. for **Bench Press** it'll use **Barbell**. If you want to specify different equipment, add it after the exercise name, like this:

{% plannercode %}
Bench Press, dumbbell / 3x5
{% endplannercode %}

## How to read stats

The planner shows you daily and weekly number of sets per muscle group, per movement type and split between "strength" and "hypertrophy" sets. As an example, this is [Workout Planner for the GZCLP program](https://www.liftosaur.com/n/2dbed2bc).
Let's take a look at the **Week Stats** section. It looks like this:

<p class="markdown-body-pre">
Shoulders: <span style="color: #8c8e00">15↓</span> (7.5s, 7.5h), <span style="color: #38a169">3d</span>
</p>

That describes the volume (number of sets) you have weekly per muscle group. E.g. in the example above, we have
15 sets for shoulders. If you hover your mouse over the number '15', you'll see what exercises contribute to that
number:

<div class="markdown-body-pre" style="font-weight: bold">
<div>Bent Over Row - 3 (0s, 3h)</div>
<div>Overhead Press - 5 (5s, 0h)</div>
<div style="color: #607284">Bench Press - 4 (2.5s, 1.5h)</div>
<div style="color: #607284">Lat Pulldown - 3 (0s, 3h)</div>
</div>

You can see that **Bent Over Row** and **Overhead Press** are black (meaning they have target muscles in the Shoulder muscle group), and **Bench Press** and **Lat Pulldown** are gray (meaning they have synergist muscles in the Shoulder muscle group).

The number of sets is colored in <span style="color: #e53e3e">red</span>, <span style="color: #8c8e00">yellow</span> or <span style="color: #38a169">green</span>, based on whether you're in the recommended range. You can define the range in **Settings**, with some presets, like 10-12 sets per muscle group for novice, 13-15 for intermediate, etc, and that will define the color of the set numbers. <span style="color: #e53e3e">Red</span> - you're completely outside of the range, <span style="color: #8c8e00">yellow</span> - you're close to the range, <span style="color: #38a169">green</span> - you're in the range. The arrow ↓ means you need to decrease the number of sets to get into the range.

`(2.5s, 1.5h)` means it has 2.5 sets in strength rep range (1-8 reps) and 1.5 sets of hypertrophy (8+ reps). We count synergist muscles by default as a half set, hence there's .5 - i.e. the number is not round.

`3d` is frequency - means we hit this muscle group 3 days per week.

There're also Day Stats, that show up if you click on the workout text field. Muscle groups are links there, so you can click it and it'll filter the Exercises to only show ones that have that muscle group.

## Specifying progressive overload

You can specify the progressive overload for each exercise. It won't affect the weekly volume stats, but it'll be added when you export a program to Liftosaur. For now, there're 3 types of progressive overload:

- Linear Progression (**lp**) - increase or decrease the weight by a fixed amount or percentage after N attempts.
- Double Progression (**dp**) - increase the reps within a range, then reset the reps and increase the weight.
- Reps Sum (**sum**) - increase the weight if the total sum of reps of all sets more than the threshold.

You can add a progression like this:

{% plannercode %}
Bench Press / 3x8 / progress: lp(5lb, 3)
{% endplannercode %}

That will increase the weight by 5lb after 3 successful attempts. Or like this:

{% plannercode %}
Bench Press / 3x8 / progress: dp(4, 5lb)
{% endplannercode %}

It will keep increasing reps from 8 to 12 (8 + 4), and then reset the reps to 8 and increase the weight by 5lb.

The autocomplete for those progressive overloads contains more details.

## Examples

Here're some examples of workouts you can build with the workout planner:

### Stronglifts 5x5

{% plannercode %}
// Workout A
Squat / 5x5 / progress: lp(10lb, 1, 10%, 3)
Bench Press / 5x5 / progress: lp(5lb, 1, 10%, 3)
Bent Over Row / 5x5 / progress: lp(5lb, 1, 10%, 3)

// Workout B
Squat / 5x5 / progress: lp(10lb, 1, 10%, 3)
Overhead Press / 5x5 / progress: lp(5lb, 1, 10%, 3)
Deadlift / 5 / progress: lp(10lb, 1, 10%, 3)
{% endplannercode %}

### Myo reps

Do "activating" set, and then additional sets of the same weight with less reps and short rest:

{% plannercode %}
Squat / 12, 3x5 / 20s 60%
{% endplannercode %}

### Drop sets

Do a set with 100%, then 85%, then 75%, then 60% of the weight, with short rests:

{% plannercode %}
Bench Press / 5 100%, 8 85%, 10 75%, 12 60% / 40s
{% endplannercode %}

### 5/3/1 Basic Beginner main lift

{% plannercode %}
Bench Press / 5 75%, 3 85%, 1+ 95%, 5x5 75%
{% endplannercode %}

### Bullmastiff Week 1 Day 1

{% plannercode %}
Squat / 3x6 65%, 6+ 65%
Romanian Deadlift, barbell / 3x12 @6
Bent Over Row / 2x12-15
Leg Curl / 2x12-15
Leg Extension / 2x12-15
Cable Crunch / 2x12-15
{% endplannercode %}

## Exporting to Liftosaur

When you're done and would like to export this program to Liftosaur, press that big purple button <strong>"Convert to Liftosaur program"</strong>. That will generate a link and copy it to the clipboard. You then can go to Liftosaur, and paste that link into the "Import link" field on the Choose Program screen. And that's it!

Check it out, and hopefully you'll find this new Workout Planner useful!
