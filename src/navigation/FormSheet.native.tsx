import { JSX, ReactNode } from "react";
import { View, ScrollView, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface IProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function FormSheet(props: IProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isAndroid = Platform.OS === "android";
  const bottomInset = isAndroid ? insets.bottom : 0;
  return (
    <>
      {isAndroid && (
        <View className="items-center pt-2 pb-1">
          <View className="rounded-full bg-text-disabled" style={{ width: 36, height: 5 }} />
        </View>
      )}
      <ScrollView
        style={{ maxHeight: windowHeight * 0.85 }}
        contentContainerClassName={props.noPadding ? "" : "px-4 pt-4"}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        {props.children}
      </ScrollView>
    </>
  );
}
