import { TextInput as RNTextInput, TextInputProps } from "react-native";
import { forwardRef, JSX, Ref } from "react";
import { Text_hasSizeClass, Text_resolveFontFamily } from "./text";

export type ITextInput = RNTextInput;

// See the note in ./text.tsx - the OS font scale is folded into the rem instead, so letting
// RN scale fontSize here too would apply it twice and only to the text.
// Without a size class RN falls back to its own fixed default, which is the one font size in the
// app that ignores the text size setting entirely - so default it the same way Text does. The
// family comes from the same resolver too, so inputs don't render in the system font next to
// Poppins labels (and Android gets a real face name rather than the family alias).
export const TextInput = forwardRef(function TextInputInner(
  props: TextInputProps & { className?: string; "data-testid"?: string },
  ref: Ref<RNTextInput>
): JSX.Element {
  const className = Text_hasSizeClass(props.className) ? props.className : `text-base ${props.className ?? ""}`.trim();
  const fontFamily = Text_resolveFontFamily(className);
  return (
    <RNTextInput
      ref={ref}
      allowFontScaling={false}
      {...props}
      className={className}
      style={[{ fontFamily }, props.style]}
    />
  );
});
