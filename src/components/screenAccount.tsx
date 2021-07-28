import { h, JSX, Fragment } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";
import { ILoading } from "../models/state";

interface IProps {
  email?: string;
  loading: ILoading;
  dispatch: IDispatch;
}

export function ScreenAccount(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView title="Account" left={<button onClick={() => props.dispatch(Thunk.pullScreen())}>Back</button>} />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        {props.email != null ? (
          <ScreenAccountLoggedIn email={props.email} dispatch={props.dispatch} />
        ) : (
          <ScreenAccountLoggedOut dispatch={props.dispatch} />
        )}
      </section>
      <FooterView loading={props.loading} dispatch={props.dispatch} />
    </section>
  );
}

function ScreenAccountLoggedOut(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <button
      className="ls-login w-full px-6 py-4 border-b border-gray-200"
      data-cy="menu-item-login"
      onClick={() => props.dispatch(Thunk.googleSignIn())}
    >
      <span className="flex-1">Log In</span>
    </button>
  );
}

function ScreenAccountLoggedIn(props: { email: string; dispatch: IDispatch }): JSX.Element {
  return (
    <Fragment>
      <section className="w-full px-6 py-4 text-center border-b border-gray-200" data-cy="menu-item-current-account">
        Current account: <span className="text-gray-500">{props.email}</span>
      </section>
      <section className="flex-1 w-full">
        <button
          data-cy="menu-item-logout"
          className="ls-logout w-full px-6 py-4 border-b border-gray-200"
          onClick={() => props.dispatch(Thunk.logOut())}
        >
          <span className="flex-1">Log Out</span>
        </button>
      </section>
    </Fragment>
  );
}
