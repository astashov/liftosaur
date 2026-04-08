import { JSX, ReactNode, useState } from "react";
import { View, ScrollView, useWindowDimensions, LayoutChangeEvent } from "react-native";

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
  const { height: screenHeight } = useWindowDimensions();
  const maxHeight = Math.round(screenHeight * 0.7);
  const [contentHeight, setContentHeight] = useState(0);
  const needsScroll = contentHeight > maxHeight;
  const paddingCn = props.noPaddings ? "" : "px-4 pt-2 pb-6";

  const onContentLayout = (e: LayoutChangeEvent): void => {
    setContentHeight(e.nativeEvent.layout.height);
  };

  const content = (
    <View onLayout={onContentLayout} className={paddingCn}>
      {props.children}
    </View>
  );

  return (
    <View className="bg-background-default" style={needsScroll ? { height: maxHeight } : undefined}>
      {needsScroll ? <ScrollView>{content}</ScrollView> : content}
    </View>
  );
}
