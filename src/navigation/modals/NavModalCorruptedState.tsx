import { JSX, useEffect } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { Link } from "../../components/link";
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
      <Text className="pt-2 pb-4 text-lg font-bold text-center">🚨 Corrupted Storage 🚨</Text>
      <Text className="pb-4">
        Something went <Text className="font-bold">terribly wrong</Text>, and your{" "}
        {corruptedstorage.local ? "local" : "remote"} storage and history got corrupted. This should never happen, but
        it did.
      </Text>
      {corruptedstorage.backup ? (
        <Text className="pb-4 font-bold text-center text-text-success">
          History was successfully backed up, user: <Text className="font-bold">{corruptedstorage.userid}</Text>
        </Text>
      ) : (
        <Text className="pb-4 font-bold text-center text-text-error">Could not back up the history</Text>
      )}
      <Text className="pb-4">
        Please contact the developer of this app, and he is going to look into this ASAP. You can contact us at{" "}
        <Link href="mailto:info@liftosaur.com">info@liftosaur.com</Link>.
      </Text>
      {corruptedstorage.local ? (
        <Text className="pb-4">
          You can either wait until this is fixed (and close the app for now), or start with the empty state (but your
          history and programs will be gone).
        </Text>
      ) : (
        <Text className="pb-4">
          We will log out for now, and won't sync the changes to the cloud, to avoid even bigger mess.
        </Text>
      )}
      <View className="items-center">
        <Button name="corrupted-state-reset" kind="red" onClick={onReset}>
          {corruptedstorage.local ? "Reset and start from scratch" : "Continue"}
        </Button>
      </View>
    </ModalScreenContainer>
  );
}
