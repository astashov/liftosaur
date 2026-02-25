import { IDayData } from "../types";

export function DayData_toString(dayData: IDayData): string {
  return `${dayData.week}_${dayData.dayInWeek}`;
}
