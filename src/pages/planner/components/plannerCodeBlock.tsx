import type { JSX } from "react";
import { Platform, View } from "react-native";
import { FastText } from "../../../components/primitives/fastText";
import { PlannerHighlighter_segments } from "../plannerHighlighter";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { StyledText, StyledText_cls } from "../../../utils/styledText";
import { useRem } from "../../../utils/useRem";

const MONO_FONT_FAMILY = Platform.select({
  web: "Iosevka Web, Iosevka, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  ios: "Iosevka",
  android: "Iosevka-Regular",
  default: "monospace",
});

interface IPlannerCodeBlockProps {
  script: string;
  className?: string;
}

function colorForClass(clazz: string | null): string | undefined {
  if (!clazz) {
    return undefined;
  }
  const syntax = Tailwind_semantic().syntax;
  if (clazz.includes("tok-variableName")) {
    return syntax.variable;
  }
  if (clazz.includes("tok-keyword")) {
    return syntax.keyword;
  }
  if (clazz.includes("tok-literal")) {
    return syntax.literal;
  }
  if (clazz.includes("tok-meta")) {
    return syntax.attributeName;
  }
  if (clazz.includes("tok-comment")) {
    return syntax.comment;
  }
  if (clazz.includes("tok-atom")) {
    return syntax.atom;
  }
  if (clazz.includes("tok-propertyName")) {
    return syntax.comment;
  }
  if (clazz.includes("tok-attributeName")) {
    return syntax.attributeName;
  }
  if (clazz.includes("tok-attributeValue")) {
    return syntax.attributeValue;
  }
  if (clazz.includes("tok-number")) {
    return syntax.literal;
  }
  if (clazz.includes("tok-string")) {
    return syntax.variable;
  }
  return undefined;
}

export function PlannerCodeBlock(props: IPlannerCodeBlockProps): JSX.Element {
  const cls = StyledText_cls(useRem());
  const fontSize = cls(props.className ?? "text-base").fontSize;
  const builder = new StyledText();
  for (const segment of PlannerHighlighter_segments(props.script)) {
    const color = colorForClass(segment.clazz);
    builder.add(segment.text, color != null ? { color } : undefined);
  }
  const { text, fragments } = builder.build();
  // No internal scroller: callers that need horizontal scroll wrap this in a ScrollView
  // (e.g. simpleMarkdown, editProgramV2TextExercises) or rely on web `.code.block` overflow.
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
