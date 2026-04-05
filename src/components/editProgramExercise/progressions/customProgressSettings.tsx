import type { JSX } from "react";
import { lb } from "lens-shmens";
import {
  IPlannerProgramExercise,
  IPlannerExerciseState,
  IPlannerExerciseUi,
} from "../../../pages/planner/models/types";
import { IProgram, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { ObjectUtils_entries } from "../../../utils/object";
import { InputNumber2 } from "../../inputNumber2";
import { EditProgramUiHelpers_changeFirstInstance } from "../../editProgram/editProgramUi/editProgramUiHelpers";
import { InputWeight2 } from "../../inputWeight2";
import { Button } from "../../button";
import { navigationRef } from "../../../navigation/navigationRef";

import { IconTrash } from "../../icons/iconTrash";
import { ScriptRunner } from "../../../parser";
import { Tailwind_colors } from "../../../utils/tailwindConfig";
import {
  PlannerProgramExercise_getState,
  PlannerProgramExercise_getOnlyChangedState,
} from "../../../pages/planner/models/plannerProgramExercise";

interface ICustomProgressSettingsProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  exerciseStateKey: string;
  programId: string;
}

export function CustomProgressSettings(props: ICustomProgressSettingsProps): JSX.Element {
  const { plannerExercise, settings } = props;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerExerciseState>().p("ui");
  const progress = plannerExercise.progress;
  if (!progress || progress.type !== "custom") {
    return <div />;
  }
  const ownState = PlannerProgramExercise_getState(plannerExercise);
  const onlyChangedState = PlannerProgramExercise_getOnlyChangedState(plannerExercise);

  return (
    <div>
      <div className="border rounded-lg bg-background-cardpurple border-border-cardpurple">
        <div className="p-2 text-sm font-semibold border-b border-border-cardpurple">Progress State Variables</div>
        <ul>
          {ObjectUtils_entries(ownState).map(([key, value]) => {
            const isUsedVariable = ScriptRunner.hasStateVariable(progress.script ?? "", key);
            const metadata = progress.stateMetadata?.[key];
            const isReused = onlyChangedState[key] == null;
            return (
              <li key={key} className="p-2 text-base border-b border-border-cardpurple">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="leading-none">{key}</div>
                    {metadata?.userPrompted && <div className="text-xs text-text-secondary">User prompted</div>}
                    {isReused && <div className="text-xs text-text-secondary">Reused</div>}
                  </div>
                  <div>
                    {typeof value === "number" ? (
                      <InputNumber2
                        name={key}
                        value={value}
                        step={1}
                        allowDot={true}
                        onInput={(newValue) => {
                          props.plannerDispatch(
                            lbProgram.recordModify((program) => {
                              return EditProgramUiHelpers_changeFirstInstance(
                                program,
                                plannerExercise,
                                props.settings,
                                true,
                                (e) => {
                                  const state = e.progress?.state;
                                  if (state && newValue != null) {
                                    state[key] = newValue;
                                  }
                                }
                              );
                            }),
                            "Update state variable"
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
                              return EditProgramUiHelpers_changeFirstInstance(
                                program,
                                plannerExercise,
                                props.settings,
                                true,
                                (e) => {
                                  const state = e.progress?.state;
                                  if (state && newValue != null) {
                                    state[key] = newValue;
                                  }
                                }
                              );
                            }),
                            "Update state variable"
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
                              return EditProgramUiHelpers_changeFirstInstance(
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
                            }),
                            "Delete state variable"
                          );
                        }
                      }}
                    >
                      <IconTrash
                        color={isUsedVariable ? Tailwind_colors().lightgray[300] : Tailwind_colors().black}
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
            onClick={() => {
              props.plannerDispatch(lbUi.p("showAddStateVariableModal").record(true), "Show add state variable modal");
              navigationRef.navigate("createStateVariableModal", {
                exerciseStateKey: props.exerciseStateKey,
                programId: props.programId,
              });
            }}
          >
            + Add State Variable
          </Button>
        </div>
      </div>
    </div>
  );
}
