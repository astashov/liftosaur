import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { Text } from "../../components/primitives/text";
import { useAppContext } from "../../components/appContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ChangePasswordForm } from "../../components/account";

export function NavModalChangePassword(): JSX.Element {
  const { service } = useAppContext();
  const navigation = useNavigation();

  const onClose = (): void => {
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <View className="px-4 pb-4">
          <Text className="mb-2 text-lg font-bold text-center">Change Password</Text>
          <ChangePasswordForm service={service} onDone={() => onClose()} />
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
