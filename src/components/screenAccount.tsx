import { h, JSX } from "preact";
import { FooterView } from "./footer";
import { HeaderView } from "./header";
import { IDispatch } from "../ducks/types";
import { Thunk } from "../ducks/thunks";

interface IProps {
  dispatch: IDispatch;
}

export function ScreenAccount(props: IProps): JSX.Element {
  return (
    <section className="flex flex-col h-full">
      <HeaderView title="Account" left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>} />
      <section className="flex-1 w-full">
        <button
          className="border-gray-200 border-b py-4 px-6 w-full"
          onClick={() => props.dispatch(Thunk.googleSignIn())}
        >
          Log In
        </button>
      </section>
      <FooterView dispatch={props.dispatch} />
    </section>
  );
}

// access_token -> google id
// google id -> user id
// user id -> storage
