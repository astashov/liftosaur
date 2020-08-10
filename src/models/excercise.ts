import { IWeight, Weight, IBars, TBarKey, IBarKey } from "./weight";
import { ISet } from "./set";
import * as t from "io-ts";
import { IArrayElement } from "../utils/types";
import { ISettings, Settings } from "./settings";
import { ObjectUtils } from "../utils/object";

export const excerciseTypes = [
  "abWheel",
  "arnoldPress",
  "backExtension",
  "ballSlams",
  "battleRopes",
  "benchDip",
  "benchPress",
  "benchPressCloseGrip",
  "benchPressWideGrip",
  "bentOverOneArmRow",
  "bentOverRow",
  "bicepCurl",
  "bicycleCrunch",
  "boxJump",
  "boxSquat",
  "bulgarianSplitSquat",
  "burpee",
  "cableCrossover",
  "cableCrunch",
  "cableKickback",
  "cablePullThrough",
  "cableTwist",
  "calfPressOnLegPress",
  "calfPressOnSeatedLegPress",
  "chestDip",
  "chestFly",
  "chestPress",
  "chinUp",
  "clean",
  "cleanandJerk",
  "concentrationCurl",
  "crossBodyCrunch",
  "crunch",
  "cycling",
  "deadlift",
  "deadliftHighPull",
  "declineBenchPress",
  "declineCrunch",
  "deficitDeadlift",
  "ellipticalMachine",
  "facePull",
  "flatKneeRaise",
  "flatLegRaise",
  "frontRaise",
  "frontSquat",
  "gobletSquat",
  "goodMorning",
  "hackSquat",
  "hammerCurl",
  "handstandPushUp",
  "hangClean",
  "hangSnatch",
  "hangingLegRaise",
  "highKneeSkips",
  "hipAbductor",
  "hipThrust",
  "inclineBenchPress",
  "inclineChestFly",
  "inclineChestPress",
  "inclineCurl",
  "inclineRow",
  "invertedRow",
  "isoLateralChestPress",
  "isoLateralRow",
  "jackknifeSitUp",
  "jumpRope",
  "jumpSquat",
  "jumpingJack",
  "kettlebellSwing",
  "kettlebellTurkishGetUp",
  "kippingPullUp",
  "kneeRaise",
  "kneelingPulldown",
  "kneestoElbows",
  "latPulldown",
  "lateralBoxJump",
  "lateralRaise",
  "legExtension",
  "legPress",
  "lunge",
  "lyingLegCurl",
  "mountainClimber",
  "muscleUp",
  "obliqueCrunch",
  "overheadPress",
  "overheadSquat",
  "pecDeck",
  "pendlayRow",
  "pistolSquat",
  "plank",
  "powerClean",
  "powerSnatch",
  "preacherCurl",
  "pressUnder",
  "pullUp",
  "pullover",
  "pushPress",
  "pushUp",
  "reverseCrunch",
  "reverseCurl",
  "reverseFly",
  "reverseGripConcentrationCurl",
  "reversePlank",
  "romanianDeadlift",
  "rowing",
  "russianTwist",
  "seatedCalfRaise",
  "seatedLegCurl",
  "seatedLegPress",
  "seatedOverheadPress",
  "seatedPalmsUpWristCurl",
  "seatedRow",
  "seatedWideGripRow",
  "shoulderPress",
  "shrug",
  "sideBend",
  "sidePlank",
  "singleLegBridge",
  "singleLegDeadlift",
  "sitUp",
  "skullcrusher",
  "snatch",
  "snatchPull",
  "splitJerk",
  "squat",
  "squatRow",
  "standingCalfRaise",
  "stepUp",
  "stiffLegDeadlift",
  "straightLegDeadlift",
  "sumoDeadlift",
  "sumoDeadliftHighPull",
  "superman",
  "tBarRow",
  "thruster",
  "toesToBar",
  "torsoRotation",
  "trapBarDeadlift",
  "tricepsDip",
  "tricepsExtension",
  "tricepsPushdown",
  "uprightRow",
  "vUp",
  "widePullUp",
  "wristRoller",
  "zercherSquat",
] as const;

export const excercises: Record<IExcerciseId, IExcercise> = {
  abWheel: {
    id: "abWheel",
    name: "Ab Wheel",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  arnoldPress: {
    id: "arnoldPress",
    name: "Arnold Press",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  backExtension: {
    id: "backExtension",
    name: "Back Extension",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  ballSlams: {
    id: "ballSlams",
    name: "Ball Slams",
    warmupSets: warmupEmpty,
    defaultBar: undefined,
  },
  battleRopes: {
    id: "battleRopes",
    name: "Battle Ropes",
    warmupSets: warmupEmpty,
    defaultBar: undefined,
  },
  benchDip: {
    id: "benchDip",
    name: "Bench Dip",
    warmupSets: warmupEmpty,
    defaultBar: undefined,
  },
  benchPress: {
    id: "benchPress",
    name: "Bench Press",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  benchPressCloseGrip: {
    id: "benchPressCloseGrip",
    name: "Bench Press Close Grip",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  benchPressWideGrip: {
    id: "benchPressWideGrip",
    name: "Bench Press Wide Grip",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  bentOverOneArmRow: {
    id: "bentOverOneArmRow",
    name: "Bent Over One Arm Row",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  bentOverRow: {
    id: "bentOverRow",
    name: "Bent Over Row",
    warmupSets: warmup95,
    defaultBar: "barbell",
  },
  bicepCurl: {
    id: "bicepCurl",
    name: "Bicep Curl",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  bicycleCrunch: {
    id: "bicycleCrunch",
    name: "Bicycle Crunch",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  boxJump: {
    id: "boxJump",
    name: "Box Jump",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  boxSquat: {
    id: "boxSquat",
    name: "Box Squat",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  bulgarianSplitSquat: {
    id: "bulgarianSplitSquat",
    name: "Bulgarian Split Squat",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  burpee: {
    id: "burpee",
    name: "Burpee",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  cableCrossover: {
    id: "cableCrossover",
    name: "Cable Crossover",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  cableCrunch: {
    id: "cableCrunch",
    name: "Cable Crunch",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  cableKickback: {
    id: "cableKickback",
    name: "Cable Kickback",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  cablePullThrough: {
    id: "cablePullThrough",
    name: "Cable Pull Through",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  cableTwist: {
    id: "cableTwist",
    name: "Cable Twist",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  calfPressOnLegPress: {
    id: "calfPressOnLegPress",
    name: "Calf Press on Leg Press",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  calfPressOnSeatedLegPress: {
    id: "calfPressOnSeatedLegPress",
    name: "Calf Press on Seated Leg Press",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  chestDip: {
    id: "chestDip",
    name: "Chest Dip",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  chestFly: {
    id: "chestFly",
    name: "Chest Fly",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  chestPress: {
    id: "chestPress",
    name: "Chest Press",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  chinUp: {
    id: "chinUp",
    name: "Chin Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  clean: {
    id: "clean",
    name: "Clean",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  cleanandJerk: {
    id: "cleanandJerk",
    name: "Clean and Jerk",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  concentrationCurl: {
    id: "concentrationCurl",
    name: "Concentration Curl",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  crossBodyCrunch: {
    id: "crossBodyCrunch",
    name: "Cross Body Crunch",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  crunch: {
    id: "crunch",
    name: "Crunch",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  cycling: {
    id: "cycling",
    name: "Cycling",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    warmupSets: warmup95,
    defaultBar: "barbell",
  },
  deadliftHighPull: {
    id: "deadliftHighPull",
    name: "Deadlift High Pull",
    warmupSets: warmup95,
    defaultBar: "barbell",
  },
  declineBenchPress: {
    id: "declineBenchPress",
    name: "Decline Bench Press",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  declineCrunch: {
    id: "declineCrunch",
    name: "Decline Crunch",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  deficitDeadlift: {
    id: "deficitDeadlift",
    name: "Deficit Deadlift",
    warmupSets: warmup95,
    defaultBar: "barbell",
  },
  ellipticalMachine: {
    id: "ellipticalMachine",
    name: "Elliptical Machine",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  facePull: {
    id: "facePull",
    name: "Face Pull",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  flatKneeRaise: {
    id: "flatKneeRaise",
    name: "Flat Knee Raise",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  flatLegRaise: {
    id: "flatLegRaise",
    name: "Flat Leg Raise",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  frontRaise: {
    id: "frontRaise",
    name: "Front Raise",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  frontSquat: {
    id: "frontSquat",
    name: "Front Squat",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  gobletSquat: {
    id: "gobletSquat",
    name: "Goblet Squat",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  goodMorning: {
    id: "goodMorning",
    name: "Good Morning",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  hackSquat: {
    id: "hackSquat",
    name: "Hack Squat",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  hammerCurl: {
    id: "hammerCurl",
    name: "Hammer Curl",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  handstandPushUp: {
    id: "handstandPushUp",
    name: "Handstand Push Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  hangClean: {
    id: "hangClean",
    name: "Hang Clean",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  hangSnatch: {
    id: "hangSnatch",
    name: "Hang Snatch",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  hangingLegRaise: {
    id: "hangingLegRaise",
    name: "Hanging Leg Raise",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  highKneeSkips: {
    id: "highKneeSkips",
    name: "High Knee Skips",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  hipAbductor: {
    id: "hipAbductor",
    name: "Hip Abductor",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  hipThrust: {
    id: "hipThrust",
    name: "Hip Thrust",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  inclineBenchPress: {
    id: "inclineBenchPress",
    name: "Incline Bench Press",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  inclineChestFly: {
    id: "inclineChestFly",
    name: "Incline Chest Fly",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  inclineChestPress: {
    id: "inclineChestPress",
    name: "Incline Chest Press",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  inclineCurl: {
    id: "inclineCurl",
    name: "Incline Curl",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  inclineRow: {
    id: "inclineRow",
    name: "Incline Row",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  invertedRow: {
    id: "invertedRow",
    name: "Inverted Row",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  isoLateralChestPress: {
    id: "isoLateralChestPress",
    name: "Iso-Lateral Chest Press",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  isoLateralRow: {
    id: "isoLateralRow",
    name: "Iso-Lateral Row",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  jackknifeSitUp: {
    id: "jackknifeSitUp",
    name: "Jackknife Sit Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  jumpRope: {
    id: "jumpRope",
    name: "Jump Rope",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  jumpSquat: {
    id: "jumpSquat",
    name: "Jump Squat",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  jumpingJack: {
    id: "jumpingJack",
    name: "Jumping Jack",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  kettlebellSwing: {
    id: "kettlebellSwing",
    name: "Kettlebell Swing",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  kettlebellTurkishGetUp: {
    id: "kettlebellTurkishGetUp",
    name: "Kettlebell Turkish Get Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  kippingPullUp: {
    id: "kippingPullUp",
    name: "Kipping Pull Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  kneeRaise: {
    id: "kneeRaise",
    name: "Knee Raise",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  kneelingPulldown: {
    id: "kneelingPulldown",
    name: "Kneeling Pulldown",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  kneestoElbows: {
    id: "kneestoElbows",
    name: "Knees to Elbows",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  latPulldown: {
    id: "latPulldown",
    name: "Lat Pulldown",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  lateralBoxJump: {
    id: "lateralBoxJump",
    name: "Lateral Box Jump",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  lateralRaise: {
    id: "lateralRaise",
    name: "Lateral Raise",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  legExtension: {
    id: "legExtension",
    name: "Leg Extension",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  legPress: {
    id: "legPress",
    name: "Leg Press",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  lunge: {
    id: "lunge",
    name: "Lunge",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  lyingLegCurl: {
    id: "lyingLegCurl",
    name: "Lying Leg Curl",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  mountainClimber: {
    id: "mountainClimber",
    name: "Mountain Climber",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  muscleUp: {
    id: "muscleUp",
    name: "Muscle Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  obliqueCrunch: {
    id: "obliqueCrunch",
    name: "Oblique Crunch",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  overheadSquat: {
    id: "overheadSquat",
    name: "Overhead Squat",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  pecDeck: {
    id: "pecDeck",
    name: "Pec Deck",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  pendlayRow: {
    id: "pendlayRow",
    name: "Pendlay Row",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  pistolSquat: {
    id: "pistolSquat",
    name: "Pistol Squat",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  plank: {
    id: "plank",
    name: "Plank",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  powerClean: {
    id: "powerClean",
    name: "Power Clean",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  powerSnatch: {
    id: "powerSnatch",
    name: "Power Snatch",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  preacherCurl: {
    id: "preacherCurl",
    name: "Preacher Curl",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  pressUnder: {
    id: "pressUnder",
    name: "Press Under",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  pullUp: {
    id: "pullUp",
    name: "Pull Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  pullover: {
    id: "pullover",
    name: "Pullover",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  pushPress: {
    id: "pushPress",
    name: "Push Press",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  pushUp: {
    id: "pushUp",
    name: "Push Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  reverseCrunch: {
    id: "reverseCrunch",
    name: "Reverse Crunch",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  reverseCurl: {
    id: "reverseCurl",
    name: "Reverse Curl",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  reverseFly: {
    id: "reverseFly",
    name: "Reverse Fly",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  reverseGripConcentrationCurl: {
    id: "reverseGripConcentrationCurl",
    name: "Reverse Grip Concentration Curl",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  reversePlank: {
    id: "reversePlank",
    name: "Reverse Plank",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  romanianDeadlift: {
    id: "romanianDeadlift",
    name: "Romanian Deadlift",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  rowing: {
    id: "rowing",
    name: "Rowing",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  russianTwist: {
    id: "russianTwist",
    name: "Russian Twist",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  seatedCalfRaise: {
    id: "seatedCalfRaise",
    name: "Seated Calf Raise",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  seatedLegCurl: {
    id: "seatedLegCurl",
    name: "Seated Leg Curl",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  seatedLegPress: {
    id: "seatedLegPress",
    name: "Seated Leg Press",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  seatedOverheadPress: {
    id: "seatedOverheadPress",
    name: "Seated Overhead Press",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  seatedPalmsUpWristCurl: {
    id: "seatedPalmsUpWristCurl",
    name: "Seated Palms Up Wrist Curl",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  seatedRow: {
    id: "seatedRow",
    name: "Seated Row",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  seatedWideGripRow: {
    id: "seatedWideGripRow",
    name: "Seated Wide Grip Row",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  shoulderPress: {
    id: "shoulderPress",
    name: "Shoulder Press",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  shrug: {
    id: "shrug",
    name: "Shrug",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  sideBend: {
    id: "sideBend",
    name: "Side Bend",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  sidePlank: {
    id: "sidePlank",
    name: "Side Plank",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  singleLegBridge: {
    id: "singleLegBridge",
    name: "Single Leg Bridge",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  singleLegDeadlift: {
    id: "singleLegDeadlift",
    name: "Single Leg Deadlift",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  sitUp: {
    id: "sitUp",
    name: "Sit Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  skullcrusher: {
    id: "skullcrusher",
    name: "Skullcrusher",
    warmupSets: warmup10,
    defaultBar: "ezbar",
  },
  snatch: {
    id: "snatch",
    name: "Snatch",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  snatchPull: {
    id: "snatchPull",
    name: "Snatch Pull",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  splitJerk: {
    id: "splitJerk",
    name: "Split Jerk",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  squat: {
    id: "squat",
    name: "Squat",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  squatRow: {
    id: "squatRow",
    name: "Squat Row",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  standingCalfRaise: {
    id: "standingCalfRaise",
    name: "Standing Calf Raise",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  stepUp: {
    id: "stepUp",
    name: "Step up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  stiffLegDeadlift: {
    id: "stiffLegDeadlift",
    name: "Stiff Leg Deadlift",
    warmupSets: warmup95,
    defaultBar: "barbell",
  },
  straightLegDeadlift: {
    id: "straightLegDeadlift",
    name: "Straight Leg Deadlift",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  sumoDeadlift: {
    id: "sumoDeadlift",
    name: "Sumo Deadlift",
    warmupSets: warmup95,
    defaultBar: "barbell",
  },
  sumoDeadliftHighPull: {
    id: "sumoDeadliftHighPull",
    name: "Sumo Deadlift High Pull",
    warmupSets: warmup95,
    defaultBar: "barbell",
  },
  superman: {
    id: "superman",
    name: "Superman",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  tBarRow: {
    id: "tBarRow",
    name: "T Bar Row",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  thruster: {
    id: "thruster",
    name: "Thruster",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
  toesToBar: {
    id: "toesToBar",
    name: "Toes To Bar",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  torsoRotation: {
    id: "torsoRotation",
    name: "Torso Rotation",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  trapBarDeadlift: {
    id: "trapBarDeadlift",
    name: "Trap Bar Deadlift",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  tricepsDip: {
    id: "tricepsDip",
    name: "Triceps Dip",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  tricepsExtension: {
    id: "tricepsExtension",
    name: "Triceps Extension",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  tricepsPushdown: {
    id: "tricepsPushdown",
    name: "Triceps Pushdown",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  uprightRow: {
    id: "uprightRow",
    name: "Upright Row",
    warmupSets: warmup10,
    defaultBar: "dumbbell",
  },
  vUp: {
    id: "vUp",
    name: "V Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  widePullUp: {
    id: "widePullUp",
    name: "Wide Pull Up",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  wristRoller: {
    id: "wristRoller",
    name: "Wrist Roller",
    warmupSets: warmup10,
    defaultBar: undefined,
  },
  zercherSquat: {
    id: "zercherSquat",
    name: "Zercher Squat",
    warmupSets: warmup45,
    defaultBar: "barbell",
  },
};

export const TExcerciseId = t.keyof(
  excerciseTypes.reduce<Record<IArrayElement<typeof excerciseTypes>, null>>((memo, excerciseType) => {
    memo[excerciseType] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof excerciseTypes>, null>),
  "TExcerciseId"
);
export type IExcerciseId = t.TypeOf<typeof TExcerciseId>;

export const TExcerciseType = t.intersection(
  [
    t.interface({
      id: TExcerciseId,
    }),
    t.partial({
      bar: TBarKey,
    }),
  ],
  "TExcerciseType"
);
export type IExcerciseType = t.TypeOf<typeof TExcerciseType>;

export type IExcercise = {
  id: IExcerciseId;
  name: string;
  warmupSets: (weight: IWeight, settings: ISettings, bar?: IBarKey) => ISet[];
  bar?: keyof IBars;
  defaultBar?: keyof IBars;
};

function warmup45(weight: IWeight, settings: ISettings, bar?: IBarKey): ISet[] {
  return warmup({ 45: 0.8, 90: 0.5, 120: 0.3 })(weight, settings, bar);
}

function warmup95(weight: IWeight, settings: ISettings, bar?: IBarKey): ISet[] {
  return warmup({ 95: 0.8, 125: 0.5, 150: 0.3 })(weight, settings, bar);
}

function warmup10(weight: IWeight, settings: ISettings, bar?: IBarKey): ISet[] {
  return warmup({ 10: 0.8, 30: 0.5, 60: 0.3 })(weight, settings, bar);
}

function warmup(mapping: Record<number, number>): (weight: IWeight, settings: ISettings, bar?: IBarKey) => ISet[] {
  return (weight: IWeight, settings: ISettings, bar?: IBarKey): ISet[] => {
    const percents: number[] = [];
    ObjectUtils.keys(mapping).forEach((weightValue) => {
      const percent = mapping[weightValue];
      if (Weight.gt(weight, Weight.build(weightValue, "lb"))) {
        percents.unshift(percent);
      }
    });
    return percents.map((percent) => {
      return {
        reps: 5,
        weight: Weight.max(
          bar != null ? Settings.bars(settings)[bar] : Weight.build(0, settings.units),
          Weight.roundConvertTo(Weight.multiply(weight, percent), settings, bar)
        ),
      };
    });
  };
}

function warmupEmpty(weight: IWeight): ISet[] {
  return [];
}

export namespace Excercise {
  export function get(type: IExcerciseType): IExcercise {
    return { ...excercises[type.id], bar: type.bar };
  }

  export function eq(a: IExcerciseType, b: IExcerciseType): boolean {
    return a.id === b.id && a.bar === b.bar;
  }

  export function getWarmupSets(excercise: IExcerciseType, weight: IWeight, settings: ISettings): ISet[] {
    return get(excercise).warmupSets(weight, settings, excercise.bar);
  }
}
