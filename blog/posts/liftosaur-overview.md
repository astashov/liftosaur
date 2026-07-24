---
date: "2025-09-01"
title: Overview of Liftosaur - scriptable weightlifting planner and tracker app
og_title: Overview of Liftosaur - scriptable weightlifting planner and tracker app | Liftosaur blog
og_description: Highlevel overview of various featuers of Liftosaur - what the onboarding looks like, picking a program, tracking workouts, using the web editor.
og_image: /images/youtube/20250901-liftosaur-overview.png
tags: ["weightlifting", "app"]
---

<a href="https://youtu.be/hr53rHRKsU4" target="_blank">
<div><img src="../../images/youtube/20250901-liftosaur-overview.png" width="100%" alt="Youtube video preview" /></div>
<div class="subscription">Check out the video version of this post on Youtube!</div>
</a>

In this post I want to go over the main features of Liftosaur - a scriptable workout planner and tracker app.
This is probably the most powerful lifting app on the market, incredibly flexible and customizable. You can
implement any program you want, and change every bit of it. You can specify any progressive overload logic you want, even script it if it's somewhat unique.

The app is pretty unique, so hopefully this post may help you decide whether you want to use it as your lifting app.

## Onboarding

<div class="image-with-text">
  <img src="../../images/liftosaur-overview/first.png" alt="Initial screen" />
  <div>
    When we first start the app, we're greeted by the welcome screen, and brief
    overview of featuers in stories-like UI.
  </div>
</div>


<div class="image-with-text image-with-text-reverse">
  <div>
    We proceed, and pick the unit here.
    I personally hate long onboarding flows, and I tried to be really considerate,
    and only ask the things that are important to starting using the app.
    E.g. unit here is important because the app will need to convert the weights
    in built-in programs into that unit when you pick them.
  </div>
  <img src="../../images/liftosaur-overview/unit.png" alt="Unit pick screen" />
</div>

<div class="image-with-text">
  <img src="../../images/liftosaur-overview/equipment.png" alt="Equipment screen" />
  <div>
    Next we can configure the equipment we have, and hide the ones we don't have. Equipment is used for rounding weights, and for the plates calculator. For each equipment we can specify the bar and the plates we have, which would be used for rounding the weights. Totally optional and we can do it later, so we can skip for now.
  </div>
</div>

<div class="image-with-text image-with-text-reverse">
  <div>
    Now we can choose a built-in program, create our own, or just go without a program. Liftosaur really works best if you have the program you follow, but there're also ways to gradually build it over time as well. There're filters at the top to help you find the program that fits your goals, your schedule, how much time you can spend in a gym, etc. Let's choose e.g. GZCLP to start with.
  </div>
  <img src="../../images/liftosaur-overview/programs.png" alt="Programs screen" />
</div>

<div class="image-with-text">
  <img src="../../images/liftosaur-overview/rm1.png" alt="1 Rep Max screen" />
  <div>
    GZCLP uses 1RM to calculate starting weights, so we can specify them now (or later, we can skip it as well).
    I can enter my 1RM here, and also use 1RM calculator if I don't know my 1RMs, but know e.g. 5RMs.
  </div>
</div>

## Workouts

<div class="image-with-text">
  <img src="../../images/liftosaur-overview/history.png" alt="History screen" />
  <div>
    Okay, now we can do workouts. We can just go ahead and use the default GZCLP, and later I can show how we could also change every bit of it.
  </div>
</div>

<div class="image-with-text image-with-text-reverse">
  <div>
    <p>
      GZCLP uses 1RM to calculate starting weights, so we can specify them now (or later, we can skip it as well).
      I can enter my 1RM here, and also use 1RM calculator if I don't know my 1RMs, but know e.g. 5RMs.
    </p>
    <p>
      On the workout screen, all the weights and reps already prefilled, so for most programs you just tap the check icon when you finish what's prescribed.
    </p>
    <p>
      The weights are rounded to your equipment, so make sure you've got the right bar weight and plates set up, and it'll set the right weights you can do with your equipment.
    </p>
    <p>
      When you finish a set, the rest timer shows up. You can specify the rest time either globally, or per program exercise.
    </p>
    <p>
      Let's say we did successfully all the sets, and we can see it will increase the weight next time. We can switch over to the next exercise.
    </p>
  </div>
  <img src="../../images/liftosaur-overview/t1.png" alt="T1" />
</div>

<div class="image-with-text">
  <img src="../../images/liftosaur-overview/t2.png" alt="T2" />
  <div>
    <p>
      For the T2 exercise, we can pretend we failed the last set. And we can see the app will switch to a different set scheme (stage 2) next time - instead of 3x10, we'll do 3x8 next time.
    </p>
  </div>
</div>

<div class="image-with-text image-with-text-reverse">
  <div>
    <p>
      Now we're done with the workout, and we can optionally share it in social media or privately, sync to Apple Health, and continue.
    </p>
  </div>
  <img src="../../images/liftosaur-overview/finish.png" alt="Finish Day screen" />
</div>

## Programs

We can see that workout in the history now. In the app, there're 2 main entities - workouts and programs. The only thing that the program does - it defines what the next workout will look like, nothing else.
So, you can switch programs at any time, run multiple at the same time, go without program - the only thing that it'll change - what the next workout will look like.

When you finish a workout, it changes the current program. The program under the hood is just plain text, so when you finish a workout - it rewrites that text, with the new weights, reps, sets, etc. That's how it does the progression - it changes the program when workout is finished. All the scripts defined in the program are evaluated, and new program text is generated.

<div class="image-with-text">
  <img src="../../images/liftosaur-overview/programtext.png" alt="Program Text Screen" />
  <div>
    <p>
      If we go to Program screen, we could actually see and edit the program text. Go to Edit, then tap this coding icon. The program is written using special markup/scripting language called <a href="https://www.liftosaur.com/docs">Liftoscript</a>. You can define the weeks, days, exercises, and write the progression logic right there. The syntax is simple, and you don't have to define scripts, you can just use built-in progressions, like linear or double progression.
    </p>
    <p>
      Programs being just text is a very powerful concept. You can easily share them, you can store them even in your Notes, you can edit them in any text editor. Liftosaur provides IDE for that, so it'd have autocomplete, error checking, etc - both in the app or on the web, in a browser. Editing a lot of text on a phone could be quite inconvenient, so it's usually easier to do that from a laptop.
    </p>
  </div>
</div>

<div class="image-with-text image-with-text-reverse">
  <div>
    <p>
      You don't have to use the text editing though (although it's IMHO the most convenient for large-scope changes). Everything you can do through the text - you can also do through UI, and it's sometimes more convenient if you just need to do small tweaks in your program, like adjust the weight or reps of some exercise, tweak the increments of progression, etc.
    </p>
    <p>
      Like, this is how I could change the weight, or adjust the increment for progression - go to T1, and do that there. I could do that per set, or just across all of the sets. This is especially useful if you do multi-week programs, so you could tweak weights used across multiple weeks/days.
    </p>
  </div>
  <img src="../../images/liftosaur-overview/editexercise.png" alt="Edit Exercise Screen" />
</div>

Now, this is a vanilla GZCLP with just one T3 exercise added - it's a lat pulldown or bent over row. I want to tweak the program, and maybe add a few more T3 exercises. I personally like to do that on my laptop, just because there's larger screen and a keyboard to type faster. Let's check out the web editor for that.

## Web Editor

If you open [liftosaur.com](https://www.liftosaur.com), you can log in there, go to Your Programs, and edit our GZCLP program.

<div class="highlight-block">
  <img src="../../images/liftosaur-overview/website.png" width="600" alt="Website screenshot" />
</div>

<div class="highlight-block">
  <img src="../../images/liftosaur-overview/webeditor.png" width="600" alt="Web Editor screenshot" />
</div>

Here, on the right you can see Week Stats. This is rather important info that helps you to ensure you've got enough volume for the muscle groups you care about. Let's walk it over.

At the top I could see the total sets and split between strength and hypertrophy. It's simply - if it's >= 8 reps - it's hypertrophy. Otherwise - strength. Then, split between core, upper, lower, push and pull sets.

The most important part is below though. It's a weekly number of sets per muscle group. Research shows that you need to hit muscles 10-20 sets per week, 2-3 days per week to get good growth. More for advanced lifters, less for beginners.
Here you can see that number per muscle group. If we hover over with the mouse, we'll see what exercises that comes from. Black means that exercise directly targets that muscle, gray - it's a synergist muscle. We use multiplier for synergist muscles, 0.5 by default.

Colors and arrows show whether we're outside of the range - red means significantly outside, yellow - a bit outside, green - within the range. Arrow shows whether we need to increase or decrease the number of sets to get to the range. The range is defined in Settings, and you can change the range there, and also change the synergist multiplier.

So, we can see we're kinda weak on biceps, triceps and forearms, so let's add some exercises to hit those muscles more.  We can tap on the muscle group there to filter by it, so for triceps we can add Skullcrushers, for biceps - bicep curls, can also add hammer curl for forearms too, and e.g. Triceps Extension.

Now we can save it, and enjoy our updated GZCLP program. If we open the app now, it will sync the updated program, and we can do workouts with it.

That's the main functionality of the app. There's more stuff - there're graphs, RPE support, body measurements, etc, etc, and the [Liftoscript language](https://www.liftosaur.com/docs) allows you to do a lot of things.

So, check it out, and hopefully this gives you a good overview of the app!

