import React, { useMemo } from "react";
import type { JSX } from "react";
import { View, Text, Pressable } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IExerciseType, IHistoryRecord, ISettings } from "@shared/types";
import { Thunk_pushScreen } from "@shared/ducks/thunks";
import { Exercise_get, Exercise_fullName, Exercise_eq, Exercise_toKey } from "@shared/models/exercise";
import { Weight_print, Weight_is, Weight_isPct, Weight_display } from "@shared/models/weight";
import { DateUtils_format } from "@shared/utils/date";
import { Reps_volume } from "@shared/models/set";
import { History_getPersonalRecords } from "@shared/models/history";
import { ObjectUtils_keys } from "@shared/utils/object";
import { HistoryRecordSetsView } from "./HistoryRecordSetsView";
import { IconArrowRight } from "./icons/IconArrowRight";
import { GroupHeader } from "./GroupHeader";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  exerciseType: IExerciseType;
  settings: ISettings;
  dispatch: IDispatch;
  history: IHistoryRecord[];
}

export const ExerciseHistory = React.memo(function ExerciseHistory(props: IProps): JSX.Element {
  const fullExercise = Exercise_get(props.exerciseType, props.settings.exercises);
  const allPrs = useMemo(() => History_getPersonalRecords(props.history), [props.history]);
  const history = useMemo(() => {
    const hideExNotes = props.settings.exerciseStatsSettings.hideWithoutExerciseNotes;
    const hideWkNotes = props.settings.exerciseStatsSettings.hideWithoutWorkoutNotes;
    if (!hideExNotes && !hideWkNotes) {
      return props.history;
    }
    return props.history.filter((hr) => {
      let result = true;
      if (hideExNotes) {
        result = result && hr.entries.some((e) => e.notes);
      }
      if (hideWkNotes) {
        result = result && !!hr.notes;
      }
      return result;
    });
  }, [
    props.history,
    props.settings.exerciseStatsSettings.hideWithoutExerciseNotes,
    props.settings.exerciseStatsSettings.hideWithoutWorkoutNotes,
  ]);

  return (
    <View data-cy="exercise-stats-history">
      <GroupHeader topPadding={true} name={`${Exercise_fullName(fullExercise, props.settings)} History`} />
      {history.slice(0, 20).map((historyRecord) => {
        const exerciseEntries = historyRecord.entries.filter((e) => Exercise_eq(e.exercise, fullExercise));
        const exerciseNotes = exerciseEntries.map((e) => e.notes).filter((e) => e);
        return (
          <Pressable
            key={historyRecord.id}
            className="border-b border-border-neutral"
            accessibilityRole="button"
            accessibilityLabel={`View history for ${DateUtils_format(historyRecord.date)}`}
            onPress={() => {
              props.dispatch({ type: "EditHistoryRecord", historyRecord });
              props.dispatch(Thunk_pushScreen("progress", { id: historyRecord.id }));
            }}
          >
            <View className="py-2">
              <View className="flex-row">
                <Text className="mr-2 text-xs font-bold text-text-secondary">
                  {DateUtils_format(historyRecord.date)}
                </Text>
                <Text className="flex-1 text-xs text-text-secondary text-right" numberOfLines={1}>
                  {historyRecord.programName}, {historyRecord.dayName}
                </Text>
              </View>
              <View className="flex-row">
                <View className="flex-1">
                  {exerciseEntries.map((entry, i) => {
                    const prs = allPrs[historyRecord.id]?.[Exercise_toKey(entry.exercise)];
                    const state = { ...entry.state };
                    const vars = entry.vars || {};
                    for (const key of ObjectUtils_keys(vars)) {
                      const name = { rm1: "1 Rep Max" }[key] || key;
                      state[name] = vars[key];
                    }
                    const volume = Reps_volume(entry.sets, props.settings.units);
                    return (
                      <View key={i} className="pt-1">
                        <View style={{ alignItems: "flex-end" }}>
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
                            Volume: <Text className="font-bold">{Weight_print(volume)}</Text>
                          </Text>
                        )}
                        {Object.keys(state).length > 0 && (
                          <Text className="text-xs text-text-secondary">
                            {ObjectUtils_keys(state).map((stateKey, si) => {
                              const value = state[stateKey];
                              const displayValue =
                                Weight_is(value) || Weight_isPct(value) ? Weight_display(value) : value;
                              return `${si !== 0 ? ", " : ""}${stateKey} - ${displayValue}`;
                            })}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                  {exerciseNotes.length > 0 &&
                    exerciseNotes.map((note, i) => (
                      <Text key={i} className="text-sm text-text-secondary">
                        {"• "}
                        {note}
                      </Text>
                    ))}
                  {historyRecord.notes && (
                    <Text className="text-sm text-text-secondary">
                      <Text className="font-bold">Workout: </Text>
                      <Text>{historyRecord.notes}</Text>
                    </Text>
                  )}
                </View>
                <View className="items-center justify-center py-2 pl-2">
                  <IconArrowRight color={Tailwind_semantic().text.secondary} />
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});
