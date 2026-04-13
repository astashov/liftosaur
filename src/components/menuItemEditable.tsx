import React, { JSX, Dispatch, ReactNode, SetStateAction, useState } from "react";
import { MenuItemWrapper } from "./menuItem";
import { StringUtils_dashcase } from "../utils/string";
import { ScrollBarrell } from "./scrollBarrell";
import { IconTrash } from "./icons/iconTrash";
import { SendMessage_isIos } from "../utils/sendMessage";
import { lg } from "../utils/posthog";

type IMenuItemType = "text" | "number" | "select" | "boolean" | "desktop-select" | "select2";

interface IMenuItemEditableValueProps {
  name: string;
  prefix?: ReactNode;
  type: IMenuItemType;
  value: string | null | undefined;
  valueUnits?: string;
  values?: [string, string][];
  onChange?: (v?: string, e?: React.SyntheticEvent) => void;
  onInput?: (v: string) => void;
  pattern?: string;
  patternMessage?: string;
  maxLength?: number;
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
  const onChange = (v?: string, e?: React.SyntheticEvent): void => {
    lg(`menu-item-edit-${StringUtils_dashcase(props.name)}`);
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
          {props.isNameHtml ? (
            <span
              data-cy={`menu-item-name-${StringUtils_dashcase(props.name)}`}
              className={`flex flex-col min-w-0 break-all items-start pr-2 ${props.isNameBold ? "font-bold" : ""}`}
              dangerouslySetInnerHTML={{ __html: props.name }}
            />
          ) : (
            <span
              data-cy={`menu-item-name-${StringUtils_dashcase(props.name)}`}
              className={`flex flex-col min-w-0 break-all items-start pr-2 ${props.isNameBold ? "font-bold" : ""}`}
            >
              <div className={props.size === "sm" ? "text-sm" : ""}>{props.name}</div>
              {props.underName}
            </span>
          )}
          <div className="flex-1" style={{ minWidth: "3rem" }}>
            <MenuItemValue
              name={props.name}
              maxLength={props.maxLength}
              type={props.type}
              value={props.value}
              pattern={props.pattern}
              patternMessage={props.patternMessage}
              values={props.values}
              setPatternError={setPatternError}
              onChange={onChange}
            />
          </div>
          {props.value != null && <span className="flex items-center text-text-secondary">{props.valueUnits}</span>}
          {props.value != null && props.hasClear && (
            <button
              data-cy={`menu-item-delete-${StringUtils_dashcase(props.name)}`}
              onClick={() => onChange(undefined)}
              style={{ marginRight: "-0.5rem" }}
              className={`p-2 nm-menu-item-delete-${StringUtils_dashcase(props.name)}`}
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
  props: { setPatternError: Dispatch<SetStateAction<boolean>> } & IMenuItemEditableValueProps
): JSX.Element | null {
  if (props.type === "desktop-select") {
    return (
      <select
        data-cy={`menu-item-value-${StringUtils_dashcase(props.name)}`}
        className="border rounded border-border-neutral bg-background-default"
        value={props.value || undefined}
        onChange={handleChange(props.onChange, props.setPatternError)}
      >
        {(props.values || []).map(([key, value]) => (
          <option key={key} value={key}>
            {value}
          </option>
        ))}
      </select>
    );
  } else if (props.type === "select") {
    const keyValue = (props.values || []).filter(([v]) => v === props.value)[0];
    return (
      <div
        data-cy={`menu-item-value-${StringUtils_dashcase(props.name)}`}
        className="flex-1 py-2 pl-2 text-right text-text-link"
        style={{ minHeight: "2.5rem" }}
      >
        {keyValue && keyValue[1]}
      </div>
    );
  } else if (props.type === "text") {
    return (
      <input
        data-cy={`menu-item-value-${StringUtils_dashcase(props.name)}`}
        key={props.value}
        type="text"
        className="flex-1 w-full py-2 text-right bg-transparent text-text-link"
        defaultValue={props.value || undefined}
        title={props.patternMessage}
        maxLength={props.maxLength}
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
            data-cy={`menu-item-value-${StringUtils_dashcase(props.name)}`}
            style={{ marginRight: "-0.5rem" }}
            key={props.value}
            type="checkbox"
            className="text-right text-text-link checkbox"
            checked={props.value === "true"}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
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
          data-cy={`menu-item-value-${StringUtils_dashcase(props.name)}`}
          key={props.value}
          onBlur={handleChange(props.onChange, props.setPatternError)}
          type={SendMessage_isIos() ? "number" : "tel"}
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
          className="items-center flex-1 w-0 min-w-0 p-2 text-right bg-transparent outline-none text-text-secondary"
          defaultValue={props.value || undefined}
          pattern={props.pattern}
        />
      </span>
    );
  } else {
    return null;
  }
}

function handleChange(
  cb: ((val: string, e: React.SyntheticEvent) => void) | undefined,
  setPatternError: Dispatch<SetStateAction<boolean>>
): (e: React.SyntheticEvent) => void {
  return (e: React.SyntheticEvent): void => {
    setPatternError(e.target instanceof HTMLInputElement && e.target.validity.patternMismatch);
    if (cb != null) {
      const value = (e.target as HTMLInputElement).value;
      cb(value, e);
    }
  };
}
