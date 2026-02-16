---
id: nsuns
name: nSuns LP
author: /u/nsuns
url: "https://www.liftosaur.com/programs/nsuns"
shortDescription: Strength program that builds on top of 5/3/1, and adds more sophisticated sets scheme
isMultiweek: true
tags: []
---

A very popular program on Reddit, uses a similar to 5/3/1 approach for first sets, and then waving scheme for the last sets for the main lifts (squat, bench, deadlift).

```liftoscript
# Week 1
## Day 1
main_progress / used: none / progress: custom() {~
  if (dayInWeek > 1 && completedReps >= reps) {
    if (completedReps[3] > 5) { rm1 += 15lb } else
    if (completedReps[3] >= 4) { rm1 += 10lb } else
    if (completedReps[3] >= 2) { rm1 += 5lb }
  }
~}

Bench Press / 1x8 58%, 1x6 67%, 3x4 76%, 1x5 72%, 1x6 67%, 1x7 63%, 1x8+ 58% / progress: custom() { ...main_progress }
Overhead Press / 1x6 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(2.5lb)
Bicep Curl / 4x8-12 / progress: lp(5lb)

## Day 2
Squat / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58% / progress: custom() { ...main_progress }
Sumo Deadlift / 1x5 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(5lb)
Hanging Leg Raise / 3x8-12

## Day 3
Bench Press / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58%
Bench Press Close Grip / 1x6 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(2.5lb)
Hammer Curl / 4x8-12 / progress: lp(5lb)

## Day 4
Deadlift / 1x5 67%, 1x5 76%, 1x1+ 85%, 1x3 81%, 1x3 76%, 1x3 72%, 1x5 67%, 1x5 63%, 1x5+ 58% / progress: custom() { ...main_progress }
Front Squat / 1x5 45%, 1x5 54%, 1x3 63%, 1x5 63%, 1x7 63%, 1x4 63%, 1x6 63%, 1x8 63% / progress: lp(5lb)
Ab Wheel / 3x8-12
```
