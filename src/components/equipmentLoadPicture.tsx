import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { PlatesBar } from "./platesBar";
import { IEquipmentLoadPicture } from "../models/equipmentLoadText";
import { Tailwind_semantic } from "../utils/tailwindConfig";

type IEquipmentLoadPictureSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<IEquipmentLoadPictureSize, { barHeights: number[]; text: string; label: string; dot: string }> = {
  sm: { barHeights: [18, 14, 12], text: "text-xs font-semibold", label: "w-12 text-xs", dot: "w-2 h-2" },
  md: { barHeights: [24, 18, 16], text: "text-sm font-semibold", label: "w-14 text-xs", dot: "w-3 h-3" },
  lg: { barHeights: [32, 22, 18], text: "text-base font-bold", label: "w-14 text-xs", dot: "w-3 h-3" },
  xl: { barHeights: [28, 22, 18], text: "text-2xl font-semibold", label: "w-16 text-sm", dot: "w-4 h-4" },
};

interface IProps {
  picture: IEquipmentLoadPicture;
  size: IEquipmentLoadPictureSize;
  testID: string;
  highlightMismatch?: boolean;
}

export function EquipmentLoadPicture(props: IProps): JSX.Element {
  const size = SIZES[props.size];
  const { bars, chips } = props.picture;
  const color = props.highlightMismatch && !props.picture.exact ? "text-text-error" : "text-text-primary";
  if (bars != null) {
    const barHeight = size.barHeights[Math.min(bars.length, size.barHeights.length) - 1];
    return (
      <View>
        {bars.map((bar, index) => (
          <View key={index} className={`flex-row items-center ${index > 0 ? "mt-1" : ""}`} style={{ gap: 8 }}>
            {bar.name != null && (
              <Text className={`${size.label} text-text-secondary`} numberOfLines={1}>
                {bar.name}
              </Text>
            )}
            <PlatesBar plates={bar.plates} height={barHeight} />
            <Text
              className={`flex-1 ${size.text} ${color}`}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.5}
              testID={bar.name != null ? `${props.testID}-horn-${index}` : props.testID}
              data-testid={bar.name != null ? `${props.testID}-horn-${index}` : props.testID}
            >
              {bar.text}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      {chips?.map((chip, index) => (
        <View
          key={index}
          className={`${size.dot} rounded-full`}
          style={{ backgroundColor: Tailwind_semantic().band[chip.color] }}
        />
      ))}
      <Text
        className={`flex-1 ${chips != null ? "ml-1" : ""} ${size.text} ${color}`}
        testID={props.testID}
        data-testid={props.testID}
      >
        {props.picture.text}
      </Text>
    </View>
  );
}
