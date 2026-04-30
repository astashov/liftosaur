import { JSX, ReactNode, useCallback, useMemo, useRef } from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export interface ILineChartGesturesArgs {
  plotWidth: number;
  padLeft: number;
  viewport: { xMin: number; xMax: number };
  setViewport: (vp: { xMin: number; xMax: number }) => void;
  resetViewport: () => void;
  setCursorAtPx: (xPx: number) => number | null;
  clearCursor: () => void;
}

export interface ILineChartGesturesResult {
  Wrap: (props: { children: ReactNode; style: StyleProp<ViewStyle> }) => JSX.Element;
  frozen: boolean;
  clearFrozen: () => void;
}

export function useLineChartGestures(args: ILineChartGesturesArgs): ILineChartGesturesResult {
  const { plotWidth, padLeft, viewport, setViewport, resetViewport, setCursorAtPx } = args;
  const { xMin, xMax } = viewport;

  const pinchStartRef = useRef<{ xMin: number; xMax: number; focalX: number } | null>(null);
  const panStartRef = useRef<{ xMin: number; xMax: number } | null>(null);

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
    [plotWidth, setViewport]
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
    [plotWidth, padLeft, setViewport]
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
          runOnJS(setCursorAtPx)(e.x);
        })
        .onUpdate((e) => {
          runOnJS(setCursorAtPx)(e.x);
        }),
    [setCursorAtPx]
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

  const composedRef = useRef(composed);
  composedRef.current = composed;

  const noopClearFrozen = useCallback(() => {}, []);

  const Wrap = useCallback(function LineChartGestureWrap(props: {
    children: ReactNode;
    style: StyleProp<ViewStyle>;
  }): JSX.Element {
    return (
      <GestureDetector gesture={composedRef.current}>
        <View style={props.style}>{props.children}</View>
      </GestureDetector>
    );
  }, []);

  return { Wrap, frozen: false, clearFrozen: noopClearFrozen };
}
