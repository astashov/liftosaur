import { JSX, useMemo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { Link } from "./link";

const md = new MarkdownIt({ html: false, linkify: true });

interface IProps {
  value: string;
  className?: string;
}

export function SimpleMarkdown(props: IProps): JSX.Element {
  const tokens = useMemo(() => md.parse(props.value, {}), [props.value]);
  return <View className={props.className}>{renderTokens(tokens)}</View>;
}

function renderTokens(tokens: Token[]): JSX.Element[] {
  const elements: JSX.Element[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === "paragraph_open") {
      const inline = tokens[i + 1];
      elements.push(
        <Text key={i} className="mb-2 text-sm">
          {inline?.children ? renderInline(inline.children) : null}
        </Text>
      );
      i += 3;
    } else if (token.type === "heading_open") {
      const level = parseInt(token.tag.replace("h", ""), 10);
      const inline = tokens[i + 1];
      const sizeClass = level <= 2 ? "text-lg" : level <= 4 ? "text-base" : "text-sm";
      elements.push(
        <Text key={i} className={`${sizeClass} font-bold mb-1`}>
          {inline?.children ? renderInline(inline.children) : null}
        </Text>
      );
      i += 3;
    } else if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const listItems: JSX.Element[] = [];
      const ordered = token.type === "ordered_list_open";
      let orderIndex = 1;
      i += 1;
      while (i < tokens.length && tokens[i].type !== "bullet_list_close" && tokens[i].type !== "ordered_list_close") {
        if (tokens[i].type === "list_item_open") {
          i += 1;
          if (i < tokens.length && tokens[i].type === "paragraph_open") {
            const inline = tokens[i + 1];
            const bullet = ordered ? `${orderIndex}. ` : "\u2022 ";
            listItems.push(
              <View key={i} className="flex-row pl-2 mb-1">
                <Text className="text-sm">{bullet}</Text>
                <Text className="flex-1 text-sm">{inline?.children ? renderInline(inline.children) : null}</Text>
              </View>
            );
            orderIndex += 1;
            i += 3;
          }
        } else {
          i += 1;
        }
      }
      elements.push(<View key={`list-${i}`}>{listItems}</View>);
      i += 1;
    } else if (token.type === "fence" || token.type === "code_block") {
      elements.push(
        <View key={i} className="p-2 mb-2 rounded bg-background-subtle">
          <Text className="font-mono text-xs">{token.content}</Text>
        </View>
      );
      i += 1;
    } else if (token.type === "hr") {
      elements.push(<View key={i} className="my-2 border-b border-border-neutral" />);
      i += 1;
    } else {
      i += 1;
    }
  }
  return elements;
}

function renderInline(tokens: Token[]): (JSX.Element | string)[] {
  const elements: (JSX.Element | string)[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === "text") {
      elements.push(token.content);
      i += 1;
    } else if (token.type === "softbreak") {
      elements.push("\n");
      i += 1;
    } else if (token.type === "hardbreak") {
      elements.push("\n");
      i += 1;
    } else if (token.type === "code_inline") {
      elements.push(
        <Text key={i} className="px-1 font-mono text-xs rounded bg-background-subtle">
          {token.content}
        </Text>
      );
      i += 1;
    } else if (token.type === "strong_open") {
      const content = collectInlineUntil(tokens, i + 1, "strong_close");
      elements.push(
        <Text key={i} className="font-bold">
          {renderInline(content.tokens)}
        </Text>
      );
      i = content.endIndex + 1;
    } else if (token.type === "em_open") {
      const content = collectInlineUntil(tokens, i + 1, "em_close");
      elements.push(
        <Text key={i} className="italic">
          {renderInline(content.tokens)}
        </Text>
      );
      i = content.endIndex + 1;
    } else if (token.type === "link_open") {
      const href = token.attrGet("href") || "";
      const content = collectInlineUntil(tokens, i + 1, "link_close");
      if (href) {
        elements.push(
          <Link key={i} className="text-sm underline text-text-link" href={href}>
            {renderInline(content.tokens)}
          </Link>
        );
      }
      i = content.endIndex + 1;
    } else {
      i += 1;
    }
  }
  return elements;
}

function collectInlineUntil(
  tokens: Token[],
  startIndex: number,
  closeType: string
): { tokens: Token[]; endIndex: number } {
  const collected: Token[] = [];
  let i = startIndex;
  while (i < tokens.length && tokens[i].type !== closeType) {
    collected.push(tokens[i]);
    i += 1;
  }
  return { tokens: collected, endIndex: i };
}
