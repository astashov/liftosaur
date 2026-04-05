import type { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Button } from "../../components/button";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { SendMessage_isIos, SendMessage_isAndroid } from "../../utils/sendMessage";
import { Thunk_log, Thunk_pushScreen } from "../../ducks/thunks";

export function NavModalSignupRequest(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const lbSaveSignupRequestDate = [
    lb<IState>().p("showSignupRequest").record(false),
    lb<IState>()
      .p("storage")
      .p("signupRequests")
      .recordModify((r) => [...r, Date.now()]),
  ];

  const onClose = (): void => {
    dispatch(Thunk_log("ls-signup-request-close"));
    updateState(dispatch, lbSaveSignupRequestDate, "Close signup request");
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
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
          You finished <span className="font-bold text-text-error">{state.storage.history.length} workouts</span>{" "}
          already! This is awesome! Consider
          <strong> signing up</strong> so your workout history would be backed up in the cloud.
        </div>
        <div className="mt-4">
          {SendMessage_isIos() && (
            <>
              It's a one-click process via <strong>Sign-in with Apple</strong>.
            </>
          )}
          {SendMessage_isAndroid() && (
            <>
              It's a quick process via <strong>Sign-in with Google</strong>.
            </>
          )}
        </div>
        <div className="mt-4 text-center">
          <Button
            name="modal-signup-request-later"
            type="button"
            kind="grayv2"
            data-cy="modal-signup-request-later"
            className="mr-3 ls-signup-request-maybe-later"
            onClick={() => {
              updateState(dispatch, lbSaveSignupRequestDate, "Defer signup request");
              navigation.goBack();
            }}
          >
            Maybe later
          </Button>
          <Button
            name="modal-signup-request-submit"
            kind="purple"
            data-cy="modal-signup-request-submit"
            className="ls-signup-request-signup"
            onClick={() => {
              updateState(dispatch, lbSaveSignupRequestDate, "Accept signup request");
              dispatch(Thunk_pushScreen("account"));
              navigation.goBack();
            }}
          >
            Sign up
          </Button>
        </div>
      </div>
    </ModalScreenContainer>
  );
}
