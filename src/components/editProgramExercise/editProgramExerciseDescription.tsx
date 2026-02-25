import { h, JSX } from "preact";
import {
  IPlannerExerciseState,
  IPlannerProgramExercise,
  IPlannerProgramExerciseDescription,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { IconTrash } from "../icons/iconTrash";
import { CollectionUtils_removeAt } from "../../utils/collection";
import { PlannerProgramExercise_currentDescriptionIndex } from "../../pages/planner/models/plannerProgramExercise";
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
  const currentIndex = PlannerProgramExercise_currentDescriptionIndex(props.plannerExercise);

  return (
    <div className="border rounded-lg bg-background-cardpurple border-border-purple">
      {props.isMultiple && (
        <div className="flex items-center gap-4 pt-2 pb-1 pl-4 pr-2">
          <div className="flex-1 font-semibold">Description {props.descriptionIndex + 1}</div>
          <div className="flex items-center gap-2">
            <div>
              <label className="leading-none">
                <span className="mr-2 text-xs">Is Current?</span>
                <input
                  checked={currentIndex === props.descriptionIndex}
                  className="block align-middle checkbox text-text-link"
                  type="checkbox"
                  onChange={(e) => {
                    EditProgramUiHelpers_changeCurrentInstanceExercise(
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
                EditProgramUiHelpers_changeCurrentInstanceExercise(
                  props.plannerDispatch,
                  props.plannerExercise,
                  props.settings,
                  (ex) => {
                    ex.descriptions.values = CollectionUtils_removeAt(ex.descriptions.values, props.descriptionIndex);
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
          debounceMs={500}
          placeholder={`Exercise description in Markdown...`}
          onChange={(v) => {
            EditProgramUiHelpers_changeCurrentInstanceExercise(
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
