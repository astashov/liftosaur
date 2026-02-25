import { ISetsStatus, Reps_isFinished, Reps_isCompleted, Reps_isInRangeCompleted } from "../models/set";
import { ISet } from "../types";
import { Tailwind } from "./tailwindConfig";

export class WorkoutExerciseUtils {
  public static getColor(sets: ISet[], isWarmup: boolean): string {
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

  public static getBgColor50(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
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

  public static getBgColor100(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
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

  public static getBgColor200(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
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

  public static getIconColor(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
    if (color === "green") {
      return Tailwind.semantic().icon.green;
    } else if (color === "red") {
      return Tailwind.semantic().icon.red;
    } else if (color === "yellow") {
      return Tailwind.semantic().icon.yellow;
    } else {
      return Tailwind.semantic().icon.light;
    }
  }

  public static getBorderColor100(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
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

  public static getBorderColor150(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
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

  public static getBorderColor200(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
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

  public static getBorderColor300(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
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

  public static setsStatusToColor(status: ISetsStatus): string {
    switch (status) {
      case "success":
        return Tailwind.colors().green[600];
      case "in-range":
        return Tailwind.colors().yellow[600];
      case "failed":
        return Tailwind.colors().red[500];
      case "not-finished":
        return Tailwind.colors().lightgray[400];
    }
  }

  public static setsStatusToBorderColor(status: ISetsStatus): string {
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

  public static setsStatusToTextColor(status: ISetsStatus): string {
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
}
