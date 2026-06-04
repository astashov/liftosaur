import type { ColorValue, StyleProp, ViewStyle } from "react-native";

export type IFastTextFontWeight = "400" | "600" | "700";

export type IFastTextFontStyle = "normal" | "italic";

export interface IFastTextStyle {
  color?: ColorValue;
  backgroundColor?: ColorValue;
  fontWeight?: IFastTextFontWeight;
  fontSize?: number;
  fontStyle?: IFastTextFontStyle;
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
  paddingHorizontal?: number;
  lineHeight?: number;
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
    style.fontStyle != null
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
