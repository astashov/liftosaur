import { forwardRef, Ref } from "react";
import { View } from "react-native";

interface IProps {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  addons?: React.ReactNode;
  children: React.ReactNode;
}

export const Surface = forwardRef((props: IProps, ref: Ref<HTMLElement>): JSX.Element => {
  return (
    <View className="w-full h-full">
      {props.navbar}
      <View data-cy="screen" className="flex-row w-full py-16">
        <View className="flex-1 w-full safe-area-inset-bottom safe-area-inset-top">{props.children}</View>
      </View>
      {props.footer}
      {props.addons}
    </View>
  );
});
