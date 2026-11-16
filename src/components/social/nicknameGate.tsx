import { JSX, useState } from "react";
import { View } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { TextInput } from "../primitives/textInput";
import { Button } from "../button";
import { IDispatch } from "../../ducks/types";
import { ISettings } from "../../types";
import { Follow_maxNicknameLength, Follow_parseNickname } from "../../models/follow";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  reason: string;
  dispatch: IDispatch;
}

export function NicknameGate(props: IProps): JSX.Element {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const save = (): void => {
    const parsed = Follow_parseNickname(text);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(undefined);
    props.dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>().p("nickname").record(parsed.nickname),
      desc: "Set nickname for friends",
    });
  };

  return (
    <View className="w-full">
      <Text className="mb-1 text-base font-semibold">Pick a nickname your friends will see</Text>
      <Text className="mb-3 text-sm text-text-secondary">{props.reason}</Text>
      <TextInput
        className="w-full px-3 py-2 border rounded-lg border-border-neutral bg-background-default text-text-primary"
        placeholder="Nickname"
        placeholderTextColor={Tailwind_semantic().text.secondarysubtle}
        value={text}
        maxLength={Follow_maxNicknameLength}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onChangeText={setText}
        onSubmitEditing={save}
        data-testid="nickname-gate-input"
        testID="nickname-gate-input"
      />
      {error != null && <Text className="mt-1 text-sm text-text-error">{error}</Text>}
      <Button
        kind="purple"
        name="nickname-gate-save"
        data-testid="nickname-gate-save"
        testID="nickname-gate-save"
        className="w-full mt-4"
        onClick={save}
      >
        Continue
      </Button>
    </View>
  );
}
