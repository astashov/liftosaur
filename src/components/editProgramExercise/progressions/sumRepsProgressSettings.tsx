import { JSX, h } from "preact";
import { lb } from "lens-shmens";
import { PlannerProgramExercise } from "../../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../../pages/planner/models/types";
import { IProgram, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { EditProgramUiHelpers } from "../../editProgram/editProgramUi/editProgramUiHelpers";
import { InputNumber2 } from "../../inputNumber2";
import { InputWeight2 } from "../../inputWeight2";

interface ISumRepsProgressSettingsProps {
  program: IProgram;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
}

export function SumRepsProgressSettings(props: ISumRepsProgressSettingsProps): JSX.Element {
  const { plannerExercise, settings } = props;
  const progression = PlannerProgramExercise.progressionType(plannerExercise);
  if (progression?.type !== "sumreps") {
    return <div />;
  }
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  return (
    <div>
      <div className="flex flex-wrap text-sm">
        <div>Increase weight by&nbsp;</div>
        <div>
          <InputWeight2
            name="sum-reps-progress-increase"
            value={progression.increase}
            showUnitInside={true}
            autowidth={true}
            settings={settings}
            units={["lb", "kg", "%"]}
            onInput={(value) => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers.changeFirstInstance(
                    program,
                    plannerExercise,
                    props.settings,
                    true,
                    (e) => {
                      const state = e.progress?.state;
                      if (state && value) {
                        state.increase = value;
                      }
                    }
                  );
                })
              );
            }}
          />
        </div>
        <div>&nbsp;if sum of all reps &gt;=&nbsp;</div>
        <div>
          <InputNumber2
            name="sum-reps-progress-reps"
            value={progression.reps}
            autowidth={true}
            min={1}
            step={1}
            max={9999}
            onInput={(value) => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers.changeFirstInstance(
                    program,
                    plannerExercise,
                    props.settings,
                    true,
                    (e) => {
                      const state = e.progress?.state;
                      if (state && value != null && value > 0) {
                        state.reps = value;
                      }
                    }
                  );
                })
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
