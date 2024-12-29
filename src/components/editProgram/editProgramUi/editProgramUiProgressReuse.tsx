import { lb } from "lens-shmens";
import React, { JSX } from "react";
import { PP } from "../../../models/pp";
import { IPlannerProgramExercise, IPlannerState } from "../../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../../pages/planner/plannerExerciseEvaluator";
import { IDayData, ISettings } from "../../../types";
import { CollectionUtils } from "../../../utils/collection";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { EditProgramUiHelpers } from "./editProgramUiHelpers";

interface IEditProgramUiProgressReuseProps {
  evaluatedWeeks: IPlannerEvalResult[][];
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  dayData: Required<IDayData>;
  exerciseLine: number;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

function getProgressReuseCandidates(fullname: string, evaluatedWeeks: IPlannerEvalResult[][]): string[] {
  const result: Set<string> = new Set();
  PP.iterate(evaluatedWeeks, (exercise) => {
    if (exercise.fullName === fullname) {
      return;
    }
    const progress = exercise.properties.find((p) => p.name === "progress");
    if (!progress || progress.reuse) {
      return;
    }
    result.add(exercise.fullName);
  });
  return Array.from(result);
}

export function EditProgramUiProgressReuse(props: IEditProgramUiProgressReuseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const progress = plannerExercise.properties.find((p) => p.name === "progress");
  const lbProgram = lb<IPlannerState>().p("current").p("program");
  const reuseCandidates = getProgressReuseCandidates(plannerExercise.fullName, props.evaluatedWeeks);

  return (
    <div>
      <span className="mr-2">Reuse progress from:</span>
      <select
        data-cy="edit-exercise-reuse-progress-select"
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
                        exercise.properties.some((p) => p.name === "progress" && p.fnName !== "none")
                      ) {
                        reusedExercise = exercise;
                      }
                    });
                    if (reusedExercise) {
                      const reusedProgress = reusedExercise.properties.find((p) => p.name === "progress");
                      if (reusedProgress) {
                        const newProgress =
                          reusedProgress.fnName !== "custom"
                            ? { ...reusedProgress }
                            : {
                                ...reusedProgress,
                                script: undefined,
                                body: value,
                              };
                        ex.properties = CollectionUtils.removeBy(ex.properties, "name", "progress");
                        ex.properties.push(newProgress);
                      }
                    }
                  } else {
                    ex.properties = CollectionUtils.removeBy(ex.properties, "name", "progress");
                  }
                }
              );
            })
          );
        }}
      >
        {["", ...reuseCandidates].map((fullName) => {
          return (
            <option value={fullName.trim()} selected={progress?.body?.trim() === fullName.trim()}>
              {fullName.trim()}
            </option>
          );
        })}
      </select>
    </div>
  );
}
