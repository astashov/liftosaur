import { IDispatch } from "../ducks/types";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";
import { DateUtils_formatYYYYMMDD } from "../utils/date";

export function WhatsNew_updateStorage(dispatch: IDispatch): void {
  updateState(
    dispatch,
    [
      lb<IState>().p("storage").p("whatsNew").record(DateUtils_formatYYYYMMDD(Date.now(), "")),
      lb<IState>().p("showWhatsNew").record(false),
    ],
    "Mark what's new as read"
  );
}

export function WhatsNew_showWhatsNew(dispatch: IDispatch): void {
  updateState(dispatch, [lb<IState>().p("showWhatsNew").record(true)], "Show what's new");
}
