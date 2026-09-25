import { IHistoryRecord, IProgram, ISettings, IStats } from "../../types";
import { Program_evaluate, Program_nextHistoryRecord } from "../../models/program";

export interface IProgramPreviewDay {
  day: number;
  progress: IHistoryRecord;
}

export interface IProgramPreviewWeek {
  name: string;
  description?: string;
  days: IProgramPreviewDay[];
}

export function ProgramPreviewWeeks_build(
  program: IProgram,
  settings: ISettings,
  stats: IStats,
  weekIndex: number
): IProgramPreviewWeek | undefined {
  const evaluatedProgram = Program_evaluate(program, settings);
  const week = evaluatedProgram.weeks[weekIndex];
  if (week == null) {
    return undefined;
  }
  const daysBefore = evaluatedProgram.weeks.slice(0, weekIndex).reduce((sum, w) => sum + w.days.length, 0);
  return {
    name: week.name,
    description: week.description,
    days: week.days.map((_, i) => {
      const day = daysBefore + i + 1;
      return { day, progress: Program_nextHistoryRecord(program, settings, stats, day) };
    }),
  };
}
