import { View } from "react-native";
import { Equipment } from "../models/equipment";
import { Exercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { IHistoryEntry, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { LftText } from "./lftText";

interface IHistoryEntryProps {
  entry: IHistoryEntry;
  isNext: boolean;
  isLast?: boolean;
  settings: ISettings;
  showNotes: boolean;
}

export const HistoryEntryView = (props: IHistoryEntryProps): JSX.Element => {
  const { entry, isNext, isLast, settings, showNotes } = props;
  const exercise = Exercise.get(entry.exercise, settings.exercises);
  const exerciseUnit = Equipment.getUnitOrDefaultForExerciseType(settings, exercise);
  return (
    <View
      data-cy="history-entry-exercise"
      className={`flex flex-row items-center flex-1 py-1 ${!isLast ? "border-b border-grayv2-100" : ""}`}
    >
      <View data-cy="history-entry-exercise-img" className="flex flex-row" style={{ minWidth: 36 }}>
        <ExerciseImage settings={props.settings} className="w-10 h-12 mr-3" exerciseType={exercise} size="small" />
      </View>
      <View className="flex-1">
        <View className="flex flex-row items-center">
          <View className="pr-2" style={{ width: "50%" }}>
            <LftText data-cy="history-entry-exercise-name" className="font-bold">
              {Exercise.nameWithEquipment(exercise, props.settings)}
            </LftText>
          </View>
          <View className="flex-1">
            <HistoryRecordSetsView
              sets={entry.sets.map((set) => ({
                ...set,
                weight: isNext
                  ? Weight.roundConvertTo(set.weight, props.settings, exerciseUnit, entry.exercise)
                  : set.weight,
              }))}
              settings={props.settings}
              isNext={isNext}
            />
          </View>
        </View>
        {showNotes && entry.notes && <LftText className="mt-1 text-sm text-grayv2-main">{entry.notes}</LftText>}
      </View>
    </View>
  );
};
