---
date: "2024-01-25"
title: New Experimental Program Editor
og_title: New Experimental Program Editor
og_description: New Experimental Program Editor combines Workout Planner + Liftoscript, and makes writing Liftosaur programs way faster.
og_image: /images/new-experimental-program-editor-intro.jpg
tags: ["weightlifting", "tech"]
reddit: https://www.reddit.com/r/liftosaur/comments/1acnvmt/new_experimetal_programs_aka_inapp_workout/
twitter: https://twitter.com/liftosaur/status/1751384940040601772
---

<div><img src="../../images/new-experimental-program-editor-intro.jpg" width="100%" alt="Buff guy writing notes" /></div>

In the latest post I tried to [envision](/blog/posts/combine-workout-planner-and-liftoscript/) what would it take to combine Planner syntax with Liftoscript, and write Liftosaur programs using that new syntax. And it's finally here!

IMHO it worked out amazingly! I really like the new syntax, IMHO it makes it WAAAY simpler to write programs, they're easier to comprehend. Each program is essentially just a blob of text, it's easy to share it, edit it, etc. I can't wait to see what y'all going to create in it! :)

So, there's now a way to create "experimental" Liftosaur program - if you select "Create experimental program" in the
program creation modal in the app. There, you use Workout Planner syntax to create those new programs - you just type
exercises and sets x reps you want to have.

<div style="text-align: center"><img src="../../images/new-experimental-program-editor-create.png" width="300" alt="Liftosaur screen to create new experimental program" /></div>

I described it in one of the previous posts, but will quickly remind you here.

## Reminder on the existing Workout Planner syntax

### Basics

Each exercise goes on a separate line. It consists of sections separated by a slash (`/`). First should go the exercise name, and then in any order you can put the sections. The simplest exercise is written like this:

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

So, an example workout may look something like this:

{% plannercode %}
Bench Press / 3x5 80%
Incline Bench Press / 3x8-12 @8 / 90s
Skullcrusher / 3x15 @8
Lateral Raise / 3x15 @8
{% endplannercode %}

By default, it'll use default equipment - e.g. for **Bench Press** it'll use **Barbell**. If you want to specify different equipment, add it after the exercise name, like this:

{% plannercode %}
Bench Press, Dumbbell / 3x5
{% endplannercode %}

### Progressions

You can also specify the progressive overload for each exercise. There're 3 built-in types of progressive overload:

- Linear Progression (**lp**) - increase or decrease the weight by a fixed amount or percentage after N attempts.
- Double Progression (**dp**) - increase the reps within a range, then reset the reps and increase the weight.
- Reps Sum (**sum**) - increase the weight if the total sum of reps of all sets more than the threshold.

You can add a progression like this:

{% plannercode %}
Bench Press / 3x8 / progress: lp(5lb, 3)
{% endplannercode %}

That will increase the weight by 5lb after 3 successful attempts. Or like this:

{% plannercode %}
Bench Press / 3x8 / progress: dp(5lb, 8, 12)
{% endplannercode %}

It will keep increasing reps from 8 to 12, and then reset the reps to 8 and increase the weight by 5lb.

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

### Descriptions

You can add descriptions to exercises via `//` comments, like this:
{% plannercode %}
// Pause **2 seconds** at the bottom
Squat / 5x5 / progress: lp(5lb)
{% endplannercode %}

You can use Markdown syntax there, and also the descriptions would be reused in the following weeks/days, until you overwrite them. E.g. if you have description on Week 1 and Week 3, Week 2 would reuse Week 1 description, and Week 4+ would reuse Week 3 description. You can stop that by adding empty `//` comment, like this, then this week and following weeks won't reuse the description. Like this:

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

## New syntax

The new experimental programs work somewhat different from the former Liftosaur programs.

Previously, it was all about state variables. You can define them, and use them in weights, reps, timer, etc. And by changing them in the Finish Day Script, you can program progressive overload.

It's quite different in the new programs. You still can use state variables, but mostly to remember some state through the workouts - like number of successful workouts in a row, or some weight you had at the beginning of the mesocycle, or something like that. Most of the time you won't need them.

Instead, you'll change the weights, reps, timer and RPE directly in the exercises. And for that, you'll use the Liftoscript
together with the planner syntax. There's a new `progress` property that you can apply to the exercise - `custom()`. It looks like this:

{% plannercode %}
Bench Press / 5x5 / 100lb / progress: custom() {~
  if (completedReps >= reps) {
    weights += 5lb
  }
~}
{% endplannercode %}

Note that we include Liftoscript inside `{~ ~}` - curly braces with tildas! This is so that we can distinguish Liftoscript syntax from the regular Workout Planner syntax.

So, instead of changing the state variable `state.weight`, you just directly change the built-in variable `weights`. And when you finish the workout and open the program again, you'll see that weight went up and the program now looks like this:

{% plannercode %}
Bench Press / 5x5 / 105lb / progress: custom() {~
  if (completedReps >= reps) {
    weights += 5lb
  }
~}
{% endplannercode %}

Instead of `100lb` now it says `105lb`! And that's another important feature of the new programs - they will update based on the progressive overload. If you update reps, weight, timer, etc in your `custom() {~ ~}` block, it will be reflected in the program text.

{% plannercode %}
Bench Press / 5x5 / 105lb 30s @8 / progress: custom() {~
  if (completedReps >= reps) {
    weights += 5lb /// Update weights of all sets
    reps = 7 /// Set reps of all sets
    timer = 90 /// Set timers between all sets
  }
~}
{% endplannercode %}

After completion, it'll look like this:

{% plannercode %}
Bench Press / 5x7 / 110lb 90s @8 / progress: custom() {~
  if (completedReps >= reps) {
    weights += 5lb /// Update weights of all sets
    reps = 7 /// Set reps of all sets
    timer = 90 /// Set timers between all sets
  }
~}
{% endplannercode %}

Similar to old Liftosaur programs, you can specify set variations. You don't need to use them for various weeks/days like in the old editor, it's more for falling back to other set schemes e.g. if you failed to finish sets.

To add set variations, just list sets x reps in another section, like this:

{% plannercode %}
Bench Press / 3x5 / 2x7 / progress: custom() {~
  if (!(completedReps >= reps)) {
    setVariationIndex += 1
  }
~}
{% endplannercode %}

Here you have 2 set variations - `3x5` and `2x7`. You can switch between set variations via a special `setVariationIndex` variable. By default, first set variation is selected, and if you want to use another one, you add exclamation mark (`!`) in front of it, like this:

{% plannercode %}
Bench Press / 3x5 / ! 2x7 / progress: custom() {~
  if (!(completedReps >= reps)) {
    setVariationIndex += 1
  }
~}
{% endplannercode %}

Now, `2x7` would be selected. After finishing a workout, when it runs the finish day script, it'll automatically add exclamation mark to the newly selected set variation if it's not the first one.

When you update weights, reps, etc - you can target specific sets, set variations, days or weeks. Like this:

{% plannercode %}
Bench Press / 5x7 / 110lb 90s @8 / progress: custom() {~
  if (completedReps >= reps) {
    weights[1] += 5lb /// Only update weight of 1st set
    weights[1:2] += 5lb /// Only update 2st set of 1st set variation
    weights[1:*:2] += 5lb /// Only update 2st set of ALL set variations on the first day
    weights[3:1:*:2] += 5lb /// Only update 2st set of ALL set variations on the first day of 3rd week
  }
~}
{% endplannercode %}

So, the syntax is `reps[week:day:setvariation:set]`. You can use `*` instead of a number to target all weeks/days/sets.
If you omit week, day, set variation or set, it'll assume it's `*` for them. I.e. `weights[1:2]` is the same as `weights[*:*:1:2]`, `weights[1]` is the same as `weights[*:*:*:1]`, and `weights` is the same as `weights[*:*:*:*]`.

If you want to use state variables, you need to specify them inside `custom()` parentheses, like this:

{% plannercode %}
Bench Press / 5x7 / 110lb 90s @8 / progress: custom(increment: 5lb) {~
  if (completedReps >= reps) {
    weights += state.increment
  }
~}
{% endplannercode %}

It will create a state variable `increment`, which you can use in your Finish Day Script.

You can also reuse Finish Day Scripts, like this:

{% plannercode %}
Bench Press / 5x5 / progress: custom(increment: 5lb) {~
  if (completedReps >= reps) {
    weights += state.increment
  }
~}
Squat / 3x4 / progress: custom(increment: 10lb) { ...Bench Press }
{% endplannercode %}

Here, we reuse the same finish day script for both Bench Press and Squat, but for Squat we'll increment the weight by 10lb. I.e. we also can use state variables to parameterize our Finish Day Scripts. Note that in this case it's just curly braces `{ }`, without tildas - because it's still Workout Planner syntax.

## Percentages

I added new numeric type to Liftoscript - percentage (both in old and new programs!). You can set percentages in state variables, use them in weight expressions, etc. Percentages mean % of 1RM. So, you can e.g. write in your weight expression field `50%`, and it'll be 50% of 1RM for that exercise.

## Some features were removed

Two features were removed from the Liftoscript syntax:

* Reusing of previous week sets x reps via `...`, like `Bench Press / ...`
* Omitting set number when there's just one set. I.e. previously you could write `5 50lb` for 5 reps and 50lb. Now, you have to specify sets too, i.e. `1x5 50lb`.

I had to kill reusing sets x reps because over time weeks can go out of sync, e.g. if you increased reps of the exercise on week 2 or something like that. And for the set numbers - it's to make it more future-proof, when I add e.g. time-based exercises.

## Things that are not yet implemented (but will be soon!)

Comments via triple slash `///` are not supported yet. I mean you can add them, but they will be wiped out after finishing a workout. 

## Examples

So, using all of that, here how we could implement various programs:

### Stronglifts 5x5:

That one is pretty simple:

{% plannercode %}
# Week1
## Workout A
Squat / 5x5 / progress: lp(10lb, 1, 0, 10%, 3, 0)
Bench Press / 5x5 / progress: lp(5lb, 1, 0, 10%, 3, 0)
Bent Over Row / 5x5 / progress: lp(5lb, 1, 0, 10%, 3, 0)

## Workout B
Squat / 5x5 / progress: lp(10lb, 1, 0, 10%, 3, 0)
Overhead Press / 5x5 / progress: lp(5lb, 1, 0, 10%, 3, 0)
Deadlift / 1x5 / progress: lp(10lb, 1, 0, 10%, 3, 0)
{% endplannercode %}

### Greyskull LP

Also pretty trivial :)

{% plannercode %}
# Week 1
## Workout A
Bench Press / 2x5, 1x5+ / warmup: 5 45lb, 4 55% , 3 70%, 2 85% / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Bent Over Row / 2x5, 1x5+ / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Squat / 2x5, 1x5+ / warmup: 5 45lb, 4 55% , 3 70%, 2 85% / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Triceps Extension / 2x12, 1x12+ / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Ab Wheel / 2x12, 1x12+ / 0lb

## Workout B
Overhead Press / 2x5, 1x5+ / warmup: 5 45lb, 4 55% , 3 70%, 2 85% / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Chin Up / 2x5, 1x5+ / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Deadlift / 2x5, 1x5+ / warmup: 5 45lb, 4 55% , 3 70%, 2 85% / progress: lp(5lb, 1, 0, 10%, 1, 0)
Bicep Curl / 2x12, 1x12+ / progress: lp(2.5lb, 1, 0, 10%, 1, 0)
Shrug / 2x12, 1x12+ / progress: lp(10lb, 1, 0, 10%, 1, 0)
{% endplannercode %}

### GZCLP

That one really challenges the approach :) There's a lot of logic, several set variations, custom progressions, etc.
But we still can do it! It'd look like this:

{% plannercode %}
# Week 1
## Day 1
/// Note that we specify 4 set variations. The last one is a testing week,
/// to get the new weight before going back to the first set.
t1: Squat / 5x3 75% / 6x2 75% / 10x1 75% / 1x5 (5RM Test) / progress: custom(increase: 10lb) {~
  /// Fourth set is 5RM retesting week. So, we'll use 85% of the new 5RM for the weights,
  /// and also we'll update our 1RM for the exercise based on that - and that value would be transferrable
  /// to other programs too!
  if (setVariationIndex == 4) {
    setVariationIndex = 1
    weights = weights[1] * 0.85
    rm1 = weights[1] / rpeMultiplier(5, 10)
  } else if (completedReps >= reps) {
    weights = weights[ns] + state.increase
  } else {
    setVariationIndex += 1
  }
~}
/// Here we have 3 set variations, and we use a state variable to remember stage 1 weight.
t2: Bench Press / 3x10 35% / 3x8 35% / 3x6 35% / progress: custom(stage1weight: 0lb, increase: 5lb, stage3increase: 10lb) {~
  if (completedReps >= reps) {
    weights = weights[ns] + 5lb
  } else if (setVariationIndex == 1) {
    state.stage1weight = weights[ns]
    setVariationIndex += 1
  } else if (setVariationIndex == 2) {
    setVariationIndex += 1
  } else {
    setVariationIndex = 1
    weights = state.stage1weight + state.stage3increase
  }
~}
/// That one is simple - we just increase the weight by 5lb if we did 25 reps on the last set.
t3: Lat Pulldown / 3x15 60%, 1x15+ 60% / progress: custom() {~
  if (completedReps[ns] >= 25) {
    weights = weights[ns] + 5lb
  }
~}

## Day 2
/// All the logic is the same for all T1s, T2s and T3s, so we just reuse the Finish Day Scripts
t1: Overhead Press / 5x3 75% / 6x2 75% / 10x1 75% / progress: custom(increase: 5lb) { ...t1: Squat }
t2: Deadlift / 3x10 35% / 3x8 35% / 3x6 35% / progress: custom(stage1weight: 0lb, increase: 10lb, stage3increase: 15lb) { ...t2: Bench Press }
t3: Bent Over Row / 3x15 60%, 1x15+ 60% / progress: custom() { ...t3: Lat Pulldown }

## Day 3
t1: Bench Press / 5x3 75% / 6x2 75% / 10x1 75% / progress: custom(increase: 5lb) { ...t1: Squat }
t2: Squat / 3x10 35% / 3x8 35% / 3x6 35% / progress: custom(stage1weight: 0lb, increase: 10lb, stage3increase: 15lb) { ...t2: Bench Press }
t3: Lat Pulldown / 3x15 60%, 1x15+ 60%

## Day 4
t1: Deadlift / 5x3 75% / 6x2 75% / 10x1 75% / progress: custom(increase: 5lb) { ...t1: Squat }
t2: Overhead Press / 3x10 35% / 3x8 35% / 3x6 35% / progress: custom(stage1weight: 0lb, increase: 5lb, stage3increase: 10lb) { ...t2: Bench Press }
t3: Bent Over Row / 3x15 60%, 1x15+ 60%
{% endplannercode %}

Once you get familiar with the syntax, it's IMHO pretty easy to figure out how it works, just by reading the text.

## App Changes

The edit program screen now looks very different from regular Liftosaur editor, and very similar to the Workout Planner web page. Similarly to the Workout Planner, you can see weekly/daily volume per muscle group, exercise intensity/volume undulation graphs week over week. You can also test your changes in program preview. It allows you to quickly simulate various scenarios, and make sure the logic you defined works as expected.

You can also switch to Full Program Mode there, and there's new UI for rearranging weeks and days.

<div style="text-align: center"><img src="../../images/new-experimental-program-editor-edit-program.png" width="300" alt="Liftosaur screen to edit experimental programs" /></div>

Daily Stats and Exercise Graphs get enabled when you focus a cursor on specific day or exercise.

## Conclusion

So, give it a try, and let me know what you think! I'm really excited about this new syntax and new capabilities it unlocks. That was a huge rewrite of the Liftosaur engine, so let me know if something got broken.