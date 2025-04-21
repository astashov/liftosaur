import { h, JSX, Fragment } from "preact";
import { IHistoryEntry, IHistoryRecord, IProgramState, ISettings, ISubscription, IWeight } from "../types";
import { IState, updateProgress, updateSettings, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { ExerciseImage } from "./exerciseImage";
import { Exercise } from "../models/exercise";
import { IconArrowRight } from "./icons/iconArrowRight";
import { LinkButton } from "./linkButton";
import { ProgramExercise } from "../models/programExercise";
import { Weight } from "../models/weight";
import { Markdown } from "./markdown";
import { CollectionUtils } from "../utils/collection";
import { IconKebab } from "./icons/iconKebab";
import { Subscriptions } from "../utils/subscriptions";
import { Thunk } from "../ducks/thunks";
import { WorkoutExerciseAllSets } from "./workoutExerciseAllSets";
import { WorkoutExerciseUtils } from "../utils/workoutExerciseUtils";
import { DropdownMenu, DropdownMenuItem } from "./editProgram/editProgramUi/editProgramUiDropdownMenu";
import { IconSwap } from "./icons/iconSwap";
import { IconTrash } from "./icons/iconTrash";
import { IconEdit2 } from "./icons/iconEdit2";
import { TextareaAutogrow } from "./textareaAutogrow";
import { Progress } from "../models/progress";
import { StringUtils } from "../utils/string";
import { GroupHeader } from "./groupHeader";
import { Settings } from "../models/settings";
import { History } from "../models/history";
import { DateUtils } from "../utils/date";
import { IDispatch } from "../ducks/types";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program } from "../models/program";
import { Equipment } from "../models/equipment";
import { PlannerProgramExercise } from "../pages/planner/models/plannerProgramExercise";
import { useMemo, useState } from "preact/hooks";
import { Collector } from "../utils/collector";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { Nux } from "./nux";

interface IWorkoutExerciseCardProps {
  entry: IHistoryEntry;
  entryIndex: number;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  day: number;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
  subscription: ISubscription;
  hidePlatesCalculator?: boolean;
  showHelp?: boolean;
  helps: string[];
  otherStates?: IByExercise<IProgramState>;
}

export function WorkoutExerciseCard(props: IWorkoutExerciseCardProps): JSX.Element {
  const programExercise = props.programDay
    ? Program.getProgramExerciseFromDay(props.programDay, props.entry.programExerciseId)
    : undefined;
  const exerciseType = props.entry.exercise;
  const exercise = Exercise.get(exerciseType, props.settings.exercises);
  const currentEquipmentName = Equipment.getEquipmentNameForExerciseType(props.settings, exercise);
  const description = programExercise ? PlannerProgramExercise.currentDescription(programExercise) : undefined;
  const onerm = Exercise.onerm(exercise, props.settings);
  const hasUnequalWeights = props.entry.sets.some((w) => !Weight.eqNull(w.originalWeight, w.weight));
  const nextSet = [...props.entry.warmupSets, ...props.entry.sets].filter((s) => !s.isCompleted)[0];
  const lbSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("sets");
  const lbWarmupSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("warmupSets");
  const programExerciseId = props.entry.programExerciseId;

  const historyCollector = Collector.build(props.history)
    .addFn(History.collectLastEntry(props.progress.startTime, exerciseType))
    .addFn(History.collectLastNote(props.progress.startTime, exerciseType));

  const [{ lastHistoryEntry }, { lastNote, timestamp }] = useMemo(
    () => historyCollector.run(),
    [props.history, exerciseType, props.settings]
  );

  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);

  return (
    <section
      data-cy={`entry-${StringUtils.dashcase(exercise.name)}`}
      className={`py-1 border rounded-xl ${WorkoutExerciseUtils.getBgColor50(
        props.entry.sets,
        false
      )} ${WorkoutExerciseUtils.getBorderColor100(props.entry.sets, false)}`}
    >
      <div className="px-4">
        <header className="flex">
          <div className="w-16">
            <button className="w-full px-2 nm-workout-exercise-image" style={{ marginLeft: "-0.5rem" }}>
              <ExerciseImage settings={props.settings} className="w-full" exerciseType={exerciseType} size="small" />
            </button>
          </div>
          <div className="flex-1 min-w-0 mt-2 ml-auto">
            <div>
              <button
                className="text-left nm-workout-exercise-name"
                data-cy="exercise-name"
                onClick={() => props.dispatch(Thunk.pushExerciseStatsScreen(props.entry.exercise))}
              >
                <span className="pr-1 text-lg font-bold">{Exercise.nameWithEquipment(exercise, props.settings)}</span>{" "}
                <IconArrowRight style={{ marginBottom: "2px" }} className="inline-block" />
              </button>
            </div>
            <div data-cy="exercise-equipment" className="text-sm text-grayv2-600">
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
            {programExercise && ProgramExercise.doesUse1RM(programExercise) && (
              <div data-cy="exercise-rm1" className="text-sm text-grayv2-600">
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
                  {Weight.print(onerm)}
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
              <DropdownMenu rightOffset="2rem" onClose={() => setIsKebabMenuOpen(false)}>
                {programExercise && programExerciseId && (
                  <DropdownMenuItem
                    isTop={true}
                    data-cy="exercise-edit-mode"
                    onClick={() => {
                      setIsKebabMenuOpen(false);
                      updateProgress(
                        props.dispatch,
                        [
                          lb<IHistoryRecord>()
                            .pi("ui")
                            .p("editModal")
                            .record({ programExerciseId, entryIndex: props.entryIndex }),
                        ],
                        "kebab-edit-exercise"
                      );
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <IconEdit2 size={22} />
                      </div>
                      <div>Edit Exercise</div>
                    </div>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  data-cy="exercise-swap"
                  onClick={() => {
                    setIsKebabMenuOpen(false);
                    updateProgress(
                      props.dispatch,
                      [
                        lb<IHistoryRecord>()
                          .pi("ui")
                          .p("exerciseModal")
                          .record({ exerciseType: props.entry.exercise, entryIndex: props.entryIndex }),
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
                              return CollectionUtils.removeAt(entries, props.entryIndex);
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
        {description && (
          <div className="mt-1 text-sm">
            <Markdown value={description} />
          </div>
        )}
        {lastNote && timestamp && (
          <div>
            <GroupHeader name={`Previous Note (from ${DateUtils.format(timestamp)})`} />
            <div className="pl-1 mb-1 text-sm border-purplev3-300" style={{ borderWidth: "0 0 0 4px" }}>
              {lastNote}
            </div>
          </div>
        )}
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
      </div>
      {!props.hidePlatesCalculator &&
        nextSet &&
        currentEquipmentName &&
        (nextSet.completedWeight || nextSet.weight) && (
          <div className="mx-4">
            <WorkoutPlatesCalculator
              entry={props.entry}
              weight={nextSet.completedWeight ?? nextSet.weight ?? Weight.build(0, props.settings.units)}
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
          helps={props.helps}
          onStopShowingHint={() => {
            if (!props.helps.includes("swipeable-set")) {
              updateState(props.dispatch, [
                lb<IState>()
                  .p("storage")
                  .p("helps")
                  .recordModify((helps) => Array.from(new Set([...helps, "swipeable-set"]))),
              ]);
            }
          }}
          isCurrentProgress={Progress.isCurrent(props.progress)}
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
                  return Settings.getNextTargetType(
                    type,
                    !Subscriptions.hasSubscription(props.subscription) || !currentEquipmentName
                  );
                })
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
        className={`p-1 inline-block ${WorkoutExerciseUtils.getBgColor100(props.entry.sets, false)} rounded-lg`}
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
                  className={Weight.eq(weight, props.weight) ? "text-blackv2" : "text-redv2-600"}
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
