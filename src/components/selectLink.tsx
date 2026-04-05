import { JSX, useEffect, useRef, useState } from "react";
import { ObjectUtils_keys } from "../utils/object";
import { DropdownMenu, DropdownMenuItem } from "./dropdownMenu";
import { useModalDispatch, useModalResult, Modal_open } from "../navigation/ModalStateContext";
import { getNavigationRef } from "../navigation/navUtils";

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
  const modalDispatch = useModalDispatch();
  const isOpenRef = useRef(false);

  useEffect(() => {
    const check = (): void => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useModalResult("inputSelectModal", (value) => {
    if (isOpenRef.current) {
      isOpenRef.current = false;
      props.onChange(value === null ? undefined : (value as T));
    }
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
            isOpenRef.current = true;
            Modal_open(modalDispatch, "inputSelectModal", {
              values,
              selectedValue: props.value != null ? String(props.value) : undefined,
              emptyLabel: props.emptyLabel,
            });
            getNavigationRef().then(({ navigationRef: ref }) => ref.navigate("inputSelectModal"));
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
