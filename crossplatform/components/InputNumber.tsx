import React, { useState, useCallback } from "react";
import { TextInput, View } from "react-native";

interface IProps {
  value?: number;
  initialValue?: number;
  placeholder?: string;
  onInput?: (value: number | undefined) => void;
  onBlur?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
  name?: string;
  "data-cy"?: string;
  tabIndex?: number;
}

export function InputNumber(props: IProps): React.ReactElement {
  const displayValue = props.value != null ? String(props.value) : "";
  const [localValue, setLocalValue] = useState(displayValue);
  const [isFocused, setIsFocused] = useState(false);

  const shownValue = isFocused ? localValue : displayValue;

  const parseAndClamp = useCallback(
    (text: string): number | undefined => {
      if (text === "" || text === "-") {
        return undefined;
      }
      let num = parseInt(text, 10);
      if (isNaN(num)) {
        return undefined;
      }
      if (props.min != null && num < props.min) {
        num = props.min;
      }
      if (props.max != null && num > props.max) {
        num = props.max;
      }
      return num;
    },
    [props.min, props.max]
  );

  return (
    <View>
      <TextInput
        data-cy={props["data-cy"]}
        keyboardType="number-pad"
        value={shownValue}
        placeholder={props.placeholder}
        onFocus={() => {
          setIsFocused(true);
          setLocalValue(displayValue);
        }}
        onChangeText={(text) => {
          setLocalValue(text);
          const parsed = parseAndClamp(text);
          props.onInput?.(parsed);
        }}
        onBlur={() => {
          setIsFocused(false);
          const parsed = parseAndClamp(localValue);
          props.onBlur?.(parsed);
        }}
        className="px-1 py-0.5 text-sm text-center border rounded border-border-neutral bg-background-default"
        style={{ width: (props.width ?? 3.5) * 16, minHeight: 28 }}
        selectTextOnFocus={true}
      />
    </View>
  );
}
