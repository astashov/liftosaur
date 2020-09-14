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

### State Variables and Finish Day Script

Let's start with creating our own simple workout. Open liftosaur.com (you may want to use laptop or desktop computer for that, not a phone, so you'd have access to keyboard. It's not required, but in my opinion - way more handy). Go to Settings (cog icon at the right bottom corner), and press "Choose Program". There, press "Create new program". Let's name it "Liftosaurus".

Now, press "Day 1", then press the "+" button to add an exercise. Select "Bench Press", and press "Add". It will add Bench Press exercise, with 1 set of 5 reps and 0lb weight for each rep.

Go back ("Back" button top left corner), and press "Edit Script" button.

This is where we specify the logic for progressions and deloads for our exercises. Let's try to make it so when we finish a day, we increase bench press weight by 5lb.

For that, press "Add State Variable", and create new state variable named "benchPressWeight" (one word no spaces),
and choose "variable type" - "lb", then press "Add". Then press "0 lb" value of the variable, and change it to e.g. 45lb (empty bar).

You just created a variable, that will store the weight of the bench press exercise for the next day.

Now, there's "Finish Day Script" below, which will define how those variables change when we finish all exercises in a day. Press under the "Finish Day Script" label, and type this there:

```javascript
state.benchPressWeight = state.benchPressWeight + 5lb
```

This means that when we finish a day, we're going to add 5lb to the previous value of `benchPressWeight`.
Now let's use `state.benchPressWeight` in our exercise. Press "Back" to go back to the days list, then press "Day 1" again, and press the button for the first bench press set. There, in the "Weight" field, type the following:

```javascript
state.benchPressWeight;
```

It should give you a hint that evaluation result will be `45lb`, which is the current value of `state.benchPressWeight`.
You can enter any expression there, using math operators. For example, in 5/3/1 workout variations, for weights there're often percentages of training max weight being used, so you could write it as `state.benchPressWeight * 0.7`, for example. Or do something completely crazy like `(state.benchPressWeight + 10lb) * 5 / 3.14` (no idea why would you need it, but it's totally possible).

You can use any state variables you defined, both in Finish Day Script or in expressions for weight or number of reps for an exercise, by prefixing them with `state.`, like you see in the example above.

You may notice that the weight value gets rounded if you use some math operators. Liftosaur always rounds the weight so you could get it using your available plates. So, please make sure the "Available Plates" in "Settings" correctly reflect the plates you have access to in your gym.

Now, let's make sure it really works and we get our bench press weight bumped up by 5lb each day. For that, go back to the list of days, press "Edit Script", and in "Playground" section, choose "Day 1 - 1". Underneath it you'll see the progress view, very similar to the regular progress view when you do workouts. It's a playground - you can try different combinations of reps, weights and completed reps, and see how state got updated if you finish the day with that combination.

In the "State Changes" section you'll see `benchPressWeight: 45 lb -> 50 lb`. That means it works as expected, and always updates the weight when you finish a day. You can also give it a try for real - go back to the list of days, and then go back again to the "Choose Program" screen. There, click on our new "Liftosaurus" program to select it. Press "Start Next Workout", then press "Finish the workout". You'll see that for the next workout the weight will be 50lb now.

### Conditional logic

It's not very useful now though - we always bump the weight to 5lb, no matter whether we were able to lift that weight for 5 times or not. Let's adjust our Finish Day Script to only bump up the weight if we successfully lifted it 5 times.

If you're still in the History screen, press "Edit Program" (if it's missing, you probably have ongoing workout, you need to finish it first before you can edit a program). Then press "Edit Script".

In the "Finish Day Script" section, change it to the following:

```javascript
if (completedReps[1][1] >= reps[1][1]) {
  state.benchPressWeight = state.benchPressWeight + 5lb
}
```

Now we only will update the weight of the bench press if the completed reps of 1 exercise and 1 set is more or equal than the defined reps for that exercise and that set (which is 5 in our case). I.e. the first number in square brackets after `completedReps` or `reps` is for what exercise, and the second number in square brackets is for what set in the exercise.

We could also write it as:

```javascript
if (completedReps[1][1] >= 5) {
  state.benchPressWeight = state.benchPressWeight + 5lb
}
```

But in that case if we ever change the required reps for the exercise to e.g. 10, it still will bump the bench press weight by 5 if we complete 5 or more reps, which is probably not what we want.

You can verify it works via playground. Choose "Try with Day": "Day 1 - 1", and try to set 5 completed reps, make sure in "State changes" you see that the `benchPressWeight` got bumped. And if you set less than 5 completed reps, `benchPressWeight` disappears from the state changes, meaning that state variable won't be changed anymore.

The list of available variables you can use in your Finish Day Scripts:

- `weights[x][y]` or `w[x][y]` - weight of an X exercise and Y set. X and Y start from 1.
- `reps[x][y]` or `r[x][y]` - number of reps for an X exercise and Y set.
- `completedReps[x][y]` or `cr[x][y]` - number of completed reps for an X exercise and Y set.
- `day` - current day number, starting from 1.

### Multiple days

Let's add another day, with the deadlift exercise. Go to the list of days, and press "+" button under the list
of days. There, press "+" button again to add exercise, and add "Deadlift".

Go back to the list of days, and press "Edit Script".
Now, we likely only want to only bump the bench press weight by 5lb on the day we actually do bench press, so only after the day 1. For that, we need to add additional condition to our Finish Day Script. Add the following:

```javascript
if (day == 1) {
  if (completedReps[1][1] >= reps[1][1]) {
    state.benchPressWeight = state.benchPressWeight + 5lb
  }
}
```

Now you can make sure in Playground that it only would bump up the bench press weight after the first day, but wouldn't do anything on the second day where we have deadlift.

There's also a special state variable that is created automatically, and undeletable, which is called `nextDay`. By default, when you finish your day, next time you'll get a workout for the next day. Using `nextDay` state variable you can change the logic. For example, let's say you won't get to deadlift until you're able to accomplish 5 reps of bench press. For that, add the following to Finish Day Script:

```javascript
if (day == 1) {
  if (completedReps[1][1] >= reps[1][1]) {
    state.benchPressWeight = state.benchPressWeight + 5lb
  } else {
    state.nextDay = day
  }
}
```

I.e. we set the `nextDay` to the current day all the time, which makes you locked with the bench press until you finally can't make 5 reps.

### Deloads

Let's change our program of Bench Press, so that if you fail to accomplish 5 reps of bench press for 3 times, the weight of bench press gets lowered by 15lb.

To accomplish that, we'll need another state variable to track number of failures. Let's create a state variable,
and name it "benchPressFailures", with "variable type": "number".

Then, change the script to:

```javascript
if (day == 1) {
  if (completedReps[1][1] >= reps[1][1]) {
    state.benchPressWeight = state.benchPressWeight + 5lb
    state.benchPressFailures = 0
  } else {
    state.benchPressFailures = state.benchPressFailures + 1
  }
  if (state.benchPressFailures > 2) {
    state.benchPressWeight = state.benchPressWeight - 15lb
    state.benchPressFailures = 0
  }
}
```

Here, if we successfully accomplish 5 reps, we set failures variable to 0. If not - then we'll increment it by 1.
And if that variable value is over 2, we'll reduce the bench press weight by 15, and reset the failures counter.
Try it out in Playground with various values of state variables and selected day to make sure it works as expected.

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
if (r[1][3] > 5) {
  state.someVar = 10;
}

if (r[1][4] > 10) {
  state.someVar = 15;
} else {
  state.someVar = 10;
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

- `weights[x][y]` or `w[x][y]` - weight of an X exercise and Y set. X and Y start from 1.
- `reps[x][y]` or `r[x][y]` - number of reps for an X exercise and Y set.
- `completedReps[x][y]` or `cr[x][y]` - number of completed reps for an X exercise and Y set.
- `day` - current day number, starting from 1.

### State variables

You can access the state variables you created via `state.` prefix. E.g. `state.myVar`.
There's also a special state variable `nextDay`, if you assign a value to it to override next workout day.

```javascript
state.nextDay = 4;
```

### Built-in functions

There're some built-in functions you can use in the expressions. There're:

#### `calculateTrainingMax`

Used for calculating the training max, which is 90% of 1 rep max. 1 rep max is calculated by the [Epley formula](https://en.wikipedia.org/wiki/One-repetition_maximum). Mostly useful for 5/3/1 variations.

```javascript
state.nextWeight = calculateTrainingMax(150lb, 5);
```

It would assign `155lb` to `state.nextWeight`. First argument is the weight you used for a lift, and the second argument is the number of reps you were able to do with that weight.
