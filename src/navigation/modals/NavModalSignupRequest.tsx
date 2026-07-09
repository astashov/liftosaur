import type { JSX } from "react";
import { useState } from "react";
import { View, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { Text } from "../../components/primitives/text";
import { Button } from "../../components/button";
import { IState, updateState } from "../../models/state";
import { lb } from "lens-shmens";
import { SendMessage_isIos, SendMessage_isAndroid } from "../../utils/sendMessage";
import { Thunk_log, Thunk_pushScreen } from "../../ducks/thunks";
import { useClearOnModalRemove } from "../useClearOnModalRemove";
import { HostConfig_resolveUrl } from "../../utils/hostConfig";

export function NavModalSignupRequest(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const [imageAspect, setImageAspect] = useState(1);

  const lbSaveSignupRequestDate = [
    lb<IState>().p("showSignupRequest").record(false),
    lb<IState>()
      .p("storage")
      .p("signupRequests")
      .recordModify((r) => [...r, Date.now()]),
  ];

  useClearOnModalRemove(() => updateState(dispatch, lbSaveSignupRequestDate, "Close signup request"));

  const onClose = (): void => {
    dispatch(Thunk_log("ls-signup-request-close"));
    navigation.goBack();
  };

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <FormSheet>
        <View className="items-center">
          <Text className="pb-4 text-xl font-bold text-center">Please Sign Up!</Text>
          <View className="mx-8" style={{ maxWidth: 320, width: "100%" }}>
            <Image
              source={{ uri: HostConfig_resolveUrl("/images/buff-coder-thumbsup.png") }}
              style={{ width: "100%", aspectRatio: imageAspect }}
              resizeMode="contain"
              onLoad={(e) => {
                const source = (e?.nativeEvent as { source?: { width?: number; height?: number } } | undefined)?.source;
                if (source?.width && source?.height) {
                  setImageAspect(source.width / source.height);
                }
              }}
              accessibilityLabel="Buff coder showing thumbs up"
            />
          </View>
          <Text className="mt-4 text-center">
            You finished <Text className="font-bold text-text-error">{state.storage.history.length} workouts</Text>{" "}
            already! This is awesome! Consider <Text className="font-bold">signing up</Text> so your workout history
            would be backed up in the cloud.
          </Text>
          {SendMessage_isIos() && (
            <Text className="mt-4 text-center">
              It's a one-click process via <Text className="font-bold">Sign-in with Apple</Text>.
            </Text>
          )}
          {SendMessage_isAndroid() && (
            <Text className="mt-4 text-center">
              It's a quick process via <Text className="font-bold">Sign-in with Google</Text>.
            </Text>
          )}
          <View className="flex-row items-center justify-center mt-4">
            <Button
              name="modal-signup-request-later"
              type="button"
              kind="grayv2"
              data-testid="modal-signup-request-later"
              testID="modal-signup-request-later"
              className="mr-3 ls-signup-request-maybe-later"
              onClick={() => {
                navigation.goBack();
              }}
            >
              Maybe later
            </Button>
            <Button
              name="modal-signup-request-submit"
              kind="purple"
              data-testid="modal-signup-request-submit"
              testID="modal-signup-request-submit"
              className="ls-signup-request-signup"
              onClick={() => {
                dispatch(Thunk_pushScreen("account"));
                navigation.goBack();
              }}
            >
              Sign up
            </Button>
          </View>
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}
