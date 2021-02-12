import * as t from "io-ts";
import { IArrayElement } from "./utils/types";

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
  "reverseHyperextension",
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

export const TEquipment = t.keyof(
  equipments.reduce<Record<IArrayElement<typeof equipments>, null>>((memo, barKey) => {
    memo[barKey] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof equipments>, null>),
  "TEquipment"
);
export type IEquipment = t.TypeOf<typeof TEquipment>;

export const TExerciseId = t.keyof(
  exerciseTypes.reduce<Record<IArrayElement<typeof exerciseTypes>, null>>((memo, exerciseType) => {
    memo[exerciseType] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof exerciseTypes>, null>),
  "TExerciseId"
);
export type IExerciseId = t.TypeOf<typeof TExerciseId>;

export const TExerciseType = t.intersection(
  [
    t.interface({
      id: TExerciseId,
    }),
    t.partial({
      equipment: TEquipment,
    }),
  ],
  "TExerciseType"
);
export type IExerciseType = t.TypeOf<typeof TExerciseType>;

export const units = ["kg", "lb"] as const;

export const TUnit = t.keyof(
  units.reduce<Record<IArrayElement<typeof units>, null>>((memo, exerciseType) => {
    memo[exerciseType] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof units>, null>),
  "TUnit"
);

export type IUnit = t.TypeOf<typeof TUnit>;

export const TWeight = t.type(
  {
    value: t.number,
    unit: TUnit,
  },
  "TWeight"
);
export type IWeight = t.TypeOf<typeof TWeight>;

export const TPlate = t.type(
  {
    weight: TWeight,
    num: t.number,
  },
  "TPlate"
);
export type IPlate = t.TypeOf<typeof TPlate>;

const barKeys = ["barbell", "ezbar", "dumbbell"] as const;

export const TBarKey = t.keyof(
  barKeys.reduce<Record<IArrayElement<typeof barKeys>, null>>((memo, barKey) => {
    memo[barKey] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof barKeys>, null>),
  "TBarKey"
);
export type IBarKey = t.TypeOf<typeof TBarKey>;

export const TBars = t.record(TBarKey, TWeight, "TBars");
export type IBars = t.TypeOf<typeof TBars>;

export const TSet = t.intersection(
  [
    t.interface({
      reps: t.number,
      weight: TWeight,
    }),
    t.partial({
      completedReps: t.number,
      timestamp: t.number,
      isAmrap: t.boolean,
    }),
  ],
  "TSet"
);
export type ISet = t.TypeOf<typeof TSet>;

export const THistoryEntry = t.type(
  {
    exercise: TExerciseType,
    sets: t.array(TSet),
    warmupSets: t.array(TSet),
  },
  "THistoryEntry"
);
export type IHistoryEntry = t.TypeOf<typeof THistoryEntry>;

export const TProgressUi = t.partial(
  {
    amrapModal: t.type({
      exercise: TExerciseType,
      setIndex: t.number,
      weight: TWeight,
    }),
    weightModal: t.type({
      exercise: TExerciseType,
      weight: TWeight,
    }),
    dateModal: t.type({
      date: t.string,
    }),
    editSetModal: t.type({
      isWarmup: t.boolean,
      entryIndex: t.number,
      setIndex: t.union([t.number, t.undefined]),
    }),
  },
  "TProgressUi"
);

export type IProgressUi = t.TypeOf<typeof TProgressUi>;

export const TProgressMode = t.keyof(
  {
    warmup: null,
    workout: null,
  },
  "TProgressMode"
);

export type IProgressMode = t.TypeOf<typeof TProgressMode>;

export const THistoryRecord = t.intersection(
  [
    t.interface({
      // ISO8601, like 2020-02-29T18:02:05+00:00
      date: t.string,
      programId: t.string,
      programName: t.string,
      day: t.number,
      dayName: t.string,
      entries: t.array(THistoryEntry),
      startTime: t.number,
      id: t.number,
    }),
    t.partial({
      endTime: t.number,
      ui: TProgressUi,
      timerSince: t.number,
      timerMode: TProgressMode,
    }),
  ],
  "THistoryRecord"
);
export type IHistoryRecord = t.TypeOf<typeof THistoryRecord>;

export const TProgramSet = t.intersection(
  [
    t.interface({
      repsExpr: t.string,
      weightExpr: t.string,
    }),
    t.partial({
      isAmrap: t.boolean,
    }),
  ],
  "TProgramSet"
);
export type IProgramSet = t.TypeOf<typeof TProgramSet>;

export const TProgramDayEntry = t.type(
  {
    exercise: TExerciseType,
    sets: t.array(TProgramSet),
  },
  "TProgramDayEntry"
);
export type IProgramDayEntry = Readonly<t.TypeOf<typeof TProgramDayEntry>>;

export const TProgramDay = t.type(
  {
    name: t.string,
    exercises: t.array(
      t.type({
        id: t.string,
      })
    ),
  },
  "TProgramDay"
);
export type IProgramDay = Readonly<t.TypeOf<typeof TProgramDay>>;

export const TProgramState = t.dictionary(t.string, t.union([t.number, TWeight]), "TProgramState");
export type IProgramState = t.TypeOf<typeof TProgramState>;

const tags = ["first-starter", "beginner", "barbell", "dumbbell", "intermediate", "woman"] as const;

export const TProgramTag = t.keyof(
  tags.reduce<Record<IArrayElement<typeof tags>, null>>((memo, barKey) => {
    memo[barKey] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof tags>, null>),
  "TProgramTag"
);
export type IProgramTag = Readonly<t.TypeOf<typeof TProgramTag>>;

export const TProgramExerciseVariation = t.type(
  {
    sets: t.array(TProgramSet),
  },
  "TProgramExerciseVariation"
);
export type IProgramExerciseVariation = Readonly<t.TypeOf<typeof TProgramExerciseVariation>>;

export const TProgramExercise = t.type(
  {
    exerciseType: TExerciseType,
    id: t.string,
    name: t.string,
    variations: t.array(TProgramExerciseVariation),
    state: TProgramState,
    variationExpr: t.string,
    finishDayExpr: t.string,
  },
  "TProgramExercise"
);
export type IProgramExercise = Readonly<t.TypeOf<typeof TProgramExercise>>;

export const TProgram = t.type(
  {
    exercises: t.array(TProgramExercise),
    id: t.string,
    name: t.string,
    description: t.string,
    url: t.string,
    author: t.string,
    nextDay: t.number,
    days: t.array(TProgramDay),
    tags: t.array(TProgramTag),
  },
  "TProgram"
);
export type IProgram = Readonly<t.TypeOf<typeof TProgram>>;

export const TSettingsTimers = t.type(
  {
    warmup: t.union([t.number, t.null]),
    workout: t.union([t.number, t.null]),
  },
  "TSettingsTimers"
);
export type ISettingsTimers = t.TypeOf<typeof TSettingsTimers>;

export const TSettings = t.intersection(
  [
    t.interface({
      timers: TSettingsTimers,
      plates: t.array(TPlate),
      bars: t.record(TUnit, TBars),
      graphs: t.array(TExerciseId),
      units: TUnit,
    }),
    t.partial({
      isPublicProfile: t.boolean,
      nickname: t.string,
    }),
  ],
  "TSettings"
);

export type ISettings = t.TypeOf<typeof TSettings>;

export const TStorage = t.type(
  {
    id: t.number,
    history: t.array(THistoryRecord),
    settings: TSettings,
    currentProgramId: t.union([t.string, t.undefined]),
    version: t.string,
    programs: t.array(TProgram),
    helps: t.array(t.string),
    tempUserId: t.string,
  },
  "TStorage"
);
export type IStorage = Readonly<t.TypeOf<typeof TStorage>>;
