import { JSX, useEffect, useRef, useState } from "react";
import { Modal, TextInput, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Pressable } from "./primitives/pressable";
import { Text } from "./primitives/text";
import { IPromptRequest, Prompt_subscribe } from "../utils/prompt.native";

export function PromptHost(): JSX.Element | null {
  const [request, setRequest] = useState<IPromptRequest | null>(null);

  useEffect(() => {
    return Prompt_subscribe(setRequest);
  }, []);

  if (!request) {
    return null;
  }

  return <PromptModal key={request.message} request={request} onDismissed={() => setRequest(null)} />;
}

function PromptModal(props: { request: IPromptRequest; onDismissed: () => void }): JSX.Element {
  const valueRef = useRef<string>("");
  const isClosing = useRef(false);

  const finish = (value?: string): void => {
    if (isClosing.current) {
      return;
    }
    isClosing.current = true;
    props.request.callback(value);
    props.onDismissed();
  };

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={() => finish(undefined)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable
          className="items-center justify-center flex-1 px-8"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => finish(undefined)}
        >
          <Pressable className="w-full p-4 bg-background-default rounded-2xl" onPress={() => undefined}>
            <Text className="text-base text-text-primary">{props.request.message}</Text>
            <TextInput
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              className="px-3 py-2 mt-4 text-base border rounded-lg text-text-primary border-border-neutral"
              style={{ includeFontPadding: false }}
              onChangeText={(text) => (valueRef.current = text)}
              onSubmitEditing={() => finish(valueRef.current)}
            />
            <View className="flex-row justify-end mt-4">
              <Pressable className="px-4 py-2" onPress={() => finish(undefined)}>
                <Text className="text-base text-text-secondary">Cancel</Text>
              </Pressable>
              <Pressable className="px-4 py-2" onPress={() => finish(valueRef.current)}>
                <Text className="text-base font-bold text-text-link">OK</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}
