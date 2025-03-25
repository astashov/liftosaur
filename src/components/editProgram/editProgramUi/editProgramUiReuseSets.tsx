import { lb } from "lens-shmens";
import { JSX, h } from "preact";
import { PP } from "../../../models/pp";
import { IPlannerProgramExercise, IPlannerProgramReuse, IPlannerState } from "../../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../../pages/planner/plannerExerciseEvaluator";
import { IDayData, ISettings } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { EditProgramUiHelpers } from "./editProgramUiHelpers";

interface IEditProgramUiReuseSetsProps {
  evaluatedWeeks: IPlannerEvalResult[][];
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  dayData: Required<IDayData>;
  exerciseLine: number;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

interface IReuseSetsCandidate {
  fullname: string;
  weekAndDays: Record<number, Set<number>>;
}

function getReuseSetsCandidates(
  fullname: string,
  evaluatedWeeks: IPlannerEvalResult[][],
  dayData: Required<IDayData>
): Record<string, IReuseSetsCandidate> {
  const result: Record<string, IReuseSetsCandidate> = {};
  PP.iterate(evaluatedWeeks, (exercise, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
    if (exercise.fullName === fullname && dayData.week === weekIndex + 1 && dayData.dayInWeek === dayInWeekIndex + 1) {
      return;
    }
    if (exercise.setVariations.length > 1) {
      return;
    }
    let reuseSetCandidate = result[exercise.fullName];
    if (!reuseSetCandidate) {
      reuseSetCandidate = {
        fullname: exercise.fullName,
        weekAndDays: {},
      };
      result[exercise.fullName] = reuseSetCandidate;
    }
    reuseSetCandidate.weekAndDays[weekIndex + 1] = reuseSetCandidate.weekAndDays[weekIndex + 1] || new Set<number>();
    reuseSetCandidate.weekAndDays[weekIndex + 1].add(dayInWeekIndex + 1);
  });
  return result;
}

export function EditProgramUiReuseSets(props: IEditProgramUiReuseSetsProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const reuse = plannerExercise.reuse;
  const reuseFullName = reuse?.fullName;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const reuseCandidates = getReuseSetsCandidates(plannerExercise.fullName, props.evaluatedWeeks, props.dayData);
  const reuseCandidate = reuseFullName ? reuseCandidates[reuseFullName] : undefined;
  const isMultipleSetVariations = plannerExercise.setVariations.length > 1;

  return (
    <div className="text-sm">
      {isMultipleSetVariations && (
        <span className="text-xs text-grayv2-main">Cannot reuse sets with set variations enabled</span>
      )}
      <div className={isMultipleSetVariations ? "opacity-50" : ""}>
        <span className="mr-2 text-sm">Reuse sets from:</span>
        <select
          disabled={isMultipleSetVariations}
          data-cy="edit-exercise-reuse-sets-select"
          value={reuseFullName || ""}
          onChange={(event) => {
            const target = event.target as HTMLSelectElement | undefined;
            const value = target?.value;
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers.changeCurrentInstance(
                  program,
                  props.dayData,
                  plannerExercise.fullName,
                  props.settings,
                  (ex) => {
                    if (!value) {
                      ex.reuse = undefined;
                      if (ex.setVariations.length === 0) {
                        ex.setVariations.push({
                          isCurrent: true,
                          sets: [
                            {
                              repRange: { isAmrap: false, isQuickAddSet: false, minrep: 1, maxrep: 1, numberOfSets: 1 },
                            },
                          ],
                        });
                      }
                      return;
                    }
                    const newReuseCandidate = reuseCandidates[value];
                    if (newReuseCandidate) {
                      const currentWeek = newReuseCandidate.weekAndDays[props.dayData.week];
                      const week = !currentWeek ? ObjectUtils.keys(newReuseCandidate.weekAndDays)[0] : undefined;
                      const day =
                        week != null || (currentWeek != null && currentWeek.size > 1)
                          ? Array.from(newReuseCandidate.weekAndDays[week ?? props.dayData.week])[0]
                          : undefined;
                      ex.reuse = { fullName: value.trim(), week, day };
                      ex.setVariations = [];
                    }
                  }
                );
              })
            );
          }}
        >
          {["", ...ObjectUtils.keys(reuseCandidates)].map((fullName) => {
            return (
              <option value={fullName.trim()} selected={reuseFullName?.trim() === fullName.trim()}>
                {fullName.trim()}
              </option>
            );
          })}
        </select>
      </div>
      {reuseCandidate && reuse && (
        <ReuseAtWeekDay
          fullName={plannerExercise.fullName}
          settings={props.settings}
          reuse={reuse}
          reuseCandidate={reuseCandidate}
          dayData={props.dayData}
          plannerDispatch={props.plannerDispatch}
        />
      )}
    </div>
  );
}

interface IReuseAtWeekDayProps {
  reuseCandidate: IReuseSetsCandidate;
  dayData: Required<IDayData>;
  reuse: IPlannerProgramReuse;
  settings: ISettings;
  fullName: string;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

function ReuseAtWeekDay(props: IReuseAtWeekDayProps): JSX.Element {
  const { reuseCandidate, reuse } = props;
  const reuseCandidateWeeksAndDays = reuseCandidate.weekAndDays;
  const currentWeek = reuseCandidate.weekAndDays[props.dayData.week];
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const week = reuse.week;

  const day =
    reuse.exercise?.dayData.dayInWeek ??
    (week != null || (currentWeek != null && currentWeek.size > 1)
      ? Array.from(reuseCandidate.weekAndDays[week ?? props.dayData.week])[0]
      : undefined);

  return (
    <div className="mb-2 text-xs text-grayv2-main">
      <span>At week</span>
      <select
        value={week || ""}
        data-cy="edit-exercise-reuse-sets-week"
        onChange={(event) => {
          const target = event.target as HTMLSelectElement | undefined;
          const valueStr = target?.value;
          props.plannerDispatch(
            lbProgram.recordModify((program) => {
              return EditProgramUiHelpers.changeCurrentInstance(
                program,
                props.dayData,
                props.fullName,
                props.settings,
                (ex) => {
                  if (valueStr) {
                    const value = Number(valueStr);
                    if (isNaN(value)) {
                      return;
                    }
                    const days = reuseCandidate.weekAndDays[value];
                    const newDay = days != null ? Array.from(days)[0] : 1;
                    ex.reuse = { fullName: reuseCandidate.fullname, week: value, day: newDay };
                  } else {
                    const currW = reuseCandidate.weekAndDays[props.dayData.week];
                    const newDay = currW != null && currW.size > 1 ? Array.from(currW)[0] : undefined;
                    ex.reuse = { fullName: reuseCandidate.fullname, week: undefined, day: newDay };
                  }
                }
              );
            })
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
        value={day || ""}
        data-cy="edit-exercise-reuse-sets-day"
        onChange={(event) => {
          const target = event.target as HTMLSelectElement | undefined;
          const valueStr = target?.value;
          props.plannerDispatch(
            lbProgram.recordModify((program) => {
              return EditProgramUiHelpers.changeCurrentInstance(
                program,
                props.dayData,
                props.fullName,
                props.settings,
                (ex) => {
                  if (valueStr && ex.reuse) {
                    const value = Number(valueStr);
                    if (!isNaN(value)) {
                      ex.reuse = { ...ex.reuse, day: value };
                    }
                  }
                }
              );
            })
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
