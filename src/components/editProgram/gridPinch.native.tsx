import { JSX, ReactNode, useCallback, useMemo, useRef } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export const GRID_SCALE_MIN = 0.45;
export const GRID_SCALE_MAX = 2.2;

export interface IGridPinchArgs {
  scale: number;
  onScaleChange: (scale: number) => void;
}

export interface IGridPinchResult {
  Wrap: (props: { children: ReactNode }) => JSX.Element;
}

export function useGridPinch(args: IGridPinchArgs): IGridPinchResult {
  const scaleRef = useRef(args.scale);
  scaleRef.current = args.scale;
  const startScaleRef = useRef(args.scale);
  const onScaleChange = args.onScaleChange;

  const onPinchStart = useCallback(() => {
    startScaleRef.current = scaleRef.current;
  }, []);

  const onPinchUpdate = useCallback(
    (factor: number) => {
      const next = Math.min(GRID_SCALE_MAX, Math.max(GRID_SCALE_MIN, startScaleRef.current * factor));
      // Quantized so a pinch doesn't re-render the grid for sub-pixel column changes.
      const rounded = Math.round(next * 100) / 100;
      if (rounded !== scaleRef.current) {
        onScaleChange(rounded);
      }
    },
    [onScaleChange]
  );

  const gesture = useMemo(() => {
    return Gesture.Pinch()
      .onStart(() => {
        runOnJS(onPinchStart)();
      })
      .onUpdate((e) => {
        runOnJS(onPinchUpdate)(e.scale);
      });
  }, [onPinchStart, onPinchUpdate]);

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
