import { h, JSX } from "preact";
import { IExercisePickerState, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { IconBack } from "../icons/iconBack";
import { MenuItemEditable } from "../menuItemEditable";

export type IExercisePickerSettings = Pick<
  ISettings["workoutSettings"],
  "shouldKeepProgramExerciseId" | "pickerSort" | "shouldShowInvisibleEquipment"
>;

interface IProps {
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  onChange: (settings: IExercisePickerSettings) => void;
}

export function ExercisePickerSettings(props: IProps): JSX.Element {
  return (
    <div className="flex flex-col h-full pb-4">
      <div className="relative py-4 mt-2">
        <div className="absolute flex top-2 left-4">
          <div>
            <button
              className="p-2 nm-back"
              data-cy="navbar-back"
              onClick={() => {
                props.dispatch(
                  lb<IExercisePickerState>()
                    .p("screenStack")
                    .recordModify((stack) => stack.slice(0, -1)),
                  "Pop screen in exercise picker screen stack"
                );
              }}
            >
              <IconBack />
            </button>
          </div>
        </div>
        <h3 className="px-4 font-bold text-center">Settings</h3>
      </div>
      <div className="px-4">
        <MenuItemEditable
          type="boolean"
          isNameHtml={true}
          name='<span class="break-normal">Keep existing program exercise logic when pick adhoc exercise</span>'
          value={props.settings.workoutSettings.shouldKeepProgramExerciseId ? "true" : "false"}
          onChange={(v) => {
            props.onChange({
              shouldKeepProgramExerciseId: v === "true",
            });
          }}
        />
      </div>
    </div>
  );
}
