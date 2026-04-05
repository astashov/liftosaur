import { JSX, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { useAppContext } from "../../components/appContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Account } from "../../components/account";
import { Account_getFromStorage } from "../../models/account";
import { IState } from "../../models/state";
import { Thunk_pushScreen } from "../../ducks/thunks";

export function NavModalAccount(): JSX.Element {
  const { state, dispatch } = useAppState();
  const { service } = useAppContext();
  const navigation = useNavigation();

  const userId = state.user?.id;
  const userEmail = state.user?.email;
  const account = userId && userEmail ? Account_getFromStorage(userId, userEmail, state.storage) : undefined;

  const onSignIn = useCallback((newState: IState) => {
    if (newState.storage.currentProgramId) {
      dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
    }
  }, []);

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <Account account={account} client={service.client} dispatch={dispatch} onSignIn={onSignIn} />
    </ModalScreenContainer>
  );
}
