import { Text as RNText, TextProps, StyleSheet } from "react-native";
import { JSX } from "react";

const defaultStyle = StyleSheet.create({
  text: { fontFamily: "Poppins" },
});

export function Text({ style, className, ...props }: TextProps & { className?: string }): JSX.Element {
  return <RNText className={className} style={[defaultStyle.text, style]} {...props} />;
}
