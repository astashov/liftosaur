import { JSX, useEffect, useState } from "react";
import { ObjectUtils_keys } from "../utils/object";
import { DropdownMenu, DropdownMenuItem } from "./dropdownMenu";
import { useModal } from "../navigation/ModalStateContext";

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

  const openModal = useModal("inputSelectModal", (value) => {
    props.onChange(value === "" ? undefined : (value as T));
  });

  return (
    <span className="relative inline-block">
      <button
        className={`border-b border-dotted text-text-purple border-text-purple hover:opacity-70 transition-opacity ${props.className} nm-${props.name}`}
        onClick={() => {
          if (isDesktop) {
            setShowOptions(!showOptions);
          } else {
            const values: [string, string][] = keys.map((key) => [String(key), props.values[key]]);
            openModal({
              name: props.name,
              values,
              selectedValue: props.value != null ? String(props.value) : undefined,
              emptyLabel: props.emptyLabel,
            });
          }
        }}
      >
        {selectedOption ?? props.emptyLabel}
      </button>
      {isDesktop && showOptions && (
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
      )}
    </span>
  );
}
