import { IDayData } from "../types";

export class DayData {
  public static toString(dayData: IDayData): string {
    return `${dayData.week}_${dayData.dayInWeek}`;
  }
}
