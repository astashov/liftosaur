import { forwardRef, Ref } from "react";
import { View, ScrollView, SafeAreaView } from "react-native";

interface IProps {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  addons?: React.ReactNode;
  children: React.ReactNode;
  onScroll?: (atEnd: boolean) => void;
}

export const Surface = forwardRef((props: IProps, ref: Ref<HTMLElement>): JSX.Element => {
  const onScroll = props.onScroll;
  return (
    <SafeAreaView className="flex-1">
      <View className="w-full h-full">
        {props.navbar}

        <ScrollView
          data-cy="screen"
          onScroll={
            onScroll
              ? (e) => {
                  const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
                  onScroll(contentOffset.y + layoutMeasurement.height >= contentSize.height - 100);
                }
              : undefined
          }
        >
          <View className="flex-1 w-full safe-area-inset-bottom safe-area-inset-top web:pt-16">{props.children}</View>
        </ScrollView>
        {props.footer}
        {props.addons}
      </View>
    </SafeAreaView>
  );
});
