import { JSX, memo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Equipment_getUnitOrDefaultForExerciseType } from "../models/equipment";
import { Exercise_get, Exercise_nameWithEquipment } from "../models/exercise";
import { Weight_roundConvertTo } from "../models/weight";
import { IHistoryEntry, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { IHistoryEntryPersonalRecords } from "../models/history";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { ObjectUtils_values } from "../utils/object";

interface IHistoryEntryProps {
  entry: IHistoryEntry;
  prs?: IHistoryEntryPersonalRecords;
  isOngoing?: boolean;
  isLast?: boolean;
  isNext: boolean;
  settings: ISettings;
  showNotes: boolean;
}

export const HistoryEntryView = memo((props: IHistoryEntryProps): JSX.Element => {
  const { entry, isNext, settings, showNotes, isOngoing, isLast } = props;
  const exercise = Exercise_get(entry.exercise, settings.exercises);
  const exerciseUnit = Equipment_getUnitOrDefaultForExerciseType(settings, exercise);
  const isPr = ObjectUtils_values(props.prs || {}).some((v) => v);
  return (
    <View
      data-cy="history-entry-exercise"
      testID="history-entry-exercise"
      className="flex-row items-center flex-1 gap-2"
    >
      <View
        data-cy="history-entry-exercise-img"
        testID="history-entry-exercise-img"
        className="items-center justify-center py-1 my-1 rounded-lg bg-background-image"
        style={{ minWidth: 36 }}
      >
        <ExerciseImage settings={props.settings} className="w-8" exerciseType={exercise} size="small" />
      </View>
      <View
        className={`flex-1 py-2 ${
          !isLast
            ? `border-b ${isNext ? (isOngoing ? "border-border-cardyellow" : "border-border-cardpurple") : "border-border-neutral"}`
            : ""
        }`}
      >
        <View className="flex-row items-center gap-2 min-h-8">
          <View className="flex-1 flex-shrink">
            <Text data-cy="history-entry-exercise-name" testID="history-entry-exercise-name" className="font-semibold">
              {Exercise_nameWithEquipment(exercise, props.settings)}
              {isPr && " \u{1F3C6}"}
            </Text>
          </View>
          <View>
            <HistoryRecordSetsView
              sets={entry.sets.map((set) => ({
                ...set,
                weight:
                  isNext && set.weight
                    ? Weight_roundConvertTo(set.weight, props.settings, exerciseUnit, entry.exercise)
                    : set.weight,
              }))}
              prs={props.prs}
              settings={props.settings}
              isNext={isNext}
            />
          </View>
        </View>
        {showNotes && entry.notes && <Text className="mt-1 text-sm text-text-secondary">{entry.notes}</Text>}
      </View>
    </View>
  );
});
