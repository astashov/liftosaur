import {
  IHistoryRecord,
  ICustomExercise,
  ISettings,
  IHistoryEntry,
  availableMuscles,
  IMuscle,
  IExerciseType,
  VHistoryRecord,
} from "../types";
import Papa from "papaparse";
import { CollectionUtils_groupByKey, CollectionUtils_compact, CollectionUtils_sortBy } from "./collection";
import { ObjectUtils_values } from "./object";
import { Exercise_findByNameAndEquipment, Exercise_getIsUnilateral } from "../models/exercise";
import { Weight_build } from "../models/weight";
import { StringUtils_dashcase } from "./string";
import { Progress_getEntryId } from "../models/progress";
import { UidFactory_generateUid } from "./generator";
import { History_generateId } from "../models/history";
import { Storage_validate } from "../models/storage";
import {
  IImportResult,
  IImportRowError,
  ImportFileError,
  ImportUtils_detectCsvKind,
  ImportUtils_isSuspiciousReps,
  ImportUtils_isSuspiciousTimestamp,
  ImportUtils_isSuspiciousWeight,
} from "./importTypes";

const columns = [
  "workoutDateTime",
  "program",
  "dayname",
  "exercise",
  "isWarmupSet",
  "requiredReps",
  "completedReps",
  "isAmrap",
  "rpe",
  "completedRpe",
  "logRpe",
  "weightValue",
  "weightUnit",
  "completedWeightValue",
  "completedWeightUnit",
  "askWeight",
  "completedRepsTime",
  "targetMuscles",
  "synergistMuscles",
  "notes",
] as const;
type IColumn = (typeof columns)[number];

interface ILiftosaurRecord extends Record<IColumn, string> {
  row: number;
}

const numericColumns: IColumn[] = [
  "requiredReps",
  "completedReps",
  "rpe",
  "completedRpe",
  "weightValue",
  "completedWeightValue",
];
const unitColumns: IColumn[] = ["weightUnit", "completedWeightUnit"];

function parseTimestamp(date: string): number | undefined {
  try {
    const value = new Date(date).getTime();
    return isNaN(value) ? undefined : value;
  } catch (e) {
    return undefined;
  }
}

function validateRecord(record: ILiftosaurRecord): IImportRowError | undefined {
  if (parseTimestamp(record.workoutDateTime) == null) {
    return {
      row: record.row,
      column: "Workout DateTime",
      value: record.workoutDateTime,
      message: `"${record.workoutDateTime}" is not a valid date`,
    };
  }
  for (const column of numericColumns) {
    const value = record[column];
    if (value && isNaN(Number(value))) {
      return { row: record.row, column, value, message: `"${value}" is not a number` };
    }
  }
  for (const column of unitColumns) {
    const value = record[column];
    if (value && value !== "kg" && value !== "lb") {
      return { row: record.row, column, value, message: `"${value}" is not a valid unit (expected "kg" or "lb")` };
    }
  }
  return undefined;
}

function collectWarnings(record: ILiftosaurRecord, warnings: IImportRowError[]): void {
  const timestamp = parseTimestamp(record.workoutDateTime);
  if (timestamp != null && ImportUtils_isSuspiciousTimestamp(timestamp)) {
    warnings.push({
      row: record.row,
      column: "Workout DateTime",
      value: record.workoutDateTime,
      message: `"${record.workoutDateTime}" looks like an implausible workout date`,
    });
  }
  for (const [valueColumn, unitColumn] of [
    ["weightValue", "weightUnit"],
    ["completedWeightValue", "completedWeightUnit"],
  ] as const) {
    const value = record[valueColumn];
    const unit = record[unitColumn];
    if (value && (unit === "kg" || unit === "lb") && ImportUtils_isSuspiciousWeight(Number(value), unit)) {
      warnings.push({
        row: record.row,
        column: valueColumn,
        value,
        message: `${value} ${unit} looks like an implausible weight`,
      });
    }
  }
  for (const column of ["requiredReps", "completedReps"] as const) {
    const value = record[column];
    if (value && !isNaN(Number(value)) && ImportUtils_isSuspiciousReps(Number(value))) {
      warnings.push({ row: record.row, column, value, message: `${value} looks like an implausible rep count` });
    }
  }
  if (record.completedRepsTime && parseTimestamp(record.completedRepsTime) == null) {
    warnings.push({
      row: record.row,
      column: "Completed Reps Time",
      value: record.completedRepsTime,
      message: `"${record.completedRepsTime}" is not a valid time, using the workout date instead`,
    });
  }
}

export function ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(
  liftosaurCsvRaw: string,
  settings: ISettings
): IImportResult {
  const parsed = Papa.parse<string[]>(liftosaurCsvRaw, { skipEmptyLines: true });
  const rows = parsed.data;
  if (rows.length < 2) {
    throw new ImportFileError("The file has no workout rows");
  }
  const kind = ImportUtils_detectCsvKind(rows[0].map((h) => `${h}`));
  if (kind === "hevy") {
    throw new ImportFileError(
      'This looks like a Hevy export. Use "Import history from other apps" in Settings instead.'
    );
  }
  if (kind !== "liftosaur") {
    throw new ImportFileError(
      "This doesn't look like a Liftosaur history CSV - the header row doesn't match the format of " +
        '"Export history to CSV file".'
    );
  }

  const liftosaurRecords = rows.slice(1).map<ILiftosaurRecord>((cells, i) => {
    const record = { row: i + 2 } as ILiftosaurRecord;
    columns.forEach((column, columnIndex) => {
      record[column] = `${cells[columnIndex] ?? ""}`;
    });
    return record;
  });

  const errors: IImportRowError[] = [];
  const warnings: IImportRowError[] = [];
  const validRecords: ILiftosaurRecord[] = [];
  for (const record of liftosaurRecords) {
    const error = validateRecord(record);
    if (error) {
      errors.push(error);
    } else {
      collectWarnings(record, warnings);
      validRecords.push(record);
    }
  }
  if (validRecords.length < liftosaurRecords.length / 2) {
    throw new ImportFileError(
      `${errors.length} of ${liftosaurRecords.length} rows failed to parse - this doesn't look like a valid Liftosaur history CSV.`
    );
  }

  const groupedRecords = CollectionUtils_groupByKey(validRecords, "workoutDateTime");
  const customExercises: Record<string, ICustomExercise> = {};
  const historyRecords = CollectionUtils_compact(ObjectUtils_values(groupedRecords)).map((records) => {
    const rawEntries = CollectionUtils_compact(ObjectUtils_values(CollectionUtils_groupByKey(records, "exercise")));
    const entries = rawEntries.map((rawSets, index) => {
      const firstSet = rawSets[0];
      const exerciseName = firstSet.exercise || "Unknown";
      const exercise = Exercise_findByNameAndEquipment(exerciseName, settings.exercises);
      let exerciseId: string;
      let exerciseEquipment: string | undefined = undefined;
      if (exercise) {
        exerciseId = exercise.id;
        exerciseEquipment = exercise.equipment;
      } else {
        const id = StringUtils_dashcase(exerciseName || "exercise");
        customExercises[id] = {
          vtype: "custom_exercise",
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
      const exerciseType: IExerciseType = { id: exerciseId, equipment: exerciseEquipment };
      const isUnilateral = Exercise_getIsUnilateral(exerciseType, settings);

      const buildSet = (set: ILiftosaurRecord, i: number): IHistoryEntry["sets"][number] => {
        const weight =
          set.weightValue && set.weightUnit
            ? Weight_build(Number(set.weightValue), set.weightUnit as "kg" | "lb")
            : undefined;
        const completedReps = set.completedReps ? Number(set.completedReps) : undefined;
        const completedWeight =
          set.completedWeightValue && set.completedWeightUnit
            ? Weight_build(Number(set.completedWeightValue), set.completedWeightUnit as "kg" | "lb")
            : undefined;
        const completedRpe = set.completedRpe ? Number(set.completedRpe) : undefined;
        return {
          vtype: "set",
          id: UidFactory_generateUid(6),
          index: i,
          reps: set.requiredReps ? Number(set.requiredReps) : undefined,
          completedReps: completedReps,
          isAmrap: set.isAmrap === "1",
          rpe: set.rpe ? Number(set.rpe) : undefined,
          completedRpe: completedRpe,
          completedRepsLeft: isUnilateral ? completedReps : undefined,
          isUnilateral,
          logRpe: set.logRpe === "1",
          weight: weight,
          originalWeight: weight,
          completedWeight: completedWeight,
          askWeight: set.askWeight === "1",
          label: "",
          timestamp: parseTimestamp(set.completedRepsTime) ?? parseTimestamp(set.workoutDateTime),
          isCompleted: completedReps != null || completedWeight != null || completedRpe != null,
        };
      };

      const entry: IHistoryEntry = {
        vtype: "history_entry",
        id: Progress_getEntryId(exerciseType, UidFactory_generateUid(3)),
        exercise: exerciseType,
        index,
        warmupSets: rawWarmupSets.map(buildSet),
        sets: rawWorkoutSets.map(buildSet),
        notes: firstSet.notes,
      };
      return entry;
    });
    const firstRecord = records[0];
    let endTime = CollectionUtils_sortBy(
      CollectionUtils_compact(entries.flatMap((e) => e.warmupSets.concat(e.sets)).map((s) => s.timestamp)).map((t) => ({
        t,
      })),
      "t",
      true
    )[0]?.t;
    const startTime = parseTimestamp(firstRecord.workoutDateTime)!;
    if (endTime == null || endTime < startTime) {
      endTime = startTime;
    }
    const historyRecord: IHistoryRecord = {
      vtype: "history_record",
      date: new Date(startTime).toISOString(),
      day: 1,
      dayName: `${firstRecord.dayname}` || "Workout",
      programName: `${firstRecord.program}` || "CSV Import",
      intervals: [[startTime, endTime]],
      entries,
      id: History_generateId(endTime ?? startTime),
      programId: StringUtils_dashcase(firstRecord.program || "csv"),
      startTime: startTime,
      dayInWeek: 1,
      endTime: endTime,
      notes: "",
    };
    const validation = Storage_validate(historyRecord, VHistoryRecord, "historyRecord");
    if (!validation.success) {
      errors.push({
        row: firstRecord.row,
        message: `Workout "${firstRecord.workoutDateTime}" failed validation: ${validation.error.join("; ")}`,
      });
      return undefined;
    }
    return historyRecord;
  });

  return { historyRecords: CollectionUtils_compact(historyRecords), customExercises, errors, warnings };
}
