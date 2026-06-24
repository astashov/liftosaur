import type { ColorValue, StyleProp, ViewStyle } from "react-native";
import { Tailwind_colors, Tailwind_semantic } from "./tailwindConfig";

// typeof-guarded: Metro/webpack define __DEV__, but this module also runs under node (tests).
declare let __DEV__: boolean | undefined;

function isDev(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__ === true;
}

// "500" maps to the SemiBold face: Android/web don't bundle Poppins-Medium, and both native
// renderers already treat 500-699 as SemiBold.
export type IFastTextFontWeight = "400" | "500" | "600" | "700";

export type IFastTextFontStyle = "normal" | "italic";

export type IFastTextDecoration = "underline" | "line-through";

export type IFastTextAlign = "left" | "center" | "right";

export interface IFastTextStyle {
  color?: ColorValue;
  backgroundColor?: ColorValue;
  fontWeight?: IFastTextFontWeight;
  fontSize?: number;
  fontStyle?: IFastTextFontStyle;
  textDecorationLine?: IFastTextDecoration;
}

export interface IFastTextFragment extends IFastTextStyle {
  start: number;
  end: number;
  // Web-only hook for preserving per-span data-testid/data-cy. Ignored natively
  // (the native view is a single node).
  testID?: string;
}

export interface IFastTextBuild {
  text: string;
  fragments: IFastTextFragment[];
}

export interface IFastTextSpan {
  text: string;
  style?: IFastTextStyle;
  testID?: string;
}

// Base style (IFastTextStyle) applies to the whole string; `fragments` are
// per-range overrides layered on top. The component is a dumb renderer — the
// caller resolves all colors (ColorValue strings) and sizes (px).
export interface IFastTextProps extends IFastTextStyle {
  text: string;
  fragments?: IFastTextFragment[];
  // Overrides the weight-based Poppins face mapping with a verbatim family name (e.g.
  // "Iosevka" for monospace code). Base-level only — fragments differ in color, not font.
  fontFamily?: string;
  // Web-only: render with white-space: pre (no soft-wrap, whitespace preserved). Native
  // achieves the same by being measured at unbounded width inside a horizontal ScrollView.
  noWrap?: boolean;
  paddingHorizontal?: number;
  lineHeight?: number;
  numberOfLines?: number;
  textAlign?: IFastTextAlign;
  style?: StyleProp<ViewStyle>;
  // Native FastText draws text rather than using <Text>, so it exposes nothing to screen
  // readers by default; the wrapper falls back to `text` when this is unset.
  accessibilityLabel?: string;
  testID?: string;
  "data-testid"?: string;
  "data-cy"?: string;
}

function hasStyle(style?: IFastTextStyle): style is IFastTextStyle {
  if (style == null) {
    return false;
  }
  return (
    style.color != null ||
    style.backgroundColor != null ||
    style.fontWeight != null ||
    style.fontSize != null ||
    style.fontStyle != null ||
    style.textDecorationLine != null
  );
}

export class StyledText {
  private readonly parts: string[] = [];
  private readonly fragments: IFastTextFragment[] = [];
  private offset = 0;

  public add(text: string | undefined | null, style?: IFastTextStyle, testID?: string): this {
    if (text == null || text.length === 0) {
      return this;
    }
    const start = this.offset;
    const end = start + text.length;
    this.parts.push(text);
    this.offset = end;
    if (hasStyle(style) || testID != null) {
      this.fragments.push({ start, end, ...style, ...(testID != null ? { testID } : {}) });
    }
    return this;
  }

  public build(): IFastTextBuild {
    return { text: this.parts.join(""), fragments: this.fragments };
  }
}

export function StyledText_fragmentsToSpans(text: string, fragments?: IFastTextFragment[]): IFastTextSpan[] {
  const sorted = (fragments ?? [])
    .filter((f) => f.end > f.start && f.start < text.length)
    .slice()
    .sort((a, b) => a.start - b.start);
  const spans: IFastTextSpan[] = [];
  let cursor = 0;
  for (const fragment of sorted) {
    const start = Math.max(fragment.start, cursor);
    const end = Math.min(fragment.end, text.length);
    if (start > cursor) {
      spans.push({ text: text.slice(cursor, start) });
    }
    if (end > start) {
      const { start: _s, end: _e, testID, ...style } = fragment;
      spans.push({ text: text.slice(start, end), style, ...(testID != null ? { testID } : {}) });
      cursor = end;
    }
  }
  if (cursor < text.length) {
    spans.push({ text: text.slice(cursor) });
  }
  return spans;
}

export type IFastTextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

const BASE_REM = 16;

// Mirrors the --text-* scale in useRem.ts / useRem.native.ts (px at rem=16).
const SIZE_PX: Record<IFastTextSize, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
};

export function StyledText_remToPx(size: IFastTextSize, rem: number): number {
  return SIZE_PX[size] * (rem / BASE_REM);
}

const FONT_WEIGHT_CLASSES: Record<string, IFastTextFontWeight> = {
  "font-normal": "400",
  "font-medium": "500",
  "font-semibold": "600",
  "font-bold": "700",
};

// Resolves a Tailwind-ish class string into FastText styles so conversions from nested
// <Text className="..."> read like the JSX they replace:
//   const cls = StyledText_cls(rem);
//   builder.add("Plates: ", cls("text-sm text-text-secondary"));
// Supports text sizes, font weights, italic, underline/line-through, and text-*/bg-* colors
// resolved via Tailwind_semantic() (e.g. text-text-secondary, text-syntax-weight, bg-background-subtle)
// or Tailwind_colors() (e.g. text-yellow-600, bg-white).
export function StyledText_cls(rem: number): (className: string) => IFastTextStyle {
  const semantic = Tailwind_semantic() as unknown as Record<string, Record<string, string> | undefined>;
  const colors = Tailwind_colors() as unknown as Record<string, string | Record<string, string> | undefined>;

  function resolveColor(rest: string): string | undefined {
    const direct = colors[rest];
    if (typeof direct === "string") {
      return direct;
    }
    const dashIndex = rest.indexOf("-");
    if (dashIndex === -1) {
      return undefined;
    }
    const head = rest.slice(0, dashIndex);
    const tail = rest.slice(dashIndex + 1);
    const fromSemantic = semantic[head]?.[tail];
    if (fromSemantic != null) {
      return fromSemantic;
    }
    const palette = colors[head];
    return typeof palette === "object" ? palette?.[tail] : undefined;
  }

  return (className) => {
    const style: IFastTextStyle = {};
    for (const token of className.split(/\s+/)) {
      if (token.length === 0) {
        continue;
      }
      const weight = FONT_WEIGHT_CLASSES[token];
      if (weight != null) {
        style.fontWeight = weight;
      } else if (token === "italic") {
        style.fontStyle = "italic";
      } else if (token === "not-italic") {
        style.fontStyle = "normal";
      } else if (token === "underline" || token === "line-through") {
        style.textDecorationLine = token;
      } else if (token.startsWith("text-")) {
        const rest = token.slice("text-".length);
        if (rest in SIZE_PX) {
          style.fontSize = StyledText_remToPx(rest as IFastTextSize, rem);
        } else {
          const color = resolveColor(rest);
          if (color != null) {
            style.color = color;
          } else if (isDev()) {
            console.warn(`StyledText_cls: unknown color class "${token}"`);
          }
        }
      } else if (token.startsWith("bg-")) {
        const color = resolveColor(token.slice("bg-".length));
        if (color != null) {
          style.backgroundColor = color;
        } else if (isDev()) {
          console.warn(`StyledText_cls: unknown color class "${token}"`);
        }
      } else if (isDev()) {
        console.warn(`StyledText_cls: unsupported class "${token}"`);
      }
    }
    return style;
  };
}
