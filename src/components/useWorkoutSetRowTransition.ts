import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, ViewStyle } from "react-native";
import { AnimatedStyle, Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import {
  IWorkoutSetRowTransition,
  IWorkoutSetRowTransitionEffect,
  IWorkoutSetRowTransitionEvent,
  WorkoutSetRowTransition_initial,
  WorkoutSetRowTransition_step,
} from "../utils/workoutSetRowTransition";

const DURATION_MS = 220;
// The leaving copy is a live second render of the row. On web that doubles every test id on the
// page for the length of the fade, so web animates height and fades the new body in only.
const KEEPS_LEAVING_COPY = Platform.OS !== "web";

export interface IWorkoutSetRowTransitionHandle {
  shownExpanded: boolean;
  leavingExpanded: boolean | undefined;
  isMeasured: boolean;
  containerStyle: AnimatedStyle<ViewStyle>;
  enteringStyle: AnimatedStyle<ViewStyle>;
  leavingStyle: AnimatedStyle<ViewStyle>;
  onContentLayout: (e: LayoutChangeEvent) => void;
}

// Why the height is always shared-value driven and why a swap takes two commits:
// lambda/scripts/archdocs/workout-screen.md, "Set row transition".
export function useWorkoutSetRowTransition(targetExpanded: boolean): IWorkoutSetRowTransitionHandle {
  const [state, setState] = useState<IWorkoutSetRowTransition>(() =>
    WorkoutSetRowTransition_initial(targetExpanded, KEEPS_LEAVING_COPY)
  );
  const stateRef = useRef(state);
  const [isMeasured, setIsMeasured] = useState(false);
  const contentHeightRef = useRef(0);
  const enteringOpacity = useSharedValue(1);
  const leavingOpacity = useSharedValue(0);
  const height = useSharedValue(0);
  const sendRef = useRef<(event: IWorkoutSetRowTransitionEvent) => void>(() => undefined);

  const onFinished = useCallback(() => {
    sendRef.current({ kind: "finished", height: contentHeightRef.current });
  }, []);

  const runEffect = useCallback(
    (effect: IWorkoutSetRowTransitionEffect) => {
      switch (effect.kind) {
        case "hold": {
          height.value = effect.height;
          leavingOpacity.value = 1;
          break;
        }
        case "swap": {
          enteringOpacity.value = 0;
          break;
        }
        case "resize": {
          height.value = withTiming(effect.to, { duration: DURATION_MS, easing: Easing.linear }, (finished) => {
            if (finished) {
              runOnJS(onFinished)();
            }
          });
          enteringOpacity.value = withTiming(1, { duration: DURATION_MS, easing: Easing.linear });
          leavingOpacity.value = withTiming(0, { duration: DURATION_MS, easing: Easing.linear });
          break;
        }
        case "settle": {
          height.value = effect.height;
          enteringOpacity.value = 1;
          leavingOpacity.value = 0;
          break;
        }
        case "follow": {
          height.value = effect.height;
          setIsMeasured(true);
          break;
        }
      }
    },
    [height, enteringOpacity, leavingOpacity, onFinished]
  );

  sendRef.current = (event: IWorkoutSetRowTransitionEvent): void => {
    const step = WorkoutSetRowTransition_step(stateRef.current, event);
    if (step.state !== stateRef.current) {
      stateRef.current = step.state;
      setState(step.state);
    }
    for (const effect of step.effects) {
      runEffect(effect);
    }
  };

  useEffect(() => {
    sendRef.current({ kind: "target", expanded: targetExpanded, currentHeight: contentHeightRef.current });
  }, [targetExpanded]);

  const phase = state.phase;
  useEffect(() => {
    if (phase === "leaving") {
      sendRef.current({ kind: "overlayMounted" });
    }
  }, [phase]);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    contentHeightRef.current = e.nativeEvent.layout.height;
    sendRef.current({ kind: "measured", height: e.nativeEvent.layout.height });
  }, []);

  const isAnimating = phase !== "idle";
  const containerStyle = useAnimatedStyle(
    () => ({ height: height.value, overflow: isAnimating ? "hidden" : "visible" }),
    [isAnimating]
  );
  const enteringStyle = useAnimatedStyle(() => ({ opacity: enteringOpacity.value }));
  const leavingStyle = useAnimatedStyle(() => ({ opacity: leavingOpacity.value }));

  return {
    shownExpanded: state.shownExpanded,
    leavingExpanded: state.leavingExpanded,
    isMeasured,
    containerStyle,
    enteringStyle,
    leavingStyle,
    onContentLayout,
  };
}
