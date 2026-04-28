import { JSX } from "react";
import { Switch as RNSwitch } from "react-native";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface ISwitchProps {
  value: boolean | undefined;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

export function Switch(props: ISwitchProps): JSX.Element {
  return (
    <RNSwitch
      value={!!props.value}
      disabled={props.disabled}
      trackColor={{ false: "#d1d5db", true: Tailwind_semantic().icon.purple }}
      onValueChange={props.onValueChange}
      testID={props.testID}
    />
  );
}
