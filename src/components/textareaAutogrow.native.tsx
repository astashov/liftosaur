import { JSX, useEffect, useMemo, useRef } from "react";
import { TextInput, StyleSheet } from "react-native";
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
  const inputRef = useRef<TextInput>(null);
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
      placeholderTextColor={semantic.text.secondary}
      maxLength={props.maxLength}
      multiline={true}
      textAlignVertical="top"
      className={props.className}
      testID={props.testID ?? props.id}
      style={styles.input}
      onChangeText={(text) => {
        currentValueRef.current = text;
        debouncedOnChangeText?.(text);
      }}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: "Poppins",
    fontSize: 14,
    minHeight: 24,
    padding: 0,
  },
});
