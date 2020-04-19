import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";

interface IProps {
  dispatch: IDispatch;
  email?: string;
}

export function ScreenSettings(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView
        title="Settings"
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section className="flex-1 w-full">
        <button
          className="flex w-full px-6 py-4 text-left border-b border-gray-200"
          onClick={() => props.dispatch({ type: "PushScreen", screen: "account" })}
        >
          <span className="flex-1">Account</span>
          {props.email != null && <span className="flex-1 text-gray-500">{props.email}</span>}
        </button>
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
