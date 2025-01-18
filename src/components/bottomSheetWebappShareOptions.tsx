import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IHistoryRecord, ISettings } from "../types";
import { WorkoutShareBottomSheetItem } from "./workoutShareBottomSheetItem";
import { IconLink } from "./icons/iconLink";
import { ClipboardUtils } from "../utils/clipboard";
import { Share } from "../models/share";

interface IProps {
  record: IHistoryRecord;
  userId?: string;
  history: IHistoryRecord[];
  settings: ISettings;
  isHidden: boolean;
  onClose: () => void;
}

export function BottomSheetWebappShareOptions(props: IProps): JSX.Element {
  return (
    <div>
      <BottomSheet isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
        <div className="p-4">
          <BottomSheetItem
            name="share-to-link"
            title="Copy link to workout"
            isFirst={true}
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
    </div>
  );
}
