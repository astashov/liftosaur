import { JSX, Fragment, RefObject, memo, useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Pressable } from "react-native";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IHistoryRecord, ISettings } from "../types";
import { Weight_print, Weight_is, Weight_isPct, Weight_display } from "../models/weight";
import { DateUtils_format } from "../utils/date";
import { MenuItemWrapper } from "./menuItem";
import { useGradualList } from "../utils/useGradualList";
import { Exercise_get, Exercise_fullName, Exercise_eq, Exercise_toKey } from "../models/exercise";
import { Reps_volume } from "../models/set";
import { History_getPersonalRecords } from "../models/history";
import { ObjectUtils_keys } from "../utils/object";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { IconArrowRight } from "./icons/iconArrowRight";
import { lb } from "lens-shmens";
import { updateSettings } from "../models/state";
import { GroupHeader } from "./groupHeader";
import { IconFilter } from "./icons/iconFilter";
import { MenuItemEditable } from "./menuItemEditable";
import { ComparerUtils_noFns } from "../utils/comparer";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IExerciseHistoryProps {
  surfaceRef: RefObject<{ clientHeight?: number } | null>;
  exerciseType: IExerciseType;
  settings: ISettings;
  dispatch: IDispatch;
  history: IHistoryRecord[];
}

export const ExerciseHistory = memo((props: IExerciseHistoryProps): JSX.Element => {
  const { visibleRecords, loadMoreVisibleRecords } = useGradualList(props.history, 0, 5, props.surfaceRef, () => {});
  useEffect(() => {
    if (props.history.length > 5) {
      const t = setTimeout(() => loadMoreVisibleRecords(15), 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [props.history.length, loadMoreVisibleRecords]);
  const fullExercise = Exercise_get(props.exerciseType, props.settings.exercises);
  const allPrs = History_getPersonalRecords(props.history);
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
    <View data-testid="exercise-stats-history">
      <GroupHeader
        topPadding={true}
        name={`${Exercise_fullName(fullExercise, props.settings)} History`}
        rightAddOn={
          <Pressable
            className="p-2"
            data-testid="exercise-stats-history-filter"
            testID="exercise-stats-history-filter"
            style={{ marginRight: -8, marginTop: -8 }}
            onPress={() => setShowFilters(!showFilters)}
          >
            <IconFilter />
          </Pressable>
        }
      />
      {showFilters && (
        <View>
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
                  .record(!props.settings.exerciseStatsSettings.ascendingSort),
                "Toggle sort order"
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
                  .record(!props.settings.exerciseStatsSettings.hideWithoutExerciseNotes),
                "Toggle exercise notes filter"
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
                  .record(!props.settings.exerciseStatsSettings.hideWithoutWorkoutNotes),
                "Toggle workout notes filter"
              );
            }}
          />
        </View>
      )}
      {history.slice(0, visibleRecords).map((historyRecord) => {
        const exerciseEntries = historyRecord.entries.filter((e) => Exercise_eq(e.exercise, fullExercise));
        const exerciseNotes = exerciseEntries.map((e) => e.notes).filter((e) => e);
        return (
          <MenuItemWrapper
            key={historyRecord.id}
            onClick={() => {
              props.dispatch(Thunk_editHistoryRecord(historyRecord));
            }}
            name={`${historyRecord.startTime}`}
          >
            <View className="py-2">
              <View className="flex-row">
                <Text className="mr-2 text-xs font-bold text-text-secondary">
                  {DateUtils_format(historyRecord.date)}
                </Text>
                <Text className="flex-1 text-xs text-right text-text-secondary">
                  {historyRecord.programName}, {historyRecord.dayName}
                </Text>
              </View>
              <View className="flex-row">
                <View className="flex-1">
                  <View>
                    {exerciseEntries.map((entry, ei) => {
                      const prs = allPrs[historyRecord.id]?.[Exercise_toKey(entry.exercise)];
                      const state = { ...entry.state };
                      const vars = entry.vars || {};
                      for (const key of ObjectUtils_keys(vars)) {
                        const name = { rm1: "1 Rep Max" }[key] || key;
                        state[name] = vars[key];
                      }
                      const volume = Reps_volume(entry.sets, props.settings.units);
                      return (
                        <View key={ei} className="pt-1">
                          <View className="items-end">
                            <HistoryRecordSetsView
                              showPrDetails={true}
                              prs={prs}
                              sets={entry.sets}
                              settings={props.settings}
                              isNext={false}
                            />
                          </View>
                          {volume.value > 0 && (
                            <Text className="mb-1 text-xs text-text-secondary">
                              Volume: <Text className="text-xs font-bold">{Weight_print(volume)}</Text>
                            </Text>
                          )}
                          {Object.keys(state).length > 0 && (
                            <Text className="text-xs text-text-secondary">
                              {ObjectUtils_keys(state).map((stateKey, i) => {
                                const value = state[stateKey];
                                const displayValue =
                                  Weight_is(value) || Weight_isPct(value) ? Weight_display(value) : value;
                                return (
                                  <Fragment key={stateKey}>
                                    {i !== 0 && ", "}
                                    <Text className="text-xs">
                                      {stateKey} - <Text className="text-xs font-bold">{displayValue}</Text>
                                    </Text>
                                  </Fragment>
                                );
                              })}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {exerciseNotes.length > 0 && (
                    <View>
                      {exerciseNotes.map((n, ni) => (
                        <Text key={ni} className="text-sm text-text-secondary">
                          {n}
                        </Text>
                      ))}
                    </View>
                  )}
                  {historyRecord.notes && (
                    <Text className="text-sm text-text-secondary">
                      <Text className="text-sm font-bold">Workout: </Text>
                      <Text className="text-sm">{historyRecord.notes}</Text>
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center py-2 pl-2">
                  <IconArrowRight color={Tailwind_semantic().icon.neutral} />
                </View>
              </View>
            </View>
          </MenuItemWrapper>
        );
      })}
    </View>
  );
}, ComparerUtils_noFns);
