import { lb } from "lens-shmens";
import { JSX, h } from "preact";
import { PP } from "../../../models/pp";
import { IPlannerProgramExercise, IPlannerState } from "../../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../../pages/planner/plannerExerciseEvaluator";
import { IDayData, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { EditProgramUiHelpers } from "./editProgramUiHelpers";

interface IEditProgramUiUpdateReuseProps {
  evaluatedWeeks: IPlannerEvalResult[][];
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  dayData: Required<IDayData>;
  exerciseLine: number;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

function getUpdateReuseCandidates(fullname: string, evaluatedWeeks: IPlannerEvalResult[][]): string[] {
  const result: Set<string> = new Set();
  PP.iterate(evaluatedWeeks, (exercise) => {
    if (exercise.fullName === fullname) {
      return;
    }
    const update = exercise.update;
    if (!update || update.reuse) {
      return;
    }
    result.add(exercise.fullName);
  });
  return Array.from(result);
}

export function EditProgramUiUpdateReuse(props: IEditProgramUiUpdateReuseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const update = plannerExercise.update;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const reuseCandidates = getUpdateReuseCandidates(plannerExercise.fullName, props.evaluatedWeeks);

  return (
    <div>
      <span className="mr-2 text-sm">Reuse update from:</span>
      <select
        data-cy="edit-exercise-reuse-update-select"
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
                  if (value) {
                    let reusedExercise: IPlannerProgramExercise | undefined;
                    PP.iterate(props.evaluatedWeeks, (exercise) => {
                      if (!reusedExercise && exercise.fullName === value && exercise.update) {
                        reusedExercise = exercise;
                      }
                    });
                    if (reusedExercise) {
                      const reusedUpdate = reusedExercise.update;
                      if (reusedUpdate) {
                        const newUpdate =
                          reusedUpdate.type !== "custom"
                            ? { ...reusedUpdate }
                            : {
                                ...reusedUpdate,
                                script: undefined,
                                reuse: {
                                  fullName: value,
                                  exercise: reusedExercise,
                                },
                              };
                        ex.update = newUpdate;
                      }
                    }
                  } else if (ex.reuse?.exercise?.update != null) {
                    ex.update = {
                      type: "custom",
                      script: "{~ ~}",
                    };
                  } else {
                    ex.update = undefined;
                  }
                }
              );
            })
          );
        }}
      >
        {["", ...reuseCandidates].map((fullName) => {
          const isSelected =
            update?.reuse?.fullName.trim() === fullName.trim() ||
            (plannerExercise.reuse?.fullName.trim() === fullName.trim() &&
              plannerExercise.reuse?.exercise?.update != null &&
              plannerExercise.update == null);
          return (
            <option value={fullName.trim()} selected={isSelected}>
              {fullName.trim()}
            </option>
          );
        })}
      </select>
    </div>
  );
}
