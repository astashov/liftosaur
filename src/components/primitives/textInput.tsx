import { TextInput as RNTextInput, TextInputProps } from "react-native";
import { forwardRef, JSX, Ref } from "react";

export type ITextInput = RNTextInput;

// See the note in ./text.tsx - the OS font scale is folded into the rem instead, so letting
// RN scale fontSize here too would apply it twice and only to the text.
export const TextInput = forwardRef(function TextInputInner(
  props: TextInputProps & { className?: string; "data-testid"?: string },
  ref: Ref<RNTextInput>
): JSX.Element {
  return <RNTextInput ref={ref} allowFontScaling={false} {...props} />;
});
