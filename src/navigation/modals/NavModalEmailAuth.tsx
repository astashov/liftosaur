import { JSX, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { EmailAuthForm, IEmailAuthMode } from "../../components/account";
import { Thunk_pushScreen } from "../../ducks/thunks";
import { IState } from "../../models/state";
import type { IRootStackParamList } from "../types";

const modalTitles: Record<IEmailAuthMode, string> = {
  signin: "Sign in with Email",
  signup: "Create Account",
  forgot: "Forgot Password",
};

export function NavModalEmailAuth(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "emailAuthModal"; params: IRootStackParamList["emailAuthModal"] }>();
  const [mode, setMode] = useState<IEmailAuthMode>("signin");

  const onClose = (): void => {
    navigation.goBack();
  };

  const onSignIn = (newState: IState): void => {
    onClose();
    if (route.params?.navigateHomeOnSignIn && newState.storage.currentProgramId) {
      dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
    }
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <View className="px-4 pb-4">
          <Text className="mb-2 text-lg font-bold text-center">{modalTitles[mode]}</Text>
          <EmailAuthForm dispatch={dispatch} onSignIn={onSignIn} onModeChange={setMode} />
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
