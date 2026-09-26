// Advance widths from Poppins-Bold.ttf hmtx, in em: "4" is the widest digit, ":" is fixed.
// Poppins has no tabular-nums (tnum) feature, so fontVariant cannot do this.
const DIGIT_EM = 0.677;
const COLON_EM = 0.284;

export function RestTimerWidth_em(text: string): number {
  let em = 0;
  for (const char of text) {
    em += char === ":" ? COLON_EM : DIGIT_EM;
  }
  return em;
}
