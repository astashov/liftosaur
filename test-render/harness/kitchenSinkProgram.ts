import { PlannerProgram_evaluateText } from "../../src/pages/planner/models/plannerProgram";
import { IProgram } from "../../src/types";

const TEXT = `// Four weeks of **undulating** volume.
// * Week 4 is a deload
# Week 1
// Heavy day. Warm up well.
## Day 1
/// Templates, never shown in a workout
t1 / used: none / 1x5+ (AMRAP), 3x3 (Main) / 80% / 180s / progress: lp(5lb, 2, 0, 10%, 2, 0)
t2 / used: none / 3x8-12 @8 / 90s / progress: dp(5lb, 8, 12)
t3[1-4] / used: none / 3x10+ / 60% / 60s / warmup: none / progress: sum(30, 5lb)

// Pause **2 seconds** at the bottom.

// ! Keep the bar over mid-foot.
main: Squat[1,1-4] / ...t1 / warmup: 1x5 45lb, 1x5 135lb, 1x3 80% / id: tags(1, 100) / progress: custom(attempt: 0, increment: 5lb, rating: 0) {~
  if (descriptionIndex == 1) {
    descriptionIndex = 2
  }
  if (completedReps >= reps) {
    state.attempt += 1
    if (state.attempt > 2) {
      weights += state.increment
      state.attempt = 0
    }
  } else {
    weights = weights * 0.9
  }
~}
// ...main: Squat
Romanian Deadlift[2,1-4] / ...t2 / id: tags(1, 101)
Bicep Curl, Dumbbell[3,1-4] / ...t3 / superset: A
Triceps Pushdown[4,1-4] / 3x12-15 / 30lb / 60s / superset: A / warmup: none / progress: dp(2.5lb, 12, 15)
Plank[5,1-4] / 2x1 30s|60s, 1x1 30s+|60s / warmup: none / progress: custom() {~
  if (completedSetTime[ns] > setTime[ns]) {
    setTime += 5
  }
~}

## Day 2
// Upper body.
Bench Press[1,1-4] / 5x3 / 6x2 / 10x1 / 75% / warmup: 1x5 50%, 1x3 75% / id: tags(2) / progress: custom(failures: 0) {~
  if (completedReps >= reps) {
    weights = weights[ns] + 5lb
  } else {
    setVariationIndex += 1
    state.failures += 1
  }
~}
Pull Up[2,1-4] / 3x8 0lb / update: custom() {~
  if (setIndex == 0) {
    weights = bodyweight
  }
~} / progress: lp(0lb)
Overhead Press[3,1-4] / 4x5, 1x5+ @8+ / 90s \\
  / update: custom() {~
    if (setIndex == 1 && completedReps[1] >= reps[1]) {
      numberOfSets = 6
      sets(5, 6, floor(reps[1] / 2), floor(reps[1] / 2), 0, weights[1], 60, 0, 0)
    }
  ~} \\
  / progress: custom(bump+: 0) {~
    var.total = sum(completedReps)
    for (var.i in completedReps) {
      if (completedReps[var.i] < reps[var.i]) {
        var.total = var.total - 1
      }
    }
    if (state.bump > 0 || var.total > 25) {
      weights += 2.5lb
    }
    print(var.total, weights[1])
  ~}
Lateral Raise, Dumbbell[4,1-4] / 3x15 @8 ?+ / 60s / progress: custom(rating: 0) {~
  state[1].rating = state[1].rating + 1
  state[101].rating = 10
~}

## Day 3
// Pulls and conditioning.
Deadlift[1,1-4] / ...t1 / 1x3+ 85%, 3x3 80% / progress: lp(10lb, 1, 0, 5%, 3, 0)
Front Squat[2,1-4] / ...Bench Press[1:2] / 70% / progress: none
Squat, Bodyweight | Pistol Squat | Bulgarian Split Squat, Dumbbell[3,1-4] / 3x8 / progress: custom() {~
  if (completedReps >= reps) {
    exerciseVariationIndex += 1
  }
~}
Power Clean[4,1-4] / 5x3 135lb+ 60s|0s auto / warmup: none
Hanging Leg Raise[5,1-4] / ...t3

# Week 2
## Day 1
t1 / 1x6+, 3x4 / 80%
t2 / 3x10-14 @8
## Day 2
## Day 3

# Week 3
## Day 1
t1 / 1x4+, 3x2 / 85%
t2 / 3x6-10 @9
## Day 2
## Day 3

// Deload.
# Week 4
## Day 1
t1 / 3x3 / 60% / progress: none
t2 / 2x8 @6 / progress: none
## Day 2
## Day 3
`;

export function KitchenSinkProgram_build(): IProgram {
  const weeks = PlannerProgram_evaluateText(TEXT).map((week, wi) => ({
    ...week,
    id: `ks-week-${wi + 1}`,
    days: week.days.map((day, di) => ({ ...day, id: `ks-day-${wi + 1}-${di + 1}` })),
  }));
  return {
    vtype: "program",
    id: "kitchenSink",
    name: "Kitchen Sink",
    url: "",
    author: "",
    shortDescription: "",
    description: "",
    nextDay: 1,
    weeks: [],
    isMultiweek: true,
    days: [],
    exercises: [],
    tags: [],
    deletedDays: [],
    deletedWeeks: [],
    deletedExercises: [],
    clonedAt: 1708563096401,
    planner: { vtype: "planner", name: "Kitchen Sink", weeks },
  };
}
