import { View, TouchableOpacity, TextInput, Image } from "react-native";
import { Exercise } from "../models/exercise";
import { History, IHistoryRecordAndEntry } from "../models/history";
import { IDispatch } from "../ducks/types";
import { Weight } from "../models/weight";
import { Reps } from "../models/set";
import { CollectionUtils } from "../utils/collection";
import { ProgressStateChanges } from "./progressStateChanges";
import { memo } from "react";
import {
  IHistoryEntry,
  ISettings,
  IProgramExercise,
  IProgressMode,
  IExerciseType,
  IWeight,
  IHistoryRecord,
  ISet,
  ISubscription,
  IDayData,
  IProgram,
} from "../types";
import { DateUtils } from "../utils/date";
import { IState, updateState } from "../models/state";
import { StringUtils } from "../utils/string";
import { IconArrowRight } from "./icons/iconArrowRight";
import { lb } from "lens-shmens";
import { Progress } from "../models/progress";
import { Button } from "./button";
import { useRef, useState } from "react";
import { ProgramExercise } from "../models/programExercise";
import { Subscriptions } from "../utils/subscriptions";
import { LinkButton } from "./linkButton";
import { Thunk } from "../ducks/thunks";
import { ExerciseSets } from "./exerciseSets";
import { GroupHeader } from "./groupHeader";
import { inputClassName } from "./input";
import { IconNotebook } from "./icons/iconNotebook";
import { IconEditSquare } from "./icons/iconEditSquare";
import { Markdown } from "./markdown";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { IconPreview } from "./icons/iconPreview";
import { WorkoutStateVariables } from "./workoutStateVariables";
import { ExerciseImage } from "./exerciseImage";
import { UidFactory } from "../utils/generator";
import { Nux } from "./nux";
import { WeightLinesUnsubscribed } from "./weightLinesUnsubscribed";
import { IProgramMode } from "../models/program";
import { n } from "../utils/math";
import { IconSwap } from "./icons/iconSwap";
import { Equipment } from "../models/equipment";
import { LftText } from "./lftText";

interface IProps {
  showHelp: boolean;
  entry: IHistoryEntry;
  settings: ISettings;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  dayData: IDayData;
  programExercise?: IProgramExercise;
  program?: IProgram;
  helps: string[];
  index: number;
  showEditButtons: boolean;
  forceShowStateChanges?: boolean;
  subscription: ISubscription;
  hidePlatesCalculator?: boolean;
  programMode: IProgramMode;
  dispatch: IDispatch;
  onStartSetChanging?: (
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IProgramExercise,
    exerciseType?: IExerciseType
  ) => void;
  onExerciseInfoClick?: (exercise: IExerciseType) => void;
  onChangeReps: (mode: IProgressMode, entryIndex: number, setIndex: number) => void;
}

function getColor(entry: IHistoryEntry): string {
  if (entry.sets.length === 0) {
    return "purple";
  }
  if (Reps.isFinished(entry.sets)) {
    if (Reps.isCompleted(entry.sets)) {
      return "green";
    } else if (Reps.isInRangeCompleted(entry.sets)) {
      return "yellow";
    } else {
      return "red";
    }
  } else {
    return "purple";
  }
}

function getBgColor100(entry: IHistoryEntry): string {
  const color = getColor(entry);
  if (color === "green") {
    return "bg-greenv2-100";
  } else if (color === "red") {
    return "bg-redv2-100";
  } else if (color === "yellow") {
    return "bg-orange-100";
  } else {
    return "bg-purplev2-100";
  }
}

function getBgColor200(entry: IHistoryEntry): string {
  const color = getColor(entry);
  if (color === "green") {
    return "bg-greenv2-200";
  } else if (color === "red") {
    return "bg-redv2-200";
  } else if (color === "yellow") {
    return "bg-orange-200";
  } else {
    return "bg-purplev2-200";
  }
}

export const ExerciseView = memo((props: IProps): JSX.Element => {
  const { entry } = props;
  const color = getColor(entry);
  const className = `px-4 pt-4 pb-2 mb-2 rounded-lg ${getBgColor100(entry)}`;
  let dataCy;
  if (color === "green") {
    dataCy = "exercise-completed";
  } else if (color === "yellow") {
    dataCy = "exercise-in-range-completed";
  } else if (color === "red") {
    dataCy = "exercise-finished";
  } else {
    dataCy = "exercise-progress";
  }

  return (
    <>
      <View data-cy={dataCy} className={className}>
        <ExerciseContentView {...props} />
        {props.programExercise && props.program && (
          <ProgressStateChanges
            mode={props.programMode}
            entry={props.entry}
            forceShow={props.forceShowStateChanges}
            settings={props.settings}
            dayData={props.dayData}
            programExercise={props.programExercise}
            program={props.program}
            userPromptedStateVars={props.progress.userPromptedStateVars?.[props.programExercise.id]}
          />
        )}
      </View>
    </>
  );
});

const ExerciseContentView = memo((props: IProps): JSX.Element => {
  const isCurrentProgress = Progress.isCurrent(props.progress);
  const exercise = Exercise.get(props.entry.exercise, props.settings.exercises);
  const exerciseUnit = Equipment.getUnitOrDefaultForExerciseType(props.settings, exercise);
  const historicalSameDay = isCurrentProgress
    ? History.getHistoricalSameDay(props.history, props.progress, props.entry)
    : undefined;
  const historicalLastDay = isCurrentProgress ? History.getHistoricalLastDay(props.history, props.entry) : undefined;
  const showLastDay =
    historicalLastDay != null &&
    (historicalSameDay == null || historicalSameDay.record.startTime < historicalLastDay.record.startTime);
  const workoutWeights = CollectionUtils.compatBy(
    props.entry.sets.map((s) => ({ original: s.originalWeight, rounded: s.weight })),
    (w) => w.rounded.value.toString()
  );
  const hasUnequalWeights = workoutWeights.some((w) => !Weight.eq(w.original, w.rounded));
  workoutWeights.sort((a, b) => Weight.compare(a.rounded, b.rounded));
  const warmupWeights = CollectionUtils.compatBy(
    props.entry.warmupSets.map((s) => ({ original: s.originalWeight, rounded: s.weight })),
    (w) => w.rounded.value.toString()
  ).filter((w) =>
    isCurrentProgress
      ? Object.keys(Weight.calculatePlates(w.rounded, props.settings, exerciseUnit, props.entry.exercise).plates)
          .length > 0
      : true
  );
  const nextSet = [...props.entry.warmupSets, ...props.entry.sets].filter((s) => s.completedReps == null)[0];
  const historicalAmrapSets = isCurrentProgress
    ? History.getHistoricalAmrapSets(props.history, props.entry, nextSet)
    : undefined;
  warmupWeights.sort((a, b) => Weight.compare(a.rounded, b.rounded));
  const isEditModeRef = useRef(false);
  isEditModeRef.current = props.progress.ui?.entryIndexEditMode === props.index;
  const isSubscribed = Subscriptions.hasSubscription(props.subscription);

  const [showNotes, setShowNotes] = useState(!!props.entry.notes);
  const [showStateVariables, setShowStateVariables] = useState(false);

  const programExercise = props.programExercise;
  let description: string | undefined;
  if (programExercise != null && props.program != null) {
    description = ProgramExercise.getDescription(
      programExercise,
      props.program.exercises,
      props.dayData,
      props.settings
    );
  }
  const volume = Reps.volume(props.entry.sets);
  const currentEquipmentName = Equipment.getEquipmentNameForExerciseType(props.settings, exercise);
  const onerm = Exercise.onerm(exercise, props.settings);

  return (
    <View data-cy={`entry-${StringUtils.dashcase(exercise.name)}`}>
      <View className="flex-row">
        <View style={{ width: 64 }}>
          <TouchableOpacity
            className="w-full px-2 py-2 nm-workout-exercise-image"
            style={{ marginLeft: -8 }}
            onPress={() => props.onExerciseInfoClick?.(exercise)}
          >
            <ExerciseImage settings={props.settings} className="w-16 h-16" exerciseType={exercise} size="small" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 min-w-0 ml-auto">
          <View className="flex-row items-start">
            <View className="flex-1">
              <TouchableOpacity
                className="text-left nm-workout-exercise-name"
                data-cy="exercise-name"
                onPress={() => props.onExerciseInfoClick?.(exercise)}
              >
                <View className="flex-row items-center gap-1">
                  <LftText className="pr-1 text-lg font-bold">
                    {Exercise.nameWithEquipment(exercise, props.settings)}
                  </LftText>{" "}
                  <IconArrowRight style={{ marginBottom: "2px" }} className="inline-block" />
                </View>
              </TouchableOpacity>
            </View>
            {props.showEditButtons && (
              <View className="flex-row gap-4 px-2">
                {!isCurrentProgress && (
                  <TouchableOpacity
                    data-cy="exercise-state-vars-toggle"
                    className="leading-none align-middle nm-workout-see-statvars"
                    hitSlop={8}
                    onPress={() => setShowStateVariables(!showStateVariables)}
                  >
                    <IconPreview size={18} className="inline-block" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  data-cy="exercise-swap"
                  hitSlop={8}
                  className="box-content align-middle nm-workout-edit-mode"
                  style={{ width: 18, height: 18 }}
                  onPress={() => {
                    updateState(props.dispatch, [
                      lb<IState>()
                        .p("progress")
                        .pi(props.progress.id)
                        .pi("ui")
                        .p("exerciseModal")
                        .record({ exerciseType: props.entry.exercise, entryIndex: props.index }),
                    ]);
                  }}
                >
                  <IconSwap size={18} color="#313A43" />
                </TouchableOpacity>
                <TouchableOpacity
                  data-cy="exercise-edit-mode"
                  hitSlop={8}
                  className="box-content align-middle nm-workout-edit-mode"
                  style={{ width: 18, height: 18 }}
                  onPress={() => {
                    if (!isCurrentProgress || !programExercise) {
                      updateState(props.dispatch, [
                        lb<IState>()
                          .p("progress")
                          .pi(props.progress.id)
                          .pi("ui")
                          .p("entryIndexEditMode")
                          .record(props.index),
                      ]);
                    } else {
                      updateState(props.dispatch, [
                        lb<IState>()
                          .p("progress")
                          .pi(props.progress.id)
                          .pi("ui")
                          .p("editModal")
                          .record({ programExercise: programExercise, entryIndex: props.index }),
                      ]);
                    }
                  }}
                >
                  <IconEditSquare />
                </TouchableOpacity>
                <TouchableOpacity
                  data-cy="exercise-notes-toggle"
                  hitSlop={8}
                  className="leading-none align-middle nm-workout-exercise-notes"
                  style={{ marginRight: -8 }}
                  onPress={() => setShowNotes(!showNotes)}
                >
                  <IconNotebook size={18} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View data-cy="exercise-equipment" className="flex-row items-center gap-1">
            <LftText className="text-sm text-grayv2-600">Equipment:</LftText>
            <LinkButton
              name="exercise-equipment-picker"
              data-cy="exercise-equipment-picker"
              onPress={() => {
                updateState(props.dispatch, [
                  lb<IState>()
                    .p("progress")
                    .pi(props.progress.id)
                    .pi("ui")
                    .p("equipmentModal")
                    .record({ exerciseType: props.entry.exercise }),
                ]);
              }}
            >
              {currentEquipmentName || "None"}
            </LinkButton>
          </View>
          {programExercise && ProgramExercise.doesUse1RM(programExercise) && (
            <LftText data-cy="exercise-rm1" className="text-xs text-grayv2-600">
              1RM:{" "}
              <LinkButton
                name="exercise-rm1-picker"
                data-cy="exercise-rm1-picker"
                onPress={() => {
                  updateState(props.dispatch, [
                    lb<IState>()
                      .p("progress")
                      .pi(props.progress.id)
                      .pi("ui")
                      .p("rm1Modal")
                      .record({ exerciseType: props.entry.exercise }),
                  ]);
                }}
              >
                {Weight.print(onerm)}
              </LinkButton>
            </LftText>
          )}
          {description && (
            <View className="mt-2">
              <Markdown value={description} />
            </View>
          )}
          {showStateVariables && <WorkoutStateVariables settings={props.settings} entry={props.entry} />}
          {!props.hidePlatesCalculator ? (
            <View className={`p-2 mt-2 ${getBgColor200(props.entry)} rounded-2xl`}>
              <Image source={{ uri: "/images/icon-barbell.svg" }} className="w-6 h-6" />
              <LftText className="py-1 pl-1 text-xs text-grayv2-main">
                {isSubscribed ? (
                  "Plates for each bar side"
                ) : (
                  <LinkButton
                    name="see-plates-for-each-side"
                    onPress={() => props.dispatch(Thunk.pushScreen("subscription"))}
                  >
                    See plates for each side
                  </LinkButton>
                )}
              </LftText>
              {isSubscribed ? (
                <View className="relative pr-8">
                  {warmupWeights.map((w) => {
                    const isCurrent = nextSet != null && Weight.eq(nextSet.weight, w.rounded);
                    const className = isCurrent ? "font-bold" : "";
                    return (
                      <View className={`${className} flex-row items-start`}>
                        <LftText style={{ minWidth: 16 }} className="inline-block mx-2 text-center align-text-bottom">
                          {isCurrent && <IconArrowRight className="inline-block" color="#ff8066" />}
                        </LftText>
                        <LftText className="text-left whitespace-no-wrap text-grayv2-500">
                          {n(w.rounded.value)} {w.rounded.unit}
                        </LftText>
                        <WeightView weight={w.rounded} exercise={props.entry.exercise} settings={props.settings} />
                      </View>
                    );
                  })}
                  {workoutWeights.map((w, i) => {
                    return (
                      <WeightLine
                        key={UidFactory.generateUid(8)}
                        weight={w}
                        entry={props.entry}
                        settings={props.settings}
                        dispatch={props.dispatch}
                        nextSet={nextSet}
                        programExercise={props.programExercise}
                      />
                    );
                  })}
                </View>
              ) : (
                <View className="pl-8">
                  <WeightLinesUnsubscribed weights={workoutWeights} />
                </View>
              )}
              {props.showHelp && hasUnequalWeights && (
                <HelpEquipment
                  helps={props.helps}
                  entry={props.entry}
                  progress={props.progress}
                  dispatch={props.dispatch}
                />
              )}
            </View>
          ) : (
            <View className="mt-2">
              <WeightLinesUnsubscribed weights={workoutWeights} />
              <HelpEquipment
                helps={props.helps}
                entry={props.entry}
                progress={props.progress}
                dispatch={props.dispatch}
              />
            </View>
          )}
          {(!isSubscribed || props.hidePlatesCalculator) && (
            <View>
              {nextSet && <NextSet nextSet={nextSet} settings={props.settings} exerciseType={props.entry.exercise} />}
            </View>
          )}
        </View>
      </View>
      <View className="flex-row flex-wrap py-2 pt-4">
        <ExerciseSets
          isEditMode={isEditModeRef.current}
          dayData={props.dayData}
          warmupSets={props.entry.warmupSets}
          index={props.index}
          progress={props.progress}
          programExercise={props.programExercise}
          allProgramExercises={props.program?.exercises}
          showHelp={props.showHelp}
          settings={props.settings}
          entry={props.entry}
          onStartSetChanging={props.onStartSetChanging}
          onChangeReps={props.onChangeReps}
          dispatch={props.dispatch}
        />
      </View>
      {!isCurrentProgress && volume.value > 0 && (
        <LftText className="mb-1 text-xs text-left" style={{ marginTop: -16 }}>
          Volume: <LftText className="font-bold">{Weight.print(Weight.roundTo005(volume))}</LftText>
        </LftText>
      )}
      {isEditModeRef.current && (
        <View className="text-center">
          <Button
            name="delete-workout-exercise"
            data-cy="delete-edit-exercise"
            kind="red"
            className="mr-1"
            onClick={() => {
              if (confirm("Are you sure? It only deletes it from this workout, not from a program.")) {
                const lbp = lb<IState>().p("progress").pi(props.progress.id);
                updateState(props.dispatch, [
                  lbp
                    .p("deletedProgramExercises")
                    .recordModify((dpe) => (programExercise ? { ...dpe, [programExercise.id]: true } : dpe)),
                  lbp.pi("ui").p("entryIndexEditMode").record(undefined),
                  lbp.p("entries").recordModify((entries) => {
                    return CollectionUtils.removeAt(entries, props.index);
                  }),
                ]);
              }
            }}
          >
            Delete
          </Button>
          <Button
            name="finish-edit-workout-exercise"
            data-cy="done-edit-exercise"
            kind="orange"
            className="ml-1"
            onClick={() =>
              updateState(props.dispatch, [
                lb<IState>().p("progress").pi(props.progress.id).pi("ui").p("entryIndexEditMode").record(undefined),
              ])
            }
          >
            Finish Editing
          </Button>
        </View>
      )}
      {showLastDay && historicalLastDay && (
        <HistoricalLastDay historyRecordAndEntry={historicalLastDay} settings={props.settings} />
      )}
      {historicalSameDay && <HistoricalSameDay historyRecordAndEntry={historicalSameDay} settings={props.settings} />}
      {historicalAmrapSets && <HistoricalAmrapSets historicalAmrapSets={historicalAmrapSets} />}
      {showNotes && (
        <View className="mt-2">
          <GroupHeader
            name="Notes"
            help={
              <View>
                <LftText>
                  Notes for the exercise. You can also add notes for the whole workout at the bottom of this screen.
                </LftText>
              </View>
            }
          />
          <TextInput
            data-cy="exercise-notes-input"
            placeholder="The exercise went very well..."
            multiline={true}
            maxLength={4095}
            value={props.entry.notes}
            onChangeText={(text) => {
              Progress.editExerciseNotes(props.dispatch, props.progress.id, props.index, text);
            }}
            className={`${inputClassName} h-32`}
          />
        </View>
      )}
    </View>
  );
});

interface IHelpEquipmentProps {
  helps: string[];
  entry: IHistoryEntry;
  progress: IHistoryRecord;
  dispatch: IDispatch;
}

function HelpEquipment(props: IHelpEquipmentProps): JSX.Element {
  return (
    <Nux className="mt-2" id="Rounded Weights" helps={props.helps} dispatch={props.dispatch}>
      <LftText>
        <LftText className="line-through">Crossed out</LftText>
        <LftText> weight means it's </LftText>
        <LftText className="font-bold">rounded</LftText>
        <LftText> to fit your bar and plates. Adjust your </LftText>
        <LinkButton
          name="nux-rounding-equipment-settings"
          onPress={() => {
            updateState(props.dispatch, [
              lb<IState>()
                .p("progress")
                .pi(props.progress.id)
                .pi("ui")
                .p("equipmentModal")
                .record({ exerciseType: props.entry.exercise }),
            ]);
          }}
        >
          Equipment settings there
        </LinkButton>
        .
      </LftText>
    </Nux>
  );
}

function NextSet(props: { nextSet: ISet; settings: ISettings; exerciseType?: IExerciseType }): JSX.Element {
  const nextSet = props.nextSet;
  return (
    <LftText className="pt-2 text-xs text-grayv2-main" data-cy="next-set">
      Next Set:{" "}
      <LftText className="font-bold">
        {nextSet.isAmrap ? "at least " : ""}
        {nextSet.minReps != null ? `${nextSet.minReps}-` : ""}
        {nextSet.reps} reps x {Weight.print(nextSet.weight)}
        {nextSet.rpe != null ? ` @${nextSet.rpe} RPE` : ""}
      </LftText>
    </LftText>
  );
}

function HistoricalSameDay(props: { historyRecordAndEntry: IHistoryRecordAndEntry; settings: ISettings }): JSX.Element {
  const { record, entry } = props.historyRecordAndEntry;
  return (
    <LftText className="text-xs italic">
      <View>
        <LftText>
          Same day last time, <LftText className="font-bold">{DateUtils.format(record.startTime)}</LftText>:
        </LftText>
        <HistoryRecordSetsView sets={entry.sets} isNext={false} settings={props.settings} />
      </View>
    </LftText>
  );
}

function HistoricalLastDay(props: { historyRecordAndEntry: IHistoryRecordAndEntry; settings: ISettings }): JSX.Element {
  const { record, entry } = props.historyRecordAndEntry;
  return (
    <LftText className="text-xs italic">
      <View>
        <LftText>
          Last time, <LftText className="font-bold">{DateUtils.format(record.startTime)}</LftText>:
        </LftText>
        <HistoryRecordSetsView sets={entry.sets} isNext={false} settings={props.settings} />
      </View>
    </LftText>
  );
}

function HistoricalAmrapSets(props: {
  historicalAmrapSets: { max: [ISet, number]; last: [ISet, number] };
}): JSX.Element {
  const { max, last } = props.historicalAmrapSets;
  return (
    <LftText className="mt-2 text-xs italic">
      <View>
        <LftText>
          <LftText className="font-bold">AMRAP Set</LftText>:
        </LftText>
        <LftText>
          Last time you did <LftText className="font-bold">{Weight.display(last[0].weight)}</LftText>/
          <LftText className="font-bold">{last[0].completedReps} reps</LftText> on{" "}
          <LftText className="font-bold">{DateUtils.format(last[1])}</LftText>.
        </LftText>
      </View>
      {max[0].completedReps === last[0].completedReps ? (
        <LftText>It was historical max too.</LftText>
      ) : (
        <LftText>
          Historical max was <LftText className="font-bold">{max[0].completedReps} reps</LftText> on{" "}
          {DateUtils.format(max[1])}.
        </LftText>
      )}
    </LftText>
  );
}

const WeightView = memo(
  (props: { weight: IWeight; exercise: IExerciseType; settings: ISettings }): JSX.Element | null => {
    const { plates, totalWeight: weight } = Weight.calculatePlates(
      props.weight,
      props.settings,
      props.weight.unit,
      props.exercise
    );
    const className = Weight.eq(weight, props.weight) ? "text-grayv2-600" : "text-redv2-600";
    return (
      <>
        <LftText className="px-1">-</LftText>
        <LftText className="break-all">
          <LftText className={className} data-cy="plates-list">
            {plates.length > 0 ? Weight.formatOneSide(props.settings, plates, props.exercise) : "None"}
          </LftText>
        </LftText>
      </>
    );
  }
);

interface IWeightLineProps {
  settings: ISettings;
  entry: IHistoryEntry;
  weight: { rounded: IWeight; original: IWeight };
  nextSet: ISet;
  programExercise?: IProgramExercise;
  dispatch: IDispatch;
}

function WeightLine(props: IWeightLineProps): JSX.Element {
  const { weight: w, nextSet } = props;
  const isCurrent = nextSet != null && Weight.eq(nextSet.weight, w.rounded);
  const isEqual = Weight.eq(w.original, w.rounded);
  const className = isCurrent ? "font-bold" : "";
  return (
    <View className={!isEqual ? "py-1" : ""}>
      {!isEqual && (
        <View className="pl-8">
          <LftText className="text-xs line-through text-grayv2-main">
            {Number(w.original.value?.toFixed(2))} {w.original.unit}
          </LftText>
          <View className="ml-4 bg-grayv2-600" style={{ marginTop: -2, marginBottom: -2, width: 1, height: 4 }} />
        </View>
      )}
      <View className={`${className} flex-row items-start`}>
        <LftText style={{ minWidth: 16 }} className="inline-block mx-2 text-center align-text-bottom">
          {isCurrent && <IconArrowRight className="inline-block" color="#ff8066" />}
        </LftText>
        <TouchableOpacity
          data-cy="change-weight"
          className="text-left whitespace-no-wrap cursor-pointer ls-progress-open-change-weight-modal nm-workout-open-change-weight-modal"
          onPress={() => {
            props.dispatch({
              type: "ChangeWeightAction",
              weight: w.rounded,
              exercise: props.entry.exercise,
              programExercise: props.programExercise,
            });
          }}
        >
          <LftText className="underline text-bluev2">
            {n(w.rounded.value)} {w.rounded.unit}
          </LftText>
        </TouchableOpacity>
        <WeightView weight={w.rounded} exercise={props.entry.exercise} settings={props.settings} />
      </View>
    </View>
  );
}
