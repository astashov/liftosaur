import { JSX, ReactNode, useCallback, useMemo, useRef } from "react";
import { ScrollViewProps, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS, useAnimatedProps, useSharedValue } from "react-native-reanimated";

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
  // For the horizontal scroller's `animatedProps` — see `pointerCount` below for why it can't be
  // an ordinary prop.
  scrollAnimatedProps?: Partial<ScrollViewProps>;
  canPinch: boolean;
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

  // A pinch and the scroller under it are mutually exclusive on iOS: RNGH grants automatic
  // simultaneity only to its own native-view handler, so for a pinch against a UIScrollView's pan
  // whichever recognizes first prevents the other for the rest of the touch. Two fingers never
  // land at the same instant, so the first one would often start a scroll and kill the pinch
  // before it began. Nothing can be declared to fix that — the fix is for the scroller to stop
  // being a competitor the moment a second finger arrives.
  //
  // Touch callbacks fire from the raw platform touch, before this gesture activates and whatever
  // state it is in, so they see the second finger land. They are worklets, and so is the props
  // updater, which is the point: the scroller is disabled in the same frame rather than a JS
  // round-trip later, which is far too late to win the race described above.
  const pointerCount = useSharedValue(0);
  const scrollAnimatedProps = useAnimatedProps<ScrollViewProps>(() => ({ scrollEnabled: pointerCount.value < 2 }));

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
      .onTouchesDown((e) => {
        pointerCount.value = e.numberOfTouches;
      })
      .onTouchesUp((e) => {
        pointerCount.value = e.numberOfTouches;
      })
      .onTouchesCancelled((e) => {
        pointerCount.value = e.numberOfTouches;
      })
      .onStart(() => {
        runOnJS(onPinchStart)();
      })
      .onUpdate((e) => {
        runOnJS(onPinchUpdate)(e.scale);
      })
      .onFinalize(() => {
        runOnJS(onPinchEnd)();
      });
  }, [onPinchStart, onPinchUpdate, onPinchEnd, pointerCount]);

  const Wrap = useCallback(
    (props: { children: ReactNode }): JSX.Element => (
      <GestureDetector gesture={gesture}>
        <View collapsable={false}>{props.children}</View>
      </GestureDetector>
    ),
    [gesture]
  );

  return { Wrap, scrollAnimatedProps, canPinch: true };
}
