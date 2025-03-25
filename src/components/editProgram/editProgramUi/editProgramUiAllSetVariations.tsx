import { lb } from "lens-shmens";
import { JSX, h } from "preact";
import { IPlannerProgramExercise, IPlannerState } from "../../../pages/planner/models/types";
import { IDayData, ISettings } from "../../../types";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { GroupHeader } from "../../groupHeader";
import { LinkButton } from "../../linkButton";
import { EditProgramUiHelpers } from "./editProgramUiHelpers";
import { EditProgramUiSetVariation } from "./editProgramUiSetVariation";

interface IEditProgramUiAllSetVariationsProps {
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  dayData: Required<IDayData>;
  exerciseLine: number;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramUiAllSetVariations(props: IEditProgramUiAllSetVariationsProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const setVariations =
    plannerExercise.setVariations.length === 0
      ? (plannerExercise.reuse?.exercise?.setVariations ?? [])
      : plannerExercise.setVariations;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const reuse = plannerExercise.reuse;
  let currentSetVariation = plannerExercise.setVariations.findIndex((v) => v.isCurrent) + 1;
  if (currentSetVariation === 0) {
    currentSetVariation = 1;
  }

  return (
    <div className="my-4">
      <GroupHeader name={plannerExercise.setVariations.length > 1 ? "Set Variations" : "Working sets"} />
      {plannerExercise.setVariations.length > 1 && (
        <div className="flex items-center">
          <span className="mr-2 text-sm">Current set variation:</span>
          <select
            value={currentSetVariation}
            data-cy="edit-exercise-set-variation-index"
            onChange={(event) => {
              const target = event.target as HTMLSelectElement | undefined;
              const value = target?.value;
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers.changeCurrentInstance(
                    program,
                    props.dayData,
                    plannerExercise.fullName,
                    props.settings,
                    (ex) => {
                      ex.setVariations.forEach((sv) => (sv.isCurrent = false));
                      ex.setVariations[Number(value) - 1].isCurrent = true;
                    }
                  );
                })
              );
            }}
          >
            {Array.from({ length: plannerExercise.setVariations.length }, (_, i) => i + 1).map((i) => {
              return (
                <option value={i} selected={i === currentSetVariation}>
                  {i}
                </option>
              );
            })}
          </select>
        </div>
      )}
      {reuse && (
        <div className="mb-2 text-xs">
          <div>Reusing sets from {reuse.fullName}</div>
          <div>
            <LinkButton
              name="sets-override-reuse"
              data-cy="edit-exercise-set-variation-reuse-override"
              onClick={() => {
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers.changeCurrentInstance(
                      program,
                      props.dayData,
                      plannerExercise.fullName,
                      props.settings,
                      (e) => {
                        e.globals = {};
                        if (e.setVariations.length === 0) {
                          e.setVariations.push({
                            sets: [
                              {
                                repRange: {
                                  maxrep: 1,
                                  isAmrap: false,
                                  isQuickAddSet: false,
                                  numberOfSets: 1,
                                },
                              },
                            ],
                            isCurrent: true,
                          });
                        } else {
                          e.setVariations = [];
                        }
                      }
                    );
                  })
                );
              }}
            >
              {plannerExercise.setVariations.length === 0 ? "Override reused sets" : "Switch to reused sets"}
            </LinkButton>
          </div>
        </div>
      )}
      {setVariations.map((_, index) => {
        return (
          <div
            className={`${index !== 0 ? "mt-2" : ""} ${
              plannerExercise.setVariations.length > 1 ? "border-b pb-4 border-grayv2-100" : ""
            }`}
          >
            <EditProgramUiSetVariation
              disabled={plannerExercise.setVariations.length === 0}
              plannerExercise={plannerExercise}
              dayData={props.dayData}
              exerciseLine={props.exerciseLine}
              index={index}
              showHeader={setVariations.length > 1}
              settings={props.settings}
              plannerDispatch={props.plannerDispatch}
            />
          </div>
        );
      })}
      {plannerExercise.setVariations.length > 1 && (
        <div>
          <LinkButton
            className="text-xs"
            data-cy="edit-exercise-set-variation-add"
            name="add-set-variation"
            onClick={() => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers.changeCurrentInstance(
                    program,
                    props.dayData,
                    plannerExercise.fullName,
                    props.settings,
                    (e) => {
                      e.setVariations.push({
                        sets: [
                          {
                            repRange: { maxrep: 1, isAmrap: false, isQuickAddSet: false, numberOfSets: 1 },
                          },
                        ],
                        isCurrent: false,
                      });
                    }
                  );
                })
              );
            }}
          >
            Add Set Variation
          </LinkButton>
        </div>
      )}
    </div>
  );
}
