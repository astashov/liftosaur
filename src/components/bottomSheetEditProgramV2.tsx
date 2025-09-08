import { h, JSX, Fragment } from "preact";
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
  isAffiliateEnabled: boolean;
  onExportProgramToLink: () => void;
  onShareProgramToLink: () => void;
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
          className="ls-public-share-program"
          title="Copy Shareable Link to Program"
          icon={<IconLink />}
          description={
            <span>
              To share it with somebody
              {props.isAffiliateEnabled ? (
                <>
                  ,{" "}
                  <span className="inline-block px-1 rounded-md border-border-cardyellow bg-background-yellowdark text-text-purple">
                    as an affiliate link
                  </span>
                </>
              ) : (
                <></>
              )}
              .
            </span>
          }
          onClick={props.onShareProgramToLink}
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
          <>
            <BottomSheetItem
              name="copy-link"
              className="ls-private-export-program"
              title="Copy Private Link to Program"
              icon={<IconLink />}
              description="To edit it on your laptop in a browser."
              onClick={props.onExportProgramToLink}
            />
            <BottomSheetItem
              name="show-program-revisions"
              className="ls-show-program-revisions"
              title="Show program versions"
              icon={props.isLoadingRevisions ? <IconSpinner width={17} height={17} /> : <IconDoc2 />}
              description="See history of changes of your program"
              onClick={props.onLoadRevisions}
            />
          </>
        )}
      </div>
    </BottomSheet>
  );
}
