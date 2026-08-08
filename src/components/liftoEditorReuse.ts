import { IEvaluatedProgram, Program_getReuseSetsCandidates, Program_getScriptReuseCandidates } from "../models/program";
import { ObjectUtils_keys, ObjectUtils_values } from "../utils/object";
import type { ILiftoEditorReuseSelection } from "./primitives/liftoEditorActions";
import type { IDayData } from "../types";

// What the "Reuse…" pills can offer, for whichever exercise is being edited. Needs the
// evaluated program, so it's built by the host rather than by the editor session.
export interface ILiftoEditorReuseCandidates {
  sets: ILiftoEditorReuseSelection[];
  progress: string[];
  update: string[];
}

// Mirrors the reuse-sets select of the edit-exercise screen: plain `...Name` resolves in
// the current week, so week/day are attached only when that would be wrong or ambiguous —
// target absent from this week, present on several of its days, or the same exercise.
function reuseSetsSelections(
  key: string,
  evaluatedProgram: IEvaluatedProgram,
  dayData: Required<IDayData>
): ILiftoEditorReuseSelection[] {
  const candidates = Program_getReuseSetsCandidates(key, evaluatedProgram, dayData);
  return ObjectUtils_values(candidates).map((candidate) => {
    const currentWeekDays = candidate.weekAndDays[dayData.week];
    const week = currentWeekDays == null ? Number(ObjectUtils_keys(candidate.weekAndDays)[0]) : undefined;
    const needsDay =
      week != null || candidate.exercise.key === key || (currentWeekDays != null && currentWeekDays.size > 1);
    const day = needsDay ? Array.from(candidate.weekAndDays[week ?? dayData.week] ?? [])[0] : undefined;
    return { fullName: candidate.exercise.fullName, week, day };
  });
}

export function LiftoEditorReuse_candidates(
  key: string,
  notused: boolean,
  evaluatedProgram: IEvaluatedProgram,
  dayData: Required<IDayData>
): ILiftoEditorReuseCandidates {
  return {
    sets: reuseSetsSelections(key, evaluatedProgram, dayData),
    progress: Program_getScriptReuseCandidates(key, notused, evaluatedProgram, "progress"),
    update: Program_getScriptReuseCandidates(key, notused, evaluatedProgram, "update"),
  };
}
