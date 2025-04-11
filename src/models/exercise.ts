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
  IUnit,
  ICustomExercise,
  IScreenMuscle,
  IAllEquipment,
  screenMuscles,
} from "../types";
import { Muscle } from "./muscle";
import { StringUtils } from "../utils/string";
import { UidFactory } from "../utils/generator";
import { CollectionUtils } from "../utils/collection";
import { ExerciseImageUtils } from "./exerciseImage";
import { Equipment } from "./equipment";

export const exercises: Record<IExerciseId, IExercise> = {
  abWheel: {
    id: "abWheel",
    name: "Ab Wheel",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  arnoldPress: {
    id: "arnoldPress",
    name: "Arnold Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  aroundTheWorld: {
    id: "aroundTheWorld",
    name: "Around The World",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["core"],
    startingWeightLb: { value: 15, unit: "lb" },
    startingWeightKg: { value: 5, unit: "kg" },
  },
  backExtension: {
    id: "backExtension",
    name: "Back Extension",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "core"],
    startingWeightLb: { value: 50, unit: "lb" },
    startingWeightKg: { value: 22.5, unit: "kg" },
  },
  ballSlams: {
    id: "ballSlams",
    name: "Ball Slams",
    defaultEquipment: "medicineball",
    types: ["core", "upper"],
    startingWeightLb: { value: 10, unit: "lb" },
    startingWeightKg: { value: 4.5, unit: "kg" },
  },
  battleRopes: {
    id: "battleRopes",
    name: "Battle Ropes",
    defaultEquipment: "bodyweight",
    types: ["upper", "core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  behindTheNeckPress: {
    id: "behindTheNeckPress",
    name: "Behind The Neck Press",
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  benchDip: {
    id: "benchDip",
    name: "Bench Dip",
    defaultEquipment: "bodyweight",
    types: ["upper", "push"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  benchPress: {
    id: "benchPress",
    name: "Bench Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 135, unit: "lb" },
    startingWeightKg: { value: 60, unit: "kg" },
  },
  benchPressCloseGrip: {
    id: "benchPressCloseGrip",
    name: "Bench Press Close Grip",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 115, unit: "lb" },
    startingWeightKg: { value: 50, unit: "kg" },
  },
  benchPressWideGrip: {
    id: "benchPressWideGrip",
    name: "Bench Press Wide Grip",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 135, unit: "lb" },
    startingWeightKg: { value: 60, unit: "kg" },
  },
  bentOverOneArmRow: {
    id: "bentOverOneArmRow",
    name: "Bent Over One Arm Row",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  bentOverRow: {
    id: "bentOverRow",
    name: "Bent Over Row",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 95, unit: "lb" },
    startingWeightKg: { value: 42.5, unit: "kg" },
  },
  bicepCurl: {
    id: "bicepCurl",
    name: "Bicep Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  bicycleCrunch: {
    id: "bicycleCrunch",
    name: "Bicycle Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  boxJump: {
    id: "boxJump",
    name: "Box Jump",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  boxSquat: {
    id: "boxSquat",
    name: "Box Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 155, unit: "lb" },
    startingWeightKg: { value: 70, unit: "kg" },
  },
  bulgarianSplitSquat: {
    id: "bulgarianSplitSquat",
    name: "Bulgarian Split Squat",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  burpee: {
    id: "burpee",
    name: "Burpee",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "lower", "core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  cableCrossover: {
    id: "cableCrossover",
    name: "Cable Crossover",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  cableCrunch: {
    id: "cableCrunch",
    name: "Cable Crunch",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["core"],
    startingWeightLb: { value: 50, unit: "lb" },
    startingWeightKg: { value: 22.5, unit: "kg" },
  },
  cableKickback: {
    id: "cableKickback",
    name: "Cable Kickback",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "push"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  cablePullThrough: {
    id: "cablePullThrough",
    name: "Cable Pull Through",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["lower", "pull"],
    startingWeightLb: { value: 70, unit: "lb" },
    startingWeightKg: { value: 30, unit: "kg" },
  },
  cableTwist: {
    id: "cableTwist",
    name: "Cable Twist",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["core"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  calfPressOnLegPress: {
    id: "calfPressOnLegPress",
    name: "Calf Press on Leg Press",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 150, unit: "lb" },
    startingWeightKg: { value: 67.5, unit: "kg" },
  },
  calfPressOnSeatedLegPress: {
    id: "calfPressOnSeatedLegPress",
    name: "Calf Press on Seated Leg Press",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 120, unit: "lb" },
    startingWeightKg: { value: 53.75, unit: "kg" },
  },
  chestDip: {
    id: "chestDip",
    name: "Chest Dip",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "push"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  chestFly: {
    id: "chestFly",
    name: "Chest Fly",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  chestPress: {
    id: "chestPress",
    name: "Chest Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  chestSupportedRow: {
    id: "chestSupportedRow",
    name: "Chest-Supported Row",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 85, unit: "lb" },
    startingWeightKg: { value: 37.5, unit: "kg" },
  },
  chinUp: {
    id: "chinUp",
    name: "Chin Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  clean: {
    id: "clean",
    name: "Clean",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "push"],
    startingWeightLb: { value: 95, unit: "lb" },
    startingWeightKg: { value: 42.5, unit: "kg" },
  },
  cleanandJerk: {
    id: "cleanandJerk",
    name: "Clean and Jerk",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "push"],
    startingWeightLb: { value: 95, unit: "lb" },
    startingWeightKg: { value: 42.5, unit: "kg" },
  },
  concentrationCurl: {
    id: "concentrationCurl",
    name: "Concentration Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  crossBodyCrunch: {
    id: "crossBodyCrunch",
    name: "Cross Body Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  crunch: {
    id: "crunch",
    name: "Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  cycling: {
    id: "cycling",
    name: "Cycling",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  deadlift: {
    id: "deadlift",
    name: "Deadlift",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
    types: ["lower", "pull"],
    startingWeightLb: { value: 185, unit: "lb" },
    startingWeightKg: { value: 82.5, unit: "kg" },
  },
  deadliftHighPull: {
    id: "deadliftHighPull",
    name: "Deadlift High Pull",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "pull"],
    startingWeightLb: { value: 75, unit: "lb" },
    startingWeightKg: { value: 32.5, unit: "kg" },
  },
  declineBenchPress: {
    id: "declineBenchPress",
    name: "Decline Bench Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 125, unit: "lb" },
    startingWeightKg: { value: 55, unit: "kg" },
  },
  declineCrunch: {
    id: "declineCrunch",
    name: "Decline Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  deficitDeadlift: {
    id: "deficitDeadlift",
    name: "Deficit Deadlift",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
    types: ["lower", "pull"],
    startingWeightLb: { value: 165, unit: "lb" },
    startingWeightKg: { value: 75, unit: "kg" },
  },
  ellipticalMachine: {
    id: "ellipticalMachine",
    name: "Elliptical Machine",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  facePull: {
    id: "facePull",
    name: "Face Pull",
    defaultWarmup: 10,
    defaultEquipment: "band",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  flatKneeRaise: {
    id: "flatKneeRaise",
    name: "Flat Knee Raise",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  flatLegRaise: {
    id: "flatLegRaise",
    name: "Flat Leg Raise",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  frontRaise: {
    id: "frontRaise",
    name: "Front Raise",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 15, unit: "lb" },
    startingWeightKg: { value: 5, unit: "kg" },
  },
  frontSquat: {
    id: "frontSquat",
    name: "Front Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 95, unit: "lb" },
    startingWeightKg: { value: 42.5, unit: "kg" },
  },
  gobletSquat: {
    id: "gobletSquat",
    name: "Goblet Squat",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 35, unit: "lb" },
    startingWeightKg: { value: 15, unit: "kg" },
  },
  goodMorning: {
    id: "goodMorning",
    name: "Good Morning",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  gluteBridge: {
    id: "gluteBridge",
    name: "Glute Bridge",
    defaultWarmup: 45,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 35, unit: "lb" },
    startingWeightKg: { value: 15, unit: "kg" },
  },
  gluteBridgeMarch: {
    id: "gluteBridgeMarch",
    name: "Glute Bridge March",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  gluteKickback: {
    id: "gluteKickback",
    name: "Glute Kickback",
    defaultWarmup: 45,
    defaultEquipment: "cable",
    types: ["lower", "legs"],
    startingWeightLb: { value: 35, unit: "lb" },
    startingWeightKg: { value: 15, unit: "kg" },
  },
  hackSquat: {
    id: "hackSquat",
    name: "Hack Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 115, unit: "lb" },
    startingWeightKg: { value: 50, unit: "kg" },
  },
  hammerCurl: {
    id: "hammerCurl",
    name: "Hammer Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  handstandPushUp: {
    id: "handstandPushUp",
    name: "Handstand Push Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "push"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  hangClean: {
    id: "hangClean",
    name: "Hang Clean",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "pull"],
    startingWeightLb: { value: 85, unit: "lb" },
    startingWeightKg: { value: 37.5, unit: "kg" },
  },
  hangSnatch: {
    id: "hangSnatch",
    name: "Hang Snatch",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "pull"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  hangingLegRaise: {
    id: "hangingLegRaise",
    name: "Hanging Leg Raise",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  highKneeSkips: {
    id: "highKneeSkips",
    name: "High Knee Skips",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  highRow: {
    id: "highRow",
    name: "High Row",
    defaultWarmup: 45,
    defaultEquipment: "leverageMachine",
    types: ["upper", "pull"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  hipAbductor: {
    id: "hipAbductor",
    name: "Hip Abductor",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 60, unit: "lb" },
    startingWeightKg: { value: 26.25, unit: "kg" },
  },
  hipAdductor: {
    id: "hipAdductor",
    name: "Hip Adductor",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 60, unit: "lb" },
    startingWeightKg: { value: 26.25, unit: "kg" },
  },
  hipThrust: {
    id: "hipThrust",
    name: "Hip Thrust",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 95, unit: "lb" },
    startingWeightKg: { value: 42.5, unit: "kg" },
  },
  inclineBenchPress: {
    id: "inclineBenchPress",
    name: "Incline Bench Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 115, unit: "lb" },
    startingWeightKg: { value: 50, unit: "kg" },
  },
  inclineBenchPressWideGrip: {
    id: "inclineBenchPressWideGrip",
    name: "Incline Bench Press Wide Grip",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 110, unit: "lb" },
    startingWeightKg: { value: 50, unit: "kg" },
  },
  inclineChestFly: {
    id: "inclineChestFly",
    name: "Incline Chest Fly",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  inclineChestPress: {
    id: "inclineChestPress",
    name: "Incline Chest Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  inclineCurl: {
    id: "inclineCurl",
    name: "Incline Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  inclineRow: {
    id: "inclineRow",
    name: "Incline Row",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  invertedRow: {
    id: "invertedRow",
    name: "Inverted Row",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  isoLateralChestPress: {
    id: "isoLateralChestPress",
    name: "Iso-Lateral Chest Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  isoLateralRow: {
    id: "isoLateralRow",
    name: "Iso-Lateral Row",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  jackknifeSitUp: {
    id: "jackknifeSitUp",
    name: "Jackknife Sit Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  jumpRope: {
    id: "jumpRope",
    name: "Jump Rope",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  jumpSquat: {
    id: "jumpSquat",
    name: "Jump Squat",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  jumpingJack: {
    id: "jumpingJack",
    name: "Jumping Jack",
    defaultWarmup: 10,
    defaultEquipment: undefined,
    types: ["upper", "lower"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  kettlebellSwing: {
    id: "kettlebellSwing",
    name: "Kettlebell Swing",
    defaultWarmup: 10,
    defaultEquipment: "kettlebell",
    types: ["upper", "lower", "core"],
    startingWeightLb: { value: 35, unit: "lb" },
    startingWeightKg: { value: 16, unit: "kg" },
  },
  kettlebellTurkishGetUp: {
    id: "kettlebellTurkishGetUp",
    name: "Kettlebell Turkish Get Up",
    defaultWarmup: 10,
    defaultEquipment: "kettlebell",
    types: ["upper", "lower", "core"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 8, unit: "kg" },
  },
  kippingPullUp: {
    id: "kippingPullUp",
    name: "Kipping Pull Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  kneeRaise: {
    id: "kneeRaise",
    name: "Knee Raise",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  kneelingPulldown: {
    id: "kneelingPulldown",
    name: "Kneeling Pulldown",
    defaultWarmup: 10,
    defaultEquipment: "band",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  kneestoElbows: {
    id: "kneestoElbows",
    name: "Knees to Elbows",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  latPulldown: {
    id: "latPulldown",
    name: "Lat Pulldown",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 70, unit: "lb" },
    startingWeightKg: { value: 30, unit: "kg" },
  },
  lateralBoxJump: {
    id: "lateralBoxJump",
    name: "Lateral Box Jump",
    defaultWarmup: 10,
    defaultEquipment: undefined,
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  lateralRaise: {
    id: "lateralRaise",
    name: "Lateral Raise",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 15, unit: "lb" },
    startingWeightKg: { value: 5, unit: "kg" },
  },
  legsUpBenchPress: {
    id: "legsUpBenchPress",
    name: "Legs Up Bench Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 135, unit: "lb" },
    startingWeightKg: { value: 60, unit: "kg" },
  },
  legCurl: {
    id: "legCurl",
    name: "Leg Curl",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 60, unit: "lb" },
    startingWeightKg: { value: 26.25, unit: "kg" },
  },
  legExtension: {
    id: "legExtension",
    name: "Leg Extension",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 60, unit: "lb" },
    startingWeightKg: { value: 26.25, unit: "kg" },
  },
  legPress: {
    id: "legPress",
    name: "Leg Press",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 250, unit: "lb" },
    startingWeightKg: { value: 112.5, unit: "kg" },
  },
  lunge: {
    id: "lunge",
    name: "Lunge",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 75, unit: "lb" },
    startingWeightKg: { value: 32.5, unit: "kg" },
  },
  lyingBicepCurl: {
    id: "lyingBicepCurl",
    name: "Lying Bicep Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 15, unit: "lb" },
    startingWeightKg: { value: 5, unit: "kg" },
  },
  lyingLegCurl: {
    id: "lyingLegCurl",
    name: "Lying Leg Curl",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 60, unit: "lb" },
    startingWeightKg: { value: 26.25, unit: "kg" },
  },
  mountainClimber: {
    id: "mountainClimber",
    name: "Mountain Climber",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core", "lower"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  muscleUp: {
    id: "muscleUp",
    name: "Muscle Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  obliqueCrunch: {
    id: "obliqueCrunch",
    name: "Oblique Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  overheadPress: {
    id: "overheadPress",
    name: "Overhead Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 75, unit: "lb" },
    startingWeightKg: { value: 32.5, unit: "kg" },
  },
  overheadSquat: {
    id: "overheadSquat",
    name: "Overhead Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 55, unit: "lb" },
    startingWeightKg: { value: 25, unit: "kg" },
  },
  pecDeck: {
    id: "pecDeck",
    name: "Pec Deck",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["upper", "push"],
    startingWeightLb: { value: 50, unit: "lb" },
    startingWeightKg: { value: 22.5, unit: "kg" },
  },
  pendlayRow: {
    id: "pendlayRow",
    name: "Pendlay Row",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 95, unit: "lb" },
    startingWeightKg: { value: 42.5, unit: "kg" },
  },
  pistolSquat: {
    id: "pistolSquat",
    name: "Pistol Squat",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  plank: {
    id: "plank",
    name: "Plank",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  powerClean: {
    id: "powerClean",
    name: "Power Clean",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "pull"],
    startingWeightLb: { value: 95, unit: "lb" },
    startingWeightKg: { value: 42.5, unit: "kg" },
  },
  powerSnatch: {
    id: "powerSnatch",
    name: "Power Snatch",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "pull"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  preacherCurl: {
    id: "preacherCurl",
    name: "Preacher Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  pressUnder: {
    id: "pressUnder",
    name: "Press Under",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  pullUp: {
    id: "pullUp",
    name: "Pull Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  pullover: {
    id: "pullover",
    name: "Pullover",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  pushPress: {
    id: "pushPress",
    name: "Push Press",
    defaultWarmup: 45,
    defaultEquipment: "kettlebell",
    types: ["upper", "push"],
    startingWeightLb: { value: 35, unit: "lb" },
    startingWeightKg: { value: 16, unit: "kg" },
  },
  pushUp: {
    id: "pushUp",
    name: "Push Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "push"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  reverseCrunch: {
    id: "reverseCrunch",
    name: "Reverse Crunch",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  reverseCurl: {
    id: "reverseCurl",
    name: "Reverse Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 15, unit: "lb" },
    startingWeightKg: { value: 5, unit: "kg" },
  },
  reverseFly: {
    id: "reverseFly",
    name: "Reverse Fly",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 15, unit: "lb" },
    startingWeightKg: { value: 5, unit: "kg" },
  },
  reverseGripConcentrationCurl: {
    id: "reverseGripConcentrationCurl",
    name: "Reverse Grip Concentration Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  reversePlank: {
    id: "reversePlank",
    name: "Reverse Plank",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  reverseLatPulldown: {
    id: "reverseLatPulldown",
    name: "Reverse Lat Pulldown",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 70, unit: "lb" },
    startingWeightKg: { value: 30, unit: "kg" },
  },
  reverseLunge: {
    id: "reverseLunge",
    name: "Reverse Lunge",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  reverseWristCurl: {
    id: "reverseWristCurl",
    name: "Reverse Wrist Curl",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  romanianDeadlift: {
    id: "romanianDeadlift",
    name: "Romanian Deadlift",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 40, unit: "lb" },
    startingWeightKg: { value: 17.5, unit: "kg" },
  },
  reverseHyperextension: {
    id: "reverseHyperextension",
    name: "Reverse Hyperextension",
    defaultWarmup: 45,
    defaultEquipment: "band",
    types: ["core", "lower"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  rowing: {
    id: "rowing",
    name: "Rowing",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  russianTwist: {
    id: "russianTwist",
    name: "Russian Twist",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  safetySquatBarSquat: {
    id: "safetySquatBarSquat",
    name: "Safety Squat Bar Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 145, unit: "lb" },
    startingWeightKg: { value: 65, unit: "kg" },
  },
  seatedCalfRaise: {
    id: "seatedCalfRaise",
    name: "Seated Calf Raise",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 90, unit: "lb" },
    startingWeightKg: { value: 40, unit: "kg" },
  },
  seatedFrontRaise: {
    id: "seatedFrontRaise",
    name: "Seated Front Raise",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 15, unit: "lb" },
    startingWeightKg: { value: 5, unit: "kg" },
  },
  seatedLegCurl: {
    id: "seatedLegCurl",
    name: "Seated Leg Curl",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 60, unit: "lb" },
    startingWeightKg: { value: 26.25, unit: "kg" },
  },
  seatedLegPress: {
    id: "seatedLegPress",
    name: "Seated Leg Press",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["lower", "legs"],
    startingWeightLb: { value: 200, unit: "lb" },
    startingWeightKg: { value: 90, unit: "kg" },
  },
  seatedOverheadPress: {
    id: "seatedOverheadPress",
    name: "Seated Overhead Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 75, unit: "lb" },
    startingWeightKg: { value: 32.5, unit: "kg" },
  },
  seatedPalmsUpWristCurl: {
    id: "seatedPalmsUpWristCurl",
    name: "Seated Palms Up Wrist Curl",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 15, unit: "lb" },
    startingWeightKg: { value: 5, unit: "kg" },
  },
  seatedRow: {
    id: "seatedRow",
    name: "Seated Row",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 70, unit: "lb" },
    startingWeightKg: { value: 30, unit: "kg" },
  },
  seatedWideGripRow: {
    id: "seatedWideGripRow",
    name: "Seated Wide Grip Row",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  shoulderPress: {
    id: "shoulderPress",
    name: "Shoulder Press",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  shoulderPressParallelGrip: {
    id: "shoulderPressParallelGrip",
    name: "Shoulder Press Parallel Grip",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  shrug: {
    id: "shrug",
    name: "Shrug",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 45, unit: "lb" },
    startingWeightKg: { value: 20, unit: "kg" },
  },
  sideBend: {
    id: "sideBend",
    name: "Side Bend",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["core"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  sideCrunch: {
    id: "sideCrunch",
    name: "Side Crunch",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  sideHipAbductor: {
    id: "sideHipAbductor",
    name: "Side Hip Abductor",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  sideLyingClam: {
    id: "sideLyingClam",
    name: "Side Lying Clam",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  sidePlank: {
    id: "sidePlank",
    name: "Side Plank",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  singleLegBridge: {
    id: "singleLegBridge",
    name: "Single Leg Bridge",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  singleLegCalfRaise: {
    id: "singleLegCalfRaise",
    name: "Single Leg Calf Raise",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 85, unit: "lb" },
    startingWeightKg: { value: 37.5, unit: "kg" },
  },
  singleLegDeadlift: {
    id: "singleLegDeadlift",
    name: "Single Leg Deadlift",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  singleLegGluteBridgeBench: {
    id: "singleLegGluteBridgeBench",
    name: "Single Leg Glute Bridge On Bench",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  singleLegGluteBridgeStraight: {
    id: "singleLegGluteBridgeStraight",
    name: "Single Leg Glute Bridge Straight Leg",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  singleLegGluteBridgeBentKnee: {
    id: "singleLegGluteBridgeBentKnee",
    name: "Single Leg Glute Bridge Bent Knee",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  singleLegHipThrust: {
    id: "singleLegHipThrust",
    name: "Single Leg Hip Thrust",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  sissySquat: {
    id: "sissySquat",
    name: "Sissy Squat",
    defaultWarmup: 45,
    defaultEquipment: "bodyweight",
    types: ["lower", "legs"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  sitUp: {
    id: "sitUp",
    name: "Sit Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  skullcrusher: {
    id: "skullcrusher",
    name: "Skullcrusher",
    defaultWarmup: 10,
    defaultEquipment: "ezbar",
    types: ["upper", "push"],
    startingWeightLb: { value: 45, unit: "lb" },
    startingWeightKg: { value: 20, unit: "kg" },
  },
  slingShotBenchPress: {
    id: "slingShotBenchPress",
    name: "Sling Shot Bench Press",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 140, unit: "lb" },
    startingWeightKg: { value: 62.5, unit: "kg" },
  },
  snatch: {
    id: "snatch",
    name: "Snatch",
    defaultWarmup: 45,
    defaultEquipment: "dumbbell",
    types: ["upper", "lower", "pull"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  snatchPull: {
    id: "snatchPull",
    name: "Snatch Pull",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 85, unit: "lb" },
    startingWeightKg: { value: 37.5, unit: "kg" },
  },
  splitSquat: {
    id: "splitSquat",
    name: "Split Squat",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  splitJerk: {
    id: "splitJerk",
    name: "Split Jerk",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "push"],
    startingWeightLb: { value: 95, unit: "lb" },
    startingWeightKg: { value: 42.5, unit: "kg" },
  },
  squat: {
    id: "squat",
    name: "Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 135, unit: "lb" },
    startingWeightKg: { value: 60, unit: "kg" },
  },
  squatRow: {
    id: "squatRow",
    name: "Squat Row",
    defaultWarmup: 10,
    defaultEquipment: "band",
    types: ["upper", "lower", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  standingCalfRaise: {
    id: "standingCalfRaise",
    name: "Standing Calf Raise",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 35, unit: "lb" },
    startingWeightKg: { value: 15, unit: "kg" },
  },
  standingRow: {
    id: "standingRow",
    name: "Standing Row",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 70, unit: "lb" },
    startingWeightKg: { value: 30, unit: "kg" },
  },
  standingRowCloseGrip: {
    id: "standingRowCloseGrip",
    name: "Standing Row Close Grip",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  standingRowRearDeltWithRope: {
    id: "standingRowRearDeltWithRope",
    name: "Standing Row Rear Delt With Rope",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  standingRowRearHorizontalDeltWithRope: {
    id: "standingRowRearHorizontalDeltWithRope",
    name: "Standing Row Rear Delt, Horizontal, With Rope",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 30, unit: "lb" },
    startingWeightKg: { value: 12.5, unit: "kg" },
  },
  standingRowVBar: {
    id: "standingRowVBar",
    name: "Standing Row V-Bar",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "pull"],
    startingWeightLb: { value: 70, unit: "lb" },
    startingWeightKg: { value: 30, unit: "kg" },
  },
  stepUp: {
    id: "stepUp",
    name: "Step up",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  stiffLegDeadlift: {
    id: "stiffLegDeadlift",
    name: "Stiff Leg Deadlift",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 115, unit: "lb" },
    startingWeightKg: { value: 50, unit: "kg" },
  },
  straightLegDeadlift: {
    id: "straightLegDeadlift",
    name: "Straight Leg Deadlift",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 110, unit: "lb" },
    startingWeightKg: { value: 50, unit: "kg" },
  },
  sumoDeadlift: {
    id: "sumoDeadlift",
    name: "Sumo Deadlift",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 175, unit: "lb" },
    startingWeightKg: { value: 77.5, unit: "kg" },
  },
  sumoDeadliftHighPull: {
    id: "sumoDeadliftHighPull",
    name: "Sumo Deadlift High Pull",
    defaultWarmup: 95,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "pull"],
    startingWeightLb: { value: 85, unit: "lb" },
    startingWeightKg: { value: 37.5, unit: "kg" },
  },
  superman: {
    id: "superman",
    name: "Superman",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  tBarRow: {
    id: "tBarRow",
    name: "T Bar Row",
    defaultWarmup: 10,
    defaultEquipment: "leverageMachine",
    types: ["upper", "pull"],
    startingWeightLb: { value: 90, unit: "lb" },
    startingWeightKg: { value: 40, unit: "kg" },
  },
  thruster: {
    id: "thruster",
    name: "Thruster",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["upper", "lower", "push"],
    startingWeightLb: { value: 65, unit: "lb" },
    startingWeightKg: { value: 27.5, unit: "kg" },
  },
  toesToBar: {
    id: "toesToBar",
    name: "Toes To Bar",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  torsoRotation: {
    id: "torsoRotation",
    name: "Torso Rotation",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  trapBarDeadlift: {
    id: "trapBarDeadlift",
    name: "Trap Bar Deadlift",
    defaultWarmup: 10,
    defaultEquipment: "trapbar",
    types: ["lower", "legs"],
    startingWeightLb: { value: 185, unit: "lb" },
    startingWeightKg: { value: 82.5, unit: "kg" },
  },
  tricepsDip: {
    id: "tricepsDip",
    name: "Triceps Dip",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "push"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  tricepsExtension: {
    id: "tricepsExtension",
    name: "Triceps Extension",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "push"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  tricepsPushdown: {
    id: "tricepsPushdown",
    name: "Triceps Pushdown",
    defaultWarmup: 10,
    defaultEquipment: "cable",
    types: ["upper", "push"],
    startingWeightLb: { value: 40, unit: "lb" },
    startingWeightKg: { value: 17.5, unit: "kg" },
  },
  uprightRow: {
    id: "uprightRow",
    name: "Upright Row",
    defaultWarmup: 10,
    defaultEquipment: "dumbbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 20, unit: "lb" },
    startingWeightKg: { value: 7.5, unit: "kg" },
  },
  vUp: {
    id: "vUp",
    name: "V Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["core"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  widePullUp: {
    id: "widePullUp",
    name: "Wide Pull Up",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  wristCurl: {
    id: "wristCurl",
    name: "Wrist Curl",
    defaultWarmup: 10,
    defaultEquipment: "barbell",
    types: ["upper", "pull"],
    startingWeightLb: { value: 25, unit: "lb" },
    startingWeightKg: { value: 10, unit: "kg" },
  },
  wristRoller: {
    id: "wristRoller",
    name: "Wrist Roller",
    defaultWarmup: 10,
    defaultEquipment: "bodyweight",
    types: ["upper", "pull"],
    startingWeightLb: { value: 0, unit: "lb" },
    startingWeightKg: { value: 0, unit: "kg" },
  },
  zercherSquat: {
    id: "zercherSquat",
    name: "Zercher Squat",
    defaultWarmup: 45,
    defaultEquipment: "barbell",
    types: ["lower", "legs"],
    startingWeightLb: { value: 105, unit: "lb" },
    startingWeightKg: { value: 47.5, unit: "kg" },
  },
};

const nameToIdMapping = ObjectUtils.keys(exercises).reduce<Partial<Record<string, IExerciseId>>>((acc, key) => {
  acc[exercises[key].name.toLowerCase()] = exercises[key].id;
  return acc;
}, {});

export const metadata: Record<IExerciseId, IMetaExercises> = {
  abWheel: {
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
    sortedEquipment: ["bodyweight"],
  },
  arnoldPress: {
    targetMuscles: ["Deltoid Anterior"],
    synergistMuscles: ["Deltoid Lateral", "Serratus Anterior", "Triceps Brachii"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["dumbbell", "kettlebell"],
  },
  aroundTheWorld: {
    targetMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
    synergistMuscles: ["Deltoid Lateral", "Deltoid Posterior", "Latissimus Dorsi", "Serratus Anterior"],
    bodyParts: ["Chest", "Shoulders"],
    sortedEquipment: ["dumbbell"],
  },
  backExtension: {
    targetMuscles: ["Erector Spinae"],
    synergistMuscles: ["Gluteus Maximus", "Hamstrings"],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight", "leverageMachine"],
  },
  ballSlams: {
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
    sortedEquipment: ["medicineball"],
  },
  battleRopes: {
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
    sortedEquipment: ["bodyweight"],
  },
  behindTheNeckPress: {
    targetMuscles: ["Deltoid Anterior", "Deltoid Lateral", "Deltoid Posterior"],
    synergistMuscles: ["Triceps Brachii"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["barbell"],
  },
  benchDip: {
    targetMuscles: ["Triceps Brachii"],
    synergistMuscles: [
      "Deltoid Anterior",
      "Latissimus Dorsi",
      "Levator Scapulae",
      "Pectoralis Major Clavicular Head",
      "Pectoralis Major Sternal Head",
    ],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["bodyweight"],
  },
  benchPress: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "smith", "band", "kettlebell"],
  },
  benchPressCloseGrip: {
    targetMuscles: ["Triceps Brachii"],
    synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["barbell", "ezbar", "smith"],
  },
  benchPressWideGrip: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["barbell", "smith"],
  },
  bentOverOneArmRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
      "Pectoralis Major Sternal Head",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["dumbbell"],
  },
  bentOverRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Middle Fibers", "Trapezius Upper Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "band", "leverageMachine", "smith"],
  },
  bicepCurl: {
    targetMuscles: ["Biceps Brachii"],
    synergistMuscles: ["Brachialis", "Brachioradialis"],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["barbell", "dumbbell", "band", "leverageMachine", "cable", "ezbar"],
  },
  bicycleCrunch: {
    targetMuscles: ["Obliques", "Rectus Abdominis"],
    synergistMuscles: ["Gluteus Maximus", "Iliopsoas", "Quadriceps"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  boxJump: {
    targetMuscles: ["Quadriceps", "Gluteus Maximus", "Gastrocnemius", "Soleus"],
    synergistMuscles: ["Hamstrings", "Adductor Magnus", "Erector Spinae", "Rectus Abdominis"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  boxSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "dumbbell"],
  },
  bulgarianSplitSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Hips", "Thighs"],
    sortedEquipment: ["dumbbell"],
  },
  burpee: {
    targetMuscles: [
      "Quadriceps",
      "Gluteus Maximus",
      "Pectoralis Major Clavicular Head",
      "Pectoralis Major Sternal Head",
      "Triceps Brachii",
      "Deltoid Anterior",
      "Deltoid Lateral",
      "Deltoid Posterior",
      "Rectus Abdominis",
    ],
    synergistMuscles: [
      "Hamstrings",
      "Biceps Brachii",
      "Brachialis",
      "Latissimus Dorsi",
      "Obliques",
      "Erector Spinae",
      "Obliques",
      "Soleus",
      "Gastrocnemius",
      "Tibialis Anterior",
    ],
    bodyParts: ["Chest", "Shoulders", "Upper Arms", "Waist", "Thighs"],
    sortedEquipment: ["bodyweight"],
  },
  cableCrossover: {
    targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
    synergistMuscles: ["Deltoid Anterior"],
    bodyParts: ["Chest"],
    sortedEquipment: ["cable"],
  },
  cableCrunch: {
    targetMuscles: ["Rectus Abdominis"],
    synergistMuscles: ["Obliques"],
    bodyParts: ["Waist"],
    sortedEquipment: ["cable"],
  },
  cableKickback: {
    targetMuscles: ["Triceps Brachii"],
    synergistMuscles: [],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["cable"],
  },
  cablePullThrough: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: ["Erector Spinae", "Hamstrings"],
    bodyParts: ["Hips"],
    sortedEquipment: ["cable"],
  },
  cableTwist: {
    targetMuscles: ["Obliques"],
    synergistMuscles: ["Iliopsoas", "Tensor Fasciae Latae"],
    bodyParts: ["Waist"],
    sortedEquipment: ["barbell", "bodyweight", "cable", "leverageMachine", "band"],
  },
  calfPressOnLegPress: {
    targetMuscles: ["Gastrocnemius"],
    synergistMuscles: ["Soleus"],
    bodyParts: ["Calves"],
    sortedEquipment: ["leverageMachine"],
  },
  calfPressOnSeatedLegPress: {
    targetMuscles: ["Gastrocnemius", "Quadriceps"],
    synergistMuscles: ["Gluteus Maximus", "Hamstrings", "Soleus"],
    bodyParts: ["Calves"],
    sortedEquipment: ["leverageMachine"],
  },
  chestDip: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: [
      "Deltoid Anterior",
      "Latissimus Dorsi",
      "Levator Scapulae",
      "Pectoralis Major Clavicular Head",
      "Triceps Brachii",
    ],
    bodyParts: ["Chest"],
    sortedEquipment: ["bodyweight"],
  },
  chestFly: {
    targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
    synergistMuscles: ["Biceps Brachii", "Deltoid Anterior"],
    bodyParts: ["Chest"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "leverageMachine"],
  },
  chestPress: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: ["Biceps Brachii", "Deltoid Lateral", "Pectoralis Major Clavicular Head"],
    bodyParts: ["Chest"],
    sortedEquipment: ["leverageMachine", "band"],
  },
  chestSupportedRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Middle Fibers", "Trapezius Upper Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Pectoralis Major Sternal Head",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["barbell", "dumbbell"],
  },
  chinUp: {
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
    sortedEquipment: ["leverageMachine", "bodyweight"],
  },
  clean: {
    targetMuscles: [
      "Gluteus Maximus",
      "Hamstrings",
      "Quadriceps",
      "Latissimus Dorsi",
      "Trapezius Lower Fibers",
      "Deltoid Anterior",
      "Deltoid Lateral",
    ],
    synergistMuscles: [
      "Adductor Magnus",
      "Gastrocnemius",
      "Soleus",
      "Erector Spinae",
      "Biceps Brachii",
      "Pectoralis Major Clavicular Head",
      "Pectoralis Major Sternal Head",
      "Wrist Flexors",
    ],
    bodyParts: ["Hips", "Thighs", "Back", "Shoulders"],
    sortedEquipment: ["barbell"],
  },
  cleanandJerk: {
    targetMuscles: [
      "Gluteus Maximus",
      "Hamstrings",
      "Quadriceps",
      "Latissimus Dorsi",
      "Trapezius Lower Fibers",
      "Deltoid Anterior",
      "Deltoid Lateral",
    ],
    synergistMuscles: [
      "Adductor Magnus",
      "Gastrocnemius",
      "Soleus",
      "Erector Spinae",
      "Biceps Brachii",
      "Pectoralis Major Clavicular Head",
      "Pectoralis Major Sternal Head",
      "Wrist Flexors",
    ],
    bodyParts: ["Hips", "Thighs", "Back", "Shoulders"],
    sortedEquipment: ["barbell"],
  },
  concentrationCurl: {
    targetMuscles: ["Brachialis"],
    synergistMuscles: ["Biceps Brachii", "Brachioradialis"],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["barbell", "dumbbell", "band", "cable"],
  },
  crossBodyCrunch: {
    targetMuscles: ["Obliques", "Rectus Abdominis"],
    synergistMuscles: ["Gluteus Maximus", "Quadriceps"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  crunch: {
    targetMuscles: ["Rectus Abdominis"],
    synergistMuscles: ["Obliques"],
    bodyParts: ["Waist"],
    sortedEquipment: ["cable", "bodyweight", "leverageMachine"],
  },
  cycling: {
    targetMuscles: ["Quadriceps", "Hamstrings", "Gluteus Maximus", "Gastrocnemius", "Soleus", "Tibialis Anterior"],
    synergistMuscles: [
      "Adductor Magnus",
      "Adductor Longus",
      "Adductor Brevis",
      "Iliopsoas",
      "Erector Spinae",
      "Rectus Abdominis",
      "Obliques",
    ],
    bodyParts: ["Hips", "Thighs", "Calves", "Shins", "Back", "Waist"],
    sortedEquipment: ["bodyweight"],
  },
  deadlift: {
    targetMuscles: ["Gluteus Maximus", "Erector Spinae", "Hamstrings"],
    synergistMuscles: [
      "Adductor Magnus",
      "Erector Spinae",
      "Hamstrings",
      "Quadriceps",
      "Soleus",
      "Latissimus Dorsi",
      "Obliques",
      "Rectus Abdominis",
      "Gastrocnemius",
      "Brachioradialis",
      "Soleus",
    ],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "leverageMachine", "smith", "band", "kettlebell", "bodyweight"],
  },
  deadliftHighPull: {
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
    sortedEquipment: ["barbell"],
  },
  declineBenchPress: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["dumbbell", "smith"],
  },
  declineCrunch: {
    targetMuscles: ["Rectus Abdominis"],
    synergistMuscles: ["Obliques", "Iliopsoas", "Tensor Fasciae Latae", "Sartorius"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  deficitDeadlift: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: ["Adductor Magnus", "Erector Spinae", "Hamstrings", "Quadriceps", "Soleus"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell", "trapbar"],
  },
  ellipticalMachine: {
    targetMuscles: [],
    synergistMuscles: [
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
    bodyParts: ["Hips", "Thighs", "Back", "Shoulders"],
    sortedEquipment: ["leverageMachine"],
  },
  facePull: {
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
    sortedEquipment: ["band"],
  },
  flatKneeRaise: {
    targetMuscles: ["Iliopsoas"],
    synergistMuscles: ["Adductor Brevis", "Adductor Longus", "Pectineous", "Sartorius"],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight"],
  },
  flatLegRaise: {
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
    sortedEquipment: ["bodyweight"],
  },
  frontRaise: {
    targetMuscles: ["Deltoid Anterior"],
    synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "bodyweight", "band"],
  },
  gluteBridge: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: ["Hamstrings", "Quadriceps"],
    bodyParts: ["Hips"],
    sortedEquipment: ["band", "barbell", "dumbbell"],
  },
  gluteBridgeMarch: {
    targetMuscles: ["Gluteus Maximus", "Rectus Abdominis"],
    synergistMuscles: ["Hamstrings", "Quadriceps", "Sartorius"],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight"],
  },
  gluteKickback: {
    targetMuscles: ["Gluteus Maximus", "Gluteus Medius"],
    synergistMuscles: ["Hamstrings", "Tensor Fasciae Latae", "Rectus Abdominis", "Obliques"],
    bodyParts: ["Glute"],
    sortedEquipment: ["leverageMachine", "bodyweight", "cable", "band"],
  },
  frontSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell", "kettlebell", "dumbbell", "cable", "smith"],
  },
  gobletSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus", "Tensor Fasciae Latae"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["kettlebell", "dumbbell"],
  },
  goodMorning: {
    targetMuscles: ["Hamstrings"],
    synergistMuscles: ["Adductor Magnus", "Gluteus Maximus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "smith", "leverageMachine"],
  },
  hackSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell", "smith"],
  },
  hammerCurl: {
    targetMuscles: ["Brachioradialis", "Biceps Brachii", "Brachialis"],
    synergistMuscles: ["Deltoid Anterior", "Wrist Flexors"],
    bodyParts: ["Forearms"],
    sortedEquipment: ["cable", "dumbbell", "band"],
  },
  handstandPushUp: {
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
    sortedEquipment: ["bodyweight"],
  },
  hangClean: {
    targetMuscles: ["Biceps Brachii", "Brachialis", "Brachioradialis"],
    synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head"],
    bodyParts: ["Forearms"],
    sortedEquipment: ["kettlebell"],
  },
  hangSnatch: {
    targetMuscles: [
      "Trapezius Lower Fibers",
      "Trapezius Middle Fibers",
      "Trapezius Upper Fibers",
      "Quadriceps",
      "Gluteus Maximus",
    ],
    synergistMuscles: [
      "Hamstrings",
      "Erector Spinae",
      "Deltoid Anterior",
      "Deltoid Lateral",
      "Deltoid Posterior",
      "Latissimus Dorsi",
      "Biceps Brachii",
      "Brachialis",
      "Brachioradialis",
      "Gastrocnemius",
      "Soleus",
      "Obliques",
      "Rectus Abdominis",
    ],
    bodyParts: ["Thighs", "Back", "Shoulders"],
    sortedEquipment: ["barbell"],
  },
  hangingLegRaise: {
    targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
    synergistMuscles: ["Obliques", "Quadriceps", "Sartorius", "Tensor Fasciae Latae"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight", "cable"],
  },
  highKneeSkips: {
    targetMuscles: ["Quadriceps", "Hamstrings", "Gluteus Maximus"],
    synergistMuscles: [
      "Iliopsoas",
      "Gastrocnemius",
      "Soleus",
      "Tibialis Anterior",
      "Rectus Abdominis",
      "Obliques",
      "Adductor Magnus",
      "Adductor Brevis",
      "Adductor Longus",
    ],
    bodyParts: ["Thighs", "Hips"],
    sortedEquipment: ["bodyweight"],
  },
  highRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Biceps Brachii",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
      "Infraspinatus",
      "Teres Major",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["leverageMachine"],
  },
  hipAbductor: {
    targetMuscles: ["Gluteus Maximus", "Gluteus Medius"],
    synergistMuscles: ["Tensor Fasciae Latae"],
    bodyParts: ["Hips"],
    sortedEquipment: ["leverageMachine", "bodyweight", "cable", "band"],
  },
  hipAdductor: {
    targetMuscles: ["Adductor Magnus", "Gluteus Maximus"],
    synergistMuscles: ["Tensor Fasciae Latae", "Pectineous", "Adductor Brevis", "Adductor Longus", "Adductor Magnus"],
    bodyParts: ["Hips"],
    sortedEquipment: ["leverageMachine", "cable", "band", "bodyweight"],
  },
  hipThrust: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: ["Hamstrings", "Quadriceps"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell", "leverageMachine", "band", "bodyweight"],
  },
  inclineBenchPress: {
    targetMuscles: ["Pectoralis Major Clavicular Head"],
    synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "smith"],
  },
  inclineBenchPressWideGrip: {
    targetMuscles: ["Pectoralis Major Clavicular Head"],
    synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["barbell"],
  },
  inclineChestFly: {
    targetMuscles: ["Pectoralis Major Clavicular Head"],
    synergistMuscles: ["Biceps Brachii", "Deltoid Anterior"],
    bodyParts: ["Chest"],
    sortedEquipment: ["cable", "dumbbell"],
  },
  inclineChestPress: {
    targetMuscles: ["Pectoralis Major Clavicular Head"],
    synergistMuscles: ["Deltoid Anterior", "Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["leverageMachine", "band", "dumbbell"],
  },
  inclineCurl: {
    targetMuscles: ["Biceps Brachii"],
    synergistMuscles: ["Brachialis", "Brachioradialis"],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["dumbbell"],
  },
  inclineRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Middle Fibers", "Trapezius Upper Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Pectoralis Major Sternal Head",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["barbell", "dumbbell"],
  },
  invertedRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
      "Pectoralis Major Sternal Head",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["bodyweight"],
  },
  isoLateralChestPress: {
    targetMuscles: ["Pectoralis Major Clavicular Head", "Pectoralis Major Sternal Head"],
    synergistMuscles: ["Triceps Brachii", "Deltoid Anterior", "Serratus Anterior"],
    bodyParts: ["Chest"],
    sortedEquipment: ["dumbbell"],
  },
  isoLateralRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Biceps Brachii",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
      "Infraspinatus",
      "Teres Major",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["dumbbell"],
  },
  jackknifeSitUp: {
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
    sortedEquipment: ["bodyweight"],
  },
  jumpRope: {
    targetMuscles: ["Soleus", "Gastrocnemius", "Quadriceps", "Hamstrings"],
    synergistMuscles: ["Gluteus Maximus", "Rectus Abdominis", "Obliques", "Tibialis Anterior"],
    bodyParts: ["Thighs", "Calves"],
    sortedEquipment: ["bodyweight"],
  },
  jumpSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Gastrocnemius", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "bodyweight"],
  },
  jumpingJack: {
    targetMuscles: [
      "Gluteus Maximus",
      "Quadriceps",
      "Adductor Brevis",
      "Adductor Longus",
      "Adductor Magnus",
      "Deltoid Anterior",
      "Deltoid Lateral",
      "Deltoid Posterior",
    ],
    synergistMuscles: [
      "Gastrocnemius",
      "Soleus",
      "Hamstrings",
      "Rectus Abdominis",
      "Obliques",
      "Trapezius Upper Fibers",
      "Serratus Anterior",
    ],
    bodyParts: ["Thighs"],
    sortedEquipment: ["bodyweight"],
  },
  kettlebellSwing: {
    targetMuscles: ["Deltoid Anterior", "Gluteus Maximus"],
    synergistMuscles: [
      "Adductor Magnus",
      "Hamstrings",
      "Pectoralis Major Clavicular Head",
      "Serratus Anterior",
      "Soleus",
    ],
    bodyParts: ["Hips", "Shoulders"],
    sortedEquipment: ["dumbbell", "kettlebell"],
  },
  kettlebellTurkishGetUp: {
    targetMuscles: ["Deltoid Anterior", "Deltoid Lateral", "Deltoid Posterior", "Quadriceps", "Gluteus Maximus"],
    synergistMuscles: [
      "Obliques",
      "Rectus Abdominis",
      "Latissimus Dorsi",
      "Hamstrings",
      "Adductor Brevis",
      "Adductor Longus",
      "Adductor Magnus",
      "Triceps Brachii",
      "Erector Spinae",
      "Serratus Anterior",
    ],
    bodyParts: ["Hips", "Shoulders"],
    sortedEquipment: ["kettlebell"],
  },
  kippingPullUp: {
    targetMuscles: [
      "Latissimus Dorsi",
      "Brachialis",
      "Biceps Brachii",
      "Trapezius Lower Fibers",
      "Trapezius Middle Fibers",
    ],
    synergistMuscles: [
      "Deltoid Posterior",
      "Brachioradialis",
      "Pectoralis Major Sternal Head",
      "Rectus Abdominis",
      "Obliques",
      "Iliopsoas",
      "Tensor Fasciae Latae",
      "Adductor Longus",
      "Adductor Brevis",
      "Erector Spinae",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["bodyweight"],
  },
  kneeRaise: {
    targetMuscles: ["Rectus Abdominis", "Iliopsoas"],
    synergistMuscles: ["Obliques", "Adductor Brevis", "Adductor Longus", "Adductor Magnus"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  kneelingPulldown: {
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
    sortedEquipment: ["band"],
  },
  kneestoElbows: {
    targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
    synergistMuscles: ["Obliques", "Quadriceps", "Sartorius"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  latPulldown: {
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
    sortedEquipment: ["cable"],
  },
  lateralBoxJump: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps", "Hamstrings"],
    synergistMuscles: [
      "Adductor Brevis",
      "Adductor Longus",
      "Adductor Magnus",
      "Gluteus Medius",
      "Tensor Fasciae Latae",
      "Rectus Abdominis",
      "Obliques",
      "Deltoid Anterior",
      "Deltoid Posterior",
      "Deltoid Lateral",
    ],
    bodyParts: ["Thighs"],
    sortedEquipment: ["bodyweight"],
  },
  lateralRaise: {
    targetMuscles: ["Deltoid Lateral"],
    synergistMuscles: ["Deltoid Anterior", "Serratus Anterior"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["cable", "dumbbell", "leverageMachine", "band", "kettlebell"],
  },
  legsUpBenchPress: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["barbell"],
  },
  legCurl: {
    targetMuscles: ["Hamstrings"],
    synergistMuscles: ["Gastrocnemius", "Sartorius"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["leverageMachine"],
  },
  legExtension: {
    targetMuscles: ["Quadriceps"],
    synergistMuscles: ["Tensor Fasciae Latae"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["leverageMachine", "band"],
  },
  legPress: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["smith", "leverageMachine"],
  },
  lunge: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "dumbbell", "bodyweight", "cable"],
  },
  lyingBicepCurl: {
    targetMuscles: ["Biceps Brachii"],
    synergistMuscles: ["Brachialis", "Brachioradialis"],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["barbell", "dumbbell", "band", "leverageMachine", "cable", "ezbar"],
  },
  lyingLegCurl: {
    targetMuscles: ["Hamstrings"],
    synergistMuscles: ["Gastrocnemius", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["leverageMachine", "band"],
  },
  mountainClimber: {
    targetMuscles: ["Rectus Abdominis", "Iliopsoas", "Quadriceps"],
    synergistMuscles: [
      "Obliques",
      "Deltoid Anterior",
      "Deltoid Posterior",
      "Deltoid Lateral",
      "Biceps Brachii",
      "Triceps Brachii",
      "Pectoralis Major Sternal Head",
      "Pectoralis Major Clavicular Head",
      "Serratus Anterior",
      "Gluteus Maximus",
      "Hamstrings",
    ],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  muscleUp: {
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
    sortedEquipment: ["bodyweight"],
  },
  obliqueCrunch: {
    targetMuscles: ["Obliques"],
    synergistMuscles: ["Rectus Abdominis"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  overheadPress: {
    targetMuscles: ["Deltoid Anterior"],
    synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["barbell", "dumbbell", "ezbar"],
  },
  overheadSquat: {
    targetMuscles: ["Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Gluteus Maximus", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "dumbbell"],
  },
  pecDeck: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: ["Pectoralis Major Clavicular Head", "Serratus Anterior"],
    bodyParts: ["Chest"],
    sortedEquipment: ["leverageMachine"],
  },
  pendlayRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["barbell"],
  },
  pistolSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["kettlebell", "leverageMachine", "bodyweight"],
  },
  plank: {
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
    sortedEquipment: ["bodyweight"],
  },
  powerClean: {
    targetMuscles: ["Quadriceps", "Gluteus Maximus", "Deltoid Anterior"],
    synergistMuscles: [
      "Hamstrings",
      "Gastrocnemius",
      "Soleus",
      "Trapezius Lower Fibers",
      "Trapezius Middle Fibers",
      "Trapezius Upper Fibers",
      "Latissimus Dorsi",
      "Erector Spinae",
      "Biceps Brachii",
      "Wrist Flexors",
      "Rectus Abdominis",
      "Obliques",
    ],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell"],
  },
  powerSnatch: {
    targetMuscles: ["Quadriceps", "Gluteus Maximus", "Deltoid Anterior", "Deltoid Lateral", "Deltoid Posterior"],
    synergistMuscles: [
      "Hamstrings",
      "Gastrocnemius",
      "Soleus",
      "Trapezius Lower Fibers",
      "Trapezius Middle Fibers",
      "Trapezius Upper Fibers",
      "Latissimus Dorsi",
      "Erector Spinae",
      "Biceps Brachii",
      "Wrist Flexors",
      "Rectus Abdominis",
      "Obliques",
    ],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell"],
  },
  preacherCurl: {
    targetMuscles: ["Brachialis"],
    synergistMuscles: ["Biceps Brachii", "Brachioradialis"],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["barbell", "dumbbell", "ezbar", "leverageMachine"],
  },
  pressUnder: {
    targetMuscles: ["Quadriceps", "Deltoid Anterior", "Deltoid Lateral", "Deltoid Posterior"],
    synergistMuscles: [
      "Gluteus Maximus",
      "Hamstrings",
      "Erector Spinae",
      "Rectus Abdominis",
      "Obliques",
      "Triceps Brachii",
      "Biceps Brachii",
    ],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell"],
  },
  pullUp: {
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
    sortedEquipment: ["leverageMachine", "bodyweight", "band"],
  },
  pullover: {
    targetMuscles: ["Latissimus Dorsi"],
    synergistMuscles: [
      "Pectoralis Major Clavicular Head",
      "Pectoralis Major Sternal Head",
      "Teres Major",
      "Triceps Brachii",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["barbell", "dumbbell"],
  },
  pushPress: {
    targetMuscles: ["Deltoid Anterior"],
    synergistMuscles: [
      "Biceps Brachii",
      "Brachialis",
      "Deltoid Lateral",
      "Pectoralis Major Clavicular Head",
      "Serratus Anterior",
    ],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["bodyweight", "kettlebell"],
  },
  pushUp: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: ["Deltoid Anterior", "Pectoralis Major Clavicular Head", "Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["bodyweight", "band"],
  },
  reverseCrunch: {
    targetMuscles: ["Rectus Abdominis"],
    synergistMuscles: ["Obliques"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight", "cable"],
  },
  reverseCurl: {
    targetMuscles: ["Brachioradialis"],
    synergistMuscles: ["Biceps Brachii", "Brachialis"],
    bodyParts: ["Forearms"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "band"],
  },
  reverseFly: {
    targetMuscles: ["Deltoid Posterior"],
    synergistMuscles: [
      "Deltoid Lateral",
      "Infraspinatus",
      "Teres Minor",
      "Trapezius Lower Fibers",
      "Trapezius Middle Fibers",
    ],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["dumbbell", "leverageMachine", "band"],
  },
  reverseGripConcentrationCurl: {
    targetMuscles: ["Brachialis", "Brachioradialis"],
    synergistMuscles: ["Biceps Brachii", "Wrist Flexors"],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["dumbbell"],
  },
  reverseLatPulldown: {
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
    sortedEquipment: ["cable"],
  },
  reverseLunge: {
    targetMuscles: ["Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus", "Gluteus Maximus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "dumbbell", "bodyweight", "cable"],
  },
  reverseWristCurl: {
    targetMuscles: ["Wrist Extensors"],
    synergistMuscles: [],
    bodyParts: ["Forearms"],
    sortedEquipment: ["barbell"],
  },
  reversePlank: {
    targetMuscles: ["Gluteus Maximus", "Rectus Abdominis", "Erector Spinae"],
    synergistMuscles: [
      "Hamstrings",
      "Quadriceps",
      "Deltoid Anterior",
      "Deltoid Lateral",
      "Deltoid Posterior",
      "Triceps Brachii",
      "Latissimus Dorsi",
      "Trapezius Middle Fibers",
    ],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  romanianDeadlift: {
    targetMuscles: ["Erector Spinae", "Gluteus Maximus", "Hamstrings"],
    synergistMuscles: ["Adductor Magnus", "Latissimus Dorsi", "Obliques", "Rectus Abdominis", "Soleus"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell", "dumbbell"],
  },
  reverseHyperextension: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: ["Hamstrings"],
    bodyParts: ["Hips"],
    sortedEquipment: ["band", "leverageMachine"],
  },
  rowing: {
    targetMuscles: ["Quadriceps", "Latissimus Dorsi", "Erector Spinae"],
    synergistMuscles: [
      "Hamstrings",
      "Gluteus Maximus",
      "Biceps Brachii",
      "Deltoid Anterior",
      "Deltoid Lateral",
      "Deltoid Posterior",
      "Wrist Flexors",
      "Rectus Abdominis",
      "Obliques",
      "Trapezius Middle Fibers",
    ],
    bodyParts: ["Thighs"],
    sortedEquipment: ["cable"],
  },
  russianTwist: {
    targetMuscles: ["Obliques"],
    synergistMuscles: ["Iliopsoas"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight", "dumbbell", "cable"],
  },
  safetySquatBarSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Erector Spinae", "Hamstrings", "Soleus"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell"],
  },
  seatedCalfRaise: {
    targetMuscles: ["Gastrocnemius"],
    synergistMuscles: ["Soleus"],
    bodyParts: ["Calves"],
    sortedEquipment: ["barbell", "dumbbell", "leverageMachine"],
  },
  seatedFrontRaise: {
    targetMuscles: ["Deltoid Anterior"],
    synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["barbell", "dumbbell"],
  },
  seatedLegCurl: {
    targetMuscles: ["Hamstrings"],
    synergistMuscles: ["Gastrocnemius", "Sartorius"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["leverageMachine"],
  },
  seatedLegPress: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Hips", "Thighs"],
    sortedEquipment: ["leverageMachine"],
  },
  seatedOverheadPress: {
    targetMuscles: ["Deltoid Anterior"],
    synergistMuscles: ["Deltoid Lateral", "Serratus Anterior", "Triceps Brachii"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["barbell"],
  },
  seatedPalmsUpWristCurl: {
    targetMuscles: ["Wrist Flexors"],
    synergistMuscles: [],
    bodyParts: ["Forearms"],
    sortedEquipment: ["dumbbell"],
  },
  seatedRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
      "Pectoralis Major Sternal Head",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["cable", "band", "leverageMachine"],
  },
  seatedWideGripRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["cable"],
  },
  shoulderPress: {
    targetMuscles: ["Deltoid Anterior"],
    synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["cable", "dumbbell", "leverageMachine", "band", "smith"],
  },
  shoulderPressParallelGrip: {
    targetMuscles: ["Deltoid Anterior"],
    synergistMuscles: ["Deltoid Lateral", "Pectoralis Major Clavicular Head", "Serratus Anterior", "Triceps Brachii"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["dumbbell"],
  },
  shrug: {
    targetMuscles: ["Trapezius Upper Fibers"],
    synergistMuscles: ["Trapezius Middle Fibers"],
    bodyParts: ["Back"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "leverageMachine", "band", "smith"],
  },
  sideBend: {
    targetMuscles: ["Obliques"],
    synergistMuscles: ["Iliopsoas"],
    bodyParts: ["Waist"],
    sortedEquipment: ["cable", "dumbbell", "band"],
  },
  sideCrunch: {
    targetMuscles: ["Obliques"],
    synergistMuscles: ["Iliopsoas"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight", "band", "cable"],
  },
  sideHipAbductor: {
    targetMuscles: ["Gluteus Medius", "Tensor Fasciae Latae"],
    synergistMuscles: [],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight", "barbell", "leverageMachine"],
  },
  sideLyingClam: {
    targetMuscles: ["Gluteus Medius"],
    synergistMuscles: ["Tensor Fasciae Latae"],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight"],
  },
  sidePlank: {
    targetMuscles: ["Obliques"],
    synergistMuscles: [],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  singleLegBridge: {
    targetMuscles: ["Gluteus Maximus", "Rectus Abdominis"],
    synergistMuscles: ["Deltoid Anterior", "Hamstrings", "Obliques", "Serratus Anterior", "Tensor Fasciae Latae"],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight"],
  },
  singleLegCalfRaise: {
    targetMuscles: ["Gastrocnemius"],
    synergistMuscles: ["Soleus"],
    bodyParts: ["Calves"],
    sortedEquipment: ["barbell", "dumbbell", "leverageMachine", "bodyweight", "cable"],
  },
  singleLegDeadlift: {
    targetMuscles: ["Erector Spinae", "Gluteus Maximus"],
    synergistMuscles: ["Hamstrings"],
    bodyParts: ["Hips"],
    sortedEquipment: ["dumbbell", "bodyweight"],
  },
  singleLegGluteBridgeBench: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: [],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight"],
  },
  singleLegGluteBridgeStraight: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: [],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight"],
  },
  singleLegGluteBridgeBentKnee: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: [],
    bodyParts: ["Hips"],
    sortedEquipment: ["bodyweight"],
  },
  singleLegHipThrust: {
    targetMuscles: ["Gluteus Maximus"],
    synergistMuscles: ["Hamstrings", "Quadriceps"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell", "bodyweight", "leverageMachine"],
  },
  sissySquat: {
    targetMuscles: ["Quadriceps"],
    synergistMuscles: ["Adductor Magnus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["bodyweight"],
  },
  sitUp: {
    targetMuscles: ["Rectus Abdominis"],
    synergistMuscles: ["Iliopsoas", "Obliques"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight", "kettlebell"],
  },
  slingShotBenchPress: {
    targetMuscles: ["Pectoralis Major Sternal Head"],
    synergistMuscles: ["Triceps Brachii"],
    bodyParts: ["Chest"],
    sortedEquipment: ["barbell"],
  },
  skullcrusher: {
    targetMuscles: ["Triceps Brachii"],
    synergistMuscles: [],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["barbell", "cable", "dumbbell", "ezbar"],
  },
  snatch: {
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
    sortedEquipment: ["dumbbell"],
  },
  snatchPull: {
    targetMuscles: [
      "Erector Spinae",
      "Gluteus Maximus",
      "Hamstrings",
      "Quadriceps",
      "Latissimus Dorsi",
      "Trapezius Lower Fibers",
      "Trapezius Middle Fibers",
      "Trapezius Upper Fibers",
    ],
    synergistMuscles: [
      "Adductor Magnus",
      "Deltoid Anterior",
      "Deltoid Posterior",
      "Deltoid Lateral",
      "Biceps Brachii",
      "Brachialis",
      "Brachioradialis",
      "Triceps Brachii",
      "Wrist Flexors",
      "Wrist Extensors",
    ],
    bodyParts: ["Back", "Hips", "Thighs"],
    sortedEquipment: ["barbell"],
  },
  splitSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Hips", "Thighs"],
    sortedEquipment: ["dumbbell"],
  },
  splitJerk: {
    targetMuscles: [
      "Deltoid Anterior",
      "Deltoid Posterior",
      "Deltoid Lateral",
      "Triceps Brachii",
      "Quadriceps",
      "Gluteus Maximus",
      "Erector Spinae",
    ],
    synergistMuscles: [
      "Pectoralis Major Sternal Head",
      "Pectoralis Major Clavicular Head",
      "Latissimus Dorsi",
      "Hamstrings",
      "Obliques",
      "Rectus Abdominis",
      "Trapezius Lower Fibers",
      "Trapezius Middle Fibers",
      "Trapezius Upper Fibers",
      "Adductor Magnus",
      "Tensor Fasciae Latae",
      "Wrist Extensors",
      "Wrist Flexors",
    ],
    bodyParts: ["Hips", "Shoulders", "Thighs"],
    sortedEquipment: ["barbell"],
  },
  squat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: [
      "Adductor Magnus",
      "Soleus",
      "Hamstrings",
      "Erector Spinae",
      "Obliques",
      "Rectus Abdominis",
      "Gluteus Medius",
      "Gastrocnemius",
    ],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "dumbbell", "bodyweight", "smith", "leverageMachine"],
  },
  squatRow: {
    targetMuscles: ["Gluteus Maximus", "Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Adductor Magnus",
      "Deltoid Posterior",
      "Pectoralis Major Sternal Head",
      "Quadriceps",
      "Soleus",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["band"],
  },
  standingCalfRaise: {
    targetMuscles: ["Gastrocnemius"],
    synergistMuscles: ["Soleus"],
    bodyParts: ["Calves"],
    sortedEquipment: ["barbell", "dumbbell", "leverageMachine", "bodyweight", "cable"],
  },
  standingRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["cable"],
  },
  standingRowCloseGrip: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Upper Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["cable"],
  },
  standingRowRearDeltWithRope: {
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
    sortedEquipment: ["cable"],
  },
  standingRowRearHorizontalDeltWithRope: {
    targetMuscles: ["Deltoid Posterior"],
    synergistMuscles: ["Infraspinatus", "Teres Minor", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    bodyParts: ["Shoulders"],
    sortedEquipment: ["cable"],
  },
  standingRowVBar: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
      "Pectoralis Major Sternal Head",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["cable"],
  },
  stepUp: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "dumbbell", "bodyweight", "band"],
  },
  stiffLegDeadlift: {
    targetMuscles: ["Erector Spinae", "Gluteus Maximus", "Hamstrings"],
    synergistMuscles: ["Adductor Magnus", "Quadriceps", "Latissimus Dorsi", "Obliques", "Rectus Abdominis"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell", "dumbbell", "band"],
  },
  straightLegDeadlift: {
    targetMuscles: ["Erector Spinae", "Hamstrings"],
    synergistMuscles: ["Adductor Magnus", "Gluteus Maximus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["barbell", "dumbbell", "band", "kettlebell"],
  },
  sumoDeadlift: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps", "Adductor Magnus", "Erector Spinae"],
    synergistMuscles: [
      "Hamstrings",
      "Latissimus Dorsi",
      "Obliques",
      "Rectus Abdominis",
      "Trapezius Lower Fibers",
      "Brachialis",
      "Brachioradialis",
    ],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell"],
  },
  sumoDeadliftHighPull: {
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
    sortedEquipment: ["barbell"],
  },
  superman: {
    targetMuscles: ["Erector Spinae"],
    synergistMuscles: ["Gluteus Maximus", "Hamstrings"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight", "dumbbell"],
  },
  tBarRow: {
    targetMuscles: ["Latissimus Dorsi", "Trapezius Lower Fibers", "Trapezius Middle Fibers"],
    synergistMuscles: [
      "Infraspinatus",
      "Teres Major",
      "Teres Minor",
      "Brachialis",
      "Brachioradialis",
      "Deltoid Posterior",
      "Pectoralis Major Sternal Head",
    ],
    bodyParts: ["Back"],
    sortedEquipment: ["leverageMachine"],
  },
  thruster: {
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
    sortedEquipment: ["barbell"],
  },
  toesToBar: {
    targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
    synergistMuscles: ["Obliques", "Quadriceps", "Sartorius", "Tensor Fasciae Latae"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight"],
  },
  torsoRotation: {
    targetMuscles: ["Obliques", "Rectus Abdominis"],
    synergistMuscles: ["Erector Spinae", "Latissimus Dorsi", "Serratus Anterior"],
    bodyParts: ["Waist"],
    sortedEquipment: ["cable"],
  },
  trapBarDeadlift: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Thighs"],
    sortedEquipment: ["trapbar"],
  },
  tricepsDip: {
    targetMuscles: ["Triceps Brachii"],
    synergistMuscles: ["Latissimus Dorsi", "Pectoralis Major Sternal Head", "Teres Major"],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["bodyweight", "leverageMachine"],
  },
  tricepsExtension: {
    targetMuscles: ["Triceps Brachii"],
    synergistMuscles: [],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["barbell", "cable", "band", "dumbbell"],
  },
  tricepsPushdown: {
    targetMuscles: ["Triceps Brachii"],
    synergistMuscles: [],
    bodyParts: ["Upper Arms"],
    sortedEquipment: ["cable"],
  },
  uprightRow: {
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
    sortedEquipment: ["barbell", "cable", "dumbbell", "band"],
  },
  vUp: {
    targetMuscles: ["Iliopsoas", "Rectus Abdominis"],
    synergistMuscles: ["Obliques", "Quadriceps", "Sartorius"],
    bodyParts: ["Waist"],
    sortedEquipment: ["bodyweight", "band", "dumbbell"],
  },
  widePullUp: {
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
    sortedEquipment: ["bodyweight"],
  },
  wristCurl: {
    targetMuscles: ["Wrist Flexors"],
    synergistMuscles: [],
    bodyParts: ["Forearms"],
    sortedEquipment: ["barbell"],
  },
  wristRoller: {
    targetMuscles: ["Wrist Extensors", "Wrist Flexors"],
    synergistMuscles: [],
    bodyParts: ["Forearms"],
    sortedEquipment: ["bodyweight"],
  },
  zercherSquat: {
    targetMuscles: ["Gluteus Maximus", "Quadriceps"],
    synergistMuscles: ["Adductor Magnus", "Soleus"],
    bodyParts: ["Hips"],
    sortedEquipment: ["barbell"],
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

export function equipmentName(equipment: IEquipment | undefined, equipmentSettings?: IAllEquipment): string {
  const equipmentData = equipment && equipmentSettings ? equipmentSettings[equipment] : undefined;
  if (equipmentData?.name) {
    return equipmentData.name.trim();
  }
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
      return "";
  }
}

export type IExerciseKind = "core" | "pull" | "push" | "legs" | "upper" | "lower";

export type IExercise = {
  id: IExerciseId;
  name: string;
  defaultWarmup?: number;
  equipment?: IEquipment;
  defaultEquipment?: IEquipment;
  types: IExerciseKind[];
  onerm?: number;
  startingWeightLb: IWeight;
  startingWeightKg: IWeight;
};

export function warmupValues(units: IUnit): Partial<Record<number, IProgramExerciseWarmupSet[]>> {
  return {
    10: [
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(60, "lb") : Weight.build(30, "kg"),
        value: 0.3,
      },
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(30, "lb") : Weight.build(15, "kg"),
        value: 0.5,
      },
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(10, "lb") : Weight.build(5, "kg"),
        value: 0.8,
      },
    ],
    45: [
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(120, "lb") : Weight.build(60, "kg"),
        value: 0.3,
      },
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(90, "lb") : Weight.build(45, "kg"),
        value: 0.5,
      },
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(45, "lb") : Weight.build(20, "kg"),
        value: 0.8,
      },
    ],
    95: [
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(150, "lb") : Weight.build(70, "kg"),
        value: 0.3,
      },
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(125, "lb") : Weight.build(60, "kg"),
        value: 0.5,
      },
      {
        reps: 5,
        threshold: units === "lb" ? Weight.build(95, "lb") : Weight.build(40, "kg"),
        value: 0.8,
      },
    ],
  };
}

function warmup45(weight: IWeight, settings: ISettings, exerciseType?: IExerciseType): ISet[] {
  return warmup(warmupValues(settings.units)[45] || [])(weight, settings, exerciseType);
}

function warmup95(weight: IWeight, settings: ISettings, exerciseType?: IExerciseType): ISet[] {
  return warmup(warmupValues(settings.units)[95] || [])(weight, settings, exerciseType);
}

function warmup10(weight: IWeight, settings: ISettings, exerciseType?: IExerciseType): ISet[] {
  return warmup(warmupValues(settings.units)[10] || [])(weight, settings, exerciseType);
}

function warmup(
  programExerciseWarmupSets: IProgramExerciseWarmupSet[],
  shouldSkipThreshold: boolean = false
): (weight: IWeight, settings: ISettings, exerciseType?: IExerciseType) => ISet[] {
  return (weight: IWeight, settings: ISettings, exerciseType?: IExerciseType): ISet[] => {
    return programExerciseWarmupSets.reduce<ISet[]>((memo, programExerciseWarmupSet) => {
      if (shouldSkipThreshold || Weight.gt(weight, programExerciseWarmupSet.threshold)) {
        const value = programExerciseWarmupSet.value;
        const unit = Equipment.getUnitOrDefaultForExerciseType(settings, exerciseType);
        const warmupWeight = typeof value === "number" ? Weight.multiply(weight, value) : value;
        const roundedWeight = Weight.roundConvertTo(warmupWeight, settings, unit, exerciseType);
        memo.push({
          id: UidFactory.generateUid(6),
          reps: programExerciseWarmupSet.reps,
          weight: roundedWeight,
          originalWeight: warmupWeight,
          isCompleted: false,
        });
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
  return custom != null
    ? {
        ...custom,
        defaultWarmup: 45,
        types: custom.types || [],
        startingWeightKg: Weight.build(0, "kg"),
        startingWeightLb: Weight.build(0, "lb"),
      }
    : exercises[id];
}

function getExercise(id: IExerciseId, customExercises: IAllCustomExercises): IExercise {
  const exercise = maybeGetExercise(id, customExercises);
  return exercise != null ? exercise : exercises.squat;
}

export namespace Exercise {
  export function getMetadata(id: IExerciseId): IMetaExercises {
    return metadata[id] || {};
  }

  export function exists(name: string, customExercises: IAllCustomExercises): boolean {
    let exercise = ObjectUtils.keys(exercises).filter((k) => exercises[k].name === name)[0];
    if (exercise == null) {
      exercise = ObjectUtils.keys(customExercises).filter(
        (k) => !customExercises[k]!.isDeleted && customExercises[k]!.name === name
      )[0];
    }
    return !!exercise;
  }

  export function isCustom(id: string, customExercises: IAllCustomExercises): boolean {
    return customExercises[id] != null;
  }

  export function fullName(exercise: IExercise, settings: ISettings, label?: string): string {
    let str: string;
    if (exercise.equipment && exercise.defaultEquipment !== exercise.equipment) {
      const equipment = equipmentName(exercise.equipment, settings?.equipment);
      str = `${exercise.name}, ${equipment}`;
    } else {
      str = exercise.name;
    }
    if (label) {
      str = `${label}: ${str}`;
    }
    return str;
  }

  export function reverseName(exercise: IExercise, settings?: ISettings): string {
    if (exercise.equipment) {
      const equipment = equipmentName(exercise.equipment, settings?.equipment);
      return `${equipment} ${exercise.name}`;
    } else {
      return exercise.name;
    }
  }

  export function nameWithEquipment(exercise: IExercise, settings?: ISettings): string {
    if (exercise.equipment) {
      const equipment = equipmentName(exercise.equipment, settings?.equipment);
      return `${exercise.name}, ${equipment}`;
    } else {
      return exercise.name;
    }
  }

  export function searchNames(query: string, customExercises: IAllCustomExercises): string[] {
    const allExercises = allExpanded({});
    const exerciseNames = allExercises
      .filter((e) =>
        StringUtils.fuzzySearch(
          query.toLowerCase(),
          `${e.name}${e.equipment ? `, ${equipmentName(e.equipment)}` : ""}`.toLowerCase()
        )
      )
      .map((e) => `${e.name}${e.equipment ? `, ${equipmentName(e.equipment)}` : ""}`);
    const customExerciseNames = ObjectUtils.values(customExercises)
      .filter((ce) => (ce ? StringUtils.fuzzySearch(query.toLowerCase(), ce.name.toLowerCase()) : false))
      .map((e) => e!.name);
    const names = [...exerciseNames, ...customExerciseNames];
    names.sort();
    return names;
  }

  export function findById(id: IExerciseId, customExercises: IAllCustomExercises): IExercise | undefined {
    return maybeGetExercise(id, customExercises);
  }

  export function findIdByName(name: string, customExercises: IAllCustomExercises): IExerciseId | undefined {
    const lowercaseName = name.toLowerCase();
    return (
      nameToIdMapping[lowercaseName] ||
      ObjectUtils.values(customExercises).find((ce) => {
        const thisLowercaseName = ce?.name?.toLowerCase() || "";
        return (
          thisLowercaseName === lowercaseName ||
          thisLowercaseName.replace(/\s*,\s*/g, ",") === lowercaseName.replace(/\s*,\s*/g, ",")
        );
      })?.id
    );
  }

  export function get(type: IExerciseType, customExercises: IAllCustomExercises): IExercise {
    const exercise = getExercise(type.id, customExercises);
    return { ...exercise, equipment: type.equipment };
  }

  export function onerm(type: IExerciseType, settings: ISettings): IWeight {
    const rm = settings.exerciseData[Exercise.toKey(type)]?.rm1;
    if (rm) {
      return Weight.convertTo(rm, settings.units);
    }
    const exercise = Exercise.get(type, settings.exercises);
    return settings.units === "kg" ? exercise.startingWeightKg : exercise.startingWeightLb;
  }

  export function defaultRounding(type: IExerciseType, settings: ISettings): number {
    const units = Equipment.getUnitOrDefaultForExerciseType(settings, type);
    return Math.max(0.1, settings.exerciseData[Exercise.toKey(type)]?.rounding ?? (units === "kg" ? 2.5 : 5));
  }

  export function find(type: IExerciseType, customExercises: IAllCustomExercises): IExercise | undefined {
    const exercise = maybeGetExercise(type.id, customExercises);
    return exercise ? { ...exercise, equipment: type.equipment } : undefined;
  }

  export function getById(id: IExerciseId, customExercises: IAllCustomExercises): IExercise {
    const exercise = getExercise(id, customExercises);
    return { ...exercise, equipment: exercise.defaultEquipment };
  }

  export function findByNameEquipment(
    customExercises: IAllCustomExercises,
    name: string,
    equipment?: string
  ): IExercise | undefined {
    let exerciseId = findIdByName(name, customExercises);
    const exercise = exerciseId ? findById(exerciseId, customExercises) : undefined;
    if (exercise == null) {
      return undefined;
    }
    return { ...exercise, equipment };
  }

  export function findByNameAndEquipment(
    nameAndEquipment: string,
    customExercises: IAllCustomExercises
  ): IExercise | undefined {
    const parts = nameAndEquipment.split(",").map((p) => p.trim());
    let name: string | undefined;
    let equipment: IEquipment | undefined | null;
    if (parts.length > 1) {
      const foundEquipment = equipments.filter(
        (e) => equipmentName(e).toLowerCase() === parts[parts.length - 1].toLowerCase()
      )[0];
      if (foundEquipment != null) {
        equipment = foundEquipment;
        name = parts.slice(0, parts.length - 1).join(", ");
      } else {
        equipment = null;
      }
    }
    if (name == null) {
      name = nameAndEquipment;
    }
    let exerciseId = findIdByName(name, {});
    if (exerciseId != null && equipment !== null) {
      const exercise = findById(exerciseId, {});
      if (exercise != null) {
        return { ...exercise, equipment: equipment || exercise.defaultEquipment };
      }
    } else {
      exerciseId = findIdByName(nameAndEquipment, customExercises);
      if (exerciseId != null) {
        const exercise = findById(exerciseId, customExercises);
        if (exercise != null) {
          return { ...exercise };
        }
      }
    }
    return undefined;
  }

  export function findByName(name: string, customExercises: IAllCustomExercises): IExercise | undefined {
    const exerciseId = findIdByName(name.trim(), customExercises);
    if (exerciseId != null) {
      const exercise = findById(exerciseId, customExercises);
      if (exercise != null) {
        return { ...exercise, equipment: exercise.defaultEquipment };
      }
    }
    return undefined;
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

  export function allExpanded(customExercises: IAllCustomExercises): IExercise[] {
    return ObjectUtils.keys(customExercises)
      .map((id) => getExercise(id, customExercises))
      .concat(
        ObjectUtils.keys(exercises).flatMap((k) => {
          return CollectionUtils.compact(
            equipments.map((equipment) => {
              const exerciseType = { id: k, equipment };
              return ExerciseImageUtils.exists(exerciseType, "small") ? { ...exercises[k], equipment } : undefined;
            })
          );
        })
      );
  }

  export function toExternalUrl(type: IExerciseType): string {
    return `/exercises/${toUrlSlug(type)}`;
  }

  export function toUrlSlug(type: IExerciseType): string {
    const possibleEquipments: Record<string, IEquipment> = {
      barbell: "barbell",
      cable: "cable",
      dumbbell: "dumbbell",
      smith: "smith",
      band: "band",
      kettlebell: "kettlebell",
      bodyweight: "bodyweight",
      leverageMachine: "leverage-machine",
      medicineball: "medicine-ball",
      ezbar: "ez-bar",
      trapbar: "trap-bar",
    };

    const equipment = type.equipment ? possibleEquipments[type.equipment] : undefined;
    const equipmentSlug = equipment ? `${equipment}-` : "";
    return `${equipmentSlug}${StringUtils.dashcase(StringUtils.uncamelCase(type.id))}`;
  }

  export function fromUrlSlug(slug: string): IExerciseType | undefined {
    // slug looks like leverage-machine-squat or barbell-bench-press
    const possibleEquipments: Record<string, IEquipment> = {
      barbell: "barbell",
      cable: "cable",
      dumbbell: "dumbbell",
      smith: "smith",
      band: "band",
      kettlebell: "kettlebell",
      bodyweight: "bodyweight",
      "leverage-machine": "leverageMachine",
      "medicine-ball": "medicineball",
      "ez-bar": "ezbar",
      "trap-bar": "trapbar",
    };
    let equipment: IEquipment | undefined = undefined;
    const equipmentKey = ObjectUtils.keys(possibleEquipments).find((e) => slug.startsWith(e));
    if (equipmentKey != null) {
      equipment = possibleEquipments[equipmentKey];
      slug = slug.slice(equipmentKey.length + 1);
    }
    const exerciseId = StringUtils.camelCase(StringUtils.undashcase(slug));
    if (exercises[exerciseId]) {
      return { id: exerciseId as IExerciseId, equipment };
    } else {
      return undefined;
    }
  }

  export function eq(a: IExerciseType, b: IExerciseType): boolean {
    return a.id === b.id && a.equipment === b.equipment;
  }

  export function filterExercisesByNameAndType(
    settings: ISettings,
    filter: string,
    filterTypes: string[],
    isSubstitute: boolean,
    exerciseType?: IExerciseType,
    length?: number
  ): IExercise[] {
    let allExercises = Exercise.allExpanded({});
    if (filter) {
      allExercises = Exercise.filterExercises(allExercises, filter);
    }
    if (filterTypes && filterTypes.length > 0) {
      allExercises = Exercise.filterExercisesByType(allExercises, filterTypes, settings);
    }
    allExercises = Exercise.sortExercises(allExercises, isSubstitute, settings, filterTypes, exerciseType);
    if (length != null) {
      allExercises = allExercises.slice(0, length);
    }
    return allExercises;
  }

  export function getWarmupSets(
    exercise: IExerciseType,
    weight: IWeight,
    settings: ISettings,
    programExerciseWarmupSets?: IProgramExerciseWarmupSet[]
  ): ISet[] {
    const ex = get(exercise, settings.exercises);
    if (programExerciseWarmupSets != null) {
      return warmup(programExerciseWarmupSets, true)(weight, settings, exercise);
    } else {
      let warmupSets = warmupEmpty(weight);
      if (ex.defaultWarmup === 10) {
        warmupSets = warmup10(weight, settings, exercise);
      } else if (ex.defaultWarmup === 45) {
        warmupSets = warmup45(weight, settings, exercise);
      } else if (ex.defaultWarmup === 95) {
        warmupSets = warmup95(weight, settings, exercise);
      }
      return warmupSets;
    }
  }

  export function targetMuscles(type: IExerciseType, customExercises: IAllCustomExercises): IMuscle[] {
    const customExercise = customExercises[type.id];
    if (customExercise) {
      return customExercise.meta.targetMuscles;
    } else {
      const meta = getMetadata(type.id);
      return meta?.targetMuscles != null ? meta.targetMuscles : [];
    }
  }

  export function targetMusclesGroups(type: IExerciseType, customExercises: IAllCustomExercises): IScreenMuscle[] {
    const muscles = targetMuscles(type, customExercises);
    const allMuscleGroups = new Set<IScreenMuscle>();
    for (const muscle of muscles) {
      const muscleGroups = Muscle.getScreenMusclesFromMuscle(muscle);
      for (const muscleGroup of muscleGroups) {
        allMuscleGroups.add(muscleGroup);
      }
    }
    return Array.from(allMuscleGroups);
  }

  export function synergistMuscles(type: IExerciseType, customExercises: IAllCustomExercises): IMuscle[] {
    const customExercise = customExercises[type.id];
    if (customExercise) {
      return customExercise.meta.synergistMuscles;
    } else {
      const meta = getMetadata(type.id);
      return meta?.synergistMuscles != null ? meta.synergistMuscles : [];
    }
  }

  export function synergistMusclesGroups(type: IExerciseType, customExercises: IAllCustomExercises): IScreenMuscle[] {
    const muscles = synergistMuscles(type, customExercises);
    const allMuscleGroups = new Set<IScreenMuscle>();
    for (const muscle of muscles) {
      const muscleGroups = Muscle.getScreenMusclesFromMuscle(muscle);
      for (const muscleGroup of muscleGroups) {
        allMuscleGroups.add(muscleGroup);
      }
    }
    return Array.from(allMuscleGroups);
  }

  export function toKey(type: IExerciseType): string {
    return `${type.id}${type.equipment ? `_${type.equipment}` : ""}`;
  }

  export function fromKey(type: string): IExerciseType {
    const [id, equipment] = type.split("_");
    return { id: id as IExerciseId, equipment: equipment };
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
    const sortedEquipment = getMetadata(type).sortedEquipment || [];
    let equipment: IEquipment | undefined = sortedEquipment.find((b) => b === bar);
    equipment = equipment || (priorities[bar] || []).find((eqp) => sortedEquipment.indexOf(eqp) !== -1);
    equipment = equipment || sortedEquipment[0];
    return equipment;
  }

  export function similarRating(current: IExerciseType, e: IExercise, customExercises: IAllCustomExercises): number {
    const tm = Exercise.targetMuscles(current, customExercises);
    const sm = Exercise.synergistMuscles(current, customExercises);
    const etm = Exercise.targetMuscles(e, customExercises);
    const esm = Exercise.synergistMuscles(e, customExercises);
    let rating = 0;
    if (e.id === current.id || (etm.length === 0 && esm.length === 0)) {
      rating = -Infinity;
    } else {
      for (const muscle of etm) {
        if (tm.indexOf(muscle) !== -1) {
          rating += 60;
        } else {
          rating -= 30;
        }
        if (sm.indexOf(muscle) !== -1) {
          rating += 20;
        }
      }
      for (const muscle of tm) {
        if (etm.indexOf(muscle) === -1) {
          rating -= 30;
        }
      }
      for (const muscle of esm) {
        if (sm.indexOf(muscle) !== -1) {
          rating += 30;
        } else {
          rating -= 15;
        }
        if (tm.indexOf(muscle) !== -1) {
          rating += 10;
        }
      }
      for (const muscle of sm) {
        if (esm.indexOf(muscle) === -1) {
          rating -= 15;
        }
      }
      if (e.defaultEquipment === "cable" || e.defaultEquipment === "leverageMachine") {
        rating -= 20;
      }
    }
    return rating;
  }

  export function similar(type: IExerciseType, customExercises: IAllCustomExercises): [IExercise, number][] {
    const tm = Exercise.targetMuscles(type, customExercises);
    const sm = Exercise.synergistMuscles(type, customExercises);
    if (tm.length === 0 && sm.length === 0) {
      return [];
    }
    const rated = Exercise.all(customExercises).map<[IExercise, number]>((e) => {
      const rating = similarRating(type, e, customExercises);
      return [e, rating];
    });
    rated.sort((a, b) => b[1] - a[1]);
    return rated.filter(([, r]) => r > 0);
  }

  export function sortedByScreenMuscle(
    muscle: IScreenMuscle,
    customExercises: IAllCustomExercises
  ): [IExercise, number][] {
    const muscles = Muscle.getMusclesFromScreenMuscle(muscle);

    const rated = Exercise.all(customExercises).map<[IExercise, number]>((e) => {
      let rating = 0;
      const tm = Exercise.targetMuscles(e, customExercises);
      const sm = Exercise.synergistMuscles(e, customExercises);
      for (const m of tm) {
        if (muscles.indexOf(m) !== -1) {
          rating += 100;
        }
      }
      for (const m of sm) {
        if (muscles.indexOf(m) !== -1) {
          rating += 10;
        }
      }
      return [e, rating];
    });
    rated.sort((a, b) => b[1] - a[1]);
    return rated.filter(([, r]) => r > 0);
  }

  export function createOrUpdateCustomExercise<T>(
    allExercises: IAllCustomExercises,
    name: string,
    tMuscles: IMuscle[],
    sMuscles: IMuscle[],
    types: IExerciseKind[],
    smallImageUrl?: string,
    largeImageUrl?: string,
    exercise?: ICustomExercise
  ): IAllCustomExercises {
    if (exercise != null) {
      const newExercise: ICustomExercise = {
        ...exercise,
        name,
        types,
        smallImageUrl,
        largeImageUrl,
        meta: { ...exercise.meta, targetMuscles: tMuscles, synergistMuscles: sMuscles },
      };
      return { ...allExercises, [newExercise.id]: newExercise };
    } else {
      const deletedExerciseKey = ObjectUtils.keys(allExercises).filter(
        (k) => allExercises[k]?.isDeleted && allExercises[k]?.name === name
      )[0];
      const deletedExercise = deletedExerciseKey != null ? allExercises[deletedExerciseKey] : undefined;
      if (deletedExercise) {
        return {
          ...allExercises,
          [deletedExercise.id]: {
            ...deletedExercise,
            name,
            types,
            smallImageUrl,
            largeImageUrl,
            isDeleted: false,
            meta: {
              targetMuscles: tMuscles,
              bodyParts: [],
              synergistMuscles: sMuscles,
            },
          },
        };
      } else {
        const id = UidFactory.generateUid(8);
        const newExercise: ICustomExercise = {
          id,
          name,
          isDeleted: false,
          types,
          smallImageUrl,
          largeImageUrl,
          meta: {
            targetMuscles: tMuscles,
            synergistMuscles: sMuscles,
            bodyParts: [],
            sortedEquipment: [],
          },
        };
        return { ...allExercises, [id]: newExercise };
      }
    }
  }

  export function mergeExercises(
    oldExercises: IAllCustomExercises,
    newExercises: IAllCustomExercises
  ): IAllCustomExercises {
    const newKeys = Array.from(new Set([...ObjectUtils.keys(newExercises), ...ObjectUtils.keys(oldExercises)]));
    return newKeys.reduce<IAllCustomExercises>((acc, name) => {
      const newExercisesData = newExercises[name];
      const oldExercisesData = oldExercises[name];
      if (newExercisesData != null && oldExercisesData == null) {
        acc[name] = newExercisesData;
      } else if (newExercisesData == null && oldExercisesData != null) {
        acc[name] = oldExercisesData;
      } else if (newExercisesData != null && oldExercisesData != null) {
        acc[name] = {
          id: newExercisesData.id,
          name: newExercisesData.name,
          defaultEquipment: newExercisesData.defaultEquipment,
          isDeleted: newExercisesData.isDeleted,
          meta: {
            targetMuscles: CollectionUtils.merge(
              newExercisesData.meta.targetMuscles || [],
              oldExercisesData.meta.targetMuscles || []
            ),
            synergistMuscles: CollectionUtils.merge(
              newExercisesData.meta.synergistMuscles || [],
              oldExercisesData.meta.synergistMuscles || []
            ),
            bodyParts: CollectionUtils.merge(
              newExercisesData.meta.bodyParts || [],
              oldExercisesData.meta.bodyParts || []
            ),
            sortedEquipment: newExercisesData.meta.sortedEquipment
              ? CollectionUtils.merge(newExercisesData.meta.sortedEquipment, [])
              : undefined,
          },
          types: CollectionUtils.merge(newExercisesData.types || [], oldExercisesData.types || []),
        };
      }
      return acc;
    }, {});
  }

  export function filterExercises<T extends { name: string }>(allExercises: T[], filter: string): T[] {
    return allExercises.filter((e) => StringUtils.fuzzySearch(filter.toLowerCase(), e.name.toLowerCase()));
  }

  export function sortExercises(
    allExercises: IExercise[],
    isSubstitute: boolean,
    settings: ISettings,
    filterTypes?: string[],
    currentExerciseType?: IExerciseType
  ): IExercise[] {
    return CollectionUtils.sort(allExercises, (a, b) => {
      const exerciseType = currentExerciseType;
      if (isSubstitute && exerciseType) {
        const aRating = Exercise.similarRating(exerciseType, a, settings.exercises);
        const bRating = Exercise.similarRating(exerciseType, b, settings.exercises);
        return bRating - aRating;
      } else if (
        filterTypes &&
        screenMuscles
          .map((m) => m.toLowerCase())
          .some((t) => filterTypes.map((ft) => ft.toLowerCase()).indexOf(t) !== -1)
      ) {
        const lowercaseFilterTypes = filterTypes.map((t) => t.toLowerCase());
        const aTargetMuscleGroups = Exercise.targetMusclesGroups(a, settings.exercises);
        const bTargetMuscleGroups = Exercise.targetMusclesGroups(b, settings.exercises);
        if (
          aTargetMuscleGroups.some((m) => lowercaseFilterTypes.indexOf(m) !== -1) &&
          bTargetMuscleGroups.every((m) => lowercaseFilterTypes.indexOf(m) === -1)
        ) {
          return -1;
        } else if (
          bTargetMuscleGroups.some((m) => lowercaseFilterTypes.indexOf(m) !== -1) &&
          aTargetMuscleGroups.every((m) => lowercaseFilterTypes.indexOf(m) === -1)
        ) {
          return 1;
        } else {
          return a.name.localeCompare(b.name);
        }
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }

  export function filterExercisesByType<T extends IExerciseType>(
    allExercises: T[],
    filterTypes: string[],
    settings: ISettings
  ): T[] {
    return allExercises.filter((e) => {
      const exercise = get(e, settings.exercises);
      const targetMuscleGroups = Exercise.targetMusclesGroups(e, {}).map((m) => m.toLowerCase());
      const synergistMuscleGroups = Exercise.synergistMusclesGroups(e, {}).map((m) => m.toLowerCase());
      return filterTypes
        .map((ft) => ft.toLowerCase())
        .every((ft) => {
          return (
            targetMuscleGroups.indexOf(ft) !== -1 ||
            synergistMuscleGroups.indexOf(ft) !== -1 ||
            exercise.types.map((t) => t.toLowerCase()).indexOf(ft) !== -1 ||
            equipmentName(e.equipment).toLowerCase() === ft
          );
        });
    });
  }

  export function filterCustomExercises(customExercises: IAllCustomExercises, filter: string): IAllCustomExercises {
    return ObjectUtils.filter(customExercises, (e, v) =>
      v ? StringUtils.fuzzySearch(filter, v.name.toLowerCase()) : true
    );
  }

  export function filterCustomExercisesByType(
    customExercises: IAllCustomExercises,
    filterTypes: string[]
  ): IAllCustomExercises {
    return ObjectUtils.filter(customExercises, (_id, exercise) => {
      if (!exercise) {
        return false;
      }
      const targetMuscleGroups = Array.from(
        new Set(CollectionUtils.flat(exercise.meta.targetMuscles.map((m) => Muscle.getScreenMusclesFromMuscle(m))))
      ).map((m) => StringUtils.capitalize(m));
      const synergistMuscleGroups = Array.from(
        new Set(CollectionUtils.flat(exercise.meta.synergistMuscles.map((m) => Muscle.getScreenMusclesFromMuscle(m))))
      ).map((m) => StringUtils.capitalize(m));
      return filterTypes.every((ft) => {
        return (
          targetMuscleGroups.indexOf(ft) !== -1 ||
          synergistMuscleGroups.indexOf(ft) !== -1 ||
          (exercise.types || []).map(StringUtils.capitalize).indexOf(ft) !== -1
        );
      });
    });
  }
}
