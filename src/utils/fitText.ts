// Poppins digits sit around 0.62em wide. The estimate is deliberately on the generous side so a
// value never renders wider than the field that holds it - overshooting costs a slightly smaller
// font, undershooting clips the number.
const CHAR_WIDTH_EM = 0.62;
const MIN_RATIO = 0.6;

export function FitText_fontSize(text: string, availableWidth: number, baseFontSize: number): number {
  if (!text || availableWidth <= 0) {
    return baseFontSize;
  }
  const neededWidth = text.length * CHAR_WIDTH_EM * baseFontSize;
  if (neededWidth <= availableWidth) {
    return baseFontSize;
  }
  return Math.max(baseFontSize * MIN_RATIO, availableWidth / (text.length * CHAR_WIDTH_EM));
}
