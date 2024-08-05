import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconLink } from "./icons/iconLink";

interface IProps {
  isHidden: boolean;
  onExportProgramToLink: () => void;
  onClose: () => void;
}

export function BottomSheetEditProgramV2(props: IProps): JSX.Element {
  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose}>
      <div className="p-4">
        <BottomSheetItem
          name="copy-link"
          className="ls-export-program"
          title="Copy Link to Program"
          icon={<IconLink />}
          description="So you can share it with somebody."
          onClick={props.onExportProgramToLink}
        />
      </div>
    </BottomSheet>
  );
}
