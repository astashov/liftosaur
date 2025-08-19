import { JSX, h } from "preact";
import {
  IReuseCandidate,
  IPlannerProgramExercise,
  IPlannerProgramReuse,
  IPlannerExerciseState,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ObjectUtils } from "../../utils/object";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";

interface IEditProgramExerciseReuseAtWeekDayProps {
  reuseCandidate: IReuseCandidate;
  plannerExercise: IPlannerProgramExercise;
  reuse: IPlannerProgramReuse;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  onChangeWeek: (exercise: IPlannerProgramExercise, value: string | undefined) => void;
  onChangeDay: (exercise: IPlannerProgramExercise, value: string | undefined) => void;
}

export function EditProgramExerciseReuseAtWeekDay(props: IEditProgramExerciseReuseAtWeekDayProps): JSX.Element {
  const { reuseCandidate, reuse, plannerExercise } = props;
  const reuseCandidateWeeksAndDays = reuseCandidate.weekAndDays;
  const currentWeek = reuseCandidate.weekAndDays[plannerExercise.dayData.week];
  const week = reuse.week;

  const day =
    reuse.exercise?.dayData.dayInWeek ??
    (week != null || (currentWeek != null && currentWeek.size > 1)
      ? Array.from(reuseCandidate.weekAndDays[week ?? plannerExercise.dayData.week])[0]
      : undefined);

  return (
    <div className="text-sm">
      <span>At week</span>
      <select
        className="mx-1 border border-border-neutral"
        value={week || ""}
        data-cy="edit-exercise-reuse-sets-week"
        onChange={(event) => {
          const target = event.target as HTMLSelectElement | undefined;
          const valueStr = target?.value;
          EditProgramUiHelpers.changeCurrentInstanceExercise(
            props.plannerDispatch,
            plannerExercise,
            props.settings,
            (ex) => {
              props.onChangeWeek(ex, valueStr);
            }
          );
        }}
      >
        {[...(currentWeek ? [""] : []), ...ObjectUtils.keys(reuseCandidateWeeksAndDays || {})].map((w) => {
          return (
            <option value={w} selected={(week ?? "") === w}>
              {w === "" ? "Same" : w}
            </option>
          );
        })}
      </select>
      <span className="ml-2">day</span>
      <select
        className="mx-1 border border-border-neutral"
        value={day || ""}
        data-cy="edit-exercise-reuse-sets-day"
        onChange={(event) => {
          const target = event.target as HTMLSelectElement | undefined;
          const valueStr = target?.value;
          EditProgramUiHelpers.changeCurrentInstanceExercise(
            props.plannerDispatch,
            plannerExercise,
            props.settings,
            (ex) => {
              props.onChangeDay(ex, valueStr);
            }
          );
        }}
      >
        {Array.from(reuseCandidateWeeksAndDays[week ?? reuse.exercise?.dayData.week ?? 1]).map((d) => {
          return (
            <option value={d} selected={day === d}>
              {d}
            </option>
          );
        })}
      </select>
    </div>
  );
}
