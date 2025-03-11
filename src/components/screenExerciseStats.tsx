import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import {
  ICustomExercise,
  IExerciseKind,
  IExerciseType,
  IHistoryRecord,
  IMuscle,
  IProgram,
  ISettings,
  ISubscription,
} from "../types";
import { INavCommon, updateSettings } from "../models/state";
import { History } from "../models/history";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { Exercise } from "../models/exercise";
import { MenuItemEditable } from "./menuItemEditable";
import { CollectionUtils } from "../utils/collection";
import { lb } from "lens-shmens";
import { ExerciseImage } from "./exerciseImage";
import { GraphExercise } from "./graphExercise";
import { GroupHeader } from "./groupHeader";
import { MenuItem, MenuItemWrapper } from "./menuItem";
import { Collector } from "../utils/collector";
import { DateUtils } from "../utils/date";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { IconArrowRight } from "./icons/iconArrowRight";
import { IconFilter } from "./icons/iconFilter";
import { useState } from "preact/hooks";
import { Weight } from "../models/weight";
import { Locker } from "./locker";
import { HelpExerciseStats } from "./help/helpExerciseStats";
import { useGradualList } from "../utils/useGradualList";
import { ObjectUtils } from "../utils/object";
import { Reps } from "../models/set";
import { ExerciseDataSettings } from "./exerciseDataSettings";
import { MuscleGroupsView, ModalCustomExercise } from "./modalExercise";
import { LinkButton } from "./linkButton";
import { Thunk } from "../ducks/thunks";
import { Program } from "../models/program";
import { EditProgram } from "../models/editProgram";

interface IProps {
  exerciseType: IExerciseType;
  history: IHistoryRecord[];
  dispatch: IDispatch;
  subscription: ISubscription;
  settings: ISettings;
  navCommon: INavCommon;
  currentProgram?: IProgram;
}

export function ScreenExerciseStats(props: IProps): JSX.Element {
  const [showFilters, setShowFilters] = useState(false);
  const exerciseType = props.exerciseType;
  const evaluatedProgram = props.currentProgram ? Program.evaluate(props.currentProgram, props.settings) : undefined;
  const programExerciseIds = evaluatedProgram
    ? Program.getProgramExercisesFromExerciseType(evaluatedProgram, exerciseType).map((pe) => pe.key)
    : [];
  const fullExercise = Exercise.get(props.exerciseType, props.settings.exercises);
  const customExercise = props.settings.exercises[exerciseType.id];
  const historyCollector = Collector.build(props.history)
    .addFn(History.collectMinAndMaxTime())
    .addFn(History.collectAllUsedExerciseTypes())
    .addFn(History.collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History.collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History.collect1RMPersonalRecord(exerciseType, props.settings));

  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);
  const allPrs = History.getPersonalRecords(props.history);

  const [
    { maxTime: maxX, minTime: minX },
    _exerciseTypes,
    unsortedHistory,
    { maxWeight, maxWeightHistoryRecord },
    { max1RM, max1RMHistoryRecord, max1RMSet },
  ] = historyCollector.run();
  let history = unsortedHistory;
  if (
    props.settings.exerciseStatsSettings.hideWithoutExerciseNotes ||
    props.settings.exerciseStatsSettings.hideWithoutWorkoutNotes
  ) {
    history = history.filter((hr) => {
      let result = true;
      if (props.settings.exerciseStatsSettings.hideWithoutExerciseNotes) {
        result = result && hr.entries.some((e) => e.notes);
      }
      if (props.settings.exerciseStatsSettings.hideWithoutWorkoutNotes) {
        result = result && !!hr.notes;
      }
      return result;
    });
  }
  history = CollectionUtils.sort(history, (a, b) => {
    return props.settings.exerciseStatsSettings.ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime;
  });

  const [containerRef, visibleRecords] = useGradualList(history, 20, () => {});
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;

  return (
    <Surface
      ref={containerRef}
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          helpContent={<HelpExerciseStats />}
          title="Exercise Stats"
        />
      }
      addons={
        <>
          {showCustomExerciseModal && (
            <ModalCustomExercise
              exercise={customExercise}
              settings={props.settings}
              onClose={() => setShowCustomExerciseModal(false)}
              onCreateOrUpdate={(
                shouldClose: boolean,
                name: string,
                targetMuscles: IMuscle[],
                synergistMuscles: IMuscle[],
                types: IExerciseKind[],
                smallImageUrl?: string,
                largeImageUrl?: string,
                exercise?: ICustomExercise
              ) => {
                const exercises = Exercise.createOrUpdateCustomExercise(
                  props.settings.exercises,
                  name,
                  targetMuscles,
                  synergistMuscles,
                  types,
                  smallImageUrl,
                  largeImageUrl,
                  exercise
                );
                updateSettings(props.dispatch, lb<ISettings>().p("exercises").record(exercises));
                if (props.currentProgram && exercise) {
                  const newProgram = Program.changeExerciseName(exercise.name, name, props.currentProgram, {
                    ...props.settings,
                    exercises,
                  });
                  EditProgram.updateProgram(props.dispatch, newProgram);
                }
                if (shouldClose) {
                  setShowCustomExerciseModal(false);
                }
              }}
            />
          )}
        </>
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <h1 className="text-xl font-bold">{Exercise.fullName(fullExercise, props.settings)}</h1>
        <div className="text-xs text-grayv2-main" style={{ marginTop: "-0.25rem" }}>
          {Exercise.isCustom(fullExercise.id, props.settings.exercises) ? "Custom exercise" : "Built-in exercise"}
        </div>
        <div className="py-2">
          <MuscleGroupsView exercise={fullExercise} settings={props.settings} />
        </div>
        {Exercise.isCustom(fullExercise.id, props.settings.exercises) && (
          <div className="flex">
            <div className="mr-auto">
              <LinkButton name="edit-custom-exercise-stats" onClick={() => setShowCustomExerciseModal(true)}>
                Edit
              </LinkButton>
            </div>
            <div>
              <LinkButton
                name="edit-custom-exercise-stats"
                className="text-redv2-main"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this exercise?")) {
                    updateSettings(
                      props.dispatch,
                      lb<ISettings>()
                        .p("exercises")
                        .recordModify((exercises) => {
                          const exercise = exercises[fullExercise.id];
                          return exercise != null
                            ? { ...exercises, [fullExercise.id]: { ...exercise, isDeleted: true } }
                            : exercises;
                        })
                    );
                    props.dispatch(Thunk.pullScreen());
                  }
                }}
              >
                Delete Exercise
              </LinkButton>
            </div>
          </div>
        )}

        <ExerciseDataSettings
          fullExercise={fullExercise}
          programExerciseIds={programExerciseIds}
          settings={props.settings}
          dispatch={props.dispatch}
          show1RM={true}
        />

        <div data-cy="exercise-stats-image">
          <ExerciseImage
            settings={props.settings}
            key={Exercise.toKey(exerciseType)}
            exerciseType={exerciseType}
            size="large"
          />
        </div>
        {history.length > 1 && (
          <div data-cy="exercise-stats-graph" className="relative">
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
          <section data-cy="exercise-stats-pr" className="px-4 py-2 mt-8 bg-purple-100 rounded-2xl">
            <GroupHeader topPadding={false} name="🏆 Personal Records" />
            {maxWeight.value > 0 && (
              <MenuItem
                name="Max Weight"
                expandName={true}
                onClick={() =>
                  maxWeightHistoryRecord &&
                  props.dispatch({ type: "EditHistoryRecord", historyRecord: maxWeightHistoryRecord })
                }
                value={
                  <div className="text-blackv2">
                    <div data-cy="max-weight-value">{Weight.display(maxWeight)}</div>
                    {maxWeightHistoryRecord && (
                      <div className="text-xs text-grayv2-main">
                        {DateUtils.format(maxWeightHistoryRecord.startTime)}
                      </div>
                    )}
                  </div>
                }
                shouldShowRightArrow={true}
              />
            )}
            {max1RM.value > 0 && (
              <MenuItem
                isBorderless={true}
                expandValue={true}
                onClick={() =>
                  max1RMHistoryRecord &&
                  props.dispatch({ type: "EditHistoryRecord", historyRecord: max1RMHistoryRecord })
                }
                name="Max 1RM"
                value={
                  <div className="text-blackv2">
                    <div data-cy="one-rm-value">
                      {Weight.display(max1RM)}
                      {max1RMSet ? ` (${max1RMSet.reps} x ${Weight.display(max1RMSet.weight)})` : ""}
                    </div>
                    {max1RMHistoryRecord && (
                      <div className="text-xs text-grayv2-main">{DateUtils.format(max1RMHistoryRecord.startTime)}</div>
                    )}
                  </div>
                }
                shouldShowRightArrow={true}
              />
            )}
          </section>
        )}
        <section data-cy="exercise-stats-history">
          <GroupHeader
            topPadding={true}
            name={`${Exercise.fullName(fullExercise, props.settings)} History`}
            rightAddOn={
              <button
                className="p-2 nm-exercise-stats-navbar-filter"
                data-cy="exercise-stats-history-filter"
                style={{ marginRight: "-0.5rem", marginTop: "-0.5rem" }}
                onClick={() => setShowFilters(!showFilters)}
              >
                <IconFilter />
              </button>
            }
          />
          {showFilters && (
            <section>
              <MenuItemEditable
                type="boolean"
                name="Ascending sort by date"
                value={!!props.settings.exerciseStatsSettings.ascendingSort ? "true" : "false"}
                onChange={() => {
                  updateSettings(
                    props.dispatch,
                    lb<ISettings>()
                      .p("exerciseStatsSettings")
                      .p("ascendingSort")
                      .record(!props.settings.exerciseStatsSettings.ascendingSort)
                  );
                }}
              />
              <MenuItemEditable
                type="boolean"
                name="Hide entries without exercise notes"
                value={!!props.settings.exerciseStatsSettings.hideWithoutExerciseNotes ? "true" : "false"}
                onChange={() => {
                  updateSettings(
                    props.dispatch,
                    lb<ISettings>()
                      .p("exerciseStatsSettings")
                      .p("hideWithoutExerciseNotes")
                      .record(!props.settings.exerciseStatsSettings.hideWithoutExerciseNotes)
                  );
                }}
              />
              <MenuItemEditable
                type="boolean"
                name="Hide entries without workout notes"
                value={!!props.settings.exerciseStatsSettings.hideWithoutWorkoutNotes ? "true" : "false"}
                onChange={() => {
                  updateSettings(
                    props.dispatch,
                    lb<ISettings>()
                      .p("exerciseStatsSettings")
                      .p("hideWithoutWorkoutNotes")
                      .record(!props.settings.exerciseStatsSettings.hideWithoutWorkoutNotes)
                  );
                }}
              />
            </section>
          )}
          {history.slice(0, visibleRecords).map((historyRecord) => {
            const exerciseEntries = historyRecord.entries.filter((e) => Exercise.eq(e.exercise, fullExercise));
            const exerciseNotes = exerciseEntries.map((e) => e.notes).filter((e) => e);
            return (
              <MenuItemWrapper
                onClick={() => {
                  props.dispatch({ type: "EditHistoryRecord", historyRecord });
                }}
                name={`${historyRecord.startTime}`}
              >
                <div className="py-2">
                  <div className="flex text-xs text-grayv2-main">
                    <div className="mr-2 font-bold">{DateUtils.format(historyRecord.date)}</div>
                    <div className="flex-1 text-right">
                      {historyRecord.programName}, {historyRecord.dayName}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex-1">
                      <div>
                        {exerciseEntries.map((entry) => {
                          const prs = allPrs[historyRecord.id]?.[Exercise.toKey(entry.exercise)];
                          const state = { ...entry.state };
                          const vars = entry.vars || {};
                          for (const key of ObjectUtils.keys(vars)) {
                            const name = { rm1: "1 Rep Max" }[key] || key;
                            state[name] = vars[key];
                          }
                          const volume = Reps.volume(entry.sets);
                          return (
                            <div className="pt-1">
                              <div className="text-right">
                                <HistoryRecordSetsView
                                  showPrDetails={true}
                                  prs={prs}
                                  sets={entry.sets}
                                  settings={props.settings}
                                  isNext={false}
                                />
                              </div>
                              {volume.value > 0 && (
                                <div className="mb-1 text-xs leading-none text-left text-grayv2-main">
                                  Volume: <strong>{Weight.print(volume)}</strong>
                                </div>
                              )}
                              {Object.keys(state).length > 0 && (
                                <div className="text-xs text-grayv2-main">
                                  {ObjectUtils.keys(state).map((stateKey, i) => {
                                    const value = state[stateKey];
                                    const displayValue =
                                      Weight.is(value) || Weight.isPct(value) ? Weight.display(value) : value;
                                    return (
                                      <>
                                        {i !== 0 && ", "}
                                        <span>
                                          {stateKey} - <strong>{displayValue}</strong>
                                        </span>
                                      </>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {exerciseNotes.length > 0 && (
                        <ul>
                          {exerciseNotes.map((n) => (
                            <li className="text-sm text-grayv2-main">{n}</li>
                          ))}
                        </ul>
                      )}
                      {historyRecord.notes && (
                        <p className="text-sm text-grayv2-main">
                          <span className="font-bold">Workout: </span>
                          <span>{historyRecord.notes}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center py-2 pl-2">
                      <IconArrowRight style={{ color: "#a0aec0" }} />
                    </div>
                  </div>
                </div>
              </MenuItemWrapper>
            );
          })}
        </section>
      </section>
    </Surface>
  );
}
