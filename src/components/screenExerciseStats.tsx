import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IScreen } from "../models/screen";
import { IHistoryRecord, ISettings, ISubscription } from "../types";
import { ILoading, IState, updateState, updateSettings } from "../models/state";
import { History } from "../models/history";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { rightFooterButtons } from "./rightFooterButtons";
import { Exercise, IExercise } from "../models/exercise";
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

interface IProps {
  exercise: IExercise;
  screenStack: IScreen[];
  history: IHistoryRecord[];
  dispatch: IDispatch;
  subscription: ISubscription;
  settings: ISettings;
  loading: ILoading;
}

export function ScreenExerciseStats(props: IProps): JSX.Element {
  const [showFilters, setShowFilters] = useState(false);
  const historyCollector = Collector.build(props.history)
    .addFn(History.collectMinAndMaxTime())
    .addFn(History.collectAllUsedExerciseTypes())
    .addFn(History.collectAllHistoryRecordsOfExerciseType(props.exercise))
    .addFn(History.collectWeightPersonalRecord(props.exercise, props.settings.units))
    .addFn(History.collect1RMPersonalRecord(props.exercise, props.settings));

  const [
    { maxTime: maxX, minTime: minX },
    exerciseTypes,
    unsortedHistory,
    { maxWeight, maxWeightHistoryRecord },
    { max1RM, max1RMHistoryRecord, max1RMSet },
  ] = historyCollector.run();
  const history = CollectionUtils.sort(unsortedHistory, (a, b) => {
    return props.settings.exerciseStatsSettings.ascendingSort ? a.startTime - b.startTime : b.startTime - a.startTime;
  });

  const [containerRef, visibleRecords] = useGradualList(history, 20, () => {});

  const exercises = CollectionUtils.nonnull(
    Object.values(exerciseTypes).map<[string, string] | undefined>((e) => {
      if (e != null) {
        const exercise = Exercise.find(e, props.settings.exercises);
        if (exercise != null) {
          return [Exercise.toKey(e), exercise.name];
        }
      }
      return undefined;
    })
  );
  const showPrs = maxWeight.value > 0 || max1RM.value > 0;
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
          subtitle={StringUtils.truncate(props.exercise.name, 35)}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} rightButtons={rightFooterButtons({ dispatch: props.dispatch })} />}
    >
      <section className="px-4">
        {exercises.length > 0 && (
          <MenuItemEditable
            type="select"
            name="Exercise"
            value={Exercise.toKey(props.exercise)}
            values={exercises}
            onChange={(value) => {
              const exerciseType = value ? Exercise.fromKey(value) : undefined;
              updateState(props.dispatch, [lb<IState>().p("viewExerciseType").record(exerciseType)]);
            }}
          />
        )}
        <div data-cy="exercise-stats-image">
          <ExerciseImage
            key={Exercise.toKey(props.exercise)}
            exerciseType={props.exercise}
            customExercises={props.settings.exercises}
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
              key={Exercise.toKey(props.exercise)}
              settings={props.settings}
              isWithProgramLines={true}
              history={props.history}
              exercise={props.exercise}
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
        {history.length > 0 && (
          <section data-cy="exercise-stats-history">
            <GroupHeader
              topPadding={true}
              name={`${props.exercise.name} History`}
              rightAddOn={
                <button
                  className="p-2"
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
              </section>
            )}
            {history.slice(0, visibleRecords).map((historyRecord) => {
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
                        {historyRecord.entries
                          .filter((e) => Exercise.eq(e.exercise, props.exercise))
                          .map((entry) => {
                            return (
                              <div className="pt-1">
                                <HistoryRecordSetsView sets={entry.sets} unit={props.settings.units} isNext={false} />
                              </div>
                            );
                          })}
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
        )}
      </section>
    </Surface>
  );
}
