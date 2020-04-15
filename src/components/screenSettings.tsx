import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";

interface IProps {
  dispatch: IDispatch;
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
          className="border-gray-200 border-b py-4 px-6 w-full text-left"
          onClick={() => props.dispatch({ type: "PushScreen", screen: "account" })}
        >
          Account
        </button>
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
