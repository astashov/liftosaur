import type { JSX } from "react";
import { View, ScrollView, Pressable } from "react-native";
import type { IHistoryRecord, ISettings } from "@shared/types";
import { Progress_getColorToSupersetGroup } from "@shared/models/progress";
import { WorkoutExerciseThumbnail } from "./WorkoutExerciseThumbnail";
import { IconPlus2 } from "./icons/IconPlus2";
import { IconArrowRight } from "./icons/IconArrowRight";
import { Tailwind_colors, Tailwind_semantic } from "@shared/utils/tailwindConfig";

interface IProps {
  progress: IHistoryRecord;
  settings: ISettings;
  enableReorder?: boolean;
  onClickThumbnail: (index: number) => void;
  onAddExercise: () => void;
  onMoveExercise?: (fromIndex: number, toIndex: number) => void;
}

export function WorkoutThumbnailStrip(props: IProps): JSX.Element {
  const colorToSupersetGroup = Progress_getColorToSupersetGroup(props.progress);
  const currentIndex = props.progress.ui?.currentEntryIndex ?? 0;
  const entryCount = props.progress.entries.length;
  const linkColor = Tailwind_semantic().text.link;
  const plusColor = Tailwind_colors().lightgray[600];

  return (
    <View className="border-b bg-background-default border-background-subtle" style={{ paddingVertical: 4 }}>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4, alignItems: "center", paddingHorizontal: 16 }}
      >
        {props.progress.entries.map((entry, index) => (
          <View key={entry.id} className="flex-row items-center">
            {props.enableReorder && index > 0 && (
              <Pressable
                accessibilityLabel={`Move exercise ${index + 1} left`}
                accessibilityRole="button"
                className="px-1 py-2"
                onPress={() => props.onMoveExercise?.(index, index - 1)}
              >
                <View style={{ transform: [{ rotate: "180deg" }] }}>
                  <IconArrowRight width={12} height={18} color={linkColor} />
                </View>
              </Pressable>
            )}
            <WorkoutExerciseThumbnail
              colorToSupersetGroup={colorToSupersetGroup}
              onClick={() => props.onClickThumbnail(index)}
              shouldShowProgress={true}
              selectedIndex={currentIndex}
              progress={props.progress}
              settings={props.settings}
              entry={entry}
              entryIndex={index}
            />
            {props.enableReorder && index < entryCount - 1 && (
              <Pressable
                accessibilityLabel={`Move exercise ${index + 1} right`}
                accessibilityRole="button"
                className="px-1 py-2"
                onPress={() => props.onMoveExercise?.(index, index + 1)}
              >
                <IconArrowRight width={12} height={18} color={linkColor} />
              </Pressable>
            )}
          </View>
        ))}
        <Pressable
          accessibilityLabel="Add exercise"
          accessibilityRole="button"
          className="p-2"
          data-cy="add-exercise-button"
          onPress={props.onAddExercise}
        >
          <IconPlus2 size={15} color={plusColor} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
