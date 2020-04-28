import { h, JSX, Fragment } from "preact";

type IMenuItemType = "label" | "text" | "number";

interface IMenuItemValueProps {
  type: IMenuItemType;
  value: string | null;
  valueUnits?: string;
  onChange?: (v?: string) => void;
}

interface IMenuItemProps extends IMenuItemValueProps {
  name: string;
  onClick?: () => void;
  hasClear?: boolean;
}

export function MenuItem(props: IMenuItemProps): JSX.Element {
  return (
    <section className="flex w-full px-6 py-1 text-left border-b border-gray-200">
      <label className="flex flex-1" onClick={props.onClick}>
        <span className="flex items-center flex-1 py-2">{props.name}</span>
        <Fragment>
          <MenuItemValue type={props.type} value={props.value} onChange={props.onChange} />
          {props.value != null && <span className="flex items-center text-gray-700">{props.valueUnits}</span>}
        </Fragment>
      </label>
      {props.value != null && props.hasClear && (
        <button onClick={() => props.onChange && props.onChange(undefined)} className="p-2">
          X
        </button>
      )}
    </section>
  );
}

function MenuItemValue(props: IMenuItemValueProps): JSX.Element | null {
  if (props.type === "label") {
    return <span className="flex-1 p-2 text-right text-gray-700">{props.value}</span>;
  } else if (props.type === "text") {
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
