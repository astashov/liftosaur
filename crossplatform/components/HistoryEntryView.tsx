import type { JSX } from "react";
import { View, Text } from "react-native";
import { Equipment_getUnitOrDefaultForExerciseType } from "@shared/models/equipment";
import { Exercise_get, Exercise_nameWithEquipment } from "@shared/models/exercise";
import { Weight_roundConvertTo } from "@shared/models/weight";
import type { IHistoryEntry, ISettings } from "@shared/types";
import { ExerciseImage } from "./ExerciseImage";
import type { IHistoryEntryPersonalRecords } from "@shared/models/history";
import { HistoryRecordSetsView } from "./HistoryRecordSetsView";
import { ObjectUtils_values } from "@shared/utils/object";

interface IHistoryEntryProps {
  entry: IHistoryEntry;
  prs?: IHistoryEntryPersonalRecords;
  isOngoing?: boolean;
  isLast?: boolean;
  isNext: boolean;
  settings: ISettings;
  showNotes: boolean;
}

export function HistoryEntryView(props: IHistoryEntryProps): JSX.Element {
  const { entry, isNext, settings, showNotes, isOngoing, isLast } = props;
  const exercise = Exercise_get(entry.exercise, settings.exercises);
  const exerciseUnit = Equipment_getUnitOrDefaultForExerciseType(settings, exercise);
  const isPr = ObjectUtils_values(props.prs || {}).some((v) => v);
  return (
    <View data-cy="history-entry-exercise" className="flex-row items-center flex-1 gap-2">
      <View
        data-cy="history-entry-exercise-img"
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
          <View style={{ flex: 1 }}>
            <Text data-cy="history-entry-exercise-name" className="font-semibold">
              {Exercise_nameWithEquipment(exercise, props.settings)}
              {isPr && " \ud83c\udfc6"}
            </Text>
          </View>
          <View className="flex-1 text-right" style={{ alignItems: "flex-end" }}>
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
}
