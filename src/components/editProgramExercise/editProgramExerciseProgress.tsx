import { h, JSX, Fragment } from "preact";
import {
  IPlannerProgramExercise,
  IPlannerExerciseState,
  IProgramExerciseProgressType,
  IPlannerExerciseUi,
  IProgramExerciseProgress,
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
import { LinearProgressSettings } from "./progressions/linearProgressSettings";
import { DoubleProgressSettings } from "./progressions/doubleProgressSettings";
import { SumRepsProgressSettings } from "./progressions/sumRepsProgressSettings";
import { CustomProgressSettings } from "./progressions/customProgressSettings";
import { ModalEditProgressScript } from "./progressions/modalEditProgressScript";
import { useState } from "preact/hooks";
import { CollectionUtils } from "../../utils/collection";
import { DayData } from "../../models/dayData";

interface IEditProgramExerciseProgressProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
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
  const reusingCustomProgressExercises = Program.getReusingCustomProgressExercises(evaluatedProgram, plannerExercise);
  const reusingSetProgressExercises = Program.getReusingSetProgressExercises(evaluatedProgram, plannerExercise);
  const reusingProgressExercises = Array.from(
    new Set(
      CollectionUtils.uniqByExpr(
        [...reusingCustomProgressExercises, ...reusingSetProgressExercises],
        (e) => e.fullName + "_" + DayData.toString(e.dayData)
      )
    )
  );
  const ownProgress = plannerExercise.progress;
  const reuseSetValues: [string, string][] = reuseCandidates.map((fullName) => {
    return [fullName.trim(), fullName.trim()];
  });
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerExerciseState>().p("ui");
  const progressTypes: [IProgramExerciseProgressType, string][] = [
    ["lp", "Linear Progression"],
    ["dp", "Double Progression"],
    ["sum", "Sum Reps"],
    ["custom", "Custom"],
  ];
  const [savedProgressTypes, setSavedProgressTypes] = useState<
    Partial<Record<IProgramExerciseProgressType, IProgramExerciseProgress>>
  >({});

  return (
    <>
      <div className="px-4 py-3 bg-white border rounded-2xl border-grayv3-200">
        <div className="flex gap-4 pb-2">
          <div className="text-base font-bold">Edit Progress</div>
          {ownProgress?.type === "custom" && (
            <div className="ml-auto">
              <LinkButton
                className="text-sm"
                data-cy="edit-exercise-progress-edit-script"
                name="edit-exercise-progress-edit-script"
                onClick={() => {
                  props.plannerDispatch(lbUi.p("showEditProgressScriptModal").record(true));
                }}
              >
                Edit Script
              </LinkButton>
            </div>
          )}
        </div>
        {reusingProgressExercises.length > 0 && (
          <div>
            <MenuItemWrapper name="program-exercise-progress-reusing">
              <div className="mb-1 text-xs">
                <div>Custom progress of this exercise is reused by:</div>
                <ul>
                  {reusingProgressExercises.map((exercise) => (
                    <li key={exercise} className="ml-4 text-xs font-semibold list-disc">
                      {exercise.fullName} (
                      {evaluatedProgram.weeks.length > 1 && <span>Week {exercise.dayData.week}, </span>}
                      {evaluatedProgram.weeks[exercise.dayData.week - 1].days.length > 1 && (
                        <span>Day {exercise.dayData.dayInWeek}</span>
                      )}
                      )
                    </li>
                  ))}
                </ul>
              </div>
            </MenuItemWrapper>
          </div>
        )}
        {reuseSetValues.length > 0 && (
          <div>
            <MenuItemWrapper
              name="program-exercise-progress-reuse"
              onClick={() => {
                if (reusingProgressExercises.length > 0) {
                  alert("You cannot reuse progress if this custom progress is reused by other exercises.");
                }
              }}
            >
              <div className="flex items-center py-1">
                <div className="flex-1 text-sm">Reuse progress from:</div>
                <div className="flex-1">
                  <InputSelect
                    name="program-exercise-progress-reuse-select"
                    values={reuseSetValues}
                    value={reuseFullName}
                    disabled={reusingProgressExercises.length > 0}
                    placeholder="None"
                    onChange={(value) => {
                      props.plannerDispatch(
                        lbProgram.recordModify((program) => {
                          return EditProgramUiHelpers.changeFirstInstance(
                            program,
                            plannerExercise,
                            props.settings,
                            true,
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
          <MenuItemWrapper
            name="program-exercise-progress-type"
            onClick={() => {
              if (reusingCustomProgressExercises.length > 0) {
                alert("You cannot use other progress types if this custom progress is reused by other exercises.");
              }
            }}
          >
            <div className="flex items-center py-1">
              <div className="flex-1 text-sm">Progress:</div>
              <div className="flex-1 text-sm">
                <InputSelect
                  name="program-exercise-progress-type-select"
                  values={progressTypes}
                  disabled={reusingProgressExercises.length > 0}
                  value={plannerExercise.progress?.type}
                  onChange={(value) => {
                    props.plannerDispatch(
                      lbProgram.recordModify((program) => {
                        const newPlanner = EditProgramUiHelpers.changeFirstInstance(
                          program,
                          plannerExercise,
                          props.settings,
                          true,
                          (e) => {
                            if (value == null) {
                              e.progress = undefined;
                            } else {
                              if (savedProgressTypes[value]) {
                                e.progress = savedProgressTypes[value];
                              } else {
                                const result = PlannerProgramExercise.buildProgress(
                                  value,
                                  PlannerProgramExercise.getProgressDefaultArgs(value),
                                  value === "custom" ? { script: "{~~}" } : undefined
                                );
                                if (result.success) {
                                  if (e.progress) {
                                    e.progress = result.data;
                                  }
                                } else {
                                  alert(result.error);
                                }
                              }
                            }
                          }
                        );
                        if (newPlanner !== program && plannerExercise.progress) {
                          setSavedProgressTypes({
                            ...savedProgressTypes,
                            [plannerExercise.progress.type]: plannerExercise.progress,
                          });
                        }
                        return newPlanner;
                      })
                    );
                  }}
                />
              </div>
            </div>
          </MenuItemWrapper>
          {ownProgress?.type === "lp" && (
            <div className="py-2">
              <LinearProgressSettings
                plannerExercise={plannerExercise}
                settings={props.settings}
                plannerDispatch={props.plannerDispatch}
                program={props.program}
              />
            </div>
          )}
          {ownProgress?.type === "dp" && (
            <div className="py-2">
              <DoubleProgressSettings
                plannerExercise={plannerExercise}
                settings={props.settings}
                plannerDispatch={props.plannerDispatch}
                program={props.program}
              />
            </div>
          )}
          {ownProgress?.type === "sum" && (
            <div className="py-2">
              <SumRepsProgressSettings
                plannerExercise={plannerExercise}
                settings={props.settings}
                plannerDispatch={props.plannerDispatch}
                program={props.program}
              />
            </div>
          )}
          {ownProgress?.type === "custom" && (
            <div className="py-2">
              <CustomProgressSettings
                ui={props.ui}
                plannerExercise={plannerExercise}
                settings={props.settings}
                plannerDispatch={props.plannerDispatch}
                program={props.program}
              />
            </div>
          )}
        </div>
      </div>
      {props.ui.showEditProgressScriptModal && (
        <ModalEditProgressScript
          settings={props.settings}
          onClose={() => {
            props.plannerDispatch(lbUi.p("showEditProgressScriptModal").record(false));
          }}
          plannerExercise={plannerExercise}
          onChange={(script) => {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers.changeFirstInstance(program, plannerExercise, props.settings, true, (e) => {
                  e.progress = {
                    ...e.progress,
                    type: "custom",
                    state: e.progress?.state ?? {},
                    stateMetadata: e.progress?.stateMetadata ?? {},
                    script: script,
                  };
                });
              })
            );
          }}
        />
      )}
    </>
  );
}
