import { h, JSX } from "preact";
import { IconCog } from "./iconCog";
import { IDispatch } from "../ducks/types";
import { IconGraphs } from "./iconGraphs";
import { Thunk } from "../ducks/thunks";

export function FooterView(props: { dispatch: IDispatch; buttons?: JSX.Element }): JSX.Element {
  return (
    <div className="fixed bottom-0 left-0 z-10 flex items-center w-full pb-2 text-center text-white bg-blue-700">
      <div className="px-3 text-sm text-left text-blue-500">{__COMMIT_HASH__}</div>
      <div className="flex-1 text-right">
        {props.buttons}
        <button
          className="ls-footer-graphs p-4"
          aria-label="Graphs"
          onClick={() => props.dispatch(Thunk.pushScreen("graphs"))}
        >
          <IconGraphs />
        </button>
        <button
          className="ls-footer-settings p-4"
          aria-label="Settings"
          onClick={() => props.dispatch(Thunk.pushScreen("settings"))}
        >
          <IconCog />
        </button>
      </div>
    </div>
  );
}
