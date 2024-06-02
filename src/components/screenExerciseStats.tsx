import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IScreen, Screen } from "../models/screen";
import { IExerciseType, IHistoryRecord, ISettings, ISubscription } from "../types";
import { ILoading, IState, updateState, updateSettings } from "../models/state";
import { History } from "../models/history";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { equipmentName, Exercise } from "../models/exercise";
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
import { StringUtils } from "../utils/string";
import { useGradualList } from "../utils/useGradualList";
import { ObjectUtils } from "../utils/object";
import { Reps } from "../models/set";
import { ExerciseRM } from "./exerciseRm";
import { InputNumber } from "./inputNumber";

interface IProps {
  exerciseType: IExerciseType;
  screenStack: IScreen[];
  history: IHistoryRecord[];
  dispatch: IDispatch;
  subscription: ISubscription;
  settings: ISettings;
  loading: ILoading;
}

export function ScreenExerciseStats(props: IProps): JSX.Element {
  const [showFilters, setShowFilters] = useState(false);
  const exerciseType = props.exerciseType;
  const fullExercise = Exercise.get(props.exerciseType, props.settings.exercises);
  const historyCollector = Collector.build(props.history)
    .addFn(History.collectMinAndMaxTime())
    .addFn(History.collectAllUsedExerciseTypes())
    .addFn(History.collectAllHistoryRecordsOfExerciseType(exerciseType))
    .addFn(History.collectWeightPersonalRecord(exerciseType, props.settings.units))
    .addFn(History.collect1RMPersonalRecord(exerciseType, props.settings));

  const [
    { maxTime: maxX, minTime: minX },
    exerciseTypes,
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

  const exercises = CollectionUtils.nonnull(
    Object.values(exerciseTypes).map<[string, string] | undefined>((e) => {
      if (e != null) {
        const exercise = Exercise.find(e, props.settings.exercises);
        if (exercise != null) {
          return [Exercise.toKey(e), Exercise.fullName(exercise, props.settings.equipment)];
        }
      }
      return undefined;
    })
  );
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;
  const exerciseData = props.settings.exerciseData[Exercise.toKey(fullExercise)] || {};
  const equipmentMap = exerciseData.equipment;

  return (
    <Surface
      ref={containerRef}
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          helpContent={<HelpExerciseStats />}
          screenStack={props.screenStack}
          title="Exercise Stats"
          subtitle={StringUtils.truncate(fullExercise.name, 35)}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
    >
      <section className="px-4">
        {exercises.length > 0 && (
          <MenuItemEditable
            type="select"
            name="Exercise"
            value={Exercise.toKey(exerciseType)}
            values={exercises}
            onChange={(value) => {
              const exType = value ? Exercise.fromKey(value) : undefined;
              updateState(props.dispatch, [lb<IState>().p("viewExerciseType").record(exType)]);
            }}
          />
        )}
        <section className="my-2">
          <InputNumber
            type="number"
            label="Default Rounding"
            min={0}
            step={0.5}
            max={100}
            value={Exercise.defaultRounding(fullExercise, props.settings)}
            onUpdate={(value) => {
              if (!isNaN(value)) {
                updateState(props.dispatch, [
                  lb<IState>()
                    .p("storage")
                    .p("settings")
                    .p("exerciseData")
                    .recordModify((data) => {
                      const k = Exercise.toKey(fullExercise);
                      return { ...data, [k]: { ...data[k], rounding: value } };
                    }),
                ]);
              }
            }}
          />
          {props.settings.gyms.length > 1 && <GroupHeader name="Equipments for each Gym" topPadding={true} />}
          {props.settings.gyms.map((gym, i) => {
            const equipment = equipmentMap?.[gym.id];
            const values: [string, string][] = [
              ["", ""],
              ...ObjectUtils.keys(gym.equipment).map<[string, string]>((id) => [id, equipmentName(id, gym.equipment)]),
            ];
            return (
              <MenuItemEditable
                type="select"
                name={props.settings.gyms.length > 1 ? gym.name : "Equipment"}
                value={equipment ?? ""}
                values={values}
                onChange={(value) => {
                  updateState(props.dispatch, [
                    lb<IState>()
                      .p("storage")
                      .p("settings")
                      .p("exerciseData")
                      .recordModify((data) => {
                        const k = Exercise.toKey(fullExercise);
                        return { ...data, [k]: { ...data[k], equipment: { ...data[k]?.equipment, [gym.id]: value } } };
                      }),
                  ]);
                }}
              />
            );
          })}
          <ExerciseRM
            name="1 Rep Max"
            rmKey="rm1"
            exercise={fullExercise}
            settings={props.settings}
            onEditVariable={(value) => {
              updateState(props.dispatch, [
                lb<IState>()
                  .p("storage")
                  .p("settings")
                  .p("exerciseData")
                  .recordModify((data) => {
                    const k = Exercise.toKey(fullExercise);
                    return { ...data, [k]: { ...data[k], rm1: Weight.build(value, props.settings.units) } };
                  }),
              ]);
            }}
          />
        </section>

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
            name={`${Exercise.fullName(fullExercise, props.settings.equipment)} History`}
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
                          const state = entry.state || {};
                          const vars = entry.vars || {};
                          for (const key of ObjectUtils.keys(vars)) {
                            const name = { rm1: "1 Rep Max" }[key] || key;
                            state[name] = vars[key];
                          }
                          const volume = Reps.volume(entry.sets);
                          return (
                            <div className="pt-1">
                              <HistoryRecordSetsView sets={entry.sets} settings={props.settings} isNext={false} />
                              {volume.value > 0 && (
                                <div className="mb-1 text-xs leading-none text-left text-grayv2-main">
                                  Volume: <strong>{Weight.print(volume)}</strong>
                                </div>
                              )}
                              {Object.keys(state).length > 0 && (
                                <div className="text-xs text-grayv2-main">
                                  {ObjectUtils.keys(state).map((stateKey, i) => {
                                    const value = state[stateKey];
                                    const displayValue = Weight.is(value) ? Weight.display(value) : value;
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
