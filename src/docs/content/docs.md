# Documentation

## Workouts

You can clone existing workouts and edit cloned ones, or create your own workouts from scratch.

A workout consists of days. Each day consists of exercises. Each exercise consists of sets.
Each set consists of:

- number of reps
- weight to lift
- whether it's an AMRAP exercise (As Many Reps As Possible).

There's a special scripting language called Liftoscript. You can use it to describe the logic
for the number of reps in a set, and for the set weights. It will allow to express almost any
possible progressions and deloads variants.

## Liftoscript tutorial

If you have ever written scripts in JavaScript, Python or similar programming language (or even Excel!),
Liftoscript will look very familiar. If not - no worries, it's a pretty simple and small language.

<div style="text-align: center">
  <video src="/images/docs-video.mp4" controls style="width: 100%; max-width: 320px;"></video>
</div>
Check this video if you get stuck, it replicates what's written below.

### State Variables and Finish Day Script

Let's start with creating our own simple workout. Open liftosaur.com (you may want to use laptop or desktop computer for that, not a phone, so you'd have access to keyboard. It's not required, but in my opinion - way more handy). Go to Settings (cog icon at the right bottom corner), and press "Choose Program". There, press "Create new program". Let's name it "Liftosaurus".

Now, press "Day 1", then press the "Create New Exercise" button to add an exercise. In the "Exercise" field select "Bench Press".

Skip the variations section for now, and scroll to the "State Variables" section. Let's create a variable here, that will control the weights of the sets of this exercise. We will increase or decrease the value of this variable in the script, and it will be reflected in the sets' weight. This way, we can program progressions and deloads.

Press "Add Variable +", and name it `weight`. Select type - `lb`. That means this variable will contain pounds.
Press `0 lb` value of the variable, and change it to e.g. `50lb`.

You just created a variable, that will store the weight of the bench press exercise for the next day.

Now, let's put that variable in use. Scroll down to the "Sets" section. For simplicity, we'll only have 1 set of 5 reps for our exercise. The weight of it though will be controlled by the `weight` state variable we created above. For that, in the **Weight** field, type `state.weight`.

It should give you a hint that evaluation result will be `50lb`, which is the current value of `state.weight`.
You can enter any expression there, using math operators. For example, in 5/3/1 workout variations, for weights there're often percentages of training max weight being used, so you could write it as `state.weight * 0.7`, for example. Or do something completely crazy like `(state.weight + 10lb) * 5 / 3.14` (no idea why would you need it, but it's totally possible).

Now let's define the rules how we'll do progressions. Scroll to the very bottom, to the section "Finish Day Script". Type there:

```javascript
state.weight = state.weight + 5lb
```

This means that when we finish a day, we're going to add 5lb to the previous value of `weight`.

You can use any state variables you defined, both in Finish Day Script or in expressions for weight or number of reps for an exercise, by prefixing them with `state.`, like you see in the example above.

You may notice that the weight value gets rounded if you use some math operators. Liftosaur always rounds the weight so you could get it using your available plates. So, please make sure the "Available Plates" in "Settings" correctly reflect the plates you have access to in your gym.

Above "Finish Day Script" you could see the "State Changes" section, which should show something like `weight: 50lb -> 55lb` - it should how the state variable are going to change after we finish the day. It says that the `weight` state variable will be increased by `5lb`, which is exactly what we want.

Now, scroll to the very bottom and press "Save". You'll get back to the day editing screen. In the "Available Exercises" you'll see our new "Bench Press" exercise. Press it, and it should appear in the "Selected exercises". That means our first day now has this exercise added.

You can give it a try for real now - go back to the list of days, and then go back again to the "Choose Program" screen. There, click on our new "Liftosaurus" program to select it. Press "Start Next Workout", then press "Finish the workout". You'll see that for the next workout the weight will be 50lb now.

### Conditional logic

It's not very useful now though - we always bump the weight to 5lb, no matter whether we were able to lift that weight for 5 times or not. Let's adjust our Finish Day Script to only bump up the weight if we successfully lifted it 5 times.

If you're still in the History screen, press "Edit Program" (if it's missing, you probably have ongoing workout, you need to finish it first before you can edit a program). Then press on the "Bench Press" exercise to edit it.

In the "Finish Day Script" section, change it to the following:

```javascript
if (completedReps[1] >= reps[1]) {
  state.weight = state.weight + 5lb
}
```

Now we only will update the weight of the bench press if the completed reps of the first set is more or equal than the defined reps for that set (which is 5 in our case). I.e. the number in square brackets after `completedReps` or `reps` is for what set in the exercise.

We could also write it as:

```javascript
if (completedReps[1] >= 5) {
  state.weight = state.weight + 5lb
}
```

But in that case if we ever change the required reps for the exercise to e.g. 10, it still will bump the bench press weight by 5 if we complete 5 or more reps, which is probably not what we want.

You can verify it works via playground. Scroll up to the "Playground" section, and try to set 5 completed reps, make sure in "State changes" you see that the `weight` got bumped. And if you set less than 5 completed reps, `weight` disappears from the state changes, meaning that state variable won't be changed anymore.

The list of available variables you can use in your Finish Day Scripts:

- `weights[n]` or `w[n]` - weight of an N set. N starts from 1.
- `reps[n]` or `r[n]` - number of reps for an N set.
- `completedReps[n]` or `cr[n]` - number of completed reps for an N set.
- `day` - current day number, starting from 1.

### Deloads

Let's change our program of Bench Press, so that if you fail to accomplish 5 reps of bench press for 3 times, the weight of bench press gets lowered by 15lb.

To accomplish that, we'll need another state variable to track number of failures. Let's create a state variable,
and name it `failures`, with "variable type": `number`.

Then, change the script to:

```javascript
if (completedReps[1] >= reps[1]) {
  state.weight = state.weight + 5lb
  state.failures = 0
} else {
  state.failures = state.failures + 1
}
if (state.failures > 2) {
  state.weight = state.weight - 15lb
  state.failures = 0
}
```

Here, if we successfully accomplish 5 reps, we set failures variable to 0. If not - then we'll increment it by 1.
And if that variable value is over 2, we'll reduce the bench press weight by 15, and reset the failures counter.
Try it out in Playground with various values of state variables to make sure it works as expected.

### Variations

In case we want some exercise to have various Sets x Reps scheme depending on some conditions, but share the same state variables, we may use Variations. E.g. GZCLP program Tier 1 exercises may have 3 variations - 5x3, which if fails, switches to 6x2, which if fails switches to 10x1, which if fails leads to deload. So, to create such exercise, we may use Variations. If you create more than one variation, there will be the "Variation Expression" section, where you can script what variation will be shown under what conditions. It should return the variation index, which starts with 1. E.g. you may have 2 variations, and the variation expression like:

```
day == 1 ? 1 : 2
```

And for the Day 1 it will use `Variation 1`, for all other days it will use `Variation 2` SetsxReps scheme.

## Language Reference

### Types

Result of an expression could be a number, weight or boolean.
Number or weight could be assigned to a state variable.
Only number could be used for number of reps for set expressions.
Number or weight could be used for set weight expressions.

### Values

The values are numbers (1, 3, 100, 31534532, etc), and also you can add kg or lb suffix to the number to indicate that is's a weight (like 1lb, 3kg, 100lb, 31534532kg).

Using lb/kg is recommended for when you deal with weights, because they will be converted to kilograms properly if user selects that unit on the settings screen.

### Operators

The following operators are available:

Math: +, -, /, \*
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

### Predefined variables

You cannot assign values to them, but you can use theirs values. There're:

- `weights[x]` or `w[x]` - weight of an X set. X starts from 1.
- `reps[x]` or `r[x]` - number of reps for an X set.
- `completedReps[x]` or `cr[x]` - number of completed reps for an X set.
- `day` - current day number, starting from 1.

### State variables

You can access the state variables you created via `state.` prefix. E.g. `state.myVar`.
You can write values into them via assignment operator (`=`)

```javascript
state.myVar = 4;
```

### Built-in functions

There're some built-in functions you can use in the expressions. There're:

#### `calculateTrainingMax`

Used for calculating the training max, which is 90% of 1 rep max. 1 rep max is calculated by the [Epley formula](https://en.wikipedia.org/wiki/One-repetition_maximum). Mostly useful for 5/3/1 variations.

```javascript
state.nextWeight = calculateTrainingMax(150lb, 5);
```

It would assign `155lb` to `state.nextWeight`. First argument is the weight you used for a lift, and the second argument is the number of reps you were able to do with that weight.
