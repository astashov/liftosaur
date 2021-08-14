import { h, JSX } from "preact";
import { IconCog } from "./iconCog";
import { IDispatch } from "../ducks/types";
import { IconGraphs } from "./iconGraphs";
import { Thunk } from "../ducks/thunks";
import { ILoading } from "../models/state";
import { IconSpinner } from "./iconSpinner";

interface IFooterProps {
  dispatch: IDispatch;
  loading: ILoading;
  buttons?: JSX.Element;
}

export function FooterView(props: IFooterProps): JSX.Element {
  const loadingItems = props.loading.items;
  const loadingKeys = Object.keys(loadingItems).filter((k) => loadingItems[k]);
  return (
    <div className="fixed bottom-0 left-0 z-10 flex items-center w-full pb-2 text-center text-white bg-blue-700">
      <div className="px-4" style={{ lineHeight: 1 }}>
        {Object.keys(loadingKeys).length > 0 ? <IconSpinner width={20} height={20} /> : null}
        {props.loading.error && <span className="px-1 text-sm text-left text-red-300">{props.loading.error}</span>}
      </div>
      <div className="flex-1 text-right whitespace-no-wrap">
        {props.buttons}
        <button
          data-cy="footer-graphs"
          className="ls-footer-graphs p-4"
          aria-label="Graphs"
          onClick={() => props.dispatch(Thunk.pushScreen("graphs"))}
        >
          <IconGraphs />
        </button>
        <button
          data-cy="footer-settings"
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
