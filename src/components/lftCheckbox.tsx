import { TouchableOpacity } from "react-native";
import { StringUtils } from "../utils/string";
import { useState } from "react";
import { IconCheckCircle } from "./icons/iconCheckCircle";

interface ILftCheckboxProps {
  name: string;
  value: boolean;
  onChange?: (value: boolean) => void;
}

export function LftCheckbox(props: ILftCheckboxProps): JSX.Element {
  const [isChecked, setIsChecked] = useState<boolean>(props.value);

  return (
    <TouchableOpacity
      data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
      className="p-2"
      onPress={(e) => {
        if (props.onChange) {
          props.onChange(!isChecked);
        }
        setIsChecked(!isChecked);
      }}
    >
      <IconCheckCircle isChecked={isChecked} />
    </TouchableOpacity>
  );
}
