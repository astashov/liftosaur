import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconDoc } from "./icons/iconDoc";
import { IconPreview } from "./icons/iconPreview";
import { IconMuscles2 } from "./icons/iconMuscles2";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { Program } from "../models/program";
import { IconLink } from "./icons/iconLink";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";

interface IProps {
  isHidden: boolean;
  onExportProgramToFile: () => void;
  onExportProgramToLink: () => void;
  editProgramId: string;
  dispatch: IDispatch;
  onClose: () => void;
}

export function BottomSheetEditProgram(props: IProps): JSX.Element {
  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose}>
      <div className="p-4">
        <BottomSheetItem
          name="preview-program"
          className="ls-preview-program"
          title="Preview Program"
          isFirst={true}
          icon={<IconPreview />}
          description="Preview the current program."
          onClick={() => Program.previewProgram(props.dispatch, props.editProgramId, true)}
        />
        <BottomSheetItem
          name="muscles-program"
          className="ls-muscles-program"
          title="Muscles"
          icon={<IconMuscles2 />}
          description="Muscle balance of the current program."
          onClick={() => {
            updateState(props.dispatch, [
              lb<IState>().p("muscleView").record({ type: "program", programId: props.editProgramId }),
            ]);
            props.dispatch(Thunk.pushScreen("muscles"));
          }}
        />
        <BottomSheetItem
          name="export-program"
          className="ls-export-program"
          title="Export Program To File"
          icon={<IconDoc />}
          description="Exports to a JSON file that you can import later or share with your friends. You can also import it to the app on another device."
          onClick={props.onExportProgramToFile}
        />
        <BottomSheetItem
          name="copy-link"
          className="ls-export-program"
          title="Copy Link to Program"
          icon={<IconLink />}
          description="So you can open it in the web editor, or share with somebody."
          onClick={props.onExportProgramToLink}
        />
      </div>
    </BottomSheet>
  );
}
