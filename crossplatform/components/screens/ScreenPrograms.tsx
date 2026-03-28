import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { IDispatch } from "@shared/ducks/types";
import type { IProgram, ISettings } from "@shared/types";
import {
  type IProgramIndexEntry,
  Program_cloneProgram,
  Program_exerciseRangeFormat,
  Program_previewProgram,
} from "@shared/models/program";
import { Thunk_fetchPrograms, Thunk_pullScreen, Thunk_pushScreen } from "@shared/ducks/thunks";
import { ProgramFilter_filter, ProgramFilter_sort } from "@shared/utils/programFilter";
import type { IProgramFilter, IProgramSort } from "@shared/utils/programFilter";
import { ExerciseImageUtils_exists } from "@shared/models/exerciseImage";
import { equipmentName } from "@shared/models/exercise";
import { Equipment_currentEquipment } from "@shared/models/equipment";
import { Settings_doesProgramHaveUnset1RMs } from "@shared/models/settings";
import { StringUtils_pluralize } from "@shared/utils/string";
import { Tailwind_colors, Tailwind_semantic } from "@shared/utils/tailwindConfig";
import { ExerciseImage } from "../ExerciseImage";
import { IconMagnifyingGlass } from "../icons/IconMagnifyingGlass";
import { IconCalendarSmall } from "../icons/IconCalendarSmall";
import { IconKettlebellSmall } from "../icons/IconKettlebellSmall";
import { IconWatch } from "../icons/IconWatch";
import { IconBackArrow } from "../icons/IconBackArrow";
import { MarkdownSimple } from "../MarkdownSimple";

interface IProps {
  dispatch: IDispatch;
  programs: IProgram[];
  programsIndex: IProgramIndexEntry[];
  settings: ISettings;
}

export function ScreenPrograms(props: IProps): React.ReactElement {
  const [search, setSearch] = useState("");
  const [filter] = useState<IProgramFilter>({});
  const [sort] = useState<IProgramSort>(undefined);

  useEffect(() => {
    if (props.programsIndex.length === 0) {
      props.dispatch(Thunk_fetchPrograms());
    }
  }, []);

  const searchLower = search.toLowerCase();
  const filtered = ProgramFilter_sort(ProgramFilter_filter(props.programsIndex, filter), sort);
  const entries = searchLower ? filtered.filter((e) => e.name.toLowerCase().includes(searchLower)) : filtered;

  const renderItem = ({ item }: { item: IProgramIndexEntry }): React.ReactElement => (
    <BuiltInProgramCard entry={item} settings={props.settings} programs={props.programs} dispatch={props.dispatch} />
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background-default">
      <View className="flex-row items-center px-2 py-3 border-b border-border-neutral">
        <Pressable className="px-2 py-1" onPress={() => props.dispatch(Thunk_pullScreen())}>
          <IconBackArrow />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-text-primary">Choose a program</Text>
      </View>

      <View className="px-4 pt-2 pb-2">
        <View className="relative flex-row items-center border rounded-lg border-border-neutral bg-background-default px-3">
          <IconMagnifyingGlass color={Tailwind_semantic().icon.neutralsubtle} size={16} />
          <TextInput
            className="flex-1 py-2 pl-2 text-sm text-text-primary"
            placeholder="Search by name"
            placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
            value={search}
            onChangeText={setSearch}
            style={{ fontSize: 15 }}
          />
        </View>
      </View>

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={
          <View className="px-6 py-8">
            <Text className="text-lg text-center text-text-secondarysubtle">
              {props.programsIndex.length === 0 ? "Loading programs..." : "No programs found"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

interface IBuiltInProgramCardProps {
  entry: IProgramIndexEntry;
  settings: ISettings;
  programs: IProgram[];
  dispatch: IDispatch;
}

function BuiltInProgramCard(props: IBuiltInProgramCardProps): React.ReactElement {
  const { entry, settings } = props;
  const exercises = entry.exercises ?? [];
  const allEquipment = Equipment_currentEquipment(settings);
  const equipment = (entry.equipment ?? []).map((e) => equipmentName(e, allEquipment));
  const exercisesRange = entry.exercisesRange;
  const numberOfWeeks = entry.weeksCount ?? 0;

  return (
    <Pressable
      className="flex-row items-center w-full p-3 mb-4 border rounded-lg bg-background-cardpurple border-border-cardpurple"
      onPress={() => {
        const program = props.programs.find((p) => p.id === entry.id);
        if (program) {
          Program_cloneProgram(props.dispatch, program, settings);
          if (Settings_doesProgramHaveUnset1RMs(program, settings)) {
            props.dispatch(Thunk_pushScreen("onerms", undefined, true));
          } else {
            props.dispatch(Thunk_pushScreen("main", undefined, true));
          }
        }
      }}
    >
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 mr-2 text-base font-bold text-text-primary">{entry.name}</Text>
          {entry.duration != null && (
            <View className="flex-row items-center">
              <IconWatch width={14} height={18} />
              <Text className="pl-1 text-sm text-text-primary">{entry.duration} mins</Text>
            </View>
          )}
        </View>
        {entry.shortDescription != null && (
          <MarkdownSimple value={entry.shortDescription} className="text-sm text-text-secondary" />
        )}
        <View className="flex-row py-3 flex-wrap">
          {exercises
            .filter((e) => ExerciseImageUtils_exists(e, "small"))
            .map((e) => (
              <ExerciseImage
                key={`${e.id}-${e.equipment}`}
                settings={settings}
                exerciseType={e}
                size="small"
                className="mr-1"
                width={24}
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
        {equipment.length > 0 && (
          <View className="flex-row items-center">
            <IconKettlebellSmall color={Tailwind_colors().lightgray[600]} className="mr-1" />
            <Text className="text-xs text-text-secondary">{equipment.join(", ")}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
