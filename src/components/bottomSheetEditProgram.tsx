import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconDoc } from "./icons/iconDoc";

interface IProps {
  isHidden: boolean;
  onExportProgramToFile: () => void;
  onClose: () => void;
}

export function BottomSheetEditProgram(props: IProps): JSX.Element {
  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose}>
      <div className="p-4">
        <BottomSheetItem
          name="export-program"
          className="ls-export-program"
          title="Export Program To File"
          isFirst={true}
          icon={<IconDoc />}
          description="Exports to a JSON file that you can import later or share with your friends. You can also import it to the app on another device."
          onClick={props.onExportProgramToFile}
        />
      </div>
    </BottomSheet>
  );
}
