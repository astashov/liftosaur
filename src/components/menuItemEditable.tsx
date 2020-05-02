import { h, JSX, Fragment } from "preact";
import { IconDelete } from "./iconDelete";
import { MenuItemWrapper } from "./menuItem";

type IMenuItemType = "text" | "number";

interface IMenuItemEditableValueProps {
  type: IMenuItemType;
  value: string | null;
  valueUnits?: string;
  onChange?: (v?: string) => void;
}

interface IMenuItemEditableProps extends IMenuItemEditableValueProps {
  name: string;
  hasClear?: boolean;
}

export function MenuItemEditable(props: IMenuItemEditableProps): JSX.Element {
  return (
    <MenuItemWrapper>
      <label className="flex flex-1">
        <span className="flex items-center flex-1 py-2">{props.name}</span>
        <Fragment>
          <MenuItemValue type={props.type} value={props.value} onChange={props.onChange} />
          {props.value != null && <span className="flex items-center text-gray-700">{props.valueUnits}</span>}
        </Fragment>
      </label>
      {props.value != null && props.hasClear && (
        <button onClick={() => props.onChange && props.onChange(undefined)} className="p-2">
          <IconDelete />
        </button>
      )}
    </MenuItemWrapper>
  );
}

function MenuItemValue(props: IMenuItemEditableValueProps): JSX.Element | null {
  if (props.type === "text") {
    return (
      <input
        key={props.value}
        type="text"
        className="flex-1 text-right text-gray-700"
        value={props.value || undefined}
        onInput={handleChange(props.onChange)}
      />
    );
  } else if (props.type === "number") {
    return (
      <span className="flex-1 text-right">
        <input
          key={props.value}
          onChange={handleChange(props.onChange)}
          type="number"
          className="p-2 text-right text-gray-700 outline-none"
          value={props.value || undefined}
        />
      </span>
    );
  } else {
    return null;
  }
}

function handleChange(cb?: (val: string) => void): (e: Event) => void {
  return (e: Event): void => {
    if (cb != null) {
      const value = (e.target as HTMLInputElement).value;
      cb(value);
    }
  };
}
