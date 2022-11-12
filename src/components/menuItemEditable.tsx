import { h, JSX, Fragment } from "preact";
import { IconDelete } from "./icons/iconDelete";
import { MenuItemWrapper } from "./menuItem";
import { useState, StateUpdater } from "preact/hooks";
import { StringUtils } from "../utils/string";
import { ScrollBarrell } from "./scrollBarrell";

type IMenuItemType = "text" | "number" | "select" | "boolean";

interface IMenuItemEditableValueProps {
  name: string;
  type: IMenuItemType;
  value: string | null;
  valueUnits?: string;
  values?: [string, string][];
  onChange?: (v?: string, e?: Event) => void;
  pattern?: string;
  patternMessage?: string;
}

interface IMenuItemEditableProps extends IMenuItemEditableValueProps {
  hasClear?: boolean;
  after?: JSX.Element;
  nextLine?: JSX.Element;
  isNameHtml?: boolean;
  errorMessage?: string;
}

export function MenuItemEditable(props: IMenuItemEditableProps): JSX.Element {
  const [patternError, setPatternError] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  let numberOfVisibleItems = Math.min(props.values?.length || 0, 4);
  if (numberOfVisibleItems % 2 === 0) {
    numberOfVisibleItems += 1;
  }
  return (
    <MenuItemWrapper name={props.name}>
      <label
        className="flex flex-col flex-1 py-3 text-base"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (props.type === "select" && !target.classList.contains("scroll-barrel-item")) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex flex-1">
          <span
            data-cy={`menu-item-name-${StringUtils.dashcase(props.name)}`}
            className="flex items-center flex-1"
            {...(props.isNameHtml ? { dangerouslySetInnerHTML: { __html: props.name } } : {})}
          >
            {props.isNameHtml ? "" : props.name}
          </span>
          <Fragment>
            <MenuItemValue
              name={props.name}
              type={props.type}
              value={props.value}
              pattern={props.pattern}
              patternMessage={props.patternMessage}
              values={props.values}
              setPatternError={setPatternError}
              onChange={props.onChange}
            />
            {props.value != null && <span className="flex items-center text-grayv2-700">{props.valueUnits}</span>}
          </Fragment>
          {props.value != null && props.hasClear && (
            <button
              data-cy={`menu-item-delete-${StringUtils.dashcase(props.name)}`}
              onClick={() => props.onChange && props.onChange(undefined)}
              className="p-2"
            >
              <IconDelete />
            </button>
          )}
          {props.after != null ? props.after : undefined}
        </div>
        {(props.errorMessage || (patternError && props.patternMessage)) && (
          <div style={{ marginTop: "-0.5rem" }} className="text-xs text-right text-red-500">
            {props.errorMessage || props.patternMessage}
          </div>
        )}
        {props.nextLine}
      </label>
      {props.type === "select" && (
        <div className="text-base">
          <ScrollBarrell
            itemHeight={28}
            numberOfVisibleItems={numberOfVisibleItems}
            isExpanded={isExpanded}
            values={props.values || []}
            defaultSelectedValue={props.value}
            onSelect={(v) => props.onChange && props.onChange(v)}
          />
        </div>
      )}
    </MenuItemWrapper>
  );
}

function MenuItemValue(
  props: { setPatternError: StateUpdater<boolean> } & IMenuItemEditableValueProps
): JSX.Element | null {
  if (props.type === "select") {
    return <div className="flex-1 pr-2 text-right text-bluev2">{props.value}</div>;
  } else if (props.type === "text") {
    return (
      <input
        data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
        key={props.value}
        type="text"
        className="flex-1 text-right text-bluev2"
        value={props.value || undefined}
        title={props.patternMessage}
        onBlur={handleChange(props.onChange, props.setPatternError)}
        pattern={props.pattern}
      />
    );
  } else if (props.type === "boolean") {
    return (
      <div className="flex items-center flex-1 text-right">
        <label className="flex items-center justify-end flex-1 ">
          <input
            data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
            key={props.value}
            type="checkbox"
            className="text-right text-bluev2 checkbox"
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
          data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
          key={props.value}
          onBlur={handleChange(props.onChange, props.setPatternError)}
          type="number"
          step="0.01"
          title={props.patternMessage}
          className="items-center flex-1 w-0 min-w-0 p-2 text-right outline-none text-grayv2-700"
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
