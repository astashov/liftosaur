import { Text as RNText, TextProps, Platform } from "react-native";
import { JSX } from "react";

const textColorPattern =
  /\btext-(text|red|green|blue|yellow|purple|gray|slate|zinc|stone|neutral|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|pink|rose|white|black|transparent|inherit|current)\b/;
const textSizePattern = /\btext-(xs|sm|base|lg|xl|\dxl|\[)/;

function resolveFontFamily(className: string | undefined): string {
  if (Platform.OS !== "android") {
    return "Poppins";
  }
  const isBold = className != null && /\bfont-bold\b/.test(className);
  const isSemiBold = className != null && /\bfont-semibold\b/.test(className);
  const isItalic = className != null && /\bitalic\b/.test(className);
  if (isBold && isItalic) return "Poppins-BoldItalic";
  if (isBold) return "Poppins-Bold";
  if (isSemiBold && isItalic) return "Poppins-SemiBoldItalic";
  if (isSemiBold) return "Poppins-SemiBold";
  if (isItalic) return "Poppins-Italic";
  return "Poppins-Regular";
}

export function Text({ style, className, ...props }: TextProps & { className?: string }): JSX.Element {
  const defaults: string[] = [];
  if (className == null || !textColorPattern.test(className)) {
    defaults.push("text-text-primary");
  }
  if (className == null || !textSizePattern.test(className)) {
    defaults.push("text-base");
  }
  const effectiveClassName =
    defaults.length > 0 ? (className ? `${defaults.join(" ")} ${className}` : defaults.join(" ")) : className;
  const fontFamily = resolveFontFamily(effectiveClassName);
  return <RNText className={effectiveClassName} style={[{ fontFamily }, style]} {...props} />;
}
