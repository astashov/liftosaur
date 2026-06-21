/* eslint-disable no-void */
import * as v from "valibot";
import { IVersions, IVersionTypes } from "./models/versionTracker/types";
import { IEquals } from "./utils/types";

export const equipments = [
  "barbell",
  "cable",
  "dumbbell",
  "smith",
  "band",
  "kettlebell",
  "bodyweight",
  "leverageMachine",
  "medicineball",
  "ezbar",
  "trapbar",
] as const;

export const exerciseTypes = [
  "abWheel",
  "arnoldPress",
  "aroundTheWorld",
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
  "gluteBridge",
  "gluteBridgeMarch",
  "gluteKickback",
  "gobletSquat",
  "goodMorning",
  "hackSquat",
  "hammerCurl",
  "handstandPushUp",
  "hangClean",
  "hangSnatch",
  "hangingLegRaise",
  "highKneeSkips",
  "highRow",
  "hipAbductor",
  "hipAdductor",
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
  "reverseHyperextension",
  "reverseWristCurl",
  "reverseLunge",
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
  "sideCrunch",
  "sideHipAbductor",
  "sideLyingClam",
  "sidePlank",
  "singleLegBridge",
  "singleLegDeadlift",
  "singleLegGluteBridgeBench",
  "singleLegGluteBridgeStraight",
  "singleLegGluteBridgeBentKnee",
  "singleLegHipThrust",
  "sitUp",
  "skullcrusher",
  "snatch",
  "snatchPull",
  "splitSquat",
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
  "wristCurl",
  "wristRoller",
  "zercherSquat",
] as const;
export const availableMuscles = [
  "Adductor Brevis",
  "Adductor Longus",
  "Adductor Magnus",
  "Biceps Brachii",
  "Brachialis",
  "Brachioradialis",
  "Deltoid Anterior",
  "Deltoid Lateral",
  "Deltoid Posterior",
  "Erector Spinae",
  "Gastrocnemius",
  "Gluteus Maximus",
  "Gluteus Medius",
  "Hamstrings",
  "Iliopsoas",
  "Infraspinatus",
  "Latissimus Dorsi",
  "Levator Scapulae",
  "Obliques",
  "Pectineous",
  "Pectoralis Major Clavicular Head",
  "Pectoralis Major Sternal Head",
  "Quadriceps",
  "Rectus Abdominis",
  "Sartorius",
  "Serratus Anterior",
  "Soleus",
  "Splenius",
  "Sternocleidomastoid",
  "Tensor Fasciae Latae",
  "Teres Major",
  "Teres Minor",
  "Tibialis Anterior",
  "Trapezius Lower Fibers",
  "Trapezius Middle Fibers",
  "Trapezius Upper Fibers",
  "Triceps Brachii",
  "Wrist Extensors",
  "Wrist Flexors",
] as const;

export const availableBodyParts: string[] = [
  "Back",
  "Calves",
  "Chest",
  "Forearms",
  "Hips",
  "Shoulders",
  "Thighs",
  "Upper Arms",
  "Waist",
];

export const exerciseKinds = ["core", "pull", "push", "legs", "upper", "lower"] as const;
export const graphExerciseSelectedTypes = ["weight", "volume"] as const;
export const graphMuscleGroupSelectedTypes = ["volume", "sets"] as const;
export const units = ["kg", "lb"] as const;
export const percentageUnits = ["%"] as const;
export const lengthUnits = ["in", "cm"] as const;
export const historyRecordChange = ["order"] as const;
export const targetTypes = ["target", "lasttime", "platescalculator", "e1rm"] as const;
export const exercisePickerSorts = ["name_asc", "similar_muscles"] as const;

export const screenMuscles: string[] = [
  "shoulders",
  "triceps",
  "back",
  "abs",
  "glutes",
  "hamstrings",
  "quadriceps",
  "chest",
  "biceps",
  "calves",
  "forearms",
];

export const statsWeightDef = ["weight"] as const;
export const statsLengthDef = [
  "neck",
  "shoulders",
  "bicepLeft",
  "bicepRight",
  "forearmLeft",
  "forearmRight",
  "chest",
  "waist",
  "hips",
  "thighLeft",
  "thighRight",
  "calfLeft",
  "calfRight",
] as const;
export const statsPercentageDef = ["bodyfat"] as const;

export const VUnit = v.picklist(units);
export type IUnit = v.InferOutput<typeof VUnit>;

export const VPercentageUnit = v.picklist(percentageUnits);
export type IPercentageUnit = v.InferOutput<typeof VPercentageUnit>;

export const VLengthUnit = v.picklist(lengthUnits);
export type ILengthUnit = v.InferOutput<typeof VLengthUnit>;

export const VExerciseKind = v.picklist(exerciseKinds);
export type IExerciseKind = v.InferOutput<typeof VExerciseKind>;

export const VMuscle = v.picklist(availableMuscles);
export type IMuscle = v.InferOutput<typeof VMuscle>;

export const VBodyPart = v.picklist(availableBodyParts as readonly string[]);
export type IBodyPart = v.InferOutput<typeof VBodyPart>;

export const VBarKey = v.picklist(["barbell", "ezbar", "dumbbell"] as const);
export type IBarKey = v.InferOutput<typeof VBarKey>;

export const VBuiltinEquipment = v.picklist(equipments);
export type IBuiltinEquipment = v.InferOutput<typeof VBuiltinEquipment>;

export const VExercisePickerSort = v.picklist(exercisePickerSorts);
export type IExercisePickerSort = v.InferOutput<typeof VExercisePickerSort>;

export const VExercisePickerScreen = v.picklist(["exercisePicker", "customExercise", "filter", "settings"] as const);
export type IExercisePickerScreen = v.InferOutput<typeof VExercisePickerScreen>;

export const VHistoryRecordChange = v.picklist(historyRecordChange);
export type IHistoryRecordChange = v.InferOutput<typeof VHistoryRecordChange>;

export const VTargetType = v.picklist(targetTypes);
export type ITargetType = v.InferOutput<typeof VTargetType>;

export const VProgressMode = v.picklist(["warmup", "workout"] as const);
export type IProgressMode = v.InferOutput<typeof VProgressMode>;

export const VProgramTag = v.picklist([
  "first-starter",
  "beginner",
  "barbell",
  "dumbbell",
  "intermediate",
  "woman",
  "ppl",
  "hypertrophy",
] as const);
export type IProgramTag = v.InferOutput<typeof VProgramTag>;

export const VGraphExerciseSelectedType = v.picklist(graphExerciseSelectedTypes);
export type IGraphExerciseSelectedType = v.InferOutput<typeof VGraphExerciseSelectedType>;

export const VGraphMuscleGroupSelectedType = v.picklist(graphMuscleGroupSelectedTypes);
export type IGraphMuscleGroupSelectedType = v.InferOutput<typeof VGraphMuscleGroupSelectedType>;

export const VScreenMuscle = v.union([v.picklist(screenMuscles as readonly string[]), v.string()]);
export type IScreenMuscle = v.InferOutput<typeof VScreenMuscle>;

export const VEquipment = v.string();
export type IEquipment = v.InferOutput<typeof VEquipment>;

export const VExerciseId = v.string();
export type IExerciseId = v.InferOutput<typeof VExerciseId>;

export interface IWeight {
  value: number;
  unit: IUnit;
}
const _VWeight = v.object({
  value: v.number(),
  unit: VUnit,
});
const _VWeightMatches: IEquals<v.InferOutput<typeof _VWeight>, IWeight> = true;
void _VWeightMatches;
export const VWeight: v.GenericSchema<IWeight> = _VWeight;

export interface IPercentage {
  value: number;
  unit: IPercentageUnit;
}
const _VPercentage = v.object({
  value: v.number(),
  unit: VPercentageUnit,
});
const _VPercentageMatches: IEquals<v.InferOutput<typeof _VPercentage>, IPercentage> = true;
void _VPercentageMatches;
export const VPercentage: v.GenericSchema<IPercentage> = _VPercentage;

export interface ILength {
  value: number;
  unit: ILengthUnit;
}
const _VLength = v.object({
  value: v.number(),
  unit: VLengthUnit,
});
const _VLengthMatches: IEquals<v.InferOutput<typeof _VLength>, ILength> = true;
void _VLengthMatches;
export const VLength: v.GenericSchema<ILength> = _VLength;

export interface IPlate {
  weight: IWeight;
  num: number;
}
const _VPlate = v.object({
  weight: VWeight,
  num: v.number(),
});
const _VPlateMatches: IEquals<v.InferOutput<typeof _VPlate>, IPlate> = true;
void _VPlateMatches;
export const VPlate: v.GenericSchema<IPlate> = _VPlate;

export const VBars = v.record(v.string(), VWeight);
export type IBars = v.InferOutput<typeof VBars>;

export interface IMetaExercises {
  bodyParts: IBodyPart[];
  targetMuscles: IMuscle[];
  synergistMuscles: IMuscle[];
  sortedEquipment?: IEquipment[];
}
const _VMetaExercises = v.object({
  bodyParts: v.array(VBodyPart),
  targetMuscles: v.array(VMuscle),
  synergistMuscles: v.array(VMuscle),
  sortedEquipment: v.optional(v.array(VEquipment)),
});
const _VMetaExercisesMatches: IEquals<v.InferOutput<typeof _VMetaExercises>, IMetaExercises> = true;
void _VMetaExercisesMatches;
export const VMetaExercises: v.GenericSchema<IMetaExercises> = _VMetaExercises;

export interface IExerciseType {
  id: IExerciseId;
  equipment?: IEquipment;
}
const _VExerciseType = v.object({
  id: VExerciseId,
  equipment: v.optional(VEquipment),
});
const _VExerciseTypeMatches: IEquals<v.InferOutput<typeof _VExerciseType>, IExerciseType> = true;
void _VExerciseTypeMatches;
export const VExerciseType: v.GenericSchema<IExerciseType> = _VExerciseType;

export interface ICustomExercise {
  vtype: "custom_exercise";
  id: IExerciseId;
  name: string;
  isDeleted: boolean;
  meta: IMetaExercises;
  defaultEquipment?: IEquipment;
  types?: IExerciseKind[];
  clonedFrom?: IExerciseType;
  reuseImageFrom?: IExerciseType;
  largeImageUrl?: string;
  smallImageUrl?: string;
}
const _VCustomExercise = v.object({
  vtype: v.literal("custom_exercise"),
  id: VExerciseId,
  name: v.string(),
  isDeleted: v.boolean(),
  meta: VMetaExercises,
  defaultEquipment: v.optional(VEquipment),
  types: v.optional(v.array(VExerciseKind)),
  clonedFrom: v.optional(VExerciseType),
  reuseImageFrom: v.optional(VExerciseType),
  largeImageUrl: v.optional(v.string()),
  smallImageUrl: v.optional(v.string()),
});
const _VCustomExerciseMatches: IEquals<v.InferOutput<typeof _VCustomExercise>, ICustomExercise> = true;
void _VCustomExerciseMatches;
export const VCustomExercise: v.GenericSchema<ICustomExercise> = _VCustomExercise;
export type IAllCustomExercises = Partial<Record<string, ICustomExercise>>;

export interface ISet {
  vtype: "set";
  index: number;
  id: string;
  reps?: number;
  originalWeight?: IWeight | IPercentage;
  weight?: IWeight;
  minReps?: number;
  rpe?: number;
  logRpe?: boolean;
  timestamp?: number;
  isAmrap?: boolean;
  label?: string;
  timer?: number;
  askWeight?: boolean;
  isCompleted?: boolean;
  isUnilateral?: boolean;
  completedRepsLeft?: number;
  completedReps?: number;
  completedWeight?: IWeight;
  completedRpe?: number;
  programSetIndex?: number;
}
const _VSet = v.object({
  vtype: v.literal("set"),
  index: v.number(),
  id: v.string(),
  reps: v.optional(v.number()),
  originalWeight: v.optional(v.union([VWeight, VPercentage])),
  weight: v.optional(VWeight),
  minReps: v.optional(v.number()),
  rpe: v.optional(v.number()),
  logRpe: v.optional(v.boolean()),
  timestamp: v.optional(v.number()),
  isAmrap: v.optional(v.boolean()),
  label: v.optional(v.string()),
  timer: v.optional(v.number()),
  askWeight: v.optional(v.boolean()),
  isCompleted: v.optional(v.boolean()),
  isUnilateral: v.optional(v.boolean()),
  completedRepsLeft: v.optional(v.number()),
  completedReps: v.optional(v.number()),
  completedWeight: v.optional(VWeight),
  completedRpe: v.optional(v.number()),
  programSetIndex: v.optional(v.number()),
});
const _VSetMatches: IEquals<v.InferOutput<typeof _VSet>, ISet> = true;
void _VSetMatches;
export const VSet: v.GenericSchema<ISet> = _VSet;

export const VProgramState = v.record(v.string(), v.union([v.number(), VWeight, VPercentage]));
export type IProgramState = v.InferOutput<typeof VProgramState>;

export interface IHistoryEntryProgressSnapshot {
  diffState?: Record<string, string>;
  diffVars?: Record<string, string>;
  prints?: (number | IWeight | IPercentage)[][];
  updatePrints?: (number | IWeight | IPercentage)[][];
}
const _VHistoryEntryProgressSnapshot = v.object({
  diffState: v.optional(v.record(v.string(), v.string())),
  diffVars: v.optional(v.record(v.string(), v.string())),
  prints: v.optional(v.array(v.array(v.union([v.number(), VWeight, VPercentage])))),
  updatePrints: v.optional(v.array(v.array(v.union([v.number(), VWeight, VPercentage])))),
});
const _VHistoryEntryProgressSnapshotMatches: IEquals<
  v.InferOutput<typeof _VHistoryEntryProgressSnapshot>,
  IHistoryEntryProgressSnapshot
> = true;
void _VHistoryEntryProgressSnapshotMatches;
export const VHistoryEntryProgressSnapshot: v.GenericSchema<IHistoryEntryProgressSnapshot> =
  _VHistoryEntryProgressSnapshot;

export interface IHistoryEntry {
  vtype: "history_entry";
  exercise: IExerciseType;
  sets: ISet[];
  warmupSets: ISet[];
  index: number;
  id: string;
  programExerciseId?: string;
  state?: IProgramState;
  vars?: IProgramState;
  notes?: string;
  changed?: boolean;
  isSuppressed?: boolean;
  superset?: string;
  updatePrints?: (number | IWeight | IPercentage)[][];
  descriptionSnapshot?: string;
  progressSnapshot?: IHistoryEntryProgressSnapshot;
}
const _VHistoryEntry = v.object({
  vtype: v.literal("history_entry"),
  exercise: VExerciseType,
  sets: v.array(VSet),
  warmupSets: v.array(VSet),
  index: v.number(),
  id: v.string(),
  programExerciseId: v.optional(v.string()),
  state: v.optional(VProgramState),
  vars: v.optional(VProgramState),
  notes: v.optional(v.string()),
  changed: v.optional(v.boolean()),
  isSuppressed: v.optional(v.boolean()),
  superset: v.optional(v.string()),
  updatePrints: v.optional(v.array(v.array(v.union([v.number(), VWeight, VPercentage])))),
  descriptionSnapshot: v.optional(v.string()),
  progressSnapshot: v.optional(VHistoryEntryProgressSnapshot),
});
const _VHistoryEntryMatches: IEquals<v.InferOutput<typeof _VHistoryEntry>, IHistoryEntry> = true;
void _VHistoryEntryMatches;
export const VHistoryEntry: v.GenericSchema<IHistoryEntry> = _VHistoryEntry;

export interface IProgramStateMetadataValue {
  userPrompted?: boolean;
}
const _VProgramStateMetadataValue = v.object({
  userPrompted: v.optional(v.boolean()),
});
const _VProgramStateMetadataValueMatches: IEquals<
  v.InferOutput<typeof _VProgramStateMetadataValue>,
  IProgramStateMetadataValue
> = true;
void _VProgramStateMetadataValueMatches;
export const VProgramStateMetadataValue: v.GenericSchema<IProgramStateMetadataValue> = _VProgramStateMetadataValue;

export const VProgramStateMetadata = v.record(v.string(), v.optional(VProgramStateMetadataValue));
export type IProgramStateMetadata = v.InferOutput<typeof VProgramStateMetadata>;

export interface IProgramSet {
  repsExpr: string;
  weightExpr: string;
  isAmrap?: boolean;
  rpeExpr?: string;
  minRepsExpr?: string;
  logRpe?: boolean;
  askWeight?: boolean;
  label?: string;
  timerExpr?: string;
}
const _VProgramSet = v.object({
  repsExpr: v.string(),
  weightExpr: v.string(),
  isAmrap: v.optional(v.boolean()),
  rpeExpr: v.optional(v.string()),
  minRepsExpr: v.optional(v.string()),
  logRpe: v.optional(v.boolean()),
  askWeight: v.optional(v.boolean()),
  label: v.optional(v.string()),
  timerExpr: v.optional(v.string()),
});
const _VProgramSetMatches: IEquals<v.InferOutput<typeof _VProgramSet>, IProgramSet> = true;
void _VProgramSetMatches;
export const VProgramSet: v.GenericSchema<IProgramSet> = _VProgramSet;

export interface IProgramExerciseVariation {
  sets: IProgramSet[];
  quickAddSets?: boolean;
}
const _VProgramExerciseVariation = v.object({
  sets: v.array(VProgramSet),
  quickAddSets: v.optional(v.boolean()),
});
const _VProgramExerciseVariationMatches: IEquals<
  v.InferOutput<typeof _VProgramExerciseVariation>,
  IProgramExerciseVariation
> = true;
void _VProgramExerciseVariationMatches;
export const VProgramExerciseVariation: v.GenericSchema<IProgramExerciseVariation> = _VProgramExerciseVariation;

export interface IProgramExerciseWarmupSet {
  reps: number;
  value: IWeight | number;
  threshold: IWeight;
}
const _VProgramExerciseWarmupSet = v.object({
  reps: v.number(),
  value: v.union([VWeight, v.number()]),
  threshold: VWeight,
});
const _VProgramExerciseWarmupSetMatches: IEquals<
  v.InferOutput<typeof _VProgramExerciseWarmupSet>,
  IProgramExerciseWarmupSet
> = true;
void _VProgramExerciseWarmupSetMatches;
export const VProgramExerciseWarmupSet: v.GenericSchema<IProgramExerciseWarmupSet> = _VProgramExerciseWarmupSet;

export interface IProgramExerciseReuseLogic {
  selected?: string;
  states: Record<string, IProgramState>;
}
const _VProgramExerciseReuseLogic = v.object({
  selected: v.optional(v.string()),
  states: v.record(v.string(), VProgramState),
});
const _VProgramExerciseReuseLogicMatches: IEquals<
  v.InferOutput<typeof _VProgramExerciseReuseLogic>,
  IProgramExerciseReuseLogic
> = true;
void _VProgramExerciseReuseLogicMatches;
export const VProgramExerciseReuseLogic: v.GenericSchema<IProgramExerciseReuseLogic> = _VProgramExerciseReuseLogic;

export interface IProgramExercise {
  exerciseType: IExerciseType;
  id: string;
  name: string;
  variations: v.InferOutput<typeof VProgramExerciseVariation>[];
  state: IProgramState;
  variationExpr: string;
  finishDayExpr: string;
  descriptions: string[];
  tags?: number[];
  updateDayExpr?: string;
  diffPaths?: string[];
  description?: string;
  descriptionExpr?: string;
  quickAddSets?: boolean;
  enableRepRanges?: boolean;
  enableRpe?: boolean;
  stateMetadata?: IProgramStateMetadata;
  timerExpr?: string;
  reuseLogic?: v.InferOutput<typeof VProgramExerciseReuseLogic>;
  warmupSets?: v.InferOutput<typeof VProgramExerciseWarmupSet>[];
  reuseFinishDayScript?: string;
  reuseUpdateDayScript?: string;
}
const _VProgramExercise = v.object({
  exerciseType: VExerciseType,
  id: v.string(),
  name: v.string(),
  variations: v.array(VProgramExerciseVariation),
  state: VProgramState,
  variationExpr: v.string(),
  finishDayExpr: v.string(),
  descriptions: v.array(v.string()),
  tags: v.optional(v.array(v.number())),
  updateDayExpr: v.optional(v.string()),
  diffPaths: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
  descriptionExpr: v.optional(v.string()),
  quickAddSets: v.optional(v.boolean()),
  enableRepRanges: v.optional(v.boolean()),
  enableRpe: v.optional(v.boolean()),
  stateMetadata: v.optional(VProgramStateMetadata),
  timerExpr: v.optional(v.string()),
  reuseLogic: v.optional(VProgramExerciseReuseLogic),
  warmupSets: v.optional(v.array(VProgramExerciseWarmupSet)),
  reuseFinishDayScript: v.optional(v.string()),
  reuseUpdateDayScript: v.optional(v.string()),
});
const _VProgramExerciseMatches: IEquals<v.InferOutput<typeof _VProgramExercise>, IProgramExercise> = true;
void _VProgramExerciseMatches;
export const VProgramExercise: v.GenericSchema<IProgramExercise> = _VProgramExercise;

export interface IExercisePickerFilters {
  equipment?: IBuiltinEquipment[];
  type?: IExerciseKind[];
  muscles?: IMuscle[];
  isStarred?: boolean;
}
const _VExercisePickerFilters = v.object({
  equipment: v.optional(v.array(VBuiltinEquipment)),
  type: v.optional(v.array(VExerciseKind)),
  muscles: v.optional(v.array(VMuscle)),
  isStarred: v.optional(v.boolean()),
});
const _VExercisePickerFiltersMatches: IEquals<
  v.InferOutput<typeof _VExercisePickerFilters>,
  IExercisePickerFilters
> = true;
void _VExercisePickerFiltersMatches;
export const VExercisePickerFilters: v.GenericSchema<IExercisePickerFilters> = _VExercisePickerFilters;

export interface IExercisePickerProgramExercise {
  type: "program";
  exerciseType: IExerciseType;
  week: number;
  dayInWeek: number;
}
const _VExercisePickerProgramExercise = v.object({
  type: v.literal("program"),
  exerciseType: VExerciseType,
  week: v.number(),
  dayInWeek: v.number(),
});
const _VExercisePickerProgramExerciseMatches: IEquals<
  v.InferOutput<typeof _VExercisePickerProgramExercise>,
  IExercisePickerProgramExercise
> = true;
void _VExercisePickerProgramExerciseMatches;
export const VExercisePickerProgramExercise: v.GenericSchema<IExercisePickerProgramExercise> =
  _VExercisePickerProgramExercise;

export interface IExercisePickerAdhocExercise {
  type: "adhoc";
  exerciseType: IExerciseType;
  label?: string;
}
const _VExercisePickerAdhocExercise = v.object({
  type: v.literal("adhoc"),
  exerciseType: VExerciseType,
  label: v.optional(v.string()),
});
const _VExercisePickerAdhocExerciseMatches: IEquals<
  v.InferOutput<typeof _VExercisePickerAdhocExercise>,
  IExercisePickerAdhocExercise
> = true;
void _VExercisePickerAdhocExerciseMatches;
export const VExercisePickerAdhocExercise: v.GenericSchema<IExercisePickerAdhocExercise> =
  _VExercisePickerAdhocExercise;

export interface IExercisePickerTemplate {
  type: "template";
  name: string;
  label?: string;
}
const _VExercisePickerTemplate = v.object({
  type: v.literal("template"),
  name: v.string(),
  label: v.optional(v.string()),
});
const _VExercisePickerTemplateMatches: IEquals<
  v.InferOutput<typeof _VExercisePickerTemplate>,
  IExercisePickerTemplate
> = true;
void _VExercisePickerTemplateMatches;
export const VExercisePickerTemplate: v.GenericSchema<IExercisePickerTemplate> = _VExercisePickerTemplate;

export const VExercisePickerSelectedExercise = v.union([
  VExercisePickerProgramExercise,
  VExercisePickerAdhocExercise,
  VExercisePickerTemplate,
]);
export type IExercisePickerSelectedExercise = v.InferOutput<typeof VExercisePickerSelectedExercise>;

export interface IExercisePickerState {
  screenStack: IExercisePickerScreen[];
  sort: IExercisePickerSort;
  filters: IExercisePickerFilters;
  selectedExercises: IExercisePickerSelectedExercise[];
  mode: "workout" | "program";
  showMuscles?: boolean;
  customExerciseName?: string;
  label?: string;
  templateName?: string;
  selectedTab?: number;
  editCustomExercise?: ICustomExercise;
  search?: string;
  exerciseType?: IExerciseType;
  entryIndex?: number;
}
const _VExercisePickerState = v.object({
  screenStack: v.array(VExercisePickerScreen),
  sort: VExercisePickerSort,
  filters: VExercisePickerFilters,
  selectedExercises: v.array(VExercisePickerSelectedExercise),
  mode: v.union([v.literal("workout"), v.literal("program")]),
  showMuscles: v.optional(v.boolean()),
  customExerciseName: v.optional(v.string()),
  label: v.optional(v.string()),
  templateName: v.optional(v.string()),
  selectedTab: v.optional(v.number()),
  editCustomExercise: v.optional(VCustomExercise),
  search: v.optional(v.string()),
  exerciseType: v.optional(VExerciseType),
  entryIndex: v.optional(v.number()),
});
const _VExercisePickerStateMatches: IEquals<v.InferOutput<typeof _VExercisePickerState>, IExercisePickerState> = true;
void _VExercisePickerStateMatches;
export const VExercisePickerState: v.GenericSchema<IExercisePickerState> = _VExercisePickerState;

export interface IProgressUi {
  vtype?: "progress_ui";
  id?: string;
  amrapModal?: {
    entryIndex: number;
    setIndex: number;
    isAmrap?: boolean;
    logRpe?: boolean;
    askWeight?: boolean;
    userVars?: boolean;
    nonce?: number;
  };
  editModal?: {
    programExerciseId: string;
    entryIndex: number;
  };
  dateModal?: {
    date: string;
    time: number;
  };
  exercisePicker?: {
    state?: IExercisePickerState;
  };
  equipmentModal?: {
    exerciseType?: IExerciseType;
  };
  rm1Modal?: {
    exerciseType?: IExerciseType;
  };
  editSetModal?: {
    isWarmup: boolean;
    entryIndex: number;
    exerciseType?: IExerciseType;
    programExerciseId?: string;
    set: ISet;
    setIndex?: number;
  };
  exerciseBottomSheet?: {
    entryIndex: number;
  };
  entryIndexEditMode?: number;
  currentEntryIndex?: number;
  showSupersetPicker?: IHistoryEntry;
  forceUpdateEntryIndex?: boolean;
  isExternal?: boolean;
  nativeNotificationScheduled?: boolean;
}
const _VProgressUi = v.object({
  vtype: v.optional(v.literal("progress_ui")),
  id: v.optional(v.string()),
  amrapModal: v.optional(
    v.object({
      entryIndex: v.number(),
      setIndex: v.number(),
      isAmrap: v.optional(v.boolean()),
      logRpe: v.optional(v.boolean()),
      askWeight: v.optional(v.boolean()),
      userVars: v.optional(v.boolean()),
      nonce: v.optional(v.number()),
    })
  ),
  editModal: v.optional(
    v.object({
      programExerciseId: v.string(),
      entryIndex: v.number(),
    })
  ),
  dateModal: v.optional(
    v.object({
      date: v.string(),
      time: v.number(),
    })
  ),
  exercisePicker: v.optional(
    v.object({
      state: v.optional(VExercisePickerState),
    })
  ),
  equipmentModal: v.optional(
    v.object({
      exerciseType: v.optional(VExerciseType),
    })
  ),
  rm1Modal: v.optional(
    v.object({
      exerciseType: v.optional(VExerciseType),
    })
  ),
  editSetModal: v.optional(
    v.object({
      isWarmup: v.boolean(),
      entryIndex: v.number(),
      exerciseType: v.optional(VExerciseType),
      programExerciseId: v.optional(v.string()),
      set: VSet,
      setIndex: v.optional(v.number()),
    })
  ),
  exerciseBottomSheet: v.optional(
    v.object({
      entryIndex: v.number(),
    })
  ),
  entryIndexEditMode: v.optional(v.number()),
  currentEntryIndex: v.optional(v.number()),
  showSupersetPicker: v.optional(v.lazy(() => VHistoryEntry)),
  forceUpdateEntryIndex: v.optional(v.boolean()),
  isExternal: v.optional(v.boolean()),
  nativeNotificationScheduled: v.optional(v.boolean()),
});
const _VProgressUiMatches: IEquals<v.InferOutput<typeof _VProgressUi>, IProgressUi> = true;
void _VProgressUiMatches;
export const VProgressUi: v.GenericSchema<IProgressUi> = _VProgressUi;

export const VIntervals = v.array(v.tuple([v.number(), v.union([v.number(), v.undefined(), v.null()])]));
export type IIntervals = v.InferOutput<typeof VIntervals>;

export interface IHistoryRecord {
  vtype: "history_record" | "progress";
  date: string;
  programId: string;
  programName: string;
  day: number;
  dayName: string;
  entries: IHistoryEntry[];
  startTime: number;
  id: number;
  endTime?: number;
  week?: number;
  dayInWeek?: number;
  ui?: IProgressUi;
  intervals?: IIntervals;
  deletedProgramExercises?: Record<string, boolean | undefined>;
  userPromptedStateVars?: Record<string, IProgramState | undefined>;
  changes?: IHistoryRecordChange[];
  timerSince?: number;
  timerMode?: IProgressMode;
  timer?: number;
  timerEntryIndex?: number;
  timerSetIndex?: number;
  notes?: string;
  updatedAt?: number;
}
const _VHistoryRecord = v.object({
  vtype: v.union([v.literal("history_record"), v.literal("progress")]),
  date: v.string(),
  programId: v.string(),
  programName: v.string(),
  day: v.number(),
  dayName: v.string(),
  entries: v.array(VHistoryEntry),
  startTime: v.number(),
  id: v.number(),
  endTime: v.optional(v.number()),
  week: v.optional(v.number()),
  dayInWeek: v.optional(v.number()),
  ui: v.optional(VProgressUi),
  intervals: v.optional(VIntervals),
  deletedProgramExercises: v.optional(v.record(v.string(), v.optional(v.boolean()))),
  userPromptedStateVars: v.optional(v.record(v.string(), v.optional(VProgramState))),
  changes: v.optional(v.array(VHistoryRecordChange)),
  timerSince: v.optional(v.number()),
  timerMode: v.optional(VProgressMode),
  timer: v.optional(v.number()),
  timerEntryIndex: v.optional(v.number()),
  timerSetIndex: v.optional(v.number()),
  notes: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
});
const _VHistoryRecordMatches: IEquals<v.InferOutput<typeof _VHistoryRecord>, IHistoryRecord> = true;
void _VHistoryRecordMatches;
export const VHistoryRecord: v.GenericSchema<IHistoryRecord> = _VHistoryRecord;

export interface IProgramDayEntry {
  exercise: IExerciseType;
  sets: IProgramSet[];
}
const _VProgramDayEntry = v.object({
  exercise: VExerciseType,
  sets: v.array(VProgramSet),
});
const _VProgramDayEntryMatches: IEquals<v.InferOutput<typeof _VProgramDayEntry>, IProgramDayEntry> = true;
void _VProgramDayEntryMatches;
export const VProgramDayEntry: v.GenericSchema<IProgramDayEntry> = _VProgramDayEntry;

export interface IProgramWeek {
  id: string;
  name: string;
  days: { id: string }[];
  description?: string;
}
const _VProgramWeek = v.object({
  id: v.string(),
  name: v.string(),
  days: v.array(v.object({ id: v.string() })),
  description: v.optional(v.string()),
});
const _VProgramWeekMatches: IEquals<v.InferOutput<typeof _VProgramWeek>, IProgramWeek> = true;
void _VProgramWeekMatches;
export const VProgramWeek: v.GenericSchema<IProgramWeek> = _VProgramWeek;

export interface IProgramDay {
  id: string;
  name: string;
  exercises: { id: string }[];
  description?: string;
}
const _VProgramDay = v.object({
  id: v.string(),
  name: v.string(),
  exercises: v.array(v.object({ id: v.string() })),
  description: v.optional(v.string()),
});
const _VProgramDayMatches: IEquals<v.InferOutput<typeof _VProgramDay>, IProgramDay> = true;
void _VProgramDayMatches;
export const VProgramDay: v.GenericSchema<IProgramDay> = _VProgramDay;

export interface IPlannerProgramDay {
  name: string;
  exerciseText: string;
  id?: string;
  description?: string;
}
const _VPlannerProgramDay = v.object({
  name: v.string(),
  exerciseText: v.string(),
  id: v.optional(v.string()),
  description: v.optional(v.string()),
});
const _VPlannerProgramDayMatches: IEquals<v.InferOutput<typeof _VPlannerProgramDay>, IPlannerProgramDay> = true;
void _VPlannerProgramDayMatches;
export const VPlannerProgramDay: v.GenericSchema<IPlannerProgramDay> = _VPlannerProgramDay;

export interface IPlannerProgramWeek {
  name: string;
  days: IPlannerProgramDay[];
  id?: string;
  description?: string;
}
const _VPlannerProgramWeek = v.object({
  name: v.string(),
  days: v.array(VPlannerProgramDay),
  id: v.optional(v.string()),
  description: v.optional(v.string()),
});
const _VPlannerProgramWeekMatches: IEquals<v.InferOutput<typeof _VPlannerProgramWeek>, IPlannerProgramWeek> = true;
void _VPlannerProgramWeekMatches;
export const VPlannerProgramWeek: v.GenericSchema<IPlannerProgramWeek> = _VPlannerProgramWeek;

export interface IPlannerProgram {
  vtype: "planner";
  name: string;
  weeks: IPlannerProgramWeek[];
}
const _VPlannerProgram = v.object({
  vtype: v.literal("planner"),
  name: v.string(),
  weeks: v.array(VPlannerProgramWeek),
});
const _VPlannerProgramMatches: IEquals<v.InferOutput<typeof _VPlannerProgram>, IPlannerProgram> = true;
void _VPlannerProgramMatches;
export const VPlannerProgram: v.GenericSchema<IPlannerProgram> = _VPlannerProgram;

export interface IProgram {
  vtype: "program";
  exercises: IProgramExercise[];
  id: string;
  name: string;
  description: string;
  url: string;
  author: string;
  nextDay: number;
  days: IProgramDay[];
  weeks: IProgramWeek[];
  isMultiweek: boolean;
  tags: IProgramTag[];
  deletedDays?: string[];
  deletedWeeks?: string[];
  deletedExercises?: string[];
  clonedAt?: number;
  shortDescription?: string;
  planner?: IPlannerProgram;
  updatedAt?: number;
  authorid?: string | null;
  source?: string | null;
}
const _VProgram = v.object({
  vtype: v.literal("program"),
  exercises: v.array(VProgramExercise),
  id: v.string(),
  name: v.string(),
  description: v.string(),
  url: v.string(),
  author: v.string(),
  nextDay: v.number(),
  days: v.array(VProgramDay),
  weeks: v.array(VProgramWeek),
  isMultiweek: v.boolean(),
  tags: v.array(VProgramTag),
  deletedDays: v.optional(v.array(v.string())),
  deletedWeeks: v.optional(v.array(v.string())),
  deletedExercises: v.optional(v.array(v.string())),
  clonedAt: v.optional(v.number()),
  shortDescription: v.optional(v.string()),
  planner: v.optional(VPlannerProgram),
  updatedAt: v.optional(v.number()),
  authorid: v.optional(v.union([v.string(), v.null()])),
  source: v.optional(v.union([v.string(), v.null()])),
});
const _VProgramMatches: IEquals<v.InferOutput<typeof _VProgram>, IProgram> = true;
void _VProgramMatches;
export const VProgram: v.GenericSchema<IProgram> = _VProgram;

export interface IStatsWeightValue {
  vtype: "stat";
  value: IWeight;
  timestamp: number;
  updatedAt?: number;
  appleUuid?: string;
}
const _VStatsWeightValue = v.object({
  vtype: v.literal("stat"),
  value: VWeight,
  timestamp: v.number(),
  updatedAt: v.optional(v.number()),
  appleUuid: v.optional(v.string()),
});
const _VStatsWeightValueMatches: IEquals<v.InferOutput<typeof _VStatsWeightValue>, IStatsWeightValue> = true;
void _VStatsWeightValueMatches;
export const VStatsWeightValue: v.GenericSchema<IStatsWeightValue> = _VStatsWeightValue;

export const VStatsWeight = v.object({
  weight: v.optional(v.array(VStatsWeightValue)),
});
export type IStatsWeight = v.InferOutput<typeof VStatsWeight>;

export interface IStatsLengthValue {
  vtype: "stat";
  value: ILength;
  timestamp: number;
  updatedAt?: number;
  appleUuid?: string;
}
const _VStatsLengthValue = v.object({
  vtype: v.literal("stat"),
  value: VLength,
  timestamp: v.number(),
  updatedAt: v.optional(v.number()),
  appleUuid: v.optional(v.string()),
});
const _VStatsLengthValueMatches: IEquals<v.InferOutput<typeof _VStatsLengthValue>, IStatsLengthValue> = true;
void _VStatsLengthValueMatches;
export const VStatsLengthValue: v.GenericSchema<IStatsLengthValue> = _VStatsLengthValue;

export type IStatsLength = Partial<Record<(typeof statsLengthDef)[number], IStatsLengthValue[]>>;
export const VStatsLength: v.GenericSchema<IStatsLength> = v.object(
  statsLengthDef.reduce<Record<string, v.GenericSchema<IStatsLengthValue[] | undefined>>>((memo, key) => {
    memo[key] = v.optional(v.array(VStatsLengthValue));
    return memo;
  }, {})
);

export interface IStatsPercentageValue {
  vtype: "stat";
  value: IPercentage;
  timestamp: number;
  updatedAt?: number;
  appleUuid?: string;
}
const _VStatsPercentageValue = v.object({
  vtype: v.literal("stat"),
  value: VPercentage,
  timestamp: v.number(),
  updatedAt: v.optional(v.number()),
  appleUuid: v.optional(v.string()),
});
const _VStatsPercentageValueMatches: IEquals<
  v.InferOutput<typeof _VStatsPercentageValue>,
  IStatsPercentageValue
> = true;
void _VStatsPercentageValueMatches;
export const VStatsPercentageValue: v.GenericSchema<IStatsPercentageValue> = _VStatsPercentageValue;

export const VStatsPercentage = v.object({
  bodyfat: v.optional(v.array(VStatsPercentageValue)),
});
export type IStatsPercentage = v.InferOutput<typeof VStatsPercentage>;

export type IStatsKey = keyof IStatsLength | keyof IStatsWeight | keyof IStatsPercentage;

export type IExerciseSelectedType = "weight" | "volume";
export type IVolumeSelectedType = "sets" | "volume";

function buildBoolPartial<K extends string>(
  keys: readonly K[]
): v.ObjectSchema<Record<K, v.OptionalSchema<v.BooleanSchema<undefined>, undefined>>, undefined> {
  const entries = keys.reduce<Record<string, v.OptionalSchema<v.BooleanSchema<undefined>, undefined>>>((memo, key) => {
    memo[key] = v.optional(v.boolean());
    return memo;
  }, {});
  return v.object(entries) as v.ObjectSchema<
    Record<K, v.OptionalSchema<v.BooleanSchema<undefined>, undefined>>,
    undefined
  >;
}

export const VStatsWeightEnabled = buildBoolPartial(statsWeightDef);
export type IStatsWeightEnabled = v.InferOutput<typeof VStatsWeightEnabled>;

export const VStatsLengthEnabled = buildBoolPartial(statsLengthDef);
export type IStatsLengthEnabled = v.InferOutput<typeof VStatsLengthEnabled>;

export const VStatsPercentageEnabled = buildBoolPartial(statsPercentageDef);
export type IStatsPercentageEnabled = v.InferOutput<typeof VStatsPercentageEnabled>;

export interface IStatsEnabled {
  weight: IStatsWeightEnabled;
  length: IStatsLengthEnabled;
  percentage: IStatsPercentageEnabled;
}
const _VStatsEnabled = v.object({
  weight: VStatsWeightEnabled,
  length: VStatsLengthEnabled,
  percentage: VStatsPercentageEnabled,
});
const _VStatsEnabledMatches: IEquals<v.InferOutput<typeof _VStatsEnabled>, IStatsEnabled> = true;
void _VStatsEnabledMatches;
export const VStatsEnabled: v.GenericSchema<IStatsEnabled> = _VStatsEnabled;

export interface ISettingsTimers {
  warmup?: number | null;
  workout?: number | null;
  reminder?: number;
  superset?: number;
}
const _VSettingsTimers = v.object({
  warmup: v.optional(v.union([v.number(), v.null()])),
  workout: v.optional(v.union([v.number(), v.null()])),
  reminder: v.optional(v.number()),
  superset: v.optional(v.number()),
});
const _VSettingsTimersMatches: IEquals<v.InferOutput<typeof _VSettingsTimers>, ISettingsTimers> = true;
void _VSettingsTimersMatches;
export const VSettingsTimers: v.GenericSchema<ISettingsTimers> = _VSettingsTimers;

export const VGraph = v.union([
  v.object({ vtype: v.literal("graph"), type: v.literal("exercise"), id: VExerciseId }),
  v.object({
    vtype: v.literal("graph"),
    type: v.literal("statsWeight"),
    id: v.picklist(statsWeightDef),
  }),
  v.object({
    vtype: v.literal("graph"),
    type: v.literal("statsLength"),
    id: v.picklist(statsLengthDef),
  }),
  v.object({
    vtype: v.literal("graph"),
    type: v.literal("statsPercentage"),
    id: v.picklist(statsPercentageDef),
  }),
  v.object({ vtype: v.literal("graph"), type: v.literal("muscleGroup"), id: v.string() }),
]);
export type IGraph = v.InferOutput<typeof VGraph>;

export interface IEquipmentData {
  vtype: "equipment_data";
  bar: { lb: IWeight; kg: IWeight };
  multiplier: number;
  plates: { weight: IWeight; num: number }[];
  fixed: IWeight[];
  isFixed: boolean;
  unit?: IUnit;
  name?: string;
  similarTo?: string;
  isDeleted?: boolean;
  useBodyweightForBar?: boolean;
  isAssisting?: boolean;
  notes?: string;
}
const _VEquipmentData = v.object({
  vtype: v.literal("equipment_data"),
  bar: v.object({ lb: VWeight, kg: VWeight }),
  multiplier: v.number(),
  plates: v.array(v.object({ weight: VWeight, num: v.number() })),
  fixed: v.array(VWeight),
  isFixed: v.boolean(),
  unit: v.optional(VUnit),
  name: v.optional(v.string()),
  similarTo: v.optional(v.string()),
  isDeleted: v.optional(v.boolean()),
  useBodyweightForBar: v.optional(v.boolean()),
  isAssisting: v.optional(v.boolean()),
  notes: v.optional(v.string()),
});
const _VEquipmentDataMatches: IEquals<v.InferOutput<typeof _VEquipmentData>, IEquipmentData> = true;
void _VEquipmentDataMatches;
export const VEquipmentData: v.GenericSchema<IEquipmentData> = _VEquipmentData;
export type IAllEquipment = Partial<Record<string, IEquipmentData>>;

export interface IGraphOptions {
  movingAverageWindowSize?: number;
}
const _VGraphOptions = v.object({
  movingAverageWindowSize: v.optional(v.number()),
});
const _VGraphOptionsMatches: IEquals<v.InferOutput<typeof _VGraphOptions>, IGraphOptions> = true;
void _VGraphOptionsMatches;
export const VGraphOptions: v.GenericSchema<IGraphOptions> = _VGraphOptions;

export interface IMuscleMultiplier {
  muscle: IMuscle;
  multiplier: number;
}
const _VMuscleMultiplier = v.object({
  muscle: VMuscle,
  multiplier: v.number(),
});
const _VMuscleMultiplierMatches: IEquals<v.InferOutput<typeof _VMuscleMultiplier>, IMuscleMultiplier> = true;
void _VMuscleMultiplierMatches;
export const VMuscleMultiplier: v.GenericSchema<IMuscleMultiplier> = _VMuscleMultiplier;

// The schema accepts any string key for muscleMultipliers so stale or future muscle
// keys do not invalidate storage. Consumers that need IMuscle keys narrow at the call site
// with `as IMuscle[]` after ObjectUtils_keys / Object.keys. (A union override here would
// create real structural divergence between IExerciseDataValue and the schema's inferred
// output, which would propagate through ISettings and break the IEquals check.)
export interface IExerciseDataValue {
  rm1?: IWeight;
  rounding?: number;
  equipment?: Record<string, string | undefined>;
  notes?: string;
  muscleMultipliers?: Record<string, number | undefined>;
  isUnilateral?: boolean;
}
const _VExerciseDataValue = v.object({
  rm1: v.optional(VWeight),
  rounding: v.optional(v.number()),
  equipment: v.optional(v.record(v.string(), v.optional(v.string()))),
  notes: v.optional(v.string()),
  muscleMultipliers: v.optional(v.record(v.string(), v.optional(v.number()))),
  isUnilateral: v.optional(v.boolean()),
});
const _VExerciseDataValueMatches: IEquals<v.InferOutput<typeof _VExerciseDataValue>, IExerciseDataValue> = true;
void _VExerciseDataValueMatches;
export const VExerciseDataValue: v.GenericSchema<IExerciseDataValue> = _VExerciseDataValue;
export type IExerciseData = Partial<Record<string, IExerciseDataValue>>;

export interface IPlannerSettings {
  synergistMultiplier: number;
  strengthSetsPct: number;
  hypertrophySetsPct: number;
  weeklyRangeSets: Record<IScreenMuscle, [number, number] | undefined>;
  weeklyFrequency: Record<IScreenMuscle, number | undefined>;
}
const _VPlannerSettings = v.object({
  synergistMultiplier: v.number(),
  strengthSetsPct: v.number(),
  hypertrophySetsPct: v.number(),
  weeklyRangeSets: v.record(VScreenMuscle, v.optional(v.tuple([v.number(), v.number()]))),
  weeklyFrequency: v.record(VScreenMuscle, v.optional(v.number())),
});
const _VPlannerSettingsMatches: IEquals<v.InferOutput<typeof _VPlannerSettings>, IPlannerSettings> = true;
void _VPlannerSettingsMatches;
export const VPlannerSettings: v.GenericSchema<IPlannerSettings> = _VPlannerSettings;

export interface IGym {
  vtype: "gym";
  id: string;
  name: string;
  equipment: Record<IEquipment, IEquipmentData | undefined>;
}
const _VGym = v.object({
  vtype: v.literal("gym"),
  id: v.string(),
  name: v.string(),
  equipment: v.record(VEquipment, v.optional(VEquipmentData)),
});
const _VGymMatches: IEquals<v.InferOutput<typeof _VGym>, IGym> = true;
void _VGymMatches;
export const VGym: v.GenericSchema<IGym> = _VGym;

export interface IWorkoutSettings {
  targetType: ITargetType;
  shouldHideGraphs?: boolean;
  shouldKeepProgramExerciseId?: boolean;
  shouldShowInvisibleEquipment?: boolean;
  pickerSort?: IExercisePickerSort;
}
const _VWorkoutSettings = v.object({
  targetType: VTargetType,
  shouldHideGraphs: v.optional(v.boolean()),
  shouldKeepProgramExerciseId: v.optional(v.boolean()),
  shouldShowInvisibleEquipment: v.optional(v.boolean()),
  pickerSort: v.optional(VExercisePickerSort),
});
const _VWorkoutSettingsMatches: IEquals<v.InferOutput<typeof _VWorkoutSettings>, IWorkoutSettings> = true;
void _VWorkoutSettingsMatches;
export const VWorkoutSettings: v.GenericSchema<IWorkoutSettings> = _VWorkoutSettings;

export interface IGraphs {
  vtype: "graphs";
  graphs: IGraph[];
}
const _VGraphs = v.object({
  vtype: v.literal("graphs"),
  graphs: v.array(VGraph),
});
const _VGraphsMatches: IEquals<v.InferOutput<typeof _VGraphs>, IGraphs> = true;
void _VGraphsMatches;
export const VGraphs: v.GenericSchema<IGraphs> = _VGraphs;

export interface IMuscleGroupsSettings {
  vtype: "muscle_groups_settings";
  data: Record<string, { name?: string; isHidden?: boolean; muscles?: IMuscle[] } | undefined>;
}
const _VMuscleGroupsSettings = v.object({
  vtype: v.literal("muscle_groups_settings"),
  data: v.record(
    v.string(),
    v.optional(
      v.object({
        name: v.optional(v.string()),
        isHidden: v.optional(v.boolean()),
        muscles: v.optional(v.array(VMuscle)),
      })
    )
  ),
});
const _VMuscleGroupsSettingsMatches: IEquals<
  v.InferOutput<typeof _VMuscleGroupsSettings>,
  IMuscleGroupsSettings
> = true;
void _VMuscleGroupsSettingsMatches;
export const VMuscleGroupsSettings: v.GenericSchema<IMuscleGroupsSettings> = _VMuscleGroupsSettings;

export interface ISettings {
  timers: ISettingsTimers;
  gyms: IGym[];
  deletedGyms: string[];
  graphs: IGraphs;
  graphOptions: Record<string, IGraphOptions | undefined>;
  graphsSettings: {
    isSameXAxis?: boolean;
    isWithBodyweight?: boolean;
    isWithOneRm?: boolean;
    isWithProgramLines?: boolean;
    defaultType?: IGraphExerciseSelectedType;
    defaultMuscleGroupType?: IGraphMuscleGroupSelectedType;
  };
  exerciseStatsSettings: {
    ascendingSort?: boolean;
    hideWithoutWorkoutNotes?: boolean;
    hideWithoutExerciseNotes?: boolean;
  };
  exercises: Record<string, ICustomExercise | undefined>;
  statsEnabled: IStatsEnabled;
  units: IUnit;
  lengthUnits: ILengthUnit;
  volume: number;
  exerciseData: Record<string, IExerciseDataValue | undefined>;
  planner: IPlannerSettings;
  workoutSettings: IWorkoutSettings;
  muscleGroups: IMuscleGroupsSettings;
  appleHealthSyncWorkout?: boolean;
  appleHealthSyncMeasurements?: boolean;
  appleHealthAnchor?: string;
  googleHealthSyncWorkout?: boolean;
  googleHealthSyncMeasurements?: boolean;
  googleHealthAnchor?: string;
  healthConfirmation?: boolean;
  ignoreDoNotDisturb?: boolean;
  currentGymId?: string;
  isPublicProfile?: boolean;
  nickname?: string;
  alwaysOnDisplay?: boolean;
  vibration?: boolean;
  startWeekFromMonday?: boolean;
  textSize?: number;
  starredExercises?: Record<string, boolean | undefined>;
  theme?: "dark" | "light";
  currentBodyweight?: IWeight;
  affiliateEnabled?: boolean;
}
const _VSettings = v.object({
  timers: VSettingsTimers,
  gyms: v.array(VGym),
  deletedGyms: v.array(v.string()),
  graphs: VGraphs,
  graphOptions: v.record(v.string(), v.optional(VGraphOptions)),
  graphsSettings: v.object({
    isSameXAxis: v.optional(v.boolean()),
    isWithBodyweight: v.optional(v.boolean()),
    isWithOneRm: v.optional(v.boolean()),
    isWithProgramLines: v.optional(v.boolean()),
    defaultType: v.optional(VGraphExerciseSelectedType),
    defaultMuscleGroupType: v.optional(VGraphMuscleGroupSelectedType),
  }),
  exerciseStatsSettings: v.object({
    ascendingSort: v.optional(v.boolean()),
    hideWithoutWorkoutNotes: v.optional(v.boolean()),
    hideWithoutExerciseNotes: v.optional(v.boolean()),
  }),
  exercises: v.record(v.string(), v.optional(VCustomExercise)),
  statsEnabled: VStatsEnabled,
  units: VUnit,
  lengthUnits: VLengthUnit,
  volume: v.number(),
  exerciseData: v.record(v.string(), v.optional(VExerciseDataValue)),
  planner: VPlannerSettings,
  workoutSettings: VWorkoutSettings,
  muscleGroups: VMuscleGroupsSettings,
  appleHealthSyncWorkout: v.optional(v.boolean()),
  appleHealthSyncMeasurements: v.optional(v.boolean()),
  appleHealthAnchor: v.optional(v.string()),
  googleHealthSyncWorkout: v.optional(v.boolean()),
  googleHealthSyncMeasurements: v.optional(v.boolean()),
  googleHealthAnchor: v.optional(v.string()),
  healthConfirmation: v.optional(v.boolean()),
  ignoreDoNotDisturb: v.optional(v.boolean()),
  currentGymId: v.optional(v.string()),
  isPublicProfile: v.optional(v.boolean()),
  nickname: v.optional(v.string()),
  alwaysOnDisplay: v.optional(v.boolean()),
  vibration: v.optional(v.boolean()),
  startWeekFromMonday: v.optional(v.boolean()),
  textSize: v.optional(v.number()),
  starredExercises: v.optional(v.record(VExerciseId, v.optional(v.boolean()))),
  theme: v.optional(v.union([v.literal("dark"), v.literal("light")])),
  currentBodyweight: v.optional(VWeight),
  affiliateEnabled: v.optional(v.boolean()),
});
const _VSettingsMatches: IEquals<v.InferOutput<typeof _VSettings>, ISettings> = true;
void _VSettingsMatches;
export const VSettings: v.GenericSchema<ISettings> = _VSettings;

export interface IStats {
  weight: IStatsWeight;
  length: IStatsLength;
  percentage: IStatsPercentage;
}
const _VStats = v.object({
  weight: VStatsWeight,
  length: VStatsLength,
  percentage: VStatsPercentage,
});
const _VStatsMatches: IEquals<v.InferOutput<typeof _VStats>, IStats> = true;
void _VStatsMatches;
export const VStats: v.GenericSchema<IStats> = _VStats;

export interface ISubscriptionReceipt {
  vtype: "subscription_receipt";
  id: string;
  value: string;
  createdAt: number;
}
const _VSubscriptionReceipt = v.object({
  vtype: v.literal("subscription_receipt"),
  id: v.string(),
  value: v.string(),
  createdAt: v.number(),
});
const _VSubscriptionReceiptMatches: IEquals<v.InferOutput<typeof _VSubscriptionReceipt>, ISubscriptionReceipt> = true;
void _VSubscriptionReceiptMatches;
export const VSubscriptionReceipt: v.GenericSchema<ISubscriptionReceipt> = _VSubscriptionReceipt;

export interface ISubscription {
  apple: ISubscriptionReceipt[];
  google: ISubscriptionReceipt[];
  key?: string;
}
const _VSubscription = v.object({
  apple: v.array(VSubscriptionReceipt),
  google: v.array(VSubscriptionReceipt),
  key: v.optional(v.string()),
});
const _VSubscriptionMatches: IEquals<v.InferOutput<typeof _VSubscription>, ISubscription> = true;
void _VSubscriptionMatches;
export const VSubscription: v.GenericSchema<ISubscription> = _VSubscription;

export interface IAffiliateData {
  id: string;
  timestamp: number;
  type: "coupon" | "program";
  vtype: "affiliate";
}
const _VAffiliateData = v.object({
  id: v.string(),
  timestamp: v.number(),
  type: v.union([v.literal("coupon"), v.literal("program")]),
  vtype: v.literal("affiliate"),
});
const _VAffiliateDataMatches: IEquals<v.InferOutput<typeof _VAffiliateData>, IAffiliateData> = true;
void _VAffiliateDataMatches;
export const VAffiliateData: v.GenericSchema<IAffiliateData> = _VAffiliateData;

export interface IImportSession {
  vtype: "import_session";
  id: string;
  timestamp: number;
  source: "hevy" | "liftosaurCsv";
  historyRecordIds: number[];
  customExerciseIds: string[];
  workoutCount: number;
}
const _VImportSession = v.object({
  vtype: v.literal("import_session"),
  id: v.string(),
  timestamp: v.number(),
  source: v.union([v.literal("hevy"), v.literal("liftosaurCsv")]),
  historyRecordIds: v.array(v.number()),
  customExerciseIds: v.array(v.string()),
  workoutCount: v.number(),
});
const _VImportSessionMatches: IEquals<v.InferOutput<typeof _VImportSession>, IImportSession> = true;
void _VImportSessionMatches;
export const VImportSession: v.GenericSchema<IImportSession> = _VImportSession;

interface IStorageRaw {
  history: IHistoryRecord[];
  deletedHistory: number[];
  stats: IStats;
  deletedStats: number[];
  settings: ISettings;
  currentProgramId?: string;
  version: string;
  programs: IProgram[];
  deletedPrograms: number[];
  reviewRequests: number[];
  signupRequests: number[];
  helps: string[];
  tempUserId: string;
  email?: string;
  affiliates: Record<string, IAffiliateData | undefined>;
  subscription: ISubscription;
  whatsNew?: string;
  progress: IHistoryRecord[];
  originalId?: number;
  id?: number;
  referrer?: string;
  landingPage?: string;
  attribution?: string;
  importSessions?: IImportSession[];
  // Localized store prices (displayPrice strings keyed by product id) captured on a native device,
  // synced so the web paywall can show the user's real prices instead of hardcoded US defaults.
  subscriptionPrices?: Partial<Record<string, string>>;
  _versions?: unknown;
}
const _VStorage = v.object({
  history: v.array(VHistoryRecord),
  deletedHistory: v.array(v.number()),
  stats: VStats,
  deletedStats: v.array(v.number()),
  settings: VSettings,
  currentProgramId: v.optional(v.string()),
  version: v.string(),
  programs: v.array(VProgram),
  deletedPrograms: v.array(v.number()),
  reviewRequests: v.array(v.number()),
  signupRequests: v.array(v.number()),
  helps: v.array(v.string()),
  tempUserId: v.string(),
  email: v.optional(v.string()),
  affiliates: v.record(v.string(), v.optional(VAffiliateData)),
  subscription: VSubscription,
  whatsNew: v.optional(v.string()),
  progress: v.array(VHistoryRecord),
  originalId: v.optional(v.number()),
  id: v.optional(v.number()),
  referrer: v.optional(v.string()),
  landingPage: v.optional(v.string()),
  attribution: v.optional(v.string()),
  importSessions: v.optional(v.array(VImportSession)),
  subscriptionPrices: v.optional(v.record(v.string(), v.optional(v.string()))),
  _versions: v.optional(v.unknown()),
});
const _VStorageMatches: IEquals<v.InferOutput<typeof _VStorage>, IStorageRaw> = true;
void _VStorageMatches;
export const VStorage: v.GenericSchema<IStorageRaw> = _VStorage;

export interface IMuscleGeneratorResponse {
  targetMuscles: IMuscle[];
  synergistMuscles: IMuscle[];
  types: IExerciseKind[];
}
const _VMuscleGeneratorResponse = v.object({
  targetMuscles: v.array(VMuscle),
  synergistMuscles: v.array(VMuscle),
  types: v.array(VExerciseKind),
});
const _VMuscleGeneratorResponseMatches: IEquals<
  v.InferOutput<typeof _VMuscleGeneratorResponse>,
  IMuscleGeneratorResponse
> = true;
void _VMuscleGeneratorResponseMatches;
export const VMuscleGeneratorResponse: v.GenericSchema<IMuscleGeneratorResponse> = _VMuscleGeneratorResponse;

export function vIs<T>(schema: v.GenericSchema<T>): { is: (u: unknown) => boolean } {
  return { is: (u: unknown): boolean => v.safeParse(schema, u).success };
}

export type IStorage = Omit<IStorageRaw, "_versions"> & {
  _versions?: IVersions<Omit<IStorageRaw, "_versions">>;
};

export type IPartialStorage = Omit<IStorage, "history" | "stats" | "programs"> &
  Partial<Pick<IStorage, "history" | "stats" | "programs">>;

export type IProgramContentSettings = Partial<
  Pick<ISettings, "units" | "planner" | "muscleGroups" | "exerciseData" | "workoutSettings"> & {
    timers: Partial<ISettings["timers"]>;
  }
>;

export type IDayData = {
  week?: number;
  day: number;
  dayInWeek?: number;
};

export type IShortDayData = {
  week: number;
  dayInWeek: number;
};

export type IDaySetData = {
  week: number;
  dayInWeek: number;
  setVariation: number;
  set: number;
};

export const ATOMIC_TYPES = [
  "history_record",
  "progress_ui",
  "set",
  "equipment_data",
  "custom_exercise",
  "planner",
  "stat",
  "graph",
  "graphs",
  "subscription_receipt",
  "affiliate",
  "muscle_groups_settings",
  "import_session",
] as const;

export type IAtomicType = (typeof ATOMIC_TYPES)[number];

export const CONTROLLED_TYPES = ["program", "gym", "progress", "history_entry"] as const;

export type IControlledType = (typeof CONTROLLED_TYPES)[number];

export const CONTROLLED_FIELDS: Record<IControlledType, readonly string[]> = {
  program: ["name", "nextDay", "planner"] as const,
  gym: ["name", "equipment"] as const,
  progress: [
    "entries",
    "endTime",
    "intervals",
    "notes",
    "deletedProgramExercises",
    "userPromptedStateVars",
    "updatedAt",
    "changes",
    "timerSince",
    "timerMode",
    "timer",
    "timerEntryIndex",
    "timerSetIndex",
  ] as const,
  history_entry: [
    "exercise",
    "sets",
    "warmupSets",
    "index",
    "isSuppressed",
    "programExerciseId",
    "state",
    "vars",
    "notes",
    "changed",
    "superset",
    "updatePrints",
  ] as const,
};

export const TYPE_ID_MAPPING: Record<IAtomicType | IControlledType, string> = {
  affiliate: "id",
  program: "clonedAt",
  history_record: "id",
  set: "id",
  progress_ui: "id",
  history_entry: "id",
  progress: "startTime",
  gym: "id",
  custom_exercise: "id",
  stat: "timestamp",
  equipment_data: "id",
  planner: "name",
  subscription_receipt: "id",
  graph: "id",
  graphs: "id",
  muscle_groups_settings: "vtype",
  import_session: "id",
};

export const DICTIONARY_FIELDS = [
  "settings.exercises",
  "settings.exerciseData",
  "settings.gyms.equipment",
  "affiliates",
] as const;

export type IDictionaryFieldPath = (typeof DICTIONARY_FIELDS)[number];

export const EXCLUDED_FIELDS: Partial<Record<IControlledType, readonly string[]>> = {
  progress: ["ui"] as const,
};

export const STORAGE_VERSION_TYPES: IVersionTypes<IAtomicType, IControlledType> = {
  atomicTypes: ATOMIC_TYPES,
  controlledTypes: CONTROLLED_TYPES,
  typeIdMapping: TYPE_ID_MAPPING,
  controlledFields: CONTROLLED_FIELDS,
  excludedFields: EXCLUDED_FIELDS,
  dictionaryFields: DICTIONARY_FIELDS,
  compactionThresholds: {
    "subscription.apple": 14 * 24 * 60 * 60 * 1000,
    "subscription.google": 14 * 24 * 60 * 60 * 1000,
  },
  typeValidators: {
    progress: vIs(VHistoryRecord),
  },
} as const;
