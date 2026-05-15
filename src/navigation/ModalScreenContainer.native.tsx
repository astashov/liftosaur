import { JSX, ReactNode } from "react";
import { View, ScrollView, Animated, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCustomKeyboardAnimatedHeight } from "./CustomKeyboardContext";
import type { IScrollEventLike } from "../utils/useScrollProgressiveList";

interface IProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  isFullWidth?: boolean;
  isFullHeight?: boolean;
  noPaddings?: boolean;
  overflowHidden?: boolean;
  innerClassName?: string;
  shouldShowClose?: boolean;
  zIndex?: number;
  overlay?: ReactNode;
  overlayDetent?: number;
  onScroll?: (e: IScrollEventLike) => void;
}

export function ModalScreenContainer(props: IProps): JSX.Element {
  const animatedKeyboardHeight = useCustomKeyboardAnimatedHeight();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const androidBottomInset = Platform.OS === "android" ? insets.bottom : 0;
  const scrollView = (
    <ScrollView
      className={`bg-background-default ${props.noPaddings ? "" : "px-4 py-6"}`}
      contentContainerStyle={androidBottomInset > 0 ? { paddingBottom: androidBottomInset } : undefined}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      nestedScrollEnabled
      scrollEnabled={!props.overlay}
      onScroll={props.onScroll}
      scrollEventThrottle={100}
    >
      {props.children}
      <Animated.View style={{ height: animatedKeyboardHeight }} />
    </ScrollView>
  );

  if (!props.overlay) {
    return scrollView;
  }

  return (
    <View style={{ height: windowHeight * (props.overlayDetent ?? 1) }}>
      {scrollView}
      {props.overlay}
    </View>
  );
}
