import CheckBox from "@react-native-community/checkbox";
import { StringUtils } from "../utils/string";

interface ILftCheckboxProps {
  name: string;
  value: boolean;
  onChange?: (value: boolean) => void;
}

export function LftCheckbox(props: ILftCheckboxProps): JSX.Element {
  return (
    <CheckBox
      data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
      value={props.value}
      onValueChange={(e) => {
        if (props.onChange) {
          props.onChange(e);
        }
      }}
    />
  );
}
