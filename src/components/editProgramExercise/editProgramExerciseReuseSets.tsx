import { h, JSX, Fragment } from "preact";
import {
  IPlannerProgramExercise,
  IPlannerExerciseState,
  IReuseCandidate,
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
import { LinkButton } from "../linkButton";
import { EditProgramExerciseReuseAtWeekDay } from "./editProgramExerciseReuseAtWeekDay";

interface IEditProgramExerciseReuseSetsExerciseProps {
  ui: IPlannerExerciseUi;
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  isOverriding: boolean;
  setIsOverriding: (value: boolean) => void;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

function getReuseSetsCandidates(
  key: string,
  evaluatedProgram: IEvaluatedProgram,
  dayData: Required<IDayData>
): Record<string, IReuseCandidate> {
  const result: Record<string, IReuseCandidate> = {};
  PP.iterate2(evaluatedProgram.weeks, (exercise, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
    if (
      exercise.key === key &&
      ((dayData.week === weekIndex + 1 && dayData.dayInWeek === dayInWeekIndex + 1) || exercise.isRepeat)
    ) {
      return;
    }
    if (exercise.reuse != null || exercise.progress?.reuse != null || exercise.update?.reuse != null) {
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

export function EditProgramExerciseReuseSetsExercise(props: IEditProgramExerciseReuseSetsExerciseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;

  const reuse = plannerExercise.reuse;
  const reuseKey = reuse?.exercise?.key;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const reuseSetsCandidates = getReuseSetsCandidates(
    plannerExercise.key,
    props.evaluatedProgram,
    plannerExercise.dayData
  );
  const isOverriding = props.isOverriding;
  const reusingSetsExercises = Program.getReusingSetsExercises(props.evaluatedProgram, plannerExercise);
  const reuseSetCandidate = reuseKey ? reuseSetsCandidates[reuseKey] : undefined;
  const reuseSetValues: [string, string | JSX.Element][] = [
    ["", "None"],
    ...ObjectUtils.entries(
      ObjectUtils.mapValues<IReuseCandidate, string, typeof reuseSetsCandidates>(
        reuseSetsCandidates,
        (value) => value.exercise.fullName
      )
    ),
  ];

  if (reuseSetValues.length < 2) {
    return <></>;
  }

  return (
    <div>
      {reusingSetsExercises.length > 0 && (
        <div className="px-4 text-xs">
          <div>Reused by:</div>
          <ul>
            {reusingSetsExercises.map((e, i) => {
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
        className="flex-1 px-4 mb-2 text-sm"
        data-cy="edit-exercise-reuse-sets"
        onClick={() => {
          if (reusingSetsExercises.length > 0) {
            alert("You cannot reuse sets from this exercise because it is already reused by other exercises.");
          }
        }}
      >
        <InputSelect
          hint="You can only reuse sets of exercises that don't reuse other exercises"
          name="reuse-select"
          expandValue
          label="Reuse sets from"
          disabled={reusingSetsExercises.length > 0}
          values={reuseSetValues}
          value={reuseKey ?? ""}
          onChange={(value) => {
            let isProgressEnabled = props.ui.isProgressEnabled;
            let isUpdateEnabled = props.ui.isUpdateEnabled;
            EditProgramUiHelpers.changeCurrentInstanceExercise(
              props.plannerDispatch,
              plannerExercise,
              props.settings,
              (ex) => {
                if (!value) {
                  ex.reuse = undefined;
                  return;
                }
                const newReuseCandidate = reuseSetsCandidates[value];
                if (newReuseCandidate) {
                  const currentWeek = newReuseCandidate.weekAndDays[plannerExercise.dayData.week];
                  const week = !currentWeek ? ObjectUtils.keys(newReuseCandidate.weekAndDays)[0] : undefined;
                  const day =
                    plannerExercise.key === newReuseCandidate.exercise.key ||
                    week != null ||
                    (currentWeek != null && currentWeek.size > 1)
                      ? Array.from(newReuseCandidate.weekAndDays[week ?? plannerExercise.dayData.week])[0]
                      : undefined;
                  ex.reuse = {
                    fullName: newReuseCandidate.exercise.fullName,
                    week,
                    day,
                    source: "overall",
                    exercise: newReuseCandidate.exercise,
                  };
                  if (ex.reuse.exercise) {
                    ex.evaluatedSetVariations = ex.reuse.exercise.evaluatedSetVariations;
                  }
                  isProgressEnabled = !!ex.reuse.exercise?.progress || !!ex.progress;
                  isUpdateEnabled = !!ex.reuse.exercise?.update || !!ex.update;
                }
              }
            );
            props.setIsOverriding(false);
            props.plannerDispatch(
              [
                lb<IPlannerExerciseState>().p("ui").p("isProgressEnabled").record(isProgressEnabled),
                lb<IPlannerExerciseState>().p("ui").p("isUpdateEnabled").record(isUpdateEnabled),
              ],
              "Update progress/update UI flags"
            );
          }}
        />
      </div>
      {reuseSetCandidate && reuse && (
        <div className="flex gap-4 px-4 mb-2">
          <div className="flex-1">
            <EditProgramExerciseReuseAtWeekDay
              plannerExercise={plannerExercise}
              settings={props.settings}
              reuse={reuse}
              reuseCandidate={reuseSetCandidate}
              plannerDispatch={props.plannerDispatch}
              onChangeWeek={(ex, valueStr) => {
                if (valueStr) {
                  const value = Number(valueStr);
                  if (isNaN(value)) {
                    return;
                  }
                  const days = reuseSetCandidate.weekAndDays[value];
                  const newDay = days != null ? Array.from(days)[0] : 1;
                  ex.reuse = {
                    fullName: reuseSetCandidate.exercise.fullName,
                    week: value,
                    day: newDay,
                    source: "overall",
                    exercise: reuseSetCandidate.exercise,
                  };
                } else {
                  const currW = reuseSetCandidate.weekAndDays[plannerExercise.dayData.week];
                  const newDay = currW != null && currW.size > 1 ? Array.from(currW)[0] : undefined;
                  ex.reuse = {
                    fullName: reuseSetCandidate.exercise.fullName,
                    week: undefined,
                    day: newDay,
                    source: "overall",
                    exercise: reuseSetCandidate.exercise,
                  };
                }
              }}
              onChangeDay={(ex, valueStr) => {
                if (valueStr && ex.reuse) {
                  const value = Number(valueStr);
                  if (!isNaN(value)) {
                    ex.reuse = { ...ex.reuse, day: value };
                  }
                }
              }}
            />
          </div>
          {reuse &&
            (isOverriding ? (
              <LinkButton
                className="text-sm"
                data-cy="edit-exercise-remove-override-sets"
                name="edit-exercise-remove-override-sets"
                onClick={() => {
                  EditProgramUiHelpers.changeCurrentInstanceExercise(
                    props.plannerDispatch,
                    plannerExercise,
                    props.settings,
                    (ex) => {
                      if (reuse.exercise?.evaluatedSetVariations) {
                        ex.evaluatedSetVariations = [];
                        props.setIsOverriding(false);
                      }
                    }
                  );
                }}
              >
                Back to reused sets
              </LinkButton>
            ) : (
              <LinkButton
                className="text-sm"
                name="edit-exercise-override-sets"
                data-cy="edit-exercise-override-sets"
                onClick={() => {
                  props.plannerDispatch(
                    lbProgram.recordModify((program) => {
                      return EditProgramUiHelpers.changeCurrentInstance2(
                        program,
                        plannerExercise,
                        props.settings,
                        true,
                        (ex) => {
                          ex.evaluatedSetVariations = ObjectUtils.clone(reuse.exercise?.evaluatedSetVariations || []);
                          props.setIsOverriding(true);
                        }
                      );
                    }),
                    "Override reused sets"
                  );
                }}
              >
                Override Sets
              </LinkButton>
            ))}
        </div>
      )}
    </div>
  );
}
