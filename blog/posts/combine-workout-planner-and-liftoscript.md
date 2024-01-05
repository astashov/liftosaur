---
date: "2024-01-04"
title: Combine Workout Planner and Liftoscript
og_title: Combine Workout Planner and Liftoscript
og_description: Integrating Liftoscript into Workout Planner syntax to make the planner as powerful as a regular Liftosaur editor
og_image: /images/combine-workout-planner-and-liftoscript-intro.jpg
tags: ["weightlifting", "tech"]
---

<div><img src="../../images/combine-workout-planner-and-liftoscript-intro.jpg" width="100%" alt="Midjourney generated book and some barbell plates" /></div>
<div class="subscription">This is what Midjourney thinks a good illustration for the post. Who am I to argue with AI overlords?</div>

I recently added "Full Program" mode to the [Workout Planner](https://www.liftosaur.com/planner). Now you can edit a whole
weightlifting program as just one text file.

And this is so cool! Making weightlifting programs was never easier and faster. But I still have to fall back to a regular
Web Editor from time to time for some custom progression logic. And that sucks, there's way too much clicking around, I
really would want to build whatever I want in the Workout Planner instead end to end.

So I couldn't stop thinking - could I somehow bring the full power of the regular Web Editor to Workout Planner?
Having Liftoscript there, I could implement any possible progression logic in it as well. And after some brainstorming, I think I have something in mind.

The idea is to use Liftoscript syntax right inside the Workout Planner program. But first, we'd need to extend both Liftoscript and Workout Planner with the new features.

Currently, in Liftoscript, you can access required/completed reps, weight, rpe, etc via `reps[1]`, `completedReps[1]`, `weights[1]`, etc.
We need to add a way to directly change required reps, weight, rpe and timer in the program in the Finish Day Script. I.e. you'd be able to do this:

```javascript
reps = 5 // Set all the reps of all the sets to 5
reps[1] = 8 // Set all the reps of the 1st set variation to 8
reps[1:2] = 30// Set the 2nd set reps of the 1st set variation to 3

weight = 5lb // Set all the weights of all the sets to 5lb
weight[1] = 0.5 // Set all the weights of the 1st set variation to 50% of 1RM
weight[1:2] = rpeMultiplier(6, 10) // Set the 2nd set's weight of the 1st set variation to that RPE multiplier

// Same thing for timer and RPE
```

Now, if we have that, we can introduce new progress function in the Workout Planner - `custom()`. In that function, in the curly braces, we can add our Liftoscript code!

```javascript
Bench Press / 5x5 / progress: custom() {
  if (completedReps >= reps) {
    state.weight += 5lb
  }
}
```

Between the parentheses in the `custom` function we can define the state variables. Some state variables would be available by default (like `weight`). E.g. if we want to increase weight after 3 successful attempts, and reduce weight after 2 failures, it'd be:

```javascript
Bench Press / 5x5 / progress: custom(success: 0, failures: 0) {
  if (completedReps >= reps) {
    state.success += 1
    if (state.success > 3) {
      state.weight += 5lb
      state.success = 0
      state.failures = 0
    }
  } else {
    state.failures += 1
    if (state.failures > 2) {
      state.weight -= 10lb
      state.success = 0
      state.failures = 0
    }
  }
}
```

Unlike regular Liftoscript and Web Editor, you cannot use state variables in reps/weight/timer/etc. But you can directly change them for the next workout in the script using our new Liftoscript syntax we introduced above. Like for the double progression:

```javascript
Bench Press / 3x8 / progress: custom(success: 0, failures: 0) {
  if (completedReps >= reps) {
    reps = reps[1] + 1
  }
  if (reps[ns] > 12) {
    reps = 8
    state.weight += 5lb
  }
}
```

We can also introduce set variations in the Workout Planner, just by listing them one after another, like:

```javascript
Bench Press / 5x3 / 6x2 / 10x1 / progress: custom() {
  if (!(completedReps >= reps)) {
    state.setVariation += 1
  }
}
```

This way, we'll have 3 set variations - '5x3', '6x2' and '10x1'. And you can switch between them by assigning a value to `state.setVariation` (also a default built-in state variable).
Similar way you can specify multiple descriptions and switch between them via `state.description` state var:

```javascript
// First description

// Second description
Bench Press / 5x3 / 6x2 / 10x1 / progress: custom() {
  if (completedReps >= reps) {
    state.description += 1
  }
}
```

We also will introduce new Workout Planner syntax to reuse logic of exercises, which will look like this:

{% plannercode %}
Bench Press / 5x5
Squat / ...Bench Press
{% endplannercode %}

This way Squat will reuse whatever sets/reps, progression, etc are defined for the Bench Press.

Using all of that, we can e.g. implement GZCLP:

```javascript
# Week 1
## Day 1

t1: Squat / 5x3 100% / 6x2 100% / 10x1 100% / progress: custom(increase: 10lb) {
  if (completedReps >= reps) {
    state.weight += state.increase
  } else if (sets == 3) {
    setVariation = 1
  } else {
    setVariation += 1
  }
}
t2: Bench Press / 3x10 100% / 3x8 100% / 3x6 100% / progress: custom(state1weight: 0lb, increase: 5lb, state3increase: 10lb) {
  if (completedReps >= reps) {
    state.weight += 5lb
  } else if (state.stage == 1) {
    state.stage1weight = state.weight
    state.stage += 1
  } else if (state.stage == 2) {
    state.stage += 1
  } else {
    state.stage = 1
    state.weight = state.stage1weight + state.stage3increase
  }
}
t3: Lat Pulldown / 3x15 100%, 15+ 100% / progress: custom() {
  if (completedReps[ns] >= 25) {
    state.weight += 5lb
  }
}

## Day 2
t1: Overhead Press / ...t1: Squat / progress: custom(increase: 5lb)
t2: Deadlift / ...t2: Bench Press / progress: custom(state1weight: 0lb, increase: 10lb, state3increase: 15lb)
t3: Bent Over Row / ...t3: Lat Pulldown

## Day 3
t1: Bench Press / ...t1: Squat / progress: custom(increase: 5lb)
t2: Squat / ...t2: Bench Press / progress: custom(state1weight: 0lb, increase: 10lb, state3increase: 15lb)
t3: Lat Pulldown

## Day 4
t1: Deadlift / ...t1: Squat / progress: custom(increase: 5lb)
t2: Overhead Press / ...t2: Bench Press / progress: custom(state1weight: 0lb, increase: 5lb, state3increase: 10lb)
t3: Bent Over Row
```

Note that reusing exercises can define their values for the state variables via the same `custom(foo: 3)` syntax, just without the block withing the curly braces - it'll be reused from the original exercise.

And that's it! That pretty much would be the whole GZCLP program, with all the autoincrements, changing stages on failures, and all the proper logic for T1s, T2s and T3s.

All that stuff makes the Workout Planner pretty much as powerful as the regular Liftosaur's program editor. And a big advantage is that you don't really need to know/use all of that, you still can do simple programs like:

```
Squat / 5x5
Bench Press / 3x8 @8 / progress: lp(5lb)
```

But if you really want something very custom and unusual for you progression, you can use this new `custom() { }` syntax
to do whatever you want realy.

One caveat here is that if I integrate Workout Planner into the app fully and make it the default program editor, then
when people open e.g. built-in GZCLP program to tweak it, and see that blob of code for T1/T2 exercise, that could be quite intimidating. Currently it's kinda buried in UI and doesn't look as scary.

But IMHO that's a step in the right direction, and would unlock a lot of potential.

What do you think? Would love to hear your thoughts on that! Please comment on Reddit what do you think about it!
