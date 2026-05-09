import { JSX, ReactNode } from "react";
import { View, ScrollView, Animated, useWindowDimensions } from "react-native";
import { useCustomKeyboardAnimatedHeight } from "./CustomKeyboardContext";

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
}

export function ModalScreenContainer(props: IProps): JSX.Element {
  const animatedKeyboardHeight = useCustomKeyboardAnimatedHeight();
  const { height: windowHeight } = useWindowDimensions();
  const scrollView = (
    <ScrollView
      className={`bg-background-default ${props.noPaddings ? "" : "px-4 py-6"}`}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      nestedScrollEnabled
      scrollEnabled={!props.overlay}
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
