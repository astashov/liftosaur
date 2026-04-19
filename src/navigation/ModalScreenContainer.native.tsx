import { JSX, ReactNode } from "react";
import { ScrollView, Animated } from "react-native";
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
}

export function ModalScreenContainer(props: IProps): JSX.Element {
  const animatedKeyboardHeight = useCustomKeyboardAnimatedHeight();
  return (
    <ScrollView
      className={`bg-background-default ${props.noPaddings ? "" : "px-4 pt-2 pb-6"}`}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {props.children}
      <Animated.View style={{ height: animatedKeyboardHeight }} />
    </ScrollView>
  );
}
