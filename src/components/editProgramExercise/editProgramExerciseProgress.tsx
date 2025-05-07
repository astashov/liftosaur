import { h, JSX } from "preact";
import {
  IPlannerProgramExercise,
  IPlannerExerciseState,
  IProgramExerciseProgressType,
} from "../../pages/planner/models/types";
import { IProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { LinkButton } from "../linkButton";
import { IEvaluatedProgram, Program } from "../../models/program";
import { PP } from "../../models/pp";
import { MenuItemWrapper } from "../menuItem";
import { InputSelect } from "../inputSelect";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";

interface IEditProgramExerciseProgressProps {
  program: IProgram;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

function getProgressReuseCandidates(fullName: string, evaluatedProgram: IEvaluatedProgram): string[] {
  const result: Set<string> = new Set();
  PP.iterate2(evaluatedProgram.weeks, (exercise) => {
    if (exercise.fullName === fullName) {
      return;
    }
    const progress = exercise.progress;
    if (!progress || progress.type !== "custom" || progress.reuse) {
      return;
    }
    result.add(exercise.fullName);
  });
  return Array.from(result);
}

export function EditProgramExerciseProgress(props: IEditProgramExerciseProgressProps): JSX.Element {
  const { plannerExercise } = props;
  const evaluatedProgram = Program.evaluate(props.program, props.settings);
  const reuseCandidates = getProgressReuseCandidates(plannerExercise.fullName, evaluatedProgram);
  const reuseFullName = plannerExercise.reuse?.fullName;
  const reuseSetValues: [string, string][] = reuseCandidates.map((fullName) => {
    return [fullName.trim(), fullName.trim()];
  });
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const progressTypes: [IProgramExerciseProgressType, string][] = [
    ["lp", "Linear Progression"],
    ["dp", "Double Progression"],
    ["sum", "Sum Reps"],
    ["custom", "Custom"],
  ];

  return (
    <div className="px-4 py-3 bg-white border rounded-2xl border-grayv3-200">
      <div className="flex gap-4 pb-2">
        <div className="text-base font-bold">Edit Progress</div>
        {plannerExercise.progress?.type === "custom" && (
          <div className="ml-auto">
            <LinkButton
              className="text-sm"
              data-cy="edit-exercise-progress-edit-script"
              name="edit-exercise-progress-edit-script"
              onClick={() => {}}
            >
              Edit Script
            </LinkButton>
          </div>
        )}
      </div>
      {reuseSetValues.length > 0 && (
        <div>
          <MenuItemWrapper name="program-exercise-progress-reuse">
            <div className="flex py-1">
              <div className="flex-1 text-sm">Reuse progress from:</div>
              <div className="flex-1">
                <InputSelect
                  name="program-exercise-progress-reuse-select"
                  values={reuseSetValues}
                  value={reuseFullName}
                  onChange={(value) => {
                    props.plannerDispatch(
                      lbProgram.recordModify((program) => {
                        return EditProgramUiHelpers.changeFirstInstance(
                          program,
                          plannerExercise,
                          props.settings,
                          (e) => {
                            e.progress = {
                              type: "custom",
                              state: {},
                              stateMetadata: {},
                              reuse: value ? { fullName: value } : undefined,
                            };
                          }
                        );
                      })
                    );
                  }}
                />
              </div>
            </div>
          </MenuItemWrapper>
        </div>
      )}
      <div>
        <MenuItemWrapper name="program-exercise-progress-type">
          <div className="flex items-center py-1">
            <div className="flex-1 text-base">Progress:</div>
            <div className="flex-1">
              <InputSelect
                name="program-exercise-progress-type-select"
                values={progressTypes}
                value={plannerExercise.progress?.type}
                onChange={(value) => {
                  props.plannerDispatch(
                    lbProgram.recordModify((program) => {
                      return EditProgramUiHelpers.changeFirstInstance(program, plannerExercise, props.settings, (e) => {
                        if (value == null) {
                          e.progress = undefined;
                        } else {
                          const result = PlannerProgramExercise.buildProgress(
                            value,
                            PlannerProgramExercise.getProgressDefaultArgs(value),
                            value === "custom" ? { script: "{~~}" } : undefined
                          );
                          if (result.success) {
                            e.progress = result.data;
                          } else {
                            alert(result.error);
                          }
                        }
                      });
                    })
                  );
                }}
              />
            </div>
          </div>
        </MenuItemWrapper>
      </div>
      <div className="border rounded bg-purplev3-50 border-purplev3-150">
        <h3 className="p-2 text-base font-bold">Progress State Variables</h3>
      </div>
    </div>
  );
}
