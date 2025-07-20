import { h, JSX, Fragment } from "preact";
import { IPlannerProgramExercise, IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { IProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { LinkButton } from "../linkButton";
import { IEvaluatedProgram, Program } from "../../models/program";
import { PP } from "../../models/pp";
import { MenuItemWrapper } from "../menuItem";
import { InputSelect } from "../inputSelect";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { useState } from "preact/hooks";
import { ObjectUtils } from "../../utils/object";
import { ModalEditUpdateScript } from "./progressions/modalEditUpdateScript";
import { EditProgramUiUpdate } from "../editProgram/editProgramUiUpdate";
import { CollectionUtils } from "../../utils/collection";

interface IEditProgramExerciseUpdateProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

function getUpdateReuseCandidates(key: string, evaluatedProgram: IEvaluatedProgram): [string, string][] {
  const result: Record<string, string> = { "": "None" };
  PP.iterate2(evaluatedProgram.weeks, (exercise) => {
    if (exercise.key === key) {
      return;
    }
    const update = exercise.update;
    if (!update || update.type !== "custom" || update.reuse) {
      return;
    }
    result[exercise.key] = exercise.fullName;
  });
  return ObjectUtils.entries(result);
}

export function EditProgramExerciseUpdate(props: IEditProgramExerciseUpdateProps): JSX.Element {
  const { plannerExercise } = props;
  const ownUpdate = plannerExercise.update;
  const evaluatedProgram = Program.evaluate(props.program, props.settings);
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const lbUi = lb<IPlannerExerciseState>().p("ui");
  const [isOverriding, setIsOverriding] = useState(false);

  return (
    <>
      <div className="px-4 pt-2 pb-2 bg-white">
        <div className="flex gap-4 pb-2">
          <div className="text-base font-bold">Edit Update</div>
          {ownUpdate?.type === "custom" && !ownUpdate.reuse && (
            <div className="ml-auto">
              <LinkButton
                className="text-sm"
                data-cy="edit-exercise-update-edit-script"
                name="edit-exercise-update-edit-script"
                onClick={() => {
                  props.plannerDispatch(lbUi.p("showEditUpdateScriptModal").record(true), "Show edit update script modal");
                }}
              >
                Edit Script
              </LinkButton>
            </div>
          )}
          {ownUpdate?.reuse?.source === "overall" && !isOverriding && (
            <div className="ml-auto">
              <LinkButton
                className="text-sm"
                data-cy="edit-exercise-update-override"
                name="edit-exercise-update-override"
                onClick={() => {
                  setIsOverriding(true);
                }}
              >
                Override
              </LinkButton>
            </div>
          )}
        </div>
        {ownUpdate?.reuse?.source === "overall" && !isOverriding ? (
          <SetReuse evaluatedProgram={evaluatedProgram} exercise={plannerExercise} />
        ) : (
          <UpdateContent
            program={props.program}
            ui={props.ui}
            evaluatedProgram={evaluatedProgram}
            plannerExercise={plannerExercise}
            plannerDispatch={props.plannerDispatch}
            settings={props.settings}
          />
        )}
      </div>
      {props.ui.showEditUpdateScriptModal && (
        <ModalEditUpdateScript
          settings={props.settings}
          onClose={() => {
            props.plannerDispatch(lbUi.p("showEditUpdateScriptModal").record(false), "Close edit update script modal");
          }}
          plannerExercise={plannerExercise}
          onChange={(script) => {
            props.plannerDispatch(
              lbProgram.recordModify((program) => {
                return EditProgramUiHelpers.changeFirstInstance(program, plannerExercise, props.settings, true, (e) => {
                  e.update = {
                    ...e.update,
                    type: "custom",
                    script: script,
                  };
                });
              }),
              "Update script"
            );
          }}
        />
      )}
    </>
  );
}

interface ISetReuseProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

function SetReuse(props: ISetReuseProps): JSX.Element {
  return (
    <div>
      <EditProgramUiUpdate evaluatedProgram={props.evaluatedProgram} exercise={props.exercise} />
    </div>
  );
}

interface IUpdateContentProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

function UpdateContent(props: IUpdateContentProps): JSX.Element {
  const { plannerExercise, evaluatedProgram } = props;
  const ownUpdate = plannerExercise.update;
  const reuseCandidates = getUpdateReuseCandidates(plannerExercise.key, evaluatedProgram);
  const reuseKey = ownUpdate?.reuse?.exercise?.key;
  const reusingUpdateExercises = CollectionUtils.uniqBy(
    Program.getReusingUpdateExercises(evaluatedProgram, plannerExercise),
    "fullName"
  );
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  return (
    <>
      {reusingUpdateExercises.length > 0 && (
        <div>
          <MenuItemWrapper isBorderless name="program-exercise-update-reusing">
            <div className="mb-1 text-xs">
              <div>Custom update of this exercise is reused by:</div>
              <ul>
                {reusingUpdateExercises.map((exercise) => (
                  <li key={exercise} className="ml-4 text-xs font-semibold list-disc">
                    {exercise.fullName}
                  </li>
                ))}
              </ul>
            </div>
          </MenuItemWrapper>
        </div>
      )}
      <div>
        {ownUpdate?.type === "custom" && reuseCandidates.length > 0 && (
          <div>
            <MenuItemWrapper
              isBorderless
              name="program-exercise-update-reuse"
              onClick={() => {
                if (reusingUpdateExercises.length > 0) {
                  alert("You cannot reuse update if this custom update is reused by other exercises.");
                }
              }}
            >
              <div className="flex items-center py-1">
                <div className="flex-1 text-sm">Reuse update from:</div>
                <div className="flex-1">
                  <InputSelect
                    hint="You can only reuse update of exercises that don't reuse other exercises"
                    name="program-exercise-update-reuse-select"
                    values={reuseCandidates}
                    value={reuseKey}
                    disabled={reusingUpdateExercises.length > 0}
                    placeholder="None"
                    onChange={(fullName) => {
                      props.plannerDispatch(
                        lbProgram.recordModify((program) => {
                          return EditProgramUiHelpers.changeFirstInstance(
                            program,
                            plannerExercise,
                            props.settings,
                            true,
                            (e) => {
                              if (fullName) {
                                e.update = {
                                  type: "custom",
                                  reuse: fullName ? { fullName, source: "specific" } : undefined,
                                };
                              } else {
                                e.update = {
                                  type: "custom",
                                  reuse: undefined,
                                  script: "{~~}",
                                };
                              }
                            }
                          );
                        }),
                        "Change update reuse"
                      );
                    }}
                  />
                </div>
              </div>
            </MenuItemWrapper>
          </div>
        )}
      </div>
    </>
  );
}
