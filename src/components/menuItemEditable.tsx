import { h, JSX, ComponentChildren } from "preact";
import { MenuItemWrapper } from "./menuItem";
import { useState, StateUpdater } from "preact/hooks";
import { StringUtils } from "../utils/string";
import { ScrollBarrell } from "./scrollBarrell";
import { IconTrash } from "./icons/iconTrash";
import { SendMessage } from "../utils/sendMessage";
import { lg } from "../utils/posthog";

type IMenuItemType = "text" | "number" | "select" | "boolean" | "desktop-select";

interface IMenuItemEditableValueProps {
  name: string;
  prefix?: ComponentChildren;
  type: IMenuItemType;
  value: string | null | undefined;
  valueUnits?: string;
  values?: [string, string][];
  onChange?: (v?: string, e?: Event) => void;
  pattern?: string;
  patternMessage?: string;
}

interface IMenuItemEditableProps extends IMenuItemEditableValueProps {
  size?: "sm" | "base";
  isNameBold?: boolean;
  hasClear?: boolean;
  after?: JSX.Element;
  underName?: JSX.Element;
  nextLine?: JSX.Element;
  isNameHtml?: boolean;
  errorMessage?: string;
  isBorderless?: boolean;
}

export function MenuItemEditable(props: IMenuItemEditableProps): JSX.Element {
  const [patternError, setPatternError] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  let numberOfVisibleItems = Math.min(props.values?.length || 0, 4);
  if (numberOfVisibleItems % 2 === 0) {
    numberOfVisibleItems += 1;
  }
  const onChange = (v?: string, e?: Event): void => {
    lg(`menu-item-edit-${StringUtils.dashcase(props.name)}`);
    if (props.onChange != null) {
      props.onChange(v, e);
    }
  };
  return (
    <MenuItemWrapper name={props.name} isBorderless={props.isBorderless}>
      <label
        className="flex flex-col flex-1 py-1 text-base"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (props.type === "select" && !target.classList.contains("scroll-barrel-item")) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center flex-1">
          {props.prefix}
          <span
            data-cy={`menu-item-name-${StringUtils.dashcase(props.name)}`}
            className={`flex flex-col min-w-0 break-all items-center pr-2 ${props.isNameBold ? "font-bold" : ""}`}
            {...(props.isNameHtml ? { dangerouslySetInnerHTML: { __html: props.name } } : {})}
          >
            <div className={props.size === "sm" ? "text-sm" : ""}>{props.isNameHtml ? "" : props.name}</div>
            {props.underName}
          </span>
          <div className="flex-1" style={{ minWidth: "3rem" }}>
            <MenuItemValue
              name={props.name}
              type={props.type}
              value={props.value}
              pattern={props.pattern}
              patternMessage={props.patternMessage}
              values={props.values}
              setPatternError={setPatternError}
              onChange={onChange}
            />
          </div>
          {props.value != null && <span className="flex items-center text-grayv2-700">{props.valueUnits}</span>}
          {props.value != null && props.hasClear && (
            <button
              data-cy={`menu-item-delete-${StringUtils.dashcase(props.name)}`}
              onClick={() => onChange(undefined)}
              style={{ marginRight: "-0.5rem" }}
              className={`p-2 nm-menu-item-delete-${StringUtils.dashcase(props.name)}`}
            >
              <IconTrash />
            </button>
          )}
          {props.after != null ? props.after : undefined}
        </div>
        {(props.errorMessage || (patternError && props.patternMessage)) && (
          <div style={{ marginTop: "-0.5rem" }} className="text-xs text-right text-red-500">
            {props.errorMessage || props.patternMessage}
          </div>
        )}
      </label>
      {props.nextLine}
      {props.type === "select" && (
        <div className="text-base">
          <ScrollBarrell
            itemHeight={28}
            numberOfVisibleItems={numberOfVisibleItems}
            isExpanded={isExpanded}
            values={props.values || []}
            defaultSelectedValue={props.value}
            onSelect={(v) => onChange(v)}
          />
        </div>
      )}
    </MenuItemWrapper>
  );
}

export function MenuItemValue(
  props: { setPatternError: StateUpdater<boolean> } & IMenuItemEditableValueProps
): JSX.Element | null {
  if (props.type === "desktop-select") {
    return (
      <select
        data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
        className="border rounded border-grayv2-main"
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
  } else if (props.type === "select") {
    const keyValue = (props.values || []).filter(([v]) => v === props.value)[0];
    return (
      <div
        data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
        className="flex-1 py-2 pl-2 text-right text-bluev2"
        style={{ minHeight: "2.5rem" }}
      >
        {keyValue && keyValue[1]}
      </div>
    );
  } else if (props.type === "text") {
    return (
      <input
        data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
        key={props.value}
        type="text"
        className="flex-1 w-full py-2 text-right bg-transparent text-bluev2"
        value={props.value || undefined}
        title={props.patternMessage}
        onBlur={handleChange(props.onChange, props.setPatternError)}
        onFocus={(e) => {
          const target = e.target;
          if (target instanceof HTMLInputElement) {
            const value = (target as HTMLInputElement).value;
            target.setSelectionRange(0, value.length);
            return true;
          }
          return undefined;
        }}
        pattern={props.pattern}
      />
    );
  } else if (props.type === "boolean") {
    return (
      <div className="flex items-center flex-1 text-right">
        <label className="flex items-center justify-end flex-1 p-2">
          <input
            data-cy={`menu-item-value-${StringUtils.dashcase(props.name)}`}
            style={{ marginRight: "-0.5rem" }}
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
          type={SendMessage.isIos() ? "number" : "tel"}
          step="0.01"
          onFocus={(e) => {
            const target = e.target;
            if (target instanceof HTMLInputElement) {
              const value = (target as HTMLInputElement).value;
              if (target.type !== "number") {
                target.setSelectionRange(0, value.length);
              }
              return true;
            }
            return undefined;
          }}
          title={props.patternMessage}
          className="items-center flex-1 w-0 min-w-0 p-2 text-right bg-transparent outline-none text-grayv2-700"
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
