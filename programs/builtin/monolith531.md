---
id: monolith531
name: "5/3/1: Building the Monolith"
author: Jim Wendler
url: "https://www.jimwendler.com/blogs/jimwendler-com/101078918-building-the-monolith-5-3-1-for-size"
shortDescription: Challenging and intense 5/3/1 variation
isMultiweek: true
tags: []
---

5/3/1 that requires some serious time and effort investment, but will produce very impressive results.
6 week program with brutal 2-hour sessions, 20 rep Friday squats - if you're up for a challenge, and can eat and rest to sustain it - check it out! 

```liftoscript
# Week 1
## Day 1
main_progress / used: none / progress: custom(increase: 10lb) {~
  if (dayInWeek > 1 && week % 3 == 0) {
    weights += state.increase
  }
~} 

Squat / 1x5 60%, 1x5 68%, 5x5 76% / progress: custom(increase: 10lb) { ...main_progress }
Overhead Press / 1x5 60%, 1x5 68%, 1x5 76%, 1x5+ 60% / progress: custom(increase: 5lb) { ...main_progress }
Chin Up[1-6] / 5x20 0lb / warmup: none
Face Pull, Cable[1-6] / 5x20 50% / warmup: none
Chest Dip[1-6] / 5x30 0lb / warmup: none

## Day 2
Deadlift / 1x5 60%, 1x5 68%, 3x5 76% / progress: custom(increase: 10lb) { ...main_progress }
Bench Press / 1x5 60%, 1x5 68%, 5x5 76% / progress: custom(increase: 5lb) { ...main_progress }
Bent Over One Arm Row[1-6] / 5x10-20 50% / warmup: none
Bicep Curl[1-6] / 5x20 50% / warmup: none

## Day 3
Squat / 1x5 60%, 1x5 68%, 1x5 76%, 1x20 40%
Overhead Press / 10x5 60%
Chin Up[1-6] / 5x5 25lb / warmup: none
Face Pull, Cable[1-6] / 5x20 50% / warmup: none
Shrug[1-6] / 5x20 50% / warmup: none


# Week 2
## Day 1
Squat / 1x5 55%, 1x5 64%, 5x5 72%
Overhead Press / 1x5 55%, 1x5 64%, 1x5 72%, 1x5+ 55%

## Day 2
Deadlift / 1x5 55%, 1x5 64%, 3x5 72%
Bench Press / 1x5 55%, 1x5 64%, 5x5 72%

## Day 3
Squat / 1x5 55%, 1x5 64%, 1x5 72%, 1x20 45%
Overhead Press / 10x5 42%


# Week 3
## Day 1
Squat / 1x5 64%, 1x5 72%, 5x5 80%
Overhead Press / 1x5 64%, 1x5 72%, 1x5 80%, 1x5+ 64%

## Day 2
Deadlift / 1x5 64%, 1x5 72%, 3x5 80%
Bench Press / 1x5 64%, 1x5 72%, 5x5 80%

## Day 3
Squat / 1x5 64%, 1x5 72%, 1x5 80%, 1x20 45%
Overhead Press / 10x5 64%


# Week 4
## Day 1
Squat / 1x5 60%, 1x5 68%, 5x5 76%
Overhead Press / 1x5 60%, 1x5 68%, 1x5 76%, 1x5+ 60%

## Day 2
Deadlift / 1x5 60%, 1x5 68%, 3x5 76%
Bench Press / 1x5 60%, 1x5 68%, 5x5 76%

## Day 3
Squat / 1x5 60%, 1x5 68%, 1x5 76%, 1x20 42.5%
Overhead Press / 12x5 51%


# Week 5
## Day 1
Squat / 1x5 55%, 1x5 64%, 5x5 72%
Overhead Press / 1x5 55%, 1x5 64%, 1x5 72%, 1x5+ 55%

## Day 2
Deadlift / 1x5 55%, 1x5 64%, 3x5 72%
Bench Press / 1x5 55%, 1x5 64%, 5x5 72%

## Day 3
Squat / 1x5 55%, 1x5 64%, 1x5 72%, 1x20 55%
Overhead Press / 15x5 55%


# Week 6
## Day 1
Squat / 1x5 64%, 1x5 72%, 5x5 80%
Overhead Press / 1x5 64%, 1x5 72%, 1x5 80%, 1x5+ 64%

## Day 2
Deadlift / 1x5 64%, 1x5 72%, 3x5 80%
Bench Press / 1x5 64%, 1x5 72%, 5x5 80%

## Day 3
Squat / 1x5 64%, 1x5 72%, 1x5 80%, 1x20 60%
Overhead Press / 12x5 64%
```
