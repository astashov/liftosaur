import { lb } from "lens-shmens";
import { JSX, h } from "preact";
import { PP } from "../../../models/pp";
import { IPlannerProgramExercise, IPlannerState } from "../../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../../pages/planner/plannerExerciseEvaluator";
import { IDayData, ISettings } from "../../../types";
import { CollectionUtils } from "../../../utils/collection";
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
    const update = exercise.properties.find((p) => p.name === "update");
    if (!update || update.reuse) {
      return;
    }
    result.add(exercise.fullName);
  });
  return Array.from(result);
}

export function EditProgramUiUpdateReuse(props: IEditProgramUiUpdateReuseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const update = plannerExercise.properties.find((p) => p.name === "update");
  const lbProgram = lb<IPlannerState>().p("current").p("program");
  const reuseCandidates = getUpdateReuseCandidates(plannerExercise.fullName, props.evaluatedWeeks);

  return (
    <div>
      <span className="mr-2">Reuse update from:</span>
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
                      if (
                        !reusedExercise &&
                        exercise.fullName === value &&
                        exercise.properties.some((p) => p.name === "update" && p.fnName !== "none")
                      ) {
                        reusedExercise = exercise;
                      }
                    });
                    if (reusedExercise) {
                      const reusedUpdate = reusedExercise.properties.find((p) => p.name === "update");
                      if (reusedUpdate) {
                        const newUpdate =
                          reusedUpdate.fnName !== "custom"
                            ? { ...reusedUpdate }
                            : {
                                ...reusedUpdate,
                                script: undefined,
                                body: value,
                              };
                        ex.properties = CollectionUtils.removeBy(ex.properties, "name", "update");
                        ex.properties.push(newUpdate);
                      }
                    }
                  } else {
                    ex.properties = CollectionUtils.removeBy(ex.properties, "name", "update");
                  }
                }
              );
            })
          );
        }}
      >
        {["", ...reuseCandidates].map((fullName) => {
          return (
            <option value={fullName.trim()} selected={update?.body?.trim() === fullName.trim()}>
              {fullName.trim()}
            </option>
          );
        })}
      </select>
    </div>
  );
}
