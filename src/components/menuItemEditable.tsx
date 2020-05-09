import { h, JSX, Fragment } from "preact";
import { IconDelete } from "./iconDelete";
import { MenuItemWrapper } from "./menuItem";
import { useState, StateUpdater } from "preact/hooks";

type IMenuItemType = "text" | "number" | "select" | "boolean";

interface IMenuItemEditableValueProps {
  type: IMenuItemType;
  value: string | null;
  valueUnits?: string;
  values?: [string, string][];
  onChange?: (v?: string, e?: Event) => void;
  pattern?: string;
  patternMessage?: string;
}

interface IMenuItemEditableProps extends IMenuItemEditableValueProps {
  name: string;
  hasClear?: boolean;
}

export function MenuItemEditable(props: IMenuItemEditableProps): JSX.Element {
  const [patternError, setPatternError] = useState<boolean>(false);
  return (
    <MenuItemWrapper>
      <label className="flex flex-col flex-1">
        <div className="flex flex-1">
          <span className="flex items-center flex-1 py-2">{props.name}</span>
          <Fragment>
            <MenuItemValue
              type={props.type}
              value={props.value}
              pattern={props.pattern}
              patternMessage={props.patternMessage}
              values={props.values}
              setPatternError={setPatternError}
              onChange={props.onChange}
            />
            {props.value != null && <span className="flex items-center text-gray-700">{props.valueUnits}</span>}
          </Fragment>
          {props.value != null && props.hasClear && (
            <button onClick={() => props.onChange && props.onChange(undefined)} className="p-2">
              <IconDelete />
            </button>
          )}
        </div>
        {patternError && props.patternMessage && (
          <div style={{ marginTop: "-0.5rem" }} className="text-xs text-right text-red-500">
            {props.patternMessage}
          </div>
        )}
      </label>
    </MenuItemWrapper>
  );
}

function MenuItemValue(
  props: { setPatternError: StateUpdater<boolean> } & IMenuItemEditableValueProps
): JSX.Element | null {
  if (props.type === "select") {
    return (
      <select
        className="flex-1 text-right text-gray-700"
        value={props.value || undefined}
        onChange={handleChange(props.onChange, props.setPatternError)}
      >
        {(props.values || []).map(([key, value]) => (
          <option value={key} selected={key === props.value}>
            {value}
          </option>
        ))}
      </select>
    );
  } else if (props.type === "text") {
    return (
      <input
        key={props.value}
        type="text"
        className="flex-1 text-right text-gray-700"
        value={props.value || undefined}
        title={props.patternMessage}
        onChange={handleChange(props.onChange, props.setPatternError)}
        pattern={props.pattern}
      />
    );
  } else if (props.type === "boolean") {
    return (
      <div className="flex items-center flex-1 text-right">
        <label className="flex-1 text-right">
          <input
            key={props.value}
            type="checkbox"
            className="text-right text-gray-700"
            checked={props.value === "true"}
            onChange={(e: Event): void => {
              if (props.onChange != null) {
                const value = `${(e.target as HTMLInputElement).checked}`;
                props.onChange(value, e);
              }
            }}
          />
        </label>
      </div>
    );
  } else if (props.type === "number") {
    return (
      <span className="flex flex-1 text-right">
        <input
          key={props.value}
          onChange={handleChange(props.onChange, props.setPatternError)}
          type="number"
          title={props.patternMessage}
          className="items-center p-2 text-right text-gray-700 outline-none"
          value={props.value || undefined}
          pattern={props.pattern}
        />
      </span>
    );
  } else {
    return null;
  }
}

function handleChange(
  cb: ((val: string, e: Event) => void) | undefined,
  setPatternError: StateUpdater<boolean>
): (e: Event) => void {
  return (e: Event): void => {
    setPatternError(e.target instanceof HTMLInputElement && e.target.validity.patternMismatch);
    if (cb != null) {
      const value = (e.target as HTMLInputElement).value;
      cb(value, e);
    }
  };
}
