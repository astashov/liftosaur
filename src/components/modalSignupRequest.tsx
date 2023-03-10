import { h, JSX, Fragment } from "preact";
import { Modal } from "./modal";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { SendMessage } from "../utils/sendMessage";
import { Thunk } from "../ducks/thunks";

interface IProps {
  numberOfWorkouts: number;
  dispatch: IDispatch;
}

export function ModalSignupRequest(props: IProps): JSX.Element {
  const lbSaveSignupRequestDate = [
    lb<IState>().p("showSignupRequest").record(false),
    lb<IState>()
      .p("storage")
      .p("signupRequests")
      .recordModify((r) => [...r, Date.now()]),
  ];

  return (
    <Modal
      shouldShowClose={true}
      isFullWidth={true}
      onClose={() => {
        props.dispatch(Thunk.log("ls-signup-request-close"));
        updateState(props.dispatch, lbSaveSignupRequestDate);
      }}
    >
      <div className="text-center">
        <h3 className="pb-4 text-xl font-bold text-center">Please Sign Up!</h3>
        <div className="mx-8">
          <img
            src="/images/buff-coder-thumbsup.png"
            style={{ maxWidth: "20rem" }}
            className="inline-block w-full"
            alt="Buff coder showing thumbs up"
          />
        </div>
        <div className="mt-4">
          You finished <span className="font-bold text-redv2-main">{props.numberOfWorkouts} workouts</span> already!
          This is awesome! Consider
          <strong> signing up</strong> so your workout history would be backed up in the cloud.
        </div>
        <div className="mt-4">
          {SendMessage.isIos() && (
            <>
              It's a one-click process via <strong>Sign-in with Apple</strong>.
            </>
          )}
          {SendMessage.isAndroid() && (
            <>
              It's a quick process via <strong>Sign-in with Google</strong>.
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Button
            type="button"
            kind="grayv2"
            data-cy="modal-signup-request-later"
            className="mr-3 ls-signup-request-maybe-later"
            onClick={() => {
              updateState(props.dispatch, lbSaveSignupRequestDate);
            }}
          >
            Maybe later
          </Button>
          <Button
            kind="orange"
            data-cy="modal-signup-request-submit"
            className="ls-signup-request-signup"
            onClick={() => {
              updateState(props.dispatch, lbSaveSignupRequestDate);
              props.dispatch(Thunk.pushScreen("account"));
            }}
          >
            Sign up
          </Button>
        </div>
      </div>
    </Modal>
  );
}
