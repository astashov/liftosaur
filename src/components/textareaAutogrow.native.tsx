import { JSX, useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { TextInput, ITextInput } from "./primitives/textInput";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import {
  DebouncedTextCommit_initial,
  DebouncedTextCommit_next,
  IDebouncedTextCommitEvent,
  IDebouncedTextCommitState,
} from "../utils/debouncedTextCommit";

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
  const stateRef = useRef<IDebouncedTextCommitState>(DebouncedTextCommit_initial(String(props.value ?? "")));
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onChangeTextRef = useRef(props.onChangeText);
  onChangeTextRef.current = props.onChangeText;
  const debounceMs = props.debounceMs ?? 0;

  const apply = (event: IDebouncedTextCommitEvent): void => {
    const result = DebouncedTextCommit_next(stateRef.current, event);
    stateRef.current = result.state;
    for (const effect of result.effects) {
      if (effect.type === "schedule") {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => apply({ type: "timer" }), debounceMs);
      } else if (effect.type === "cancel") {
        clearTimeout(timerRef.current);
      } else if (effect.type === "commit") {
        onChangeTextRef.current?.(effect.text);
      } else if (effect.type === "setText") {
        inputRef.current?.setNativeProps({ text: effect.text });
      }
    }
  };
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (props.value !== undefined) {
      applyRef.current({ type: "value", text: String(props.value) });
    }
  }, [props.value]);

  useEffect(() => {
    return () => applyRef.current({ type: "unmount" });
  }, []);

  const semantic = Tailwind_semantic();

  return (
    <TextInput
      ref={inputRef}
      defaultValue={stateRef.current.inputText}
      placeholder={props.placeholder}
      placeholderTextColor={semantic.text.secondarysubtle}
      maxLength={props.maxLength}
      multiline={true}
      textAlignVertical="top"
      className={`text-text-primary text-sm min-h-scaled-6 ${props.className ?? ""}`}
      testID={props.testID ?? props.id}
      style={styles.input}
      onFocus={() => apply({ type: "focus" })}
      onBlur={() => apply({ type: "blur" })}
      onChangeText={(text) => apply({ type: "typed", text })}
    />
  );
}

// Size lives in the className so it tracks the rem - a fontSize here would win over it.
const styles = StyleSheet.create({
  input: {
    padding: 0,
  },
});
