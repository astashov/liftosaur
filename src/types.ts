import { unsafeCoerce } from "fp-ts/lib/function";
import * as t from "io-ts";
import { ObjectUtils } from "./utils/object";
import { IArrayElement } from "./utils/types";

export type IDictionaryC<D extends t.Mixed, C extends t.Mixed> = t.DictionaryType<
  D,
  C,
  {
    [K in t.TypeOf<D>]?: t.TypeOf<C>;
  },
  {
    [K in t.OutputOf<D>]?: t.OutputOf<C>;
  },
  unknown
>;

export const dictionary = <D extends t.Mixed, C extends t.Mixed>(
  domain: D,
  codomain: C,
  name?: string
): IDictionaryC<D, C> => {
  return unsafeCoerce(t.record(t.union([domain, t.undefined]), codomain, name));
};

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

export const TMuscle = t.keyof(
  availableMuscles.reduce<Record<IArrayElement<typeof availableMuscles>, null>>((memo, muscle) => {
    memo[muscle] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof availableMuscles>, null>),
  "TMuscle"
);
export type IMuscle = t.TypeOf<typeof TMuscle>;

export const availableBodyParts = [
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

export const TBodyPart = t.keyof(
  availableBodyParts.reduce<Record<IArrayElement<typeof availableBodyParts>, null>>((memo, muscle) => {
    memo[muscle] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof availableBodyParts>, null>),
  "TBodyPart"
);
export type IBodyPart = t.TypeOf<typeof TBodyPart>;

export const TEquipment = t.keyof(
  equipments.reduce<Record<IArrayElement<typeof equipments>, null>>((memo, barKey) => {
    memo[barKey] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof equipments>, null>),
  "TEquipment"
);
export type IEquipment = t.TypeOf<typeof TEquipment>;

export const TExerciseId = t.string;
export type IExerciseId = t.TypeOf<typeof TExerciseId>;

export const TMetaExercises = t.type(
  {
    bodyParts: t.array(TBodyPart),
    targetMuscles: t.array(TMuscle),
    synergistMuscles: t.array(TMuscle),
  },
  "TMetaExercises"
);
export type IMetaExercises = t.TypeOf<typeof TMetaExercises>;

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

export const TCustomExercise = t.type(
  {
    id: TExerciseId,
    name: t.string,
    defaultEquipment: TEquipment,
    isDeleted: t.boolean,
    meta: TMetaExercises,
  },
  "TCustomExercise"
);
export type ICustomExercise = t.TypeOf<typeof TCustomExercise>;
export type IAllCustomExercises = Partial<Record<string, ICustomExercise>>;

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

export const TProgramState = t.dictionary(t.string, t.union([t.number, TWeight]), "TProgramState");
export type IProgramState = t.TypeOf<typeof TProgramState>;

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

export const TProgramExerciseVariation = t.type(
  {
    sets: t.array(TProgramSet),
  },
  "TProgramExerciseVariation"
);
export type IProgramExerciseVariation = Readonly<t.TypeOf<typeof TProgramExerciseVariation>>;

export const TProgramExerciseWarmupSet = t.type(
  {
    reps: t.number,
    value: t.union([TWeight, t.number]),
    threshold: TWeight,
  },
  "TProgramExerciseWarmupSet"
);
export type IProgramExerciseWarmupSet = Readonly<t.TypeOf<typeof TProgramExerciseWarmupSet>>;

export const TProgramExerciseReuseLogic = t.type(
  {
    selected: t.union([t.string, t.undefined]),
    states: t.record(t.string, TProgramState),
  },
  "TProgramExerciseReuseLogic"
);
export type IProgramExerciseReuseLogic = Readonly<t.TypeOf<typeof TProgramExerciseReuseLogic>>;

export const TProgramExercise = t.intersection(
  [
    t.interface({
      exerciseType: TExerciseType,
      id: t.string,
      name: t.string,
      variations: t.array(TProgramExerciseVariation),
      state: TProgramState,
      variationExpr: t.string,
      finishDayExpr: t.string,
    }),
    t.partial({
      reuseLogic: TProgramExerciseReuseLogic,
      warmupSets: t.array(TProgramExerciseWarmupSet),
    }),
  ],
  "TProgramExercise"
);
export type IProgramExercise = Readonly<t.TypeOf<typeof TProgramExercise>>;

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
      programExercise: t.union([TProgramExercise, t.undefined]),
    }),
    dateModal: t.type({
      date: t.string,
    }),
    editSetModal: t.type({
      isWarmup: t.boolean,
      entryIndex: t.number,
      setIndex: t.union([t.number, t.undefined]),
    }),
    exerciseBottomSheet: t.type({
      entryIndex: t.number,
    }),
    entryIndexEditMode: t.number,
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

const tags = [
  "first-starter",
  "beginner",
  "barbell",
  "dumbbell",
  "intermediate",
  "woman",
  "ppl",
  "hypertrophy",
] as const;

export const TProgramTag = t.keyof(
  tags.reduce<Record<IArrayElement<typeof tags>, null>>((memo, barKey) => {
    memo[barKey] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof tags>, null>),
  "TProgramTag"
);
export type IProgramTag = Readonly<t.TypeOf<typeof TProgramTag>>;

export const TProgram = t.intersection(
  [
    t.interface({
      exercises: t.array(TProgramExercise),
      id: t.string,
      name: t.string,
      description: t.string,
      url: t.string,
      author: t.string,
      nextDay: t.number,
      days: t.array(TProgramDay),
      tags: t.array(TProgramTag),
    }),
    t.partial({
      shortDescription: t.string,
    }),
  ],
  "TProgram"
);
export type IProgram = Readonly<t.TypeOf<typeof TProgram>>;

export const lengthUnits = ["in", "cm"] as const;

export const TLengthUnit = t.keyof(
  lengthUnits.reduce<Record<IArrayElement<typeof lengthUnits>, null>>((memo, exerciseType) => {
    memo[exerciseType] = null;
    return memo;
  }, {} as Record<IArrayElement<typeof lengthUnits>, null>),
  "TUnit"
);
export type ILengthUnit = t.TypeOf<typeof TLengthUnit>;

export const TLength = t.type(
  {
    value: t.number,
    unit: TLengthUnit,
  },
  "TLength"
);
export type ILength = t.TypeOf<typeof TLength>;

export const TStatsWeightValue = t.type({ value: TWeight, timestamp: t.number }, "TStatsWeightValue");
export type IStatsWeightValue = t.TypeOf<typeof TStatsWeightValue>;

export const statsWeightDef = {
  weight: t.array(TStatsWeightValue),
};
export const TStatsWeight = t.partial(statsWeightDef, "TStatsWeight");
export type IStatsWeight = t.TypeOf<typeof TStatsWeight>;

export const TStatsLengthValue = t.type({ value: TLength, timestamp: t.number }, "TStatsLengthValue");
export type IStatsLengthValue = t.TypeOf<typeof TStatsLengthValue>;

export const statsLengthDef = {
  neck: t.array(TStatsLengthValue),
  shoulders: t.array(TStatsLengthValue),
  bicepLeft: t.array(TStatsLengthValue),
  bicepRight: t.array(TStatsLengthValue),
  forearmLeft: t.array(TStatsLengthValue),
  forearmRight: t.array(TStatsLengthValue),
  chest: t.array(TStatsLengthValue),
  waist: t.array(TStatsLengthValue),
  hips: t.array(TStatsLengthValue),
  thighLeft: t.array(TStatsLengthValue),
  thighRight: t.array(TStatsLengthValue),
  calfLeft: t.array(TStatsLengthValue),
  calfRight: t.array(TStatsLengthValue),
};
export const TStatsLength = t.partial(statsLengthDef, "TStatsLength");
export type IStatsLength = t.TypeOf<typeof TStatsLength>;

export type IStatsKey = keyof IStatsLength | keyof IStatsWeight;

export const TStatsWeightEnabled = t.partial(
  ObjectUtils.keys(statsWeightDef).reduce<Record<keyof IStatsWeight, t.BooleanC>>((memo, key) => {
    memo[key] = t.boolean;
    return memo;
  }, {} as Record<keyof IStatsWeight, t.BooleanC>),
  "TStatsWeightEnabled"
);
export type IStatsWeightEnabled = t.TypeOf<typeof TStatsWeightEnabled>;

export const TStatsLengthEnabled = t.partial(
  ObjectUtils.keys(statsLengthDef).reduce<Record<keyof IStatsLength, t.BooleanC>>((memo, key) => {
    memo[key] = t.boolean;
    return memo;
  }, {} as Record<keyof IStatsLength, t.BooleanC>),
  "TStatsLengthEnabled"
);
export type IStatsLengthEnabled = t.TypeOf<typeof TStatsLengthEnabled>;

export const TStatsEnabled = t.type(
  {
    weight: TStatsWeightEnabled,
    length: TStatsLengthEnabled,
  },
  "TStatsEnabled"
);
export type IStatsEnabled = Readonly<t.TypeOf<typeof TStatsEnabled>>;

export const TSettingsTimers = t.type(
  {
    warmup: t.union([t.number, t.null]),
    workout: t.union([t.number, t.null]),
  },
  "TSettingsTimers"
);
export type ISettingsTimers = t.TypeOf<typeof TSettingsTimers>;

export const TGraph = t.union([
  t.type({ type: t.literal("exercise"), id: TExerciseId }),
  t.type({ type: t.literal("statsWeight"), id: t.keyof(statsWeightDef) }),
  t.type({ type: t.literal("statsLength"), id: t.keyof(statsLengthDef) }),
]);
export type IGraph = t.TypeOf<typeof TGraph>;

export const TEquipmentData = t.type(
  {
    bar: t.type({
      lb: TWeight,
      kg: TWeight,
    }),
    multiplier: t.number,
    plates: t.array(t.type({ weight: TWeight, num: t.number })),
    fixed: t.array(TWeight),
    isFixed: t.boolean,
  },
  "TEquipmentData"
);
export type IEquipmentData = t.TypeOf<typeof TEquipmentData>;

export const TSettings = t.intersection(
  [
    t.interface({
      timers: TSettingsTimers,
      equipment: dictionary(TEquipment, TEquipmentData),
      graphs: t.array(TGraph),
      graphsSettings: t.partial({
        isSameXAxis: t.boolean,
        isWithBodyweight: t.boolean,
        isWithOneRm: t.boolean,
        isWithProgramLines: t.boolean,
      }),
      exerciseStatsSettings: t.type({
        ascendingSort: t.boolean,
      }),
      exercises: dictionary(t.string, TCustomExercise),
      statsEnabled: TStatsEnabled,
      units: TUnit,
      lengthUnits: TLengthUnit,
      shouldShowFriendsHistory: t.boolean,
    }),
    t.partial({
      isPublicProfile: t.boolean,
      nickname: t.string,
    }),
  ],
  "TSettings"
);

export type ISettings = t.TypeOf<typeof TSettings>;

export const TStats = t.type({
  weight: TStatsWeight,
  length: TStatsLength,
});
export type IStats = t.TypeOf<typeof TStats>;

export const TSubscription = t.type({
  apple: dictionary(t.string, t.null),
  google: dictionary(t.string, t.null),
});
export type ISubscription = t.TypeOf<typeof TSubscription>;

export const TStorage = t.type(
  {
    id: t.number,
    history: t.array(THistoryRecord),
    stats: TStats,
    settings: TSettings,
    currentProgramId: t.union([t.string, t.undefined]),
    version: t.string,
    programs: t.array(TProgram),
    helps: t.array(t.string),
    tempUserId: t.string,
    email: t.union([t.string, t.undefined]),
    subscription: TSubscription,
    whatsNew: t.union([t.string, t.undefined]),
  },
  "TStorage"
);
export type IStorage = t.TypeOf<typeof TStorage>;

export type IPartialStorage = Omit<IStorage, "history" | "stats" | "programs"> &
  Partial<Pick<IStorage, "history" | "stats" | "programs">>;

export type IProgramContentSettings = Pick<ISettings, "timers" | "units">;
