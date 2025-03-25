import { lb } from "lens-shmens";
import { JSX, h } from "preact";
import { PP } from "../../../models/pp";
import { IPlannerProgramExercise, IPlannerState, IProgramExerciseProgress } from "../../../pages/planner/models/types";
import { IPlannerEvalResult } from "../../../pages/planner/plannerExerciseEvaluator";
import { IDayData, ISettings } from "../../../types";
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
    const progress = exercise.progress;
    if (!progress || progress.reuse) {
      return;
    }
    result.add(exercise.fullName);
  });
  return Array.from(result);
}

export function EditProgramUiProgressReuse(props: IEditProgramUiProgressReuseProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const progress = plannerExercise.progress;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const reuseCandidates = getProgressReuseCandidates(plannerExercise.fullName, props.evaluatedWeeks);

  return (
    <div>
      <span className="mr-2 text-sm">Reuse progress from:</span>
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
                        exercise.progress &&
                        exercise.progress.type !== "none"
                      ) {
                        reusedExercise = exercise;
                      }
                    });
                    if (reusedExercise) {
                      const reusedProgress = reusedExercise.progress;
                      if (reusedProgress) {
                        const newProgress: IProgramExerciseProgress =
                          reusedProgress.type !== "custom"
                            ? { ...reusedProgress }
                            : {
                                ...reusedProgress,
                                script: undefined,
                                reuse: {
                                  fullName: value,
                                  exercise: reusedExercise,
                                },
                              };
                        ex.progress = newProgress;
                      }
                    }
                  } else if (ex.reuse?.exercise?.progress != null) {
                    ex.progress = {
                      state: {},
                      stateMetadata: {},
                      type: "custom",
                      script: "{~ ~}",
                    };
                  } else {
                    ex.progress = undefined;
                  }
                }
              );
            })
          );
        }}
      >
        {["", ...reuseCandidates].map((fullName) => {
          const isSelected =
            progress?.reuse?.fullName.trim() === fullName.trim() ||
            (plannerExercise.reuse?.fullName.trim() === fullName.trim() &&
              plannerExercise.reuse?.exercise?.progress != null &&
              plannerExercise.progress == null);
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
