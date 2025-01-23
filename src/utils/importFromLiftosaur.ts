import { IHistoryRecord, ICustomExercise, ISettings, IHistoryEntry, availableMuscles, IMuscle } from "../types";
import Papa from "papaparse";
import { CollectionUtils } from "./collection";
import { ObjectUtils } from "./object";
import { Exercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { StringUtils } from "./string";

interface ILiftosaurRecord {
  workoutDateTime: string;
  program: string;
  dayname: string;
  exercise: string;
  equipment: string;
  isWarmupSet: string;
  requiredReps: string;
  completedReps: string;
  rpe: string;
  isAmrap: string;
  weightValue: string;
  weightUnit: string;
  completedRepsTime: string;
  targetMuscles: string;
  synergistMuscles: string;
  notes: string;
}

function getNumber(str: string): number {
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function getTimestamp(date: string): number {
  try {
    const value = new Date(date).getTime();
    return isNaN(value) ? Date.now() : value;
  } catch (e) {
    return Date.now();
  }
}

function getUnit(val: string): "kg" | "lb" {
  if (val === "kg" || val === "lb") {
    return val;
  } else {
    return "lb";
  }
}

export class ImportFromLiftosaur {
  public static convertLiftosaurCsvToHistoryRecords(
    liftosaurCsvRaw: string,
    settings: ISettings
  ): {
    historyRecords: IHistoryRecord[];
    customExercises: Record<string, ICustomExercise>;
  } {
    const liftosaurRecords = Papa.parse<ILiftosaurRecord>(liftosaurCsvRaw, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (_, i) => {
        const keys: (keyof ILiftosaurRecord)[] = [
          "workoutDateTime",
          "program",
          "dayname",
          "exercise",
          "isWarmupSet",
          "requiredReps",
          "completedReps",
          "rpe",
          "isAmrap",
          "weightValue",
          "weightUnit",
          "completedRepsTime",
          "targetMuscles",
          "synergistMuscles",
          "notes",
        ];
        return keys[i];
      },
    }).data;

    const groupedRecords = CollectionUtils.groupByKey(liftosaurRecords, "workoutDateTime");
    const customExercises: Record<string, ICustomExercise> = {};
    const historyRecords = CollectionUtils.compact(ObjectUtils.values(groupedRecords)).map((records) => {
      const rawEntries = CollectionUtils.compact(ObjectUtils.values(CollectionUtils.groupByKey(records, "exercise")));
      const entries = rawEntries.map((rawSets) => {
        const firstSet = rawSets[0];
        const exerciseName = firstSet.exercise || "Unknown";
        const exercise = Exercise.findByNameAndEquipment(exerciseName, settings.exercises);
        let exerciseId: string;
        let exerciseEquipment: string | undefined = undefined;
        if (exercise) {
          exerciseId = exercise.id;
          exerciseEquipment = exercise.equipment;
        } else {
          const id = StringUtils.dashcase(exerciseName || "exercise");
          customExercises[id] = {
            id,
            name: exerciseName,
            isDeleted: false,
            meta: {
              bodyParts: [],
              targetMuscles: ((firstSet.targetMuscles || "")
                .split(",")
                .filter((m) => availableMuscles.indexOf(m as IMuscle) !== -1) || []) as IMuscle[],
              synergistMuscles: ((firstSet.synergistMuscles || "")
                .split(",")
                .filter((m) => availableMuscles.indexOf(m as IMuscle) !== -1) || []) as IMuscle[],
              sortedEquipment: [],
            },
            types: [],
          };
          exerciseId = id;
        }

        const rawWarmupSets = rawSets.filter((set) => set.isWarmupSet === "1");
        const rawWorkoutSets = rawSets.filter((set) => set.isWarmupSet !== "1");

        const entry: IHistoryEntry = {
          exercise: { id: exerciseId, equipment: exerciseEquipment },
          warmupSets: rawWarmupSets.map((set) => ({
            reps: getNumber(set.requiredReps),
            weight: Weight.build(getNumber(set.weightValue), getUnit(set.weightUnit)),
            originalWeight: Weight.build(getNumber(set.weightValue), getUnit(set.weightUnit)),
            completedReps: set.completedReps ? getNumber(set.completedReps) : undefined,
            completedRpe: set.rpe ? getNumber(set.rpe) : undefined,
            isAmrap: set.isAmrap === "1",
            label: "",
            timestamp: getTimestamp(set.completedRepsTime) || getTimestamp(set.workoutDateTime),
          })),
          sets: rawWorkoutSets.map((set) => ({
            reps: getNumber(set.requiredReps ?? 0),
            weight: Weight.build(getNumber(set.weightValue ?? 0), getUnit(set.weightUnit)),
            originalWeight: Weight.build(getNumber(set.weightValue ?? 0), getUnit(set.weightUnit)),
            completedReps: set.completedReps ? getNumber(set.completedReps) : undefined,
            completedRpe: set.rpe ? getNumber(set.rpe) : undefined,
            isAmrap: set.isAmrap === "1",
            label: "",
            timestamp: getTimestamp(set.completedRepsTime) || getTimestamp(set.workoutDateTime),
          })),
          notes: firstSet.notes,
        };
        return entry;
      });
      const firstRecord = records[0];
      let endTime = CollectionUtils.sortBy(
        entries.flatMap((e) => e.warmupSets.concat(e.sets)).map((s) => ({ t: getNumber(`${s.timestamp}` || "0") })),
        "t",
        true
      )[0]?.t;
      const startTime = getTimestamp(firstRecord.workoutDateTime);
      if (endTime == null || endTime < startTime) {
        endTime = startTime;
      }
      const historyRecord: IHistoryRecord = {
        date: new Date(startTime).toISOString(),
        day: 1,
        dayName: `${firstRecord.dayname}` || "Workout",
        programName: `${firstRecord.program}` || "CSV Import",
        intervals: [[startTime, endTime]],
        entries,
        id: startTime,
        programId: StringUtils.dashcase(firstRecord.program || "csv"),
        startTime: startTime,
        dayInWeek: 1,
        endTime: endTime,
        notes: "",
      };
      return historyRecord;
    });

    return { historyRecords, customExercises };
  }
}
