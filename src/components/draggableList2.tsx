import React, { JSX, useCallback, useLayoutEffect, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type IDraggableMode = "vertical" | "horizontal";

interface IDraggableList2Props<T> {
  items: T[];
  mode?: IDraggableMode;
  isDisabled?: boolean;
  element: (item: T, index: number, dragHandle: (children: React.ReactNode) => JSX.Element) => JSX.Element;
  onDragEnd: (startIndex: number, endIndex: number) => void;
  delayMs?: number;
}

export function DraggableList2<T>(props: IDraggableList2Props<T>): JSX.Element {
  const mode: IDraggableMode = props.mode ?? "vertical";
  const sizesRef = useRef<number[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [activeSize, setActiveSize] = useState<number>(0);

  const onItemLayout = useCallback((index: number, size: number) => {
    sizesRef.current[index] = size;
  }, []);

  const computeTargetIndex = useCallback(
    (fromIndex: number, translation: number): number => {
      const sizes = sizesRef.current;
      let target = fromIndex;
      let acc = 0;
      if (translation >= 0) {
        for (let i = fromIndex + 1; i < props.items.length; i++) {
          const h = sizes[i] || 0;
          if (translation > acc + h / 2) {
            target = i;
            acc += h;
          } else {
            break;
          }
        }
      } else {
        for (let i = fromIndex - 1; i >= 0; i--) {
          const h = sizes[i] || 0;
          if (-translation > acc + h / 2) {
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

  const containerStyle = mode === "horizontal" ? { flexDirection: "row" as const } : undefined;

  return (
    <View style={containerStyle}>
      {props.items.map((item, i) => (
        <DraggableItem<T>
          key={i}
          index={i}
          item={item}
          mode={mode}
          isDisabled={props.isDisabled}
          element={props.element}
          activeIndex={activeIndex}
          targetIndex={targetIndex}
          activeSize={activeSize}
          onLayoutSize={onItemLayout}
          onDragStart={() => {
            setActiveIndex(i);
            setTargetIndex(i);
            setActiveSize(sizesRef.current[i] || 0);
          }}
          onDragUpdate={(t) => setTargetIndex(computeTargetIndex(i, t))}
          onDragEnd={(t) => {
            const target = computeTargetIndex(i, t);
            setActiveIndex(null);
            setTargetIndex(null);
            setActiveSize(0);
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
  mode: IDraggableMode;
  isDisabled?: boolean;
  element: (item: T, index: number, dragHandle: (children: React.ReactNode) => JSX.Element) => JSX.Element;
  activeIndex: number | null;
  targetIndex: number | null;
  activeSize: number;
  onLayoutSize: (index: number, size: number) => void;
  onDragStart: () => void;
  onDragUpdate: (translation: number) => void;
  onDragEnd: (translation: number) => void;
  delayMs?: number;
}

function DraggableItem<T>(props: IDraggableItemProps<T>): JSX.Element {
  const translate = useSharedValue(0);
  const shift = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const isHorizontal = props.mode === "horizontal";

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const size = isHorizontal ? e.nativeEvent.layout.width : e.nativeEvent.layout.height;
      props.onLayoutSize(props.index, size);
    },
    [props.index, props.onLayoutSize, isHorizontal]
  );

  const { activeIndex, targetIndex, activeSize, index } = props;
  useLayoutEffect(() => {
    if (activeIndex !== index) {
      isDragging.value = false;
      translate.value = 0;
    }
    if (activeIndex == null || activeIndex === index) {
      shift.value = 0;
      return;
    }
    const effectiveTarget = targetIndex ?? activeIndex;
    let next = 0;
    if (activeIndex < index && effectiveTarget >= index) {
      next = -activeSize;
    } else if (activeIndex > index && effectiveTarget <= index) {
      next = activeSize;
    }
    shift.value = withTiming(next, { duration: 150 });
  }, [activeIndex, targetIndex, activeSize, index, shift, translate, isDragging]);

  const pan = Gesture.Pan()
    .activateAfterLongPress(props.delayMs ?? 150)
    .enabled(!props.isDisabled)
    .onStart(() => {
      isDragging.value = true;
      runOnJS(props.onDragStart)();
    })
    .onUpdate((e) => {
      const t = isHorizontal ? e.translationX : e.translationY;
      translate.value = t;
      runOnJS(props.onDragUpdate)(t);
    })
    .onEnd((e) => {
      const t = isHorizontal ? e.translationX : e.translationY;
      isDragging.value = false;
      runOnJS(props.onDragEnd)(t);
    })
    .onFinalize(() => {
      if (isDragging.value) {
        isDragging.value = false;
        runOnJS(props.onDragEnd)(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const value = isDragging.value ? translate.value : shift.value;
    const transform = isHorizontal ? [{ translateX: value }] : [{ translateY: value }];
    return {
      transform,
      zIndex: isDragging.value ? 100 : 0,
    };
  });

  const isActive = props.activeIndex === props.index;

  const handleRender = useCallback(
    (children: React.ReactNode): JSX.Element => (
      <GestureDetector gesture={pan}>
        <Animated.View style={(Platform.OS === "web" ? ({ cursor: "grab" } as unknown as object) : undefined) as never}>
          {children}
        </Animated.View>
      </GestureDetector>
    ),
    [pan]
  );

  const content = props.element(props.item, props.index, handleRender);

  return (
    <Animated.View onLayout={onLayout} className={isActive ? "bg-background-default" : undefined} style={animatedStyle}>
      {content}
    </Animated.View>
  );
}
