import { h, JSX } from "preact";
import { IconCog } from "./iconCog";
import { IDispatch } from "../ducks/types";

export function FooterView(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <div className="relative bg-blue-700 text-white flex-row-reverse flex items-center p-2 text-center">
      <button onClick={() => props.dispatch({ type: "PushScreen", screen: "settings" })}>
        <IconCog />
      </button>
    </div>
  );
}
