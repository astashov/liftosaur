import { JSX, useEffect, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { TextInput } from "./primitives/textInput";
import { Text } from "./primitives/text";
import { MathUtils_clamp, MathUtils_normalizeNumStr } from "../utils/math";
import { StringUtils_dashcase } from "../utils/string";

interface IInputNumberProps {
  value?: number;
  label?: string;
  step?: number;
  min?: number;
  max?: number;
  type?: string;
  className?: string;
  size?: "md" | "lg";
  onUpdate: (value: number) => void;
  "data-name"?: string;
  "data-testid"?: string;
  testID?: string;
}

export function InputNumber(props: IInputNumberProps): JSX.Element {
  const { value = 0, label, step = 1, min, max, onUpdate } = props;
  const isLarge = props.size === "lg";
  const buttonCn = `items-center justify-center ${isLarge ? "w-scaled-14 h-scaled-14" : "w-scaled-10 h-scaled-10"} border rounded-lg bg-background-purpledark border-border-neutral`;
  const signCn = isLarge ? "text-3xl font-bold leading-scaled-10" : "text-xl font-bold leading-scaled-8";
  const [text, setText] = useState(String(value));
  const testId = `input-${StringUtils_dashcase(label || "")}`;

  useEffect(() => {
    const parsed = Number(text);
    if (isNaN(parsed) || parsed !== value) {
      setText(String(value));
    }
  }, [value]);

  function getNumericValue(t: string): number {
    const v = Number(t);
    return !isNaN(v) ? MathUtils_clamp(v, min, max) : (min ?? 0);
  }

  return (
    <View className="w-full">
      {label && <Text className={`mb-1 ${isLarge ? "text-sm" : "text-xs"} text-text-secondary`}>{label}</Text>}
      <View className="flex-row items-center gap-2">
        <Pressable
          className={buttonCn}
          data-testid={`${testId}-minus`}
          testID={`${testId}-minus`}
          onPress={() => {
            const v = getNumericValue(text);
            const newValue = MathUtils_clamp(v - step, min, max);
            setText(String(newValue));
            onUpdate(newValue);
          }}
        >
          <Text className={signCn}>-</Text>
        </Pressable>
        <View className="flex-row items-center flex-1">
          <TextInput
            className={`w-full ${isLarge ? "h-scaled-14 text-2xl" : "h-scaled-10 text-base"} px-4 border rounded-lg bg-background-default border-border-prominent text-text-primary`}
            style={Platform.OS === "android" ? { paddingVertical: 0, includeFontPadding: false } : undefined}
            keyboardType="numeric"
            value={text}
            testID={props.testID || `${testId}-field`}
            data-testid={props.testID || `${testId}-field`}
            onChangeText={(t) => {
              const normalized = MathUtils_normalizeNumStr(t);
              setText(normalized);
              if (normalized !== "" && !isNaN(Number(normalized))) {
                onUpdate(getNumericValue(normalized));
              }
            }}
            onBlur={() => {
              const v = getNumericValue(text);
              setText(String(v));
              onUpdate(v);
            }}
            selectTextOnFocus={Platform.OS === "ios"}
          />
        </View>
        <Pressable
          className={buttonCn}
          data-testid={`${testId}-plus`}
          testID={`${testId}-plus`}
          onPress={() => {
            const v = getNumericValue(text);
            const newValue = MathUtils_clamp(v + step, min, max);
            setText(String(newValue));
            onUpdate(newValue);
          }}
        >
          <Text className={signCn}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
