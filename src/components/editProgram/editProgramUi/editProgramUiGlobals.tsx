import { lb } from "lens-shmens";
import { JSX, h } from "preact";
import { Weight } from "../../../models/weight";
import { IPlannerProgramExercise, IPlannerProgramReuse, IPlannerState } from "../../../pages/planner/models/types";
import { IDayData, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { GroupHeader } from "../../groupHeader";
import { EditProgramUiHelpers } from "./editProgramUiHelpers";
import { WeightInput, NumInput } from "./editProgramUiInputs";
import { PlannerProgramExercise } from "../../../pages/planner/models/plannerProgramExercise";

interface IEditProgramUiGlobalsProps {
  plannerExercise: IPlannerProgramExercise;
  reuse: IPlannerProgramReuse;
  settings: ISettings;
  dayData: Required<IDayData>;
  exerciseLine: number;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramUiGlobals(props: IEditProgramUiGlobalsProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const globals = plannerExercise.globals;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");

  function modify(cb: (ex: IPlannerProgramExercise) => void): void {
    props.plannerDispatch(
      lbProgram.recordModify((program) => {
        return EditProgramUiHelpers.changeCurrentInstance(
          program,
          props.dayData,
          plannerExercise.fullName,
          props.settings,
          cb
        );
      })
    );
  }

  return (
    <div className="my-4">
      <GroupHeader name="Override Globals" />
      <div className="flex gap-1 text-xs">
        <div style={{ flex: 8 }}>Weight</div>
        <div style={{ flex: 4 }}>RPE</div>
        <div style={{ flex: 4 }}>Timer</div>
      </div>
      <div className="flex items-center gap-1">
        <div style={{ flex: 8 }}>
          <WeightInput
            name="edit-exercise-globals-weight"
            value={globals.weight}
            settings={props.settings}
            exerciseType={PlannerProgramExercise.getExercise(plannerExercise, props.settings)}
            onUpdate={(val) => {
              modify((ex) => {
                if (!val) {
                  ex.globals.weight = undefined;
                } else if (Weight.isPct(val)) {
                  ex.globals.percentage = val.value;
                } else {
                  ex.globals.weight = val;
                }
              });
            }}
          />
        </div>
        <div style={{ flex: 4 }}>
          <NumInput
            name="edit-exercise-globals-rpe"
            value={globals.rpe}
            min={0}
            step={0.5}
            max={10}
            onUpdate={(val) => {
              modify((ex) => {
                ex.globals.rpe = val;
              });
            }}
          />
        </div>
        <div style={{ flex: 4 }}>
          <NumInput
            name="edit-exercise-globals-timer"
            min={0}
            step={5}
            value={globals.timer}
            onUpdate={(val) => {
              modify((ex) => {
                ex.globals.timer = val;
              });
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs">
        <label className="flex items-center">
          <div className="leading-none">
            <input
              checked={globals.askWeight}
              data-cy="edit-exercise-globals-ask-weight"
              className="block align-middle checkbox text-bluev2"
              type="checkbox"
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                modify((ex) => {
                  ex.globals.askWeight = target.checked;
                });
              }}
            />
          </div>
          <div className="ml-1 leading-none">Ask Weight?</div>
        </label>
        <label className="flex items-center">
          <div className="leading-none">
            <input
              checked={globals.logRpe}
              className="block align-middle checkbox text-bluev2"
              data-cy="edit-exercise-globals-log-rpe"
              type="checkbox"
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                modify((ex) => {
                  ex.globals.logRpe = target.checked;
                });
              }}
            />
          </div>
          <div className="ml-1 leading-none">Log RPE?</div>
        </label>
      </div>
    </div>
  );
}
