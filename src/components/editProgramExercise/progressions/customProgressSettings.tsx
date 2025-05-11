import { JSX, h } from "preact";
import { lb } from "lens-shmens";
import {
  IPlannerProgramExercise,
  IPlannerExerciseState,
  IPlannerExerciseUi,
} from "../../../pages/planner/models/types";
import { IProgram, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { ObjectUtils } from "../../../utils/object";
import { InputNumber2 } from "../../inputNumber2";
import { EditProgramUiHelpers } from "../../editProgram/editProgramUi/editProgramUiHelpers";
import { InputWeight2 } from "../../inputWeight2";
import { Button } from "../../button";
import { ModalCreateStateVariable } from "./modalCreateStateVariable";
import { Weight } from "../../../models/weight";
import { IconTrash } from "../../icons/iconTrash";
import { ScriptRunner } from "../../../parser";
import { Tailwind } from "../../../utils/tailwindConfig";
import { PlannerProgramExercise } from "../../../pages/planner/models/plannerProgramExercise";

interface ICustomProgressSettingsProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
}

export function CustomProgressSettings(props: ICustomProgressSettingsProps): JSX.Element {
  const { plannerExercise, settings } = props;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerExerciseState>().p("ui");
  const progress = plannerExercise.progress;
  if (!progress || progress.type !== "custom") {
    return <div />;
  }
  const ownState = PlannerProgramExercise.getState(plannerExercise);
  const onlyChangedState = PlannerProgramExercise.getOnlyChangedState(plannerExercise);

  return (
    <div>
      <div className="border rounded-lg bg-purplev3-50 border-purplev3-150">
        <div className="p-2 text-sm font-semibold border-b border-purplev3-150">Progress State Variables</div>
        <ul>
          {ObjectUtils.entries(ownState).map(([key, value]) => {
            const isUsedVariable = ScriptRunner.hasStateVariable(progress.script ?? "", key);
            const metadata = progress.stateMetadata?.[key];
            const isReused = !onlyChangedState[key];
            return (
              <li key={key} className="p-2 text-base border-b border-purplev3-150">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="leading-none">{key}</div>
                    {metadata?.userPrompted && <div className="text-xs text-grayv3-main">User prompted</div>}
                    {isReused && <div className="text-xs text-grayv3-main">Reused</div>}
                  </div>
                  <div>
                    {typeof value === "number" ? (
                      <InputNumber2
                        name={key}
                        value={value}
                        step={1}
                        onInput={(newValue) => {
                          props.plannerDispatch(
                            lbProgram.recordModify((program) => {
                              return EditProgramUiHelpers.changeFirstInstance(
                                program,
                                plannerExercise,
                                props.settings,
                                true,
                                (e) => {
                                  const state = e.progress?.state;
                                  if (state && newValue) {
                                    state[key] = newValue;
                                  }
                                }
                              );
                            })
                          );
                        }}
                      />
                    ) : (
                      <InputWeight2
                        name={key}
                        value={value}
                        showUnitInside={true}
                        settings={settings}
                        units={["lb", "kg", "%"]}
                        exerciseType={plannerExercise.exerciseType}
                        onInput={(newValue) => {
                          props.plannerDispatch(
                            lbProgram.recordModify((program) => {
                              return EditProgramUiHelpers.changeFirstInstance(
                                program,
                                plannerExercise,
                                props.settings,
                                true,
                                (e) => {
                                  const state = e.progress?.state;
                                  if (state && newValue) {
                                    state[key] = newValue;
                                  }
                                }
                              );
                            })
                          );
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <button
                      className="py-1 pl-1 pr-2"
                      onClick={() => {
                        if (isUsedVariable) {
                          alert("You cannot delete it, because this state variable is used in the script.");
                        } else if (isReused) {
                          alert("You cannot delete reused state variable.");
                        } else {
                          props.plannerDispatch(
                            lbProgram.recordModify((program) => {
                              return EditProgramUiHelpers.changeFirstInstance(
                                program,
                                plannerExercise,
                                props.settings,
                                true,
                                (e) => {
                                  const state = e.progress?.state;
                                  if (state) {
                                    delete state[key];
                                  }
                                }
                              );
                            })
                          );
                        }
                      }}
                    >
                      <IconTrash
                        color={isUsedVariable ? Tailwind.colors().grayv3[300] : Tailwind.colors().blackv2}
                        width={14}
                        height={18}
                      />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="p-2">
          <Button
            kind="lightpurple"
            name="add-state-variable"
            className="w-full text-sm"
            onClick={() => props.plannerDispatch(lbUi.p("showAddStateVariableModal").record(true))}
          >
            + Add State Variable
          </Button>
        </div>
      </div>
      {props.ui.showAddStateVariableModal && (
        <ModalCreateStateVariable
          onClose={() => props.plannerDispatch(lbUi.p("showAddStateVariableModal").record(false))}
          onCreate={(name, type, isUserPrompted) => {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers.changeFirstInstance(program, plannerExercise, props.settings, true, (e) => {
                  const state = e.progress?.state;
                  const stateMetadata = e.progress?.stateMetadata;
                  if (state) {
                    state[name] = type === "number" ? 0 : Weight.buildAny(0, type);
                  }
                  if (stateMetadata && isUserPrompted) {
                    stateMetadata[name] = { userPrompted: true };
                  }
                });
              })
            );
          }}
        />
      )}
    </div>
  );
}
