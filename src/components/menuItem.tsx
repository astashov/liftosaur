import { h, JSX, Fragment } from "preact";

type IMenuItemType = "label" | "text" | "number";

interface IMenuItemValueProps {
  type: IMenuItemType;
  value?: string | number;
  valueUnits?: string;
  onChange?: (v: string) => void;
}

interface IMenuItemProps extends IMenuItemValueProps {
  name: string;
  onClick?: () => void;
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  return (
    <label className="flex w-full px-6 py-1 text-left border-b border-gray-200" onClick={props.onClick}>
      <span className="flex items-center flex-1 py-2">{props.name}</span>
      {props.value != null && (
        <Fragment>
          <MenuItemValue type={props.type} value={props.value} onChange={props.onChange} />
          <span className="flex items-center text-gray-700">{props.valueUnits}</span>
        </Fragment>
      )}
    </label>
  );
}

function MenuItemValue(props: IMenuItemValueProps): JSX.Element | null {
  if (props.type === "label") {
    return <span className="flex-1 p-2 text-right text-gray-700">{props.value}</span>;
  } else if (props.type === "text") {
    return (
      <input
        type="text"
        className="flex-1 text-right text-gray-700"
        value={props.value}
        onInput={handleChange(props.onChange)}
      />
    );
  } else if (props.type === "number") {
    return (
      <span className="flex-1 text-right">
        <input
          onInput={handleChange(props.onChange)}
          type="number"
          className="p-2 text-right text-gray-700 outline-none"
          value={props.value}
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
