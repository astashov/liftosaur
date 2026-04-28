import { JSX, useCallback, useMemo } from "react";
import { View, Pressable, Alert, FlatList } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IEquipment, IHistoryRecord, IProgram, ISettings } from "../types";
import { IExercise, Exercise_find, Exercise_toKey } from "../models/exercise";
import { ExerciseImageUtils_exists } from "../models/exerciseImage";
import {
  Program_evaluate,
  Program_getAllUsedProgramExercises,
  Program_dayAverageTimeMs,
  Program_editAction,
  Program_selectProgram,
  Program_daysRange,
  Program_exerciseRange,
} from "../models/program";
import { CollectionUtils_sort, CollectionUtils_nonnull } from "../utils/collection";
import { ObjectUtils_values } from "../utils/object";
import { StringUtils_pluralize } from "../utils/string";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { ExerciseImage } from "./exerciseImage";
import { IconCalendarSmall } from "./icons/iconCalendarSmall";
import { IconKettlebellSmall } from "./icons/iconKettlebellSmall";
import { IconWatch } from "./icons/iconWatch";
import { TimeUtils_formatHHMM } from "../utils/time";
import { IconEditSquare } from "./icons/iconEditSquare";
import { IconTrash } from "./icons/iconTrash";
import { EditProgram_deleteProgram } from "../models/editProgram";

interface IProps {
  programs: IProgram[];
  progress?: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
  search?: string;
}

export function CustomProgramsList(props: IProps): JSX.Element {
  const searchLower = (props.search || "").toLowerCase();
  const programs = useMemo(() => {
    const sorted = CollectionUtils_sort(props.programs, (a, b) => a.name.localeCompare(b.name));
    return searchLower ? sorted.filter((p) => p.name.toLowerCase().includes(searchLower)) : sorted;
  }, [props.programs, searchLower]);

  const renderItem = useCallback(
    ({ item }: { item: IProgram }) => (
      <CustomProgram
        programs={programs}
        settings={props.settings}
        progress={props.progress}
        program={item}
        dispatch={props.dispatch}
      />
    ),
    [programs, props.settings, props.progress, props.dispatch]
  );

  const keyExtractor = useCallback((item: IProgram) => item.id, []);

  return (
    <FlatList
      data={programs}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      initialNumToRender={4}
      maxToRenderPerBatch={6}
      windowSize={5}
    />
  );
}

interface ICustomProgramProps {
  programs: IProgram[];
  program: IProgram;
  progress?: IHistoryRecord;
  editProgramId?: string;
  settings: ISettings;
  dispatch: IDispatch;
}

function CustomProgram(props: ICustomProgramProps): JSX.Element {
  const exerciseObj: Partial<Record<string, IExercise>> = {};
  const equipmentSet: Set<IEquipment | undefined> = new Set();
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const allExercises = Program_getAllUsedProgramExercises(evaluatedProgram);
  for (const ex of allExercises) {
    const exercise = Exercise_find(ex.exerciseType, props.settings.exercises);
    if (exercise) {
      exerciseObj[Exercise_toKey(ex.exerciseType)] = exercise;
      if (exercise.equipment !== "bodyweight") {
        equipmentSet.add(exercise.equipment);
      }
    }
  }
  const exercises = CollectionUtils_nonnull(ObjectUtils_values(exerciseObj));
  const equipment = CollectionUtils_nonnull(Array.from(equipmentSet));
  const time = Program_dayAverageTimeMs(evaluatedProgram, props.settings);
  const formattedTime = time > 0 ? TimeUtils_formatHHMM(time) : undefined;

  return (
    <View className="relative">
      <View
        className="absolute z-10 flex-row items-center gap-1 px-2 py-1 border rounded-full bg-background-subtle border-border-neutral"
        style={{ right: -12, top: -24 }}
      >
        <Pressable
          className="px-2 py-1"
          data-cy="custom-program-edit" data-testid="custom-program-edit"
          testID="custom-program-edit"
          onPress={() => {
            if (props.editProgramId == null || props.editProgramId !== props.program.id) {
              Program_editAction(props.dispatch, props.program);
            } else {
              Alert.alert("Cannot Edit", "You cannot edit the program while that program's workout is in progress");
            }
          }}
        >
          <IconEditSquare />
        </Pressable>
        <Pressable
          className="px-2 py-1"
          data-cy="custom-program-delete" data-testid="custom-program-delete"
          testID="custom-program-delete"
          onPress={() => {
            if (props.progress == null || props.progress.programId !== props.program.id) {
              Alert.alert("Delete Program", "Are you sure?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => EditProgram_deleteProgram(props.dispatch, props.program, props.programs),
                },
              ]);
            } else {
              Alert.alert("Cannot Delete", "You cannot delete the program while that program's workout is in progress");
            }
          }}
        >
          <IconTrash />
        </Pressable>
      </View>
      <Pressable
        className="flex-row items-center w-full p-3 mt-8 mb-4 border rounded-lg bg-background-cardyellow border-border-cardyellow"
        data-cy="program-list-choose-program" data-testid="program-list-choose-program"
        testID="program-list-choose-program"
        onPress={() => {
          if (props.program.planner == null) {
            Alert.alert("Not Supported", "Old-style programs are not supported anymore");
          } else {
            Program_selectProgram(props.dispatch, props.program.id);
          }
        }}
      >
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="flex-1 mr-2 text-base font-bold">{props.program.name}</Text>
            {formattedTime && (
              <View className="flex-row items-center">
                <IconWatch />
                <Text className="pl-1 text-sm">{formattedTime}h</Text>
              </View>
            )}
          </View>
          <View className="flex-row flex-wrap py-3">
            {exercises
              .filter((e) => ExerciseImageUtils_exists(e, "small"))
              .map((e) => (
                <ExerciseImage
                  key={Exercise_toKey(e)}
                  settings={props.settings}
                  exerciseType={e}
                  size="small"
                  className="w-6 mr-1"
                />
              ))}
          </View>
          <View className="flex-row mb-1 items-center">
            <IconCalendarSmall color={Tailwind_colors().lightgray[600]} className="mr-1" />
            <Text className="text-xs text-text-secondary">
              {evaluatedProgram.weeks.length > 1 &&
                `${evaluatedProgram.weeks.length} ${StringUtils_pluralize("week", evaluatedProgram.weeks.length)}, `}
              {Program_daysRange(evaluatedProgram)}, {Program_exerciseRange(evaluatedProgram)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <IconKettlebellSmall color={Tailwind_colors().lightgray[600]} className="mr-1" />
            <Text className="text-xs text-text-secondary">{equipment.join(", ")}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
