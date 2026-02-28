import {
  builtinProgramAgesKeys,
  builtinProgramDurationsKeys,
  IBuiltinProgramAge,
  IBuiltinProgramDuration,
  IBuiltinProgramFrequency,
  IBuiltinProgramGoal,
} from "../models/builtinPrograms";
import { IProgramIndexEntry } from "../models/program";

export interface IProgramFilter {
  age?: IBuiltinProgramAge;
  duration?: IBuiltinProgramDuration;
  frequency?: IBuiltinProgramFrequency;
  goal?: IBuiltinProgramGoal;
}

export type IProgramSort = "age" | "duration" | "frequency" | undefined;

export function ProgramFilter_filter(
  entries: IProgramIndexEntry[],
  filter: IProgramFilter,
  search?: string
): IProgramIndexEntry[] {
  return entries.filter((entry) => {
    let result = true;
    if (filter.age) {
      result = result && filter.age === entry.age;
    }
    if (filter.duration) {
      result = result && filter.duration === entry.duration;
    }
    if (filter.frequency) {
      result = result && Number(filter.frequency ?? 0) === Number(entry.frequency ?? 0);
    }
    if (filter.goal) {
      result = result && filter.goal === entry.goal;
    }
    if (search) {
      result = result && entry.name.toLowerCase().includes(search.toLowerCase());
    }
    return result;
  });
}

export function ProgramFilter_sort(entries: IProgramIndexEntry[], sort: IProgramSort): IProgramIndexEntry[] {
  if (!sort) {
    return entries;
  }
  const sorted = [...entries];
  sorted.sort((a, b) => {
    if (sort === "age") {
      const aIndex = builtinProgramAgesKeys.indexOf((a.age ?? "less_than_3_months") as IBuiltinProgramAge);
      const bIndex = builtinProgramAgesKeys.indexOf((b.age ?? "less_than_3_months") as IBuiltinProgramAge);
      return aIndex - bIndex;
    } else if (sort === "duration") {
      const aIndex = builtinProgramDurationsKeys.indexOf((a.duration ?? "30-45") as IBuiltinProgramDuration);
      const bIndex = builtinProgramDurationsKeys.indexOf((b.duration ?? "30-45") as IBuiltinProgramDuration);
      return aIndex - bIndex;
    } else if (sort === "frequency") {
      return (a.frequency ?? 0) - (b.frequency ?? 0);
    }
    return 0;
  });
  return sorted;
}
