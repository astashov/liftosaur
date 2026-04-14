import React, { JSX, useCallback, useLayoutEffect, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

interface IDraggableList2Props<T> {
  items: T[];
  mode?: "vertical";
  element: (item: T, index: number, dragHandle: (children: React.ReactNode) => JSX.Element) => JSX.Element;
  onDragEnd: (startIndex: number, endIndex: number) => void;
  delayMs?: number;
}

export function DraggableList2<T>(props: IDraggableList2Props<T>): JSX.Element {
  const heightsRef = useRef<number[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [activeHeight, setActiveHeight] = useState<number>(0);

  const onItemLayout = useCallback((index: number, h: number) => {
    heightsRef.current[index] = h;
  }, []);

  const computeTargetIndex = useCallback(
    (fromIndex: number, translationY: number): number => {
      const heights = heightsRef.current;
      let target = fromIndex;
      let acc = 0;
      if (translationY >= 0) {
        for (let i = fromIndex + 1; i < props.items.length; i++) {
          const h = heights[i] || 0;
          if (translationY > acc + h / 2) {
            target = i;
            acc += h;
          } else {
            break;
          }
        }
      } else {
        for (let i = fromIndex - 1; i >= 0; i--) {
          const h = heights[i] || 0;
          if (-translationY > acc + h / 2) {
            target = i;
            acc += h;
          } else {
            break;
          }
        }
      }
      return target;
    },
    [props.items.length]
  );

  return (
    <View>
      {props.items.map((item, i) => (
        <DraggableItem<T>
          key={i}
          index={i}
          item={item}
          element={props.element}
          activeIndex={activeIndex}
          targetIndex={targetIndex}
          activeHeight={activeHeight}
          onLayoutHeight={onItemLayout}
          onDragStart={() => {
            setActiveIndex(i);
            setTargetIndex(i);
            setActiveHeight(heightsRef.current[i] || 0);
          }}
          onDragUpdate={(ty) => setTargetIndex(computeTargetIndex(i, ty))}
          onDragEnd={(ty) => {
            const target = computeTargetIndex(i, ty);
            setActiveIndex(null);
            setTargetIndex(null);
            setActiveHeight(0);
            props.onDragEnd(i, target);
          }}
          delayMs={props.delayMs}
        />
      ))}
    </View>
  );
}

interface IDraggableItemProps<T> {
  index: number;
  item: T;
  element: (item: T, index: number, dragHandle: (children: React.ReactNode) => JSX.Element) => JSX.Element;
  activeIndex: number | null;
  targetIndex: number | null;
  activeHeight: number;
  onLayoutHeight: (index: number, height: number) => void;
  onDragStart: () => void;
  onDragUpdate: (translationY: number) => void;
  onDragEnd: (translationY: number) => void;
  delayMs?: number;
}

function DraggableItem<T>(props: IDraggableItemProps<T>): JSX.Element {
  const translateY = useSharedValue(0);
  const shiftY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      props.onLayoutHeight(props.index, e.nativeEvent.layout.height);
    },
    [props.index, props.onLayoutHeight]
  );

  const { activeIndex, targetIndex, activeHeight, index } = props;
  useLayoutEffect(() => {
    if (activeIndex !== index) {
      isDragging.value = false;
      translateY.value = 0;
    }
    if (activeIndex == null || activeIndex === index) {
      shiftY.value = 0;
      return;
    }
    const effectiveTarget = targetIndex ?? activeIndex;
    let shift = 0;
    if (activeIndex < index && effectiveTarget >= index) {
      shift = -activeHeight;
    } else if (activeIndex > index && effectiveTarget <= index) {
      shift = activeHeight;
    }
    shiftY.value = withTiming(shift, { duration: 150 });
  }, [activeIndex, targetIndex, activeHeight, index, shiftY, translateY, isDragging]);

  const pan = Gesture.Pan()
    .activateAfterLongPress(props.delayMs ?? 150)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(props.onDragStart)();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      runOnJS(props.onDragUpdate)(e.translationY);
    })
    .onEnd((e) => {
      runOnJS(props.onDragEnd)(e.translationY);
    })
    .onFinalize(() => {
      if (isDragging.value) {
        runOnJS(props.onDragEnd)(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isDragging.value ? translateY.value : shiftY.value }],
    zIndex: isDragging.value ? 100 : 0,
  }));

  const isActive = props.activeIndex === props.index;

  const handleRender = useCallback(
    (children: React.ReactNode): JSX.Element => (
      <GestureDetector gesture={pan}>
        <Animated.View
          style={(Platform.OS === "web" ? ({ cursor: "grab" } as unknown as object) : undefined) as never}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    ),
    [pan]
  );

  const content = props.element(props.item, props.index, handleRender);

  return (
    <Animated.View
      onLayout={onLayout}
      className={isActive ? "bg-background-default" : undefined}
      style={animatedStyle}
    >
      {content}
    </Animated.View>
  );
}
