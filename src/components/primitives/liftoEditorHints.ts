import { ILiftoEditorContext } from "./liftoEditorBrain";

export interface ILiftoEditorHint {
  short: string;
  detail: string;
}

export const LiftoEditorHints_helpId = "lifto-editor-hints";

// Both structured-mode surfaces (the sheet and the inline dock) teach the same two gestures,
// and they sit next to each other often enough that differing wording would read as a bug.
export const LiftoEditorHints_gestures = "Swipe to switch elements · double-tap to type";

const editorPropertyHints: Partial<Record<string, ILiftoEditorHint>> = {
  progress: {
    short: "Progress: how the exercise changes after workouts.",
    detail:
      "Runs after you finish a workout and adjusts the future ones. Defined via a function — tap it to learn what it does. 'progress: none' disables it, e.g. for a deload week.",
  },
  update: {
    short: "Update: a script that runs when the workout starts and after each set.",
    detail:
      "'setIndex' is the set you just completed — 0 means it's running before the workout starts. Use it to adjust the remaining sets right away, e.g. '{~ if (setIndex == 1) { weights += 2.5kg } ~}'.",
  },
  warmup: {
    short: "Warmups: warmup sets — not counted for progress, update or volume.",
    detail:
      "E.g. 'warmup: 2x5 45%, 1x3 135lb' — percentages here are of the first work set's weight, not your 1RM. 'warmup: none' removes warmups.",
  },
  used: {
    short: "'used: none' removes this exercise from workouts — others can still reuse it.",
    detail:
      "With an unknown exercise name it acts as a template (e.g. '...T1'). Templates never progress, so reusing them never breaks — while a reuser that progresses gets its changed values extracted into overrides on its own line.",
  },
  id: {
    short: "Id: tags this exercise so other exercises' scripts can reach its state.",
    detail:
      "'id: tags(1, 100)' — progress/update scripts of other exercises can change state variables of everything sharing a tag: 'state[1].rating = 5'.",
  },
};

const editorProgressFunctionHints: Partial<Record<string, ILiftoEditorHint>> = {
  lp: {
    short: "lp: linear progression — add weight after successful workouts.",
    detail:
      "'lp(5lb)' adds 5lb after every successful workout. 'lp(5lb, 2, 0)' waits for 2 successes; 'lp(5lb, 1, 0, 10lb, 2, 0)' also drops 10lb after 2 failed ones.",
  },
  dp: {
    short: "dp: double progression — reps climb first, then the weight.",
    detail:
      "'dp(5lb, 8, 12)' — on success reps go up from 8 towards 12; at 12 the weight adds 5lb and reps reset to 8.",
  },
  sum: {
    short: "sum: progress when total reps across all sets reach a target.",
    detail: "'sum(30, 5lb)' — if completed reps across all sets add up to 30 or more, add 5lb.",
  },
  custom: {
    short: "custom: your own progression script, run after finishing the workout.",
    detail:
      "'custom() {~ if (completedReps >= reps) { weights += 5lb } ~}'. Reuse another exercise's script with 'custom() { ...Squat }'.",
  },
  none: {
    short: "none: suppresses the progression defined for this exercise.",
    detail:
      "Nothing changes after workouts, even when a reused exercise or a repeated declaration defines a progression. Mostly used on deload weeks so the weights stay put.",
  },
};

const editorNodeHints: Partial<Record<string, ILiftoEditorHint>> = {
  SetPart: {
    short: "Sets × reps: '3x8' — 3 sets of 8 reps.",
    detail: "'3x8-12' — rep range, '1x5+' — AMRAP (do as many reps as you can, the app asks how many you did).",
  },
  Weight: {
    short: "Weight: an explicit weight for these sets.",
    detail: "E.g. '100kg' or '85lb'. Add '+' ('100lb+') and the app asks what weight you actually used.",
  },
  WeightWithPlus: {
    short: "Weight: an explicit weight for these sets.",
    detail: "E.g. '100kg' or '85lb'. Add '+' ('100lb+') and the app asks what weight you actually used.",
  },
  Percentage: {
    short: "Percentage: weight as a % of your 1RM for this exercise.",
    detail: "'80%' resolves against the 1RM from your settings. '80%+' also asks what weight you actually used.",
  },
  PercentageWithPlus: {
    short: "Percentage: weight as a % of your 1RM for this exercise.",
    detail: "'80%' resolves against the 1RM from your settings. '80%+' also asks what weight you actually used.",
  },
  Rpe: {
    short: "RPE: target effort for these sets, from 1 to 10.",
    detail:
      "'@8' — target RPE 8. With no explicit weight, the app derives it from your 1RM, reps and RPE. '@8+' also logs the actual RPE after the set.",
  },
  Timer: {
    short: "Rest timer: how long to rest after each of these sets.",
    detail: "'90s' starts a 90-second rest timer when you complete a set of this group.",
  },
  SetTimer: {
    short: "Set timer: how long the set itself lasts, then the rest.",
    detail:
      "'60s|30s' — 60s active set (plank, carries…), then 30s rest. '30s+|60s' counts up past 30s until you stop it. Add 'auto' to advance sets automatically (EMOM/circuits).",
  },
  SetLabel: {
    short: "Set label: a name shown next to these sets in the workout.",
    detail: "'4x5 (Main), 1x5+ (AMRAP)' — in parentheses after sets×reps, 8 characters max.",
  },
  ReuseSection: {
    short: "Reuse: copies sets, weight, RPE, timer, warmups and progress from another exercise.",
    detail:
      "'...Bench Press' finds it in the current week. '...Bench Press[2]' — day 2 of this week, '...Bench Press[2:1]' — week 2, day 1. Sections after it override the reused parts.",
  },
  WeekDay: {
    short: "Week/Day: where to reuse the exercise from.",
    detail: "'[2]' — day 2 of the current week, '[2:1]' — week 2, day 1. '_' means the current week: '[_:1]'.",
  },
  Repeat: {
    short: "Repeat: this exercise repeats across the listed weeks.",
    detail:
      "'Squat[1-3]' — appears in weeks 1–3 on this day without copy-pasting it. Editing the declaration applies to all the repeated weeks.",
  },
  Superset: {
    short: "Superset: exercises sharing a group name alternate together.",
    detail:
      "'superset: A' — completing a set jumps to the next exercise marked with group 'A'. Groups match within the same day only.",
  },
  KeyValue: {
    short: "State variable: a value the script remembers between workouts.",
    detail:
      "Defined as 'name: initialValue' inside custom(). Scripts read and change it via 'state.name', and the app stores it per exercise.",
  },
  ExerciseName: {
    short: "Label: distinguishes two copies of the same exercise.",
    detail:
      "'aux: Bench Press' and 'Bench Press' count as separate exercises with their own progress, so the same movement can appear twice in a program.",
  },
  LineComment: {
    short: "Description: notes shown under the exercise during the workout.",
    detail:
      "Written as '//' lines above the exercise, in Markdown. Leave a blank line between them for several descriptions — '!' marks the current one (the first when unmarked), and progress scripts switch it via 'descriptionIndex'.",
  },
  ExerciseVariation: {
    short: "Exercise variation: alternative movements, the app uses the current one.",
    detail:
      "'Squat | Pistol Squat' — '!' marks the current variation (the first one when unmarked). Sets and progress are shared; progress scripts switch it via 'exerciseVariationIndex'.",
  },
};

const editorFallbackHints = {
  exercise: {
    short: "Exercise: one movement — its warmups, set groups and progression.",
    detail:
      "Sections are separated by '/'. E.g. 'Squat / 3x5 / 100kg / progress: lp(5kg)' — name, sets×reps, weight, progression.",
  },
  property: {
    short: "Property: progression, warmups or update logic for this exercise.",
    detail:
      "E.g. 'progress: lp(5kg)' adds 5kg after a successful day, 'warmup: 2x5 45%' defines warmup sets, 'update: custom() {~ ... ~}' runs a script after each set.",
  },
  globals: {
    short: "Globals: defaults applied to every set group of this exercise.",
    detail:
      "E.g. 'Squat / 3x5, 5x3 / 100kg 90s' — the weight and timer apply to both set groups unless a group sets its own.",
  },
  warmupPercentage: {
    short: "Warmup percentage: % of the first work set's weight, not your 1RM.",
    detail: "'warmup: 1x5 45%, 1x3 80%' — 45% and 80% of the weight of the first work set.",
  },
  setGroup: {
    short: "Set group: sets × reps, then weight. % here resolve against your 1RM.",
    detail: "E.g. '3x8-10 @8 60s 80%' — 3 sets of 8-10 reps at RPE 8, 60s rest timer, at 80% of your 1RM.",
  },
  setVariation: {
    short: "Set variation: one of several sets×reps schemes, the app uses the current one.",
    detail:
      "'3x8 / ! 5x5' — '!' marks the current variation (the first one when unmarked). Progress scripts switch it via 'setVariationIndex', e.g. on failure in GZCLP.",
  },
  valueWeight: {
    short: "Weight value.",
    detail: "Could be lb or kg, likely would be converted to your default or equipment unit in the workout.",
  },
};

export function LiftoEditorHints_forContext(
  context: ILiftoEditorContext | undefined,
  activeLevelIndex: number,
  text: string
): ILiftoEditorHint | undefined {
  const levels = context?.levels ?? [];
  const level = levels[activeLevelIndex];
  if (level == null) {
    return undefined;
  }
  if (level.nodeName === "ExerciseExpression") {
    return editorFallbackHints.exercise;
  }
  const property = levels.find((l) => l.nodeName === "ExerciseProperty")?.label.toLowerCase();
  if (level.nodeName === "FunctionExpression" && property === "progress") {
    const functionHint = editorProgressFunctionHints[level.label.replace("()", "")];
    if (functionHint != null) {
      return functionHint;
    }
  }
  // `progress: none` has no FunctionExpression level, so the none hint keys off the
  // property's own text.
  if (
    level.nodeName === "ExerciseProperty" &&
    property === "progress" &&
    /:\s*none\b/.test(text.slice(level.start, level.end))
  ) {
    return editorProgressFunctionHints.none;
  }
  if (level.nodeName === "ExerciseProperty" || level.nodeName === "FunctionExpression") {
    return (property != null ? editorPropertyHints[property] : undefined) ?? editorFallbackHints.property;
  }
  const inWarmup = levels.some((l) => l.nodeName === "WarmupExerciseSets");
  if (inWarmup) {
    if (level.nodeName === "Percentage" || level.nodeName === "PercentageWithPlus") {
      return editorFallbackHints.warmupPercentage;
    }
    return editorPropertyHints.warmup;
  }
  if (level.nodeName === "ExerciseSet" && level.label === "Globals") {
    return editorFallbackHints.globals;
  }
  // The Sets level is numbered ("Sets 2") only when the exercise has multiple set variations.
  if (level.nodeName === "ExerciseSets" && level.label !== "Sets") {
    return editorFallbackHints.setVariation;
  }
  // Only set-group weights support the '+' suffix (the grammar's WeightWithPlus); weights
  // inside function args, state vars or scripts are plain values and get their own hint.
  const isValueContext = levels.some(
    (l) => l.nodeName === "FunctionExpression" || l.nodeName === "KeyValue" || l.nodeName === "Liftoscript"
  );
  if (level.nodeName === "Weight" && isValueContext) {
    return editorFallbackHints.valueWeight;
  }
  return editorNodeHints[level.nodeName] ?? editorFallbackHints.setGroup;
}
