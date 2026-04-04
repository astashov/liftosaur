import type { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { IWhatsNew, WhatsNew_all } from "../../models/whatsnew";
import { WhatsNew_updateStorage } from "../../models/whatsnewUtils";
import { DateUtils_format, DateUtils_fromYYYYMMDDStr } from "../../utils/date";
import { ObjectUtils_keys } from "../../utils/object";

export function NavModalWhatsnew(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();

  const onClose = (): void => {
    WhatsNew_updateStorage(dispatch);
    navigation.goBack();
  };

  const all = WhatsNew_all();
  const sortedWhatsnewRecords = ObjectUtils_keys(all).reduce<[string, IWhatsNew][]>((memo, dateStr) => {
    memo.push([dateStr, all[dateStr]]);
    return memo;
  }, []);
  sortedWhatsnewRecords.sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10));

  return (
    <ModalScreenContainer onClose={onClose}>
      <h3 className="pb-2 text-xl font-bold text-center">What's new?</h3>
      <ul className="text-sm">
        {sortedWhatsnewRecords.map(([dateStr, whatsNewRecord]) => {
          const date = DateUtils_format(DateUtils_fromYYYYMMDDStr(dateStr, ""), true);
          return (
            <li key={dateStr} className="pb-6">
              <div className="text-xs font-bold text-gray-500">{date}</div>
              <div>
                <h2 className="font-bold">{whatsNewRecord.title}</h2>
                <div className="whatsnew">{whatsNewRecord.body}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </ModalScreenContainer>
  );
}
