import { ISetsStatus, Reps_isFinished, Reps_isCompleted, Reps_isInRangeCompleted } from "../models/set";
import { ISet } from "../types";
import { Tailwind_semantic, Tailwind_colors } from "./tailwindConfig";

export function WorkoutExerciseUtils_getColor(sets: ISet[], isWarmup: boolean): string {
  if (sets.length === 0) {
    return "purple";
  }
  if (Reps_isFinished(sets)) {
    if (isWarmup) {
      return "green";
    } else {
      if (Reps_isCompleted(sets)) {
        return "green";
      } else if (Reps_isInRangeCompleted(sets)) {
        return "yellow";
      } else {
        return "red";
      }
    }
  } else {
    return "purple";
  }
}

export function WorkoutExerciseUtils_getBgColor50(sets: ISet[], isWarmup: boolean): string {
  const color = WorkoutExerciseUtils_getColor(sets, isWarmup);
  if (color === "green") {
    return "bg-color-green50";
  } else if (color === "red") {
    return "bg-color-red50";
  } else if (color === "yellow") {
    return "bg-color-yellow50";
  } else {
    return "bg-color-purple50";
  }
}

export function WorkoutExerciseUtils_getBgColor100(sets: ISet[], isWarmup: boolean): string {
  const color = WorkoutExerciseUtils_getColor(sets, isWarmup);
  if (color === "green") {
    return "bg-color-green100";
  } else if (color === "red") {
    return "bg-color-red100";
  } else if (color === "yellow") {
    return "bg-color-yellow100";
  } else {
    return "bg-color-purple100";
  }
}

export function WorkoutExerciseUtils_getBgColor200(sets: ISet[], isWarmup: boolean): string {
  const color = WorkoutExerciseUtils_getColor(sets, isWarmup);
  if (color === "green") {
    return "bg-color-green200";
  } else if (color === "red") {
    return "bg-color-red200";
  } else if (color === "yellow") {
    return "bg-color-yellow200";
  } else {
    return "bg-color-purple200";
  }
}

export function WorkoutExerciseUtils_getIconColor(sets: ISet[], isWarmup: boolean): string {
  const color = WorkoutExerciseUtils_getColor(sets, isWarmup);
  if (color === "green") {
    return Tailwind_semantic().icon.green;
  } else if (color === "red") {
    return Tailwind_semantic().icon.red;
  } else if (color === "yellow") {
    return Tailwind_semantic().icon.yellow;
  } else {
    return Tailwind_semantic().icon.light;
  }
}

export function WorkoutExerciseUtils_getBorderColor100(sets: ISet[], isWarmup: boolean): string {
  const color = WorkoutExerciseUtils_getColor(sets, isWarmup);
  if (color === "green") {
    return "border-color-green100";
  } else if (color === "red") {
    return "border-color-red100";
  } else if (color === "yellow") {
    return "border-color-yellow100";
  } else {
    return "border-color-purple100";
  }
}

export function WorkoutExerciseUtils_getBorderColor150(sets: ISet[], isWarmup: boolean): string {
  const color = WorkoutExerciseUtils_getColor(sets, isWarmup);
  if (color === "green") {
    return "border-color-green150";
  } else if (color === "red") {
    return "border-color-red150";
  } else if (color === "yellow") {
    return "border-color-yellow150";
  } else {
    return "border-color-purple150";
  }
}

export function WorkoutExerciseUtils_getBorderColor200(sets: ISet[], isWarmup: boolean): string {
  const color = WorkoutExerciseUtils_getColor(sets, isWarmup);
  if (color === "green") {
    return "border-color-green200";
  } else if (color === "red") {
    return "border-color-red200";
  } else if (color === "yellow") {
    return "border-color-yellow200";
  } else {
    return "border-color-purple200";
  }
}

export function WorkoutExerciseUtils_getBorderColor300(sets: ISet[], isWarmup: boolean): string {
  const color = WorkoutExerciseUtils_getColor(sets, isWarmup);
  if (color === "green") {
    return "border-color-green300";
  } else if (color === "red") {
    return "border-color-red300";
  } else if (color === "yellow") {
    return "border-color-yellow300";
  } else {
    return "border-color-purple300";
  }
}

export function WorkoutExerciseUtils_setsStatusToColor(status: ISetsStatus): string {
  switch (status) {
    case "success":
      return Tailwind_colors().green[600];
    case "in-range":
      return Tailwind_colors().yellow[600];
    case "failed":
      return Tailwind_colors().red[500];
    case "not-finished":
      return Tailwind_colors().lightgray[400];
  }
}

export function WorkoutExerciseUtils_setsStatusToBorderColor(status: ISetsStatus): string {
  switch (status) {
    case "success":
      return "border-green-700";
    case "in-range":
      return "border-yellow-700";
    case "failed":
      return "border-red-700";
    case "not-finished":
      return "border-gray-300";
  }
}

export function WorkoutExerciseUtils_setsStatusToTextColor(status: ISetsStatus): string {
  switch (status) {
    case "success":
      return "text-green-600";
    case "in-range":
      return "text-yellow-600";
    case "failed":
      return "text-red-600";
    case "not-finished":
      return "text-gray-300";
  }
}
