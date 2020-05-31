import { h, JSX } from "preact";
import { IconCog } from "./iconCog";
import { IDispatch } from "../ducks/types";
import { IconGraphs } from "./iconGraphs";

export function FooterView(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <div className="relative flex items-center pb-2 text-center text-white bg-blue-700">
      <div className="flex-1 px-3 text-sm text-left text-blue-500">{__COMMIT_HASH__}</div>
      <div className="flex-1 text-right">
        <button
          className="p-4"
          aria-label="Graphs"
          onClick={() => props.dispatch({ type: "PushScreen", screen: "graphs" })}
        >
          <IconGraphs />
        </button>
        <button
          className="p-4"
          aria-label="Settings"
          onClick={() => props.dispatch({ type: "PushScreen", screen: "settings" })}
        >
          <IconCog />
        </button>
      </div>
    </div>
  );
}
