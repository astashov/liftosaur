import { JSX } from "preact";
import { ObjectUtils } from "../utils/object";
import { IDispatch } from "../ducks/types";
import { DateUtils } from "../utils/date";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";

export interface IWhatsNew {
  title: JSX.Element;
  body: JSX.Element;
}

const whatsNew: Record<string, IWhatsNew> = {
  // "20220206": {
  //   title: <span>Added 'What's new?' modal</span>,
  //   body: <span>It will show the modal with the updates in the app if something new was added.</span>,
  // },
};

export namespace WhatsNew {
  export function all(): typeof whatsNew {
    return whatsNew;
  }

  export function doesHaveNewUpdates(lastDateStr?: string): boolean {
    if (lastDateStr == null) {
      return false;
    } else {
      return Object.keys(newUpdates(lastDateStr)).length > 0;
    }
  }

  export function newUpdates(lastDateStr: string): Record<string, IWhatsNew> {
    const lastDate = parseInt(lastDateStr, 10);
    return ObjectUtils.keys(whatsNew).reduce<Record<string, IWhatsNew>>((memo, dateStr) => {
      const date = parseInt(dateStr, 10);
      if (date > lastDate) {
        memo[dateStr] = whatsNew[dateStr];
      }
      return memo;
    }, {});
  }

  export function updateStorage(dispatch: IDispatch): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("whatsNew").record(DateUtils.formatYYYYMMDD(Date.now(), "")),
      lb<IState>().p("showWhatsNew").record(false),
    ]);
  }

  export function showWhatsNew(dispatch: IDispatch): void {
    updateState(dispatch, [lb<IState>().p("showWhatsNew").record(true)]);
  }
}
