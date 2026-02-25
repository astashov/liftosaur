import { h, JSX } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState, IReuseCandidate } from "../../pages/planner/models/types";
import { IDayData, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IEvaluatedProgram, Program_getReusingDescriptionsExercises } from "../../models/program";
import { InputSelect } from "../inputSelect";
import { PP } from "../../models/pp";
import { ObjectUtils_entries, ObjectUtils_mapValues, ObjectUtils_keys } from "../../utils/object";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { LinkButton } from "../linkButton";
import { EditProgramExerciseReuseAtWeekDay } from "./editProgramExerciseReuseAtWeekDay";

interface IEditProgramExerciseReuseDescriptionsProps {
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

function getReuseDescriptionsCandidates(
  key: string,
  evaluatedProgram: IEvaluatedProgram,
  dayData: Required<IDayData>
): Record<string, IReuseCandidate> {
  const result: Record<string, IReuseCandidate> = {};
  PP.iterate2(evaluatedProgram.weeks, (exercise, weekIndex, dayInWeekIndex, dayIndex, exerciseIndex) => {
    if (exercise.key === key && dayData.week === weekIndex + 1 && dayData.dayInWeek === dayInWeekIndex + 1) {
      return;
    }
    if (exercise.descriptions.values.length === 0) {
      return;
    }
    if (exercise.descriptions.reuse != null) {
      return;
    }
    let reuseDescriptionCandidate = result[exercise.key];
    if (!reuseDescriptionCandidate) {
      reuseDescriptionCandidate = {
        exercise,
        weekAndDays: {},
      };
      result[exercise.key] = reuseDescriptionCandidate;
    }
    reuseDescriptionCandidate.weekAndDays[weekIndex + 1] =
      reuseDescriptionCandidate.weekAndDays[weekIndex + 1] || new Set<number>();
    reuseDescriptionCandidate.weekAndDays[weekIndex + 1].add(dayInWeekIndex + 1);
  });
  return result;
}

export function EditProgramExerciseReuseDescriptions(props: IEditProgramExerciseReuseDescriptionsProps): JSX.Element {
  const plannerExercise = props.plannerExercise;

  const reuseDescriptionKey = plannerExercise.descriptions.reuse?.exercise?.key;
  const reuseDescriptionsCandidates = getReuseDescriptionsCandidates(
    plannerExercise.fullName,
    props.evaluatedProgram,
    plannerExercise.dayData
  );

  const reusingDescriptionsExercises = Program_getReusingDescriptionsExercises(props.evaluatedProgram, plannerExercise);
  const reuseDescriptionCandidate = reuseDescriptionKey ? reuseDescriptionsCandidates[reuseDescriptionKey] : undefined;
  const reuseDescriptionValues: [string, string][] = [
    ["", "None"],
    ...ObjectUtils_entries(
      ObjectUtils_mapValues<IReuseCandidate, string, typeof reuseDescriptionsCandidates>(
        reuseDescriptionsCandidates,
        (value) => value.exercise.fullName
      )
    ),
  ];

  return (
    <div>
      {reusingDescriptionsExercises.length > 0 && (
        <div className="px-4 text-xs">
          <div>Reused by:</div>
          <ul>
            {reusingDescriptionsExercises.map((e, i) => {
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
        onClick={() => {
          if (reusingDescriptionsExercises.length > 0) {
            alert("You cannot reuse descriptions from this exercise because it is already reused by other exercises.");
          }
        }}
      >
        <InputSelect
          name="program-exercise-reuse-descriptions-select"
          expandValue
          label="Reuse descriptions from"
          disabled={reusingDescriptionsExercises.length > 0}
          values={reuseDescriptionValues}
          value={reuseDescriptionKey ?? ""}
          onChange={(value) => {
            return EditProgramUiHelpers.changeCurrentInstanceExercise(
              props.plannerDispatch,
              plannerExercise,
              props.settings,
              (ex) => {
                if (!value) {
                  ex.descriptions.reuse = undefined;
                  return;
                }
                const newReuseCandidate = reuseDescriptionsCandidates[value];
                if (newReuseCandidate) {
                  const currentWeek = newReuseCandidate.weekAndDays[plannerExercise.dayData.week];
                  const week = !currentWeek ? ObjectUtils_keys(newReuseCandidate.weekAndDays)[0] : undefined;
                  const day =
                    week != null || (currentWeek != null && currentWeek.size > 1)
                      ? Array.from(newReuseCandidate.weekAndDays[week ?? plannerExercise.dayData.week])[0]
                      : undefined;
                  ex.descriptions = {
                    reuse: {
                      fullName: newReuseCandidate.exercise.fullName,
                      week,
                      day,
                      source: "overall",
                      exercise: newReuseCandidate.exercise,
                    },
                    values: newReuseCandidate.exercise.descriptions.values,
                  };
                }
              }
            );
          }}
        />
      </div>
      {reuseDescriptionCandidate && reuseDescriptionKey && plannerExercise.descriptions.reuse && (
        <div className="flex gap-4 px-4 mb-2">
          <div className="flex-1">
            <EditProgramExerciseReuseAtWeekDay
              plannerExercise={plannerExercise}
              settings={props.settings}
              reuse={plannerExercise.descriptions.reuse}
              reuseCandidate={reuseDescriptionCandidate}
              plannerDispatch={props.plannerDispatch}
              onChangeWeek={(ex, valueStr) => {
                if (valueStr) {
                  const value = Number(valueStr);
                  if (isNaN(value)) {
                    return;
                  }
                  const days = reuseDescriptionCandidate.weekAndDays[value];
                  const newDay = days != null ? Array.from(days)[0] : 1;
                  ex.descriptions.reuse = {
                    fullName: reuseDescriptionCandidate.exercise.fullName,
                    week: value,
                    day: newDay,
                    source: "overall",
                    exercise: reuseDescriptionCandidate.exercise,
                  };
                } else {
                  const currW = reuseDescriptionCandidate.weekAndDays[plannerExercise.dayData.week];
                  const newDay = currW != null && currW.size > 1 ? Array.from(currW)[0] : undefined;
                  ex.descriptions.reuse = {
                    fullName: reuseDescriptionCandidate.exercise.fullName,
                    week: undefined,
                    day: newDay,
                    source: "overall",
                    exercise: reuseDescriptionCandidate.exercise,
                  };
                }
              }}
              onChangeDay={(ex, valueStr) => {
                if (valueStr && ex.reuse) {
                  const value = Number(valueStr);
                  if (!isNaN(value) && ex.descriptions.reuse) {
                    ex.descriptions.reuse = { ...ex.descriptions.reuse, day: value };
                  }
                }
              }}
            />
          </div>
          {reuseDescriptionKey && (
            <LinkButton
              className="text-sm"
              name="edit-exercise-override-descriptions"
              onClick={() => {
                return EditProgramUiHelpers.changeCurrentInstanceExercise(
                  props.plannerDispatch,
                  plannerExercise,
                  props.settings,
                  (ex) => {
                    ex.descriptions = {
                      reuse: undefined,
                      values: [{ value: "", isCurrent: true }],
                    };
                  }
                );
              }}
            >
              Override
            </LinkButton>
          )}
        </div>
      )}
    </div>
  );
}
