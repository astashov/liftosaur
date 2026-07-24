import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { lb } from "lens-shmens";
import { Weight_build } from "../../../models/weight";
import { PlannerProgramExercise_progressionType } from "../../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../../pages/planner/models/types";
import { IProgram, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { EditProgramUiHelpers_changeFirstInstance } from "../../editProgram/editProgramUi/editProgramUiHelpers";
import { InputNumber2 } from "../../inputNumber2";
import { InputWeight2 } from "../../inputWeight2";
import { LinkButton } from "../../linkButton";

interface ILinearProgressSettingsProps {
  program: IProgram;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
}

export function LinearProgressSettings(props: ILinearProgressSettingsProps): JSX.Element {
  const { plannerExercise, settings } = props;
  const progression = PlannerProgramExercise_progressionType(plannerExercise);
  if (progression?.type !== "linear") {
    return <View />;
  }
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  return (
    <View>
      <View className="flex-row flex-wrap items-center gap-1">
        <Text className="text-sm">Increase weight by</Text>
        <View>
          <InputWeight2
            name="linear-progress-increase"
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
        </View>
        <Text className="text-sm">after every</Text>
        <View>
          <InputNumber2
            name="linear-progress-attempts"
            value={progression.successesRequired}
            autowidth={true}
            min={1}
            step={1}
            max={10}
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
                        state.successes = value;
                      }
                    }
                  );
                }),
                "Update success attempts"
              );
            }}
          />
        </View>
        <Text className="text-sm">successful attempts</Text>
        {(progression.successesRequired || 0) > 1 && (
          <>
            <Text className="text-sm">(current success counter -</Text>
            <View>
              <InputNumber2
                name="linear-progress-successes-counter"
                value={progression.successesCounter}
                autowidth={true}
                min={1}
                step={1}
                max={10}
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
                            state.successCounter = value;
                          }
                        }
                      );
                    }),
                    "Update success counter"
                  );
                }}
              />
            </View>
            <Text className="text-sm">)</Text>
          </>
        )}
      </View>
      {(progression.decrease?.value || 0) > 0 && (
        <View>
          <View className="flex-row flex-wrap items-center gap-1 pt-1">
            <Text className="text-sm">Decrease weight by</Text>
            <View>
              <InputWeight2
                name="linear-progress-decrease"
                value={progression.decrease}
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
                            state.decrement = value;
                          }
                        }
                      );
                    }),
                    "Update weight decrease"
                  );
                }}
              />
            </View>
            <Text className="text-sm">after every</Text>
            <View>
              <InputNumber2
                name="linear-progress-failures"
                value={progression.failuresRequired}
                autowidth={true}
                min={1}
                step={1}
                max={10}
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
                            state.failures = value;
                          }
                        }
                      );
                    }),
                    "Update failure attempts"
                  );
                }}
              />
            </View>
            <Text className="text-sm">failed attempts</Text>
            {(progression.failuresRequired || 0) > 1 && (
              <>
                <Text className="text-sm">(current failure counter -</Text>
                <View>
                  <InputNumber2
                    name="linear-progress-failures-counter"
                    value={progression.failuresCounter}
                    autowidth={true}
                    min={1}
                    step={1}
                    max={10}
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
                                state.failureCounter = value;
                              }
                            }
                          );
                        }),
                        "Update failure counter"
                      );
                    }}
                  />
                </View>
                <Text className="text-sm">)</Text>
              </>
            )}
          </View>
        </View>
      )}
      <View className="flex-row mt-1">
        <LinkButton
          name="enable-linear-progress-failures"
          onClick={() => {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers_changeFirstInstance(program, plannerExercise, props.settings, true, (e) => {
                  const state = e.progress?.state;
                  if (state) {
                    state.failures = (progression.failuresRequired || 0) > 0 ? 0 : 1;
                    state.decrement = Weight_build(
                      (progression.decrease?.value || 0) > 0 ? 0 : 5,
                      props.settings.units
                    );
                  }
                });
              }),
              "Toggle decrease weight"
            );
          }}
        >
          {(progression.failuresRequired || 0) > 0 ? "Disable" : "Enable"} descreasing weight
        </LinkButton>
      </View>
    </View>
  );
}
