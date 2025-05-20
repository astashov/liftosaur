import { h, JSX } from "preact";
import {
  IPlannerProgramExercise,
  IPlannerExerciseState,
  IPlannerProgramReuse,
  IPlannerExerciseUi,
} from "../../pages/planner/models/types";
import { IDayData, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram, Program } from "../../models/program";
import { InputSelect } from "../inputSelect";
import { PP } from "../../models/pp";
import { lb } from "lens-shmens";
import { ObjectUtils } from "../../utils/object";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { EditProgramExerciseSetVariationsList } from "./editProgramExerciseSetVariationsList";
import { EditProgramUiExerciseSetVariations } from "../editProgram/editProgramUiExerciseSetVariations";
import { LinkButton } from "../linkButton";
import { Weight } from "../../models/weight";

interface IEditProgramExerciseDayExerciseProps {
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

interface IReuseSetsCandidate {
  exercise: IPlannerProgramExercise;
  weekAndDays: Record<number, Set<number>>;
}

function getReuseSetsCandidates(
  key: string,
  evaluatedProgram: IEvaluatedProgram,
  dayData: Required<IDayData>
): Record<string, IReuseSetsCandidate> {
  const result: Record<string, IReuseSetsCandidate> = {};
  PP.iterate2(evaluatedProgram.weeks, (exercise, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
    if (exercise.key === key && dayData.week === weekIndex + 1 && dayData.dayInWeek === dayInWeekIndex + 1) {
      return;
    }
    let reuseSetCandidate = result[exercise.key];
    if (!reuseSetCandidate) {
      reuseSetCandidate = {
        exercise,
        weekAndDays: {},
      };
      result[exercise.key] = reuseSetCandidate;
    }
    reuseSetCandidate.weekAndDays[weekIndex + 1] = reuseSetCandidate.weekAndDays[weekIndex + 1] || new Set<number>();
    reuseSetCandidate.weekAndDays[weekIndex + 1].add(dayInWeekIndex + 1);
  });
  return result;
}

export function EditProgramExerciseDayExercise(props: IEditProgramExerciseDayExerciseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;

  const reuse = plannerExercise.reuse;
  const reuseKey = reuse?.exercise?.key;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const reuseCandidates = getReuseSetsCandidates(
    plannerExercise.fullName,
    props.evaluatedProgram,
    plannerExercise.dayData
  );
  const hasOwnSets = plannerExercise.setVariations.length > 0;
  console.log("Planner exercise", plannerExercise);
  const reusingExercises = Program.getReusingSetsExercises(props.evaluatedProgram, plannerExercise);
  const reuseCandidate = reuseKey ? reuseCandidates[reuseKey] : undefined;
  const reuseValues: [string, string][] = [
    ["", "None"],
    ...ObjectUtils.entries(
      ObjectUtils.mapValues<IReuseSetsCandidate, string, typeof reuseCandidates>(
        reuseCandidates,
        (value) => value.exercise.fullName
      )
    ),
  ];

  return (
    <div>
      {reusingExercises.length > 0 && (
        <div className="px-4 text-xs">
          <div>Reused by:</div>
          <ul>
            {reusingExercises.map((e, i) => {
              return (
                <li className="ml-4 font-semibold list-disc" key={`${e.key}-${e.dayData.week}-${e.dayData.dayInWeek}`}>
                  {e.fullName}[{e.dayData.week}:{e.dayData.dayInWeek}]
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div
        className="flex-1 px-4 text-sm"
        onClick={() => {
          if (reusingExercises.length > 0) {
            alert("You cannot reuse sets from this exercise because it is already reused by other exercises.");
          }
        }}
      >
        <InputSelect
          name="program-exercise-reuse-select"
          expandValue
          label="Reuse sets from"
          disabled={reusingExercises.length > 0}
          values={reuseValues}
          value={reuseKey ?? ""}
          onChange={(value) => {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers.changeCurrentInstance2(
                  program,
                  plannerExercise,
                  plannerExercise.dayData,
                  props.settings,
                  true,
                  (ex) => {
                    if (!value) {
                      ex.reuse = undefined;
                      return;
                    }
                    const newReuseCandidate = reuseCandidates[value];
                    if (newReuseCandidate) {
                      const currentWeek = newReuseCandidate.weekAndDays[plannerExercise.dayData.week];
                      const week = !currentWeek ? ObjectUtils.keys(newReuseCandidate.weekAndDays)[0] : undefined;
                      const day =
                        week != null || (currentWeek != null && currentWeek.size > 1)
                          ? Array.from(newReuseCandidate.weekAndDays[week ?? plannerExercise.dayData.week])[0]
                          : undefined;
                      ex.reuse = {
                        fullName: newReuseCandidate.exercise.fullName,
                        week,
                        day,
                        source: "overall",
                        exercise: newReuseCandidate.exercise,
                      };
                    }
                  }
                );
              })
            );
          }}
        />
      </div>
      {reuseCandidate && reuse && (
        <div className="flex gap-4 px-4 mt-1 mb-2">
          <div className="flex-1">
            <ReuseAtWeekDay
              plannerExercise={plannerExercise}
              settings={props.settings}
              reuse={reuse}
              reuseCandidate={reuseCandidate}
              plannerDispatch={props.plannerDispatch}
            />
          </div>
          {reuse &&
            (hasOwnSets ? (
              <LinkButton
                className="text-sm"
                name="edit-exercise-remove-override-sets"
                onClick={() => {
                  props.plannerDispatch(
                    lbProgram.recordModify((program) => {
                      return EditProgramUiHelpers.changeCurrentInstance2(
                        program,
                        plannerExercise,
                        plannerExercise.dayData,
                        props.settings,
                        true,
                        (ex) => {
                          if (reuse.exercise?.evaluatedSetVariations) {
                            ex.evaluatedSetVariations = reuse.exercise.evaluatedSetVariations;
                          }
                        }
                      );
                    })
                  );
                }}
              >
                Back to reused sets
              </LinkButton>
            ) : (
              <LinkButton
                className="text-sm"
                name="edit-exercise-override-sets"
                onClick={() => {
                  props.plannerDispatch(
                    lbProgram.recordModify((program) => {
                      return EditProgramUiHelpers.changeCurrentInstance2(
                        program,
                        plannerExercise,
                        plannerExercise.dayData,
                        props.settings,
                        true,
                        (ex) => {
                          ex.evaluatedSetVariations = [
                            {
                              isCurrent: true,
                              sets: [
                                {
                                  maxrep: 5,
                                  weight: Weight.build(100, props.settings.units),
                                  logRpe: false,
                                  isAmrap: false,
                                  askWeight: false,
                                  isQuickAddSet: false,
                                },
                              ],
                            },
                          ];
                        }
                      );
                    })
                  );
                }}
              >
                Override Sets
              </LinkButton>
            ))}
        </div>
      )}
      {reuse && !hasOwnSets ? (
        <div className="px-4">
          <EditProgramUiExerciseSetVariations
            plannerExercise={plannerExercise}
            settings={props.settings}
            isCurrentIndicatorNearby={true}
          />
        </div>
      ) : (
        <EditProgramExerciseSetVariationsList
          ui={props.ui}
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={props.plannerDispatch}
        />
      )}
    </div>
  );
}

interface IReuseAtWeekDayProps {
  reuseCandidate: IReuseSetsCandidate;
  plannerExercise: IPlannerProgramExercise;
  reuse: IPlannerProgramReuse;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
}

function ReuseAtWeekDay(props: IReuseAtWeekDayProps): JSX.Element {
  const { reuseCandidate, reuse, plannerExercise } = props;
  const reuseCandidateWeeksAndDays = reuseCandidate.weekAndDays;
  const currentWeek = reuseCandidate.weekAndDays[plannerExercise.dayData.week];
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
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
        className="mx-1 border border-grayv3-200"
        value={week || ""}
        data-cy="edit-exercise-reuse-sets-week"
        onChange={(event) => {
          const target = event.target as HTMLSelectElement | undefined;
          const valueStr = target?.value;
          props.plannerDispatch(
            lbProgram.recordModify((program) => {
              return EditProgramUiHelpers.changeCurrentInstance2(
                program,
                plannerExercise,
                plannerExercise.dayData,
                props.settings,
                true,
                (ex) => {
                  if (valueStr) {
                    const value = Number(valueStr);
                    if (isNaN(value)) {
                      return;
                    }
                    const days = reuseCandidate.weekAndDays[value];
                    const newDay = days != null ? Array.from(days)[0] : 1;
                    ex.reuse = {
                      fullName: reuseCandidate.exercise.fullName,
                      week: value,
                      day: newDay,
                      source: "overall",
                      exercise: reuseCandidate.exercise,
                    };
                  } else {
                    const currW = reuseCandidate.weekAndDays[plannerExercise.dayData.week];
                    const newDay = currW != null && currW.size > 1 ? Array.from(currW)[0] : undefined;
                    ex.reuse = {
                      fullName: reuseCandidate.exercise.fullName,
                      week: undefined,
                      day: newDay,
                      source: "overall",
                      exercise: reuseCandidate.exercise,
                    };
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
        className="mx-1 border border-grayv3-200"
        value={day || ""}
        data-cy="edit-exercise-reuse-sets-day"
        onChange={(event) => {
          const target = event.target as HTMLSelectElement | undefined;
          const valueStr = target?.value;
          props.plannerDispatch(
            lbProgram.recordModify((program) => {
              return EditProgramUiHelpers.changeCurrentInstance2(
                program,
                plannerExercise,
                plannerExercise.dayData,
                props.settings,
                true,
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
