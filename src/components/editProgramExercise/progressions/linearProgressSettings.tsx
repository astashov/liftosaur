import { JSX, h, Fragment } from "preact";
import { lb } from "lens-shmens";
import { Weight } from "../../../models/weight";
import { PlannerProgramExercise } from "../../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../../pages/planner/models/types";
import { IProgram, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { EditProgramUiHelpers } from "../../editProgram/editProgramUi/editProgramUiHelpers";
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
  const progression = PlannerProgramExercise.progressionType(plannerExercise);
  if (progression?.type !== "linear") {
    return <div />;
  }
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  return (
    <div>
      <div className="flex flex-wrap text-sm" style={{ columnGap: "0.25rem" }}>
        <div>Increase weight by</div>
        <div>
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
                  return EditProgramUiHelpers.changeFirstInstance(
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
                })
              );
            }}
          />
        </div>
        <div>after every</div>
        <div>
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
                  return EditProgramUiHelpers.changeFirstInstance(
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
                })
              );
            }}
          />
        </div>
        <div>successful attempts</div>
        {(progression.successesRequired || 0) > 1 && (
          <>
            <div>(current success counter -</div>
            <div>
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
                      return EditProgramUiHelpers.changeFirstInstance(
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
                    })
                  );
                }}
              />
            </div>
            <div>)</div>
          </>
        )}
      </div>
      {(progression.decrease?.value || 0) > 0 && (
        <div>
          <div className="flex flex-wrap gap-1 pt-1 text-sm">
            <div>Decrease weight by</div>
            <div>
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
                      return EditProgramUiHelpers.changeFirstInstance(
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
                    })
                  );
                }}
              />
            </div>
            <div>after every</div>
            <div>
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
                      return EditProgramUiHelpers.changeFirstInstance(
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
                    })
                  );
                }}
              />
            </div>
            <div>failed attempts</div>
            {(progression.failuresRequired || 0) > 1 && (
              <>
                <div>(current failure counter -</div>
                <div>
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
                          return EditProgramUiHelpers.changeFirstInstance(
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
                        })
                      );
                    }}
                  />
                </div>
                <div>)</div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex mt-1 text-sm">
        <LinkButton
          name="enable-linear-progress-failures"
          onClick={() => {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers.changeFirstInstance(program, plannerExercise, props.settings, true, (e) => {
                  const state = e.progress?.state;
                  if (state) {
                    state.failures = (progression.failuresRequired || 0) > 0 ? 0 : 1;
                    state.decrement = Weight.build(
                      (progression.decrease?.value || 0) > 0 ? 0 : 5,
                      props.settings.units
                    );
                  }
                });
              })
            );
          }}
        >
          {(progression.failuresRequired || 0) > 0 ? "Disable" : "Enable"} descreasing weight
        </LinkButton>
      </div>
    </div>
  );
}
