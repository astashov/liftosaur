import { h, JSX, Fragment } from "preact";
import { Exercise } from "../models/exercise";
import { History, IHistoryRecordAndEntry } from "../models/history";
import { IDispatch } from "../ducks/types";
import { Weight } from "../models/weight";
import { Reps } from "../models/set";
import { CollectionUtils } from "../utils/collection";
import { ProgressStateChanges } from "./progressStateChanges";
import { memo } from "preact/compat";
import {
  IHistoryEntry,
  ISettings,
  IProgressMode,
  IExerciseType,
  IWeight,
  IHistoryRecord,
  ISet,
  ISubscription,
  IDayData,
} from "../types";
import { DateUtils } from "../utils/date";
import { IState, updateState } from "../models/state";
import { StringUtils } from "../utils/string";
import { IconArrowRight } from "./icons/iconArrowRight";
import { lb } from "lens-shmens";
import { Progress } from "../models/progress";
import { Button } from "./button";
import { useRef, useState } from "preact/hooks";
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
import { ExerciseImage } from "./exerciseImage";
import { UidFactory } from "../utils/generator";
import { Nux } from "./nux";
import { WeightLinesUnsubscribed } from "./weightLinesUnsubscribed";
import { IEvaluatedProgram } from "../models/program";
import { n } from "../utils/math";
import { IconSwap } from "./icons/iconSwap";
import { Equipment } from "../models/equipment";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";

interface IProps {
  showHelp: boolean;
  entry: IHistoryEntry;
  settings: ISettings;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  dayData: IDayData;
  programExercise?: IPlannerProgramExercise;
  program?: IEvaluatedProgram;
  helps: string[];
  index: number;
  showEditButtons: boolean;
  forceShowStateChanges?: boolean;
  subscription: ISubscription;
  hidePlatesCalculator?: boolean;
  dispatch: IDispatch;
  onStartSetChanging?: (
    isWarmup: boolean,
    entryIndex: number,
    setIndex?: number,
    programExercise?: IPlannerProgramExercise,
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

export const ExerciseView = memo(
  (props: IProps): JSX.Element => {
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
      <Fragment>
        <section data-cy={dataCy} className={className}>
          <ExerciseContentView {...props} />
          {props.programExercise && props.program && (
            <ProgressStateChanges
              entry={props.entry}
              forceShow={props.forceShowStateChanges}
              settings={props.settings}
              dayData={props.dayData}
              programExercise={props.programExercise}
              program={props.program}
              userPromptedStateVars={props.progress.userPromptedStateVars?.[props.programExercise.key]}
            />
          )}
        </section>
      </Fragment>
    );
  }
);

const ExerciseContentView = memo(
  (props: IProps): JSX.Element => {
    console.log("Ex props", props.entry);
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
    console.log("Workout weights", workoutWeights);
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

    const programExercise = props.programExercise;
    const description = programExercise ? PlannerProgramExercise.currentDescription(programExercise) : undefined;
    const volume = Reps.volume(props.entry.sets);
    const currentEquipmentName = Equipment.getEquipmentNameForExerciseType(props.settings, exercise);
    const onerm = Exercise.onerm(exercise, props.settings);

    return (
      <div data-cy={`entry-${StringUtils.dashcase(exercise.name)}`}>
        <header className="flex">
          <div style={{ width: "62px" }}>
            <button
              className="w-full px-2 nm-workout-exercise-image"
              style={{ marginLeft: "-0.5rem" }}
              onClick={() => props.onExerciseInfoClick?.(exercise)}
            >
              <ExerciseImage settings={props.settings} className="w-full" exerciseType={exercise} size="small" />
            </button>
          </div>
          <div className="flex-1 min-w-0 ml-auto">
            <div className="flex items-center">
              <div className="flex-1 text-lg font-bold">
                <button
                  className="text-left nm-workout-exercise-name"
                  data-cy="exercise-name"
                  onClick={() => props.onExerciseInfoClick?.(exercise)}
                >
                  <span className="pr-1">{Exercise.nameWithEquipment(exercise, props.settings)}</span>{" "}
                  <IconArrowRight style={{ marginBottom: "2px" }} className="inline-block" />
                </button>
              </div>
              {props.showEditButtons && (
                <div>
                  <button
                    data-cy="exercise-swap"
                    className="box-content p-2 align-middle nm-workout-edit-mode"
                    style={{ width: "18px", height: "18px" }}
                    onClick={() => {
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
                  </button>
                  <button
                    data-cy="exercise-edit-mode"
                    className="box-content p-2 align-middle nm-workout-edit-mode"
                    style={{ width: "18px", height: "18px" }}
                    onClick={() => {
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
                            .record({ programExerciseId: programExercise.key, entryIndex: props.index }),
                        ]);
                      }
                    }}
                  >
                    <IconEditSquare />
                  </button>
                  <button
                    data-cy="exercise-notes-toggle"
                    className="p-2 leading-none align-middle nm-workout-exercise-notes"
                    style={{ marginRight: "-0.5rem" }}
                    onClick={() => setShowNotes(!showNotes)}
                  >
                    <IconNotebook size={18} />
                  </button>
                </div>
              )}
            </div>
            <div data-cy="exercise-equipment" className="text-xs text-grayv2-600">
              Equipment:{" "}
              <LinkButton
                name="exercise-equipment-picker"
                data-cy="exercise-equipment-picker"
                onClick={() => {
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
            </div>
            {programExercise && ProgramExercise.doesUse1RM(programExercise) && (
              <div data-cy="exercise-rm1" className="text-xs text-grayv2-600">
                1RM:{" "}
                <LinkButton
                  name="exercise-rm1-picker"
                  data-cy="exercise-rm1-picker"
                  onClick={() => {
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
              </div>
            )}
            {description && (
              <div className="mt-2">
                <Markdown value={description} />
              </div>
            )}
            {!props.hidePlatesCalculator ? (
              <div
                className={`p-2 mt-2 ${getBgColor200(props.entry)} rounded-2xl`}
                style={{
                  backgroundImage: "url(/images/icon-barbell.svg)",
                  backgroundPosition: "15px 13px",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div className="py-1 pl-8 text-xs text-grayv2-main">
                  {isSubscribed ? (
                    "Plates for each bar side"
                  ) : (
                    <LinkButton
                      name="see-plates-for-each-side"
                      onClick={() => props.dispatch(Thunk.pushScreen("subscription"))}
                    >
                      See plates for each side
                    </LinkButton>
                  )}
                </div>
                {isSubscribed ? (
                  <div className="relative pr-8">
                    {warmupWeights.map((w) => {
                      const isCurrent = nextSet != null && Weight.eq(nextSet.weight, w.rounded);
                      const className = isCurrent ? "font-bold" : "";
                      return (
                        <div className={`${className} flex items-start`}>
                          <span
                            style={{ minWidth: "16px" }}
                            className="inline-block mx-2 text-center align-text-bottom"
                          >
                            {isCurrent && <IconArrowRight className="inline-block" color="#ff8066" />}
                          </span>
                          <span className="text-left whitespace-nowrap text-grayv2-500">
                            {n(w.rounded.value)} {w.rounded.unit}
                          </span>
                          <WeightView weight={w.rounded} exercise={props.entry.exercise} settings={props.settings} />
                        </div>
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
                  </div>
                ) : (
                  <div className="pl-8">
                    <WeightLinesUnsubscribed weights={workoutWeights} />
                  </div>
                )}
                {props.showHelp && hasUnequalWeights && (
                  <HelpEquipment
                    helps={props.helps}
                    entry={props.entry}
                    progress={props.progress}
                    dispatch={props.dispatch}
                  />
                )}
              </div>
            ) : (
              <div className="mt-2">
                <WeightLinesUnsubscribed weights={workoutWeights} />
                <HelpEquipment
                  helps={props.helps}
                  entry={props.entry}
                  progress={props.progress}
                  dispatch={props.dispatch}
                />
              </div>
            )}
            {(!isSubscribed || props.hidePlatesCalculator) && (
              <div className="h-4">
                {nextSet && <NextSet nextSet={nextSet} settings={props.settings} exerciseType={props.entry.exercise} />}
              </div>
            )}
          </div>
        </header>
        <section className="flex flex-wrap py-2 pt-4">
          <ExerciseSets
            isEditMode={isEditModeRef.current}
            dayData={props.dayData}
            warmupSets={props.entry.warmupSets}
            index={props.index}
            progress={props.progress}
            programExercise={props.programExercise}
            otherStates={props.program?.states}
            showHelp={props.showHelp}
            settings={props.settings}
            entry={props.entry}
            onStartSetChanging={props.onStartSetChanging}
            onChangeReps={props.onChangeReps}
            dispatch={props.dispatch}
          />
        </section>
        {!isCurrentProgress && volume.value > 0 && (
          <div className="mb-1 text-xs text-left" style={{ marginTop: "-1rem" }}>
            Volume: <strong>{Weight.print(Weight.roundTo005(volume))}</strong>
          </div>
        )}
        {isEditModeRef.current && (
          <div className="text-center">
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
                      .recordModify((dpe) => (programExercise ? { ...dpe, [programExercise.key]: true } : dpe)),
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
          </div>
        )}
        {showLastDay && historicalLastDay && (
          <HistoricalLastDay historyRecordAndEntry={historicalLastDay} settings={props.settings} />
        )}
        {historicalSameDay && <HistoricalSameDay historyRecordAndEntry={historicalSameDay} settings={props.settings} />}
        {historicalAmrapSets && <HistoricalAmrapSets historicalAmrapSets={historicalAmrapSets} />}
        {showNotes && (
          <div className="mt-2">
            <GroupHeader
              name="Notes"
              help={
                <div>
                  Notes for the exercise. You can also add notes for the whole workout at the bottom of this screen.
                </div>
              }
            />
            <textarea
              data-cy="exercise-notes-input"
              name="exercise-notes"
              placeholder="The exercise went very well..."
              maxLength={4095}
              value={props.entry.notes}
              onInput={(e) => {
                const target = e.target;
                if (target instanceof HTMLTextAreaElement) {
                  Progress.editExerciseNotes(props.dispatch, props.progress.id, props.index, target.value);
                }
              }}
              className={`${inputClassName} h-32`}
            />
          </div>
        )}
      </div>
    );
  }
);

interface IHelpEquipmentProps {
  helps: string[];
  entry: IHistoryEntry;
  progress: IHistoryRecord;
  dispatch: IDispatch;
}

function HelpEquipment(props: IHelpEquipmentProps): JSX.Element {
  return (
    <Nux className="mt-2" id="Rounded Weights" helps={props.helps} dispatch={props.dispatch}>
      <span className="line-through">Crossed out</span> weight means it's <strong>rounded</strong> to fit your bar and
      plates. Adjust your{" "}
      <LinkButton
        name="nux-rounding-equipment-settings"
        onClick={() => {
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
    </Nux>
  );
}

function NextSet(props: { nextSet: ISet; settings: ISettings; exerciseType?: IExerciseType }): JSX.Element {
  const nextSet = props.nextSet;
  return (
    <div className="pt-2 text-xs text-grayv2-main" data-cy="next-set">
      Next Set:{" "}
      <strong>
        {nextSet.isAmrap ? "at least " : ""}
        {nextSet.minReps != null ? `${nextSet.minReps}-` : ""}
        {nextSet.reps} reps x {Weight.print(nextSet.weight)}
        {nextSet.rpe != null ? ` @${nextSet.rpe} RPE` : ""}
      </strong>
    </div>
  );
}

function HistoricalSameDay(props: { historyRecordAndEntry: IHistoryRecordAndEntry; settings: ISettings }): JSX.Element {
  const { record, entry } = props.historyRecordAndEntry;
  return (
    <div className="text-xs italic">
      <div>
        <div>
          Same day last time, <strong>{DateUtils.format(record.startTime)}</strong>:
        </div>
        <div className="flex">
          <div>
            <HistoryRecordSetsView sets={entry.sets} isNext={false} settings={props.settings} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoricalLastDay(props: { historyRecordAndEntry: IHistoryRecordAndEntry; settings: ISettings }): JSX.Element {
  const { record, entry } = props.historyRecordAndEntry;
  return (
    <div className="text-xs italic">
      <div>
        <div>
          Last time, <strong>{DateUtils.format(record.startTime)}</strong>:
        </div>
        <div className="flex">
          <div>
            <HistoryRecordSetsView sets={entry.sets} isNext={false} settings={props.settings} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoricalAmrapSets(props: {
  historicalAmrapSets: { max: [ISet, number]; last: [ISet, number] };
}): JSX.Element {
  const { max, last } = props.historicalAmrapSets;
  return (
    <div className="mt-2 text-xs italic">
      <div>
        <div>
          <strong>AMRAP Set</strong>:
        </div>
        Last time you did <strong>{Weight.display(last[0].weight)}</strong>/
        <strong>{last[0].completedReps} reps</strong> on <strong>{DateUtils.format(last[1])}</strong>.
      </div>
      {max[0].completedReps === last[0].completedReps ? (
        <div>It was historical max too.</div>
      ) : (
        <div>
          Historical max was <strong>{max[0].completedReps} reps</strong> on {DateUtils.format(max[1])}.
        </div>
      )}
    </div>
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
        <span className="px-1">-</span>
        <span className="break-all">
          <span className={className} data-cy="plates-list">
            {plates.length > 0 ? Weight.formatOneSide(props.settings, plates, props.exercise) : "None"}
          </span>
        </span>
      </>
    );
  }
);

interface IWeightLineProps {
  settings: ISettings;
  entry: IHistoryEntry;
  weight: { rounded: IWeight; original: IWeight };
  nextSet: ISet;
  programExercise?: IPlannerProgramExercise;
  dispatch: IDispatch;
}

function WeightLine(props: IWeightLineProps): JSX.Element {
  const { weight: w, nextSet } = props;
  const isCurrent = nextSet != null && Weight.eq(nextSet.weight, w.rounded);
  const isEqual = Weight.eq(w.original, w.rounded);
  const className = isCurrent ? "font-bold" : "";
  return (
    <div className={!isEqual ? "py-1" : ""}>
      {!isEqual && (
        <div className="pl-8">
          <span className="text-xs line-through text-grayv2-main">
            {Number(w.original.value?.toFixed(2))} {w.original.unit}
          </span>
          <div
            className="ml-4 bg-grayv2-600"
            style={{ marginTop: "-2px", marginBottom: "-2px", width: "1px", height: "4px" }}
          />
        </div>
      )}
      <div className={`${className} flex items-start`}>
        <span style={{ minWidth: "16px" }} className="inline-block mx-2 text-center align-text-bottom">
          {isCurrent && <IconArrowRight className="inline-block" color="#ff8066" />}
        </span>
        <button
          data-cy="change-weight"
          className="text-left underline cursor-pointer whitespace-nowrap text-bluev2 ls-progress-open-change-weight-modal nm-workout-open-change-weight-modal"
          style={{ fontWeight: "inherit" }}
          onClick={() => {
            props.dispatch({
              type: "ChangeWeightAction",
              weight: w.rounded,
              exercise: props.entry.exercise,
              programExercise: props.programExercise,
            });
          }}
        >
          {n(w.rounded.value)} {w.rounded.unit}
        </button>
        <WeightView weight={w.rounded} exercise={props.entry.exercise} settings={props.settings} />
      </div>
    </div>
  );
}
