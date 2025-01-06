import { StringUtils } from "../utils/string";

interface ILftCheckboxProps {
  name: string;
  value: boolean;
  onChange?: (value: boolean) => void;
}

export function LftCheckbox(props: ILftCheckboxProps): JSX.Element {
  return (
    <input
      type="checkbox"
      data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
      checked={props.value}
      onChange={(e) => {
        if (props.onChange) {
          props.onChange(e.target.checked);
        }
      }}
    />
  );
}
