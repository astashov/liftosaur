import { h, JSX } from "preact";
import { IWhatsNew, WhatsNew } from "../models/whatsnew";
import { DateUtils } from "../utils/date";
import { ObjectUtils } from "../utils/object";
import { Modal } from "./modal";

export interface IModalWhatsnewProps {
  lastDateStr: string;
  onClose: () => void;
}

export function ModalWhatsnew(props: IModalWhatsnewProps): JSX.Element {
  const all = WhatsNew.all();
  const sortedWhatsnewRecords = ObjectUtils.keys(all).reduce<[string, IWhatsNew][]>((memo, dateStr) => {
    memo.push([dateStr, all[dateStr]]);
    return memo;
  }, []);
  sortedWhatsnewRecords.sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10));

  return (
    <Modal shouldShowClose={true} onClose={props.onClose}>
      <h3 className="pb-2 text-xl font-bold text-center">What's new?</h3>
      <ul className="text-sm">
        {sortedWhatsnewRecords.map(([dateStr, whatsNewRecord]) => {
          const date = DateUtils.format(DateUtils.fromYYYYMMDD(dateStr, ""), true);
          return (
            <li className="pb-6">
              <div className="text-xs font-bold text-gray-500">{date}</div>
              <div>
                <h2 className="font-bold">{whatsNewRecord.title}</h2>
                <p className="whatsnew">{whatsNewRecord.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
