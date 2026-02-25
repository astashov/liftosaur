import { JSX, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import { BottomSheet } from "./bottomSheet";
import { MenuItemWrapper } from "./menuItem";
import { ObjectUtils_keys } from "../utils/object";
import { DropdownMenu, DropdownMenuItem } from "./dropdownMenu";

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
  const keys = ObjectUtils_keys(props.values);
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" && window.innerWidth >= 768);

  useEffect(() => {
    const check = (): void => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <span className="relative inline-block">
      <button
        className={`border-b border-dotted text-text-purple border-text-purple hover:opacity-70 transition-opacity ${props.className} nm-${props.name}`}
        onClick={() => setShowOptions(!showOptions)}
      >
        {selectedOption ?? props.emptyLabel}
      </button>
      {isDesktop ? (
        showOptions && (
          <DropdownMenu
            leftOffset="0"
            topOffset="calc(100% + 8px)"
            maxWidth="16rem"
            bgColor="white"
            tipClassName="add-tip-up"
            textAlign="left"
            onClose={() => setShowOptions(false)}
          >
            {props.emptyLabel != null && (
              <DropdownMenuItem
                isTop={true}
                className={`text-left hover:bg-background-subtle ${props.value == null ? "font-bold text-text-purple" : ""}`}
                onClick={() => {
                  props.onChange(undefined);
                  setShowOptions(false);
                }}
              >
                {props.emptyLabel}
              </DropdownMenuItem>
            )}
            {keys.map((key, i) => {
              const value = props.values[key];
              return (
                <DropdownMenuItem
                  key={key}
                  isTop={i === 0 && props.emptyLabel == null}
                  className={`text-left hover:bg-background-subtle ${props.value === key ? "font-bold text-text-purple" : ""}`}
                  onClick={() => {
                    props.onChange(key);
                    setShowOptions(false);
                  }}
                >
                  {value}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenu>
        )
      ) : (
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
                <div className={`cursor-pointer py-3 ${props.value == null ? "font-bold" : ""}`}>
                  {props.emptyLabel}
                </div>
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
      )}
    </span>
  );
}
