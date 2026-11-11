import type { JSX } from "react";
import { Platform, View } from "react-native";
import { FastText } from "./primitives/fastText";
import { LiftoEditorParseCache } from "./primitives/liftoEditorBrain";
import { LiftographDocument_parse } from "../liftograph/liftographDocument";
import { LiftographHighlight_segments } from "../liftograph/liftographHighlight";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { StyledText, StyledText_cls } from "../utils/styledText";
import { useRem } from "../utils/useRem";

const MONO_FONT_FAMILY = Platform.select({
  web: "Iosevka Web, Iosevka, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  ios: "Iosevka",
  android: "Iosevka-Regular",
  default: "monospace",
});

export function LiftographCodeBlock(props: { text: string; className?: string }): JSX.Element {
  const fontSize = StyledText_cls(useRem())(props.className ?? "text-base").fontSize;
  const cache = new LiftoEditorParseCache();
  const builder = new StyledText();
  for (const segment of LiftographHighlight_segments(LiftographDocument_parse(props.text), (script) =>
    cache.parseLiftoscript(script)
  )) {
    const style = segment.style;
    builder.add(
      segment.text,
      style != null
        ? {
            color: style.color,
            fontWeight: style.bold ? "600" : undefined,
            fontStyle: style.italic ? "italic" : undefined,
          }
        : undefined
    );
  }
  const { text, fragments } = builder.build();
  return (
    <View className="block code">
      <FastText
        text={text}
        fragments={fragments}
        fontFamily={MONO_FONT_FAMILY}
        fontSize={fontSize}
        color={Tailwind_semantic().text.primary}
        noWrap={true}
      />
    </View>
  );
}
