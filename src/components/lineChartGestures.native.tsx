import { JSX, ReactNode, useCallback, useMemo, useRef } from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useSharedValue } from "react-native-reanimated";

export interface ILineChartGesturesArgs {
  plotWidth: number;
  padLeft: number;
  viewport: { xMin: number; xMax: number };
  setViewport: (vp: { xMin: number; xMax: number }) => void;
  resetViewport: () => void;
  setCursorAtPx: (xPx: number) => number | null;
  clearCursor: () => void;
  isInteractive?: boolean;
}

export interface ILineChartGesturesResult {
  Wrap: (props: { children: ReactNode; style: StyleProp<ViewStyle> }) => JSX.Element;
  frozen: boolean;
  clearFrozen: () => void;
}

interface ITwoFingerSession {
  startXMin: number;
  startXMax: number;
  startFocalX: number;
  padLeft: number;
  plotWidth: number;
  scale: number;
  focalX: number;
}

export function useLineChartGestures(args: ILineChartGesturesArgs): ILineChartGesturesResult {
  const argsRef = useRef(args);
  argsRef.current = args;

  const sessionRef = useRef<ITwoFingerSession | null>(null);
  const isLifting = useSharedValue(false);

  const ensureSession = useCallback((focalX: number) => {
    if (sessionRef.current) {
      return;
    }
    const { viewport, padLeft, plotWidth } = argsRef.current;
    sessionRef.current = {
      startXMin: viewport.xMin,
      startXMax: viewport.xMax,
      startFocalX: focalX,
      padLeft,
      plotWidth,
      scale: 1,
      focalX,
    };
  }, []);

  const applyTransform = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.plotWidth <= 0) {
      return;
    }
    const startRange = s.startXMax - s.startXMin;
    const newRange = startRange / Math.max(0.05, s.scale);
    const focalPct = Math.max(0, Math.min(1, (s.startFocalX - s.padLeft) / s.plotWidth));
    const xAtFocal = s.startXMin + focalPct * startRange;
    const translationX = s.focalX - s.startFocalX;
    const deltaSec = -(translationX / s.plotWidth) * newRange;
    const newXMin = xAtFocal - focalPct * newRange + deltaSec;
    argsRef.current.setViewport({ xMin: newXMin, xMax: newXMin + newRange });
  }, []);

  const onPanStart = useCallback(
    (focalX: number) => {
      ensureSession(focalX);
    },
    [ensureSession]
  );

  const onPanUpdate = useCallback(
    (focalX: number) => {
      const s = sessionRef.current;
      if (!s) {
        return;
      }
      s.focalX = focalX;
      applyTransform();
    },
    [applyTransform]
  );

  const onPinchStart = useCallback(
    (focalX: number) => {
      ensureSession(focalX);
    },
    [ensureSession]
  );

  const onPinchUpdate = useCallback(
    (scale: number) => {
      const s = sessionRef.current;
      if (!s) {
        return;
      }
      s.scale = scale;
      applyTransform();
    },
    [applyTransform]
  );

  const onTwoFingerEnd = useCallback(() => {
    sessionRef.current = null;
  }, []);

  const setCursorAtPxStable = useCallback((xPx: number): void => {
    argsRef.current.setCursorAtPx(xPx);
  }, []);

  const resetViewportStable = useCallback((): void => {
    sessionRef.current = null;
    argsRef.current.resetViewport();
  }, []);

  const isInteractive = args.isInteractive !== false;

  const composed = useMemo(() => {
    const scrub = Gesture.Pan()
      .enabled(isInteractive)
      .minPointers(1)
      .maxPointers(1)
      .activateAfterLongPress(150)
      .onStart((e) => {
        runOnJS(setCursorAtPxStable)(e.x);
      })
      .onUpdate((e) => {
        runOnJS(setCursorAtPxStable)(e.x);
      });

    const twoFingerPan = Gesture.Pan()
      .enabled(isInteractive)
      .minPointers(2)
      .maxPointers(2)
      .onStart((e) => {
        isLifting.value = false;
        runOnJS(onPanStart)(e.x);
      })
      .onTouchesUp(() => {
        isLifting.value = true;
      })
      .onUpdate((e) => {
        if (isLifting.value) {
          return;
        }
        if (e.numberOfPointers !== 2) {
          return;
        }
        runOnJS(onPanUpdate)(e.x);
      })
      .onEnd(() => {
        isLifting.value = false;
        runOnJS(onTwoFingerEnd)();
      });

    const pinch = Gesture.Pinch()
      .enabled(isInteractive)
      .onStart((e) => {
        isLifting.value = false;
        runOnJS(onPinchStart)(e.focalX);
      })
      .onTouchesUp(() => {
        isLifting.value = true;
      })
      .onUpdate((e) => {
        if (isLifting.value) {
          return;
        }
        if (e.numberOfPointers !== 2) {
          return;
        }
        runOnJS(onPinchUpdate)(e.scale);
      })
      .onEnd(() => {
        isLifting.value = false;
        runOnJS(onTwoFingerEnd)();
      });

    const doubleTap = Gesture.Tap()
      .enabled(isInteractive)
      .numberOfTaps(2)
      .maxDuration(300)
      .onEnd(() => {
        runOnJS(resetViewportStable)();
      });

    return Gesture.Simultaneous(doubleTap, scrub, twoFingerPan, pinch);
  }, [
    isInteractive,
    isLifting,
    setCursorAtPxStable,
    onPanStart,
    onPanUpdate,
    onPinchStart,
    onPinchUpdate,
    onTwoFingerEnd,
    resetViewportStable,
  ]);

  const noopClearFrozen = useCallback(() => {}, []);

  const Wrap = useCallback(
    function LineChartGestureWrap(props: { children: ReactNode; style: StyleProp<ViewStyle> }): JSX.Element {
      return (
        <GestureDetector gesture={composed}>
          <View style={props.style}>{props.children}</View>
        </GestureDetector>
      );
    },
    [composed]
  );

  return { Wrap, frozen: false, clearFrozen: noopClearFrozen };
}
