import { JSX, ReactNode, useCallback, useMemo, useRef } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export const GRID_SCALE_MIN = 0.45;
export const GRID_SCALE_MAX = 2.2;

// A pinch runs through the whole range in a second or so, and every step of it used to be a global
// state dispatch — the app's one reducer, its diagnostics and its context fan-out, ~100 times, each
// one re-rendering the entire grid. So a pinch previews (the grid's own state) and commits once, on
// release, which is the only value worth remembering.
export interface IGridPinchArgs {
  scale: number;
  onScalePreview: (scale: number) => void;
  onScaleCommit: (scale: number) => void;
}

export interface IGridPinchResult {
  Wrap: (props: { children: ReactNode }) => JSX.Element;
}

// Coarse on purpose: a step finer than this moves a column by under a pixel, so it costs a render
// and shows nothing.
const SCALE_STEP = 0.05;

export function useGridPinch(args: IGridPinchArgs): IGridPinchResult {
  const scaleRef = useRef(args.scale);
  scaleRef.current = args.scale;
  const startScaleRef = useRef(args.scale);
  const onScalePreview = args.onScalePreview;
  const onScaleCommit = args.onScaleCommit;

  const onPinchStart = useCallback(() => {
    startScaleRef.current = scaleRef.current;
  }, []);

  const onPinchUpdate = useCallback(
    (factor: number) => {
      const next = Math.min(GRID_SCALE_MAX, Math.max(GRID_SCALE_MIN, startScaleRef.current * factor));
      const rounded = Math.round(next / SCALE_STEP) * SCALE_STEP;
      if (rounded !== scaleRef.current) {
        onScalePreview(rounded);
      }
    },
    [onScalePreview]
  );

  const onPinchEnd = useCallback(() => {
    onScaleCommit(scaleRef.current);
  }, [onScaleCommit]);

  const gesture = useMemo(() => {
    return Gesture.Pinch()
      .onStart(() => {
        runOnJS(onPinchStart)();
      })
      .onUpdate((e) => {
        runOnJS(onPinchUpdate)(e.scale);
      })
      .onFinalize(() => {
        runOnJS(onPinchEnd)();
      });
  }, [onPinchStart, onPinchUpdate, onPinchEnd]);

  const Wrap = useCallback(
    (props: { children: ReactNode }): JSX.Element => (
      <GestureDetector gesture={gesture}>
        <View collapsable={false}>{props.children}</View>
      </GestureDetector>
    ),
    [gesture]
  );

  return { Wrap };
}
