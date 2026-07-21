import { JSX, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { EmailAuthForm, IEmailAuthMode } from "../../components/account";

const modalTitles: Record<IEmailAuthMode, string> = {
  signin: "Sign in with Email",
  signup: "Create Account",
  forgot: "Forgot Password",
};

export function NavModalEmailAuth(): JSX.Element {
  const { dispatch } = useAppState();
  const navigation = useNavigation();
  const [mode, setMode] = useState<IEmailAuthMode>("signin");

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <View className="px-4 pb-4">
          <Text className="mb-2 text-lg font-bold text-center">{modalTitles[mode]}</Text>
          <EmailAuthForm dispatch={dispatch} onSignIn={() => onClose()} onModeChange={setMode} />
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
