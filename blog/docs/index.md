---
title: Documentation | Liftosaur
description: Explains how to use Liftosaur, how to write weightlifting programs, goes over Liftoscript syntax.
og_title: Documentation | Liftosaur
canonical: https://www.liftosaur.com/docs/
og_description: Explains how to use Liftosaur, how to write weightlifting programs, goes over Liftoscript syntax.
layout: blogpost
---

### Contact Us

If you have any questions, don't hesitate to contact us at <a href="mailto:info@liftosaur.com">info@liftosaur.com</a>!

## Summary

Liftosaur is an app that combines both weightlifting programming part (that people sometimes use Google Sheets for) and workouts tracking part. I.e. it consists of 2 steps:

* You choose and clone a built-in program **or** create your own program. Program will prescribe what exercises to do over weeks/days, with what sets x reps x weight, and how to progress over time (i.e. applying progressive overload).
* You run that program and track your workouts and your progress.

Any built-in program is built using existing Liftosaur features, so those programs are completely customizable - you can change every bit of them.

Instead of clicking around to add exercises like in other apps, Liftosaur takes a different approach - you create the programs by typing your exercises, sets, reps, etc in a text field, using special syntax called **Liftoscript**. There's some learning curve because of that, but the syntax is very simple and autocomplete helps, and once you get familiar with it - you can create and edit the programs very quickly and efficiently.

The syntax is pretty similar to how people already often describe their programs. Let's take a look!

## Basics

Each exercise goes on a separate line. It consists of sections separated by a slash (`/`). First goes the exercise name, and then in any order - the sections. The simplest exercise is written like this:

{% plannercode %}
Bench Press / 3x8
{% endplannercode %}

You can do rep ranges too:

{% plannercode %}
Bench Press / 3x8-12
{% endplannercode %}

You can list multiple sets, separated by commas, like this:

{% plannercode %}
Bench Press / 1x5, 1x3, 1x1, 5x5
{% endplannercode %}

That would be 8 sets total - first 5 reps, then 3 reps, 1 rep, and then 5 sets of 5 reps.

If you don't specify the weight, it'll use the weight calculated from
<abbr title="RPE - Rate of Perceived Exertion - is a way to measure how close you are to failure. It's a scale from 1 to 10, where 1 is very easy, and 10 is failure.">RPE</abbr>
tables, like [this one](/blog/images/rpetable.png). By default it'll assume you want to do exercises til failure (@10 RPE), so e.g. if you write:

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

RPE, percentage and weight can be specified for each set or range of sets individually, so you can mix and match:

{% plannercode %}
Bench Press / 1x5 @8, 1x3 @9, 1x1 @10, 5x5 50%
{% endplannercode %}

You can specify the rest time. E.g. this is how you could do **myo-reps** - i.e. doing heavy 12, and then doing 5x5 with short rest times and same weight:

{% plannercode %}
Bench Press / 1x12 20s 60%, 5x5 20s 60%
{% endplannercode %}

You can also specify the rest time, weight, 1RM percentage and RPE also, for all sets, so you don't have to repeat yourself. Do it in a separate section like this:

{% plannercode %}
Bench Press / 1x12, 5x5 / 20s 60%
{% endplannercode %}

To add AMRAP sets, add `+` after the reps number. And to log RPE, add `+` after the RPE number. Like this:

{% plannercode %}
Bench Press / 4x5, 1x5+ @8+
{% endplannercode %}

If you want to enable "Quick add sets" feature (where you may have more sets than you planned), add `+` after the set number:

{% plannercode %}
Bench Press / 3+x5
{% endplannercode %}

And if you want the app to ask you what was the weight you did (similar to AMRAP reps), you can add `+` after the weight:

{% plannercode %}
Bench Press / 3x8 / 100lb+
{% endplannercode %}

or

{% plannercode %}
Bench Press / 1x6 70%+, 5x5 50%
{% endplannercode %}

An example workout may look something like this:

{% plannercode %}
Bench Press / 3x5 80%
Incline Bench Press / 3x8-12 @8 / 90s
Skullcrusher / 3x15 @8
Lateral Raise / 3x15 @8
{% endplannercode %}

By default, it'll use the default equipment - e.g. for **Bench Press** it'll use **Barbell**. If you want to specify a different equipment, then add it after the exercise name, like this:

{% plannercode %}
Bench Press, Dumbbell / 3x5
{% endplannercode %}

### Full mode, weeks and days

There's a way to switch to the "Full Mode", where your whole program is just one blob of text. There, to specify different weeks/days, you use this syntax:

{% plannercode %}
# Week 1
## Day 1
Squat / 5x5 / progress: lp(5lb)

## Day 2
Squat / 3x8

# Week 2
## Day 1
Squat / 5x4
{% endplannercode %}

I.e. prefixing week names with `#`, and day names with `##`.

### Exercise Descriptions

You can add descriptions to exercises via `//` comments, like this:
{% plannercode %}
// Pause **2 seconds** at the bottom
Squat / 5x5 / progress: lp(5lb)
{% endplannercode %}

You can use [Markdown](https://www.markdownguide.org/cheat-sheet/) syntax there, and also the descriptions would be reused in the following weeks/days, until you overwrite them. E.g. if you have description on Week 1 and Week 3, Week 2 would reuse Week 1 description, and Week 4+ would reuse Week 3 description. You can stop that by adding empty `//` comment, like this, then this week and following weeks won't reuse the description. Like this:

{% plannercode %}
# Week 1
## Day 1
// Pause **2 seconds** at the bottom
Squat / 5x5 / progress: lp(5lb)

# Week 2
## Day 1
Squat / 5x5 / progress: lp(5lb)

# Week 3
## Day 1
// 
Squat / 5x5 / progress: lp(5lb)

# Week 4
## Day 1
Squat / 5x5 / progress: lp(5lb)
{% endplannercode %}

In this case, Week 1 and Week 2 will have the description about the pause, and Week 3 and Week 4 won't.

### Week and day descriptions

You can also add descriptions to weeks and days. You can also use [Markdown](https://www.markdownguide.org/cheat-sheet/) syntax there, and the day descriptions would be reused in the following days, until you overwrite them - same logic as for Exercise Descriptions.

You can add them through UI, or in the full mode, you also can add them as comments to `# Week` and `## Day` lines, like this:

{% plannercode %}

// This is a description for week 1
// * Do this
// * Then do that
# Week 1

// This is a description for day 1
// **Very important to do this:**
## Day 1

Squat / 5x5 / progress: lp(5lb)
{% endplannercode %}

### Exercise Labels

If you want the same exercises to be separate (e.g. you have Squat as a main lift, and Squat as an accessory lift, and 
you want to apply different progressions for them), you can mark exercises with different labels. Like this:

{% plannercode %}
# Week 1
## Day 1
main: Squat / 5x5 / progress: lp(5lb)

# Week 2
## Day 1
accessory: Squat / 3x8 / progress: dp(5lb, 8, 12)
{% endplannercode %}

### Set Labels

If you can add labels to the sets (8 characters max!), just putting them in parentheses `()` when you specify the sets x reps:

{% plannercode %}
Squat / 4x5 (Main), 1x5+ (AMRAP) / progress: lp(5lb)
{% endplannercode %}

### Warmups

By default, it will add some warmups, but if you want to change that, you can use `warmup` section, like this:

{% plannercode %}
Squat / 5x5 / warmup: 1x5 45lb, 1x5 135lb, 1x3 80%
{% endplannercode %}

Syntax is very similar to the regular sets x reps, but you cannot specify timer and RPE there. Also, percentages are not
1RM percentages, but percentages of the weight of the first set. 

If you don't want warmups at all, you can specify `warmup: none`:

{% plannercode %}
Squat / 5x5 / warmup: none
{% endplannercode %}

### Progressive overload

It's very important to incorporate progressive overload into your workouts - how you will increase sets, reps, weight, etc over time, to give stimulus for your muscles to grow. In Liftosaur, you can specify progressions for your exercises, and the app will automatically change weights/reps/etc based on the conditions you specify.

There're 3 built-in types of progressive overload:

- Linear Progression (**lp**) - increase or decrease the weight by a fixed amount or percentage after N attempts.
- Double Progression (**dp**) - increase the reps within a range, then reset the reps and increase the weight.
- Reps Sum (**sum**) - increase the weight if the total sum of reps of all sets more than the threshold.

You can add a progression like this:

{% plannercode %}
Bench Press / 3x8 / progress: lp(5lb)
{% endplannercode %}

That would increase the weight after each successful completion of 3 sets x 8 reps by 5lb.
You only need to add it to one of the days in your program per exercise, no need to repeat it week over week or day over day. It will be applied to all such exercises in a program. You may disable progression for specific days or weeks via `progress: none` section - for example if that's a deload week. For example:

{% plannercode %}
# Week 1
## Day 1
Bench Press / 3x8 / progress: lp(5lb)

# Week 2
## Day 1
/// We don't need to specify progress here, but it still would be applied - same lp(5lb)
Bench Press / 3x8

# Week 3
## Day 1
/// That's a deload week - we want to disable progression for that day
Bench Press / 3x8 / progress: none
{% endplannercode %}

If you try to specify different progressions for the same exercise in different weeks/days, it'll give you an error - the progressions are applied for an exercise across whole program. You cannot have e.g. linear progression on day 1, and double progression on day 2.

There's a way to have e.g. 2 Bench Press exercises with different progressions though - you can add labels to exercises, and they would be considered different exercises in that case. Label is just some word before an exercise name, with a colon `:` after it. For example - `aux: Bench Press` or `strenght: Squat` or anything like that.

So with labels, e.g. you have low-rep range Bench Press and high-rep range Bench Press in your program, and you want both of them have Double Progression, but in different ranges. You could do it like this:

{% plannercode %}
# Week 1
## Day 1
lowrep: Bench Press / 3x3 / progress: dp(5lb, 3, 6)

## Day 2
highrep: Bench Press / 3x8 / progress: dp(5lb, 8, 12)
{% endplannercode %}

#### Linear Progression

Linear Progression is when you add weight after N (1 or more) successful finishing of all sets and reps, and optionally - also reducing the weight after N (1 or more) unsuccessful finishing of all sets ans reps.

You add Linear Progression to exercises by specifying `lp` progress type, like this:

{% plannercode %}
Bench Press / 3x8 / progress: lp(5lb)
{% endplannercode %}

In parenthesis after `lp` you specify the weight values and conditions for the Linear Progression. It can take 6 arguments max, separated by commas, and this is their meaning:

```javascript
lp(weight increase, increase attempts, current increase attempt, weight decrease, decrease attempts, current decrease attempt)
```

You don't have to specify all the arguments, for example if you don't want decreasing weights after failures - you may skip 3 last arguments.

For example:

{% plannercode %}
/// increase by 5lb after 1 successful attempt
Squat / 3x8 / progress: lp(5lb)

/// increase by 5lb after 2 successful attempts
Squat / 3x8 / progress: lp(5lb, 2)

/// increase by 5lb after 2 successful attempts, and already had 1 successful attempt
Squat / 3x8 / progress: lp(5lb, 2, 1)

/// increase by 5lb after 1 successful attempt, and decrease by 10lb after 3 unsuccessful
Squat / 3x8 / progress: lp(5lb, 2, 1, 10lb, 3)

/// You can also use percentages for increase (instead of absolute values)
Squat / 3x8 / progress: lp(5%)
{% endplannercode %}

#### Double Progression

Double Progression is when you increase reps after successful finishing your sets x reps within some range, and after that - increase the weight. It's good for exercises when you cannot apply Linear Progression easily (e.g for Bicep Curl, adding 5lb each time would stop working quickly), or when you already past the phase when you can add 5lb each session even for big lifts like Squat or Bench Press.

It looks like this:

```javascript
dp(weight increase, min reps, max reps)
```

For example:

{% plannercode %}
// Increases the reps from 8 to 12 reps, then adds 5lb to weight and
// goes back to 8 reps
Bench Press / 3x8 / progress: dp(5lb, 8, 12)

// Increases the reps from 6 to 10 reps, then adds 5% to weight and
// goes back to 6 reps
Bench Press / 3x6 / progress: dp(5%, 6, 10)
{% endplannercode %}


#### Sum Of Reps Progression

Simply adds weight if the total sum of all reps across all sets is more than the threshold.
Looks like this:

```javascript
sum(reps threshold, weights increase)
```

For example:

{% plannercode %}
// Increases the weight if the sum of all reps is more than 30
Bench Press / 3x10+ / progress: sum(30, 5lb)
{% endplannercode %}

### Ways to make written programs less repetitive

Weightlifting programs are often very repetitive - you usually have multiple exercises with the same set schemes,
using the same waving progressions over weeks. It's important to have ways to not repeat yourself, so it'd be easier to modify the programs, add exercises, change the set schemes, progressions, etc. E.g. a 12-week program with 4-days per week
and 5 exercises in each day in total may have 240 places where you specify the sets! And modifying such program would be a very tedious task.

Liftosaur offers a bunch of syntax sugar to make it easier to write and modify the programs.

#### Reusing the exercises's sets/reps/weight/RPE/timer, warmups and update/progress scripts via `...Squat`

You can reuse the sets/reps/weight/RPE/timer and warmups of another exercise. You can either specify the exact week/day of the exercise to reuse, or by default it'll look into any day of the current week. The syntax for reusing the sets looks like this:

{% plannercode %}
Bench Press / 5x5 / progress: lp(5lb)
Squat / ...Bench Press
{% endplannercode %}

The Squat would reuse 5x5 sets of the Bench Press from the current week. And if you change 5x5 of Bench Press to e.g. 3x8, that would be applied to Squat as well. The progress part `progress: lp(5lb)` of the Bench Press also would be reused!

For multi-week programs it may look like this:

{% plannercode %}
# Week 1
## Day 1
Bench Press / 3x8
Squat / ...Bench Press

# Week 2
## Day 1
Bench Press / 3x9
Squat / ...Bench Press

# Week 3
## Day 1
Bench Press / 3x10
Squat / ...Bench Press
{% endplannercode %}

So, Squat would be `3x8` on week 1, `3x9` on week 2, and `3x10` on week 3, because by default it tries to find the original exercise in the **any** day of the **same** week.

You can also specify the exact week/day to reuse the exercise from, by syntax `...Bench Press[day]` (in the current week) or `...Bench Press[week:day]`. Like this:

{% plannercode %}
# Week 1
## Day 1
Bench Press / 3x8
Squat / ...Bench Press[2]

## Day 2
Bench Press / 5x5
Deadlift / 3x3
{% endplannercode %}

This way Squat would use `5x5`, and not `3x8`.

{% plannercode %}
# Week 1
## Day 1
Bench Press / 3x8
Squat / ...Bench Press[2:1]

# Week 2
## Day 1
Bench Press / 5x5
Deadlift / 3x3
{% endplannercode %}

And this way Squat also would use `5x5` from Bench Press on week 2, day 1.

You can also override anything in the reusing exercise, like this:

{% plannercode %}
# Week 1
## Day 1
Squat / 3x8 200lb 60s
Bench Press / ...Squat / 150lb
{% endplannercode %}

Bench Press would be `3x8 150lb 60s` in this case. Or like this:

{% plannercode %}
# Week 1
## Day 1
Squat / 3x8 200lb 60s / update: custom() {~
  // some update logic
~} / progress: lp(10lb)
Bench Press / ...Squat / 150lb / progress: lp(5lb)
{% endplannercode %}

In this case, Bench Press would have the same `update` logic as Squat, but instead of 10lb Linear Progression, it'd have 5lb.

One thing to note that if the reused exercise changes their weight, sets, reps, etc - after finishing a workout the app would try to extract the new values into overrides. For example, if you have the following setup:

{% plannercode %}
Bench Press / 3x8 75% / progress: lp(5lb)
Squat / ...Bench Press
{% endplannercode %}

And then you finished all sets of Squat successfully. That will change the weight of Squat, and the program now would look like this:

{% plannercode %}
Bench Press / 3x8 75% / progress: lp(5lb)
Squat / ...Bench Press / 185lb
{% endplannercode %}

I.e. the app notices that the weight of the Bench Press and Squat are not the same anymore, so it extracts the weight
of Squat into override.

And if you progress in Bench Press - then **ALL** the reused exercises would move the weights into overrides - because it just went unsync with them.

#### Repeating the same exercise over multiple weeks via `Squat[1-4]`

Usually in multi-week programs, you have exactly the same exercises on the same days over multiple weeks. So, to avoid typing them over and over, you can specify that the same exercise would be repeated over multiple weeks, by specifying a range of weeks after exercise name. 

{% plannercode %}
Bench Press[1-5] / 3x8
{% endplannercode %}

The syntax is `Squat[fromWeek-toWeek]`. If you do that, you don't have to type `Bench Press / 3x8` on weeks 2-5. In the full day mode, your days would be empty, and in the per-day mode - the exercises would be listed under the text input on the repeated days, but would be undediable.

{% plannercode %}
# Week 1
## Day 1
Bench Press[1-4] / 3x8

# Week 2
## Day 1

# Week 3
## Day 1

# Week 4
## Day 1
{% endplannercode %}

Like this - you don't need to write it in the weeks 2-4.

This works especially nice in combination with the previous feature - reusing sets/reps/weights/etc. In multi-week programs, you specify the weekly undulation for one of the exercises, and then other exercises reuse and repeat it, like this:

{% plannercode %}
# Week 1
## Day 1
Squat / 3x8

## Day 2
Bench Press[1-4] / ...Squat

# Week 2
## Day 1
Squat / 3x9

## Day 2

# Week 3
## Day 1
Squat / 3x10

## Day 2

# Week 4
## Day 1
Squat / 3x11

## Day 2
{% endplannercode %}

When repeating, it tries to preserve the order of exercises, but things may get ambiguous if you have multiple exercises starting repeating in various days.
In that case, you can specify the order of exercises, within square brackets, like `Squat[order,fromWeek-toWeek]` or just `Squat[order]` for non-repeating exercises.

{% plannercode %}
Squat[1,1-4] / 3x8
Bench Press[2,1-4] / 3x8
Bicep Curl[3,1-4] / 3x8
{% endplannercode %}

#### Reusing descriptions

Exactly the same idea as with reusing sets:

{% plannercode %}
# Week 1
## Day 1
// T1 exercise. Work up to 3RM, and then do 4 singles.
Squat / 1x3 80%+, 4x1 80%

## Day 2
// ...Squat
Bench Press / 1x3 80%+, 4x1 80%
{% endplannercode %}

Bench Press would reuse the description of Squat, and it'd be `T1 exercise. Work up to 3RM, and then do 4 singles.` too.
You can use the same syntax as for reusing sets, like `// ...Squat[3:2]` to reuse the description from week 3, day 2,
or `// ...Squat[3]` to reuse the description from the current week's day 3.

#### Exercise templates (or unused exercises) via `/ used: none`

With the features like above, it's often pretty convenient to specify a "template" exercise, which wouldn't be used in a program, but would work as a template for other exercises. To do that, you can specify an exercise and remove it from a program with the `/ used: none` section, like this:

{% plannercode %}
Squat / 1x10+, 3x10 / 70% / used: none / progress: lp(5lb)
Bench Press / ...Squat
{% endplannercode %}

In this case, the Squat would be used as a template for Bench Press, but wouldn't be used in the program itself.

It's not required that the exercise existed if it's marked as `used: none`, so you can give the templates arbitrary names:

{% plannercode %}
T1 / used: none / 1x10+, 3x10 / 70% / progress: lp(5lb)
t1: Bench Press / ...T1
{% endplannercode %}


Templates also solve the problem of the original exercise changing e.g. their weight and therefore breaking the reusing.
Since templates would never progress, they would never break the reusing. The reused exercises still may break reusing on progression, but at least only for that specific reused exercise, not for all of them.

#### Combining it all together

These features work the best when combined together. For example, you can have a template exercise, and then reuse it over multiple weeks, and use repeat syntax to avoid repeating the reused exercises across all weeks. E.g. an example program may look something like this:

{% plannercode %}
# Week 1
## Day 1
/// Specifying templates for our exercises
t1 / used: none / 1x6, 3x3 / 80%
t2 / used: none / 1x8, 3x4 / 70%
t3[1-4] / used: none / 3x10+ / 60% / progress: sum(30, 5lb)

/// Now the actual exercises:
Squat[1,1-4] / ...t1
Romanian Deadlift[2,1-4] / ...t2
Bicep Curl[3,1-4] / ...t3

## Day 2
Bench Press[1,1-4] / ...t1
Overhead Press[2,1-4] / ...t2
Lat Pulldown[3,1-4] / ...t3

## Day 3
Deadlift[1,1-4] / ...t1
Front Squat[2,1-4] / ...t2
Hanging Leg Raise[3,1-4] / ...t3


# Week 2
## Day 1
/// Now we only need to specify undulating sets for main templates exercises 
t1 / 1x7, 3x4 / 80%
t2 / 1x9, 3x5 / 70%
## Day 2
## Day 3

# Week 3
## Day 1
t1 / 1x8, 3x4 / 80%
t2 / 1x10, 3x5 / 70%
## Day 2
## Day 3

# Week 4
## Day 1
t1 / 1x9, 3x5 / 80%
t2 / 1x11, 3x6 / 70%
## Day 2
## Day 3
{% endplannercode %}

## Advanced

What's described above is probably enough to cover 95% of the use-cases. But in case you want some custom progressions, you can do it with a special `progress: custom()` Liftoscript syntax.

There, you can unleash the full power of the scripting in Liftosaur. You can directy change weights, reps, sets, timers, RPE, etc using `if/else`s, state variables, math and boolean logic.

E.g. this is how a variant of Linear Progression - increasing weight by 5lb if first set was successful - would look like:

{% plannercode %}
Bench Press / 3x8 / progress: custom() {~
  if (completedReps[1] >= reps[1]) {
    weights += 5lb
  }
~}
{% endplannercode %}

If you have ever written scripts in JavaScript, Python, or a similar programming language (or even Excel!),
this Liftoscript will look very familiar. If not, no worries, it's a pretty simple and small language.

In the example above, we increase the weight of all sets by 5lb if the completed reps of the first set were equal or more than required number of reps of the first set. Let's take a look at the syntax closer.

The logic is written in the curly braces **with tildas** - i.e. between `{~` and `~}`. Inside those curly braces you can access required reps, completed reps, weights, RPE, etc of all the sets that were finished for that exercise, and you can update weights/reps/etc of the program based on that.

The conditional logic written with `if (...) { ... }` sentence. In the parenthesis you specify the condition when the block of the `if` should happen. `completedReps[1]` gives you the number of **completed reps** of the first set (`[1]` part - arrays indexes start from 1), and `reps[1]` gives you the number of **required reps** that were defined for that set. So `completedReps[1] >= reps[1]` means that completed reps of the first set are equal or more than the required reps of the first set.

For convenience, you can also check if all completed reps of all sets are equal or more than required reps. You could do: `completedReps >= reps` (i.e. omit `[1]` part). It works for all the arrays (`weights`, `reps`, `RPE`, etc) - e.g. you can do `weights >= 50lb` - it is true if all the weights of all the sets are equal or more than 50lb.

`weights += 5lb` means we should increment the weights of all sets by 5lb. You can be more specific, e.g. you may want to increment the weight of only one set - e.g. second set - `weights[2] += 5lb`, or you can increment all weights for the exercise on week 2 day 3, then you could do: `weights[2:3:*:*] += 5lb`.

Instead of incrementing weights, you can directly assign values to them. E.g. `weights = weights[numberOfSets] + 5lb` would
set all the weights equals to the weight of the last finished set and add 5lb to it.

This is the list of available variables you can get values from in your `progress: custom()` scripts:

- `weights[n]` or `w[n]` - initial weight of an N set. N starts from 1.
- `completedWeights[n]` or `cw[n]` - completed weight of an N set. N starts from 1.
- `reps[n]` or `r[n]` - number of reps for an N set.
- `completedReps[n]` or `cr[n]` - number of completed reps for an N set.
- `RPE[n]` - if exercise has RPE - the RPE expression that's required for an N set.
- `completedRPE[n]` - if exercise has RPE, and the set is marked as Log RPE - RPE that user entered for an N set.
- `timers[n]` - if the exercise sets have explicit timer set up - value of that timer
- `rm1` - 1 Rep Max of a current exercise. You can set it in the Exercise Stats section (if you tap on exercise name on the workout screen)
- `day` - current day number, starting from 1.
- `week` - for multi-week programs - current week number, starting from 1.
- `dayInWeek` - current index of day in week, starting from 1.
- `programNumberOfSets` - how many sets was prescribed by a program.
- `numberOfSets` or `ns` - how many sets were in the exercise (could be changed by adding/removing sets during workout).
- `completedNumberOfSets` - how many sets are completed (by a checkmark).
- `setVariationIndex` - current set variation index (see below about set variations)
- `descriptionIndex` - current description index

And this is the list of available variables you can change (assign new values):

The weights/reps/RPE and timers:

- `weights`
- `reps`
- `RPE`
- `timers`

For those, you can specify what set, set variation, day or week you want to change it in. To target specific set, you use the following syntax:

```javascript
weights[week:day:setvariation:set]
```

Where the values of week/day/setvariation/set is either a number (or expression that calculates to a number), or `*` - that'd mean **any** week/day/setvariation/set.

If you omit any leading value, it's assumed it's a `*`. For example:

{% plannercode %}
Bench Press / 3x8 / progress: custom() {~
  // Changes the weights across all sets for the exercise
  weights = 50lb // same as weights[*:*:*:*] = 50lb

  // Changes the 5th set across all weeks/days/setvariations
  weights[5] = 50lb // same as weights[*:*:*:5] = 50lb

  // Changes the 5th set in 3rd day across all weeks/setvariations
  weights[3:*:5] = 50lb // same as weights[*:3:*:5] = 50lb
~}
{% endplannercode %}

You can also change 1RM of an exercise, via assigning to `rm1` variable:

{% plannercode %}
Bench Press / 3x8 / progress: custom() {~
  rm1 = weights[1]
~}
{% endplannercode %}

You can also set the values of the following variables:

- `setVariationIndex`
- `descriptionIndex`

But more about those below in the section about "Set Variations" and "Advanced Descriptions"

### State Variables

Sometimes you need to remember some values between the workouts. For example, you want to increase the weight after 3 successful attempts, so you need to know what is the current attempt, and how many already happened.

For that, you can use **state variables**. Those can hold the value between the workouts. You list them inside the parenthesis of `custom()`, and then refer to them within the `{~ ... ~}` block. For example:

{% plannercode %}
Bench Press / 3x8 / progress: custom(attempt: 0) {~
  if (completedReps >= reps) {
    state.attempt += 1
    if (state.attempt > 3) {
      weights += 5lb
      state.attempt = 0
    }
  }
~}
{% endplannercode %}

The `attempt` variable will be increased across workouts, and then reset to 0 once you hit 3 successful attempts.

Another use case for the state variables is in reusing the `progress: custom()` logic. The scripts can become pretty large, and usually you want multiple exercises to follow the same logic. So, for that you can reuse it! For that, just specify the exercise you're reusing the logic from like this: `Bench Press / 3x8 / progress: custom() { ...Squat }`. I.e. add it within the curly braces - `{` and `}` (without tildas! So the app would know it's not the script itself). For example, if we want to reuse the logic above, it'd look like this:

{% plannercode %}
Bench Press / 3x8 / progress: custom(attempt: 0) {~
  if (completedReps >= reps) {
    state.attempt += 1
    if (state.attempt > 3) {
      weights += 5lb
      state.attempt = 0
    }
  }
~}

Squat / 3x8 / progress: custom(attempt: 0) { ...Bench Press }
{% endplannercode %}

But we may want to have higher weight increments for Squat. For that, we can **parameterize** the script with the state variables! Let's add another state variable `increment`, and use it in the script:

{% plannercode %}
Bench Press / 3x8 / progress: custom(attempt: 0, increment: 5lb) {~
  if (completedReps >= reps) {
    state.attempt += 1
    if (state.attempt > 3) {
      weights += state.increment
      state.attempt = 0
    }
  }
~}

Squat / 3x8 / progress: custom(attempt: 0, increment: 10lb) { ...Bench Press }
{% endplannercode %}

You can see that now we use `state.increment` in `weights += state.increment` expression. And we use different values for `increment` - `5lb` in Bench Press and `10lb` in Squat.

There's also a way to define **user-prompted** state variables. For that, add a `+` sign after the variable name, like this:

{% plannercode %}
Bench Press / 3x8 / progress: custom(shouldBumpWeight+: 0) {~
  if (shouldBumpWeight > 0) {
    weights += 5lb
  }
~}
{% endplannercode %}

In this case, after the last set the app will ask the user for the `shouldBumpWeight` value. And if user
enters 1, the weight would be increased. Otherwise - it'd stay the same.

When reusing progress logic, you may omit the variables with the same value. I.e., this:

{% plannercode %}
Bench Press / 3x8 / progress: custom(attempt: 0, increment: 5lb) {~
  // ...some logic
~}

Squat / 3x8 / progress: custom(attempt: 0, increment: 10lb) { ...Bench Press }
{% endplannercode %}

and this:

{% plannercode %}
Bench Press / 3x8 / progress: custom(attempt: 0, increment: 5lb) {~
  // ...some logic
~}

Squat / 3x8 / progress: custom(increment: 10lb) { ...Bench Press }
{% endplannercode %}

are equivalent (note we skipped `attempt: 0` in the second example).


### Temporary Variables

Sometimes you want to store long math expression value in a variable to use it across the script. You can do it with temporary variables. The syntax looks like this - `var.foo = 30lb`. I.e. they should be prefixed with `var.`. For example:

{% plannercode %}
Bench Press / 3x8 / progress: custom() {~
  var.foo = floor(completedReps[1] / 2)
  if (completedReps >= reps) {
    reps[2] = var.foo
    reps[3] = var.foo
    reps[4] = var.foo
  }
~}
{% endplannercode %}

### Loops

There's also a way to iterate over the sets with **loops**. It looks like this:

{% plannercode %}
Bench Press / 3x8 / progress: custom() {~
  for (var.i in completedReps) {
    weights[var.i] = weights[var.i] + 5lb
  }
~}
{% endplannercode %}

That would set the weights of the next workout to 5lb more than finished weights of this workout.
The syntax is `for (var.i in weights)`, where `var.i` should always be a temporary variable (i.e. start with `var.`), and 
the expression on the right side of `in` should return an array.
The `var.i` would contain the index of each set, starting from 1.

### Prints

For debugging purposes, there's `print` function. You can use it to debug your scripts. Liftoscript doesn't support strings, so you can only pass numbers, weights or percentages there. It looks like this:

{% plannercode %}
print(1, 20lb, 30%)
print(100, weights[1], completedReps[2])
print(var.max)
{% endplannercode %}

It accepts any number of arguments, and you'll see all the prints either in playground or when you finish exercise during workout, after all sets are done.

### Update

`progress: ` logic updates the weights/reps/etc **in the program**, after you finish a workout. But there's also a way to update sets while you're doing a workout! For example, you want to set the number of drop sets or dropset reps based on the first set completed reps, or something like that.

For that, you can use `update: custom()` syntax, which is very similar to `progress: custom()`. The difference is that you cannot change program state variables, and you cannot access the program at all - only read the program state, and the currently ongoing workout values. The script would be run **before** completing any sets (with `setIndex` == 0), and then every single time user taps on a set.

So, the list of variables you can get values from is pretty much the same:

- `weights`
- `completedWeights`
- `reps`
- `completedReps`
- `RPE`
- `completedRPE`
- `rm1`
- `day`
- `week`
- `dayInWeek`
- `programNumberOfSets`
- `numberOfSets`
- `completedNumberOfSets`
- `setVariationIndex`
- `descriptionIndex`
- `setIndex` - index of a set that was tapped (it's 0 for the initial run - before completing any sets)

But assigning new values is only allowed to the following:

- `weights`
- `reps`
- `RPE`
- `timers`
- `numberOfSets`

So, to change the 2nd set, you do `weights[2] = 60lb`, and to change all sets, you do `weights = 50lb`.
You **cannot** change the sets that already completed, if you try that, it'd be ignored.

You cannot change other set variations, weeks or days, so syntax like `weights[1:2:3:4]` is not allowed, you can only do `weights` or `weights[1]`.

By changing `numberOfSets` you can add or delete sets. E.g. if you had 2 sets, and you do `numberOfSets = 5`, you'll add 3 more sets. You can also delete the sets - if you had 5 sets, and you do `numberOfSets = 2`, it'd delete last 3 sets. But again - only if they weren't already finished.

By default, it will add the same sets as the last set in that exercise. If you want to tweak new sets (or change existing), you can use `sets()` function. It accepts 9 arguments (!), and looks like this:

```javascript
sets(fromIndex, toIndex, minReps, maxReps, isAmrap, weight, timer, rpe, shouldLogRpe)
```

If `minReps` and `maxReps` are diffrent, it'll make it a rep range. `isAmrap` and `shouldLogRpe` should be `0` or `1` (`1` means it's enabled).

Using all of that, we can implement the example above - based on how many reps we did - add 3 sets and set the reps to half of the first set reps.

{% plannercode %}
Bench Press / 3x8 / update: custom() {~
  if (setIndex == 1 && completedReps[1] >= reps[1]) {
    numberOfSets = 4
    sets(2, 4, floor(reps[1] / 2), floor(reps[1] / 2), 0, weights[1], 0, 0)
  }
~}
{% endplannercode %}

`floor(reps[1] / 2)` makes sure that if there's a reminder when dividing by 2, we round it down. Like 5 / 2 -> 2.

You usually would want to always add a condition on `setIndex`, to ensure you're running the update script at the
right time, and also to distinguish initial run (wth `setIndex` == 0) and runs when you complete sets.

We can also reuse the update scripts, similarly to the `progress: custom()` scripts, with `{ ...Squat }` syntax:

{% plannercode %}
Bench Press / 3x8 / update: custom() {~
  if (setIndex == 1 && completedReps[1] >= reps[1]) {
    numberOfSets = 4
    sets(2, 4, floor(reps[1] / 2), floor(reps[1] / 2), 0, weights[1], 0, 0)
  }
~}

Squat / 3x8 / update: custom() { ...Bench Press }
{% endplannercode %}

You can specify both `update: custom()` and any `progress: ` within the same exercise.

### Number of sets

To do number-of-sets-based progressions, you can use `numberOfSets` variable in your `progress` scripts, similar to how you could do it in the `update` scripts. E.g. this is how you could setup a set-based double progression (which would increase sets from 3 to 5, and then would increase weight and reset sets back to 3):

{% plannercode %}
Squat / 3x8 / progress: custom() {~
  if (completedReps >= reps) {
    if (numberOfSets < 5) {
      numberOfSets += 1
    } else {
      weights += 5lb
      numberOfSets = 3
    }
  }
~}
{% endplannercode %}

You can also target specific weeks/days/setvariations if you want to. E.g. if you only want to change the number of sets on week 2, day 3, set variation 1, you can do `numberOfSets[2:3:1] += 1`.

### Set Variations

Sometimes you may want to have multiple sets x reps schemes within the same exercise, and switch between them on some condition. For example, in a popular weightlifting program called "GZCLP", you do `5x3` sets, but if you fail, you switch to `6x2` sets, and then - to `10x1` sets. To program that in Liftosaur, there's a concept of "set variations" - so that you can specify several set schemes and switch between them. Example above may look like this:

{% plannercode %}
Squat / 5x3 / 6x2 / 10x1 / progress: custom() {~
  if (completedReps >= reps) {
    weights = weights[ns] + 5lb
  } else {
    setVariationIndex += 1
  }
~}
{% endplannercode %}

There, we increase the weight by 5lb if we successfully finished the sets. But if not - we'll increment `setVariationIndex`, which would become `2`, and the next time the first line of the exercise will look like:

{% plannercode %}
Squat / 5x3 / ! 6x2 / 10x1 / progress: custom() {~
{% endplannercode %}

Note the exclamation mark `!` at `6x2` - that means that this is the current set variation. Putting that exclamation mark in front of a set variation makes it currently selected.

So, to define the set variations you just list them separated by `/`, and then use the `setVariationIndex` in the script to define the logic when to choose which set variation. And the app tracks which one is the current one by the `!` character.

### Advanced Descriptions

Similarly to set variations, you can specify mutliple descriptions per exercise, and switch between the current one by assigning to the `descriptionIndex` variable. The current one is marked the same as in set variations - by `!`.

To add mutliple descriptions, simply leave an empty line between them, like this:

{% plannercode %}
// This is the first description.
// We explain here how to do an exercise

// This is second description. Users already know what to do.
Squat / 5x3 / 6x2 / 10x1 / progress: custom() {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (completedReps >= reps) {
    weights += 5lb
  }
~}
{% endplannercode %}

After finishing the first workout, you'll notice the program now marks the currently selected description:

{% plannercode %}
// This is the first description.
// We explain here how to do an exercise

// ! This is second description. Users already know what to do.
Squat / 5x3 / 6x2 / 10x1 / progress: custom() {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (completedReps >= reps) {
    weights += 5lb
  }
~}
{% endplannercode %}

(note the `!` at the beginning of the second description).

### Split exercise lines

If the exercise lines get too long, and it becomes inconvenient to read and modify those, you can split them into multiple lines. Just add `\` character at the end of a section, like this:

{% plannercode %}
Squat / 1x5 @8 75% 120s, 3x8 @9 60s \
  / warmup: 1x5, 1x3, 1x1 \
  / progress: lp(5lb)
{% endplannercode %}

### Tags

Sometimes you want to change state variable of one exercise from another exercise. For that, you can use tags.
You can add tags to an exercise using `id: tags(123)` syntax, like this:

{% plannercode %}
Squat / 3x8 / id: tags(123)
{% endplannercode %}

You may add multiple tags to the same exercise, and you may add same tags to multiple exercises, for example:

{% plannercode %}
Squat / 3x8 / id: tags(1, 100)
Bench Press / 3x8 / id: tags(1, 101)
{% endplannercode %}

So they both will have the same tag `1`, and also Squat will have `100`, and Bench Press - `101`.

And then you can change their state variables from another exercise. Let's say they specify progression like this:

{% plannercode %}
Squat / 3x8 / id: tags(1, 100) / progress: custom(rating: 0) {~ ~}
Bench Press / 3x8 / id: tags(1, 101) / progress: custom(rating: 0) { ...Squat }
{% endplannercode %}

So, from another exercise you can change the rating state variable:

{% plannercode %}
Overhead Press / 3x8 / progress: custom() {~
  // Changes the rating state var in both Squat and Bench Press
  state[1].rating = 10

  // Changes the rating state var only in Bench Press
  state[101].rating = 10
~}
{% endplannercode %}

I.e. the syntax is `state[tag].variablename = value`.

## Script Language Reference

### Types

Result of an expression could be a number, weight, percentage or boolean.
Number, percentage or weight could be assigned to a state variable.
Only number could be used for number of reps for set expressions.
Number, percentage or weight could be used for set weight expressions.

### Values

The values are numbers (1, 3, 100, 31534532, etc.), and also you can add kg or lb suffix to the number to indicate that it is a weight (like 1lb, 3kg, 100lb, 31534532kg). You can also add '%' to indicate this is percentage (of 1 Rep Max)

Using lb/kg is recommended for when you deal with weights, because they will be converted to kilograms properly if user selects that unit on the settings screen.

### Operators

The following operators are available:

Math: +, -, /, \*, %
Boolean: >, <, <=, >=, ==, &&, ||
Ternary operator: for example `3 > 4 ? 1 : 2`

### If/else

You can add conditional logic to your scripts using `if/else` statements or ternary operators.

```javascript
if (completedReps[1] > 5) {
  state.someVar = 10;
}

if (completedReps[1] > 10) {
  state.someVar = 15;
} else {
  state.someVar = 10;
}

if (completedReps[1] > 10) {
  state.someVar = 15;
} else if (completedReps[1] > 5) {
  state.someVar = 10;
} else {
  state.someVar = 5;
}

state.someVar = r[1][4] > 10 ? 15 : 10;
```

### Assignment

You can assign values only to state variables, by `=` operator:

```javascript
state.someVar = (10 + 15) * 2;
```

There's also syntax to add/subtract/multiply/divide to the current value, like this:

```javascript
state.someVar += 5
state.someVar -= 10
state.someVar *= 2 
state.someVar /= 2 
```

### Predefined read-only variables

You cannot assign values to them, but you can use their values. They are:

#### For `progress: custom()`:

- `weights[n]` or `w[n]` - initial weight of an N set. N starts from 1.
- `completedWeights[n]` or `w[n]` - completed weight of an N set. N starts from 1.
- `reps[n]` or `r[n]` - number of reps for an N set.
- `completedReps[n]` or `cr[n]` - number of completed reps for an N set.
- `RPE[n]` - if exercise has RPE - the RPE expression that's required for an N set.
- `completedRPE[n]` - if exercise has RPE, and the set is marked as Log RPE - RPE that user entered for an N set.
- `rm1` - 1 Rep Max of a current exercise. You can set it in the Exercise Stats section (if you tap on exercise name on the workout screen)
- `day` - current day number, starting from 1.
- `week` - for multi-week programs - current week number, starting from 1.
- `dayInWeek` - current index of day in week, starting from 1.
- `programNumberOfSets` - how many sets was prescribed by a program.
- `numberOfSets` or `ns` - how many sets were in the exercise.
- `completedNumberOfSets` - how many sets are completed (by a checkmark).
- `setVariationIndex` - current set variation index (see below about set variations)
- `descriptionIndex` - current description index

#### For `update: custom()`:

Same as `progress: custom()`, but also `setIndex` - index of the set user just tapped.

### Predefined write variables

You assign new values to them.

#### For `progress: custom()`:

- `weights[day:week:setvariation:set]` - weight of a set
- `reps[day:week:setvariation:set]` - number of reps for a set.
- `RPE[day:week:setvariation:set]` - RPE that's required for a set.
- `timers[day:week:setvariation:set]` - timer that's assigned for a set.
- `rm1` - 1 Rep Max of a current exercise.
- `setVariationIndex` - index of the current set variation
- `descriptionIndex` - index of the current description
- `numberOfSets[week:day:setvariation]` - number of sets for the exercise in this workout

#### For `update: custom()`:

- `weights[set]` - weight of a set
- `reps[set]` - number of reps for a set.
- `RPE[set]` - RPE that's required for a set.
- `timers[set]` - timer that's assigned for a set.
- `rm1` - 1 Rep Max of a current exercise.
- `numberOfSets` - number of sets for the exercise in this workout

### State variables

You can access the state variables you defined via `state.` prefix. E.g. `state.myVar`.
You can write values into them via assignment operator (`=`)

```javascript
state.myVar = 4;
```

### Built-in functions

There are some built-in functions you can use in the expressions. They are:

#### `rpeMultiplier`

Used for calculating the multiplier of 1RM given the reps and RPE. Like for example, for 13 reps at 9 RPE, it'd
return multiplier of 0.6, i.e. you probably would be able to lift 60% of your 1RM for 13 reps at 9 RPE.

```javascript
state.weight * rpeMultiplier(13, 9);
```

First argument is the number of reps (1-24), second - the RPE value (1-10).

#### `floor`

It rounds the number down to the nearest integer.

```javascript
state.nextWeight = floor(152.4lb);
state.reps = floor(2.7);
```

#### `ceil`

It rounds the number up to the nearest integer.

```javascript
state.nextWeight = ceil(152.4lb);
state.reps = ceil(2.7);
```

#### `round`

It rounds the number to the nearest integer.

```javascript
state.nextWeight = round(152.4lb);
state.reps = round(2.7);
```

#### `sum`

It sums all the numbers or weights. Use it with `completedReps`, `completedWeights`, `weights`, `reps`, `RPE` or `completedRPE` variables.

```javascript
if (sum(completedReps) >= 15) {
  state.weight += 5lb;
};
```

#### `min`

Finds the minimum number or weight in an array. Use it with `completedReps`, `completedWeights`, `weights`, `reps`, `RPE` or `completedRPE` variables.

```javascript
state.minWeight = min(weights);
```

#### `max`

Finds the maximum number or weight in an array. Use it with `completedReps`, `completedWeights`, `weights`, `reps`, `RPE` or `completedRPE` variables.

```javascript
state.maxCompletedReps = max(completedReps);
```

#### `sets`

To setup new sets (or change existing), it works only for `update: custom()`. It accepts 9 arguments (!), and looks like this:

```javascript
sets(fromIndex, toIndex, minReps, maxReps, isAmrap, weight, timer, rpe, shouldLogRpe)
```

If `minReps` and `maxReps` are diffrent, it'll make it a rep range. `isAmrap` and `shouldLogRpe` should be `0` or `1` (`1` means it's enabled).

```javascript
sets(2, 4, 6, 6, 0, 50lb, 8, 0)
```

This will set 6 reps, 50lb, non-AMRAP, 50lb, @8 RPE (without logging RPE) to sets from 2 to 4.

<h2 id="how-to-delete-your-account">How to delete your account</h2>

If you want to delete your account, go to Settings (cog icon at the bottom right corner), then Account - and there's a button to delete an account.

You can also email to `info@liftosaur.com`, and I can help with that.

You can delete both local account (all your data stored on a device) and remote account - all your data stored on the servers. All the data there would be deleted permanently.

There're 30 days backups on the servers, so the remote account data will be still in the backups for the next 30 days, and after that it'll be gone completely.