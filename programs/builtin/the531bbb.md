---
id: the531bbb
name: "5/3/1: Boring But Big"
author: Jim Wendler
url: "https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big"
shortDescription: Very simple hypertrophy program based on the 5/3/1 principle.
isMultiweek: true
tags: []
---

5/3/1 hypertrophy program based on the 4 big lifts (Squat/Bench Press/Overhead Press/Deadlift), and doing a lot of volume with those.

```liftoscript
# Week 1
## Day 1
main / used: none / 1x5 58%, 1x5 67%, 1x5+ 76%, 5x10 50% / progress: custom(increment: 10lb) {~
  if (week % 3 == 0) {
    rm1 += state.increment
  }
~}

Overhead Press[1-4] / ...main
Lat Pulldown[1-4] / 5x10 / 73%

## Day 2
Deadlift[1-4] / ...main / progress: custom(increment: 5lb) { ...main }
Ab Wheel[1-4] / 5x10 / 0lb

## Day 3
Bench Press[1-4] / ...main / progress: custom(increment: 5lb) { ...main }
Chin Up[1-4] / 5x10 / 0lb

## Day 4
Squat[1-4] / ...main
Hanging Leg Raise[1-4] / 5x10 / 0lb


# Week 2
## Day 1
main / 1x3 63%, 1x3 72%, 1x3+ 81%, 5x10 50%

## Day 2


## Day 3


## Day 4



# Week 3
## Day 1
main / 1x5 67%, 1x3 76%, 1x1+ 85%, 5x10 50%

## Day 2


## Day 3


## Day 4



# Week 4 - Deload
## Day 1
main / 1x5 36%, 1x5 45%, 1x5 54%, 5x10 40%

## Day 2


## Day 3


## Day 4
```
