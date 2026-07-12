import { JSX, memo, useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Pressable } from "react-native";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IHistoryRecord, ISettings, IUnit } from "../types";
import { Weight_print, Weight_is, Weight_isPct, Weight_display } from "../models/weight";
import { DateUtils_format } from "../utils/date";
import { MenuItemWrapper } from "./menuItem";
import { useProgressiveItems } from "../utils/useProgressiveItems";
import { Exercise_get, Exercise_fullName, Exercise_eq, Exercise_toKey, IExercise } from "../models/exercise";
import { Reps_volume } from "../models/set";
import { History_getPersonalRecords, IPersonalRecords } from "../models/history";
import { ObjectUtils_keys } from "../utils/object";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { FastText } from "./primitives/fastText";
import { StyledText, StyledText_remToPx } from "../utils/styledText";
import { useRem } from "../utils/useRem";
import { IconArrowRight } from "./icons/iconArrowRight";
import { lb } from "lens-shmens";
import { updateSettings } from "../models/state";
import { GroupHeader } from "./groupHeader";
import { IconFilter } from "./icons/iconFilter";
import { MenuItemEditable } from "./menuItemEditable";
import { Thunk_editHistoryRecord } from "../ducks/thunks";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IExerciseHistoryProps {
  exerciseType: IExerciseType;
  settings: ISettings;
  dispatch: IDispatch;
  history: IHistoryRecord[];
}

export const ExerciseHistory = memo((props: IExerciseHistoryProps): JSX.Element => {
  const fullExercise = useMemo(
    () => Exercise_get(props.exerciseType, props.settings.exercises),
    [props.exerciseType, props.settings.exercises]
  );
  const allPrs = useMemo(() => History_getPersonalRecords(props.history), [props.history]);
  const [showFilters, setShowFilters] = useState(false);
  const { hideWithoutExerciseNotes, hideWithoutWorkoutNotes, ascendingSort } = props.settings.exerciseStatsSettings;
  const history = useMemo(() => {
    if (!hideWithoutExerciseNotes && !hideWithoutWorkoutNotes) {
      return props.history;
    }
    return props.history.filter((hr) => {
      let result = true;
      if (hideWithoutExerciseNotes) {
        result = result && hr.entries.some((e) => e.notes);
      }
      if (hideWithoutWorkoutNotes) {
        result = result && !!hr.notes;
      }
      return result;
    });
  }, [props.history, hideWithoutExerciseNotes, hideWithoutWorkoutNotes]);
  const visibleHistory = useProgressiveItems(history, {
    initialBatch: 5,
    batchSize: 15,
    idleCap: 10,
    debugLabel: "ExerciseHistory",
    resetKey: `${Exercise_toKey(props.exerciseType)}|${hideWithoutExerciseNotes ? 1 : 0}|${
      hideWithoutWorkoutNotes ? 1 : 0
    }|${ascendingSort ? 1 : 0}`,
  });
  const dispatch = props.dispatch;
  const onToggleFilters = useCallback(() => setShowFilters((s) => !s), []);
  const onToggleAscending = useCallback(() => {
    updateSettings(
      dispatch,
      lb<ISettings>().p("exerciseStatsSettings").p("ascendingSort").record(!ascendingSort),
      "Toggle sort order"
    );
  }, [dispatch, ascendingSort]);
  const onToggleHideExerciseNotes = useCallback(() => {
    updateSettings(
      dispatch,
      lb<ISettings>().p("exerciseStatsSettings").p("hideWithoutExerciseNotes").record(!hideWithoutExerciseNotes),
      "Toggle exercise notes filter"
    );
  }, [dispatch, hideWithoutExerciseNotes]);
  const onToggleHideWorkoutNotes = useCallback(() => {
    updateSettings(
      dispatch,
      lb<ISettings>().p("exerciseStatsSettings").p("hideWithoutWorkoutNotes").record(!hideWithoutWorkoutNotes),
      "Toggle workout notes filter"
    );
  }, [dispatch, hideWithoutWorkoutNotes]);
  const headerName = useMemo(
    () => `${Exercise_fullName(fullExercise, props.settings)} History`,
    [fullExercise, props.settings]
  );

  return (
    <View data-testid="exercise-stats-history">
      <GroupHeader
        topPadding={true}
        name={headerName}
        rightAddOn={
          <Pressable
            className="p-2"
            data-testid="exercise-stats-history-filter"
            testID="exercise-stats-history-filter"
            style={{ marginRight: -8, marginTop: -8 }}
            onPress={onToggleFilters}
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
            value={!!ascendingSort ? "true" : "false"}
            onChange={onToggleAscending}
          />
          <MenuItemEditable
            type="boolean"
            name="Hide entries without exercise notes"
            value={!!hideWithoutExerciseNotes ? "true" : "false"}
            onChange={onToggleHideExerciseNotes}
          />
          <MenuItemEditable
            type="boolean"
            name="Hide entries without workout notes"
            value={!!hideWithoutWorkoutNotes ? "true" : "false"}
            onChange={onToggleHideWorkoutNotes}
          />
        </View>
      )}
      {visibleHistory.map((historyRecord) => (
        <ExerciseHistoryRecord
          key={historyRecord.id}
          historyRecord={historyRecord}
          fullExercise={fullExercise}
          units={props.settings.units}
          prs={allPrs[historyRecord.id]}
          dispatch={props.dispatch}
        />
      ))}
    </View>
  );
});

interface IExerciseHistoryRecordProps {
  historyRecord: IHistoryRecord;
  fullExercise: IExercise;
  units: IUnit;
  prs: IPersonalRecords[string];
  dispatch: IDispatch;
}

const ExerciseHistoryRecord = memo((props: IExerciseHistoryRecordProps): JSX.Element => {
  const { historyRecord, fullExercise, units, prs, dispatch } = props;
  const rem = useRem();
  const secondary = Tailwind_semantic().text.secondary;
  const xs = StyledText_remToPx("xs", rem);
  const exerciseEntries = historyRecord.entries.filter((e) => Exercise_eq(e.exercise, fullExercise));
  const exerciseNotes = exerciseEntries.map((e) => e.notes).filter((e) => e);
  const onClick = useCallback(() => {
    dispatch(Thunk_editHistoryRecord(historyRecord));
  }, [dispatch, historyRecord]);
  return (
    <MenuItemWrapper onClick={onClick} name={`${historyRecord.startTime}`}>
      <View className="py-2">
        <View className="flex-row">
          <Text className="mr-2 text-xs font-bold text-text-secondary">{DateUtils_format(historyRecord.date)}</Text>
          <Text className="flex-1 text-xs text-right text-text-secondary">
            {historyRecord.programName}, {historyRecord.dayName}
          </Text>
        </View>
        <View className="flex-row">
          <View className="flex-1">
            <View>
              {exerciseEntries.map((entry, ei) => {
                const entryPrs = prs?.[Exercise_toKey(entry.exercise)];
                const state = { ...entry.state };
                const vars = entry.vars || {};
                for (const key of ObjectUtils_keys(vars)) {
                  const name = { rm1: "1 Rep Max" }[key] || key;
                  state[name] = vars[key];
                }
                const volume = Reps_volume(entry.sets, units);
                return (
                  <View key={ei} className="pt-1">
                    <View className="items-end">
                      <HistoryRecordSetsView
                        showPrDetails={true}
                        prs={entryPrs}
                        sets={entry.sets}
                        units={units}
                        isNext={false}
                      />
                    </View>
                    {volume.value > 0 &&
                      (() => {
                        const builder = new StyledText();
                        builder.add("Volume: ");
                        builder.add(Weight_print(volume), { fontWeight: "700" });
                        const built = builder.build();
                        return (
                          <FastText
                            text={built.text}
                            fragments={built.fragments}
                            color={secondary}
                            fontSize={xs}
                            style={{ marginBottom: rem / 4 }}
                          />
                        );
                      })()}
                    {Object.keys(state).length > 0 &&
                      (() => {
                        const builder = new StyledText();
                        ObjectUtils_keys(state).forEach((stateKey, si) => {
                          const value = state[stateKey];
                          const displayValue = Weight_is(value) || Weight_isPct(value) ? Weight_display(value) : value;
                          if (si !== 0) {
                            builder.add(", ");
                          }
                          builder.add(`${stateKey} - `);
                          builder.add(`${displayValue}`, { fontWeight: "700" });
                        });
                        const built = builder.build();
                        return (
                          <FastText text={built.text} fragments={built.fragments} color={secondary} fontSize={xs} />
                        );
                      })()}
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
            {!!historyRecord.notes && (
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
});
