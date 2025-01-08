import { forwardRef, Ref } from "react";
import { View, ScrollView, SafeAreaView } from "react-native";

interface IProps {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  addons?: React.ReactNode;
  children: React.ReactNode;
}

export const Surface = forwardRef((props: IProps, ref: Ref<HTMLElement>): JSX.Element => {
  return (
    <SafeAreaView className="flex-1">
      <View className="w-full h-full">
        {props.navbar}
        <ScrollView data-cy="screen">
          <View className="flex-1 w-full safe-area-inset-bottom safe-area-inset-top">{props.children}</View>
        </ScrollView>
        {props.footer}
        {props.addons}
      </View>
    </SafeAreaView>
  );
});
