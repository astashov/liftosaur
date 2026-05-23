import { JSX, ReactNode, useState } from "react";
import {
  View,
  ScrollView,
  Platform,
  useWindowDimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../components/primitives/text";

interface IProps {
  children: ReactNode;
  header?: ReactNode | string;
  noPadding?: boolean;
  disableScroll?: boolean;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function FormSheet(props: IProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isAndroid = Platform.OS === "android";
  const bottomInset = isAndroid ? insets.bottom : 0;
  const hasHeader = props.header != null;
  const hasHeaderArea = hasHeader || isAndroid;
  const scrollPadding = props.noPadding ? "" : ["px-4", hasHeader ? null : "pt-4", "pb-4"].filter(Boolean).join(" ");
  const headerNode =
    typeof props.header === "string" ? (
      <View className="items-center py-4">
        <Text className="text-base font-semibold">{props.header}</Text>
      </View>
    ) : (
      props.header
    );

  const [contentH, setContentH] = useState(0);
  const [frameH, setFrameH] = useState(0);
  const needsScroll = contentH > frameH + 1;
  const scrollEnabled = !props.disableScroll || (isAndroid ? needsScroll : true);
  const nestedScrollEnabled = isAndroid && needsScroll;

  return (
    <>
      {hasHeaderArea && (
        <View collapsable={false}>
          {isAndroid && (
            <View className="items-center pt-2 pb-1">
              <View className="rounded-full bg-text-disabled" style={{ width: 36, height: 5 }} />
            </View>
          )}
          {hasHeader && headerNode}
        </View>
      )}
      <ScrollView
        style={{ maxHeight: windowHeight * 0.85 }}
        contentContainerClassName={scrollPadding}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={scrollEnabled}
        nestedScrollEnabled={nestedScrollEnabled}
        onContentSizeChange={(_w, h) => setContentH(h)}
        onLayout={(e: LayoutChangeEvent) => setFrameH(e.nativeEvent.layout.height)}
        onScroll={props.onScroll}
        scrollEventThrottle={16}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        {props.children}
      </ScrollView>
    </>
  );
}
