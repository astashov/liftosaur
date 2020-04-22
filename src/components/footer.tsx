import { h, JSX } from "preact";
import { IconCog } from "./iconCog";
import { IDispatch } from "../ducks/types";

export function FooterView(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <div className="relative flex items-center p-3 text-center text-white bg-blue-700">
      <div className="flex-1 text-sm text-left text-blue-500">{__COMMIT_HASH__}</div>
      <div className="flex-1 text-right">
        <button aria-label="Settings" onClick={() => props.dispatch({ type: "PushScreen", screen: "settings" })}>
          <IconCog />
        </button>
      </div>
    </div>
  );
}
