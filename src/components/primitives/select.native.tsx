import { JSX } from "react";
import { ActionSheetIOS, Pressable } from "react-native";
import { Text } from "./text";

interface ISelectOption {
  value: string;
  label: string;
}

interface ISelectProps {
  value: string;
  options: ISelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function Select(props: ISelectProps): JSX.Element {
  const currentLabel = props.options.find((o) => o.value === props.value)?.label ?? "Select...";

  const showPicker = (): void => {
    const labels = props.options.map((o) => o.label).concat("Cancel");
    ActionSheetIOS.showActionSheetWithOptions(
      { options: labels, cancelButtonIndex: labels.length - 1 },
      (buttonIndex) => {
        if (buttonIndex < props.options.length) {
          props.onChange(props.options[buttonIndex].value);
        }
      }
    );
  };

  return (
    <Pressable onPress={showPicker} className="border rounded border-border-neutral bg-background-default px-2 py-1">
      <Text className="text-xs text-text-primary">{currentLabel}</Text>
    </Pressable>
  );
}
