import { IDispatch } from "../ducks/types";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";
import { WhatsNew_all } from "./whatsnew";

export function WhatsNew_updateStorage(dispatch: IDispatch): void {
  const latestDateStr = Object.keys(WhatsNew_all()).sort().reverse()[0];
  updateState(
    dispatch,
    [lb<IState>().p("storage").p("whatsNew").record(latestDateStr), lb<IState>().p("showWhatsNew").record(false)],
    "Mark what's new as read"
  );
}

export function WhatsNew_showWhatsNew(dispatch: IDispatch): void {
  updateState(dispatch, [lb<IState>().p("showWhatsNew").record(true)], "Show what's new");
}
