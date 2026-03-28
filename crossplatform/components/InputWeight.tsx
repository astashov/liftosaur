import { useState, useCallback } from "react";
import type { JSX } from "react";
import { TextInput, View, Text } from "react-native";
import type { IWeight, IExerciseType, ISettings, ISubscription } from "@shared/types";

interface IProps {
  value?: IWeight;
  initialValue?: IWeight;
  placeholder?: string;
  onInput?: (value: IWeight | undefined) => void;
  onBlur?: (value: IWeight | undefined) => void;
  min?: number;
  max?: number;
  exerciseType?: IExerciseType;
  subscription?: ISubscription;
  settings: ISettings;
  name?: string;
  "data-cy"?: string;
  tabIndex?: number;
  addOn?: () => JSX.Element;
}

export function InputWeight(props: IProps): JSX.Element {
  const unit = props.value?.unit ?? props.initialValue?.unit ?? props.settings.units;
  const displayValue = props.value?.value != null ? String(props.value.value) : "";
  const [localValue, setLocalValue] = useState(displayValue);
  const [isFocused, setIsFocused] = useState(false);

  const shownValue = isFocused ? localValue : displayValue;

  const parseAndClamp = useCallback(
    (text: string): IWeight | undefined => {
      if (text === "" || text === "-" || text === ".") {
        return undefined;
      }
      let num = parseFloat(text);
      if (isNaN(num)) {
        return undefined;
      }
      if (props.min != null && num < props.min) {
        num = props.min;
      }
      if (props.max != null && num > props.max) {
        num = props.max;
      }
      return { value: num, unit };
    },
    [props.min, props.max, unit]
  );

  return (
    <View>
      <TextInput
        data-cy={props["data-cy"]}
        keyboardType="decimal-pad"
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
        style={{ width: 60, minHeight: 28 }}
        selectTextOnFocus={true}
      />
      {props.addOn && <View className="mt-1">{props.addOn()}</View>}
    </View>
  );
}
