import { h, JSX } from "preact";
import { BottomSheet } from "./bottomSheet";
import { BottomSheetItem } from "./bottomSheetItem";
import { IHistoryRecord, ISettings } from "../types";
import { WorkoutShareBottomSheetItem } from "./workoutShareBottomSheetItem";
import { IconLink } from "./icons/iconLink";
import { ClipboardUtils_copy } from "../utils/clipboard";
import { Share_generateLink } from "../models/share";
import { IconDoc } from "./icons/iconDoc";
import { LiftohistorySerializer_serialize } from "../liftohistory/liftohistorySerializer";

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
                const link = Share_generateLink(props.userId, props.record.id);
                ClipboardUtils_copy(link);
                alert("Copied!");
              } else {
                alert("You should be logged in to copy link to a workout");
              }
            }}
          />
          <WorkoutShareBottomSheetItem history={props.history} record={props.record} settings={props.settings} />
          <BottomSheetItem
            name="share-to-text"
            title="Copy as Text"
            description={""}
            icon={<IconDoc width={24} height={24} />}
            onClick={() => {
              const text = LiftohistorySerializer_serialize(props.record, props.settings);
              ClipboardUtils_copy(text);
              alert("Copied!");
              props.onClose();
            }}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
