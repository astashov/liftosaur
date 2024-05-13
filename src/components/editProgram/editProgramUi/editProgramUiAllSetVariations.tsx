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
      ? plannerExercise.reuse?.exercise?.setVariations ?? []
      : plannerExercise.setVariations;
  const lbProgram = lb<IPlannerState>().p("current").p("program");
  const reuse = plannerExercise.reuse;

  return (
    <div className="my-4">
      <GroupHeader name={plannerExercise.setVariations.length > 1 ? "Set Variations" : "Working sets"} />
      {reuse && <div className="mb-2 text-xs">Reusing sets from {reuse.fullName}</div>}
      {setVariations.map((_, index) => {
        return (
          <div
            className={`${index !== 0 ? "mt-2" : ""} ${
              plannerExercise.setVariations.length > 1 ? "border-b pb-4 border-grayv2-100" : ""
            }`}
          >
            <EditProgramUiSetVariation
              disabled={!!plannerExercise.reuse}
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
            name="add-set-variation"
            onClick={() => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers.changeCurrentInstance(
                    program,
                    props.dayData,
                    props.exerciseLine,
                    props.settings,
                    (e) => {
                      e.setVariations.push({
                        sets: [
                          {
                            repRange: { minrep: 1, maxrep: 1, isAmrap: false, isQuickAddSet: false, numberOfSets: 1 },
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
