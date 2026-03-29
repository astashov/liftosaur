import React, { useState, useCallback, useRef, useEffect } from "react";
import type { JSX } from "react";
import { TextInput, View, Text, Platform } from "react-native";
import type { IWeight, IExerciseType, ISettings, ISubscription } from "@shared/types";
import {
  Weight_calculatePlates,
  Weight_eq,
  Weight_formatOneSide,
  Weight_build,
  Weight_increment,
  Weight_decrement,
} from "@shared/models/weight";
import { Subscriptions_hasSubscription } from "@shared/utils/subscriptions";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";
import { useNumpadContextOptional } from "./NumpadContext";

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
  const fieldId = useRef(`input-weight-${props.name ?? Math.random().toString(36).slice(2)}`).current;
  const numpad = useNumpadContextOptional();
  const inputRef = useRef<TextInput>(null);
  const onInputRef = useRef(props.onInput);
  const onBlurRef = useRef(props.onBlur);
  onInputRef.current = props.onInput;
  onBlurRef.current = props.onBlur;

  const useNumpad = numpad != null && Platform.OS !== "web";

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

  const handleNumpadChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      const parsed = parseAndClamp(text);
      onInputRef.current?.(parsed);
    },
    [parseAndClamp]
  );

  const handleSubmit = useCallback(() => {
    setIsFocused(false);
    const parsed = parseAndClamp(localValue);
    onBlurRef.current?.(parsed);
  }, [localValue, parseAndClamp]);

  const hasSubscription = props.subscription != null && Subscriptions_hasSubscription(props.subscription);

  const makeRenderAddon = useCallback((): (() => JSX.Element | null) | undefined => {
    if (!hasSubscription || !props.exerciseType) return undefined;
    return () => (
      <PlatesCalculatorAddon
        valueText={localValue}
        unit={unit}
        settings={props.settings}
        exerciseType={props.exerciseType!}
      />
    );
  }, [hasSubscription, localValue, unit, props.settings, props.exerciseType]);

  useEffect(() => {
    if (useNumpad && isFocused) {
      numpad.updateFieldConfig(fieldId, {
        value: localValue,
        onChangeText: handleNumpadChange,
        onSubmit: handleSubmit,
        renderAddon: makeRenderAddon(),
      });
    }
  }, [localValue, handleNumpadChange, handleSubmit, makeRenderAddon]);

  return (
    <View>
      <TextInput
        ref={inputRef}
        data-cy={props["data-cy"]}
        keyboardType="decimal-pad"
        showSoftInputOnFocus={!useNumpad}
        caretHidden={useNumpad}
        value={shownValue}
        placeholder={props.placeholder}
        onFocus={() => {
          setIsFocused(true);
          setLocalValue(displayValue);
          if (useNumpad) {
            numpad.activateField({
              fieldId,
              mode: "decimal",
              value: displayValue,
              step: 5,
              min: props.min,
              max: props.max,
              unit,
              inputRef,
              onIncrement: (current) => {
                const w = Weight_build(current, unit as "kg" | "lb");
                return Weight_increment(w, props.settings, props.exerciseType).value;
              },
              onDecrement: (current) => {
                const w = Weight_build(current, unit as "kg" | "lb");
                return Weight_decrement(w, props.settings, props.exerciseType).value;
              },
              onChangeText: (text) => {
                setLocalValue(text);
                const parsed = parseAndClamp(text);
                onInputRef.current?.(parsed);
              },
              onSubmit: () => {
                inputRef.current?.blur();
              },
              renderAddon: makeRenderAddon(),
              enableRmCalculator: true,
              onOpenRmCalculator: () => {
                // TODO: open RM calculator sheet via navigation
              },
            });
          }
        }}
        onChangeText={
          useNumpad
            ? undefined
            : (text) => {
                setLocalValue(text);
                const parsed = parseAndClamp(text);
                props.onInput?.(parsed);
              }
        }
        onBlur={() => {
          if (useNumpad) {
            numpad.deactivateField(fieldId);
          }
          setIsFocused(false);
          const parsed = parseAndClamp(localValue);
          props.onBlur?.(parsed);
        }}
        className="px-1 py-0.5 text-sm text-center border rounded border-border-neutral bg-background-default"
        style={{ width: 60, minHeight: 28 }}
        selectTextOnFocus={!useNumpad}
      />
      {props.addOn && <View className="mt-1">{props.addOn()}</View>}
    </View>
  );
}

function PlatesCalculatorAddon(props: {
  valueText: string;
  unit: string;
  settings: ISettings;
  exerciseType: IExerciseType;
}): JSX.Element | null {
  const num = parseFloat(props.valueText);
  if (isNaN(num) || num <= 0) return null;

  const weight: IWeight = { value: num, unit: props.unit as "kg" | "lb" };
  const { plates, totalWeight } = Weight_calculatePlates(weight, props.settings, weight.unit, props.exerciseType);
  const sem = Tailwind_semantic();
  const isExact = Weight_eq(totalWeight, weight);

  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-xs text-text-secondary">Plates: </Text>
      <Text
        className="text-xs font-semibold"
        style={{ color: isExact ? sem.text.primary : sem.text.error }}
      >
        {plates.length > 0 ? Weight_formatOneSide(props.settings, plates, props.exerciseType) : "None"}
      </Text>
    </View>
  );
}
