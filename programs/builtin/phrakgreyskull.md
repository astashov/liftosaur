---
id: phrakgreyskull
name: "Phrak's Greyskull LP"
author: John Sheaffer
url: "https://www.liftosaur.com/programs/phrakgreyskull"
shortDescription: Simple 3x5 program with Linear Progression for beginners
isMultiweek: true
tags: []
---

Good balanced strength program for beginners - simple linear progression, focusing mostly on main lifts (squat/bench/ohp/deadlift).

```liftoscript
# Week 1
## Day 1
main / used: none / 2x5, 1x5+ / 80% / progress: custom(increase: 2.5lb) {~
  if (completedReps[ns] >= reps[ns]) {
    if (completedReps[ns] >= 10) {
      weights += state.increase * 2
    } else {
      weights += state.increase
    }
  } else if (completedReps[ns] < reps[ns]) {
    weights = completedWeights[ns] * 0.9 
  }
~} 

Overhead Press / ...main
Chin Up / ...main
Squat / ...main / progress: custom(increase: 5lb) { ...main }

## Day 2
Bench Press / ...main
Bent Over Row / ...main
Deadlift / 1x5+ / 80% / ...main / progress: custom(increase: 5lb) { ...main }
```
