import { IHistoryRecord, ICustomExercise, ISettings } from "../types";
import Papa from "papaparse";
import { CollectionUtils } from "./collection";
import { ObjectUtils } from "./object";
import { Exercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { UidFactory } from "./generator";
import { Progress } from "../models/progress";

const exerciseMapping: Partial<Record<string, [string, string | undefined]>> = {
  "21s": ["Bicep Curl", "barbell"],
  "Ab Wheel": ["Ab Wheel", "bodyweight"],
  "Arnold Press (Dumbbell)": ["Arnold Press", "dumbbell"],
  "Around the World": ["Around The World", "dumbbell"],
  "Back Extension": ["Back Extension", "bodyweight"],
  "Back Extension (Machine)": ["Back Extension", "leverageMachine"],
  "Ball Slams": ["Ball Slams", "medicineball"],
  "Battle Ropes": ["Battle Ropes", "bodyweight"],
  "Bench Dip": ["Bench Dip", "bodyweight"],
  "Bench Press - Close Grip (Barbell)": ["Bench Press Close Grip", "barbell"],
  "Bench Press - Wide Grip (Barbell)": ["Bench Press Wide Grip", "barbell"],
  "Bench Press (Barbell)": ["Bench Press", "barbell"],
  "Bench Press (Cable)": ["Chest Press", "cable"],
  "Bench Press (Dumbbell)": ["Chest Press", "dumbbell"],
  "Bench Press (Smith Machine)": ["Chest Press", "smith"],
  "Bent Over One Arm Row (Dumbbell)": ["Bent Over One Arm Row", "dumbbell"],
  "Bent Over Row - Underhand (Barbell)": ["Bent Over Row", "barbell"],
  "Bent Over Row (Band)": ["Bent Over Row", "band"],
  "Bent Over Row (Barbell)": ["Bent Over Row", "barbell"],
  "Bent Over Row (Dumbbell)": ["Bent Over One Arm Row", "dumbbell"],
  "Bicep Curl (Barbell)": ["Bicep Curl", "barbell"],
  "Bicep Curl (Cable)": ["Bicep Curl", "cable"],
  "Bicep Curl (Dumbbell)": ["Bicep Curl", "dumbbell"],
  "Bicep Curl (Machine)": ["Bicep Curl", "leverageMachine"],
  "Bicycle Crunch": ["Bicycle Crunch", "bodyweight"],
  "Box Jump": ["Box Jump", "bodyweight"],
  "Box Squat (Barbell)": ["Box Squat", "barbell"],
  "Bulgarian Split Squat": ["Bulgarian Split Squat", "bodyweight"],
  "Burpee": ["Burpee", "bodyweight"],
  "Cable Crunch": ["Cable Crunch", "cable"],
  "Cable Twist": ["Cable Twist", "cable"],
  "Chest Fly (Dumbbell)": ["Chest Fly", "dumbbell"],
  "Deadlift (Band)": ["Deadlift", "band"],
  "Deadlift (Barbell)": ["Deadlift", "barbell"],
  "Deadlift (Dumbbell)": ["Deadlift", "dumbbell"],
  "Deadlift (Smith Machine)": ["Deadlift", "smith"],
  "Deadlift High Pull (Barbell)": ["Deadlift High Pull", "barbell"],
  "Decline Bench Press (Barbell)": ["Decline Bench Press", "barbell"],
  "Decline Bench Press (Dumbbell)": ["Decline Bench Press", "dumbbell"],
  "Decline Bench Press (Smith Machine)": ["Decline Bench Press", "smith"],
  "Decline Crunch": ["Decline Crunch", "bodyweight"],
  "Deficit Deadlift (Barbell)": ["Deficit Deadlift", "barbell"],
  "Elliptical Machine": ["Elliptical Machine", "leverageMachine"],
  "Face Pull (Cable)": ["Face Pull", "cable"],
  "Flat Knee Raise": ["Knee Raise", "bodyweight"],
  "Flat Leg Raise": ["Flat Leg Raise", "bodyweight"],
  "Floor Press (Barbell)": ["Chest Press", "barbell"],
  "Front Raise (Band)": ["Front Raise", "band"],
  "Front Raise (Barbell)": ["Front Raise", "barbell"],
  "Front Raise (Cable)": ["Front Raise", "cable"],
  "Front Raise (Dumbbell)": ["Front Raise", "dumbbell"],
  "Front Raise (Plate)": ["Front Raise", "bodyweight"],
  "Front Squat (Barbell)": ["Front Squat", "barbell"],
  "Glute Ham Raise": ["Glute Ham Raise", "bodyweight"],
  "Glute Kickback (Machine)": ["Cable Kickback", "cable"],
  "Goblet Squat (Kettlebell)": ["Goblet Squat", "kettlebell"],
  "Good Morning (Barbell)": ["Good Morning", "barbell"],
  "Hack Squat": ["Hack Squat", "leverageMachine"],
  "Hack Squat (Barbell)": ["Hack Squat", "barbell"],
  "Hammer Curl (Band)": ["Hammer Curl", "band"],
  "Hammer Curl (Cable)": ["Hammer Curl", "cable"],
  "Hammer Curl (Dumbbell)": ["Hammer Curl", "dumbbell"],
  "Handstand Push Up": ["Handstand Push Up", "bodyweight"],
  "Hang Clean (Barbell)": ["Hang Clean", "barbell"],
  "Hang Snatch (Barbell)": ["Hang Snatch", "barbell"],
  "Hanging Knee Raise": ["Hanging Leg Raise", "bodyweight"],
  "Hanging Leg Raise": ["Hanging Leg Raise", "bodyweight"],
  "High Knee Skips": ["High Knee Skips", "bodyweight"],
  "Hip Abductor (Machine)": ["Hip Abductor", "leverageMachine"],
  "Hip Adductor (Machine)": ["Hip Adductor", "leverageMachine"],
  "Hip Thrust (Barbell)": ["Hip Thrust", "barbell"],
  "Hip Thrust (Bodyweight)": ["Hip Thrust", "bodyweight"],
  "Incline Bench Press (Barbell)": ["Incline Bench Press", "barbell"],
  "Incline Bench Press (Cable)": ["Incline Bench Press", "cable"],
  "Incline Bench Press (Dumbbell)": ["Incline Bench Press", "dumbbell"],
  "Incline Bench Press (Smith Machine)": ["Incline Bench Press", "smith"],
  "Incline Chest Fly (Dumbbell)": ["Incline Chest Fly", "dumbbell"],
  "Incline Chest Press (Machine)": ["Incline Chest Press", "leverageMachine"],
  "Incline Curl (Dumbbell)": ["Incline Curl", "dumbbell"],
  "Incline Row (Dumbbell)": ["Incline Row", "dumbbell"],
  "Inverted Row (Bodyweight)": ["Inverted Row", "bodyweight"],
  "Iso-Lateral Chest Press (Machine)": ["Iso-Lateral Chest Press", "leverageMachine"],
  "Iso-Lateral Row (Machine)": ["Iso-Lateral Row", "leverageMachine"],
  "Jackknife Sit Up": ["Jackknife Sit Up", "bodyweight"],
  "Jump Rope": ["Jump Rope", "bodyweight"],
  "Jump Shrug (Barbell)": ["Shrug", "barbell"],
  "Jump Squat": ["Jump Squat", "bodyweight"],
  "Jumping Jack": ["Jumping Jack", "bodyweight"],
  "Kettlebell Swing": ["Kettlebell Swing", "kettlebell"],
  "Kettlebell Turkish Get Up": ["Kettlebell Turkish Get Up", "kettlebell"],
  "Kipping Pull Up": ["Kipping Pull Up", "bodyweight"],
  "Knee Raise (Captain's Chair)": ["Knee Raise", "bodyweight"],
  "Kneeling Pulldown (Band)": ["Lat Pulldown", "band"],
  "Knees to Elbows": ["Toes To Bar", "bodyweight"],
  "Lat Pulldown - Underhand (Band)": ["Lat Pulldown", "band"],
  "Lat Pulldown - Underhand (Cable)": ["Lat Pulldown", "cable"],
  "Lat Pulldown - Wide Grip (Cable)": ["Lat Pulldown", "cable"],
  "Lat Pulldown (Cable)": ["Lat Pulldown", "cable"],
  "Lat Pulldown (Machine)": ["Lat Pulldown", "leverageMachine"],
  "Lat Pulldown (Single Arm)": ["Lat Pulldown", "cable"],
  "Lateral Box Jump": ["Lateral Box Jump", "bodyweight"],
  "Lateral Pulldown TRX": ["Lat Pulldown", "bodyweight"],
  "Lateral Raise (Band)": ["Lateral Raise", "band"],
  "Lateral Raise (Cable)": ["Lateral Raise", "cable"],
  "Lateral Raise (Dumbbell)": ["Lateral Raise", "dumbbell"],
  "Leg Extension (Machine)": ["Leg Extension", "leverageMachine"],
  "Leg Press": ["Leg Press", "leverageMachine"],
  "Lunge (Barbell)": ["Lunge", "barbell"],
  "Lunge (Bodyweight)": ["Lunge", "bodyweight"],
  "Lunge (Dumbbell)": ["Lunge", "dumbbell"],
  "Lying Leg Curl (Machine)": ["Lying Leg Curl", "leverageMachine"],
  "Mountain Climber": ["Mountain Climber", "bodyweight"],
  "Muscle Up": ["Muscle Up", "bodyweight"],
  "Oblique Crunch": ["Oblique Crunch", "bodyweight"],
  "Overhead Press (Barbell)": ["Overhead Press", "barbell"],
  "Overhead Press (Cable)": ["Overhead Press", "cable"],
  "Overhead Press (Dumbbell)": ["Overhead Press", "dumbbell"],
  "Overhead Press (Smith Machine)": ["Overhead Press", "smith"],
  "Overhead Squat (Barbell)": ["Overhead Squat", "barbell"],
  "Pec Deck (Machine)": ["Pec Deck", "leverageMachine"],
  "Pendlay Row (Barbell)": ["Pendlay Row", "barbell"],
  "Pistol Squat": ["Pistol Squat", "bodyweight"],
  "Plank": ["Plank", "bodyweight"],
  "Power Clean": ["Power Clean", "barbell"],
  "Power Snatch (Barbell)": ["Power Snatch", "barbell"],
  "Preacher Curl (Barbell)": ["Preacher Curl", "barbell"],
  "Preacher Curl (Dumbbell)": ["Preacher Curl", "dumbbell"],
  "Preacher Curl (Machine)": ["Preacher Curl", "leverageMachine"],
  "Press Under (Barbell)": ["Press Under", "barbell"],
  "Pull Up": ["Pull Up", "bodyweight"],
  "Pull Up (Assisted)": ["Pull Up", "bodyweight"],
  "Pull Up (Band)": ["Pull Up", "band"],
  "Pullover (Dumbbell)": ["Pullover", "dumbbell"],
  "Pullover (Machine)": ["Pullover", "leverageMachine"],
  "Push Press": ["Push Press", "barbell"],
  "Push Up": ["Push Up", "bodyweight"],
  "Push Up (Band)": ["Push Up", "band"],
  "Push Up (Knees)": ["Push Up", "bodyweight"],
  "Rack Pull (Barbell)": ["Rack Pull", "barbell"],
  "Reverse Crunch": ["Reverse Crunch", "bodyweight"],
  "Reverse Curl (Band)": ["Reverse Curl", "band"],
  "Reverse Curl (Barbell)": ["Reverse Curl", "barbell"],
  "Reverse Curl (Dumbbell)": ["Reverse Curl", "dumbbell"],
  "Reverse Fly (Cable)": ["Reverse Fly", "cable"],
  "Reverse Fly (Dumbbell)": ["Reverse Fly", "dumbbell"],
  "Reverse Fly (Machine)": ["Reverse Fly", "leverageMachine"],
  "Reverse Grip Concentration Curl (Dumbbell)": ["Reverse Grip Concentration Curl", "dumbbell"],
  "Reverse Plank": ["Reverse Plank", "bodyweight"],
  "Romanian Deadlift (Barbell)": ["Romanian Deadlift", "barbell"],
  "Romanian Deadlift (Dumbbell)": ["Romanian Deadlift", "dumbbell"],
  "Rowing (Machine)": ["Rowing", "leverageMachine"],
  "Russian Twist": ["Russian Twist", "bodyweight"],
  "Seated Leg Curl (Machine)": ["Seated Leg Curl", "leverageMachine"],
  "Seated Palms Up Wrist Curl (Dumbbell)": ["Seated Palms Up Wrist Curl", "dumbbell"],
  "Shrug (Barbell)": ["Shrug", "barbell"],
  "Shrug (Dumbbell)": ["Shrug", "dumbbell"],
  "Side Bend (Dumbbell)": ["Side Bend", "dumbbell"],
  "Skullcrusher (Dumbbell)": ["Skullcrusher", "dumbbell"],
  "Squat (Barbell)": ["Squat", "barbell"],
  "Squat (Dumbbell)": ["Squat", "dumbbell"],
  "Standing Calf Raise (Barbell)": ["Standing Calf Raise", "barbell"],
  "Standing Calf Raise (Dumbbell)": ["Standing Calf Raise", "dumbbell"],
  "Standing Calf Raise (Machine)": ["Standing Calf Raise", "leverageMachine"],
  "Step-up": ["Step up", "dumbbell"],
  "Stiff Leg Deadlift (Barbell)": ["Stiff Leg Deadlift", "barbell"],
  "Stiff Leg Deadlift (Dumbbell)": ["Stiff Leg Deadlift", "dumbbell"],
  "Straight Leg Deadlift (Band)": ["Stiff Leg Deadlift", "band"],
  "Strict Military Press (Barbell)": ["Overhead Press", "barbell"],
  "Sumo Deadlift (Barbell)": ["Sumo Deadlift", "barbell"],
  "Sumo Deadlift High Pull (Barbell)": ["Sumo Deadlift High Pull", "barbell"],
  "Superman": ["Superman", "bodyweight"],
  "T Bar Row": ["T Bar Row", "leverageMachine"],
  "Thruster (Barbell)": ["Thruster", "barbell"],
  "Thruster (Kettlebell)": ["Thruster", "kettlebell"],
  "Toes To Bar": ["Toes To Bar", "bodyweight"],
  "Torso Rotation (Machine)": ["Torso Rotation", "leverageMachine"],
  "Trap Bar Deadlift": ["Trap Bar Deadlift", "trapbar"],
  "Triceps Dip": ["Triceps Dip", "bodyweight"],
  "Triceps Dip (Assisted)": ["Triceps Dip", "bodyweight"],
  "Triceps Extension": ["Triceps Extension", "cable"],
  "Triceps Extension (Barbell)": ["Triceps Extension", "barbell"],
  "Triceps Extension (Cable)": ["Triceps Extension", "cable"],
  "Triceps Extension (Dumbbell)": ["Triceps Extension", "dumbbell"],
  "Triceps Extension (Machine)": ["Triceps Extension", "leverageMachine"],
  "Triceps Kickback": ["Triceps Kickback", "dumbbell"],
  "Upright Row (Cable)": ["Upright Row", "cable"],
  "Upright Row (Dumbbell)": ["Upright Row", "dumbbell"],
  "V Up": ["V Up", "bodyweight"],
  "Weighted twist": ["Russian Twist", "bodyweight"],
  "Wide Pull Up": ["Pull Up", "bodyweight"],
  "Wrist Roller": ["Wrist Roller", "bodyweight"],
  "Zercher Squat (Barbell)": ["Squat", "barbell"],
  "Zottman Curl": ["Zottman Curl", "dumbbell"],
};

interface IStrongRecord {
  Date: string;
  "Workout Name": string;
  Duration: string;
  "Exercise Name": string;
  "Set Order": string;
  Weight: string;
  Reps: string;
  Distance: string;
  Seconds: string;
  Notes: string;
  "Workout Notes": string;
  RPE: string;
}

interface IStrongStructSet {
  weight: number;
  reps: number;
  rpe?: number;
}

interface IStrongStructExercise {
  exercise_name: string;
  notes: string;
  sets: IStrongStructSet[];
}

interface IStrongStruct {
  date: string;
  workout_name: string;
  duration: string;
  workout_notes: string;
  exercises: IStrongStructExercise[];
}

export class ImportFromStrong {
  public static convertStrongCsvToHistoryRecords(
    strongCsvRaw: string,
    settings: ISettings
  ): {
    historyRecords: IHistoryRecord[];
    customExercises: Record<string, ICustomExercise>;
  } {
    const strongRecords = Papa.parse<IStrongRecord>(strongCsvRaw, { header: true }).data;

    // Filter out "Rest Timer" rows and empty rows
    const filteredRecords = strongRecords.filter(
      (r) => r["Set Order"] !== "Rest Timer" && r["Exercise Name"] && r.Date
    );

    const strongWorkouts: IStrongStruct[] = [];
    for (const workout of ObjectUtils.values(CollectionUtils.groupByKey(filteredRecords, "Date"))) {
      if (!workout) {
        continue;
      }
      const strongExercises: IStrongStructExercise[] = [];
      const exercises = CollectionUtils.groupByKey(workout, "Exercise Name");
      for (const exercise of ObjectUtils.values(exercises)) {
        if (!exercise) {
          continue;
        }
        const sets = [...exercise];
        sets.sort((a, b) => (Number(a["Set Order"]) || 0) - (Number(b["Set Order"]) || 0));
        strongExercises.push({
          exercise_name: exercise[0]["Exercise Name"],
          notes: (exercise[0].Notes || "").replace(/\\n/g, "\n"),
          sets: sets.map((set) => ({
            weight: Number(set.Weight) || 0,
            reps: Number(set.Reps) || 1,
            rpe: set.RPE ? Number(set.RPE) : undefined,
          })),
        });
      }
      strongWorkouts.push({
        date: workout[0].Date,
        workout_name: workout[0]["Workout Name"],
        duration: workout[0].Duration,
        workout_notes: (workout[0]["Workout Notes"] || "").replace(/\\n/g, "\n"),
        exercises: strongExercises,
      });
    }

    const customExercises: Record<string, ICustomExercise> = {};
    const backMap: Partial<Record<string, string>> = {};
    const historyRecords: IHistoryRecord[] = strongWorkouts.map((strongWorkout) => {
      let startTs: number | undefined;
      try {
        startTs = new Date(strongWorkout.date).getTime();
      } catch (_) {}
      // Estimate end time from duration (e.g., "41m" -> 41 minutes)
      let endTs: number | undefined;
      if (startTs != null) {
        const durationMatch = strongWorkout.duration.match(/(\d+)m/);
        if (durationMatch) {
          endTs = startTs + Number(durationMatch[1]) * 60 * 1000;
        } else {
          endTs = startTs;
        }
      }
      const entries = strongWorkout.exercises.map((record, index) => {
        let exerciseNameAndEquipment = exerciseMapping[record.exercise_name];
        let exerciseId: string;
        if (!exerciseNameAndEquipment) {
          const maybeExerciseId = backMap[record.exercise_name];
          if (!maybeExerciseId) {
            exerciseId = UidFactory.generateUid(8);
            backMap[record.exercise_name] = exerciseId;
            customExercises[exerciseId] = {
              vtype: "custom_exercise",
              id: exerciseId,
              name: record.exercise_name,
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
          exerciseNameAndEquipment = [record.exercise_name, undefined];
        } else {
          const [exerciseName] = exerciseNameAndEquipment;
          const exercise = Exercise.findByName(exerciseName, {});
          if (exercise) {
            exerciseId = exercise.id;
          } else {
            // Exercise name not found in Liftosaur database, create custom exercise
            exerciseId = UidFactory.generateUid(8);
            backMap[record.exercise_name] = exerciseId;
            customExercises[exerciseId] = {
              vtype: "custom_exercise",
              id: exerciseId,
              name: record.exercise_name,
              isDeleted: false,
              meta: {
                bodyParts: [],
                targetMuscles: [],
                synergistMuscles: [],
                sortedEquipment: [],
              },
              types: [],
            };
            exerciseNameAndEquipment = [record.exercise_name, undefined];
          }
        }
        const [, equipment] = exerciseNameAndEquipment;
        const isUnilateral = Exercise.getIsUnilateral({ id: exerciseId, equipment: equipment }, settings);
        return {
          vtype: "history_entry" as const,
          id: Progress.getEntryId({ id: exerciseId, equipment }, UidFactory.generateUid(3)),
          exercise: { id: exerciseId, equipment: equipment },
          index,
          warmupSets: [],
          sets: record.sets.map((set, i) => ({
            vtype: "set" as const,
            index: i,
            weight: Weight.build(set.weight, "kg"),
            originalWeight: Weight.build(set.weight, "kg"),
            completedWeight: Weight.build(set.weight, "kg"),
            reps: set.reps,
            completedReps: set.reps,
            completedRepsLeft: isUnilateral ? set.reps : 1,
            isAmrap: false,
            timestamp: startTs,
            isUnilateral,
            isCompleted: true,
            rpe: set.rpe,
          })),
          notes: record.notes,
        };
      });
      return {
        vtype: "history_record",
        id: endTs ?? Date.now(),
        date: new Date(endTs ?? Date.now()).toISOString(),
        startTime: startTs ?? Date.now(),
        endTime: endTs ?? Date.now(),
        dayName: strongWorkout.workout_name,
        programName: "Strong",
        programId: "strong",
        day: 1,
        notes: strongWorkout.workout_notes,
        entries,
      };
    });

    return { historyRecords, customExercises };
  }
}
