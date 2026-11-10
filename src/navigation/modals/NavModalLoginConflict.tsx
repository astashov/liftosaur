import { JSX, useEffect, useRef } from "react";
import { Image, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { Button } from "../../components/button";
import { LinkButton } from "../../components/linkButton";
import { Text } from "../../components/primitives/text";
import { ILoginConflictChoice, LoginConflict_description } from "../../models/loginConflict";
import { ImagePreloader_uri } from "../../utils/imagePreloader";
import { Thunk_chooseLoginConflict } from "../../ducks/thunks";

const options: {
  choice: ILoginConflictChoice;
  label: string;
  kind: "purple" | "grayv2" | "red";
  description: string;
}[] = [
  {
    choice: "switch",
    label: "Switch",
    kind: "purple",
    description: "Open the account. This device's data stays under Other local accounts.",
  },
  { choice: "merge", label: "Merge", kind: "grayv2", description: "Add this device's items to the account." },
  {
    choice: "overwrite",
    label: "Overwrite",
    kind: "red",
    description: "Delete the account's data and replace it with this device's data.",
  },
];

export function NavModalLoginConflict(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const request = state.loginConflictRequest;
  const isClosingRef = useRef(false);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (!isClosingRef.current) {
        e.preventDefault();
      }
    });
  }, [navigation]);

  const shouldGoBack = request == null;
  useEffect(() => {
    if (shouldGoBack) {
      isClosingRef.current = true;
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (request == null) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={() => undefined} shouldShowClose={false} maxWidth="400px">
      <FormSheet>
        <View testID="login-conflict-modal">
          <Image
            source={{ uri: ImagePreloader_uri("/images/dino-warning.png") }}
            style={{ width: 96, height: 125, alignSelf: "center" }}
            resizeMode="contain"
            accessibilityLabel="Liftosaur mascot holding a warning sign"
          />
          <Text className="mt-3 text-lg font-bold text-center">This account already has data</Text>
          <Text className="mt-2 text-sm text-center text-text-secondary">
            {LoginConflict_description(request.summary, request.email)}
          </Text>
          {options.map((option) => (
            <View key={option.choice} className="mt-4">
              <Button
                name={`login-conflict-${option.choice}`}
                kind={option.kind}
                buttonSize="lg"
                className="w-full text-base"
                onClick={() => dispatch(Thunk_chooseLoginConflict(option.choice))}
              >
                {option.label}
              </Button>
              <Text className="mt-1 text-xs text-center text-text-secondary">{option.description}</Text>
            </View>
          ))}
          {request.canCancel && (
            <View className="items-center mt-4">
              <LinkButton name="login-conflict-cancel" onClick={() => dispatch(Thunk_chooseLoginConflict("cancel"))}>
                Cancel sign-in
              </LinkButton>
            </View>
          )}
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
