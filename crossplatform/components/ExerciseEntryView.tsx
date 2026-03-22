import React from "react";
import { View, Text, Image } from "react-native";
import { Exercise_get, Exercise_nameWithEquipment } from "@shared/models/exercise";
import { ExerciseImageUtils_url } from "@shared/models/exerciseImage";
import { Reps_group, Reps_setToDisplaySet, IDisplaySet } from "@shared/models/set";
import type { IHistoryEntry, ISettings } from "@shared/types";

const IMAGE_BASE = "https://www.liftosaur.com";

function groupDisplaySets(displaySets: IDisplaySet[]): IDisplaySet[][] {
  const groups: IDisplaySet[][] = [[]];
  for (const set of displaySets) {
    const lastGroup = groups[groups.length - 1];
    const last = lastGroup[lastGroup.length - 1];
    if (last && !isSameDisplaySet(last, set)) {
      groups.push([]);
    }
    groups[groups.length - 1].push(set);
  }
  return groups;
}

function isSameDisplaySet(a: IDisplaySet, b: IDisplaySet): boolean {
  return (
    a.reps === b.reps && a.weight === b.weight && a.rpe === b.rpe && a.askWeight === b.askWeight && a.timer === b.timer
  );
}

function SetGroupLine({ sets }: { sets: IDisplaySet[] }): React.ReactElement {
  const set = sets[0];
  if (!set) {
    return <View />;
  }
  return (
    <Text style={{ fontSize: 14, textAlign: "right" }}>
      {sets.length > 1 && (
        <>
          <Text className="font-semibold text-text-purple">{sets.length}</Text>
          <Text className="text-text-secondary">{" × "}</Text>
        </>
      )}
      <Text className="font-semibold text-text-secondary">{set.reps}</Text>
      {set.weight && (
        <>
          <Text className="text-text-secondary">{" × "}</Text>
          <Text className="font-semibold">{set.weight}</Text>
          <Text className="text-xs text-text-secondary">{set.unit}</Text>
        </>
      )}
    </Text>
  );
}

interface IExerciseEntryViewProps {
  entry: IHistoryEntry;
  settings: ISettings;
  isLast: boolean;
}

export function ExerciseEntryView({ entry, settings, isLast }: IExerciseEntryViewProps): React.ReactElement {
  const exercise = Exercise_get(entry.exercise, settings.exercises);
  const name = Exercise_nameWithEquipment(exercise, settings);
  const imageUrl = ExerciseImageUtils_url(entry.exercise, "small", settings);

  const setGroups = Reps_group(entry.sets, true);
  const displayGroups = setGroups.map((g) => g.map((s) => Reps_setToDisplaySet(s, true, settings)));
  const grouped = displayGroups.map((g) => groupDisplaySets(g)).flat();

  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      className={isLast ? "" : "border-b border-border-cardpurple"}
    >
      <View
        className="bg-background-image"
        style={{
          minWidth: 36,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 4,
          marginVertical: 4,
          borderRadius: 8,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: `${IMAGE_BASE}${imageUrl}` }}
            style={{ width: 32, height: 48 }}
            resizeMode="contain"
          />
        ) : null}
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-semibold text-text-primary" numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {grouped.map((g, i) => (
            <SetGroupLine key={i} sets={g} />
          ))}
        </View>
      </View>
    </View>
  );
}
