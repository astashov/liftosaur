import { JSX, h } from "preact";
import { lb } from "lens-shmens";
import { PlannerProgramExercise_progressionType } from "../../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../../pages/planner/models/types";
import { IProgram, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { EditProgramUiHelpers_changeFirstInstance } from "../../editProgram/editProgramUi/editProgramUiHelpers";
import { InputNumber2 } from "../../inputNumber2";
import { InputWeight2 } from "../../inputWeight2";

interface IDoubleProgressSettingsProps {
  program: IProgram;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
}

export function DoubleProgressSettings(props: IDoubleProgressSettingsProps): JSX.Element {
  const { plannerExercise, settings } = props;
  const progression = PlannerProgramExercise_progressionType(plannerExercise);
  if (progression?.type !== "double") {
    return <div />;
  }
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  return (
    <div>
      <div className="flex flex-wrap text-sm">
        <div>Increase weight by&nbsp;</div>
        <div>
          <InputWeight2
            name="double-progress-increase"
            value={progression.increase}
            showUnitInside={true}
            autowidth={true}
            settings={settings}
            units={["lb", "kg", "%"]}
            onInput={(value) => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers_changeFirstInstance(
                    program,
                    plannerExercise,
                    props.settings,
                    true,
                    (e) => {
                      const state = e.progress?.state;
                      if (state && value) {
                        state.increment = value;
                      }
                    }
                  );
                }),
                "Update weight increase"
              );
            }}
          />
        </div>
      </div>
      <div>
        <div className="flex flex-wrap pt-1 text-sm">
          <div>Reps range:&nbsp;</div>
          <div>
            <InputNumber2
              name="double-progress-min-reps"
              value={progression.minReps}
              autowidth={true}
              min={1}
              step={1}
              max={999}
              onInput={(value) => {
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers_changeFirstInstance(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (e) => {
                        const state = e.progress?.state;
                        if (state && value != null && value > 0) {
                          state.minReps = value;
                        }
                      }
                    );
                  }),
                  "Update min reps"
                );
              }}
            />
          </div>
          <div>&nbsp;-&nbsp;</div>
          <div>
            <InputNumber2
              name="double-progress-max-reps"
              value={progression.maxReps}
              autowidth={true}
              min={1}
              step={1}
              max={999}
              onInput={(value) => {
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers_changeFirstInstance(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (e) => {
                        const state = e.progress?.state;
                        if (state && value != null && value > 0) {
                          state.maxReps = value;
                        }
                      }
                    );
                  }),
                  "Update max reps"
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
