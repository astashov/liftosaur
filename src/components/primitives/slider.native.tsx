import { JSX } from "react";
import RNSlider from "@react-native-community/slider";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface ISliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

export function Slider(props: ISliderProps): JSX.Element {
  const colors = Tailwind_semantic();
  return (
    <RNSlider
      style={{ flex: 1 }}
      value={props.value}
      minimumValue={props.min}
      maximumValue={props.max}
      step={props.step ?? 1}
      minimumTrackTintColor={colors.text.link}
      maximumTrackTintColor={colors.border.neutral}
      onSlidingComplete={props.onChange}
    />
  );
}
