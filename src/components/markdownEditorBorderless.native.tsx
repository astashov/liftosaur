import { JSX, useMemo, useCallback, useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Text } from "./primitives/text";
import { debounce } from "../utils/throttler";

interface IProps {
  value?: string;
  placeholder: string;
  isTransparent?: boolean;
  onChange?: (newValue: string) => void;
  debounceMs?: number;
}

interface ISpan {
  text: string;
  style?: "syntax" | "bold" | "italic" | "strikethrough" | "link" | "code" | "heading";
}

function parseMarkdown(text: string): ISpan[] {
  const spans: ISpan[] = [];
  const lines = text.split("\n");

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (li > 0) {
      spans.push({ text: "\n" });
    }

    // # Headings
    const hashMatch = line.match(/^(#{1,6} )/);
    if (hashMatch) {
      spans.push({ text: hashMatch[1], style: "syntax" });
      spans.push({ text: line.slice(hashMatch[1].length), style: "heading" });
      continue;
    }

    // > Blockquotes
    if (line.startsWith("> ")) {
      spans.push({ text: "> ", style: "syntax" });
      spans.push({ text: line.slice(2) });
      continue;
    }

    let pos = 0;
    while (pos < line.length) {
      // Inline code `text`
      if (line[pos] === "`") {
        const end = line.indexOf("`", pos + 1);
        if (end !== -1) {
          spans.push({ text: "`", style: "syntax" });
          spans.push({ text: line.slice(pos + 1, end), style: "code" });
          spans.push({ text: "`", style: "syntax" });
          pos = end + 1;
          continue;
        }
      }

      // Images ![alt](url)
      if (line[pos] === "!" && line[pos + 1] === "[") {
        const altEnd = line.indexOf("]", pos + 2);
        if (altEnd !== -1 && line[altEnd + 1] === "(") {
          const urlEnd = line.indexOf(")", altEnd + 2);
          if (urlEnd !== -1) {
            spans.push({ text: "![", style: "syntax" });
            spans.push({ text: line.slice(pos + 2, altEnd) });
            spans.push({ text: "](", style: "syntax" });
            spans.push({ text: line.slice(altEnd + 2, urlEnd), style: "link" });
            spans.push({ text: ")", style: "syntax" });
            pos = urlEnd + 1;
            continue;
          }
        }
      }

      // Links [text](url)
      if (line[pos] === "[") {
        const labelEnd = line.indexOf("]", pos + 1);
        if (labelEnd !== -1 && line[labelEnd + 1] === "(") {
          const urlEnd = line.indexOf(")", labelEnd + 2);
          if (urlEnd !== -1) {
            spans.push({ text: "[", style: "syntax" });
            spans.push({ text: line.slice(pos + 1, labelEnd) });
            spans.push({ text: "](", style: "syntax" });
            spans.push({ text: line.slice(labelEnd + 2, urlEnd), style: "link" });
            spans.push({ text: ")", style: "syntax" });
            pos = urlEnd + 1;
            continue;
          }
        }
      }

      // Strikethrough ~~text~~
      if (line[pos] === "~" && line[pos + 1] === "~") {
        const end = line.indexOf("~~", pos + 2);
        if (end !== -1) {
          spans.push({ text: "~~", style: "syntax" });
          spans.push({ text: line.slice(pos + 2, end), style: "strikethrough" });
          spans.push({ text: "~~", style: "syntax" });
          pos = end + 2;
          continue;
        }
      }

      // Bold **text**
      if (line[pos] === "*" && line[pos + 1] === "*") {
        const end = line.indexOf("**", pos + 2);
        if (end !== -1) {
          spans.push({ text: "**", style: "syntax" });
          spans.push({ text: line.slice(pos + 2, end), style: "bold" });
          spans.push({ text: "**", style: "syntax" });
          pos = end + 2;
          continue;
        }
      }

      // Italic *text*
      if (line[pos] === "*" && line[pos + 1] !== "*") {
        const end = line.indexOf("*", pos + 1);
        if (end !== -1 && line[end + 1] !== "*") {
          spans.push({ text: "*", style: "syntax" });
          spans.push({ text: line.slice(pos + 1, end), style: "italic" });
          spans.push({ text: "*", style: "syntax" });
          pos = end + 1;
          continue;
        }
      }

      // Plain text — collect until next special char
      let nextSpecial = line.length;
      for (let j = pos + 1; j < line.length; j++) {
        if (line[j] === "*" || line[j] === "`" || line[j] === "~" || line[j] === "[" || line[j] === "!") {
          nextSpecial = j;
          break;
        }
      }
      spans.push({ text: line.slice(pos, nextSpecial) });
      pos = nextSpecial;
    }
  }

  return spans;
}

const spanStyles = StyleSheet.create({
  syntax: { color: "#404740" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  strikethrough: { textDecorationLine: "line-through" },
  link: { color: "#219", textDecorationLine: "underline" },
  code: { color: "#a11" },
  heading: { fontWeight: "bold" },
});

const styles = StyleSheet.create({
  container: { position: "relative" },
  baseText: { fontFamily: "Poppins", fontSize: 14, color: "#000", padding: 8 },
  input: {
    fontFamily: "Poppins",
    fontSize: 14,
    color: "transparent",
    padding: 8,
    minHeight: 60,
    textAlignVertical: "top" as const,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  highlight: { minHeight: 60 },
});

function HighlightedText(props: { text: string }): JSX.Element {
  const spans = useMemo(() => parseMarkdown(props.text), [props.text]);
  return (
    <Text style={styles.baseText}>
      {spans.map((span, i) => {
        if (!span.style) {
          return (
            <Text key={i} style={styles.baseText}>
              {span.text}
            </Text>
          );
        }
        return (
          <Text key={i} style={[styles.baseText, spanStyles[span.style]]}>
            {span.text}
          </Text>
        );
      })}
    </Text>
  );
}

export function MarkdownEditorBorderless(props: IProps): JSX.Element {
  const [text, setText] = useState(props.value ?? "");

  const debouncedOnChange = useMemo(() => {
    if (props.onChange && props.debounceMs) {
      return debounce(props.onChange, props.debounceMs);
    }
    return props.onChange;
  }, [props.onChange, props.debounceMs]);

  const handleChangeText = useCallback(
    (newText: string) => {
      setText(newText);
      debouncedOnChange?.(newText);
    },
    [debouncedOnChange]
  );

  return (
    <View className="px-1" style={styles.container}>
      <View style={styles.highlight}>
        {text ? (
          <HighlightedText text={text} />
        ) : (
          <Text style={[styles.baseText, { color: "#9ca3af" }]}>{props.placeholder}</Text>
        )}
      </View>
      <TextInput value={text} onChangeText={handleChangeText} multiline style={styles.input} />
    </View>
  );
}
