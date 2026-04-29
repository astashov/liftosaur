import { forwardRef, JSX, useState, useRef, useMemo, useCallback, useEffect, useId, useImperativeHandle } from "react";
import { View, LayoutChangeEvent, Platform } from "react-native";
import { Svg, Path, Line, G, SvgText, Circle, Rect, Defs, ClipPath } from "./primitives/svg";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { DateUtils_format } from "../utils/date";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

const IS_WEB = Platform.OS === "web";

export interface ILineChartSeries {
  label: string;
  color: string;
  show: boolean;
  width?: number;
}

interface ILineChartProps {
  data: (number | null)[][];
  series: ILineChartSeries[];
  height: number;
  xMin?: number;
  xMax?: number;
  programLines?: [number, string][];
  onCursorChange?: (idx: number | null) => void;
  yAxisFormatter?: (value: number) => string;
  yAxisWidth?: number;
}

export interface ILineChartHandle {
  clearCursor: () => void;
}

const YEAR_SECONDS = 365 * 24 * 60 * 60;

function niceTicks(min: number, max: number, targetCount: number): number[] {
  if (min === max) {
    return [min];
  }
  const range = max - min;
  const roughStep = range / Math.max(1, targetCount);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  let step;
  if (normalized < 1.5) {
    step = 1 * magnitude;
  } else if (normalized < 3) {
    step = 2 * magnitude;
  } else if (normalized < 7) {
    step = 5 * magnitude;
  } else {
    step = 10 * magnitude;
  }
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= max + 1e-9; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

function timeTicks(minSec: number, maxSec: number, targetCount: number): number[] {
  const rangeSec = maxSec - minSec;
  if (rangeSec <= 0) {
    return [];
  }
  const day = 24 * 60 * 60;
  const yearApprox = 365 * day;

  if (rangeSec / yearApprox > 1.5) {
    const yearSteps = [1, 2, 5, 10, 20, 50, 100];
    const approxYears = rangeSec / yearApprox;
    let yearStep = yearSteps[yearSteps.length - 1];
    for (const ys of yearSteps) {
      if (approxYears / ys <= targetCount * 1.5) {
        yearStep = ys;
        break;
      }
    }
    const minDate = new Date(minSec * 1000);
    const maxDate = new Date(maxSec * 1000);
    const startYear = Math.ceil(minDate.getFullYear() / yearStep) * yearStep;
    const endYear = maxDate.getFullYear();
    const ticks: number[] = [];
    for (let y = startYear; y <= endYear; y += yearStep) {
      const t = new Date(y, 0, 1).getTime() / 1000;
      if (t >= minSec && t <= maxSec) {
        ticks.push(t);
      }
    }
    return ticks;
  }

  const intervals = [day, 2 * day, 7 * day, 14 * day, 30 * day, 60 * day, 90 * day, 180 * day, 365 * day];
  let step = intervals[intervals.length - 1];
  for (const i of intervals) {
    if (rangeSec / i <= targetCount * 1.5) {
      step = i;
      break;
    }
  }
  const first = Math.ceil(minSec / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= maxSec; v += step) {
    ticks.push(v);
  }
  return ticks;
}

function buildPath(
  timestamps: (number | null)[],
  values: (number | null)[],
  xToPx: (x: number) => number,
  yToPx: (y: number) => number
): string {
  let d = "";
  let penDown = false;
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const v = values[i];
    if (t == null || v == null || !isFinite(v)) {
      penDown = false;
      continue;
    }
    const px = xToPx(t);
    const py = yToPx(v);
    if (!penDown) {
      d += `M${px.toFixed(2)} ${py.toFixed(2)}`;
      penDown = true;
    } else {
      d += `L${px.toFixed(2)} ${py.toFixed(2)}`;
    }
  }
  return d;
}

function findNearestIdx(
  timestamps: (number | null)[],
  xVal: number,
  visibleMin: number,
  visibleMax: number
): number | null {
  let bestIdx: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    if (t == null) {
      continue;
    }
    if (t < visibleMin || t > visibleMax) {
      continue;
    }
    const d = Math.abs(t - xVal);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export const LineChart = forwardRef<ILineChartHandle, ILineChartProps>(function LineChart(props, ref): JSX.Element {
  const [width, setWidth] = useState<number>(0);
  const timestamps = props.data[0] || [];

  const dataMaxX = timestamps.length > 0 ? (timestamps[timestamps.length - 1] as number) : 0;
  const dataMinX = timestamps.length > 0 ? Math.max(timestamps[0] as number, dataMaxX - YEAR_SECONDS) : 0;

  const initialMin = props.xMin != null ? Math.max(props.xMin, (props.xMax ?? dataMaxX) - YEAR_SECONDS) : dataMinX;
  const initialMax = props.xMax != null ? props.xMax : dataMaxX;

  const [userViewport, setUserViewport] = useState<{ xMin: number; xMax: number } | null>(null);
  const viewport = userViewport ?? { xMin: initialMin, xMax: initialMax };
  const setViewport = setUserViewport;
  const [cursorIdx, setCursorIdx] = useState<number | null>(null);
  const [frozen, setFrozen] = useState<boolean>(false);
  const frozenRef = useRef(frozen);
  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  useImperativeHandle(
    ref,
    () => ({
      clearCursor: () => {
        setCursorIdx(null);
        setFrozen(false);
      },
    }),
    []
  );

  const pinchStartRef = useRef<{ xMin: number; xMax: number; focalX: number } | null>(null);
  const panStartRef = useRef<{ xMin: number; xMax: number } | null>(null);

  useEffect(() => {
    props.onCursorChange?.(cursorIdx);
  }, [cursorIdx]);

  const semantic = Tailwind_semantic();
  const colors = {
    axisText: semantic.text.primary,
    grid: semantic.border.neutral,
    titleText: semantic.text.primary,
    secondary: semantic.text.secondary,
    cursor: semantic.text.secondary,
    background: semantic.background.default,
  };

  const padTop = 8;
  const padBottom = 30;
  const padLeft = props.yAxisWidth ?? 44;
  const padRight = 12;
  const plotWidth = Math.max(0, width - padLeft - padRight);
  const plotHeight = Math.max(0, props.height - padTop - padBottom);

  const { xMin, xMax } = viewport;
  const xRange = Math.max(1, xMax - xMin);

  const { yMin, yMax } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let s = 0; s < props.series.length; s++) {
      if (!props.series[s].show) {
        continue;
      }
      const values = props.data[s + 1] || [];
      for (let i = 0; i < timestamps.length; i++) {
        const t = timestamps[i];
        const v = values[i];
        if (t == null || v == null || !isFinite(v)) {
          continue;
        }
        if (t < xMin || t > xMax) {
          continue;
        }
        if (v < lo) {
          lo = v;
        }
        if (v > hi) {
          hi = v;
        }
      }
    }
    if (!isFinite(lo) || !isFinite(hi)) {
      return { yMin: 0, yMax: 1 };
    }
    if (lo === hi) {
      const pad = Math.abs(lo) * 0.1 || 1;
      return { yMin: lo - pad, yMax: hi + pad };
    }
    const pad = (hi - lo) * 0.1;
    return { yMin: lo - pad, yMax: hi + pad };
  }, [props.series, props.data, xMin, xMax, timestamps]);

  const yRange = Math.max(1e-9, yMax - yMin);

  const xToPx = useCallback(
    (x: number): number => padLeft + ((x - xMin) / xRange) * plotWidth,
    [padLeft, xMin, xRange, plotWidth]
  );
  const yToPx = useCallback(
    (y: number): number => padTop + plotHeight - ((y - yMin) / yRange) * plotHeight,
    [padTop, plotHeight, yMin, yRange]
  );
  const pxToX = useCallback(
    (px: number): number => xMin + ((px - padLeft) / Math.max(1, plotWidth)) * xRange,
    [xMin, padLeft, plotWidth, xRange]
  );

  const yTicks = useMemo(() => niceTicks(yMin, yMax, 5), [yMin, yMax]);
  const xTicks = useMemo(() => timeTicks(xMin, xMax, Math.max(2, Math.floor(plotWidth / 80))), [xMin, xMax, plotWidth]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const updateCursorFromPx = useCallback(
    (xPx: number): void => {
      const x = pxToX(xPx);
      const idx = findNearestIdx(timestamps, x, xMin, xMax);
      setCursorIdx(idx);
    },
    [pxToX, timestamps, xMin, xMax]
  );

  const beginPan = useCallback(() => {
    panStartRef.current = { xMin, xMax };
  }, [xMin, xMax]);

  const updatePan = useCallback(
    (translationX: number): void => {
      if (!panStartRef.current || plotWidth <= 0) {
        return;
      }
      const rangeSec = panStartRef.current.xMax - panStartRef.current.xMin;
      const deltaSec = -(translationX / plotWidth) * rangeSec;
      setViewport({
        xMin: panStartRef.current.xMin + deltaSec,
        xMax: panStartRef.current.xMax + deltaSec,
      });
    },
    [plotWidth]
  );

  const endPan = useCallback(() => {
    panStartRef.current = null;
  }, []);

  const beginPinch = useCallback(
    (focalX: number) => {
      pinchStartRef.current = { xMin, xMax, focalX };
    },
    [xMin, xMax]
  );

  const updatePinch = useCallback(
    (scale: number): void => {
      if (!pinchStartRef.current || plotWidth <= 0) {
        return;
      }
      const startRange = pinchStartRef.current.xMax - pinchStartRef.current.xMin;
      const newRange = startRange / Math.max(0.05, scale);
      const focalPct = Math.max(0, Math.min(1, (pinchStartRef.current.focalX - padLeft) / plotWidth));
      const xAtFocal = pinchStartRef.current.xMin + focalPct * startRange;
      const newXMin = xAtFocal - focalPct * newRange;
      const newXMax = newXMin + newRange;
      setViewport({ xMin: newXMin, xMax: newXMax });
    },
    [plotWidth, padLeft]
  );

  const endPinch = useCallback(() => {
    pinchStartRef.current = null;
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .activateAfterLongPress(150)
        .onStart((e) => {
          runOnJS(updateCursorFromPx)(e.x);
        })
        .onUpdate((e) => {
          runOnJS(updateCursorFromPx)(e.x);
        }),
    [updateCursorFromPx]
  );

  const twoFingerPan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .maxPointers(2)
        .onStart(() => {
          runOnJS(beginPan)();
        })
        .onUpdate((e) => {
          runOnJS(updatePan)(e.translationX);
        })
        .onEnd(() => {
          runOnJS(endPan)();
        }),
    [beginPan, updatePan, endPan]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart((e) => {
          runOnJS(beginPinch)(e.focalX);
        })
        .onUpdate((e) => {
          runOnJS(updatePinch)(e.scale);
        })
        .onEnd(() => {
          runOnJS(endPinch)();
        }),
    [beginPinch, updatePinch, endPinch]
  );

  const resetViewport = useCallback(() => {
    setUserViewport(null);
    setCursorIdx(null);
    setFrozen(false);
  }, []);

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(300)
        .onEnd(() => {
          runOnJS(resetViewport)();
        }),
    [resetViewport]
  );

  const composed = useMemo(
    () => Gesture.Simultaneous(doubleTap, pan, twoFingerPan, pinch),
    [doubleTap, pan, twoFingerPan, pinch]
  );

  const cursorTimestamp = cursorIdx != null ? (timestamps[cursorIdx] as number | null) : null;
  const cursorX = cursorTimestamp != null ? xToPx(cursorTimestamp) : null;

  const yAxisFormatter = props.yAxisFormatter || ((v: number) => `${Math.round(v * 100) / 100}`);

  const programLinePositions = useMemo(() => {
    if (!props.programLines) {
      return [];
    }
    return props.programLines
      .map<[number, string]>((p) => [xToPx(p[0]), p[1]])
      .filter(([px]) => px >= padLeft && px <= padLeft + plotWidth);
  }, [props.programLines, xToPx, padLeft, plotWidth]);

  const renderSvg = width > 0 && plotHeight > 0;
  const reactId = useId();
  const clipId = `lineChart-clip-${reactId.replace(/:/g, "")}`;

  const webContainerRef = useRef<View>(null);
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);
  const plotWidthRef = useRef(plotWidth);
  useEffect(() => {
    plotWidthRef.current = plotWidth;
  }, [plotWidth]);
  const padLeftRef = useRef(padLeft);
  useEffect(() => {
    padLeftRef.current = padLeft;
  }, [padLeft]);
  const timestampsRef = useRef(timestamps);
  useEffect(() => {
    timestampsRef.current = timestamps;
  }, [timestamps]);

  useEffect(() => {
    if (!IS_WEB) {
      return;
    }
    const node = webContainerRef.current as unknown as HTMLElement | null;
    if (!node) {
      return;
    }

    let dragStart: { clientX: number; xMin: number; xMax: number; moved: boolean } | null = null;

    const onMouseDown = (e: MouseEvent): void => {
      if (e.button !== 0) {
        return;
      }
      const v = viewportRef.current;
      dragStart = { clientX: e.clientX, xMin: v.xMin, xMax: v.xMax, moved: false };
      e.preventDefault();
    };

    const updateCursorAt = (clientX: number): number | null => {
      const rect = node.getBoundingClientRect();
      const xPx = clientX - rect.left;
      const v = viewportRef.current;
      const pw = plotWidthRef.current;
      if (pw <= 0) {
        return null;
      }
      const xVal = v.xMin + ((xPx - padLeftRef.current) / pw) * Math.max(1, v.xMax - v.xMin);
      const idx = findNearestIdx(timestampsRef.current, xVal, v.xMin, v.xMax);
      setCursorIdx(idx);
      return idx;
    };

    const onMouseMove = (e: MouseEvent): void => {
      if (dragStart) {
        const dx = e.clientX - dragStart.clientX;
        if (Math.abs(dx) > 2) {
          dragStart.moved = true;
        }
        const pw = plotWidthRef.current;
        if (pw <= 0) {
          return;
        }
        const range = dragStart.xMax - dragStart.xMin;
        const deltaSec = -(dx / pw) * range;
        setViewport({ xMin: dragStart.xMin + deltaSec, xMax: dragStart.xMax + deltaSec });
        return;
      }
      if (frozenRef.current) {
        return;
      }
      updateCursorAt(e.clientX);
    };

    const onMouseUp = (e: MouseEvent): void => {
      if (dragStart && !dragStart.moved) {
        const idx = updateCursorAt(e.clientX);
        if (idx != null) {
          setFrozen(true);
        }
      }
      dragStart = null;
    };

    const onMouseLeave = (): void => {
      if (!dragStart && !frozenRef.current) {
        setCursorIdx(null);
      }
    };

    const onWheel = (e: WheelEvent): void => {
      if (!frozenRef.current) {
        return;
      }
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const v = viewportRef.current;
      const pw = plotWidthRef.current;
      if (pw <= 0) {
        return;
      }
      const range = v.xMax - v.xMin;
      const focalPct = Math.max(0, Math.min(1, (focalX - padLeftRef.current) / pw));
      const xAtFocal = v.xMin + focalPct * range;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newRange = range / zoomFactor;
      const newXMin = xAtFocal - focalPct * newRange;
      setViewport({ xMin: newXMin, xMax: newXMin + newRange });
    };

    const onDocMouseDown = (e: MouseEvent): void => {
      if (!frozenRef.current) {
        return;
      }
      const target = e.target as Node | null;
      if (target && node.contains(target)) {
        return;
      }
      setFrozen(false);
      setCursorIdx(null);
    };

    const onDblClick = (e: MouseEvent): void => {
      e.preventDefault();
      resetViewport();
    };

    node.addEventListener("mousedown", onMouseDown);
    node.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    node.addEventListener("mouseleave", onMouseLeave);
    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("dblclick", onDblClick);
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => {
      node.removeEventListener("mousedown", onMouseDown);
      node.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      node.removeEventListener("mouseleave", onMouseLeave);
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("dblclick", onDblClick);
      document.removeEventListener("mousedown", onDocMouseDown, true);
    };
  }, [resetViewport, renderSvg]);

  const innerStyle = {
    width,
    height: props.height,
    ...(IS_WEB
      ? {
          cursor: "crosshair",
          outline: frozen ? `2px solid ${semantic.border.cardpurple}` : "none",
          outlineOffset: "2px",
          borderRadius: 4,
        }
      : null),
  } as object;

  return (
    <View onLayout={onLayout} style={{ width: "100%", height: props.height }}>
      {renderSvg && (
        <GestureDetector gesture={composed}>
          <View ref={webContainerRef} style={innerStyle}>
            <Svg width={width} height={props.height}>
              <Defs>
                <ClipPath id={clipId}>
                  <Rect x={padLeft} y={padTop} width={plotWidth} height={plotHeight} />
                </ClipPath>
              </Defs>
              <G>
                {yTicks.map((t, i) => {
                  const py = yToPx(t);
                  return (
                    <G key={`y-${i}`}>
                      <Line
                        x1={padLeft}
                        x2={padLeft + plotWidth}
                        y1={py}
                        y2={py}
                        stroke={colors.grid}
                        strokeWidth={0.5}
                      />
                      <SvgText x={padLeft - 6} y={py + 3} fill={colors.axisText} fontSize={10} textAnchor="end">
                        {yAxisFormatter(t)}
                      </SvgText>
                    </G>
                  );
                })}
              </G>

              <G>
                {xTicks.map((t, i) => {
                  const px = xToPx(t);
                  if (px < padLeft - 1 || px > padLeft + plotWidth + 1) {
                    return null;
                  }
                  return (
                    <G key={`x-${i}`}>
                      <Line
                        x1={px}
                        x2={px}
                        y1={padTop}
                        y2={padTop + plotHeight}
                        stroke={colors.grid}
                        strokeWidth={0.5}
                      />
                      {(() => {
                        const d = new Date(t * 1000);
                        const showYear = d.getFullYear() !== new Date().getFullYear();
                        return (
                          <>
                            <SvgText
                              x={px}
                              y={padTop + plotHeight + 14}
                              fill={colors.axisText}
                              fontSize={10}
                              textAnchor="middle"
                            >
                              {DateUtils_format(d, true, true)}
                            </SvgText>
                            {showYear && (
                              <SvgText
                                x={px}
                                y={padTop + plotHeight + 26}
                                fill={colors.axisText}
                                fontSize={10}
                                textAnchor="middle"
                              >
                                {d.getFullYear()}
                              </SvgText>
                            )}
                          </>
                        );
                      })()}
                    </G>
                  );
                })}
              </G>

              <G clipPath={`url(#${clipId})`}>
                {programLinePositions.map(([px, name], i) => {
                  const labelX = px + 3;
                  const labelY = padTop + 4;
                  return (
                    <G key={`prog-${i}`}>
                      <Line x1={px} x2={px} y1={padTop} y2={padTop + plotHeight} stroke={colors.grid} strokeWidth={1} />
                      <SvgText
                        x={labelX}
                        y={labelY}
                        fill={colors.secondary}
                        fontSize={9}
                        transform={`rotate(90, ${labelX}, ${labelY})`}
                      >
                        {name}
                      </SvgText>
                    </G>
                  );
                })}
              </G>

              <G>
                <Line
                  x1={padLeft}
                  x2={padLeft}
                  y1={padTop}
                  y2={padTop + plotHeight}
                  stroke={colors.grid}
                  strokeWidth={1}
                />
                <Line
                  x1={padLeft}
                  x2={padLeft + plotWidth}
                  y1={padTop + plotHeight}
                  y2={padTop + plotHeight}
                  stroke={colors.grid}
                  strokeWidth={1}
                />
              </G>

              <G clipPath={`url(#${clipId})`}>
                {props.series.map((s, i) => {
                  if (!s.show) {
                    return null;
                  }
                  const values = props.data[i + 1] || [];
                  const d = buildPath(timestamps, values, xToPx, yToPx);
                  if (!d) {
                    return null;
                  }
                  return <Path key={`series-${i}`} d={d} stroke={s.color} strokeWidth={s.width ?? 1.5} fill="none" />;
                })}
              </G>

              {cursorX != null && cursorIdx != null && (
                <G>
                  <Line
                    x1={cursorX}
                    x2={cursorX}
                    y1={padTop}
                    y2={padTop + plotHeight}
                    stroke={colors.cursor}
                    strokeWidth={1}
                    strokeDasharray="3,3"
                  />
                  {props.series.map((s, i) => {
                    if (!s.show) {
                      return null;
                    }
                    const v = props.data[i + 1]?.[cursorIdx];
                    if (v == null || !isFinite(v)) {
                      return null;
                    }
                    return (
                      <Circle
                        key={`cursor-${i}`}
                        cx={cursorX}
                        cy={yToPx(v)}
                        r={3.5}
                        fill={s.color}
                        stroke={colors.background}
                        strokeWidth={1}
                      />
                    );
                  })}
                </G>
              )}

              <Rect x={padLeft} y={padTop} width={plotWidth} height={plotHeight} fill="transparent" stroke="none" />
            </Svg>
          </View>
        </GestureDetector>
      )}
    </View>
  );
});
