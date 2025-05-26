import { h, JSX } from "preact";
import {
  IPlannerExerciseState,
  IPlannerProgramExercise,
  IPlannerProgramExerciseDescription,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramUiHelpers } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { IconTrash } from "../icons/iconTrash";
import { CollectionUtils } from "../../utils/collection";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { MarkdownEditorBorderless } from "../markdownEditorBorderless";

interface IEditProgramExerciseDescriptionProps {
  isMultiple: boolean;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  descriptionIndex: number;
  description: IPlannerProgramExerciseDescription;
  settings: ISettings;
}

export function EditProgramExerciseDescription(props: IEditProgramExerciseDescriptionProps): JSX.Element {
  const { description } = props;
  const currentIndex = PlannerProgramExercise.currentDescriptionIndex(props.plannerExercise);

  return (
    <div className="border rounded-lg bg-purplev3-50 border-purplev3-150">
      {props.isMultiple && (
        <div className="flex items-center gap-4 pt-2 pb-1 pl-4 pr-2">
          <div className="flex-1 font-semibold">Description {props.descriptionIndex + 1}</div>
          <div className="flex items-center gap-2">
            <div>
              <label className="leading-none">
                <span className="mr-2 text-xs">Is Current?</span>
                <input
                  checked={currentIndex === props.descriptionIndex}
                  className="block align-middle checkbox text-bluev2"
                  type="checkbox"
                  onChange={(e) => {
                    EditProgramUiHelpers.changeCurrentInstanceExercise(
                      props.plannerDispatch,
                      props.plannerExercise,
                      props.settings,
                      (ex) => {
                        for (let i = 0; i < ex.descriptions.values.length; i++) {
                          ex.descriptions.values[i].isCurrent = i === props.descriptionIndex;
                        }
                      }
                    );
                  }}
                />
              </label>
            </div>
            <button
              className="p-2"
              onClick={() => {
                EditProgramUiHelpers.changeCurrentInstanceExercise(
                  props.plannerDispatch,
                  props.plannerExercise,
                  props.settings,
                  (ex) => {
                    ex.descriptions.values = CollectionUtils.removeAt(ex.descriptions.values, props.descriptionIndex);
                  }
                );
              }}
            >
              <IconTrash />
            </button>
          </div>
        </div>
      )}
      <div className="p-2">
        <MarkdownEditorBorderless
          value={description.value}
          isTransparent={true}
          placeholder={`Exercise description in Markdown...`}
          onChange={(v) => {
            EditProgramUiHelpers.changeCurrentInstanceExercise(
              props.plannerDispatch,
              props.plannerExercise,
              props.settings,
              (ex) => {
                ex.descriptions.values[props.descriptionIndex].value = v;
              }
            );
          }}
        />
      </div>
    </div>
  );
}
