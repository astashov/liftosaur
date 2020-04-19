import { h, JSX, Fragment } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";

interface IProps {
  email?: string;
  dispatch: IDispatch;
}

export function ScreenAccount(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView title="Account" left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>} />
      {props.email != null ? (
        <ScreenAccountLoggedIn email={props.email} dispatch={props.dispatch} />
      ) : (
        <ScreenAccountLoggedOut dispatch={props.dispatch} />
      )}
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}

function ScreenAccountLoggedOut(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <section className="flex-1 w-full">
      <button
        className="w-full px-6 py-4 border-b border-gray-200"
        onClick={() => props.dispatch(Thunk.googleSignIn())}
      >
        <span className="flex-1">Log In</span>
      </button>
    </section>
  );
}

function ScreenAccountLoggedIn(props: { email: string; dispatch: IDispatch }): JSX.Element {
  return (
    <Fragment>
      <section className="w-full px-6 py-4 text-center border-b border-gray-200">
        Current account: <span className="text-gray-500">{props.email}</span>
      </section>
      <section className="flex-1 w-full">
        <button className="w-full px-6 py-4 border-b border-gray-200" onClick={() => props.dispatch(Thunk.logOut())}>
          <span className="flex-1">Log Out</span>
        </button>
      </section>
    </Fragment>
  );
}
