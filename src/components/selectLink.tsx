import { JSX, h, Fragment } from "preact";
import { useState } from "preact/hooks";
import { BottomSheet } from "./bottomSheet";
import { MenuItemWrapper } from "./menuItem";
import { ObjectUtils } from "../utils/object";

interface ISelectLinkProps<T extends string | number> {
  values: Record<T, string>;
  name: string;
  onChange: (value?: T) => void;
  className?: string;
  emptyLabel?: string;
  value?: T;
}

export function SelectLink<T extends string | number>(props: ISelectLinkProps<T>): JSX.Element {
  const [showOptions, setShowOptions] = useState(false);
  const selectedOption = props.value ? props.values[props.value] : undefined;
  const keys = ObjectUtils.keys(props.values);

  return (
    <>
      <button
        className={`border-b border-dotted text-purplev3-main border-purplev3-main ${props.className} nm-${props.name}`}
        onClick={() => setShowOptions(!showOptions)}
      >
        {selectedOption ?? props.emptyLabel}
      </button>
      <BottomSheet isHidden={!showOptions} shouldShowClose={true} onClose={() => setShowOptions(false)}>
        <div className="px-4 py-1">
          {props.emptyLabel != null && (
            <MenuItemWrapper
              name={props.emptyLabel}
              onClick={() => {
                props.onChange(undefined);
                setShowOptions(false);
              }}
            >
              <div className={`cursor-pointer py-3 ${props.value == null ? "font-bold" : ""}`}>{props.emptyLabel}</div>
            </MenuItemWrapper>
          )}
          {keys.map((key, i) => {
            const value = props.values[key];
            return (
              <MenuItemWrapper
                key={key}
                name={value}
                isBorderless={i === keys.length - 1}
                onClick={() => {
                  props.onChange(key);
                  setShowOptions(false);
                }}
              >
                <div className={`cursor-pointer py-3 ${props.value === key ? "font-bold" : ""}`}>{value}</div>
              </MenuItemWrapper>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
