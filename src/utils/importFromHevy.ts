import { IHistoryRecord, ICustomExercise, ISettings } from "../types";
import Papa from "papaparse";
import { CollectionUtils } from "./collection";
import { ObjectUtils } from "./object";
import { Exercise } from "../models/exercise";
import { Weight } from "../models/weight";
import { UidFactory } from "./generator";
import { Progress } from "../models/progress";

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
}

export class ImportFromHevy {
  public static convertHevyCsvToHistoryRecords(
    hevyCsvRaw: string,
    settings: ISettings
  ): {
    historyRecords: IHistoryRecord[];
    customExercises: Record<string, ICustomExercise>;
  } {
    const hevyRecords = Papa.parse<IHevyRecord>(hevyCsvRaw, { header: true }).data;

    const hevyWorkouts: IHevyStruct[] = [];
    for (const workout of ObjectUtils.values(CollectionUtils.groupByKey(hevyRecords, "start_time"))) {
      if (!workout) {
        continue;
      }
      const hevyExercises: IHevyStructExercise[] = [];
      const exercises = CollectionUtils.groupByKey(workout, "exercise_title");
      for (const exercise of ObjectUtils.values(exercises)) {
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
            weight_lbs: set.weight_lbs != null ? Number(`${set.weight_lbs}`) : undefined,
            weight_kg: set.weight_kg != null ? Number(`${set.weight_kg}`) : undefined,
            reps: Number(`${set.reps ?? 1}`),
          })),
          sets: sets.map((set) => ({
            weight_lbs: set.weight_lbs != null ? Number(`${set.weight_lbs}`) : undefined,
            weight_kg: set.weight_kg != null ? Number(`${set.weight_kg}`) : undefined,
            reps: Number(`${set.reps ?? 1}`),
          })),
        });
      }
      hevyWorkouts.push({
        title: workout[0].title,
        start_time: workout[0].start_time,
        end_time: workout[0].end_time,
        description: (workout[0].description || "").replace(/\\n/g, "\n"),
        exercises: hevyExercises,
      });
    }

    const customExercises: Record<string, ICustomExercise> = {};
    const backMap: Partial<Record<string, string>> = {};
    const historyRecords: IHistoryRecord[] = hevyWorkouts.map((hevyWorkout) => {
      let startTs: number | undefined;
      try {
        startTs = new Date(hevyWorkout.start_time).getTime();
      } catch (_) {}
      let endTs: number | undefined;
      try {
        endTs = new Date(hevyWorkout.end_time).getTime();
      } catch (_) {}
      const entries = hevyWorkout.exercises.map((record, index) => {
        let exerciseNameAndEquipment = exerciseMapping[record.exercise_title];
        let exerciseId: string;
        if (!exerciseNameAndEquipment) {
          const maybeExerciseId = backMap[record.exercise_title];
          if (!maybeExerciseId) {
            exerciseId = UidFactory.generateUid(8);
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
          const exercise = Exercise.findByName(exerciseName, {})!;
          exerciseId = exercise.id;
        }
        const [, equipment] = exerciseNameAndEquipment;
        const isUnilateral = Exercise.getIsUnilateral({ id: exerciseId, equipment: equipment }, settings);
        return {
          vtype: "history_entry" as const,
          id: Progress.getEntryId({ id: exerciseId, equipment }, UidFactory.generateUid(3)),
          exercise: { id: exerciseId, equipment: equipment },
          index,
          warmupSets: record.warmupSets.map((set, i) => ({
            vtype: "set" as const,
            id: UidFactory.generateUid(6),
            index: i,
            originalWeight:
              set.weight_lbs != null ? Weight.build(set.weight_lbs ?? 0, "lb") : Weight.build(set.weight_kg ?? 0, "kg"),
            weight:
              set.weight_lbs != null ? Weight.build(set.weight_lbs ?? 0, "lb") : Weight.build(set.weight_kg ?? 0, "kg"),
            completedWeight:
              set.weight_lbs != null ? Weight.build(set.weight_lbs ?? 0, "lb") : Weight.build(set.weight_kg ?? 0, "kg"),
            reps: set.reps ?? 1,
            completedReps: set.reps ?? 1,
            completedRepsLeft: isUnilateral ? set.reps : undefined,
            isUnilateral,
            isCompleted: true,
            isAmrap: false,
            timestamp: startTs,
          })),
          sets: record.sets.map((set, i) => ({
            vtype: "set" as const,
            id: UidFactory.generateUid(6),
            index: i,
            weight:
              set.weight_lbs != null ? Weight.build(set.weight_lbs ?? 0, "lb") : Weight.build(set.weight_kg ?? 0, "kg"),
            originalWeight:
              set.weight_lbs != null ? Weight.build(set.weight_lbs ?? 0, "lb") : Weight.build(set.weight_kg ?? 0, "kg"),
            completedWeight:
              set.weight_lbs != null ? Weight.build(set.weight_lbs ?? 0, "lb") : Weight.build(set.weight_kg ?? 0, "kg"),
            reps: set.reps ?? 1,
            completedReps: set.reps ?? 1,
            completedRepsLeft: isUnilateral ? set.reps : undefined,
            isAmrap: false,
            timestamp: startTs,
            isUnilateral,
            isCompleted: true,
          })),
          notes: record.exercise_notes,
        };
      });
      return {
        vtype: "history_record",
        id: endTs ?? Date.now(),
        date: new Date(endTs ?? Date.now()).toISOString(),
        startTime: startTs ?? Date.now(),
        endTime: endTs ?? Date.now(),
        dayName: hevyWorkout.title,
        programName: "Hevy",
        programId: "hevy",
        day: 1,
        notes: hevyWorkout.description,
        entries,
      };
    });

    return { historyRecords, customExercises };
  }
}
