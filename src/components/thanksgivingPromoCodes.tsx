import { JSX } from "react";
import { Platform, View } from "react-native";
import { Text } from "./primitives/text";
import { ThanksgivingPromo_codes, ThanksgivingPromo_validText } from "../models/thanksgivingPromo";

interface IProps {
  isCompact?: boolean;
}

export function ThanksgivingPromoCodes(props: IProps): JSX.Element {
  const textSize = props.isCompact ? "text-xs" : "text-sm";
  const codeSize = props.isCompact ? "text-sm" : "text-base";
  return (
    <View>
      <View className={props.isCompact ? "mb-2" : "mb-4 items-center"}>
        <Text className={props.isCompact ? "text-sm" : "text-base"}>
          <Text className={`font-bold text-text-purple${props.isCompact ? "text-sm" : "text-lg"}`}>30%</Text> off
        </Text>
        <Text className={textSize}>first year of monthly or yearly subscription</Text>
      </View>
      <View className={props.isCompact ? "mb-2" : "mb-4 items-center"}>
        {ThanksgivingPromo_codes(Platform.OS).map((c) => (
          <Text key={c.code} className={codeSize}>
            <Text className={`font-bold ${codeSize}`}>{c.label}: </Text>
            <Text selectable className={`font-bold text-text-purple ${codeSize}`}>
              {c.code}
            </Text>
          </Text>
        ))}
        <Text className="text-xs text-text-secondary">{ThanksgivingPromo_validText}</Text>
      </View>
      <Text className={`text-text-secondary ${props.isCompact ? "text-xs" : "text-sm text-center"}`}>
        {props.isCompact
          ? 'Enter the code with "Redeem coupon" below.'
          : 'Enter the code with "Redeem coupon" at the bottom of the subscription screen.'}
      </Text>
    </View>
  );
}
