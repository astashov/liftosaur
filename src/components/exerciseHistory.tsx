import { h, JSX, RefObject, Fragment } from "preact";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IHistoryRecord, ISettings } from "../types";
import { Weight } from "../models/weight";
import { DateUtils } from "../utils/date";
import { MenuItemWrapper } from "./menuItem";
import { useGradualList } from "../utils/useGradualList";
import { Exercise } from "../models/exercise";
import { Reps } from "../models/set";
import { History } from "../models/history";
import { ObjectUtils } from "../utils/object";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { IconArrowRight } from "./icons/iconArrowRight";
import { lb } from "lens-shmens";
import { updateSettings } from "../models/state";
import { GroupHeader } from "./groupHeader";
import { IconFilter } from "./icons/iconFilter";
import { MenuItemEditable } from "./menuItemEditable";
import { useState } from "preact/hooks";
import { memo } from "preact/compat";
import { ComparerUtils } from "../utils/comparer";

interface IExerciseHistoryProps {
  surfaceRef: RefObject<HTMLElement>;
  exerciseType: IExerciseType;
  settings: ISettings;
  dispatch: IDispatch;
  history: IHistoryRecord[];
}

export const ExerciseHistory = memo((props: IExerciseHistoryProps): JSX.Element => {
  const { visibleRecords } = useGradualList(props.history, 0, 20, props.surfaceRef, () => {});
  const fullExercise = Exercise.get(props.exerciseType, props.settings.exercises);
  const allPrs = History.getPersonalRecords(props.history);
  const [showFilters, setShowFilters] = useState(false);
  let history = props.history;
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

  return (
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
  );
}, ComparerUtils.noFns);
