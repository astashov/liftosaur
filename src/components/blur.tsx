import { BlurView } from "@react-native-community/blur";
import { View } from "react-native";

export function Blur(props: { blur: number; children: React.ReactNode }): JSX.Element {
  return (
    <View className="absolute inset-0 z-10 items-center justify-center">
      <BlurView
        style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0 }}
        blurType="light"
        blurAmount={props.blur}
      />
      {props.children}
    </View>
  );
}
