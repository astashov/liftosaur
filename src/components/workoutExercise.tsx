import { h, JSX, RefObject } from "preact";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISettings, ISubscription, IHistoryEntry, IWeight, IProgramState } from "../types";
import { updateProgress } from "../models/state";
import { lb } from "lens-shmens";
import { ExerciseImage } from "./exerciseImage";
import { Exercise } from "../models/exercise";
import { History } from "../models/history";
import { IconArrowRight } from "./icons/iconArrowRight";
import { LinkButton } from "./linkButton";
import { ProgramExercise } from "../models/programExercise";
import { Weight } from "../models/weight";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { Markdown } from "./markdown";
import { CollectionUtils } from "../utils/collection";
import { Nux } from "./nux";
import { Equipment } from "../models/equipment";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program } from "../models/program";
import { IconKebab } from "./icons/iconKebab";
import { Subscriptions } from "../utils/subscriptions";
import { Thunk } from "../ducks/thunks";
import { WorkoutExerciseAllSets } from "./workoutExerciseAllSets";
import { WorkoutExerciseUtils } from "../utils/workoutExerciseUtils";
import { useMemo, useState } from "preact/hooks";
import { DropdownMenu, DropdownMenuItem } from "./editProgram/editProgramUi/editProgramUiDropdownMenu";
import { IconNotebook } from "./icons/iconNotebook";
import { IconSwap } from "./icons/iconSwap";
import { IconTrash } from "./icons/iconTrash";
import { IconEdit2 } from "./icons/iconEdit2";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { Collector } from "../utils/collector";
import { Locker } from "./locker";
import { GraphExercise } from "./graphExercise";
import { ExerciseAllTimePRs } from "./exerciseAllTimePRs";
import { ExerciseHistory } from "./exerciseHistory";
import { ProgressStateChanges } from "./progressStateChanges";
import { TextareaAutogrow } from "./textareaAutogrow";
import { Progress } from "../models/progress";

interface IWorkoutExerciseProps {
  day: number;
  otherStates?: IByExercise<IProgramState>;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  history: IHistoryRecord[];
  surfaceRef: RefObject<HTMLElement>;
  progress: IHistoryRecord;
  showHelp?: boolean;
  helps: string[];
  entryIndex: number;
  entry: IHistoryEntry;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
  hidePlatesCalculator?: boolean;
}

export function WorkoutExercise(props: IWorkoutExerciseProps): JSX.Element {
  const programExercise = props.programDay
    ? Program.getProgramExerciseFromDay(props.programDay, props.entry.programExerciseId)
    : undefined;
  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
  const exerciseType = props.entry.exercise;
  const exercise = Exercise.get(exerciseType, props.settings.exercises);
  const currentEquipmentName = Equipment.getEquipmentNameForExerciseType(props.settings, exercise);
  const description = programExercise ? PlannerProgramExercise.currentDescription(programExercise) : undefined;
  const onerm = Exercise.onerm(exercise, props.settings);
  const workoutWeights = CollectionUtils.compatBy(
    props.entry.sets.map((s) => ({ original: s.originalWeight, rounded: s.weight })),
    (w) => w.rounded.value.toString()
  );
  const hasUnequalWeights = workoutWeights.some((w) => !Weight.eq(w.original, w.rounded));
  const nextSet = [...props.entry.warmupSets, ...props.entry.sets].filter((s) => !s.isCompleted)[0];
  const lbSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("sets");
  const lbWarmupSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("warmupSets");
  const programExerciseId = props.entry.programExerciseId;
  const [showNotes, setShowNotes] = useState(!!props.entry.notes);

  const historyCollector = Collector.build(props.history)
    .addFn(History.collectMinAndMaxTime())
    .addFn(History.collectAllUsedExerciseTypes())
    .addFn(History.collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History.collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History.collect1RMPersonalRecord(exerciseType, props.settings));

  const [
    { maxTime: maxX, minTime: minX },
    _exerciseTypes,
    history,
    { maxWeight, maxWeightHistoryRecord },
    { max1RM, max1RMHistoryRecord, max1RMSet },
  ] = useMemo(() => {
    const results = historyCollector.run();
    results[2] = CollectionUtils.sort(results[2], (a, b) => {
      return props.settings.exerciseStatsSettings.ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime;
    });
    return results;
  }, [props.history, exerciseType, props.settings]);
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;

  return (
    <div>
      <section
        className={`py-1 border rounded-xl ${WorkoutExerciseUtils.getBgColor50(
          props.entry.sets
        )} ${WorkoutExerciseUtils.getBorderColor100(props.entry.sets)}`}
      >
        <div className="px-4">
          <header className="flex">
            <div style={{ width: "62px" }}>
              <button className="w-full px-2 nm-workout-exercise-image" style={{ marginLeft: "-0.5rem" }}>
                <ExerciseImage settings={props.settings} className="w-full" exerciseType={exerciseType} size="small" />
              </button>
            </div>
            <div className="flex-1 min-w-0 mt-2 ml-auto">
              <div>
                <button className="text-left nm-workout-exercise-name" data-cy="exercise-name">
                  <span className="pr-1 text-lg font-bold">{Exercise.nameWithEquipment(exercise, props.settings)}</span>{" "}
                  <IconArrowRight style={{ marginBottom: "2px" }} className="inline-block" />
                </button>
              </div>
              <div data-cy="exercise-equipment" className="text-xs text-grayv2-600">
                Equipment:{" "}
                <LinkButton
                  name="exercise-equipment-picker"
                  data-cy="exercise-equipment-picker"
                  onClick={() => {
                    updateProgress(props.dispatch, [
                      lb<IHistoryRecord>().pi("ui").p("equipmentModal").record({ exerciseType: props.entry.exercise }),
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
                      updateProgress(props.dispatch, [
                        lb<IHistoryRecord>().pi("ui").p("rm1Modal").record({ exerciseType: props.entry.exercise }),
                      ]);
                    }}
                  >
                    {Weight.print(onerm)}
                  </LinkButton>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                className="p-2 nm-exercise-options"
                style={{ marginRight: "-0.75rem" }}
                onClick={() => setIsKebabMenuOpen(true)}
              >
                <IconKebab />
              </button>
              {isKebabMenuOpen && (
                <DropdownMenu rightOffset="1.5rem" onClose={() => setIsKebabMenuOpen(false)}>
                  <DropdownMenuItem
                    data-cy="edit-exercise-kebab-add-note"
                    isTop={true}
                    onClick={() => {
                      setShowNotes(!showNotes);
                      setIsKebabMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <IconNotebook size={14} />
                      </div>
                      <div>Add a Note</div>
                    </div>
                  </DropdownMenuItem>
                  {programExercise && programExerciseId && (
                    <DropdownMenuItem
                      data-cy="edit-exercise-kebab-edit-exercise"
                      onClick={() => {
                        setIsKebabMenuOpen(false);
                        updateProgress(props.dispatch, [
                          lb<IHistoryRecord>()
                            .pi("ui")
                            .p("editModal")
                            .record({ programExerciseId, entryIndex: props.entryIndex }),
                        ]);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <IconEdit2 size={18} />
                        </div>
                        <div>Edit Exercise</div>
                      </div>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    data-cy="edit-exercise-kebab-swap-exercise"
                    onClick={() => {
                      setIsKebabMenuOpen(false);
                      updateProgress(props.dispatch, [
                        lb<IHistoryRecord>()
                          .pi("ui")
                          .p("exerciseModal")
                          .record({ exerciseType: props.entry.exercise, entryIndex: props.entryIndex }),
                      ]);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <IconSwap size={14} />
                      </div>
                      <div>Swap Exercise</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-cy="edit-exercise-kebab-remove-exercise"
                    onClick={() => {
                      updateProgress(props.dispatch, [
                        lb<IHistoryRecord>()
                          .p("entries")
                          .recordModify((entries) => {
                            setIsKebabMenuOpen(false);
                            if (confirm("Do you want to remove this exercise in this workout only?")) {
                              return CollectionUtils.removeAt(entries, props.entryIndex);
                            } else {
                              return entries;
                            }
                          }),
                      ]);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <IconTrash width={12} height={16} />
                      </div>
                      <div>Remove Exercise</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenu>
              )}
            </div>
          </header>
          {description && (
            <div className="mt-1">
              <Markdown value={description} />
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
          {!props.hidePlatesCalculator && nextSet && (
            <WorkoutPlatesCalculator
              entry={props.entry}
              weight={nextSet.completedWeight ?? nextSet.weight}
              subscription={props.subscription}
              settings={props.settings}
              dispatch={props.dispatch}
            />
          )}
          {showNotes && (
            <div className="">
              <TextareaAutogrow
                data-cy="exercise-notes-input"
                id="exercise-notes"
                maxLength={4095}
                name="exercise-notes"
                placeholder="Add exercise notes here..."
                value={props.entry.notes}
                onChangeText={(text) => {
                  Progress.editExerciseNotes(props.dispatch, props.entryIndex, text);
                }}
                className="mt-1"
              />
            </div>
          )}
        </div>
        <div className="mt-1">
          <WorkoutExerciseAllSets
            isCurrentProgress={Progress.isCurrent(props.progress)}
            day={props.day}
            programExercise={programExercise}
            entryIndex={props.entryIndex}
            otherStates={props.otherStates}
            lbSets={lbSets}
            lbWarmupSets={lbWarmupSets}
            exerciseType={exerciseType}
            warmupSets={props.entry.warmupSets}
            sets={props.entry.sets}
            settings={props.settings}
            dispatch={props.dispatch}
            subscription={props.subscription}
          />
        </div>
        {programExercise && props.program && (
          <div className="mx-4 mb-1">
            <ProgressStateChanges
              entry={props.entry}
              settings={props.settings}
              dayData={programExercise.dayData}
              programExercise={programExercise}
              program={props.program}
              userPromptedStateVars={props.progress.userPromptedStateVars?.[programExercise.key]}
            />
          </div>
        )}
      </section>
      {history.length > 1 && (
        <div data-cy="workout-stats-graph" className="relative mt-2">
          <Locker topic="Graphs" dispatch={props.dispatch} blur={8} subscription={props.subscription} />
          <GraphExercise
            isSameXAxis={false}
            minX={Math.round(minX / 1000)}
            maxX={Math.round(maxX / 1000)}
            isWithOneRm={true}
            key={Exercise.toKey(exerciseType)}
            settings={props.settings}
            isWithProgramLines={true}
            history={props.history}
            exercise={exerciseType}
            initialType={props.settings.graphsSettings.defaultType}
            dispatch={props.dispatch}
          />
        </div>
      )}
      {showPrs && (
        <div className="mx-4 mt-2">
          <ExerciseAllTimePRs
            maxWeight={maxWeight ? { weight: maxWeight, historyRecord: maxWeightHistoryRecord } : undefined}
            max1RM={max1RM ? { weight: max1RM, historyRecord: max1RMHistoryRecord, set: max1RMSet } : undefined}
            settings={props.settings}
            dispatch={props.dispatch}
          />
        </div>
      )}
      <div className="mx-4 mt-2">
        <ExerciseHistory
          surfaceRef={props.surfaceRef}
          exerciseType={exerciseType}
          settings={props.settings}
          dispatch={props.dispatch}
          history={history}
        />
      </div>
    </div>
  );
}

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
          updateProgress(props.dispatch, [
            lb<IHistoryRecord>().pi("ui").p("equipmentModal").record({ exerciseType: props.entry.exercise }),
          ]);
        }}
      >
        Equipment settings there
      </LinkButton>
      .
    </Nux>
  );
}

interface IWorkoutPlatesCalculatorProps {
  entry: IHistoryEntry;
  weight: IWeight;
  subscription: ISubscription;
  settings: ISettings;
  dispatch: IDispatch;
}

function WorkoutPlatesCalculator(props: IWorkoutPlatesCalculatorProps): JSX.Element {
  const isSubscribed = Subscriptions.hasSubscription(props.subscription);
  const { plates, totalWeight: weight } = Weight.calculatePlates(
    props.weight,
    props.settings,
    props.weight.unit,
    props.entry.exercise
  );
  return (
    <div className="my-1">
      <div
        className={`p-1 inline-block ${WorkoutExerciseUtils.getBgColor100(props.entry.sets)} rounded-lg`}
        style={{
          backgroundImage: "url(/images/icon-barbell.svg)",
          backgroundPosition: "10px center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="py-1 pl-8 pr-4 text-xs text-grayv2-main">
          {isSubscribed ? (
            <span>
              <span>Plates: </span>
              <span className="font-semibold break-all">
                <span
                  className={Weight.eq(weight, props.weight) ? "text-grayv2-600" : "text-redv2-600"}
                  data-cy="plates-list"
                >
                  {plates.length > 0 ? Weight.formatOneSide(props.settings, plates, props.entry.exercise) : "None"}
                </span>
              </span>
            </span>
          ) : (
            <LinkButton
              name="see-plates-for-each-side"
              onClick={() => props.dispatch(Thunk.pushScreen("subscription"))}
            >
              See plates for each side
            </LinkButton>
          )}
        </div>
      </div>
    </div>
  );
}
