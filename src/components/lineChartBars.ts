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

export interface ILineChartBarsSeries {
  show: boolean;
  mark?: "line" | "dots" | "bars";
  axis?: "left" | "right";
}

export function LineChartBars_axisDomain(
  series: ILineChartBarsSeries[],
  clippedSeries: [number, number][][],
  axis: "left" | "right",
  yDomain: (pointLists: [number, number][][]) => { yMin: number; yMax: number }
): { yMin: number; yMax: number } {
  const isOnAxis = (i: number): boolean => (series[i]?.axis ?? "left") === axis;
  const domain = yDomain(clippedSeries.filter((_, i) => isOnAxis(i)));
  const hasBars = series.some((s, i) => s.show && s.mark === "bars" && isOnAxis(i));
  return hasBars ? LineChartBars_withZero(domain) : domain;
}

export function LineChartBars_withZero(domain: { yMin: number; yMax: number }): { yMin: number; yMax: number } {
  return { yMin: Math.min(domain.yMin, 0), yMax: Math.max(domain.yMax, 0) };
}
