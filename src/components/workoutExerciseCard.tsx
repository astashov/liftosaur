import { h, JSX, Fragment } from "preact";
import { IHistoryEntry, IHistoryRecord, IProgramState, ISettings, IStats, ISubscription, IWeight } from "../types";
import { IState, updateProgress, updateSettings, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { ExerciseImage } from "./exerciseImage";
import {
  Exercise_get,
  Exercise_getNotes,
  Exercise_onerm,
  Exercise_nameWithEquipment,
  Exercise_fullName,
} from "../models/exercise";
import { IconArrowRight } from "./icons/iconArrowRight";
import { LinkButton } from "./linkButton";
import { ProgramExercise_doesUse1RM } from "../models/programExercise";
import {
  Weight_eqNull,
  Weight_print,
  Weight_build,
  Weight_calculatePlates,
  Weight_eq,
  Weight_formatOneSide,
} from "../models/weight";
import { Markdown } from "./markdown";
import { CollectionUtils_removeAt } from "../utils/collection";
import { IconKebab } from "./icons/iconKebab";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { Thunk_pushExerciseStatsScreen, Thunk_pushToEditProgramExercise, Thunk_pushScreen } from "../ducks/thunks";
import { WorkoutExerciseAllSets } from "./workoutExerciseAllSets";
import {
  WorkoutExerciseUtils_getBgColor50,
  WorkoutExerciseUtils_getBorderColor100,
  WorkoutExerciseUtils_getBgColor100,
} from "../utils/workoutExerciseUtils";
import { DropdownMenu, DropdownMenuItem } from "./dropdownMenu";
import { IconSwap } from "./icons/iconSwap";
import { IconTrash } from "./icons/iconTrash";
import { IconEdit2 } from "./icons/iconEdit2";
import { TextareaAutogrow } from "./textareaAutogrow";
import {
  Progress_getNextSupersetEntry,
  Progress_doesUse1RM,
  Progress_editExerciseNotes,
  Progress_isCurrent,
} from "../models/progress";
import { StringUtils_dashcase } from "../utils/string";
import { GroupHeader } from "./groupHeader";
import { Settings_getNextTargetType } from "../models/settings";
import { History_collectLastEntry, History_collectLastNote } from "../models/history";
import { DateUtils_format } from "../utils/date";
import { IDispatch } from "../ducks/types";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program_getProgramExerciseForKeyAndDay } from "../models/program";
import {
  Equipment_getEquipmentNameForExerciseType,
  Equipment_getEquipmentDataForExerciseType,
} from "../models/equipment";
import { PlannerProgramExercise_currentDescription } from "../pages/planner/models/plannerProgramExercise";
import { useMemo, useState } from "preact/hooks";
import { Collector } from "../utils/collector";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { Nux } from "./nux";
import { IconReorder } from "./icons/iconReorder";

interface IWorkoutExerciseCardProps {
  entry: IHistoryEntry;
  entryIndex: number;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  day: number;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  subscription: ISubscription;
  hidePlatesCalculator?: boolean;
  showHelp?: boolean;
  helps: string[];
  otherStates?: IByExercise<IProgramState>;
}

export function WorkoutExerciseCard(props: IWorkoutExerciseCardProps): JSX.Element {
  const programExercise =
    props.program && props.entry.programExerciseId
      ? Program_getProgramExerciseForKeyAndDay(props.program, props.day, props.entry.programExerciseId)
      : undefined;
  const exerciseType = props.entry.exercise;
  const exercise = Exercise_get(exerciseType, props.settings.exercises);
  const currentEquipmentName = Equipment_getEquipmentNameForExerciseType(props.settings, exercise);
  const currentEquipmentNotes = Equipment_getEquipmentDataForExerciseType(props.settings, exercise)?.notes;
  const exerciseNotes = Exercise_getNotes(exerciseType, props.settings);
  const description = programExercise ? PlannerProgramExercise_currentDescription(programExercise) : undefined;
  const onerm = Exercise_onerm(exercise, props.settings);
  const hasUnequalWeights = props.entry.sets.some((w) => !Weight_eqNull(w.originalWeight, w.weight));
  const nextSet = [...props.entry.warmupSets, ...props.entry.sets].filter((s) => !s.isCompleted)[0];
  const lbSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("sets");
  const lbWarmupSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("warmupSets");
  const programExerciseId = props.entry.programExerciseId;

  const historyCollector = Collector.build(props.history)
    .addFn(History_collectLastEntry(props.progress.startTime, exerciseType))
    .addFn(History_collectLastNote(props.progress.startTime, exerciseType));

  const [{ lastHistoryEntry }, { lastNote, timestamp }] = useMemo(
    () => historyCollector.run(),
    [props.history, exerciseType, props.settings]
  );

  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
  const supersetEntry = Progress_getNextSupersetEntry(props.progress.entries, props.entry);
  const supersetExercise = supersetEntry ? Exercise_get(supersetEntry.exercise, props.settings.exercises) : undefined;

  return (
    <section
      data-cy={`entry-${StringUtils_dashcase(exercise.name)}`}
      className={`py-1 border rounded-xl ${WorkoutExerciseUtils_getBgColor50(
        props.entry.sets,
        false
      )} ${WorkoutExerciseUtils_getBorderColor100(props.entry.sets, false)}`}
    >
      <div className="px-4">
        <header className="flex">
          <div className="w-16">
            <button
              onClick={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
              className="w-full h-full px-2 rounded-lg bg-background-image nm-workout-exercise-image"
              style={{ marginLeft: "-0.5rem" }}
            >
              <ExerciseImage settings={props.settings} className="w-full" exerciseType={exerciseType} size="small" />
            </button>
          </div>
          <div className="flex-1 min-w-0 mt-2 ml-auto">
            <div>
              <button
                className="text-left nm-workout-exercise-name"
                data-cy="exercise-name"
                onClick={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
              >
                <span className="pr-1 text-lg font-bold">{Exercise_nameWithEquipment(exercise, props.settings)}</span>{" "}
                <IconArrowRight style={{ marginBottom: "2px" }} className="inline-block" />
              </button>
            </div>
            <div data-cy="exercise-equipment" className="text-sm text-text-secondary">
              Equipment:{" "}
              <LinkButton
                name="exercise-equipment-picker"
                data-cy="exercise-equipment-picker"
                onClick={() => {
                  updateProgress(
                    props.dispatch,
                    [lb<IHistoryRecord>().pi("ui").p("equipmentModal").record({ exerciseType: props.entry.exercise })],
                    "change-equipment"
                  );
                }}
              >
                {currentEquipmentName || "None"}
              </LinkButton>
            </div>
            {supersetExercise && (
              <div data-cy="exercise-superset" className="text-sm text-text-secondary">
                Supersets with:{" "}
                <LinkButton
                  name="exercise-superset-picker"
                  data-cy="exercise-superset-picker"
                  onClick={() => {
                    updateProgress(
                      props.dispatch,
                      [lb<IHistoryRecord>().pi("ui").p("showSupersetPicker").record(props.entry)],
                      "change-superset"
                    );
                  }}
                >
                  {Exercise_fullName(supersetExercise, props.settings)}
                </LinkButton>
              </div>
            )}
            {currentEquipmentNotes && (
              <div className="text-xs">
                <Markdown value={currentEquipmentNotes} />
              </div>
            )}
            {((programExercise && ProgramExercise_doesUse1RM(programExercise)) || Progress_doesUse1RM(props.entry)) && (
              <div data-cy="exercise-rm1" className="text-sm text-text-secondary">
                1RM:{" "}
                <LinkButton
                  name="exercise-rm1-picker"
                  data-cy="exercise-rm1-picker"
                  onClick={() => {
                    updateProgress(
                      props.dispatch,
                      [lb<IHistoryRecord>().pi("ui").p("rm1Modal").record({ exerciseType: props.entry.exercise })],
                      "change-rm1"
                    );
                  }}
                >
                  {Weight_print(onerm)}
                </LinkButton>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              data-cy="exercise-options"
              className="px-4 py-2 nm-exercise-options"
              style={{ marginRight: "-0.75rem" }}
              onClick={() => setIsKebabMenuOpen(true)}
            >
              <IconKebab />
            </button>
            {isKebabMenuOpen && (
              <DropdownMenu rightOffset="2rem" onClose={() => setIsKebabMenuOpen(false)} maxWidth="20rem">
                {programExercise && programExerciseId && (
                  <DropdownMenuItem
                    isTop={true}
                    data-cy="exercise-edit-mode"
                    onClick={() => {
                      setIsKebabMenuOpen(false);
                      props.dispatch(Thunk_pushToEditProgramExercise(programExercise.key, programExercise.dayData));
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <IconEdit2 size={22} />
                      </div>
                      <div>Edit Program Exercise</div>
                    </div>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  data-cy="exercise-swap"
                  isTop={!programExercise || !programExerciseId}
                  onClick={() => {
                    setIsKebabMenuOpen(false);
                    updateProgress(
                      props.dispatch,
                      [
                        lb<IHistoryRecord>()
                          .pi("ui")
                          .p("exercisePicker")
                          .record({
                            state: {
                              mode: "workout",
                              screenStack: ["exercisePicker"],
                              sort: props.settings.workoutSettings.pickerSort ?? "name_asc",
                              filters: {},
                              selectedExercises: [],
                              entryIndex: props.entryIndex,
                              exerciseType: props.entry.exercise,
                            },
                          }),
                      ],
                      "kebab-swap-exercise"
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <IconSwap size={18} />
                    </div>
                    <div>Swap Exercise</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="exercise-superset"
                  onClick={() => {
                    setIsKebabMenuOpen(false);
                    updateProgress(
                      props.dispatch,
                      [lb<IHistoryRecord>().pi("ui").p("showSupersetPicker").record(props.entry)],
                      "kebab-edit-superset"
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <IconReorder size={18} />
                    </div>
                    <div>Edit Superset</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="edit-exercise-kebab-remove-exercise"
                  onClick={() => {
                    updateProgress(
                      props.dispatch,
                      [
                        lb<IHistoryRecord>()
                          .p("entries")
                          .recordModify((entries) => {
                            setIsKebabMenuOpen(false);
                            if (confirm("Do you want to remove this exercise in this workout only?")) {
                              const entryIdToDelete = props.entry.id;
                              const newEntries = CollectionUtils_removeAt(entries, props.entryIndex);
                              for (const entry of newEntries) {
                                if (entry.superset && entry.superset === entryIdToDelete) {
                                  entry.superset = undefined;
                                }
                              }
                              return newEntries;
                            } else {
                              return entries;
                            }
                          }),
                        lb<IHistoryRecord>()
                          .pi("ui")
                          .p("currentEntryIndex")
                          .recordModify((index) => {
                            return Math.max(0, (index ?? 0) - 1);
                          }),
                      ],
                      "kebab-delete-exercise"
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <IconTrash width={15} height={18} />
                    </div>
                    <div>Remove Exercise</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenu>
            )}
          </div>
        </header>
        {exerciseNotes && (
          <div className="mt-1 text-sm">
            {exerciseNotes && description && <GroupHeader name="Exercise Notes" />}
            <Markdown value={exerciseNotes} />
          </div>
        )}
        {description && (
          <div className="mt-1 text-sm">
            {exerciseNotes && description && <GroupHeader name="Program Exercise Description" />}
            <Markdown value={description} />
          </div>
        )}
        {lastNote && timestamp && (
          <div>
            <GroupHeader name={`Previous Note (from ${DateUtils_format(timestamp)})`} />
            <div className="pl-1 mb-1 text-sm border-purplev3-300" style={{ borderWidth: "0 0 0 4px" }}>
              {lastNote}
            </div>
          </div>
        )}
        <div className="">
          <TextareaAutogrow
            debounceMs={1000}
            data-cy="exercise-notes-input"
            id="exercise-notes"
            maxLength={4095}
            name="exercise-notes"
            placeholder="Add workout notes for this exercise here..."
            value={props.entry.notes}
            onChangeText={(text) => {
              Progress_editExerciseNotes(props.dispatch, props.entryIndex, text);
            }}
            className="mt-1"
          />
        </div>
      </div>
      {!props.hidePlatesCalculator &&
        nextSet &&
        currentEquipmentName &&
        (nextSet.completedWeight || nextSet.weight) && (
          <div className="mx-4">
            <WorkoutPlatesCalculator
              entry={props.entry}
              weight={nextSet.completedWeight ?? nextSet.weight ?? Weight_build(0, props.settings.units)}
              subscription={props.subscription}
              settings={props.settings}
              dispatch={props.dispatch}
            />
          </div>
        )}
      {props.showHelp && <HelpTarget helps={props.helps} dispatch={props.dispatch} />}
      {props.showHelp && hasUnequalWeights && (
        <HelpEquipment helps={props.helps} entry={props.entry} progress={props.progress} dispatch={props.dispatch} />
      )}
      <div className="mt-1">
        <WorkoutExerciseAllSets
          stats={props.stats}
          isPlayground={false}
          helps={props.helps}
          progress={props.progress}
          onStopShowingHint={() => {
            if (!props.helps.includes("swipeable-set")) {
              updateState(
                props.dispatch,
                [
                  lb<IState>()
                    .p("storage")
                    .p("helps")
                    .recordModify((helps) => Array.from(new Set([...helps, "swipeable-set"]))),
                ],
                "Stop showing swipe hint"
              );
            }
          }}
          isCurrentProgress={Progress_isCurrent(props.progress)}
          day={props.day}
          program={props.program}
          userPromptedStateVars={
            programExercise ? props.progress.userPromptedStateVars?.[programExercise.key] : undefined
          }
          programExercise={programExercise}
          entryIndex={props.entryIndex}
          onTargetClick={() => {
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("workoutSettings")
                .p("targetType")
                .recordModify((type) => {
                  return Settings_getNextTargetType(
                    type,
                    !Subscriptions_hasSubscription(props.subscription) || !currentEquipmentName
                  );
                }),
              "Change target type"
            );
          }}
          otherStates={props.otherStates}
          lastSets={lastHistoryEntry?.sets}
          lbSets={lbSets}
          lbWarmupSets={lbWarmupSets}
          exerciseType={exerciseType}
          entry={props.entry}
          settings={props.settings}
          dispatch={props.dispatch}
          subscription={props.subscription}
        />
      </div>
    </section>
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
    <Nux className="my-2" id="Rounded Weights" helps={props.helps} dispatch={props.dispatch}>
      <>
        <span>
          <span className="line-through">Crossed out</span> weight means it's <strong>rounded</strong> to fit your bar
          and plates. Adjust your{" "}
          <LinkButton
            name="nux-rounding-equipment-settings"
            onClick={() => {
              updateProgress(
                props.dispatch,
                [lb<IHistoryRecord>().pi("ui").p("equipmentModal").record({ exerciseType: props.entry.exercise })],
                "nux-rounding-equipment-settings"
              );
            }}
          >
            Equipment settings there
          </LinkButton>
          .
        </span>
        <div className="mt-2">
          Percentage weight (like <strong>75%</strong>) means it's 75% of 1 Rep Max (1RM). You can adjust 1RM above.
        </div>
      </>
    </Nux>
  );
}

function HelpTarget(props: { helps: string[]; dispatch: IDispatch }): JSX.Element {
  return (
    <Nux className="my-2" id="Set Target" helps={props.helps} dispatch={props.dispatch}>
      <span className="font-semibold">Target</span> column shows the prescribed set from a program. The set is
      considered successful if you complete required reps and weight.
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
  const isSubscribed = Subscriptions_hasSubscription(props.subscription);
  const { plates, totalWeight: weight } = Weight_calculatePlates(
    props.weight,
    props.settings,
    props.weight.unit,
    props.entry.exercise
  );
  return (
    <div className="my-1">
      <div
        className={`p-1 inline-block ${WorkoutExerciseUtils_getBgColor100(props.entry.sets, false)} rounded-lg`}
        style={{
          backgroundImage: "url(/images/icon-barbell.svg)",
          backgroundPosition: "10px center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="py-1 pl-8 pr-4 text-xs text-text-secondary">
          {isSubscribed ? (
            <span>
              <span>Plates: </span>
              <span className="font-semibold break-all">
                <span
                  className={Weight_eq(weight, props.weight) ? "text-text-primary" : "text-text-error"}
                  data-cy="plates-list"
                >
                  {plates.length > 0 ? Weight_formatOneSide(props.settings, plates, props.entry.exercise) : "None"}
                </span>
              </span>
            </span>
          ) : (
            <LinkButton
              name="see-plates-for-each-side"
              onClick={() => props.dispatch(Thunk_pushScreen("subscription"))}
            >
              See plates for each side
            </LinkButton>
          )}
        </div>
      </div>
    </div>
  );
}
