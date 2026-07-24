---
date: "2024-02-27"
title: Make new Liftosaur programs less repetitive
og_title: Make new Liftosaur programs less repetitive | Liftosaur blog
og_description: Planned syntax improvements to make the weightlifting programs using new syntax less repetitive
og_image: /images/make-new-liftosaur-programs-less-repetetive-intro.jpg
tags: ["weightlifting", "tech"]
reddit: https://www.reddit.com/r/liftosaur/comments/1b14ajp/make_new_liftosaur_programs_less_repetetive/
twitter: https://twitter.com/liftosaur/status/1762354109124944040
---

<div><img src="../../images/make-new-liftosaur-programs-less-repetetive-intro.jpg" width="100%" alt="Bart Simpson writing weightlifting program" /></div>

I'm currently working on porting over the built-in programs to the new syntax, and I've noticed that it's quite repetitive. I expected that, and thought that with Find & Replace (since it's just one text file) it'd be easy to edit the exercises in bulk. But in reality it's not that easy. It's more or less okay when you only create a new program, but if you need to make changes in it, you sometimes need to change it in like 30 places, and it's very easy to make a mistake.

That's especially obvious with the long multi-week programs e.g. GZCL: Rippler or UHF. Like, I was writing those, and then noticed that I forgot to add last set as AMRAP. And I was already on the 7th week. Going back and adding that `+` sign to every single exercise across all days and weeks is really brutal.

One of the killer features of the old programs was "Reuse Logic". You can define the exercise once, and then you can make other exercises reuse the logic of the original one. That was very convenient.

I initially didn't want to add reusing syntax to the new programs, because it's very complex technically - because of the progressions. For example, you can mark some exercise as reusing another exercise's sets. But then, the original exercise progresses the reps, and the reused exercise - does not. So, we need to break reusing at this point, and change the program text.

After writing some programs though, I realized that it's very important to add reusing logic. Otherwise, it's PITA to create programs in the new syntax.

So, for that, I'm planning to add 3 new features.

## Reusing sets

We already have syntax for reusing progressions - like `progress: custom() { ...Bench Press }`. Let's also add similar syntax for reusing sets. It will look like this:

{% plannercode %}
Bench Press / 5x5 @8 60s 80% / progress: lp(5lb)
Squat / ...Bench Press
{% endplannercode %}

This will make the Squat reuse the sets of the Bench Press. So, if the Bench Press has 5x5 with 8 RPE and 60s rest timer, the Squat will also have that.

If the Bench Press updates the weight though, after finishing the workout the program will look like this:

{% plannercode %}
Bench Press / 5x5 @8 60s 105lb / progress: lp(5lb)
Squat / 5x5 @8 60s 80%
{% endplannercode %}

I.e. the app broke the reusing at this point, because Bench Press changed its weight, and they're not the same with Squat anymore.

By default, it'll try to reuse the exercise from the same week at any day. But if there're 2 same exercises at the same week, it'll show an error. You can make it more specific like this:

{% plannercode %}
Bench Press / 5x5 @8 60s 80% / progress: lp(5lb)
Squat / ...Bench Press[2:4]
{% endplannercode %}

This will make the Squat reuse the Bench Press from the 4th day of the 2nd week. I.e. it's `[week:day]`. You can omit `week`, and just specify `[day]`, it'll try to find the exercise at the same week then.

You can add overrides on top of the reused stuff, e.g. override weight, RPE or timer, like this:

{% plannercode %}
Bench Press / 5x5 @8 60s / 100lb / progress: lp(5lb)
Squat / ...Bench Press / 150lb
{% endplannercode %}

This will reuse everything in Squat except the weight - it'll be `150lb`.

## Reusing exercises across weeks

Usually, weightlifting programs have pretty much the same exercises across all weeks, just changing weights/reps/RPE/etc week over week. Or sometimes not changing anything at all. In that case, it'd be convenient to not write the same thing over and over across all weeks.

For that, you'll be able to specify the week ranges for exercises. It'll look like this:

{% plannercode %}
Bench Press[1, 2, 4-8] / 3x8 @8 90s 100lb / progress: lp(5lb)
{% endplannercode %}

In the square brackets after the exercise name you can specify what weeks or week ranges you want to apply this exercise to. In this case, it'll apply to weeks 1, 2, and from 4 to 8. It'll show up at the same days within the weeks, after explicitly specified exercises.

Combining with the **reusing sets** feature, you can only define the exercise once at the first week, and then just reuse it across all weeks:

{% plannercode %}
Bench Press / 5x5 @8 60s 80% / progress: lp(5lb)
Squat[1-8] / ...Bench Press
{% endplannercode %}

Bench Press defines different set schemes across like 8 weeks. But Squat is only added at the first week, like `Squat[1-8]`, and it'll reuse the Bench Press exercise across all 8 weeks.

That should give you a quick way of defining exercises across all weeks. E.g. you want to add another T3 to the GZCL: Rippler. You just type something like this at the first week:

{% plannercode %}
Bicep Curl[1-8] / ...t3: Lat Pulldown
{% endplannercode %}

and that's it! It'll show up across all weeks.

## Template exercises

One popular approach people had in the old programs is to create "template" exercises. They exist in a program, and not added to any day/week, but other exercises reuse the logic of those "template" exercises.

I think it's even more important to allow such "template" exercises in the new syntax. Sometimes, we may want to have an exercise we'll take the sets and progression from, but we don't want to add it to any day/week so that it wouldn't ever change. It'd be just a "template" for other exercises.

For that, there's going to be a new syntax `used: none`:

{% plannercode %}
Bench Press / 5x5 @8 60s 80% / used: none / progress: lp(5lb)
{% endplannercode %}

This way `Bench Press` will be a "template" exercise, and it won't show up at any day/week. But other exercises can reuse its sets and progression: 

{% plannercode %}
# Week 1
## Day 1
Bench Press / 5x5 @8 60s 80% / used: none / progress: custom() {~
  // logic here
~}

Squat[1-8] / ...Bench Press / progress: custom() { ...Bench Press }
{% endplannercode %}

## Conclusion

Those 3 features IMHO should simplify the process of creating new programs A LOT. Let me know what you think - in the comments to the Reddit post!
