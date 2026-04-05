import { JSX, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Button } from "../../components/button";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";

export function NavModalCorruptedState(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();

  const corruptedstorage = state.errors.corruptedstorage;

  const onReset = (): void => {
    updateState(
      dispatch,
      [lb<IState>().p("errors").p("corruptedstorage").record(undefined)],
      "Reset corrupted storage"
    );
    navigation.goBack();
  };

  const shouldGoBack = !corruptedstorage;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !corruptedstorage) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onReset}>
      <h3 className="pt-2 pb-4 text-lg font-bold text-center">🚨 Corrupted Storage 🚨</h3>
      <p className="pb-4">
        Something went <strong>terribly wrong</strong>, and your {corruptedstorage.local ? "local" : "remote"} storage
        and history got corrupted. This should never happen, but it did.
      </p>
      {corruptedstorage.backup ? (
        <div className="pb-4 font-bold text-center text-text-success">
          History was successfully backed up, user: <strong>{corruptedstorage.userid}</strong>
        </div>
      ) : (
        <div className="pb-4 font-bold text-center text-text-error">Could not back up the history</div>
      )}
      <p className="pb-4">
        Please contact the developer of this app, and he is going to look into this ASAP. You can contact us at{" "}
        <a className="font-bold underline text-text-link" href="mailto:info@liftosaur.com">
          info@liftosaur.com
        </a>
        .
      </p>
      {corruptedstorage.local ? (
        <p className="pb-4">
          You can either wait until this is fixed (and close the app for now), or start with the empty state (but your
          history and programs will be gone).
        </p>
      ) : (
        <p className="pb-4">
          We will log out for now, and won't sync the changes to the cloud, to avoid even bigger mess.
        </p>
      )}
      <div className="text-center">
        <Button name="corrupted-state-reset" kind="red" onClick={onReset}>
          {corruptedstorage.local ? "Reset and start from scratch" : "Continue"}
        </Button>
      </div>
    </ModalScreenContainer>
  );
}
