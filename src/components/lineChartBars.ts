const MIN_BAR_WIDTH = 2;
const MAX_BAR_WIDTH = 28;
const BAR_GAP_SHARE = 0.7;

export function LineChartBars_width(pixelXs: number[]): number {
  const xs = Array.from(new Set(pixelXs)).sort((a, b) => a - b);
  let minGap = Infinity;
  for (let i = 1; i < xs.length; i += 1) {
    minGap = Math.min(minGap, xs[i] - xs[i - 1]);
  }
  if (!isFinite(minGap)) {
    return MAX_BAR_WIDTH / 2;
  }
  return Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, minGap * BAR_GAP_SHARE));
}

export function LineChartBars_withZero(domain: { yMin: number; yMax: number }): { yMin: number; yMax: number } {
  return { yMin: Math.min(domain.yMin, 0), yMax: Math.max(domain.yMax, 0) };
}
