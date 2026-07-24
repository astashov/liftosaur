import { JSX, useMemo, useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import MarkdownTextInput from "@expensify/react-native-live-markdown/src/MarkdownTextInput";
import type { MarkdownStyle } from "@expensify/react-native-live-markdown/src/MarkdownTextInput";
import type { MarkdownRange } from "@expensify/react-native-live-markdown/src/commonTypes";
import { debounce } from "../utils/throttler";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  value?: string;
  placeholder: string;
  isTransparent?: boolean;
  onChange?: (newValue: string) => void;
  debounceMs?: number;
}

function parseMarkdownWorklet(input: string): MarkdownRange[] {
  "worklet";
  const ranges: MarkdownRange[] = [];
  const lines = input.split("\n");
  let lineStart = 0;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineLen = line.length;

    const hashMatch = line.match(/^(#{1,6} )/);
    if (hashMatch) {
      const syntaxLen = hashMatch[1].length;
      ranges.push({ type: "syntax", start: lineStart, length: syntaxLen });
      if (lineLen > syntaxLen) {
        ranges.push({ type: "h1", start: lineStart, length: lineLen });
      }
      lineStart += lineLen + 1;
      continue;
    }

    if (line.startsWith("> ")) {
      ranges.push({ type: "blockquote", start: lineStart, length: lineLen });
      ranges.push({ type: "syntax", start: lineStart, length: 2 });
      lineStart += lineLen + 1;
      continue;
    }

    let pos = 0;
    while (pos < lineLen) {
      const ch = line[pos];

      if (ch === "`") {
        const end = line.indexOf("`", pos + 1);
        if (end !== -1) {
          ranges.push({ type: "syntax", start: lineStart + pos, length: 1 });
          if (end > pos + 1) {
            ranges.push({ type: "code", start: lineStart + pos + 1, length: end - pos - 1 });
          }
          ranges.push({ type: "syntax", start: lineStart + end, length: 1 });
          pos = end + 1;
          continue;
        }
      }

      if (ch === "[" || (ch === "!" && line[pos + 1] === "[")) {
        const labelStart = ch === "!" ? pos + 2 : pos + 1;
        const labelEnd = line.indexOf("]", labelStart);
        if (labelEnd !== -1 && line[labelEnd + 1] === "(") {
          const urlEnd = line.indexOf(")", labelEnd + 2);
          if (urlEnd !== -1) {
            const syntaxOpenLen = ch === "!" ? 2 : 1;
            ranges.push({ type: "syntax", start: lineStart + pos, length: syntaxOpenLen });
            ranges.push({ type: "syntax", start: lineStart + labelEnd, length: 2 });
            if (urlEnd > labelEnd + 2) {
              ranges.push({ type: "link", start: lineStart + labelEnd + 2, length: urlEnd - labelEnd - 2 });
            }
            ranges.push({ type: "syntax", start: lineStart + urlEnd, length: 1 });
            pos = urlEnd + 1;
            continue;
          }
        }
      }

      if (ch === "~" && line[pos + 1] === "~") {
        const end = line.indexOf("~~", pos + 2);
        if (end !== -1) {
          ranges.push({ type: "syntax", start: lineStart + pos, length: 2 });
          if (end > pos + 2) {
            ranges.push({ type: "strikethrough", start: lineStart + pos + 2, length: end - pos - 2 });
          }
          ranges.push({ type: "syntax", start: lineStart + end, length: 2 });
          pos = end + 2;
          continue;
        }
      }

      if (ch === "*" && line[pos + 1] === "*") {
        const end = line.indexOf("**", pos + 2);
        if (end !== -1) {
          ranges.push({ type: "syntax", start: lineStart + pos, length: 2 });
          if (end > pos + 2) {
            ranges.push({ type: "bold", start: lineStart + pos + 2, length: end - pos - 2 });
          }
          ranges.push({ type: "syntax", start: lineStart + end, length: 2 });
          pos = end + 2;
          continue;
        }
      }

      if (ch === "*" && line[pos + 1] !== "*") {
        const end = line.indexOf("*", pos + 1);
        if (end !== -1 && line[end + 1] !== "*") {
          ranges.push({ type: "syntax", start: lineStart + pos, length: 1 });
          if (end > pos + 1) {
            ranges.push({ type: "italic", start: lineStart + pos + 1, length: end - pos - 1 });
          }
          ranges.push({ type: "syntax", start: lineStart + end, length: 1 });
          pos = end + 1;
          continue;
        }
      }

      pos += 1;
    }

    lineStart += lineLen + 1;
  }

  return ranges;
}

function buildMarkdownStyle(): MarkdownStyle {
  const text = Tailwind_semantic().text;
  return {
    syntax: { color: text.secondary },
    link: { color: text.link },
    h1: { fontSize: 18 },
    code: {
      color: text.error,
      backgroundColor: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 0,
      padding: 0,
      fontSize: 14,
      fontFamily: "Courier",
    },
    blockquote: {
      borderColor: text.secondarysubtle,
      borderWidth: 3,
      marginLeft: 0,
      paddingLeft: 6,
    },
  };
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 8,
  },
  input: {
    fontFamily: "Poppins",
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
    margin: 0,
    textAlignVertical: "top" as const,
    includeFontPadding: false,
  },
});

const CHARS_PER_LINE = 40;
const LINE_HEIGHT = 20;
const VERTICAL_PADDING = 0;
const MIN_HEIGHT = 60;

function estimateHeight(value: string, widthChars: number = CHARS_PER_LINE): number {
  const lines = value.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / widthChars)), 0);
  return Math.max(MIN_HEIGHT, lines * LINE_HEIGHT + VERTICAL_PADDING);
}

export function MarkdownEditorBorderless(props: IProps): JSX.Element {
  const [text, setText] = useState(props.value ?? "");
  const initialEstimatedHeight = useMemo(() => estimateHeight(props.value ?? ""), []);
  const [minHeight, setMinHeight] = useState(initialEstimatedHeight);

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

  const handleContentSizeChange = useCallback((e: { nativeEvent: { contentSize: { height: number } } }) => {
    const measured = e.nativeEvent.contentSize.height;
    setMinHeight((prev) => (measured > prev ? measured : prev));
  }, []);

  const semanticText = Tailwind_semantic().text;
  const markdownStyle = useMemo(() => buildMarkdownStyle(), [semanticText.primary]);

  return (
    <View style={styles.wrapper}>
      <MarkdownTextInput
        multiline
        scrollEnabled={false}
        value={text}
        placeholder={props.placeholder}
        placeholderTextColor={semanticText.secondarysubtle}
        onChangeText={handleChangeText}
        onContentSizeChange={handleContentSizeChange}
        parser={parseMarkdownWorklet}
        markdownStyle={markdownStyle}
        style={[styles.input, { minHeight, color: semanticText.primary }]}
      />
    </View>
  );
}
