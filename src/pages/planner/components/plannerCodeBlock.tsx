import type { JSX } from "react";
import { View } from "react-native";
import { Text } from "../../../components/primitives/text";
import { PlannerHighlighter_segments } from "../plannerHighlighter";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";

interface IPlannerCodeBlockProps {
  script: string;
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
  const segments = PlannerHighlighter_segments(props.script);
  return (
    <View className="block">
      <Text style={{ fontFamily: "Courier" }} className="whitespace-pre">
        {segments.map((segment, i) => {
          const color = colorForClass(segment.clazz);
          return (
            <Text key={i} style={color ? { color } : undefined}>
              {segment.text}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}
