import { ObjectUtils } from "../utils/object";
import { Weight } from "./weight";
import {
  IExerciseId,
  IEquipment,
  IBarKey,
  IWeight,
  ISet,
  IExerciseType,
  equipments,
  ISettings,
  IAllCustomExercises,
  IMuscle,
  IMetaExercises,
  IProgramExerciseWarmupSet,
} from "../types";

export const exercises: Record<IExerciseId, IExercise> = {
  abWheel: {
    id: "abWheel",
    name: "Ab Wheel",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  arnoldPress: {
    id: "arnoldPress",
    name: "Arnold Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  aroundTheWorld: {
    id: "aroundTheWorld",
    name: "Around The World",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  backExtension: {
    id: "backExtension",
    name: "Back Extension",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  ballSlams: {
    id: "ballSlams",
    name: "Ball Slams",
    defaultEquipment: "medicineball",
  },
  battleRopes: {
    id: "battleRopes",
    name: "Battle Ropes",
    defaultEquipment: "bodyweight",
  },
  benchDip: {
    id: "benchDip",
    name: "Bench Dip",
    defaultEquipment: "bodyweight",
  },
  benchPress: {
    id: "benchPress",
    name: "Bench Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  benchPressCloseGrip: {
    id: "benchPressCloseGrip",
    name: "Bench Press Close Grip",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  benchPressWideGrip: {
    id: "benchPressWideGrip",
    name: "Bench Press Wide Grip",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  bentOverOneArmRow: {
    id: "bentOverOneArmRow",
    name: "Bent Over One Arm Row",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  bentOverRow: {
    id: "bentOverRow",
    name: "Bent Over Row",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
  },
  bicepCurl: {
    id: "bicepCurl",
    name: "Bicep Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  bicycleCrunch: {
    id: "bicycleCrunch",
    name: "Bicycle Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  boxJump: {
    id: "boxJump",
    name: "Box Jump",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  boxSquat: {
    id: "boxSquat",
    name: "Box Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  bulgarianSplitSquat: {
    id: "bulgarianSplitSquat",
    name: "Bulgarian Split Squat",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  burpee: {
    id: "burpee",
    name: "Burpee",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  cableCrossover: {
    id: "cableCrossover",
    name: "Cable Crossover",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  cableCrunch: {
    id: "cableCrunch",
    name: "Cable Crunch",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  cableKickback: {
    id: "cableKickback",
    name: "Cable Kickback",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  cablePullThrough: {
    id: "cablePullThrough",
    name: "Cable Pull Through",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  cableTwist: {
    id: "cableTwist",
    name: "Cable Twist",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  calfPressOnLegPress: {
    id: "calfPressOnLegPress",
    name: "Calf Press on Leg Press",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  calfPressOnSeatedLegPress: {
    id: "calfPressOnSeatedLegPress",
    name: "Calf Press on Seated Leg Press",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  chestDip: {
    id: "chestDip",
    name: "Chest Dip",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  chestFly: {
    id: "chestFly",
    name: "Chest Fly",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  chestPress: {
    id: "chestPress",
    name: "Chest Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  chinUp: {
    id: "chinUp",
    name: "Chin Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  clean: {
    id: "clean",
    name: "Clean",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  cleanandJerk: {
    id: "cleanandJerk",
    name: "Clean and Jerk",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  concentrationCurl: {
    id: "concentrationCurl",
    name: "Concentration Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  crossBodyCrunch: {
    id: "crossBodyCrunch",
    name: "Cross Body Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  crunch: {
    id: "crunch",
    name: "Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  cycling: {
    id: "cycling",
    name: "Cycling",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
  },
  deadliftHighPull: {
    id: "deadliftHighPull",
    name: "Deadlift High Pull",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
  },
  declineBenchPress: {
    id: "declineBenchPress",
    name: "Decline Bench Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  declineCrunch: {
    id: "declineCrunch",
    name: "Decline Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  deficitDeadlift: {
    id: "deficitDeadlift",
    name: "Deficit Deadlift",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
  },
  ellipticalMachine: {
    id: "ellipticalMachine",
    name: "Elliptical Machine",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  facePull: {
    id: "facePull",
    name: "Face Pull",
    defaultWarmup: 10,
    defaultEquipment: "band",
  },
  flatKneeRaise: {
    id: "flatKneeRaise",
    name: "Flat Knee Raise",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  flatLegRaise: {
    id: "flatLegRaise",
    name: "Flat Leg Raise",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  frontRaise: {
    id: "frontRaise",
    name: "Front Raise",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  frontSquat: {
    id: "frontSquat",
    name: "Front Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  gobletSquat: {
    id: "gobletSquat",
    name: "Goblet Squat",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  goodMorning: {
    id: "goodMorning",
    name: "Good Morning",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  gluteBridge: {
    id: "gluteBridge",
    name: "Glute Bridge",
    defaultWarmup: 45,
    defaultEquipment: "dumbbell",
  },
  gluteBridgeMarch: {
    id: "gluteBridgeMarch",
    name: "Glute Bridge March",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
  },
  hackSquat: {
    id: "hackSquat",
    name: "Hack Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  hammerCurl: {
    id: "hammerCurl",
    name: "Hammer Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  handstandPushUp: {
    id: "handstandPushUp",
    name: "Handstand Push Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  hangClean: {
    id: "hangClean",
    name: "Hang Clean",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  hangSnatch: {
    id: "hangSnatch",
    name: "Hang Snatch",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  hangingLegRaise: {
    id: "hangingLegRaise",
    name: "Hanging Leg Raise",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  highKneeSkips: {
    id: "highKneeSkips",
    name: "High Knee Skips",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  hipAbductor: {
    id: "hipAbductor",
    name: "Hip Abductor",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  hipThrust: {
    id: "hipThrust",
    name: "Hip Thrust",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  inclineBenchPress: {
    id: "inclineBenchPress",
    name: "Incline Bench Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  inclineChestFly: {
    id: "inclineChestFly",
    name: "Incline Chest Fly",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  inclineChestPress: {
    id: "inclineChestPress",
    name: "Incline Chest Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  inclineCurl: {
    id: "inclineCurl",
    name: "Incline Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  inclineRow: {
    id: "inclineRow",
    name: "Incline Row",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  invertedRow: {
    id: "invertedRow",
    name: "Inverted Row",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  isoLateralChestPress: {
    id: "isoLateralChestPress",
    name: "Iso-Lateral Chest Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  isoLateralRow: {
    id: "isoLateralRow",
    name: "Iso-Lateral Row",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  jackknifeSitUp: {
    id: "jackknifeSitUp",
    name: "Jackknife Sit Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  jumpRope: {
    id: "jumpRope",
    name: "Jump Rope",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  jumpSquat: {
    id: "jumpSquat",
    name: "Jump Squat",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
  },
  jumpingJack: {
    id: "jumpingJack",
    name: "Jumping Jack",
    defaultWarmup: 10,
    defaultEquipment: undefined,
  },
  kettlebellSwing: {
    id: "kettlebellSwing",
    name: "Kettlebell Swing",
    defaultWarmup: 10,
    defaultEquipment: "kettlebell",
  },
  kettlebellTurkishGetUp: {
    id: "kettlebellTurkishGetUp",
    name: "Kettlebell Turkish Get Up",
    defaultWarmup: 10,
    defaultEquipment: "kettlebell",
  },
  kippingPullUp: {
    id: "kippingPullUp",
    name: "Kipping Pull Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  kneeRaise: {
    id: "kneeRaise",
    name: "Knee Raise",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  kneelingPulldown: {
    id: "kneelingPulldown",
    name: "Kneeling Pulldown",
    defaultWarmup: 10,
    defaultEquipment: "band",
  },
  kneestoElbows: {
    id: "kneestoElbows",
    name: "Knees to Elbows",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  latPulldown: {
    id: "latPulldown",
    name: "Lat Pulldown",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  lateralBoxJump: {
    id: "lateralBoxJump",
    name: "Lateral Box Jump",
    defaultWarmup: 10,
    defaultEquipment: undefined,
  },
  lateralRaise: {
    id: "lateralRaise",
    name: "Lateral Raise",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  legExtension: {
    id: "legExtension",
    name: "Leg Extension",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  legPress: {
    id: "legPress",
    name: "Leg Press",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  lunge: {
    id: "lunge",
    name: "Lunge",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  lyingLegCurl: {
    id: "lyingLegCurl",
    name: "Lying Leg Curl",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  mountainClimber: {
    id: "mountainClimber",
    name: "Mountain Climber",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  muscleUp: {
    id: "muscleUp",
    name: "Muscle Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  obliqueCrunch: {
    id: "obliqueCrunch",
    name: "Oblique Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  overheadSquat: {
    id: "overheadSquat",
    name: "Overhead Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  pecDeck: {
    id: "pecDeck",
    name: "Pec Deck",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  pendlayRow: {
    id: "pendlayRow",
    name: "Pendlay Row",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
  },
  pistolSquat: {
    id: "pistolSquat",
    name: "Pistol Squat",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  plank: {
    id: "plank",
    name: "Plank",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  powerClean: {
    id: "powerClean",
    name: "Power Clean",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  powerSnatch: {
    id: "powerSnatch",
    name: "Power Snatch",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  preacherCurl: {
    id: "preacherCurl",
    name: "Preacher Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  pressUnder: {
    id: "pressUnder",
    name: "Press Under",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  pullUp: {
    id: "pullUp",
    name: "Pull Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  pullover: {
    id: "pullover",
    name: "Pullover",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  pushPress: {
    id: "pushPress",
    name: "Push Press",
    defaultWarmup: 45,
    defaultEquipment: "kettlebell",
  },
  pushUp: {
    id: "pushUp",
    name: "Push Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  reverseCrunch: {
    id: "reverseCrunch",
    name: "Reverse Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  reverseCurl: {
    id: "reverseCurl",
    name: "Reverse Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  reverseFly: {
    id: "reverseFly",
    name: "Reverse Fly",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  reverseGripConcentrationCurl: {
    id: "reverseGripConcentrationCurl",
    name: "Reverse Grip Concentration Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  reversePlank: {
    id: "reversePlank",
    name: "Reverse Plank",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  romanianDeadlift: {
    id: "romanianDeadlift",
    name: "Romanian Deadlift",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  reverseHyperextension: {
    id: "reverseHyperextension",
    name: "Reverse Hyperextension",
    defaultWarmup: 45,
    defaultEquipment: "band",
  },
  rowing: {
    id: "rowing",
    name: "Rowing",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  russianTwist: {
    id: "russianTwist",
    name: "Russian Twist",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  seatedCalfRaise: {
    id: "seatedCalfRaise",
    name: "Seated Calf Raise",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
  },
  seatedLegCurl: {
    id: "seatedLegCurl",
    name: "Seated Leg Curl",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  seatedLegPress: {
    id: "seatedLegPress",
    name: "Seated Leg Press",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  seatedOverheadPress: {
    id: "seatedOverheadPress",
    name: "Seated Overhead Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  seatedPalmsUpWristCurl: {
    id: "seatedPalmsUpWristCurl",
    name: "Seated Palms Up Wrist Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  seatedRow: {
    id: "seatedRow",
    name: "Seated Row",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  seatedWideGripRow: {
    id: "seatedWideGripRow",
    name: "Seated Wide Grip Row",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  shoulderPress: {
    id: "shoulderPress",
    name: "Shoulder Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  shrug: {
    id: "shrug",
    name: "Shrug",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  sideBend: {
    id: "sideBend",
    name: "Side Bend",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  sideCrunch: {
    id: "sideCrunch",
    name: "Side Crunch",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
  },
  sideHipAbductor: {
    id: "sideHipAbductor",
    name: "Side Hip Abductor",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
  },
  sideLyingClam: {
    id: "sideLyingClam",
    name: "Side Lying Clam",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
  },
  sidePlank: {
    id: "sidePlank",
    name: "Side Plank",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  singleLegBridge: {
    id: "singleLegBridge",
    name: "Single Leg Bridge",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  singleLegDeadlift: {
    id: "singleLegDeadlift",
    name: "Single Leg Deadlift",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  singleLegGluteBridgeBench: {
    id: "singleLegGluteBridgeBench",
    name: "Single Leg Glute Bridge On Bench",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
  },
  singleLegGluteBridgeStraight: {
    id: "singleLegGluteBridgeStraight",
    name: "Single Leg Glute Bridge Straight Leg",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
  },
  singleLegGluteBridgeBentKnee: {
    id: "singleLegGluteBridgeBentKnee",
    name: "Single Leg Glute Bridge Bent Knee",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
  },
  singleLegHipThrust: {
    id: "singleLegHipThrust",
    name: "Single Leg Hip Thrust",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
  },
  sitUp: {
    id: "sitUp",
    name: "Sit Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  skullcrusher: {
    id: "skullcrusher",
    name: "Skullcrusher",
    defaultWarmup: 10,
    defaultEquipment: "ezbar",
  },
  snatch: {
    id: "snatch",
    name: "Snatch",
    defaultWarmup: 45,
    defaultEquipment: "dumbbell",
  },
  snatchPull: {
    id: "snatchPull",
    name: "Snatch Pull",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  splitJerk: {
    id: "splitJerk",
    name: "Split Jerk",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  squat: {
    id: "squat",
    name: "Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  squatRow: {
    id: "squatRow",
    name: "Squat Row",
    defaultWarmup: 10,
    defaultEquipment: "band",
  },
  standingCalfRaise: {
    id: "standingCalfRaise",
    name: "Standing Calf Raise",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  stepUp: {
    id: "stepUp",
    name: "Step up",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  stiffLegDeadlift: {
    id: "stiffLegDeadlift",
    name: "Stiff Leg Deadlift",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
  },
  straightLegDeadlift: {
    id: "straightLegDeadlift",
    name: "Straight Leg Deadlift",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
  },
  sumoDeadlift: {
    id: "sumoDeadlift",
    name: "Sumo Deadlift",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
  },
  sumoDeadliftHighPull: {
    id: "sumoDeadliftHighPull",
    name: "Sumo Deadlift High Pull",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
  },
  superman: {
    id: "superman",
    name: "Superman",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  tBarRow: {
    id: "tBarRow",
    name: "T Bar Row",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
  },
  thruster: {
    id: "thruster",
    name: "Thruster",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
  toesToBar: {
    id: "toesToBar",
    name: "Toes To Bar",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  torsoRotation: {
    id: "torsoRotation",
    name: "Torso Rotation",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  trapBarDeadlift: {
    id: "trapBarDeadlift",
    name: "Trap Bar Deadlift",
    defaultWarmup: 10,
    defaultEquipment: "trapbar",
  },
  tricepsDip: {
    id: "tricepsDip",
    name: "Triceps Dip",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  tricepsExtension: {
    id: "tricepsExtension",
    name: "Triceps Extension",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  tricepsPushdown: {
    id: "tricepsPushdown",
    name: "Triceps Pushdown",
    defaultWarmup: 10,
    defaultEquipment: "cable",
  },
  uprightRow: {
    id: "uprightRow",
    name: "Upright Row",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
  },
  vUp: {
    id: "vUp",
    name: "V Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  widePullUp: {
    id: "widePullUp",
    name: "Wide Pull Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  wristRoller: {
    id: "wristRoller",
    name: "Wrist Roller",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
  },
  zercherSquat: {
    id: "zercherSquat",
    name: "Zercher Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
  },
};

const metadata: Record<IExerciseId, Partial<Record<IEquipment, IMetaExercises>>> = {
  abWheel: {
    bodyweight: {
      targetMuscles: ["Iliopsoas"],
      synergistMuscles: [
        "Adductor Brevis",
        "Adductor Longus",
        "Deltoid Posterior",
        "Latissimus Dorsi",
        "Pectineous",
        "Pectoralis Major Sternal Head",
        "Sartorius",
        "Teres Major",
      ],
      bodyParts: ["Back"],
    },
  },
  arnoldPress: {
    dumbbell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
    kettlebell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
  },
  aroundTheWorld: {
    dumbbell: {
      targetMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Lateral", "Deltoid Posterior", "Latissimus Dorsi", "Serratus Anterior"],
      bodyParts: ["Chest", "Shoulders"],
    },
  },
  backExtension: {
    bodyweight: {
      targetMuscles: ["Erector Spinae"],
      synergistMuscles: ["Gluteus Maximus", "Hamstrings"],
      bodyParts: ["Hips"],
    },
    leverageMachine: {
      targetMuscles: ["Erector Spinae"],
      synergistMuscles: [],
      bodyParts: ["Waist"],
    },
  },
  ballSlams: {
    medicineball: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Rectus Abdominis"],
      bodyParts: ["Back"],
    },
  },
  battleRopes: {
    bodyweight: {
      targetMuscles: ["Deltoid Posterior"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Lateral",
        "Infraspinatus",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
  },
  benchDip: {
    bodyweight: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [
        "Deltoid Anterior",
        "Latissimus Dorsi",
        "Levator Scapulae",
        "Pectoralis Major Clavicular Head",
        "Pectoralis Major Sternal Head",
      ],
      bodyParts: ["Upper Arms"],
    },
  },
  benchPress: {
    barbell: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    cable: {
      targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    dumbbell: {
      targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    smith: {
      targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    band: {
      targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    kettlebell: {
      targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
  },
  benchPressCloseGrip: {
    barbell: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      bodyParts: ["Upper Arms"],
    },
    ezbar: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      bodyParts: ["Upper Arms"],
    },
    smith: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      bodyParts: ["Upper Arms"],
    },
  },
  benchPressWideGrip: {
    barbell: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    smith: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
  },
  bentOverOneArmRow: {
    dumbbell: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
  },
  bentOverRow: {
    barbell: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Middle Fibers",
        "Trapezius Upper Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior"],
      bodyParts: ["Back"],
    },
    cable: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
    dumbbell: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
    band: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
    leverageMachine: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
    smith: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
  },
  bicepCurl: {
    barbell: {
      targetMuscles: ["Biceps Brachii"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    dumbbell: {
      targetMuscles: ["Biceps Brachii"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    band: {
      targetMuscles: ["Biceps Brachii"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    leverageMachine: {
      targetMuscles: ["Brachialis"],
      synergistMuscles: ["Biceps Brachii"],
      bodyParts: ["Upper Arms"],
    },
    cable: {
      targetMuscles: ["Biceps Brachii"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    ezbar: {
      targetMuscles: ["Biceps Brachii"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
  },
  bicycleCrunch: {
    bodyweight: {
      targetMuscles: ["Obliques", "Rectus Abdominis"],
      synergistMuscles: ["Gluteus Maximus", "Iliopsoas", "Quadriceps"],
      bodyParts: ["Waist"],
    },
  },
  boxJump: {},
  boxSquat: {
    barbell: {
      targetMuscles: ["Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
  },
  bulgarianSplitSquat: {
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips", "Thighs"],
    },
  },
  burpee: {},
  cableCrossover: {
    cable: {
      targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior"],
      bodyParts: ["Chest"],
    },
  },
  cableCrunch: {
    cable: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: ["Obliques"],
      bodyParts: ["Waist"],
    },
  },
  cableKickback: {
    cable: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
  },
  cablePullThrough: {
    cable: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Erector Spinae", "Hamstrings"],
      bodyParts: ["Hips"],
    },
  },
  cableTwist: {
    barbell: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Iliopsoas"],
      bodyParts: ["Waist"],
    },
    bodyweight: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Rectus Abdominis"],
      bodyParts: ["Waist"],
    },
    cable: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Iliopsoas", "Tensor Fasciae Latae"],
      bodyParts: ["Waist"],
    },
    leverageMachine: {
      targetMuscles: ["Obliques"],
      synergistMuscles: [],
      bodyParts: ["Waist"],
    },
    band: {
      targetMuscles: ["Obliques"],
      synergistMuscles: [
        "Adductor Brevis",
        "Adductor Longus",
        "Adductor Magnus",
        "Gluteus Medius",
        "Iliopsoas",
        "Tensor Fasciae Latae",
      ],
      bodyParts: ["Waist"],
    },
  },
  calfPressOnLegPress: {
    leverageMachine: {
      targetMuscles: ["Gastrocnemius"],
      synergistMuscles: ["Soleus"],
      bodyParts: ["Calves"],
    },
  },
  calfPressOnSeatedLegPress: {
    leverageMachine: {
      targetMuscles: ["Gastrocnemius", "Quadriceps"],
      synergistMuscles: ["Gluteus Maximus", "Hamstrings", "Soleus"],
      bodyParts: ["Calves"],
    },
  },
  chestDip: {
    bodyweight: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: [
        "Deltoid Anterior",
        "Latissimus Dorsi",
        "Levator Scapulae",
        "Pectoralis Major Clavicular Head",
        "Triceps Brachii",
      ],
      bodyParts: ["Chest"],
    },
  },
  chestFly: {
    barbell: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Biceps Brachii", "Deltoid Anterior", "Pectoralis Major Clavicular Head"],
      bodyParts: ["Chest"],
    },
    cable: {
      targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Biceps Brachii", "Deltoid Anterior"],
      bodyParts: ["Chest"],
    },
    dumbbell: {
      targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
      synergistMuscles: ["Biceps Brachii", "Deltoid Anterior"],
      bodyParts: ["Chest"],
    },
    leverageMachine: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Biceps Brachii", "Pectoralis Major Clavicular Head", "Serratus Anterior"],
      bodyParts: ["Chest"],
    },
  },
  chestPress: {
    leverageMachine: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Chest"],
    },
    band: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Biceps Brachii", "Deltoid Lateral", "Pectoralis Major Clavicular Head"],
      bodyParts: ["Chest"],
    },
  },
  chinUp: {
    leverageMachine: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Infraspinatus",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Back"],
    },
    bodyweight: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Posterior",
        "Pectoralis Major Sternal Head",
        "Teres Major",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Back"],
    },
  },
  clean: {},
  cleanandJerk: {},
  concentrationCurl: {
    barbell: {
      targetMuscles: ["Brachialis"],
      synergistMuscles: ["Biceps Brachii", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    dumbbell: {
      targetMuscles: ["Brachialis"],
      synergistMuscles: ["Biceps Brachii", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    band: {
      targetMuscles: ["Brachialis"],
      synergistMuscles: ["Biceps Brachii", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    cable: {
      targetMuscles: ["Biceps Brachii"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
  },
  crossBodyCrunch: {
    bodyweight: {
      targetMuscles: ["Obliques", "Rectus Abdominis"],
      synergistMuscles: ["Gluteus Maximus", "Quadriceps"],
      bodyParts: ["Waist"],
    },
  },
  crunch: {
    cable: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: ["Obliques"],
      bodyParts: ["Waist"],
    },
    bodyweight: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: ["Obliques"],
      bodyParts: ["Waist"],
    },
    leverageMachine: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: ["Obliques"],
      bodyParts: ["Waist"],
    },
  },
  cycling: {},
  deadlift: {
    barbell: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Adductor Magnus", "Erector Spinae", "Hamstrings", "Quadriceps", "Soleus"],
      bodyParts: ["Hips"],
    },
    cable: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Back"],
    },
    leverageMachine: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    smith: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Adductor Magnus", "Hamstrings", "Quadriceps", "Soleus"],
      bodyParts: ["Hips"],
    },
    band: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Adductor Magnus", "Quadriceps", "Soleus"],
      bodyParts: ["Hips"],
    },
    kettlebell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Gastrocnemius", "Hamstrings", "Soleus"],
      bodyParts: ["Hips", "Thighs"],
    },
    bodyweight: {
      targetMuscles: ["Deltoid Anterior", "Erector Spinae", "Gluteus Maximus", "Quadriceps"],
      synergistMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Hamstrings",
        "Pectoralis Major Clavicular Head",
      ],
      bodyParts: ["Hips", "Shoulders", "Thighs"],
    },
  },
  deadliftHighPull: {
    barbell: {
      targetMuscles: ["Deltoid Lateral", "Gluteus Maximus", "Quadriceps"],
      synergistMuscles: [
        "Adductor Magnus",
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Deltoid Anterior",
        "Gastrocnemius",
        "Infraspinatus",
        "Soleus",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
  },
  declineBenchPress: {
    dumbbell: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    smith: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
  },
  declineCrunch: {},
  deficitDeadlift: {},
  ellipticalMachine: {
    leverageMachine: {
      targetMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Deltoid Anterior",
        "Deltoid Lateral",
        "Deltoid Posterior",
        "Gluteus Maximus",
        "Hamstrings",
        "Latissimus Dorsi",
        "Levator Scapulae",
        "Pectoralis Major Clavicular Head",
        "Pectoralis Major Sternal Head",
        "Quadriceps",
        "Serratus Anterior",
      ],
      synergistMuscles: [],
      bodyParts: [],
    },
  },
  facePull: {
    band: {
      targetMuscles: ["Deltoid Posterior"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Lateral",
        "Infraspinatus",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
  },
  flatKneeRaise: {
    bodyweight: {
      targetMuscles: ["Iliopsoas"],
      synergistMuscles: ["Adductor Brevis", "Adductor Longus", "Pectineous", "Sartorius"],
      bodyParts: ["Hips"],
    },
  },
  flatLegRaise: {
    bodyweight: {
      targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
      synergistMuscles: [
        "Adductor Brevis",
        "Adductor Longus",
        "Adductor Magnus",
        "Obliques",
        "Pectineous",
        "Quadriceps",
        "Sartorius",
        "Tensor Fasciae Latae",
      ],
      bodyParts: ["Hips", "Waist"],
    },
  },
  frontRaise: {
    barbell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
    cable: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
    dumbbell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
    bodyweight: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
    band: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
  },
  gluteBridge: {
    band: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
    barbell: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
  },
  gluteBridgeMarch: {
    bodyweight: {
      targetMuscles: ["Gluteus Maximus", "Rectus Abdominis"],
      synergistMuscles: ["Hamstrings", "Quadriceps", "Sartorius"],
      bodyParts: ["Hips"],
    },
  },
  frontSquat: {
    barbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
    kettlebell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips", "Thighs"],
    },
    cable: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    smith: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
  },
  gobletSquat: {
    kettlebell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus", "Tensor Fasciae Latae"],
      bodyParts: ["Thighs"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Gluteus Medius", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus", "Tensor Fasciae Latae"],
      bodyParts: ["Hips", "Thighs"],
    },
  },
  goodMorning: {
    barbell: {
      targetMuscles: ["Hamstrings"],
      synergistMuscles: ["Adductor Magnus", "Gluteus Maximus"],
      bodyParts: ["Thighs"],
    },
    smith: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Hips"],
    },
    leverageMachine: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
  },
  hackSquat: {
    barbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
    smith: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
  },
  hammerCurl: {
    cable: {
      targetMuscles: ["Brachioradialis"],
      synergistMuscles: ["Biceps Brachii", "Brachialis"],
      bodyParts: ["Forearms"],
    },
    dumbbell: {
      targetMuscles: ["Brachioradialis"],
      synergistMuscles: ["Biceps Brachii", "Brachialis"],
      bodyParts: ["Upper Arms"],
    },
    band: {
      targetMuscles: ["Brachioradialis"],
      synergistMuscles: ["Biceps Brachii", "Brachialis"],
      bodyParts: ["Forearms"],
    },
  },
  handstandPushUp: {
    bodyweight: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [
        "Deltoid Anterior",
        "Deltoid Lateral",
        "Pectoralis Major Clavicular Head",
        "Pectoralis Major Sternal Head",
        "Serratus Anterior",
        "Teres Major",
      ],
      bodyParts: ["Shoulders"],
    },
  },
  hangClean: {
    kettlebell: {
      targetMuscles: ["Biceps Brachii", "Brachialis", "Brachioradialis"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head"],
      bodyParts: ["Forearms"],
    },
  },
  hangSnatch: {},
  hangingLegRaise: {
    bodyweight: {
      targetMuscles: ["Iliopsoas"],
      synergistMuscles: [
        "Adductor Brevis",
        "Adductor Longus",
        "Pectineous",
        "Serratus Anterior",
        "Tensor Fasciae Latae",
      ],
      bodyParts: ["Hips"],
    },
    cable: {
      targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
      synergistMuscles: ["Obliques", "Quadriceps", "Sartorius", "Tensor Fasciae Latae"],
      bodyParts: ["Waist"],
    },
  },
  highKneeSkips: {},
  hipAbductor: {
    leverageMachine: {
      targetMuscles: ["Gluteus Maximus", "Gluteus Medius"],
      synergistMuscles: ["Tensor Fasciae Latae"],
      bodyParts: ["Hips"],
    },
    bodyweight: {
      targetMuscles: ["Gluteus Medius", "Tensor Fasciae Latae"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
    cable: {
      targetMuscles: ["Gluteus Medius", "Tensor Fasciae Latae"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
    band: {
      targetMuscles: ["Gluteus Medius", "Tensor Fasciae Latae"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
  },
  hipThrust: {
    barbell: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
    leverageMachine: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Adductor Magnus", "Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
    band: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Hips"],
    },
    bodyweight: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
  },
  inclineBenchPress: {
    barbell: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    cable: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    dumbbell: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    smith: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
  },
  inclineChestFly: {
    cable: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Biceps Brachii", "Deltoid Anterior"],
      bodyParts: ["Chest"],
    },
    dumbbell: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Biceps Brachii", "Deltoid Anterior"],
      bodyParts: ["Chest"],
    },
  },
  inclineChestPress: {
    leverageMachine: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    band: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Deltoid Anterior", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    dumbbell: {
      targetMuscles: ["Pectoralis Major Clavicular Head"],
      synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
  },
  inclineCurl: {
    dumbbell: {
      targetMuscles: ["Biceps Brachii"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
  },
  inclineRow: {
    barbell: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Minor",
        "Tibialis Anterior",
        "Trapezius Middle Fibers",
        "Trapezius Upper Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
    dumbbell: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
  },
  invertedRow: {
    bodyweight: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
  },
  isoLateralChestPress: {},
  isoLateralRow: {},
  jackknifeSitUp: {
    bodyweight: {
      targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
      synergistMuscles: [
        "Adductor Brevis",
        "Adductor Longus",
        "Obliques",
        "Pectineous",
        "Quadriceps",
        "Sartorius",
        "Tensor Fasciae Latae",
      ],
      bodyParts: ["Waist"],
    },
  },
  jumpRope: {},
  jumpSquat: {
    barbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Gastrocnemius", "Soleus"],
      bodyParts: ["Thighs"],
    },
    bodyweight: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
  },
  jumpingJack: {},
  kettlebellSwing: {
    dumbbell: {
      targetMuscles: ["Deltoid Anterior", "Gluteus Maximus", "Hamstrings"],
      synergistMuscles: [
        "Adductor Magnus",
        "Deltoid Lateral",
        "Pectoralis Major Clavicular Head",
        "Quadriceps",
        "Serratus Anterior",
        "Soleus",
      ],
      bodyParts: ["Hips", "Shoulders", "Thighs"],
    },
    kettlebell: {
      targetMuscles: ["Deltoid Anterior", "Gluteus Maximus"],
      synergistMuscles: [
        "Adductor Magnus",
        "Hamstrings",
        "Pectoralis Major Clavicular Head",
        "Serratus Anterior",
        "Soleus",
      ],
      bodyParts: ["Hips", "Shoulders"],
    },
  },
  kettlebellTurkishGetUp: {},
  kippingPullUp: {},
  kneeRaise: {},
  kneelingPulldown: {
    band: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Posterior",
        "Infraspinatus",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Back"],
    },
  },
  kneestoElbows: {
    bodyweight: {
      targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
      synergistMuscles: ["Obliques", "Quadriceps", "Sartorius"],
      bodyParts: ["Waist"],
    },
  },
  latPulldown: {
    cable: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Posterior",
        "Obliques",
        "Pectoralis Major Sternal Head",
        "Teres Major",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Back"],
    },
  },
  lateralBoxJump: {},
  lateralRaise: {
    cable: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: ["Deltoid Anterior", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
    dumbbell: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: ["Deltoid Anterior", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
    leverageMachine: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: ["Deltoid Anterior", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
    band: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: ["Deltoid Anterior", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
    kettlebell: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: ["Deltoid Anterior", "Serratus Anterior"],
      bodyParts: ["Shoulders"],
    },
  },
  legExtension: {
    leverageMachine: {
      targetMuscles: ["Quadriceps"],
      synergistMuscles: [],
      bodyParts: ["Thighs"],
    },
    band: {
      targetMuscles: ["Quadriceps"],
      synergistMuscles: ["Tensor Fasciae Latae"],
      bodyParts: ["Thighs"],
    },
  },
  legPress: {
    smith: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    leverageMachine: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips", "Thighs"],
    },
  },
  lunge: {
    barbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
    bodyweight: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
    cable: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: [],
      bodyParts: ["Thighs"],
    },
  },
  lyingLegCurl: {
    leverageMachine: {
      targetMuscles: ["Hamstrings"],
      synergistMuscles: ["Gastrocnemius", "Soleus"],
      bodyParts: ["Thighs"],
    },
    band: {
      targetMuscles: ["Hamstrings"],
      synergistMuscles: ["Gastrocnemius", "Soleus"],
      bodyParts: ["Thighs"],
    },
  },
  mountainClimber: {},
  muscleUp: {
    bodyweight: {
      targetMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Deltoid Posterior",
        "Infraspinatus",
        "Latissimus Dorsi",
        "Pectoralis Major Sternal Head",
        "Teres Major",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
        "Triceps Brachii",
      ],
      synergistMuscles: [],
      bodyParts: ["Back"],
    },
  },
  obliqueCrunch: {
    bodyweight: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Rectus Abdominis"],
      bodyParts: ["Waist"],
    },
  },
  overheadPress: {
    barbell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
    dumbbell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
    ezbar: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
  },
  overheadSquat: {
    barbell: {
      targetMuscles: ["Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Gluteus Maximus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips", "Thighs"],
    },
  },
  pecDeck: {
    leverageMachine: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Pectoralis Major Clavicular Head", "Serratus Anterior"],
      bodyParts: ["Chest"],
    },
  },
  pendlayRow: {
    barbell: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior"],
      bodyParts: ["Back"],
    },
  },
  pistolSquat: {
    kettlebell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    leverageMachine: {
      targetMuscles: ["Splenius"],
      synergistMuscles: ["Levator Scapulae", "Sternocleidomastoid"],
      bodyParts: ["Thighs"],
    },
    bodyweight: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
  },
  plank: {
    bodyweight: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: [
        "Deltoid Anterior",
        "Gluteus Maximus",
        "Gluteus Medius",
        "Obliques",
        "Sartorius",
        "Tensor Fasciae Latae",
      ],
      bodyParts: ["Waist"],
    },
  },
  powerClean: {},
  powerSnatch: {},
  preacherCurl: {
    barbell: {
      targetMuscles: ["Brachialis"],
      synergistMuscles: ["Biceps Brachii", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    dumbbell: {
      targetMuscles: ["Brachialis"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    ezbar: {
      targetMuscles: ["Biceps Brachii"],
      synergistMuscles: ["Brachialis", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
    leverageMachine: {
      targetMuscles: ["Brachialis"],
      synergistMuscles: ["Biceps Brachii", "Brachioradialis"],
      bodyParts: ["Upper Arms"],
    },
  },
  pressUnder: {},
  pullUp: {
    leverageMachine: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Posterior",
        "Infraspinatus",
        "Teres Major",
        "Teres Minor",
        "Trapezius Middle Fibers",
        "Trapezius Upper Fibers",
      ],
      bodyParts: ["Back"],
    },
    bodyweight: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Posterior",
        "Infraspinatus",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Back"],
    },
    band: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Posterior",
        "Infraspinatus",
        "Levator Scapulae",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Back"],
    },
  },
  pullover: {
    barbell: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Pectoralis Major Clavicular Head",
        "Pectoralis Major Sternal Head",
        "Teres Major",
        "Triceps Brachii",
      ],
      bodyParts: ["Back"],
    },
    dumbbell: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Posterior", "Latissimus Dorsi", "Teres Major", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
  },
  pushPress: {
    bodyweight: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    kettlebell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Deltoid Lateral",
        "Pectoralis Major Clavicular Head",
        "Serratus Anterior",
      ],
      bodyParts: ["Shoulders"],
    },
  },
  pushUp: {
    bodyweight: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
    band: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Chest"],
    },
  },
  reverseCrunch: {
    bodyweight: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: ["Obliques"],
      bodyParts: ["Waist"],
    },
    cable: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: ["Obliques"],
      bodyParts: ["Waist"],
    },
  },
  reverseCurl: {
    barbell: {
      targetMuscles: ["Brachioradialis"],
      synergistMuscles: ["Biceps Brachii", "Brachialis"],
      bodyParts: ["Forearms"],
    },
    cable: {
      targetMuscles: ["Brachioradialis"],
      synergistMuscles: ["Biceps Brachii", "Brachialis"],
      bodyParts: ["Forearms"],
    },
    dumbbell: {
      targetMuscles: ["Brachioradialis"],
      synergistMuscles: ["Biceps Brachii", "Brachialis"],
      bodyParts: ["Forearms"],
    },
    band: {
      targetMuscles: ["Brachioradialis"],
      synergistMuscles: ["Biceps Brachii", "Brachialis"],
      bodyParts: ["Forearms"],
    },
  },
  reverseFly: {
    dumbbell: {
      targetMuscles: ["Deltoid Posterior"],
      synergistMuscles: [
        "Deltoid Lateral",
        "Infraspinatus",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
    leverageMachine: {
      targetMuscles: ["Deltoid Posterior"],
      synergistMuscles: [
        "Deltoid Lateral",
        "Infraspinatus",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
    band: {
      targetMuscles: ["Deltoid Posterior"],
      synergistMuscles: [
        "Deltoid Lateral",
        "Infraspinatus",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
  },
  reverseGripConcentrationCurl: {},
  reversePlank: {},
  romanianDeadlift: {
    barbell: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Adductor Magnus", "Hamstrings", "Quadriceps", "Soleus"],
      bodyParts: ["Hips"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Hamstrings"],
      synergistMuscles: ["Quadriceps", "Soleus"],
      bodyParts: ["Hips"],
    },
  },
  reverseHyperextension: {
    band: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Hips"],
    },
    leverageMachine: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Hips"],
    },
  },
  rowing: {},
  russianTwist: {
    bodyweight: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Iliopsoas"],
      bodyParts: ["Waist"],
    },
    dumbbell: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Rectus Abdominis"],
      bodyParts: ["Waist"],
    },
    cable: {
      targetMuscles: ["Obliques"],
      synergistMuscles: [],
      bodyParts: ["Waist"],
    },
  },
  seatedCalfRaise: {
    barbell: {
      targetMuscles: ["Gastrocnemius"],
      synergistMuscles: ["Soleus"],
      bodyParts: ["Calves"],
    },
    dumbbell: {
      targetMuscles: ["Gastrocnemius"],
      synergistMuscles: ["Soleus"],
      bodyParts: ["Calves"],
    },
    leverageMachine: {
      targetMuscles: ["Soleus"],
      synergistMuscles: ["Gastrocnemius"],
      bodyParts: ["Calves"],
    },
  },
  seatedLegCurl: {
    leverageMachine: {
      targetMuscles: ["Hamstrings"],
      synergistMuscles: ["Gastrocnemius", "Sartorius"],
      bodyParts: ["Thighs"],
    },
  },
  seatedLegPress: {
    leverageMachine: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips", "Thighs"],
    },
  },
  seatedOverheadPress: {
    barbell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
  },
  seatedPalmsUpWristCurl: {
    dumbbell: {
      targetMuscles: ["Wrist Flexors"],
      synergistMuscles: [],
      bodyParts: ["Forearms"],
    },
  },
  seatedRow: {
    cable: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
    band: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior"],
      bodyParts: ["Back"],
    },
    leverageMachine: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
  },
  seatedWideGripRow: {
    cable: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior"],
      bodyParts: ["Back"],
    },
  },
  shoulderPress: {
    cable: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
    dumbbell: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
    leverageMachine: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
    band: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
    smith: {
      targetMuscles: ["Deltoid Anterior"],
      synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
      bodyParts: ["Shoulders"],
    },
  },
  shrug: {
    barbell: {
      targetMuscles: ["Trapezius Upper Fibers"],
      synergistMuscles: ["Levator Scapulae", "Trapezius Middle Fibers"],
      bodyParts: ["Back"],
    },
    cable: {
      targetMuscles: ["Trapezius Upper Fibers"],
      synergistMuscles: ["Trapezius Middle Fibers"],
      bodyParts: ["Back"],
    },
    dumbbell: {
      targetMuscles: ["Trapezius Upper Fibers"],
      synergistMuscles: ["Trapezius Middle Fibers"],
      bodyParts: ["Back"],
    },
    leverageMachine: {
      targetMuscles: ["Trapezius Upper Fibers"],
      synergistMuscles: ["Levator Scapulae", "Trapezius Middle Fibers"],
      bodyParts: ["Back"],
    },
    band: {
      targetMuscles: ["Trapezius Upper Fibers"],
      synergistMuscles: ["Levator Scapulae", "Trapezius Middle Fibers"],
      bodyParts: ["Back"],
    },
    smith: {
      targetMuscles: ["Trapezius Upper Fibers"],
      synergistMuscles: ["Levator Scapulae", "Trapezius Middle Fibers"],
      bodyParts: ["Back"],
    },
  },
  sideBend: {
    cable: {
      targetMuscles: ["Obliques"],
      synergistMuscles: [],
      bodyParts: ["Waist"],
    },
    dumbbell: {
      targetMuscles: ["Obliques"],
      synergistMuscles: [],
      bodyParts: ["Waist"],
    },
    band: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Iliopsoas"],
      bodyParts: ["Waist"],
    },
  },
  sideCrunch: {
    bodyweight: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Iliopsoas"],
      bodyParts: ["Waist"],
    },
    band: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Iliopsoas"],
      bodyParts: ["Waist"],
    },
    cable: {
      targetMuscles: ["Obliques"],
      synergistMuscles: ["Iliopsoas"],
      bodyParts: ["Waist"],
    },
  },
  sideHipAbductor: {
    bodyweight: {
      targetMuscles: ["Gluteus Medius"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
    barbell: {
      targetMuscles: ["Gluteus Medius"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
    leverageMachine: {
      targetMuscles: ["Gluteus Medius", "Tensor Fasciae Latae"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
  },
  sideLyingClam: {
    bodyweight: {
      targetMuscles: ["Gluteus Medius"],
      synergistMuscles: ["Tensor Fasciae Latae"],
      bodyParts: ["Hips"],
    },
  },
  sidePlank: {
    bodyweight: {
      targetMuscles: ["Obliques"],
      synergistMuscles: [],
      bodyParts: ["Waist"],
    },
  },
  singleLegBridge: {
    bodyweight: {
      targetMuscles: ["Gluteus Maximus", "Rectus Abdominis"],
      synergistMuscles: ["Deltoid Anterior", "Hamstrings", "Obliques", "Serratus Anterior", "Tensor Fasciae Latae"],
      bodyParts: ["Hips"],
    },
  },
  singleLegDeadlift: {
    dumbbell: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Hips"],
    },
    bodyweight: {
      targetMuscles: ["Deltoid Anterior", "Erector Spinae", "Gluteus Maximus", "Quadriceps"],
      synergistMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Hamstrings",
        "Pectoralis Major Clavicular Head",
      ],
      bodyParts: ["Hips", "Shoulders", "Thighs"],
    },
  },
  singleLegGluteBridgeBench: {
    bodyweight: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
  },
  singleLegGluteBridgeStraight: {
    bodyweight: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
  },
  singleLegGluteBridgeBentKnee: {
    bodyweight: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: [],
      bodyParts: ["Hips"],
    },
  },
  singleLegHipThrust: {
    barbell: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
    bodyweight: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
    leverageMachine: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Quadriceps"],
      bodyParts: ["Hips"],
    },
  },
  sitUp: {
    bodyweight: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: ["Iliopsoas", "Obliques"],
      bodyParts: ["Waist"],
    },
    kettlebell: {
      targetMuscles: ["Rectus Abdominis"],
      synergistMuscles: ["Obliques"],
      bodyParts: ["Waist"],
    },
  },
  skullcrusher: {
    barbell: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
    cable: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
    dumbbell: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
    ezbar: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
  },
  snatch: {
    dumbbell: {
      targetMuscles: ["Deltoid Anterior", "Erector Spinae", "Gluteus Maximus", "Quadriceps"],
      synergistMuscles: [
        "Adductor Magnus",
        "Deltoid Lateral",
        "Gastrocnemius",
        "Serratus Anterior",
        "Soleus",
        "Triceps Brachii",
      ],
      bodyParts: ["Hips", "Shoulders", "Thighs"],
    },
  },
  snatchPull: {},
  splitJerk: {},
  squat: {
    barbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
    bodyweight: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
    smith: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    leverageMachine: {
      targetMuscles: ["Pectoralis Major Sternal Head"],
      synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
      bodyParts: ["Thighs"],
    },
  },
  squatRow: {
    band: {
      targetMuscles: [
        "Gluteus Maximus",
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: [
        "Adductor Magnus",
        "Deltoid Posterior",
        "Pectoralis Major Sternal Head",
        "Quadriceps",
        "Soleus",
      ],
      bodyParts: ["Back"],
    },
  },
  standingCalfRaise: {
    barbell: {
      targetMuscles: ["Gastrocnemius"],
      synergistMuscles: ["Soleus"],
      bodyParts: ["Calves"],
    },
    dumbbell: {
      targetMuscles: ["Gastrocnemius"],
      synergistMuscles: ["Soleus"],
      bodyParts: ["Calves"],
    },
    leverageMachine: {
      targetMuscles: ["Gastrocnemius"],
      synergistMuscles: ["Soleus"],
      bodyParts: ["Calves"],
    },
    bodyweight: {
      targetMuscles: ["Gastrocnemius"],
      synergistMuscles: ["Soleus"],
      bodyParts: ["Calves"],
    },
    cable: {
      targetMuscles: ["Gastrocnemius"],
      synergistMuscles: ["Soleus"],
      bodyParts: ["Calves"],
    },
  },
  stepUp: {
    barbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
    dumbbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Gastrocnemius", "Soleus"],
      bodyParts: ["Hips"],
    },
    bodyweight: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Gastrocnemius", "Soleus"],
      bodyParts: ["Hips"],
    },
    band: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Adductor Magnus", "Gastrocnemius", "Quadriceps", "Soleus"],
      bodyParts: ["Hips"],
    },
  },
  stiffLegDeadlift: {
    barbell: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Hips"],
    },
    dumbbell: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Hips"],
    },
    band: {
      targetMuscles: ["Gluteus Maximus"],
      synergistMuscles: ["Adductor Magnus", "Erector Spinae", "Hamstrings"],
      bodyParts: ["Hips"],
    },
  },
  straightLegDeadlift: {
    barbell: {
      targetMuscles: ["Erector Spinae", "Hamstrings"],
      synergistMuscles: ["Adductor Magnus", "Gluteus Maximus"],
      bodyParts: ["Thighs"],
    },
    dumbbell: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Waist"],
    },
    band: {
      targetMuscles: ["Erector Spinae"],
      synergistMuscles: ["Adductor Magnus", "Gluteus Maximus", "Hamstrings"],
      bodyParts: ["Back"],
    },
    kettlebell: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Hamstrings", "Soleus"],
      bodyParts: ["Hips"],
    },
  },
  sumoDeadlift: {
    barbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus", "Tensor Fasciae Latae"],
      bodyParts: ["Hips"],
    },
  },
  sumoDeadliftHighPull: {
    barbell: {
      targetMuscles: ["Deltoid Lateral", "Gluteus Maximus", "Quadriceps"],
      synergistMuscles: [
        "Adductor Magnus",
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Deltoid Anterior",
        "Gastrocnemius",
        "Infraspinatus",
        "Soleus",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
  },
  superman: {
    bodyweight: {
      targetMuscles: ["Erector Spinae"],
      synergistMuscles: ["Gluteus Maximus", "Hamstrings"],
      bodyParts: ["Waist"],
    },
    dumbbell: {
      targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
      synergistMuscles: ["Hamstrings"],
      bodyParts: ["Hips"],
    },
  },
  tBarRow: {
    leverageMachine: {
      targetMuscles: [
        "Infraspinatus",
        "Latissimus Dorsi",
        "Teres Major",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      synergistMuscles: ["Brachialis", "Brachioradialis", "Deltoid Posterior", "Pectoralis Major Sternal Head"],
      bodyParts: ["Back"],
    },
  },
  thruster: {
    barbell: {
      targetMuscles: ["Deltoid Anterior", "Gluteus Maximus", "Quadriceps"],
      synergistMuscles: [
        "Adductor Magnus",
        "Deltoid Lateral",
        "Pectoralis Major Clavicular Head",
        "Serratus Anterior",
        "Soleus",
        "Triceps Brachii",
      ],
      bodyParts: ["Shoulders", "Thighs"],
    },
  },
  toesToBar: {
    bodyweight: {
      targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
      synergistMuscles: ["Obliques", "Quadriceps", "Sartorius", "Tensor Fasciae Latae"],
      bodyParts: ["Waist"],
    },
  },
  torsoRotation: {},
  trapBarDeadlift: {
    trapbar: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Thighs"],
    },
  },
  tricepsDip: {
    bodyweight: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [
        "Deltoid Anterior",
        "Latissimus Dorsi",
        "Levator Scapulae",
        "Pectoralis Major Clavicular Head",
        "Pectoralis Major Sternal Head",
      ],
      bodyParts: ["Upper Arms"],
    },
    leverageMachine: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: ["Latissimus Dorsi", "Pectoralis Major Sternal Head", "Teres Major"],
      bodyParts: ["Upper Arms"],
    },
  },
  tricepsExtension: {
    barbell: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
    cable: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
    band: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
    dumbbell: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
  },
  tricepsPushdown: {
    cable: {
      targetMuscles: ["Triceps Brachii"],
      synergistMuscles: [],
      bodyParts: ["Upper Arms"],
    },
  },
  uprightRow: {
    barbell: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Deltoid Anterior",
        "Infraspinatus",
        "Serratus Anterior",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
    cable: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: [
        "Brachialis",
        "Brachioradialis",
        "Deltoid Anterior",
        "Infraspinatus",
        "Serratus Anterior",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
    dumbbell: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Deltoid Anterior",
        "Infraspinatus",
        "Serratus Anterior",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
    band: {
      targetMuscles: ["Deltoid Lateral"],
      synergistMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Deltoid Anterior",
        "Infraspinatus",
        "Serratus Anterior",
        "Teres Minor",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Shoulders"],
    },
  },
  vUp: {
    bodyweight: {
      targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
      synergistMuscles: [
        "Adductor Brevis",
        "Adductor Longus",
        "Obliques",
        "Pectineous",
        "Quadriceps",
        "Sartorius",
        "Tensor Fasciae Latae",
      ],
      bodyParts: ["Waist"],
    },
    band: {
      targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
      synergistMuscles: [
        "Adductor Brevis",
        "Adductor Longus",
        "Obliques",
        "Pectineous",
        "Quadriceps",
        "Sartorius",
        "Tensor Fasciae Latae",
      ],
      bodyParts: ["Waist"],
    },
    dumbbell: {
      targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
      synergistMuscles: ["Obliques", "Quadriceps", "Sartorius"],
      bodyParts: ["Waist"],
    },
  },
  widePullUp: {
    bodyweight: {
      targetMuscles: ["Latissimus Dorsi"],
      synergistMuscles: [
        "Biceps Brachii",
        "Brachialis",
        "Brachioradialis",
        "Teres Major",
        "Trapezius Lower Fibers",
        "Trapezius Middle Fibers",
      ],
      bodyParts: ["Back"],
    },
  },
  wristRoller: {
    bodyweight: {
      targetMuscles: ["Wrist Extensors", "Wrist Flexors"],
      synergistMuscles: [],
      bodyParts: ["Forearms"],
    },
  },
  zercherSquat: {
    barbell: {
      targetMuscles: ["Gluteus Maximus", "Quadriceps"],
      synergistMuscles: ["Adductor Magnus", "Soleus"],
      bodyParts: ["Hips"],
    },
  },
};

export function equipmentToBarKey(equipment?: IEquipment): IBarKey | undefined {
  switch (equipment) {
    case "barbell":
      return "barbell";
    case "dumbbell":
      return "dumbbell";
    case "ezbar":
      return "ezbar";
    default:
      return undefined;
  }
}

export function equipmentName(equipment?: IEquipment): string {
  switch (equipment) {
    case "barbell":
      return "Barbell";
    case "cable":
      return "Cable";
    case "dumbbell":
      return "Dumbbell";
    case "smith":
      return "Smith Machine";
    case "band":
      return "Band";
    case "kettlebell":
      return "Kettlebell";
    case "bodyweight":
      return "Bodyweight";
    case "leverageMachine":
      return "Leverage Machine";
    case "medicineball":
      return "Medicine Ball";
    case "ezbar":
      return "EZ Bar";
    case "trapbar":
      return "Trap Bar";
    default:
      return "Bodyweight";
  }
}

function getMetadata(id: IExerciseId): Partial<Record<IEquipment, IMetaExercises>> {
  return metadata[id] || {};
}

export type IExercise = {
  id: IExerciseId;
  name: string;
  defaultWarmup?: number;
  equipment?: IEquipment;
  defaultEquipment?: IEquipment;
};

export function warmupValues(): Partial<Record<number, IProgramExerciseWarmupSet[]>> {
  return {
    10: [
      {
        reps: 5,
        threshold: Weight.build(60, "lb"),
        value: 0.3,
      },
      {
        reps: 5,
        threshold: Weight.build(30, "lb"),
        value: 0.5,
      },
      {
        reps: 5,
        threshold: Weight.build(10, "lb"),
        value: 0.8,
      },
    ],
    45: [
      {
        reps: 5,
        threshold: Weight.build(120, "lb"),
        value: 0.3,
      },
      {
        reps: 5,
        threshold: Weight.build(90, "lb"),
        value: 0.5,
      },
      {
        reps: 5,
        threshold: Weight.build(45, "lb"),
        value: 0.8,
      },
    ],
    95: [
      {
        reps: 5,
        threshold: Weight.build(150, "lb"),
        value: 0.3,
      },
      {
        reps: 5,
        threshold: Weight.build(125, "lb"),
        value: 0.5,
      },
      {
        reps: 5,
        threshold: Weight.build(95, "lb"),
        value: 0.8,
      },
    ],
  };
}

function warmup45(weight: IWeight, settings: ISettings, equipment?: IEquipment): ISet[] {
  return warmup(warmupValues()[45] || [])(weight, settings, equipment);
}

function warmup95(weight: IWeight, settings: ISettings, equipment?: IEquipment): ISet[] {
  return warmup(warmupValues()[95] || [])(weight, settings, equipment);
}

function warmup10(weight: IWeight, settings: ISettings, equipment?: IEquipment): ISet[] {
  return warmup(warmupValues()[10] || [])(weight, settings, equipment);
}

function warmup(
  programExerciseWarmupSets: IProgramExerciseWarmupSet[]
): (weight: IWeight, settings: ISettings, equipment?: IEquipment) => ISet[] {
  return (weight: IWeight, settings: ISettings, equipment?: IEquipment): ISet[] => {
    const bar = equipmentToBarKey(equipment);
    return programExerciseWarmupSets.reduce<ISet[]>((memo, programExerciseWarmupSet) => {
      if (Weight.gt(weight, programExerciseWarmupSet.threshold)) {
        const value = programExerciseWarmupSet.value;
        const warmupWeight = Weight.roundConvertTo(
          typeof value === "number" ? Weight.multiply(weight, value) : value,
          settings,
          bar
        );
        memo.push({ reps: programExerciseWarmupSet.reps, weight: warmupWeight });
      }
      return memo;
    }, []);
  };
}

function warmupEmpty(weight: IWeight): ISet[] {
  return [];
}

function maybeGetExercise(id: IExerciseId, customExercises: IAllCustomExercises): IExercise | undefined {
  const custom = customExercises[id];
  return custom != null ? { ...custom, defaultWarmup: 45 } : exercises[id];
}

function getExercise(id: IExerciseId, customExercises: IAllCustomExercises): IExercise {
  const exercise = maybeGetExercise(id, customExercises);
  return exercise != null ? exercise : exercises.squat;
}

export namespace Exercise {
  export function exists(name: string, customExercises: IAllCustomExercises): boolean {
    let exercise = ObjectUtils.keys(exercises).filter((k) => exercises[k].name === name)[0];
    if (exercise == null) {
      exercise = ObjectUtils.keys(customExercises).filter(
        (k) => !customExercises[k]!.isDeleted && customExercises[k]!.name === name
      )[0];
    }
    return !!exercise;
  }

  export function findById(id: IExerciseId, customExercises: IAllCustomExercises): IExercise | undefined {
    return maybeGetExercise(id, customExercises);
  }

  export function get(type: IExerciseType, customExercises: IAllCustomExercises): IExercise {
    const exercise = getExercise(type.id, customExercises);
    return { ...exercise, equipment: type.equipment };
  }

  export function find(type: IExerciseType, customExercises: IAllCustomExercises): IExercise | undefined {
    const exercise = maybeGetExercise(type.id, customExercises);
    return exercise ? { ...exercise, equipment: type.equipment } : undefined;
  }

  export function getById(id: IExerciseId, customExercises: IAllCustomExercises): IExercise {
    const exercise = getExercise(id, customExercises);
    return { ...exercise, equipment: exercise.defaultEquipment };
  }

  export function getByIds(ids: IExerciseId[], customExercises: IAllCustomExercises): IExercise[] {
    return ids.map((id) => {
      const exercise = getExercise(id, customExercises);
      return { ...exercise, equipment: exercise.defaultEquipment };
    });
  }

  export function all(customExercises: IAllCustomExercises): IExercise[] {
    return ObjectUtils.keys(customExercises)
      .map((id) => getExercise(id, customExercises))
      .concat(ObjectUtils.keys(exercises).map((k) => ({ ...exercises[k], equipment: exercises[k].defaultEquipment })));
  }

  export function eq(a: IExerciseType, b: IExerciseType): boolean {
    return a.id === b.id && (a.equipment || "bodyweight") === (b.equipment || "bodyweight");
  }

  export function getWarmupSets(
    exercise: IExerciseType,
    weight: IWeight,
    settings: ISettings,
    programExerciseWarmupSets?: IProgramExerciseWarmupSet[]
  ): ISet[] {
    const ex = get(exercise, settings.exercises);
    if (programExerciseWarmupSets != null) {
      return warmup(programExerciseWarmupSets)(weight, settings, exercise.equipment);
    } else {
      let warmupSets = warmupEmpty(weight);
      if (ex.defaultWarmup === 10) {
        warmupSets = warmup10(weight, settings, exercise.equipment);
      } else if (ex.defaultWarmup === 45) {
        warmupSets = warmup45(weight, settings, exercise.equipment);
      } else if (ex.defaultWarmup === 95) {
        warmupSets = warmup95(weight, settings, exercise.equipment);
      }
      return warmupSets;
    }
  }

  export function sortedEquipments(id: IExerciseId): IEquipment[] {
    const sorted = [...equipments];
    sorted.sort((a, b) => {
      const eqs = ObjectUtils.keys(getMetadata(id));
      if (eqs.indexOf(a) !== -1 && eqs.indexOf(b) === -1) {
        return -1;
      } else if (eqs.indexOf(a) === -1 && eqs.indexOf(b) !== -1) {
        return 1;
      } else {
        return a.localeCompare(b);
      }
    });
    return sorted;
  }

  export function targetMuscles(type: IExerciseType, customExercises: IAllCustomExercises): IMuscle[] {
    const customExercise = customExercises[type.id];
    if (customExercise) {
      return customExercise.meta.targetMuscles;
    } else {
      const meta = getMetadata(type.id)[type.equipment || "bodyweight"];
      return meta != null ? meta.targetMuscles : [];
    }
  }

  export function synergistMuscles(type: IExerciseType, customExercises: IAllCustomExercises): IMuscle[] {
    const customExercise = customExercises[type.id];
    if (customExercise) {
      return customExercise.meta.synergistMuscles;
    } else {
      const meta = getMetadata(type.id)[type.equipment || "bodyweight"];
      return meta != null ? meta.synergistMuscles : [];
    }
  }

  export function toKey(type: IExerciseType): string {
    return `${type.id}_${type.equipment || "bodyweight"}`;
  }

  export function fromKey(type: string): IExerciseType {
    const [id, equipment] = type.split("_");
    return { id: id as IExerciseId, equipment: (equipment || "bodyweight") as IEquipment };
  }

  export function defaultEquipment(type: IExerciseId, customExercises: IAllCustomExercises): IEquipment | undefined {
    const priorities: Record<IEquipment, IEquipment[]> = {
      barbell: ["ezbar", "trapbar", "dumbbell", "kettlebell"],
      cable: ["band", "leverageMachine"],
      dumbbell: ["barbell", "kettlebell", "bodyweight"],
      smith: ["leverageMachine", "dumbbell", "barbell", "kettlebell", "cable"],
      band: ["cable", "bodyweight", "leverageMachine", "smith"],
      kettlebell: ["dumbbell", "barbell", "cable"],
      bodyweight: ["cable", "dumbbell", "barbell", "band"],
      leverageMachine: ["smith", "cable", "dumbbell", "barbell", "kettlebell"],
      medicineball: ["bodyweight", "cable"],
      ezbar: ["barbell", "dumbbell", "cable"],
      trapbar: ["barbell", "dumbbell", "cable"],
    };

    const exercise = getById(type, customExercises);
    const bar = exercise.defaultEquipment || "bodyweight";
    let equipment: IEquipment | undefined = ObjectUtils.keys(getMetadata(type)).find((b) => b === bar);
    equipment = equipment || priorities[bar].find((eqp) => ObjectUtils.keys(getMetadata(type)).indexOf(eqp) !== -1);
    equipment = equipment || ObjectUtils.keys(getMetadata(type))[0];
    return equipment;
  }

  export function similar(type: IExerciseType, customExercises: IAllCustomExercises): [IExercise, number][] {
    const tm = Exercise.targetMuscles(type, customExercises);
    const sm = Exercise.synergistMuscles(type, customExercises);
    if (tm.length === 0 && sm.length === 0) {
      return [];
    }
    const rated = Exercise.all(customExercises).map<[IExercise, number]>((e) => {
      const etm = Exercise.targetMuscles(e, customExercises);
      const esm = Exercise.synergistMuscles(e, customExercises);
      let rating = 0;
      if (e.id === type.id || (etm.length === 0 && esm.length === 0)) {
        rating = -Infinity;
      } else {
        for (const muscle of etm) {
          if (tm.indexOf(muscle) !== -1) {
            rating += 50;
          } else {
            rating -= 5;
          }
          if (sm.indexOf(muscle) !== -1) {
            rating += 20;
          }
        }
        for (const muscle of tm) {
          if (etm.indexOf(muscle) === -1) {
            rating -= 5;
          }
        }
        for (const muscle of esm) {
          if (sm.indexOf(muscle) !== -1) {
            rating += 30;
          } else {
            rating -= 5;
          }
          if (tm.indexOf(muscle) !== -1) {
            rating += 10;
          }
        }
        for (const muscle of sm) {
          if (esm.indexOf(muscle) === -1) {
            rating -= 5;
          }
        }
        if (e.defaultEquipment === "cable" || e.defaultEquipment === "leverageMachine") {
          rating -= 20;
        }
      }
      return [e, rating];
    });
    rated.sort((a, b) => b[1] - a[1]);
    return rated.filter(([, r]) => r > 0);
  }
}
