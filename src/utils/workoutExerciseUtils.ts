import { ISetsStatus, Reps } from "../models/set";
import { ISet } from "../types";
import { Tailwind } from "./tailwindConfig";

export class WorkoutExerciseUtils {
  public static getColor(sets: ISet[], isWarmup: boolean): string {
    if (sets.length === 0) {
      return "purple";
    }
    if (Reps.isFinished(sets)) {
      if (isWarmup) {
        return "green";
      } else {
        if (Reps.isCompleted(sets)) {
          return "green";
        } else if (Reps.isInRangeCompleted(sets)) {
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
      return "bg-greenv3-50";
    } else if (color === "red") {
      return "bg-redv3-50";
    } else if (color === "yellow") {
      return "bg-yellowv3-50";
    } else {
      return "bg-purplev3-50";
    }
  }

  public static getBgColor100(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
    if (color === "green") {
      return "bg-greenv3-100";
    } else if (color === "red") {
      return "bg-redv3-100";
    } else if (color === "yellow") {
      return "bg-yellowv3-100";
    } else {
      return "bg-purplev3-100";
    }
  }

  public static getBgColor200(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
    if (color === "green") {
      return "bg-greenv3-200";
    } else if (color === "red") {
      return "bg-redv3-200";
    } else if (color === "yellow") {
      return "bg-yellowv3-200";
    } else {
      return "bg-purplev3-200";
    }
  }

  public static getIconColor(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
    if (color === "green") {
      return Tailwind.colors().greenv3[600];
    } else if (color === "red") {
      return Tailwind.colors().redv3[500];
    } else if (color === "yellow") {
      return Tailwind.colors().yellowv3[600];
    } else {
      return Tailwind.colors().grayv3[200];
    }
  }

  public static getBorderColor100(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
    if (color === "green") {
      return "border-greenv3-100";
    } else if (color === "red") {
      return "border-redv3-100";
    } else if (color === "yellow") {
      return "border-yellowv3-100";
    } else {
      return "border-purplev3-100";
    }
  }

  public static getBorderColor150(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
    if (color === "green") {
      return "border-greenv3-150";
    } else if (color === "red") {
      return "border-redv3-150";
    } else if (color === "yellow") {
      return "border-yellowv3-150";
    } else {
      return "border-purplev3-150";
    }
  }

  public static getBorderColor200(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
    if (color === "green") {
      return "border-greenv3-200";
    } else if (color === "red") {
      return "border-redv3-200";
    } else if (color === "yellow") {
      return "border-yellowv3-200";
    } else {
      return "border-purplev3-200";
    }
  }

  public static getBorderColor300(sets: ISet[], isWarmup: boolean): string {
    const color = this.getColor(sets, isWarmup);
    if (color === "green") {
      return "border-greenv3-300";
    } else if (color === "red") {
      return "border-redv3-300";
    } else if (color === "yellow") {
      return "border-yellowv3-300";
    } else {
      return "border-purplev3-300";
    }
  }

  public static setsStatusToColor(status: ISetsStatus): string {
    switch (status) {
      case "success":
        return Tailwind.colors().greenv3[600];
      case "in-range":
        return Tailwind.colors().yellowv3[600];
      case "failed":
        return Tailwind.colors().redv3[500];
      case "not-finished":
        return Tailwind.colors().grayv3[400];
    }
  }

  public static setsStatusToBorderColor(status: ISetsStatus): string {
    switch (status) {
      case "success":
        return "border-greenv3-700";
      case "in-range":
        return "border-yellowv3-700";
      case "failed":
        return "border-redv3-700";
      case "not-finished":
        return "border-grayv3-300";
    }
  }

  public static setsStatusToTextColor(status: ISetsStatus): string {
    switch (status) {
      case "success":
        return "text-greenv3-600";
      case "in-range":
        return "text-yellowv3-600";
      case "failed":
        return "text-redv3-600";
      case "not-finished":
        return "text-grayv3-300";
    }
  }
}
