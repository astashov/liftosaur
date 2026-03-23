import React, { useCallback, useRef } from "react";
import { View, FlatList, Pressable } from "react-native";
import type { IHistoryRecord, IHistoryEntry, ISettings } from "@shared/types";
import { Progress_getColorToSupersetGroup } from "@shared/models/progress";
import { WorkoutExerciseThumbnail } from "./WorkoutExerciseThumbnail";
import { IconPlus2 } from "./icons/IconPlus2";
import { Tailwind_colors } from "@shared/utils/tailwindConfig";

interface IProps {
  progress: IHistoryRecord;
  settings: ISettings;
  onClickThumbnail: (index: number) => void;
  onAddExercise: () => void;
}

export function WorkoutThumbnailStrip(props: IProps): React.ReactElement {
  const flatListRef = useRef<FlatList>(null);
  const colorToSupersetGroup = Progress_getColorToSupersetGroup(props.progress);
  const currentIndex = props.progress.ui?.currentEntryIndex ?? 0;

  const renderItem = useCallback(
    ({ item, index }: { item: IHistoryEntry; index: number }) => (
      <WorkoutExerciseThumbnail
        colorToSupersetGroup={colorToSupersetGroup}
        onClick={() => props.onClickThumbnail(index)}
        shouldShowProgress={true}
        selectedIndex={currentIndex}
        progress={props.progress}
        settings={props.settings}
        entry={item}
        entryIndex={index}
      />
    ),
    [colorToSupersetGroup, currentIndex, props.progress, props.settings]
  );

  return (
    <View className="border-b bg-background-default border-background-subtle" style={{ paddingVertical: 4 }}>
      <View className="flex-row items-center px-4">
        <FlatList
          ref={flatListRef}
          data={props.progress.entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4, alignItems: "center" }}
          ListFooterComponent={
            <Pressable
              className="p-2 nm-add-exercise-to-workout"
              data-cy="add-exercise-button"
              onPress={props.onAddExercise}
            >
              <IconPlus2 size={15} color={Tailwind_colors().lightgray[600]} />
            </Pressable>
          }
        />
      </View>
    </View>
  );
}
