import { Text as RNText, TextProps, StyleSheet } from "react-native";
import { JSX } from "react";

const defaultStyle = StyleSheet.create({
  text: { fontFamily: "Poppins" },
});

const textColorPattern =
  /\btext-(text|red|green|blue|yellow|purple|gray|slate|zinc|stone|neutral|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|pink|rose|white|black|transparent|inherit|current)\b/;
const textSizePattern = /\btext-(xs|sm|base|lg|xl|\dxl|\[)/;

export function Text({ style, className, ...props }: TextProps & { className?: string }): JSX.Element {
  const defaults: string[] = [];
  if (className == null || !textColorPattern.test(className)) defaults.push("text-text-primary");
  if (className == null || !textSizePattern.test(className)) defaults.push("text-base");
  const effectiveClassName = defaults.length > 0 ? (className ? `${defaults.join(" ")} ${className}` : defaults.join(" ")) : className;
  return <RNText className={effectiveClassName} style={[defaultStyle.text, style]} {...props} />;
}
