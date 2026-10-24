import { IGraph, IPlannerSettings, IScreenMuscle, IStorage } from "../types";
import { ObjectUtils_clone } from "../utils/object";
import {
  IFieldVersion,
  IVersionsObject,
  IVersionValue,
  isCollectionVersions,
  isFieldVersion,
} from "./versionTracker/types";
import { Muscle_groupsWithDefaultRange } from "./muscle";
import { MuscleRangePresets_frequency, MuscleRangePresets_range } from "./muscleRangePresets";

export const MuscleGroupSplit_legacyKeys = ["shoulders", "back", "forearms"];

const rangeSources: Record<string, IScreenMuscle[]> = {
  shoulders: ["frontDelts", "sideDelts", "rearDelts"],
  back: ["lats", "upperBack"],
};

const graphReplacements: Record<string, IScreenMuscle[]> = {
  shoulders: ["frontDelts", "sideDelts", "rearDelts"],
  back: ["lats", "upperBack", "lowerBack"],
  forearms: ["forearmFlexors", "forearmExtensors"],
};

// Every replica writes the same Moderate default, so they share one clock and any real edit is newer.
const defaultRangeClock = 1;

type IPlannerDictionaryField = "weeklyRangeSets" | "weeklyFrequency";

function versionsObject(value: IVersionValue | undefined): IVersionsObject | undefined {
  if (value == null || isFieldVersion(value) || isCollectionVersions(value)) {
    return undefined;
  }
  return value;
}

function ensureVersionsObject(parent: IVersionsObject | undefined, key: string): IVersionsObject | undefined {
  if (parent == null) {
    return undefined;
  }
  const existing = parent[key];
  if (existing == null) {
    const created: IVersionsObject = {};
    parent[key] = created;
    return created;
  }
  return versionsObject(existing);
}

function fieldVersions(storage: IStorage, field: IPlannerDictionaryField): IVersionsObject | undefined {
  const settings = ensureVersionsObject(storage._versions, "settings");
  const planner = ensureVersionsObject(settings, "planner");
  return ensureVersionsObject(planner, field);
}

function fieldVersion(versions: IVersionsObject | undefined, key: string): IFieldVersion | undefined {
  const value = versions?.[key];
  return isFieldVersion(value) ? value : undefined;
}

function copyLegacyValues<T>(
  values: Partial<Record<string, T>>,
  versions: IVersionsObject | undefined,
  defaultValue: T
): void {
  for (const legacyKey of Object.keys(rangeSources)) {
    const sourceValue = values[legacyKey];
    if (sourceValue == null) {
      continue;
    }
    const sourceVersion = fieldVersion(versions, legacyKey);
    for (const target of rangeSources[legacyKey]) {
      if (values[target] != null || versions?.[target] != null) {
        continue;
      }
      values[target] = ObjectUtils_clone(sourceValue);
      if (versions && sourceVersion != null) {
        versions[target] = ObjectUtils_clone(sourceVersion);
      }
    }
  }
  for (const muscleGroup of Muscle_groupsWithDefaultRange) {
    if (values[muscleGroup] != null || versions?.[muscleGroup] != null) {
      continue;
    }
    values[muscleGroup] = ObjectUtils_clone(defaultValue);
    if (versions) {
      versions[muscleGroup] = defaultRangeClock;
    }
  }
}

function migratePlanner(storage: IStorage, planner: IPlannerSettings): void {
  const defaultRange = MuscleRangePresets_range("moderate");
  copyLegacyValues(planner.weeklyRangeSets, fieldVersions(storage, "weeklyRangeSets"), defaultRange);
  copyLegacyValues(
    planner.weeklyFrequency,
    fieldVersions(storage, "weeklyFrequency"),
    MuscleRangePresets_frequency(defaultRange[1])
  );
}

function graphKey(graph: IGraph): string {
  return `${graph.type}:${graph.id}`;
}

export function MuscleGroupSplit_replaceGraphs(graphs: IGraph[]): IGraph[] {
  const seen = new Set(graphs.map(graphKey));
  const result: IGraph[] = [];
  for (const graph of graphs) {
    const replacements = graph.type === "muscleGroup" ? graphReplacements[graph.id] : undefined;
    if (!replacements) {
      result.push(graph);
      continue;
    }
    for (const id of replacements) {
      const replacement: IGraph = { vtype: "graph", type: "muscleGroup", id };
      if (!seen.has(graphKey(replacement))) {
        seen.add(graphKey(replacement));
        result.push(replacement);
      }
    }
  }
  return result;
}

function removeUndefinedLegacyGroups(storage: IStorage): void {
  const data = storage.settings.muscleGroups.data;
  for (const legacyKey of MuscleGroupSplit_legacyKeys) {
    if (data[legacyKey] != null && data[legacyKey]?.muscles == null) {
      delete data[legacyKey];
    }
  }
}

export function MuscleGroupSplit_migrate(aStorage: IStorage): IStorage {
  const storage = ObjectUtils_clone(aStorage);
  migratePlanner(storage, storage.settings.planner);
  storage.settings.graphs.graphs = MuscleGroupSplit_replaceGraphs(storage.settings.graphs.graphs);
  removeUndefinedLegacyGroups(storage);
  return storage;
}
