import { IHistoryRecord, ICustomExercise, ISettings, IWeight, VHistoryRecord } from "../types";
import Papa from "papaparse";
import { CollectionUtils_compact, CollectionUtils_groupByKey } from "./collection";
import { ObjectUtils_values } from "./object";
import { Exercise_findByName, Exercise_getIsUnilateral } from "../models/exercise";
import { Weight_build } from "../models/weight";
import { UidFactory_generateUid } from "./generator";
import { Progress_getEntryId } from "../models/progress";
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

const exerciseMapping: Partial<Record<string, [string, string | undefined]>> = {
  "21s Bicep Curl": ["Bicep Curl", "barbell"],
  "Ab Wheel": ["Ab Wheel", "bodyweight"],
  "Arnold Press (Dumbbell)": ["Arnold Press", "dumbbell"],
  "Assisted Pistol Squats": ["Pistol Squat", "bodyweight"],
  "Back Extension (Hyperextension)": ["Back Extension", "bodyweight"],
  "Back Extension (Machine)": ["Back Extension", "leverageMachine"],
  "Ball Slams": ["Ball Slams", "medicineball"],
  "Bench Dip": ["Bench Dip", "bodyweight"],
  "Bench Press - Close Grip (Barbell)": ["Bench Press Close Grip", "barbell"],
  "Bench Press - Wide Grip (Barbell)": ["Bench Press Wide Grip", "barbell"],
  "Bench Press (Barbell)": ["Bench Press", "barbell"],
  "Bench Press (Cable)": ["Chest Press", "cable"],
  "Bench Press (Dumbbell)": ["Chest Press", "dumbbell"],
  "Bench Press (Smith Machine)": ["Chest Press", "smith"],
  "Bent Over Row (Band)": ["Bent Over Row", "band"],
  "Bent Over Row (Barbell)": ["Bent Over Row", "barbell"],
  "Bent Over Row (Dumbbell)": ["Bent Over One Arm Row", "dumbbell"],
  "Bicep Curl (Barbell)": ["Bicep Curl", "barbell"],
  "Bicep Curl (Cable)": ["Bicep Curl", "cable"],
  "Bicep Curl (Dumbbell)": ["Bicep Curl", "dumbbell"],
  "Bicycle Crunch": ["Bicycle Crunch", "bodyweight"],
  "Box Jump": ["Box Jump", "bodyweight"],
  "Box Squat (Barbell)": ["Box Squat", "barbell"],
  "Bulgarian Split Squat": ["Bulgarian Split Squat", "bodyweight"],
  Burpee: ["Burpee", "bodyweight"],
  "Butterfly (Pec Deck)": ["Pec Deck", "leverageMachine"],
  "Cable Crunch": ["Cable Crunch", "cable"],
  "Cable Pull Through": ["Cable Pull Through", "cable"],
  "Cable Twist (Down to up)": ["Cable Twist", "cable"],
  "Cable Twist (Up to down)": ["Cable Twist", "cable"],
  "Calf Press (Machine)": ["Calf Press on Seated Leg Press", "leverageMachine"],
  "Chest Dip": ["Chest Dip", "bodyweight"],
  "Chest Fly (Band)": ["Chest Fly", "band"],
  "Chest Fly (Dumbbell)": ["Chest Fly", "dumbbell"],
  "Chest Fly (Machine)": ["Chest Fly", "leverageMachine"],
  "Chest Press (Band)": ["Chest Press", "band"],
  "Chest Press (Machine)": ["Chest Press", "leverageMachine"],
  "Chest Supported Incline Row (Dumbbell)": ["Incline Row", "dumbbell"],
  "Chin Up": ["Chin Up", "bodyweight"],
  Clamshell: ["Side Lying Clam", "bodyweight"],
  Clean: ["Clean", "barbell"],
  "Clean and Jerk": ["Clean and Jerk", "barbell"],
  "Concentration Curl": ["Concentration Curl", "dumbbell"],
  Crunch: ["Crunch", "bodyweight"],
  "Crunch (Machine)": ["Crunch", "leverageMachine"],
  "Curtsy Lunge (Dumbbell)": ["Lunge", "dumbbell"],
  "Deadlift (Band)": ["Deadlift", "band"],
  "Deadlift (Barbell)": ["Deadlift", "barbell"],
  "Deadlift (Dumbbell)": ["Deadlift", "dumbbell"],
  "Deadlift (Smith Machine)": ["Deadlift", "smith"],
  "Deadlift (Trap bar)": ["Trap Bar Deadlift", "trapbar"],
  "Deadlift High Pull": ["Deadlift High Pull", "barbell"],
  "Decline Bench Press (Barbell)": ["Decline Bench Press", "barbell"],
  "Decline Bench Press (Dumbbell)": ["Decline Bench Press", "dumbbell"],
  "Decline Bench Press (Machine)": ["Decline Bench Press", "leverageMachine"],
  "Decline Bench Press (Smith Machine)": ["Decline Bench Press", "smith"],
  "Decline Chest Fly (Dumbbell)": ["Chest Fly", "dumbbell"],
  "Decline Crunch": ["Decline Crunch", "bodyweight"],
  "Dumbbell Row": ["Bent Over One Arm Row", "dumbbell"],
  "Dumbbell Step Up": ["Step up", "dumbbell"],
  "EZ Bar Biceps Curl": ["Bicep Curl", "ezbar"],
  "Face Pull": ["Face Pull", "cable"],
  "Front Raise (Band)": ["Front Raise", "band"],
  "Front Raise (Barbell)": ["Front Raise", "barbell"],
  "Front Raise (Cable)": ["Front Raise", "cable"],
  "Front Raise (Dumbbell)": ["Front Raise", "dumbbell"],
  "Front Squat": ["Front Squat", "barbell"],
  "Full Squat": ["Squat", "barbell"],
  "Glute Bridge": ["Glute Bridge", "bodyweight"],
  "Glute Kickback (Machine)": ["Cable Kickback", "cable"],
  "Goblet Squat": ["Goblet Squat", "kettlebell"],
  "Good Morning (Barbell)": ["Good Morning", "barbell"],
  "Hack Squat": ["Hack Squat", "barbell"],
  "Hack Squat (Machine)": ["Hack Squat", "leverageMachine"],
  "Hammer Curl (Band)": ["Hammer Curl", "band"],
  "Hammer Curl (Cable)": ["Hammer Curl", "cable"],
  "Hammer Curl (Dumbbell)": ["Hammer Curl", "dumbbell"],
  "Handstand Push Up": ["Handstand Push Up", "bodyweight"],
  "Hang Clean": ["Hang Clean", "barbell"],
  "Hang Snatch": ["Hang Snatch", "barbell"],
  "Hanging Leg Raise": ["Hanging Leg Raise", "bodyweight"],
  "High Knee Skips": ["High Knee Skips", "bodyweight"],
  "Hip Abduction (Machine)": ["Hip Abductor", "leverageMachine"],
  "Hip Thrust": ["Hip Thrust", "bodyweight"],
  "Hip Thrust (Barbell)": ["Hip Thrust", "barbell"],
  "Incline Bench Press (Barbell)": ["Incline Bench Press", "barbell"],
  "Incline Bench Press (Dumbbell)": ["Incline Bench Press", "dumbbell"],
  "Incline Bench Press (Smith Machine)": ["Incline Bench Press", "smith"],
  "Incline Chest Fly (Dumbbell)": ["Incline Chest Fly", "dumbbell"],
  "Incline Chest Press (Machine)": ["Incline Chest Press", "leverageMachine"],
  "Inverted Row": ["Inverted Row", "bodyweight"],
  "Jump Squat": ["Jump Squat", "bodyweight"],
  "Jumping Jack": ["Jumping Jack", "bodyweight"],
  "Kettlebell Clean": ["Clean", "kettlebell"],
  "Kettlebell Goblet Squat": ["Goblet Squat", "kettlebell"],
  "Kettlebell Shoulder Press": ["Shoulder Press", "kettlebell"],
  "Kettlebell Swing": ["Kettlebell Swing", "kettlebell"],
  "Lat Pulldown (Band)": ["Lat Pulldown", "band"],
  "Lat Pulldown (Cable)": ["Lat Pulldown", "cable"],
  "Lat Pulldown (Machine)": ["Lat Pulldown", "leverageMachine"],
  "Lateral Raise (Band)": ["Lateral Raise", "band"],
  "Lateral Raise (Cable)": ["Lateral Raise", "cable"],
  "Lateral Raise (Dumbbell)": ["Lateral Raise", "dumbbell"],
  "Lateral Raise (Machine)": ["Lateral Raise", "leverageMachine"],
  "Leg Extension (Machine)": ["Leg Extension", "leverageMachine"],
  "Leg Press (Machine)": ["Leg Press", "leverageMachine"],
  Lunge: ["Lunge", "bodyweight"],
  "Lunge (Barbell)": ["Lunge", "barbell"],
  "Lunge (Dumbbell)": ["Lunge", "dumbbell"],
  "Lying Leg Curl (Machine)": ["Lying Leg Curl", "leverageMachine"],
  "Mountain Climber": ["Mountain Climber", "bodyweight"],
  "Overhead Press (Barbell)": ["Overhead Press", "barbell"],
  "Overhead Press (Dumbbell)": ["Overhead Press", "dumbbell"],
  "Overhead Press (Smith Machine)": ["Overhead Press", "smith"],
  "Overhead Squat": ["Overhead Squat", "barbell"],
  "Pistol Squat": ["Pistol Squat", "bodyweight"],
  Plank: ["Plank", "bodyweight"],
  "Power Clean": ["Power Clean", "barbell"],
  "Power Snatch": ["Power Snatch", "barbell"],
  "Preacher Curl (Barbell)": ["Preacher Curl", "barbell"],
  "Preacher Curl (Dumbbell)": ["Preacher Curl", "dumbbell"],
  "Preacher Curl (Machine)": ["Preacher Curl", "leverageMachine"],
  "Pull Up": ["Pull Up", "bodyweight"],
  "Pull Up (Band)": ["Pull Up", "band"],
  "Pullover (Dumbbell)": ["Pullover", "dumbbell"],
  "Push Press": ["Push Press", "barbell"],
  "Reverse Crunch": ["Reverse Crunch", "bodyweight"],
  "Reverse Curl (Barbell)": ["Reverse Curl", "barbell"],
  "Reverse Curl (Dumbbell)": ["Reverse Curl", "dumbbell"],
  "Reverse Fly (Cable)": ["Reverse Fly", "cable"],
  "Reverse Fly (Dumbbell)": ["Reverse Fly", "dumbbell"],
  "Reverse Grip Lat Pulldown (Cable)": ["Lat Pulldown", "cable"],
  "Reverse Hyperextension": ["Reverse Hyperextension", "bodyweight"],
  "Romanian Deadlift (Barbell)": ["Romanian Deadlift", "barbell"],
  "Romanian Deadlift (Dumbbell)": ["Romanian Deadlift", "dumbbell"],
  "Russian Twist (Bodyweight)": ["Russian Twist", "bodyweight"],
  "Seated Leg Curl (Machine)": ["Seated Leg Curl", "leverageMachine"],
  "Seated Row (Machine)": ["Seated Row", "leverageMachine"],
  "Seated Shoulder Press (Machine)": ["Shoulder Press", "leverageMachine"],
  "Shoulder Press (Dumbbell)": ["Shoulder Press", "dumbbell"],
  "Shrug (Barbell)": ["Shrug", "barbell"],
  "Shrug (Cable)": ["Shrug", "cable"],
  "Shrug (Dumbbell)": ["Shrug", "dumbbell"],
  "Shrug (Smith Machine)": ["Shrug", "smith"],
  "Side Bend": ["Side Bend", "bodyweight"],
  "Side Bend (Dumbbell)": ["Side Bend", "dumbbell"],
  "Side Plank": ["Side Plank", "bodyweight"],
  "Single Leg Glute Bridge": ["Single Leg Bridge", "bodyweight"],
  "Single Leg Hip Thrust": ["Single Leg Hip Thrust", "bodyweight"],
  "Single Leg Romanian Deadlift (Barbell)": ["Single Leg Deadlift", "barbell"],
  "Single Leg Romanian Deadlift (Dumbbell)": ["Single Leg Deadlift", "dumbbell"],
  "Sit Up": ["Sit Up", "bodyweight"],
  "Skullcrusher (Barbell)": ["Skullcrusher", "barbell"],
  "Skullcrusher (Dumbbell)": ["Skullcrusher", "dumbbell"],
  Snatch: ["Power Snatch", "barbell"],
  "Split Jerk": ["Split Jerk", "barbell"],
  "Squat (Band)": ["Squat", "band"],
  "Squat (Barbell)": ["Squat", "barbell"],
  "Squat (Bodyweight)": ["Squat", "bodyweight"],
  "Squat (Dumbbell)": ["Squat", "dumbbell"],
  "Squat (Machine)": ["Squat", "leverageMachine"],
  "Squat (Smith Machine)": ["Squat", "smith"],
  "Standing Military Press (Barbell)": ["Overhead Press", "barbell"],
  "Straight Leg Deadlift": ["Stiff Leg Deadlift", "barbell"],
  "Sumo Deadlift": ["Deadlift", "barbell"],
  Superman: ["Superman", "bodyweight"],
  "Thruster (Barbell)": ["Thruster", "barbell"],
  "Thruster (Kettlebell)": ["Thruster", "kettlebell"],
  "Upright Row (Barbell)": ["Upright Row", "barbell"],
  "Upright Row (Cable)": ["Upright Row", "cable"],
  "Upright Row (Dumbbell)": ["Upright Row", "dumbbell"],
  "V Up": ["V Up", "bodyweight"],
  "Wide Pull Up": ["Pull Up", "bodyweight"],
  "Zercher Squat": ["Squat", "barbell"],
  "Around The World": ["Around The World", "dumbbell"],
  "Back Extension (Weighted Hyperextension)": ["Back Extension", "leverageMachine"],
  "Battle Ropes": ["Battle Ropes", "bodyweight"],
  "Bicep Curl (Machine)": ["Bicep Curl", "leverageMachine"],
  "Bicep Curl (Suspension)": ["Bicep Curl", "dumbbell"],
  "Bicycle Crunch Raised Legs": ["Bicycle Crunch", "bodyweight"],
  "Burpee Over the Bar": ["Burpee", "bodyweight"],
  "Cable Fly Crossovers": ["Cable Crossover", "cable"],
  "Chest Dip (Assisted)": ["Chest Dip", "bodyweight"],
  "Chest Dip (Weighted)": ["Chest Dip", "bodyweight"],
  "Chest Fly (Suspension)": ["Chest Fly", "dumbbell"],
  "Chin Up (Assisted)": ["Chin Up", "bodyweight"],
  "Chin Up (Weighted)": ["Chin Up", "bodyweight"],
  "Clean and Press": ["Clean and Jerk", "barbell"],
  "Crunch (Weighted)": ["Crunch", "bodyweight"],
  Cycling: ["Cycling", "bodyweight"],
  "Decline Crunch (Weighted)": ["Decline Crunch", "bodyweight"],
  "Decline Push Up": ["Push Up", "bodyweight"],
  "Diamond Push Up": ["Push Up", "bodyweight"],
  "Dumbbell Snatch": ["Power Snatch", "dumbbell"],
  "Dumbbell Squeeze Press": ["Chest Press", "dumbbell"],
  "Elliptical Trainer": ["Elliptical Machine", "leverageMachine"],
  "Floor Press (Barbell)": ["Chest Press", "barbell"],
  "Floor Press (Dumbbell)": ["Chest Press", "dumbbell"],
  "Floor Triceps Dip": ["Triceps Dip", "bodyweight"],
  "Frog Jumps": ["Box Jump", "bodyweight"],
  "Frog Pumps (Dumbbell)": ["Glute Bridge", "dumbbell"],
  "Front Raise (Suspension)": ["Front Raise", "dumbbell"],
  "Handstand Hold": ["Handstand Push Up", "bodyweight"],
  "Hanging Knee Raise": ["Hanging Leg Raise", "bodyweight"],
  "High Knees": ["High Knee Skips", "bodyweight"],
  "Incline Push Ups": ["Push Up", "bodyweight"],
  "Iso-Lateral Chest Press (Machine)": ["Iso-Lateral Chest Press", "leverageMachine"],
  "Iso-Lateral Row (Machine)": ["Iso-Lateral Row", "leverageMachine"],
  "Jack Knife (Suspension)": ["Jackknife Sit Up", "bodyweight"],
  "Jackknife Sit Up": ["Jackknife Sit Up", "bodyweight"],
  "Jump Rope": ["Jump Rope", "bodyweight"],
  "Kettlebell High Pull": ["Deadlift High Pull", "kettlebell"],
  "Kettlebell Snatch": ["Power Snatch", "kettlebell"],
  "Kettlebell Turkish Get Up": ["Kettlebell Turkish Get Up", "kettlebell"],
  "Kipping Pull Up": ["Kipping Pull Up", "bodyweight"],
  "Knee Raise Parallel Bars": ["Knee Raise", "bodyweight"],
  "Lateral Box Jump": ["Lateral Box Jump", "bodyweight"],
  "Leg Press Horizontal (Machine)": ["Leg Press", "leverageMachine"],
  "Low Cable Fly Crossovers": ["Cable Crossover", "cable"],
  "Lying Leg Raise": ["Flat Leg Raise", "bodyweight"],
  "Muscle Up": ["Muscle Up", "bodyweight"],
  "Oblique Crunch": ["Oblique Crunch", "bodyweight"],
  "Overhead Dumbbell Lunge": ["Lunge", "dumbbell"],
  "Pendlay Row (Barbell)": ["Pendlay Row", "barbell"],
  "Press Under": ["Press Under", "barbell"],
  "Pull Up (Assisted)": ["Pull Up", "bodyweight"],
  "Pull Up (Weighted)": ["Pull Up", "bodyweight"],
  "Push Up": ["Push Up", "bodyweight"],
  "Push Up (Weighted)": ["Push Up", "bodyweight"],
  "Rear Delt Reverse Fly (Machine)": ["Reverse Fly", "leverageMachine"],
  "Reverse Fly Single Arm (Cable)": ["Reverse Fly", "cable"],
  "Reverse Grip Concentration Curl": ["Reverse Grip Concentration Curl", "dumbbell"],
  "Reverse Plank": ["Reverse Plank", "bodyweight"],
  "Rowing Machine": ["Rowing", "leverageMachine"],
  "Russian Twist (Weighted)": ["Russian Twist", "bodyweight"],
  "Seated Cable Row": ["Seated Row", "cable"],
  "Seated Calf Raise": ["Seated Calf Raise", "barbell"],
  "Seated Incline Curl (Dumbbell)": ["Incline Curl", "dumbbell"],
  "Seated Palms Up Wrist Curl": ["Seated Palms Up Wrist Curl", "dumbbell"],
  "Single Arm Cable Crossover": ["Cable Crossover", "cable"],
  "Single Leg Standing Calf Raise": ["Single Leg Calf Raise", "barbell"],
  "Single Leg Standing Calf Raise (Barbell)": ["Single Leg Calf Raise", "barbell"],
  "Single Leg Standing Calf Raise (Dumbbell)": ["Single Leg Calf Raise", "dumbbell"],
  "Single Leg Standing Calf Raise (Machine)": ["Single Leg Calf Raise", "leverageMachine"],
  "Sissy Squat (Weighted)": ["Sissy Squat", "bodyweight"],
  "Sit Up (Weighted)": ["Sit Up", "bodyweight"],
  "Split Squat (Dumbbell)": ["Bulgarian Split Squat", "dumbbell"],
  "Squat Row": ["Squat Row", "band"],
  "Standing Calf Raise": ["Standing Calf Raise", "dumbbell"],
  "Standing Calf Raise (Barbell)": ["Standing Calf Raise", "barbell"],
  "Standing Calf Raise (Dumbbell)": ["Standing Calf Raise", "dumbbell"],
  "Standing Calf Raise (Machine)": ["Standing Calf Raise", "leverageMachine"],
  "Step Up": ["Step up", "dumbbell"],
  "T Bar Row": ["T Bar Row", "leverageMachine"],
  "Toes to Bar": ["Toes To Bar", "bodyweight"],
  "Torso Rotation": ["Torso Rotation", "bodyweight"],
  "Triceps Dip": ["Triceps Dip", "bodyweight"],
  "Triceps Dip (Assisted)": ["Triceps Dip", "bodyweight"],
  "Triceps Dip (Weighted)": ["Triceps Dip", "bodyweight"],
  "Triceps Extension (Cable)": ["Triceps Extension", "cable"],
  "Triceps Extension (Dumbbell)": ["Triceps Extension", "dumbbell"],
  "Triceps Extension (Machine)": ["Triceps Extension", "leverageMachine"],
  "Triceps Extension (Suspension)": ["Triceps Extension", "dumbbell"],
  "Triceps Extension (Barbell)": ["Triceps Extension", "barbell"],
  "Triceps Pressdown": ["Triceps Pushdown", "cable"],
  "Triceps Pushdown": ["Triceps Pushdown", "cable"],
  "Triceps Rope Pushdown": ["Triceps Pushdown", "cable"],
  "Wrist Roller": ["Wrist Roller", "bodyweight"],
};

const hevyMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Hermes only parses ISO 8601 dates, so Hevy's "13 Mar 2026, 15:22" format must be parsed manually
function parseHevyDate(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const match = raw.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const month = hevyMonths.indexOf(match[2].toLowerCase());
    if (month !== -1) {
      const ts = new Date(
        Number(match[3]),
        month,
        Number(match[1]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6] ?? 0)
      ).getTime();
      if (!isNaN(ts)) {
        return ts;
      }
    }
  }
  const ts = new Date(raw).getTime();
  return isNaN(ts) ? undefined : ts;
}

interface IHevyRecord {
  title: string;
  start_time: string;
  end_time: string;
  exercise_title: string;
  description: string;
  exercise_notes: string;
  set_index: number;
  set_type: string;
  weight_lbs?: number;
  weight_kg?: number;
  reps: number;
}

interface IHevyStructExercise {
  exercise_title: string;
  exercise_notes: string;
  sets: IHevyStructSet[];
  warmupSets: IHevyStructSet[];
}

interface IHevyStructSet {
  weight_lbs?: number;
  weight_kg?: number;
  reps: number;
}

interface IHevyStruct {
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  exercises: IHevyStructExercise[];
  row: number;
}

function parseHevyNumber(value: string | number | undefined | null): number | undefined {
  if (value == null || `${value}`.trim() === "") {
    return undefined;
  }
  const num = Number(`${value}`);
  return isNaN(num) ? undefined : num;
}

// Leave the weight undefined when both columns are blank (bodyweight set) instead of fabricating 0kg.
function buildHevyWeight(set: IHevyStructSet): IWeight | undefined {
  if (set.weight_lbs != null) {
    return Weight_build(set.weight_lbs, "lb");
  }
  if (set.weight_kg != null) {
    return Weight_build(set.weight_kg, "kg");
  }
  return undefined;
}

function validateHevyRecord(record: IHevyRecord & { row: number }): IImportRowError | undefined {
  if (parseHevyDate(record.start_time) == null) {
    return {
      row: record.row,
      column: "start_time",
      value: `${record.start_time ?? ""}`,
      message: `"${record.start_time ?? ""}" is not a valid date`,
    };
  }
  for (const column of ["reps", "weight_lbs", "weight_kg"] as const) {
    const value = record[column];
    if (value != null && `${value}`.trim() !== "" && isNaN(Number(`${value}`))) {
      return { row: record.row, column, value: `${value}`, message: `"${value}" is not a number` };
    }
  }
  return undefined;
}

function collectHevyWarnings(record: IHevyRecord & { row: number }, warnings: IImportRowError[]): void {
  const startTs = parseHevyDate(record.start_time);
  if (startTs != null && ImportUtils_isSuspiciousTimestamp(startTs)) {
    warnings.push({
      row: record.row,
      column: "start_time",
      value: `${record.start_time}`,
      message: `"${record.start_time}" looks like an implausible workout date`,
    });
  }
  for (const [column, unit] of [
    ["weight_lbs", "lb"],
    ["weight_kg", "kg"],
  ] as const) {
    const value = parseHevyNumber(record[column]);
    if (value != null && ImportUtils_isSuspiciousWeight(value, unit)) {
      warnings.push({
        row: record.row,
        column,
        value: `${record[column]}`,
        message: `${value} ${unit} looks like an implausible weight`,
      });
    }
  }
  const reps = parseHevyNumber(record.reps);
  if (reps != null && ImportUtils_isSuspiciousReps(reps)) {
    warnings.push({
      row: record.row,
      column: "reps",
      value: `${record.reps}`,
      message: `${reps} looks like an implausible rep count`,
    });
  }
}

export function ImportFromHevy_convertHevyCsvToHistoryRecords(hevyCsvRaw: string, settings: ISettings): IImportResult {
  const parsed = Papa.parse<IHevyRecord>(hevyCsvRaw, { header: true, skipEmptyLines: true });
  const kind = ImportUtils_detectCsvKind((parsed.meta.fields ?? []).map((f) => `${f}`));
  if (kind === "liftosaur") {
    throw new ImportFileError(
      'This looks like a Liftosaur history CSV. Use "Import history from CSV file" in Settings instead.'
    );
  }
  if (kind !== "hevy") {
    throw new ImportFileError("This doesn't look like a Hevy workout export CSV.");
  }
  const hevyRecords = parsed.data.map((record, i) => ({ ...record, row: i + 2 }));
  if (hevyRecords.length === 0) {
    throw new ImportFileError("The file has no workout rows");
  }

  const errors: IImportRowError[] = [];
  const warnings: IImportRowError[] = [];
  const validRecords: (IHevyRecord & { row: number })[] = [];
  for (const record of hevyRecords) {
    const error = validateHevyRecord(record);
    if (error) {
      errors.push(error);
    } else {
      collectHevyWarnings(record, warnings);
      validRecords.push(record);
    }
  }
  if (validRecords.length < hevyRecords.length / 2) {
    throw new ImportFileError(
      `${errors.length} of ${hevyRecords.length} rows failed to parse - this doesn't look like a valid Hevy export.`
    );
  }

  const hevyWorkouts: IHevyStruct[] = [];
  for (const workout of ObjectUtils_values(CollectionUtils_groupByKey(validRecords, "start_time"))) {
    if (!workout) {
      continue;
    }
    const hevyExercises: IHevyStructExercise[] = [];
    const exercises = CollectionUtils_groupByKey(workout, "exercise_title");
    for (const exercise of ObjectUtils_values(exercises)) {
      if (!exercise) {
        continue;
      }
      const warmupSets = exercise.filter((record) => record.set_type === "warmup");
      warmupSets.sort((a, b) => (a.set_index ?? 0) - (b.set_index ?? 0));
      const sets = exercise.filter((record) => record.set_type !== "warmup");
      sets.sort((a, b) => (a.set_index ?? 0) - (b.set_index ?? 0));
      hevyExercises.push({
        exercise_title: exercise[0].exercise_title,
        exercise_notes: (exercise[0].exercise_notes || "").replace(/\\n/g, "\n"),
        warmupSets: warmupSets.map((set) => ({
          weight_lbs: parseHevyNumber(set.weight_lbs),
          weight_kg: parseHevyNumber(set.weight_kg),
          reps: parseHevyNumber(set.reps) ?? 1,
        })),
        sets: sets.map((set) => ({
          weight_lbs: parseHevyNumber(set.weight_lbs),
          weight_kg: parseHevyNumber(set.weight_kg),
          reps: parseHevyNumber(set.reps) ?? 1,
        })),
      });
    }
    hevyWorkouts.push({
      title: workout[0].title,
      start_time: workout[0].start_time,
      end_time: workout[0].end_time,
      description: (workout[0].description || "").replace(/\\n/g, "\n"),
      exercises: hevyExercises,
      row: workout[0].row,
    });
  }

  const customExercises: Record<string, ICustomExercise> = {};
  const backMap: Partial<Record<string, string>> = {};
  const historyRecords = hevyWorkouts.map((hevyWorkout): IHistoryRecord | undefined => {
    const startTs = parseHevyDate(hevyWorkout.start_time)!;
    const endTs = parseHevyDate(hevyWorkout.end_time);
    if (hevyWorkout.end_time && endTs == null) {
      warnings.push({
        row: hevyWorkout.row,
        column: "end_time",
        value: hevyWorkout.end_time,
        message: `"${hevyWorkout.end_time}" is not a valid date, using the start time instead`,
      });
    }
    const entries = hevyWorkout.exercises.map((record, index) => {
      let exerciseNameAndEquipment = exerciseMapping[record.exercise_title];
      let exerciseId: string;
      if (!exerciseNameAndEquipment) {
        const maybeExerciseId = backMap[record.exercise_title];
        if (!maybeExerciseId) {
          exerciseId = UidFactory_generateUid(8);
          backMap[record.exercise_title] = exerciseId;
          customExercises[exerciseId] = {
            vtype: "custom_exercise",
            id: exerciseId,
            name: record.exercise_title,
            isDeleted: false,
            meta: {
              bodyParts: [],
              targetMuscles: [],
              synergistMuscles: [],
              sortedEquipment: [],
            },
            types: [],
          };
        } else {
          exerciseId = maybeExerciseId;
        }
        exerciseNameAndEquipment = [record.exercise_title, undefined];
      } else {
        const [exerciseName] = exerciseNameAndEquipment;
        const exercise = Exercise_findByName(exerciseName, {})!;
        exerciseId = exercise.id;
      }
      const [, equipment] = exerciseNameAndEquipment;
      const isUnilateral = Exercise_getIsUnilateral({ id: exerciseId, equipment: equipment }, settings);
      return {
        vtype: "history_entry" as const,
        id: Progress_getEntryId({ id: exerciseId, equipment }, UidFactory_generateUid(3)),
        exercise: { id: exerciseId, equipment: equipment },
        index,
        warmupSets: record.warmupSets.map((set, i) => {
          const weight = buildHevyWeight(set);
          return {
            vtype: "set" as const,
            id: UidFactory_generateUid(6),
            index: i,
            originalWeight: weight,
            weight,
            completedWeight: weight,
            reps: set.reps ?? 1,
            completedReps: set.reps ?? 1,
            completedRepsLeft: isUnilateral ? set.reps : undefined,
            isUnilateral,
            isCompleted: true,
            isAmrap: false,
            timestamp: startTs,
          };
        }),
        sets: record.sets.map((set, i) => {
          const weight = buildHevyWeight(set);
          return {
            vtype: "set" as const,
            id: UidFactory_generateUid(6),
            index: i,
            weight,
            originalWeight: weight,
            completedWeight: weight,
            reps: set.reps ?? 1,
            completedReps: set.reps ?? 1,
            completedRepsLeft: isUnilateral ? set.reps : undefined,
            isAmrap: false,
            timestamp: startTs,
            isUnilateral,
            isCompleted: true,
          };
        }),
        notes: record.exercise_notes,
      };
    });
    const historyRecord: IHistoryRecord = {
      vtype: "history_record",
      id: History_generateId(endTs ?? startTs),
      date: new Date(endTs ?? startTs).toISOString(),
      startTime: startTs,
      endTime: endTs ?? startTs,
      dayName: hevyWorkout.title,
      programName: "Hevy",
      programId: "hevy",
      day: 1,
      notes: hevyWorkout.description,
      entries,
    };
    const validation = Storage_validate(historyRecord, VHistoryRecord, "historyRecord");
    if (!validation.success) {
      errors.push({
        row: hevyWorkout.row,
        message: `Workout "${hevyWorkout.start_time}" failed validation: ${validation.error.join("; ")}`,
      });
      return undefined;
    }
    return historyRecord;
  });

  return { historyRecords: CollectionUtils_compact(historyRecords), customExercises, errors, warnings };
}
