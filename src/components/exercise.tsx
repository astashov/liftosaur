import { h, JSX, Fragment } from "preact";
import { Exercise } from "../models/exercise";
import { History, IHistoricalEntries } from "../models/history";
import { IDispatch } from "../ducks/types";
import { Weight } from "../models/weight";
import { Reps } from "../models/set";
import { CollectionUtils } from "../utils/collection";
import { ProgressStateChanges } from "./progressStateChanges";
import { memo } from "preact/compat";
import { ComparerUtils } from "../utils/comparer";
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
} from "../types";
import { DateUtils } from "../utils/date";
import { IFriendUser, IState, updateState } from "../models/state";
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

interface IProps {
  showHelp: boolean;
  entry: IHistoryEntry;
  settings: ISettings;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  day: number;
  programExercise?: IProgramExercise;
  allProgramExercises?: IProgramExercise[];
  index: number;
  showEditButtons: boolean;
  friend?: IFriendUser;
  forceShowStateChanges?: boolean;
  subscription: ISubscription;
  hidePlatesCalculator?: boolean;
  dispatch: IDispatch;
  onStartSetChanging?: (isWarmup: boolean, entryIndex: number, setIndex?: number) => void;
  onExerciseInfoClick?: (exercise: IExerciseType) => void;
  onChangeReps: (mode: IProgressMode, entry: IHistoryEntry) => void;
}

function getColor(entry: IHistoryEntry): string {
  if (Reps.isFinished(entry.sets)) {
    if (Reps.isCompleted(entry.sets)) {
      return "green";
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
  } else if (color === "red") {
    dataCy = "exercise-finished";
  } else {
    dataCy = "exercise-progress";
  }

  return (
    <Fragment>
      <section data-cy={dataCy} className={className}>
        <ExerciseContentView {...props} />
        {props.programExercise && props.allProgramExercises && (
          <ProgressStateChanges
            entry={props.entry}
            forceShow={props.forceShowStateChanges}
            settings={props.settings}
            day={props.day}
            state={ProgramExercise.getState(props.programExercise, props.allProgramExercises)}
            userPromptedStateVars={props.progress.userPromptedStateVars?.[props.programExercise.id]}
            script={ProgramExercise.getFinishDayScript(props.programExercise, props.allProgramExercises)}
          />
        )}
      </section>
    </Fragment>
  );
}, ComparerUtils.noFns);

const ExerciseContentView = memo(
  (props: IProps): JSX.Element => {
    const isCurrentProgress = Progress.isCurrent(props.progress);
    const friend = props.friend;
    const exercise = Exercise.get(props.entry.exercise, props.settings.exercises);
    const nextSet = [...props.entry.warmupSets, ...props.entry.sets].filter((s) => s.completedReps == null)[0];
    const equipment = exercise.equipment;
    const historicalAmrapSets = isCurrentProgress
      ? History.getHistoricalAmrapSets(props.history, props.entry, nextSet)
      : undefined;
    const historicalSameEntry = isCurrentProgress
      ? History.getHistoricalSameEntry(props.history, props.entry)
      : undefined;
    const workoutWeights = CollectionUtils.compatBy(
      props.entry.sets.map((s) => Weight.roundConvertTo(s.weight, props.settings, equipment)),
      (w) => w.value.toString()
    );
    workoutWeights.sort(Weight.compare);
    const warmupSets = props.entry.warmupSets;
    const warmupWeights = CollectionUtils.compatBy(
      props.entry.warmupSets.map((s) => Weight.roundConvertTo(s.weight, props.settings, equipment)),
      (w) => w.value.toString()
    ).filter((w) => Object.keys(Weight.calculatePlates(w, props.settings, equipment).plates).length > 0);
    warmupWeights.sort(Weight.compare);
    const isEditModeRef = useRef(false);
    isEditModeRef.current = props.progress.ui?.entryIndexEditMode === props.index;
    const isSubscribed = Subscriptions.hasSubscription(props.subscription);

    const [showNotes, setShowNotes] = useState(!!props.entry.notes);
    const programExercise = props.programExercise;

    return (
      <div data-cy={`entry-${StringUtils.dashcase(exercise.name)}`}>
        <header className="flex">
          <div style={{ width: "62px" }}>
            <button
              className="px-2"
              style={{ marginLeft: "-0.5rem" }}
              onClick={() => props.onExerciseInfoClick?.(exercise)}
            >
              {equipment && (
                <img
                  src={`https://www.liftosaur.com/externalimages/exercises/single/small/${exercise.id.toLowerCase()}_${equipment.toLowerCase()}_single_small.png`}
                  alt={`${exercise.name} image`}
                />
              )}
            </button>
          </div>
          <div className="flex-1 ml-auto">
            <div className="flex items-center">
              <div className="flex-1 text-lg font-bold">
                <button data-cy="exercise-name" onClick={() => props.onExerciseInfoClick?.(exercise)}>
                  <span className="pr-1">{exercise.name}</span>{" "}
                  <IconArrowRight style={{ marginBottom: "2px" }} className="inline-block" />
                </button>
              </div>
              {props.showEditButtons && (
                <div>
                  {programExercise && (
                    <button
                      data-cy="exercise-edit-mode"
                      className="box-content p-2 align-middle"
                      style={{ width: "18px", height: "18px" }}
                      onClick={() => {
                        updateState(props.dispatch, [
                          lb<IState>()
                            .p("progress")
                            .pi(props.progress.id)
                            .pi("ui")
                            .p("editModal")
                            .record({ programExercise, entryIndex: props.index }),
                        ]);
                      }}
                    >
                      <IconEditSquare />
                    </button>
                  )}
                  <button
                    data-cy="exercise-notes-toggle"
                    className="p-2 leading-none align-middle"
                    style={{ marginRight: "-0.5rem" }}
                    onClick={() => setShowNotes(!showNotes)}
                  >
                    <IconNotebook size={18} />
                  </button>
                </div>
              )}
            </div>
            {equipment && <div className="text-sm text-grayv2-600">{StringUtils.capitalize(equipment)}</div>}
            {!props.hidePlatesCalculator && (
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
                    <LinkButton onClick={() => props.dispatch(Thunk.pushScreen("subscription"))}>
                      See plates for each side
                    </LinkButton>
                  )}
                </div>
                {isSubscribed && (
                  <div className="relative pr-8">
                    {warmupWeights.map((w) => {
                      const isCurrent =
                        nextSet != null &&
                        Weight.eq(
                          Weight.roundConvertTo(nextSet.weight, props.settings, props.entry.exercise.equipment),
                          w
                        );
                      const className = isCurrent ? "font-bold" : "";
                      return (
                        <div className={`${className} flex items-start`}>
                          <span
                            style={{ minWidth: "16px" }}
                            className="inline-block mx-2 text-center align-text-bottom"
                          >
                            {isCurrent && <IconArrowRight className="inline-block" color="#ff8066" />}
                          </span>
                          <span className="text-left whitespace-no-wrap text-grayv2-500">
                            {w.value} {w.unit}
                          </span>
                          <WeightView weight={w} exercise={props.entry.exercise} settings={props.settings} />
                        </div>
                      );
                    })}
                    {workoutWeights.map((w, i) => {
                      const isCurrent =
                        nextSet != null &&
                        Weight.eq(
                          Weight.roundConvertTo(nextSet.weight, props.settings, props.entry.exercise.equipment),
                          w
                        );
                      const className = isCurrent ? "font-bold" : "";
                      return (
                        <div className={`${className} flex items-start`}>
                          <span
                            style={{ minWidth: "16px" }}
                            className="inline-block mx-2 text-center align-text-bottom"
                          >
                            {isCurrent && <IconArrowRight className="inline-block" color="#ff8066" />}
                          </span>
                          <button
                            data-help-id={
                              props.showHelp && props.index === 0 && i === 0 ? "progress-change-weight" : undefined
                            }
                            data-help="Press here to change weight of the sets. Weights are rounded according to available plates, so make sure you updated them in Settings"
                            data-help-offset-x={-80}
                            data-help-width={140}
                            data-cy="change-weight"
                            className="text-left underline whitespace-no-wrap cursor-pointer text-bluev2 ls-progress-open-change-weight-modal"
                            style={{ fontWeight: "inherit" }}
                            onClick={() => {
                              if (!friend) {
                                props.dispatch({
                                  type: "ChangeWeightAction",
                                  weight: w,
                                  exercise: props.entry.exercise,
                                  programExercise: props.programExercise,
                                });
                              }
                            }}
                          >
                            {w.value} {w.unit}
                          </button>
                          <WeightView weight={w} exercise={props.entry.exercise} settings={props.settings} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {nextSet && (!isSubscribed || props.hidePlatesCalculator) && <NextSet nextSet={nextSet} />}
          </div>
        </header>
        <section className="flex flex-wrap py-2 pt-4">
          <ExerciseSets
            isEditMode={isEditModeRef.current}
            warmupSets={warmupSets}
            index={props.index}
            progress={props.progress}
            programExercise={props.programExercise}
            allProgramExercises={props.allProgramExercises}
            showHelp={props.showHelp}
            settings={props.settings}
            entry={props.entry}
            friend={friend}
            onStartSetChanging={props.onStartSetChanging}
            onChangeReps={props.onChangeReps}
            dispatch={props.dispatch}
          />
        </section>
        {isEditModeRef.current && (
          <div className="text-center">
            <Button
              data-cy="done-edit-exercise"
              kind="orange"
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
        {historicalSameEntry && <HistoricalSameEntry historicalEntries={historicalSameEntry} />}
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

function NextSet(props: { nextSet: ISet }): JSX.Element {
  const nextSet = props.nextSet;
  return (
    <div className="pt-2 text-xs text-grayv2-main">
      Next Set:{" "}
      <strong>
        {nextSet.isAmrap ? "at least " : ""}
        {nextSet.reps} reps x {Weight.print(nextSet.weight)}
      </strong>
    </div>
  );
}

function HistoricalSameEntry(props: { historicalEntries: IHistoricalEntries }): JSX.Element {
  const { max, last } = props.historicalEntries;
  const isDiffMax = History.totalEntryReps(max.entry) > History.totalEntryReps(last.entry);
  return (
    <div className="text-xs italic">
      <div>
        <div>Last similar entry you did:</div>
        <HistoricalReps sets={last.entry.sets} />{" "}
        <span>
          on <strong>{DateUtils.format(last.time)}</strong>.
        </span>
      </div>
      {isDiffMax ? (
        <div>
          <div>Max similar entry you did:</div>
          <HistoricalReps sets={max.entry.sets} />{" "}
          <span>
            on <strong>{DateUtils.format(max.time)}</strong>.
          </span>
        </div>
      ) : (
        "It was your max too."
      )}
    </div>
  );
}

function HistoricalReps(props: { sets: ISet[] }): JSX.Element {
  return (
    <Fragment>
      {props.sets.map((set, i) => (
        <Fragment>
          {i !== 0 && <span className="text-grayv2-600">/</span>}
          <span className={(set.completedReps || 0) >= set.reps ? `text-greenv2-600` : `text-redv2-600`}>
            {set.completedReps || 0}
          </span>
        </Fragment>
      ))}
    </Fragment>
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
      props.exercise.equipment
    );
    const className = Weight.eq(weight, props.weight) ? "text-grayv2-600" : "text-redv2-600";
    return (
      <>
        <span className="px-1">-</span>
        <span className="break-all">
          <span className={className}>
            {plates.length > 0 ? Weight.formatOneSide(plates, props.exercise.equipment) : "None"}
          </span>
        </span>
      </>
    );
  }
);
