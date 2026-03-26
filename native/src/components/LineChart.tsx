import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import Svg, { Line, Path, Circle, G, Text as SvgText, Rect, Defs, ClipPath } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Tailwind_semantic } from "@shared/utils/tailwindConfig";

export interface ILineChartSeries {
  color: string;
  label: string;
  show: boolean;
}

export interface ILineChartVerticalLine {
  x: number;
  label: string;
}

export interface ILineChartProps {
  width: number;
  height: number;
  data: (number | null)[][];
  series: ILineChartSeries[];
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  minX?: number;
  maxX?: number;
  verticalLines?: ILineChartVerticalLine[];
  onCursorChange?: (index: number | null, x: number | null) => void;
  spanGaps?: boolean;
  title?: string;
}

const PADDING_LEFT = 50;
const PADDING_RIGHT = 16;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 30;
const Y_TICK_COUNT = 5;
const X_TICK_COUNT = 5;

function formatTimeDefault(seconds: number): string {
  const d = new Date(seconds * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) {
      niceFraction = 1;
    } else if (fraction < 3) {
      niceFraction = 2;
    } else if (fraction < 7) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
  } else {
    if (fraction <= 1) {
      niceFraction = 1;
    } else if (fraction <= 2) {
      niceFraction = 2;
    } else if (fraction <= 5) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
  }
  return niceFraction * Math.pow(10, exponent);
}

function generateTicks(min: number, max: number, count: number): number[] {
  const range = niceNum(max - min, false);
  const spacing = niceNum(range / (count - 1), true);
  const niceMin = Math.floor(min / spacing) * spacing;
  const niceMax = Math.ceil(max / spacing) * spacing;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + spacing * 0.5; v += spacing) {
    ticks.push(Math.round(v * 1e10) / 1e10);
  }
  return ticks;
}

function findNearestIndex(xValues: (number | null)[], targetX: number): number {
  let closest = 0;
  let minDist = Infinity;
  for (let i = 0; i < xValues.length; i++) {
    const val = xValues[i];
    if (val == null) {
      continue;
    }
    const dist = Math.abs(val - targetX);
    if (dist < minDist) {
      minDist = dist;
      closest = i;
    }
  }
  return closest;
}

function buildLinePath(
  xValues: (number | null)[],
  yValues: (number | null)[],
  toPixelX: (v: number) => number,
  toPixelY: (v: number) => number,
  spanGaps: boolean
): string {
  let d = "";
  let inPath = false;
  for (let i = 0; i < xValues.length; i++) {
    const x = xValues[i];
    const y = yValues[i];
    if (x == null || y == null) {
      if (!spanGaps) {
        inPath = false;
      }
      continue;
    }
    const px = toPixelX(x);
    const py = toPixelY(y);
    if (!inPath) {
      d += `M${px},${py}`;
      inPath = true;
    } else {
      d += `L${px},${py}`;
    }
  }
  return d;
}

function defaultFormatY(v: number): string {
  if (Math.abs(v) >= 1000) {
    return `${(v / 1000).toFixed(1)}k`;
  }
  if (Number.isInteger(v)) {
    return String(v);
  }
  return v.toFixed(1);
}

export function LineChart(props: ILineChartProps): React.ReactElement {
  const {
    width,
    height,
    data,
    series,
    formatX = formatTimeDefault,
    formatY = defaultFormatY,
    verticalLines,
    onCursorChange,
    spanGaps = true,
    title,
  } = props;

  const sem = Tailwind_semantic();
  const plotWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const xValues = data[0] ?? [];

  const initialMinX =
    props.minX ?? (xValues.length > 0 ? Math.min(...xValues.filter((v): v is number => v != null)) : 0);
  const initialMaxX =
    props.maxX ?? (xValues.length > 0 ? Math.max(...xValues.filter((v): v is number => v != null)) : 1);

  const [xMin, setXMin] = useState(initialMinX);
  const [xMax, setXMax] = useState(initialMaxX);
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);

  const { yMin, yMax } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let s = 0; s < series.length; s++) {
      if (!series[s].show) {
        continue;
      }
      const yVals = data[s + 1];
      if (!yVals) {
        continue;
      }
      for (let i = 0; i < yVals.length; i++) {
        const xVal = xValues[i];
        const yVal = yVals[i];
        if (xVal == null || yVal == null) {
          continue;
        }
        if (xVal < xMin || xVal > xMax) {
          continue;
        }
        if (yVal < lo) {
          lo = yVal;
        }
        if (yVal > hi) {
          hi = yVal;
        }
      }
    }
    if (lo === Infinity) {
      lo = 0;
      hi = 1;
    }
    const padding = (hi - lo) * 0.1 || 1;
    return { yMin: lo - padding, yMax: hi + padding };
  }, [data, series, xMin, xMax, xValues]);

  const toPixelX = (val: number): number => ((val - xMin) / (xMax - xMin)) * plotWidth + PADDING_LEFT;
  const toPixelY = (val: number): number => PADDING_TOP + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;
  const toValueX = (px: number): number => ((px - PADDING_LEFT) / plotWidth) * (xMax - xMin) + xMin;

  const yTicks = useMemo(() => generateTicks(yMin, yMax, Y_TICK_COUNT), [yMin, yMax]);
  const xTicks = useMemo(() => generateTicks(xMin, xMax, X_TICK_COUNT), [xMin, xMax]);

  const paths = useMemo(() => {
    return series.map((s, i) => {
      if (!s.show) {
        return null;
      }
      const yVals = data[i + 1];
      if (!yVals) {
        return null;
      }
      return buildLinePath(xValues, yVals, toPixelX, toPixelY, spanGaps);
    });
  }, [series, data, xValues, toPixelX, toPixelY, spanGaps]);

  // Refs to track pinch start state (mutated in gesture callbacks, no re-render needed)
  const pinchState = React.useRef({ focalX: 0, startXMin: 0, startXMax: 0 });

  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart((e) => {
      pinchState.current.focalX = e.focalX;
      pinchState.current.startXMin = xMin;
      pinchState.current.startXMax = xMax;
    })
    .onUpdate((e) => {
      const { focalX, startXMin, startXMax } = pinchState.current;
      const focalPct = (focalX - PADDING_LEFT) / plotWidth;
      const origRange = startXMax - startXMin;
      const newRange = origRange / e.scale;
      const focalVal = startXMin + focalPct * origRange;
      setXMin(focalVal - focalPct * newRange);
      setXMax(focalVal + (1 - focalPct) * newRange);
    });

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minPointers(1)
    .maxPointers(1)
    .onStart((e) => {
      const val = toValueX(e.x);
      const idx = findNearestIndex(xValues, val);
      setCursorIndex(idx);
      onCursorChange?.(idx, xValues[idx] ?? null);
    })
    .onUpdate((e) => {
      const val = toValueX(e.x);
      const idx = findNearestIndex(xValues, val);
      setCursorIndex(idx);
      onCursorChange?.(idx, xValues[idx] ?? null);
    })
    .onEnd(() => {
      setCursorIndex(null);
      onCursorChange?.(null, null);
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);
  const cursorPixelX = cursorIndex != null && xValues[cursorIndex] != null ? toPixelX(xValues[cursorIndex]!) : null;

  return (
    <View>
      {title && <Text className="text-sm font-semibold text-center pt-2 pb-1 text-text-primary">{title}</Text>}
      <GestureDetector gesture={composed}>
        <View>
          <Svg width={width} height={height}>
            <Defs>
              <ClipPath id="plotArea">
                <Rect x={PADDING_LEFT} y={PADDING_TOP} width={plotWidth} height={plotHeight} />
              </ClipPath>
            </Defs>

            {yTicks.map((tick) => {
              const y = toPixelY(tick);
              if (y < PADDING_TOP || y > PADDING_TOP + plotHeight) {
                return null;
              }
              return (
                <Line
                  key={`ygrid-${tick}`}
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={PADDING_LEFT + plotWidth}
                  y2={y}
                  stroke={sem.border.neutral}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
              );
            })}

            {yTicks.map((tick) => {
              const y = toPixelY(tick);
              if (y < PADDING_TOP || y > PADDING_TOP + plotHeight) {
                return null;
              }
              return (
                <SvgText
                  key={`ylabel-${tick}`}
                  x={PADDING_LEFT - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill={sem.text.secondary}
                >
                  {formatY(tick)}
                </SvgText>
              );
            })}

            {xTicks.map((tick) => {
              const x = toPixelX(tick);
              if (x < PADDING_LEFT || x > PADDING_LEFT + plotWidth) {
                return null;
              }
              return (
                <SvgText
                  key={`xlabel-${tick}`}
                  x={x}
                  y={PADDING_TOP + plotHeight + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill={sem.text.secondary}
                >
                  {formatX(tick)}
                </SvgText>
              );
            })}

            <Line
              x1={PADDING_LEFT}
              y1={PADDING_TOP}
              x2={PADDING_LEFT}
              y2={PADDING_TOP + plotHeight}
              stroke={sem.border.neutral}
              strokeWidth={1}
            />
            <Line
              x1={PADDING_LEFT}
              y1={PADDING_TOP + plotHeight}
              x2={PADDING_LEFT + plotWidth}
              y2={PADDING_TOP + plotHeight}
              stroke={sem.border.neutral}
              strokeWidth={1}
            />

            <G clipPath="url(#plotArea)">
              {verticalLines?.map((vl, i) => {
                const x = toPixelX(vl.x);
                return (
                  <G key={`vline-${i}`}>
                    <Line
                      x1={x}
                      y1={PADDING_TOP}
                      x2={x}
                      y2={PADDING_TOP + plotHeight}
                      stroke={sem.border.neutral}
                      strokeWidth={1}
                    />
                    <SvgText
                      x={x + 3}
                      y={PADDING_TOP + 10}
                      fontSize={9}
                      fill={sem.text.secondary}
                      rotation={90}
                      originX={x + 3}
                      originY={PADDING_TOP + 10}
                    >
                      {vl.label}
                    </SvgText>
                  </G>
                );
              })}
            </G>

            <G clipPath="url(#plotArea)">
              {paths.map((d, i) => {
                if (!d) {
                  return null;
                }
                return <Path key={`line-${i}`} d={d} stroke={series[i].color} strokeWidth={1.5} fill="none" />;
              })}
            </G>

            {cursorPixelX != null && (
              <G>
                <Line
                  x1={cursorPixelX}
                  y1={PADDING_TOP}
                  x2={cursorPixelX}
                  y2={PADDING_TOP + plotHeight}
                  stroke={sem.text.secondary}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                {series.map((s, i) => {
                  if (!s.show || cursorIndex == null) {
                    return null;
                  }
                  const yVal = data[i + 1]?.[cursorIndex];
                  if (yVal == null) {
                    return null;
                  }
                  return (
                    <Circle
                      key={`cursor-dot-${i}`}
                      cx={cursorPixelX}
                      cy={toPixelY(yVal)}
                      r={4}
                      fill={s.color}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </G>
            )}
          </Svg>
        </View>
      </GestureDetector>
    </View>
  );
}
