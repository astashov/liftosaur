import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { FadeScrollView } from "./fadeScrollView";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { ILiftographCompletion, ILiftographCompletionOption } from "../liftograph/liftographCompletions";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { useRem } from "../utils/useRem";
import { useSystemKeyboardHeight } from "../utils/useSystemKeyboardHeight";

export function LiftographPillBar(props: {
  completion: ILiftographCompletion | undefined;
  onPress: (option: ILiftographCompletionOption) => void;
  onHideKeyboard: () => void;
}): JSX.Element | null {
  const iconScale = useRem() / 16;
  const hasKeyboard = useSystemKeyboardHeight() > 0;
  if (!hasKeyboard) {
    return null;
  }
  const hue = Tailwind_semantic().editorpill;
  return (
    <View
      className="flex-row items-center overflow-hidden border h-scaled-12 bg-background-default border-border-neutral"
      style={{ borderRadius: 12, marginBottom: 4 }}
    >
      <FadeScrollView className="flex-1" contentClassName="gap-2 px-2 py-2 items-center">
        {(props.completion?.options ?? []).map((option) => (
          <Pressable
            key={`${option.label}:${option.insert ?? ""}`}
            testID={`liftograph-pill-${option.label}`}
            className="px-3 py-1.5"
            style={{ borderRadius: 8, backgroundColor: hue.logicbg, borderWidth: 1, borderColor: hue.logicbd }}
            onPress={() => props.onPress(option)}
          >
            <Text className="text-xs font-bold" numberOfLines={1} style={{ color: hue.logicfg }}>
              {option.display ?? option.label}
            </Text>
          </Pressable>
        ))}
      </FadeScrollView>
      <View className="flex-row items-center self-stretch border-l border-border-neutral">
        <Pressable
          testID="liftograph-hide-keyboard"
          className="items-center self-stretch justify-center w-scaled-10"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 4 }}
          onPress={props.onHideKeyboard}
        >
          <IconArrowDown2 width={13 * iconScale} height={8 * iconScale} />
        </Pressable>
      </View>
    </View>
  );
}
