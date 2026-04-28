import { JSX, useState, useMemo, useCallback } from "react";
import { View, TextInput, Pressable, FlatList, ListRenderItem } from "react-native";
import { Text } from "../primitives/text";
import { ISettings } from "../../types";
import { IExercise, Exercise_allExpanded, Exercise_toKey } from "../../models/exercise";
import { Tailwind_colors, Tailwind_semantic } from "../../utils/tailwindConfig";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { StringUtils_fuzzySearch } from "../../utils/string";
import { ExercisePickerExerciseItem } from "./exercisePickerExerciseItem";
import { BottomSheetOrModal } from "../bottomSheetOrModal";
import { SheetDragHandle } from "../../navigation/SheetScreenContainer";

interface IProps {
  isHidden: boolean;
  showMuscles: boolean;
  settings: ISettings;
  onSelect: (exercise: IExercise) => void;
  onClose: () => void;
}

export type IExerciseCloneLibraryContentProps = Omit<IProps, "isHidden"> & { bare?: boolean };

export function ExerciseCloneLibraryContent(props: IExerciseCloneLibraryContentProps): JSX.Element {
  const [search, setSearch] = useState<string>("");
  const trimmedSearch = search.trim().toLowerCase();
  const exercises = useMemo(() => {
    let result = !trimmedSearch
      ? Exercise_allExpanded(props.settings.exercises)
      : Exercise_allExpanded(props.settings.exercises).filter((e) => {
          return StringUtils_fuzzySearch(trimmedSearch, e.name.toLowerCase());
        });
    result = result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [trimmedSearch, props.settings.exercises]);

  const keyExtractor = useCallback((e: IExercise) => Exercise_toKey(e), []);
  const renderItem: ListRenderItem<IExercise> = useCallback(
    ({ item: ex }) => (
      <Pressable onPress={() => props.onSelect(ex)}>
        <ExercisePickerExerciseItem isEnabled={true} showMuscles={true} settings={props.settings} exercise={ex} />
      </Pressable>
    ),
    [props.onSelect, props.settings]
  );

  const header = (
    <SheetDragHandle>
      <View collapsable={false} className="px-4 pb-2">
        <Text className="pt-1 pb-3 text-base font-semibold text-center">Pick Exercise To Clone From</Text>
        <View className="flex-row items-center gap-2 p-2 rounded-lg bg-background-neutral">
          <IconMagnifyingGlass size={18} color={Tailwind_colors().lightgray[600]} />
          <TextInput
            placeholder="Search by name"
            placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
            className="flex-1 text-sm text-text-secondary"
            data-cy="exercise-filter-by-name" data-testid="exercise-filter-by-name"
            testID="exercise-filter-by-name"
            defaultValue={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
    </SheetDragHandle>
  );
  const list = (
    <FlatList
      data={exercises}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
    />
  );
  if (props.bare) {
    return (
      <>
        {header}
        {list}
      </>
    );
  }
  return (
    <View className="flex-1">
      {header}
      {list}
    </View>
  );
}

export function BottomSheetExerciseCloneLibrary(props: IProps): JSX.Element {
  return (
    <BottomSheetOrModal isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
      <ExerciseCloneLibraryContent
        showMuscles={props.showMuscles}
        settings={props.settings}
        onSelect={props.onSelect}
        onClose={props.onClose}
      />
    </BottomSheetOrModal>
  );
}
