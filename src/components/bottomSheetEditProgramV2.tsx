import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IconLink } from "./icons/iconLink";
import { IconPicture } from "./icons/iconPicture";
import { IconSpinner } from "./icons/iconSpinner";
import { IconDoc2 } from "./icons/iconDoc2";

interface IProps {
  isHidden: boolean;
  isLoggedIn: boolean;
  isLoadingRevisions: boolean;
  onExportProgramToLink: () => void;
  onGenerateProgramImage: () => void;
  onLoadRevisions: () => void;
  onClose: () => void;
}

export function BottomSheetEditProgramV2(props: IProps): JSX.Element {
  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose}>
      <div className="p-4">
        <BottomSheetItem
          isFirst={true}
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
        {props.isLoggedIn && (
          <BottomSheetItem
            name="show-program-revisions"
            className="ls-show-program-revisions"
            title="Show program versions"
            icon={props.isLoadingRevisions ? <IconSpinner width={17} height={17} /> : <IconDoc2 />}
            description="See history of changes of your program"
            onClick={props.onLoadRevisions}
          />
        )}
      </div>
    </BottomSheet>
  );
}
