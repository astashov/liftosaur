import { JSX, memo, useState, useCallback, useMemo } from "react";
import { View, Pressable, FlatList } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IProgram, ISettings } from "../types";
import {
  builtinProgramAges,
  builtinProgramDurations,
  builtinProgramFrequencies,
  builtinProgramGoals,
} from "../models/builtinPrograms";
import { IProgramFilter, IProgramSort, ProgramFilter_sort, ProgramFilter_filter } from "../utils/programFilter";
import { SelectLink } from "./selectLink";
import { ExerciseImageUtils_exists } from "../models/exerciseImage";
import { IProgramIndexEntry, Program_exerciseRangeFormat } from "../models/program";
import { StringUtils_pluralize } from "../utils/string";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { ExerciseImage } from "./exerciseImage";
import { IconCalendarSmall } from "./icons/iconCalendarSmall";
import { IconKettlebellSmall } from "./icons/iconKettlebellSmall";
import { IconWatch } from "./icons/iconWatch";
import { equipmentName } from "../models/exercise";
import { Equipment_currentEquipment } from "../models/equipment";
import { navigationRef } from "../navigation/navigationRef";
import { SimpleMarkdown } from "./simpleMarkdown";

interface IProps {
  programs: IProgram[];
  programsIndex: IProgramIndexEntry[];
  hasCustomPrograms: boolean;
  settings: ISettings;
  dispatch: IDispatch;
  search?: string;
}

export function BuiltinProgramsList(props: IProps): JSX.Element {
  const [filter, setFilter] = useState<IProgramFilter>({});
  const [sort, setSort] = useState<IProgramSort>(undefined);
  const searchLower = (props.search || "").toLowerCase();
  const filtered = useMemo(
    () => ProgramFilter_sort(ProgramFilter_filter(props.programsIndex, filter), sort),
    [props.programsIndex, filter, sort]
  );
  const entries = useMemo(
    () => (searchLower ? filtered.filter((e) => e.name.toLowerCase().includes(searchLower)) : filtered),
    [filtered, searchLower]
  );

  const { settings, hasCustomPrograms } = props;
  const renderItem = useCallback(
    ({ item }: { item: IProgramIndexEntry }) => (
      <BuiltInProgram entry={item} settings={settings} hasCustomPrograms={hasCustomPrograms} />
    ),
    [settings, hasCustomPrograms]
  );

  const keyExtractor = useCallback((item: IProgramIndexEntry) => item.id, []);

  const listHeader = (
    <View className="pt-4">
      <Text className="pb-4">
        I've been lifting for{" "}
        <SelectLink
          name="builtin-filter-age"
          className="font-semibold"
          values={builtinProgramAges}
          onChange={(age) => setFilter({ ...filter, age })}
          emptyLabel="any time"
          value={filter.age}
        />
        . I can work out{" "}
        <SelectLink
          name="builtin-filter-frequency"
          className="font-semibold"
          values={builtinProgramFrequencies}
          onChange={(frequency) => setFilter({ ...filter, frequency })}
          emptyLabel="any number days a week"
          value={filter.frequency}
        />{" "}
        for{" "}
        <SelectLink
          name="builtin-filter-duration"
          className="font-semibold"
          values={builtinProgramDurations}
          onChange={(duration) => setFilter({ ...filter, duration })}
          emptyLabel="any time"
          value={filter.duration}
        />
        . My goal is{" "}
        <SelectLink
          name="builtin-filter-goal"
          className="font-semibold"
          values={builtinProgramGoals}
          onChange={(goal) => setFilter({ ...filter, goal })}
          emptyLabel="strength or hypertrophy"
          value={filter.goal}
        />
        .
      </Text>
      <Text className="pb-4">
        Sort ascending by:{" "}
        <SelectLink
          name="builtin-sort"
          className="font-semibold"
          values={{ age: "Age", frequency: "Frequency", duration: "Duration" }}
          onChange={(v) => setSort(v)}
          emptyLabel="None"
          value={sort}
        />
      </Text>
    </View>
  );

  const listEmpty = (
    <View className="px-6 py-8">
      <Text className="text-lg text-center text-text-secondarysubtle">No programs found with selected filters</Text>
    </View>
  );

  return (
    <FlatList
      data={entries}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      initialNumToRender={4}
      maxToRenderPerBatch={6}
      windowSize={5}
    />
  );
}

interface IBuiltInProgramProps {
  entry: IProgramIndexEntry;
  settings: ISettings;
  hasCustomPrograms: boolean;
}

const BuiltInProgram = memo(function BuiltInProgram(props: IBuiltInProgramProps): JSX.Element {
  const { entry, hasCustomPrograms } = props;
  const exercises = entry.exercises ?? [];
  const allEquipment = useMemo(() => Equipment_currentEquipment(props.settings), [props.settings]);
  const equipment = useMemo(
    () => (entry.equipment ?? []).map((e) => equipmentName(e, allEquipment)),
    [entry.equipment, allEquipment]
  );
  const exercisesRange = entry.exercisesRange;
  const numberOfWeeks = entry.weeksCount ?? 0;
  const onPress = useCallback(() => {
    navigationRef.navigate("programInfoModal", { programId: entry.id, hasCustomPrograms });
  }, [entry.id, hasCustomPrograms]);
  const visibleExercises = useMemo(() => exercises.filter((e) => ExerciseImageUtils_exists(e, "small")), [exercises]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entry.name}
      className="flex-row items-center w-full p-3 mb-4 border rounded-lg bg-background-cardpurple border-border-cardpurple"
      onPress={onPress}
      data-testid="program-list-choose-program"
      testID="program-list-choose-program"
    >
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 mr-2 text-base font-bold">{entry.name}</Text>
          {entry.duration && (
            <View className="flex-row items-center">
              <IconWatch />
              <Text className="pl-1 text-sm">{entry.duration} mins</Text>
            </View>
          )}
        </View>
        {entry.shortDescription && (
          <SimpleMarkdown value={entry.shortDescription} className="text-sm text-text-secondary" />
        )}
        <View className="flex-row flex-wrap pb-2">
          {visibleExercises.map((e) => (
            <ExerciseImage
              key={`${e.id}_${e.equipment}`}
              settings={props.settings}
              exerciseType={e}
              size="small"
              className="w-6 mr-1"
            />
          ))}
        </View>
        <View className="flex-row items-center mb-1">
          <IconCalendarSmall color={Tailwind_colors().lightgray[600]} className="mr-1" />
          <Text className="text-xs text-text-secondary">
            {numberOfWeeks > 1 && `${numberOfWeeks} ${StringUtils_pluralize("week", numberOfWeeks)}, `}
            {entry.frequency ? `${entry.frequency}x/week, ` : ""}
            {exercisesRange ? Program_exerciseRangeFormat(exercisesRange[0], exercisesRange[1]) : ""}
          </Text>
        </View>
        <View className="flex-row items-center">
          <IconKettlebellSmall color={Tailwind_colors().lightgray[600]} className="mr-1" />
          <Text className="text-xs text-text-secondary">{equipment.join(", ")}</Text>
        </View>
      </View>
    </Pressable>
  );
});
