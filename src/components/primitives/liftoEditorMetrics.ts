import { useRem } from "../../utils/useRem";

// The sheets show one exercise at a time, where tapping a single token inside a dense set group
// is the main way to work - fiddly at the app's body size. The inline editor holds a whole day,
// so it keeps the body size and the lines it buys.
const SHEET_FONT_RATIO = 1.125;
// Runestone and sora both lay a line out at roughly this much of the font size.
const LINE_HEIGHT_RATIO = 1.3;

export function useLiftoEditorSheetFontSize(): number {
  return Math.round(useRem() * SHEET_FONT_RATIO);
}

export function useLiftoEditorSheetLineHeight(): number {
  return useLiftoEditorSheetFontSize() * LINE_HEIGHT_RATIO;
}
