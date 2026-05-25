import { JSX, useMemo } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "./primitives/text";
import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { Link } from "./link";
import { InternalLink } from "../internalLink";
import { IconDiscord } from "./icons/iconDiscord";
import { IconDoc } from "./icons/iconDoc";
import { IconSwap } from "./icons/iconSwap";
import { IconHelp } from "./icons/iconHelp";
import { PlannerCodeBlock } from "../pages/planner/components/plannerCodeBlock";

const md = new MarkdownIt({ html: false, linkify: true });

const ICON_RE = /::icon-(discord|doc|swap|help)::/g;

interface IProps {
  value: string;
  className?: string;
}

export function SimpleMarkdown(props: IProps): JSX.Element {
  const rendered = useMemo(() => {
    const tokens = md.parse(props.value, {});
    return renderBlocks(tokens, 0, tokens.length).elements;
  }, [props.value]);
  return <View className={props.className}>{rendered}</View>;
}

interface IBlockResult {
  elements: JSX.Element[];
  next: number;
}

function renderBlocks(tokens: Token[], start: number, end: number, depth = 0): IBlockResult {
  const elements: JSX.Element[] = [];
  let i = start;
  while (i < end) {
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
      const ordered = token.type === "ordered_list_open";
      const closeType = ordered ? "ordered_list_close" : "bullet_list_close";
      const listEnd = findMatchingClose(tokens, i, token.type, closeType);
      const items = renderListItems(tokens, i + 1, listEnd, ordered, depth);
      elements.push(
        <View key={i} className={depth > 0 ? "pl-4" : ""}>
          {items}
        </View>
      );
      i = listEnd + 1;
    } else if (token.type === "fence" || token.type === "code_block") {
      if (token.info && token.info.trim() === "liftoscript") {
        elements.push(
          <ScrollView key={i} horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
            <PlannerCodeBlock className="text-sm" script={token.content.replace(/\n+$/, "")} />
          </ScrollView>
        );
      } else {
        elements.push(
          <View key={i} className="p-2 mb-2 rounded bg-background-subtle">
            <Text className="font-mono text-xs">{token.content}</Text>
          </View>
        );
      }
      i += 1;
    } else if (token.type === "hr") {
      elements.push(<View key={i} className="my-2 border-b border-border-neutral" />);
      i += 1;
    } else {
      i += 1;
    }
  }
  return { elements, next: i };
}

function renderListItems(tokens: Token[], start: number, end: number, ordered: boolean, depth: number): JSX.Element[] {
  const items: JSX.Element[] = [];
  let i = start;
  let orderIndex = 1;
  while (i < end) {
    if (tokens[i].type !== "list_item_open") {
      i += 1;
      continue;
    }
    const itemEnd = findMatchingClose(tokens, i, "list_item_open", "list_item_close");
    const bullet = ordered ? `${orderIndex}. ` : "• ";
    const inner = renderBlocks(tokens, i + 1, itemEnd, depth + 1).elements;
    items.push(
      <View key={i} className="flex-row pl-2 mb-1">
        <Text className="text-sm">{bullet}</Text>
        <View className="flex-1">{inner}</View>
      </View>
    );
    orderIndex += 1;
    i = itemEnd + 1;
  }
  return items;
}

function findMatchingClose(tokens: Token[], start: number, openType: string, closeType: string): number {
  let depth = 0;
  for (let i = start; i < tokens.length; i += 1) {
    if (tokens[i].type === openType) {
      depth += 1;
    } else if (tokens[i].type === closeType) {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return tokens.length;
}

function renderInline(tokens: Token[]): (JSX.Element | string)[] {
  const elements: (JSX.Element | string)[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === "text") {
      pushTextWithIcons(elements, token.content, `t${i}`);
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
        <Text key={i} className="text-sm font-bold">
          {renderInline(content.tokens)}
        </Text>
      );
      i = content.endIndex + 1;
    } else if (token.type === "em_open") {
      const content = collectInlineUntil(tokens, i + 1, "em_close");
      elements.push(
        <Text key={i} className="text-sm italic">
          {renderInline(content.tokens)}
        </Text>
      );
      i = content.endIndex + 1;
    } else if (token.type === "link_open") {
      const href = token.attrGet("href") || "";
      const content = collectInlineUntil(tokens, i + 1, "link_close");
      if (href) {
        if (href.startsWith("internal:")) {
          const internalHref = href.slice("internal:".length);
          elements.push(
            <InternalLink
              key={i}
              name="markdown-internal"
              className="text-sm underline text-text-link"
              href={internalHref}
            >
              {renderInline(content.tokens)}
            </InternalLink>
          );
        } else {
          elements.push(
            <Link key={i} className="text-sm underline text-text-link" href={href}>
              {renderInline(content.tokens)}
            </Link>
          );
        }
      }
      i = content.endIndex + 1;
    } else {
      i += 1;
    }
  }
  return elements;
}

function pushTextWithIcons(out: (JSX.Element | string)[], text: string, keyPrefix: string): void {
  ICON_RE.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let part = 0;
  while ((match = ICON_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    const name = match[1];
    out.push(renderIcon(name, `${keyPrefix}-i${part}`));
    lastIndex = match.index + match[0].length;
    part += 1;
  }
  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex));
  }
}

function renderIcon(name: string, key: string): JSX.Element {
  const size = 14;
  const className = "inline-block";
  switch (name) {
    case "discord":
      return <IconDiscord key={key} size={size} className={className} />;
    case "doc":
      return <IconDoc key={key} width={size} height={size} className={className} />;
    case "swap":
      return <IconSwap key={key} size={size} className={className} />;
    case "help":
      return <IconHelp key={key} size={size} className={className} />;
    default:
      return <Text key={key}>{`::icon-${name}::`}</Text>;
  }
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
