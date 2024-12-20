import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconLink } from "./icons/iconLink";
import { IconPicture } from "./icons/iconPicture";

interface IProps {
  isHidden: boolean;
  onExportProgramToLink: () => void;
  onGenerateProgramImage: () => void;
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
          description="To share it with somebody."
          onClick={props.onExportProgramToLink}
        />
        <BottomSheetItem
          name="generate-image"
          className="ls-generate-image"
          title="Generate program image"
          icon={<IconPicture />}
          description="To share it with somebody."
          onClick={props.onGenerateProgramImage}
        />
      </div>
    </BottomSheet>
  );
}
