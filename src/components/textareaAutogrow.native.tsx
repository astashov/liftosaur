import { JSX, useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { TextInput, ITextInput } from "./primitives/textInput";
import { debounce } from "../utils/throttler";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  value?: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  debounceMs?: number;
  onChangeText?: (text: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function TextareaAutogrow(props: IProps): JSX.Element {
  const inputRef = useRef<ITextInput>(null);
  const currentValueRef = useRef<string>(String(props.value ?? ""));

  const debouncedOnChangeText = useMemo(() => {
    if (props.onChangeText && props.debounceMs) {
      return debounce(props.onChangeText, props.debounceMs);
    }
    return props.onChangeText;
  }, [props.onChangeText, props.debounceMs]);

  useEffect(() => {
    if (props.value === undefined) {
      return;
    }
    const newStr = String(props.value);
    if (currentValueRef.current !== newStr) {
      currentValueRef.current = newStr;
      inputRef.current?.setNativeProps({ text: newStr });
    }
  }, [props.value]);

  const semantic = Tailwind_semantic();

  return (
    <TextInput
      ref={inputRef}
      defaultValue={currentValueRef.current}
      placeholder={props.placeholder}
      placeholderTextColor={semantic.text.secondarysubtle}
      maxLength={props.maxLength}
      multiline={true}
      textAlignVertical="top"
      className={`text-text-primary text-sm min-h-6 ${props.className ?? ""}`}
      testID={props.testID ?? props.id}
      style={styles.input}
      onChangeText={(text) => {
        currentValueRef.current = text;
        debouncedOnChangeText?.(text);
      }}
    />
  );
}

// Size lives in the className so it tracks the rem - a fontSize here would win over it.
const styles = StyleSheet.create({
  input: {
    fontFamily: "Poppins",
    padding: 0,
  },
});
