import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IHistoryRecord, ISettings } from "../types";
import { IconInstagram } from "./icons/iconInstagram";
import { useState } from "preact/hooks";
import { WorkoutSocialShareSheet } from "./workoutSocialShareSheet";
import { WorkoutShareBottomSheetItem } from "./workoutShareBottomSheetItem";
import { IconLink } from "./icons/iconLink";
import { ClipboardUtils } from "../utils/clipboard";
import { Share } from "../models/share";
import { IconTiktok } from "./icons/iconTiktok";

interface IProps {
  record: IHistoryRecord;
  userId?: string;
  history: IHistoryRecord[];
  settings: ISettings;
  isHidden: boolean;
  onClose: () => void;
}

export function BottomSheetMobileShareOptions(props: IProps): JSX.Element {
  const [shareType, setShareType] = useState<"igstory" | "igfeed" | "tiktok">("igstory");
  const [shouldShowShareSheet, setShouldShowShareSheet] = useState<boolean>(false);

  return (
    <div>
      <BottomSheet isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
        <div className="p-4">
          <BottomSheetItem
            name="share-to-igstory"
            title="Share to Instagram Story"
            isFirst={true}
            description={""}
            icon={<IconInstagram size={24} />}
            onClick={() => {
              setShouldShowShareSheet(true);
              setShareType("igstory");
              props.onClose();
            }}
          />
          <BottomSheetItem
            name="share-to-igfeed"
            title="Share to Instagram Feed"
            description={""}
            icon={<IconInstagram size={24} />}
            onClick={() => {
              setShouldShowShareSheet(true);
              setShareType("igfeed");
              props.onClose();
            }}
          />
          <BottomSheetItem
            name="share-to-tiktok"
            title="Share to Tiktok"
            description={""}
            icon={<IconTiktok width={24} height={24} />}
            onClick={() => {
              setShouldShowShareSheet(true);
              setShareType("tiktok");
              props.onClose();
            }}
          />
          <BottomSheetItem
            name="share-to-link"
            title="Copy link to workout"
            description={""}
            icon={<IconLink />}
            onClick={() => {
              if (props.userId) {
                const link = Share.generateLink(props.userId, props.history[0].id);
                ClipboardUtils.copy(link);
                alert("Copied!");
              } else {
                alert("You should be logged in to copy link to a workout");
              }
            }}
          />
          <WorkoutShareBottomSheetItem history={props.history} record={props.record} settings={props.settings} />
        </div>
      </BottomSheet>
      <BottomSheet
        isHidden={!shouldShowShareSheet}
        onClose={() => setShouldShowShareSheet(false)}
        shouldShowClose={true}
      >
        <WorkoutSocialShareSheet
          history={props.history}
          record={props.record}
          settings={props.settings}
          type={shareType}
          isHidden={!shouldShowShareSheet}
        />
      </BottomSheet>
    </div>
  );
}
