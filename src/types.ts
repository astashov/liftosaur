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

export const TMuscle = t.keyof(
  availableMuscles.reduce<Record<IArrayElement<typeof availableMuscles>, null>>(
    (memo, muscle) => {
      memo[muscle] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof availableMuscles>, null>
  ),
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

export const exerciseKinds = ["core", "pull", "push", "legs", "upper", "lower"] as const;
export const TExerciseKind = t.keyof(
  exerciseKinds.reduce<Record<IArrayElement<typeof exerciseKinds>, null>>(
    (memo, kind) => {
      memo[kind] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof exerciseKinds>, null>
  ),
  "TExerciseKind"
);
export type IExerciseKind = t.TypeOf<typeof TExerciseKind>;

export const TBodyPart = t.keyof(
  availableBodyParts.reduce<Record<IArrayElement<typeof availableBodyParts>, null>>(
    (memo, muscle) => {
      memo[muscle] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof availableBodyParts>, null>
  ),
  "TBodyPart"
);
export type IBodyPart = t.TypeOf<typeof TBodyPart>;

export const graphExerciseSelectedTypes = ["weight", "volume"] as const;
export const TGraphExerciseSelectedType = t.keyof(
  graphExerciseSelectedTypes.reduce<Record<IArrayElement<typeof graphExerciseSelectedTypes>, null>>(
    (memo, muscle) => {
      memo[muscle] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof graphExerciseSelectedTypes>, null>
  ),
  "TGraphExerciseSelectedType"
);
export type IGraphExerciseSelectedType = t.TypeOf<typeof TGraphExerciseSelectedType>;

export const graphMuscleGroupSelectedTypes = ["volume", "sets"] as const;
export const TGraphMuscleGroupSelectedType = t.keyof(
  graphMuscleGroupSelectedTypes.reduce<Record<IArrayElement<typeof graphMuscleGroupSelectedTypes>, null>>(
    (memo, muscle) => {
      memo[muscle] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof graphMuscleGroupSelectedTypes>, null>
  ),
  "TGraphMuscleGroupSelectedType"
);
export type IGraphMuscleGroupSelectedType = t.TypeOf<typeof TGraphMuscleGroupSelectedType>;

export type IExerciseSelectedType = "weight" | "volume";
export type IVolumeSelectedType = "sets" | "volume";

export const TEquipment = t.string;
export type IEquipment = t.TypeOf<typeof TEquipment>;

export const TExerciseId = t.string;
export type IExerciseId = t.TypeOf<typeof TExerciseId>;

export const TMetaExercises = t.intersection(
  [
    t.interface({
      bodyParts: t.array(TBodyPart),
      targetMuscles: t.array(TMuscle),
      synergistMuscles: t.array(TMuscle),
    }),
    t.partial({
      sortedEquipment: t.array(TEquipment),
    }),
  ],
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

export const TCustomExercise = t.intersection(
  [
    t.interface({
      id: TExerciseId,
      name: t.string,
      isDeleted: t.boolean,
      meta: TMetaExercises,
    }),
    t.partial({
      defaultEquipment: TEquipment,
      types: t.array(TExerciseKind),
      largeImageUrl: t.string,
      smallImageUrl: t.string,
    }),
  ],
  "TCustomExercise"
);
export type ICustomExercise = t.TypeOf<typeof TCustomExercise>;
export type IAllCustomExercises = Partial<Record<string, ICustomExercise>>;

export const units = ["kg", "lb"] as const;

export const TUnit = t.keyof(
  units.reduce<Record<IArrayElement<typeof units>, null>>(
    (memo, exerciseType) => {
      memo[exerciseType] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof units>, null>
  ),
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
  barKeys.reduce<Record<IArrayElement<typeof barKeys>, null>>(
    (memo, barKey) => {
      memo[barKey] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof barKeys>, null>
  ),
  "TBarKey"
);
export type IBarKey = t.TypeOf<typeof TBarKey>;

export const TBars = t.record(TBarKey, TWeight, "TBars");
export type IBars = t.TypeOf<typeof TBars>;

export const percentageUnits = ["%"] as const;

export const TPercentageUnit = t.keyof(
  percentageUnits.reduce<Record<IArrayElement<typeof percentageUnits>, null>>(
    (memo, exerciseType) => {
      memo[exerciseType] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof percentageUnits>, null>
  ),
  "TPercentageUnit"
);
export type IPercentageUnit = t.TypeOf<typeof TPercentageUnit>;

export const TPercentage = t.type({ value: t.number, unit: TPercentageUnit }, "TPercentage");
export type IPercentage = t.TypeOf<typeof TPercentage>;

export const TSet = t.partial(
  {
    reps: t.number,
    originalWeight: t.union([TWeight, TPercentage]),
    weight: TWeight,
    id: t.string,
    minReps: t.number,
    rpe: t.number,
    logRpe: t.boolean,
    timestamp: t.number,
    isAmrap: t.boolean,
    label: t.string,
    timer: t.number,
    askWeight: t.boolean,
    isCompleted: t.boolean,
    completedReps: t.number,
    completedWeight: TWeight,
    completedRpe: t.number,
    programSetIndex: t.number,
  },
  "TSet"
);
export type ISet = t.TypeOf<typeof TSet>;

export const TProgramState = t.dictionary(t.string, t.union([t.number, TWeight, TPercentage]), "TProgramState");
export type IProgramState = t.TypeOf<typeof TProgramState>;

export const THistoryEntry = t.intersection(
  [
    t.interface({
      exercise: TExerciseType,
      sets: t.array(TSet),
      warmupSets: t.array(TSet),
    }),
    t.partial({
      id: t.string,
      programExerciseId: t.string,
      state: TProgramState,
      vars: TProgramState,
      notes: t.string,
      changed: t.boolean,
      updatePrints: t.array(t.array(t.union([t.number, TWeight, TPercentage]))),
    }),
  ],
  "THistoryEntry"
);
export type IHistoryEntry = t.TypeOf<typeof THistoryEntry>;

export const TProgramStateMetadataValue = t.partial(
  {
    userPrompted: t.boolean,
  },
  "TProgramStateMetadataValue"
);
export type IProgramStateMetadataValue = t.TypeOf<typeof TProgramStateMetadataValue>;

export const TProgramStateMetadata = dictionary(t.string, TProgramStateMetadataValue);
export type IProgramStateMetadata = t.TypeOf<typeof TProgramStateMetadata>;

export const TProgramSet = t.intersection(
  [
    t.interface({
      repsExpr: t.string,
      weightExpr: t.string,
    }),
    t.partial({
      isAmrap: t.boolean,
      rpeExpr: t.string,
      minRepsExpr: t.string,
      logRpe: t.boolean,
      askWeight: t.boolean,
      label: t.string,
      timerExpr: t.string,
    }),
  ],
  "TProgramSet"
);
export type IProgramSet = t.TypeOf<typeof TProgramSet>;

export const TProgramExerciseVariation = t.intersection(
  [
    t.interface({
      sets: t.array(TProgramSet),
    }),
    t.partial({
      quickAddSets: t.boolean,
    }),
  ],
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
      descriptions: t.array(t.string),
    }),
    t.partial({
      tags: t.array(t.number),
      updateDayExpr: t.string,
      diffPaths: t.array(t.string),
      description: t.string,
      descriptionExpr: t.string,
      quickAddSets: t.boolean,
      enableRepRanges: t.boolean,
      enableRpe: t.boolean,
      stateMetadata: TProgramStateMetadata,
      timerExpr: t.string,
      reuseLogic: TProgramExerciseReuseLogic,
      warmupSets: t.array(TProgramExerciseWarmupSet),
      reuseFinishDayScript: t.string,
      reuseUpdateDayScript: t.string,
    }),
  ],
  "TProgramExercise"
);
export type IProgramExercise = t.TypeOf<typeof TProgramExercise>;

export const TProgressUi = t.partial(
  {
    amrapModal: t.intersection([
      t.interface({
        entryIndex: t.number,
        setIndex: t.number,
      }),
      t.partial({
        isAmrap: t.boolean,
        logRpe: t.boolean,
        askWeight: t.boolean,
        userVars: t.boolean,
      }),
    ]),
    editModal: t.type({
      programExerciseId: t.string,
      entryIndex: t.number,
    }),
    dateModal: t.type({
      date: t.string,
      time: t.number,
    }),
    exerciseModal: t.partial({
      exerciseType: TExerciseType,
      entryIndex: t.number,
    }),
    equipmentModal: t.partial({
      exerciseType: TExerciseType,
    }),
    rm1Modal: t.partial({
      exerciseType: TExerciseType,
    }),
    editSetModal: t.type({
      isWarmup: t.boolean,
      entryIndex: t.number,
      exerciseType: t.union([TExerciseType, t.undefined]),
      programExerciseId: t.union([t.string, t.undefined]),
      set: TSet,
      setIndex: t.union([t.number, t.undefined]),
    }),
    exerciseBottomSheet: t.type({
      entryIndex: t.number,
    }),
    entryIndexEditMode: t.number,
    currentEntryIndex: t.number,
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

export const TIntervals = t.array(t.tuple([t.number, t.union([t.number, t.undefined, t.null])]), "TIntervals");
export type IIntervals = t.TypeOf<typeof TIntervals>;

export const historyRecordChange = ["order"] as const;
export const THistoryRecordChange = t.keyof(
  historyRecordChange.reduce<Record<IArrayElement<typeof historyRecordChange>, null>>(
    (memo, muscle) => {
      memo[muscle] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof historyRecordChange>, null>
  ),
  "THistoryRecordChange"
);
export type tHistoryRecordChange = t.TypeOf<typeof THistoryRecordChange>;

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
      week: t.number,
      dayInWeek: t.number,
      ui: TProgressUi,
      intervals: TIntervals,
      deletedProgramExercises: dictionary(t.string, t.boolean),
      userPromptedStateVars: dictionary(t.string, TProgramState),
      changes: t.array(THistoryRecordChange),
      timerSince: t.number,
      timerMode: TProgressMode,
      timer: t.number,
      timerEntryIndex: t.number,
      timerSetIndex: t.number,
      notes: t.string,
      updatedAt: t.number,
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

export const TProgramWeek = t.intersection(
  [
    t.interface({
      id: t.string,
      name: t.string,
      days: t.array(
        t.type({
          id: t.string,
        })
      ),
    }),
    t.partial({
      description: t.string,
    }),
  ],
  "TProgramWeek"
);
export type IProgramWeek = Readonly<t.TypeOf<typeof TProgramWeek>>;

export const TProgramDay = t.intersection(
  [
    t.interface({
      id: t.string,
      name: t.string,
      exercises: t.array(
        t.type({
          id: t.string,
        })
      ),
    }),
    t.partial({ description: t.string }),
  ],
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
  tags.reduce<Record<IArrayElement<typeof tags>, null>>(
    (memo, barKey) => {
      memo[barKey] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof tags>, null>
  ),
  "TProgramTag"
);
export type IProgramTag = Readonly<t.TypeOf<typeof TProgramTag>>;

export const TPlannerProgramDay = t.intersection(
  [
    t.interface({
      name: t.string,
      exerciseText: t.string,
    }),
    t.partial({
      description: t.string,
    }),
  ],
  "TPlannerProgramDay"
);
export type IPlannerProgramDay = t.TypeOf<typeof TPlannerProgramDay>;

export const TPlannerProgramWeek = t.intersection(
  [
    t.interface({
      name: t.string,
      days: t.array(TPlannerProgramDay),
    }),
    t.partial({
      description: t.string,
    }),
  ],
  "TPlannerProgramWeek"
);
export type IPlannerProgramWeek = Readonly<t.TypeOf<typeof TPlannerProgramWeek>>;

export const TPlannerProgram = t.type(
  {
    name: t.string,
    weeks: t.array(TPlannerProgramWeek),
  },
  "TPlannerProgram"
);
export type IPlannerProgram = Readonly<t.TypeOf<typeof TPlannerProgram>>;

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
      weeks: t.array(TProgramWeek),
      isMultiweek: t.boolean,
      tags: t.array(TProgramTag),
    }),
    t.partial({
      deletedDays: t.array(t.string),
      deletedWeeks: t.array(t.string),
      deletedExercises: t.array(t.string),
      clonedAt: t.number,
      shortDescription: t.string,
      planner: TPlannerProgram,
      updatedAt: t.number,
    }),
  ],
  "TProgram"
);
export type IProgram = t.TypeOf<typeof TProgram>;

export const lengthUnits = ["in", "cm"] as const;

export const TLengthUnit = t.keyof(
  lengthUnits.reduce<Record<IArrayElement<typeof lengthUnits>, null>>(
    (memo, exerciseType) => {
      memo[exerciseType] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof lengthUnits>, null>
  ),
  "TUnit"
);
export type ILengthUnit = t.TypeOf<typeof TLengthUnit>;

export const TLength = t.type({ value: t.number, unit: TLengthUnit }, "TLength");
export type ILength = t.TypeOf<typeof TLength>;

export const TStatsWeightValue = t.intersection(
  [t.interface({ value: TWeight, timestamp: t.number }), t.partial({ updatedAt: t.number, appleUuid: t.string })],
  "TStatsWeightValue"
);
export type IStatsWeightValue = t.TypeOf<typeof TStatsWeightValue>;

export const statsWeightDef = {
  weight: t.array(TStatsWeightValue),
};
export const TStatsWeight = t.partial(statsWeightDef, "TStatsWeight");
export type IStatsWeight = t.TypeOf<typeof TStatsWeight>;

export const TStatsLengthValue = t.intersection(
  [t.interface({ value: TLength, timestamp: t.number }), t.partial({ updatedAt: t.number, appleUuid: t.string })],
  "TStatsLengthValue"
);
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

export const TStatsPercentageValue = t.intersection(
  [t.interface({ value: TPercentage, timestamp: t.number }), t.partial({ updatedAt: t.number, appleUuid: t.string })],
  "TStatsPercentageValue"
);
export type IStatsPercentageValue = t.TypeOf<typeof TStatsPercentageValue>;

export const statsPercentageDef = {
  bodyfat: t.array(TStatsPercentageValue),
};
export const TStatsPercentage = t.partial(statsPercentageDef, "TStatsPercentage");
export type IStatsPercentage = t.TypeOf<typeof TStatsPercentage>;

export type IStatsKey = keyof IStatsLength | keyof IStatsWeight | keyof IStatsPercentage;

export const TStatsWeightEnabled = t.partial(
  ObjectUtils.keys(statsWeightDef).reduce<Record<keyof IStatsWeight, t.BooleanC>>(
    (memo, key) => {
      memo[key] = t.boolean;
      return memo;
    },
    {} as Record<keyof IStatsWeight, t.BooleanC>
  ),
  "TStatsWeightEnabled"
);
export type IStatsWeightEnabled = t.TypeOf<typeof TStatsWeightEnabled>;

export const TStatsLengthEnabled = t.partial(
  ObjectUtils.keys(statsLengthDef).reduce<Record<keyof IStatsLength, t.BooleanC>>(
    (memo, key) => {
      memo[key] = t.boolean;
      return memo;
    },
    {} as Record<keyof IStatsLength, t.BooleanC>
  ),
  "TStatsLengthEnabled"
);
export type IStatsLengthEnabled = t.TypeOf<typeof TStatsLengthEnabled>;

export const TStatsPercentageEnabled = t.partial(
  ObjectUtils.keys(statsPercentageDef).reduce<Record<keyof IStatsPercentage, t.BooleanC>>(
    (memo, key) => {
      memo[key] = t.boolean;
      return memo;
    },
    {} as Record<keyof IStatsPercentage, t.BooleanC>
  ),
  "TStatsPercentageEnabled"
);

export const TStatsEnabled = t.type(
  {
    weight: TStatsWeightEnabled,
    length: TStatsLengthEnabled,
    percentage: TStatsPercentageEnabled,
  },
  "TStatsEnabled"
);
export type IStatsEnabled = Readonly<t.TypeOf<typeof TStatsEnabled>>;

export const TSettingsTimers = t.intersection(
  [
    t.interface({
      warmup: t.union([t.number, t.undefined, t.null]),
      workout: t.union([t.number, t.undefined, t.null]),
    }),
    t.partial({
      reminder: t.number,
    }),
  ],
  "TSettingsTimers"
);
export type ISettingsTimers = t.TypeOf<typeof TSettingsTimers>;

export const TGraph = t.union([
  t.type({ type: t.literal("exercise"), id: TExerciseId }),
  t.type({ type: t.literal("statsWeight"), id: t.keyof(statsWeightDef) }),
  t.type({ type: t.literal("statsLength"), id: t.keyof(statsLengthDef) }),
  t.type({ type: t.literal("statsPercentage"), id: t.keyof(statsPercentageDef) }),
  t.type({ type: t.literal("muscleGroup"), id: t.string }),
]);
export type IGraph = t.TypeOf<typeof TGraph>;

export const TEquipmentData = t.intersection(
  [
    t.interface({
      bar: t.type({
        lb: TWeight,
        kg: TWeight,
      }),
      multiplier: t.number,
      plates: t.array(t.type({ weight: TWeight, num: t.number })),
      fixed: t.array(TWeight),
      isFixed: t.boolean,
    }),
    t.partial({
      unit: TUnit,
      name: t.string,
      similarTo: t.string,
      isDeleted: t.boolean,
    }),
  ],
  "TEquipmentData"
);
export type IEquipmentData = t.TypeOf<typeof TEquipmentData>;
export type IAllEquipment = Partial<Record<string, IEquipmentData>>;

export const TGraphOptions = t.partial({
  movingAverageWindowSize: t.number,
});
export type IGraphOptions = t.TypeOf<typeof TGraphOptions>;

export const TExerciseDataValue = t.partial(
  {
    rm1: TWeight,
    rounding: t.number,
    equipment: dictionary(t.string, t.union([t.string, t.undefined])),
  },
  "TExerciseDataValue"
);
export type IExerciseDataValue = t.TypeOf<typeof TExerciseDataValue>;
export type IExerciseData = Partial<Record<string, IExerciseDataValue>>;

export const screenMuscles = [
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
] as const;

export const TScreenMuscle = t.keyof(
  screenMuscles.reduce<Record<IArrayElement<typeof screenMuscles>, null>>(
    (memo, muscle) => {
      memo[muscle] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof screenMuscles>, null>
  ),
  "TScreenMuscle"
);
export type IScreenMuscle = t.TypeOf<typeof TScreenMuscle>;

export const TPlannerSettings = t.type(
  {
    synergistMultiplier: t.number,
    strengthSetsPct: t.number,
    hypertrophySetsPct: t.number,
    weeklyRangeSets: dictionary(TScreenMuscle, t.tuple([t.number, t.number])),
    weeklyFrequency: dictionary(TScreenMuscle, t.number),
  },
  "TPlannerSettings"
);
export type IPlannerSettings = t.TypeOf<typeof TPlannerSettings>;

export const TGym = t.type(
  {
    id: t.string,
    name: t.string,
    equipment: dictionary(TEquipment, TEquipmentData),
  },
  "TGym"
);
export type IGym = t.TypeOf<typeof TGym>;

export const targetTypes = ["target", "lasttime", "platescalculator"] as const;
export const TTargetType = t.keyof(
  targetTypes.reduce<Record<IArrayElement<typeof targetTypes>, null>>(
    (memo, exerciseType) => {
      memo[exerciseType] = null;
      return memo;
    },
    {} as Record<IArrayElement<typeof targetTypes>, null>
  ),
  "TTargetType"
);
export type ITargetType = t.TypeOf<typeof TTargetType>;

export const TWorkoutSettings = t.intersection(
  [
    t.interface({
      targetType: TTargetType,
    }),
    t.partial({
      shouldHideGraphs: t.boolean,
    }),
  ],
  "TWorkoutSettings"
);

export type IWorkoutSettings = t.TypeOf<typeof TWorkoutSettings>;

export const TSettings = t.intersection(
  [
    t.interface({
      timers: TSettingsTimers,
      equipment: dictionary(TEquipment, TEquipmentData),
      gyms: t.array(TGym),
      deletedGyms: t.array(t.string),
      graphs: t.array(TGraph),
      graphOptions: dictionary(t.string, TGraphOptions),
      graphsSettings: t.partial({
        isSameXAxis: t.boolean,
        isWithBodyweight: t.boolean,
        isWithOneRm: t.boolean,
        isWithProgramLines: t.boolean,
        defaultType: TGraphExerciseSelectedType,
        defaultMuscleGroupType: TGraphMuscleGroupSelectedType,
      }),
      exerciseStatsSettings: t.partial({
        ascendingSort: t.boolean,
        hideWithoutWorkoutNotes: t.boolean,
        hideWithoutExerciseNotes: t.boolean,
      }),
      exercises: dictionary(t.string, TCustomExercise),
      statsEnabled: TStatsEnabled,
      units: TUnit,
      lengthUnits: TLengthUnit,
      volume: t.number,
      exerciseData: dictionary(t.string, TExerciseDataValue),
      planner: TPlannerSettings,
      workoutSettings: TWorkoutSettings,
    }),
    t.partial({
      appleHealthSyncWorkout: t.boolean,
      appleHealthSyncMeasurements: t.boolean,
      appleHealthAnchor: t.string,
      googleHealthSyncWorkout: t.boolean,
      googleHealthSyncMeasurements: t.boolean,
      googleHealthAnchor: t.string,
      ignoreDoNotDisturb: t.boolean,
      currentGymId: t.string,
      isPublicProfile: t.boolean,
      nickname: t.string,
      alwaysOnDisplay: t.boolean,
      vibration: t.boolean,
      startWeekFromMonday: t.boolean,
      textSize: t.number,
    }),
  ],
  "TSettings"
);

export type ISettings = t.TypeOf<typeof TSettings>;

export const TStats = t.type(
  {
    weight: TStatsWeight,
    length: TStatsLength,
    percentage: TStatsPercentage,
  },
  "TStats"
);
export type IStats = t.TypeOf<typeof TStats>;

export const TSubscription = t.intersection([
  t.interface({
    apple: dictionary(t.string, t.null),
    google: dictionary(t.string, t.null),
  }),
  t.partial({
    key: t.union([t.string, t.undefined]),
  }),
]);
export type ISubscription = t.TypeOf<typeof TSubscription>;

export const TStorage = t.intersection(
  [
    t.interface({
      history: t.array(THistoryRecord),
      deletedHistory: t.array(t.number),
      stats: TStats,
      deletedStats: t.array(t.number),
      settings: TSettings,
      currentProgramId: t.union([t.string, t.undefined]),
      version: t.string,
      programs: t.array(TProgram),
      deletedPrograms: t.array(t.number),
      reviewRequests: t.array(t.number),
      signupRequests: t.array(t.number),
      helps: t.array(t.string),
      tempUserId: t.string,
      email: t.union([t.string, t.undefined]),
      affiliates: dictionary(t.string, t.number),
      subscription: TSubscription,
      whatsNew: t.union([t.string, t.undefined]),
    }),
    t.partial({
      originalId: t.number,
      id: t.number,
      referrer: t.string,
    }),
  ],
  "TStorage"
);
export type IStorage = t.TypeOf<typeof TStorage>;

export type IPartialStorage = Omit<IStorage, "history" | "stats" | "programs"> &
  Partial<Pick<IStorage, "history" | "stats" | "programs">>;

export type IProgramContentSettings = Partial<
  Pick<ISettings, "units" | "planner"> & { timers: Partial<ISettings["timers"]> }
>;

export type IDayData = {
  week?: number;
  day: number;
  dayInWeek?: number;
};
