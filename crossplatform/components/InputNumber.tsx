import React, { useState, useCallback, useRef, useEffect } from "react";
import type { JSX, ReactElement } from "react";
import { TextInput, View, Platform } from "react-native";
import { useNumpadContextOptional } from "./NumpadContext";

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
  renderAddon?: () => ReactElement | null;
}

export function InputNumber(props: IProps): JSX.Element {
  const displayValue = props.value != null ? String(props.value) : "";
  const [localValue, setLocalValue] = useState(displayValue);
  const [isFocused, setIsFocused] = useState(false);
  const fieldId = useRef(`input-number-${props.name ?? Math.random().toString(36).slice(2)}`).current;
  const numpad = useNumpadContextOptional();
  const inputRef = useRef<TextInput>(null);
  const onInputRef = useRef(props.onInput);
  const onBlurRef = useRef(props.onBlur);
  onInputRef.current = props.onInput;
  onBlurRef.current = props.onBlur;

  const useNumpad = numpad != null && Platform.OS !== "web";

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

  // Keep numpad field config in sync when value changes externally
  useEffect(() => {
    if (useNumpad && isFocused) {
      numpad.updateFieldConfig(fieldId, {
        value: localValue,
        onChangeText: handleNumpadChange,
        onSubmit: handleSubmit,
        renderAddon: props.renderAddon,
      });
    }
  }, [localValue, handleNumpadChange, handleSubmit, props.renderAddon]);

  return (
    <View>
      <TextInput
        ref={inputRef}
        data-cy={props["data-cy"]}
        keyboardType="number-pad"
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
              mode: "integer",
              value: displayValue,
              step: props.step ?? 1,
              min: props.min,
              max: props.max,
              inputRef,
              onChangeText: (text) => {
                setLocalValue(text);
                const parsed = parseAndClamp(text);
                onInputRef.current?.(parsed);
              },
              onSubmit: () => {
                inputRef.current?.blur();
              },
              renderAddon: props.renderAddon,
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
        style={{ width: (props.width ?? 3.5) * 16, minHeight: 28 }}
        selectTextOnFocus={!useNumpad}
      />
    </View>
  );
}
