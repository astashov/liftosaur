import { TouchableOpacity, View } from "react-native";
import { LftText } from "./lftText"; // Assuming LftText is in the same directory

interface IProps {
  title: string;
  name: string;
  icon: JSX.Element;
  isFirst?: boolean;
  description: string | JSX.Element;
  className?: string;
  onClick: () => void;
}

export function BottomSheetItem(props: IProps): JSX.Element {
  return (
    <TouchableOpacity
      data-cy={`bottom-sheet-${props.name}`}
      className={`block text-base w-full text-left ${!props.isFirst ? "border-t border-grayv2-100 mt-4" : ""} ${
        props.className
      } nm-${props.name}`}
      onPress={props.onClick}
    >
      <View className={`flex flex-row items-center ${!props.isFirst ? "pt-4" : ""}`}>
        <View>{props.icon}</View>
        <LftText className="flex-1 pl-3">{props.title}</LftText>
      </View>
      <LftText className="pt-2 text-xs text-grayv2-main">{props.description}</LftText>
    </TouchableOpacity>
  );
}
