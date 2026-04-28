import { JSX, useEffect, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { MathUtils_clamp } from "../utils/math";
import { StringUtils_dashcase } from "../utils/string";

interface IInputNumberProps {
  value?: number;
  label?: string;
  step?: number;
  min?: number;
  max?: number;
  type?: string;
  className?: string;
  onUpdate: (value: number) => void;
  "data-cy"?: string;
  "data-name"?: string;
}

export function InputNumber(props: IInputNumberProps): JSX.Element {
  const { value = 0, label, step = 1, min, max, onUpdate } = props;
  const [text, setText] = useState(String(value));
  const testId = `input-${StringUtils_dashcase(label || "")}`;

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function getNumericValue(t: string): number {
    const v = Number(t);
    return !isNaN(v) ? MathUtils_clamp(v, min, max) : (min ?? 0);
  }

  return (
    <View className="w-full">
      {label && <Text className="mb-1 text-xs text-text-secondary">{label}</Text>}
      <View className="flex-row items-center gap-2">
        <Pressable
          className="items-center justify-center w-10 h-10 border rounded-lg bg-background-purpledark border-border-neutral"
          data-cy={`${testId}-minus`} data-testid={`${testId}-minus`}
          testID={`${testId}-minus`}
          onPress={() => {
            const v = getNumericValue(text);
            const newValue = MathUtils_clamp(v - step, min, max);
            setText(String(newValue));
            onUpdate(newValue);
          }}
        >
          <Text className="text-xl font-bold leading-8">-</Text>
        </Pressable>
        <View className="flex-row items-center flex-1">
          <TextInput
            className="w-full h-10 px-4 text-base leading-5 border rounded-lg bg-background-default border-border-prominent"
            keyboardType="numeric"
            value={text}
            testID={props["data-cy"] || `${testId}-field`}
            data-cy={props["data-cy"] || `${testId}-field`} data-testid={props["data-cy"] || `${testId}-field`}
            onChangeText={setText}
            onBlur={() => {
              const v = getNumericValue(text);
              setText(String(v));
              onUpdate(v);
            }}
            selectTextOnFocus
          />
        </View>
        <Pressable
          className="items-center justify-center w-10 h-10 border rounded-lg bg-background-purpledark border-border-neutral"
          data-cy={`${testId}-plus`} data-testid={`${testId}-plus`}
          testID={`${testId}-plus`}
          onPress={() => {
            const v = getNumericValue(text);
            const newValue = MathUtils_clamp(v + step, min, max);
            setText(String(newValue));
            onUpdate(newValue);
          }}
        >
          <Text className="text-xl font-bold leading-8">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
