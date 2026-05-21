import type { JSX } from "react";
import { View, Image } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryRecord, ISettings } from "../types";
import { ExerciseImage } from "./exerciseImage";
import { Exercise_toKey, Exercise_get } from "../models/exercise";
import {
  History_getPersonalRecords,
  History_workoutTime,
  History_totalRecordWeight,
  History_totalRecordReps,
  History_totalRecordSets,
} from "../models/history";
import { TimeUtils_formatHHMM } from "../utils/time";
import { ObjectUtils_keys } from "../utils/object";
import { StringUtils_pluralize } from "../utils/string";
import { HistoryRecordSetsView } from "./historyRecordSets";
import { HostConfig_resolveUrl } from "../utils/hostConfig";

interface IWorkoutShareOutputProps {
  record?: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
}

export function WorkoutShareOutput(props: IWorkoutShareOutputProps): JSX.Element {
  const { record, settings } = props;
  if (!record) {
    return <View />;
  }
  const allPrs = History_getPersonalRecords(props.history);
  const recordPrs = allPrs[record.id] ?? {};
  const numberOfRecordPrs = ObjectUtils_keys(recordPrs).length;
  const entries = record.entries.filter((e) => e.sets.filter((s) => (s.completedReps ?? 0) > 0).length > 0);
  const time = TimeUtils_formatHHMM(History_workoutTime(record));
  const totalWeight = History_totalRecordWeight(record, props.settings.units);
  const totalReps = History_totalRecordReps(record);
  const totalSets = History_totalRecordSets(record);
  return (
    <View>
      <View className="flex-row items-end">
        <View className="flex-row items-start gap-2 mx-2">
          <Image source={{ uri: HostConfig_resolveUrl("/images/icon512.png") }} className="w-6 h-6 rounded-md" />
          <Text className="text-lg font-bold text-white">Liftosaur</Text>
        </View>
        {numberOfRecordPrs > 0 && (
          <View className="pr-2 ml-auto items-end">
            <Text className="text-xl font-bold text-yellow-600">{`🏆 ${numberOfRecordPrs}`}</Text>
            <Text className="text-sm font-bold text-yellow-600">
              {`Personal ${StringUtils_pluralize("Record", numberOfRecordPrs)}`}
            </Text>
          </View>
        )}
      </View>
      <View className="p-2 m-2 rounded-lg bg-background-default">
        <Text className="text-base font-bold">{record.programName}</Text>
        <Text className="text-base">{record.dayName}</Text>
        <View className="flex-row justify-between mt-1">
          <Property name="Time" value={time} />
          <Property name="Volume" value={totalWeight.value} unit={totalWeight.unit} />
          <Property name="Sets" value={totalSets} />
          <Property name="Reps" value={totalReps} />
        </View>
      </View>
      <View className="flex-col gap-1 p-2 m-2 rounded-lg bg-background-default">
        {entries.map((entry) => {
          const prs = recordPrs[Exercise_toKey(entry.exercise)] ?? {};
          const hasPrs = ObjectUtils_keys(prs).length > 0;
          const exercise = Exercise_get(entry.exercise, settings.exercises);
          return (
            <View key={Exercise_toKey(entry.exercise)} className="flex-row items-center gap-4">
              <View className="w-12 h-12">
                <ExerciseImage
                  size="small"
                  className="w-full h-full"
                  suppressCustom={true}
                  exerciseType={exercise}
                  settings={settings}
                />
              </View>
              <View className="flex-1">
                <Text className="font-bold">{`${exercise.name}${hasPrs ? " 🏆" : ""}`}</Text>
              </View>
              <View className="items-end">
                <HistoryRecordSetsView sets={entry.sets} prs={prs} units={settings.units} isNext={false} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Property(props: { name: string; value: string | number; unit?: string }): JSX.Element {
  return (
    <View>
      <Text className="text-xs text-lightgray-600">{props.name}</Text>
      <View className="flex-row items-baseline">
        <Text className="text-xl font-bold">{`${props.value}`}</Text>
        {props.unit && <Text className="ml-1 text-sm">{props.unit}</Text>}
      </View>
    </View>
  );
}
