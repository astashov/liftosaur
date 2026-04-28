import React, { JSX, RefObject, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StringUtils_dashcase } from "../utils/string";
import { IconKeyboardClose } from "./icons/iconKeyboardClose";
import { n, MathUtils_clamp } from "../utils/math";
import { IPercentageUnit, IUnit } from "../types";
import { IconCalculator } from "./icons/iconCalculator";
import { Mobile_isMobile } from "../../lambda/utils/mobile";
import { useModal } from "../navigation/ModalStateContext";
import { IconBackspace } from "./icons/iconBackspace";

interface IInputNumber2Props {
  name: string;
  placeholder?: string;
  value?: number;
  width?: number;
  autowidth?: boolean;
  step?: number;
  min?: number;
  max?: number;
  tabIndex?: number;
  initialValue?: number;
  onNext?: (value: number | undefined) => number;
  onPrev?: (value: number | undefined) => number;
  onInput?: (value: number | undefined) => void;
  onBlur?: (value: number | undefined) => void;
  keyboardAddon?: JSX.Element;
  after?: () => JSX.Element | undefined;
  allowDot?: boolean;
  allowNegative?: boolean;
  enableCalculator?: boolean;
  enableUnits?: (IUnit | IPercentageUnit)[];
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
  selectedUnit?: IUnit | IPercentageUnit;
  showUnitInside?: boolean;
}

function clamp(value: string | number, min?: number, max?: number): number | undefined {
  if (value === "") {
    return undefined;
  }
  const num = MathUtils_clamp(Number(value), min, max);
  if (isNaN(num)) {
    return MathUtils_clamp(0, min, max);
  }
  return num;
}

let nextPadOwnerId = 1;
let activePadOwnerId: number | null = null;

export function InputNumber2(props: IInputNumber2Props): JSX.Element {
  const initialValue = props.value != null ? n(props.value) : "";
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef(false);
  const onClickTarget = useRef<HTMLElement>(null);
  const isFocusedRef = useRef(isFocused);
  const isTypingRef = useRef(isTyping);
  const allowDotRef = useRef(!!props.allowDot);
  const allowNegativeRef = useRef(!!props.allowNegative);
  const [isMobile, setIsMobile] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const isCalculatorOpenRef = useRef(isCalculatorOpen);
  const openCalculator = useModal("repMaxCalculatorModal", (weightValue) => {
    const newValue = clamp(weightValue, props.min, props.max);
    valueRef.current = newValue?.toString() ?? "";
    setValue(newValue?.toString() ?? "");
    if (props.onBlur) {
      props.onBlur(newValue);
    }
    setIsCalculatorOpen(false);
  });
  const onBlurRef = useRef<((v: number | undefined) => void) | undefined>(props.onBlur);
  const onInputRef = useRef<((v: number | undefined) => void) | undefined>(props.onInput);
  useEffect(() => {
    setIsMobile(Mobile_isMobile(window.navigator?.userAgent || ""));
  }, []);
  useEffect(() => {
    onBlurRef.current = props.onBlur;
    onInputRef.current = props.onInput;
  }, [props.onBlur, props.onInput]);

  const maxLength = (props.max?.toString().length ?? 5) + (props.allowDot ? 3 : 0) + (props.allowNegative ? 1 : 0);

  const paddedScrollerRef = useRef<HTMLElement | null>(null);
  const padOwnerIdRef = useRef<number>(0);
  if (padOwnerIdRef.current === 0) {
    padOwnerIdRef.current = nextPadOwnerId++;
  }

  function resetKeyboardStyles(): void {
    if (activePadOwnerId !== padOwnerIdRef.current) {
      return;
    }
    document.body.classList.remove("show-keyboard");
    document.querySelectorAll(".bottom-sticked").forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.bottom = "0px";
      }
    });
    if (paddedScrollerRef.current) {
      paddedScrollerRef.current.style.paddingBottom = "";
      paddedScrollerRef.current = null;
    }
    activePadOwnerId = null;
  }

  useEffect(() => {
    valueRef.current = initialValue;
    setValue(initialValue);
  }, [props.value]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
    allowDotRef.current = !!props.allowDot;
    allowNegativeRef.current = !!props.allowNegative;
    isCalculatorOpenRef.current = !!isCalculatorOpen;
  }, [isFocused, props.allowDot, props.allowNegative, isCalculatorOpen]);

  const handleInput = (key: string): void => {
    let newValue = valueRef.current;
    if (!isTypingRef.current) {
      newValue = "";
    }
    if (key === "⌫") {
      newValue = newValue.slice(0, -1);
    } else if (key === "-") {
      if (allowNegativeRef.current) {
        if (newValue[0] === "-") {
          newValue = newValue.slice(1);
        } else if (!newValue.includes("-")) {
          newValue = `-${newValue}`;
        }
      }
    } else if (key === ".") {
      if (allowDotRef.current && !newValue.includes(".")) {
        newValue += key;
      }
    } else if (newValue.length < maxLength) {
      newValue += key;
    }
    setIsTyping(true);
    isTypingRef.current = true;
    valueRef.current = newValue;
    setValue(newValue);
    if (onInputRef.current && !newValue.endsWith(".")) {
      const newValueNum = clamp(newValue, props.min, props.max);
      onInputRef.current(newValueNum);
    }
  };

  const blur = useCallback(() => {
    setIsFocused(false);
    setIsTyping(false);
    isTypingRef.current = false;
    const newValueNum = clamp(valueRef.current, props.min, props.max);
    valueRef.current = newValueNum != null ? newValueNum.toString() : "";
    setValue(newValueNum != null ? newValueNum.toString() : "");
    if (onBlurRef.current) {
      onBlurRef.current(newValueNum);
    }
    switchRef.current = false;
  }, []);

  useEffect(() => {
    if (isFocused) {
      if (props.value == null && props.initialValue != null) {
        valueRef.current = props.initialValue?.toString() ?? "";
        setValue(props.initialValue?.toString() ?? "");
      }
      if (!isMobile) {
        return;
      }
      document.body.classList.add("show-keyboard");
      const keyboardHeight = keyboardRef.current?.clientHeight ?? 0;

      document.querySelectorAll(".bottom-sticked").forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.bottom = `${keyboardHeight}px`;
        }
      });

      let scrollableContainer = containerRef.current?.parentElement as HTMLElement | null;
      while (scrollableContainer && scrollableContainer !== document.documentElement) {
        const overflowY = getComputedStyle(scrollableContainer).overflowY;
        if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
          break;
        }
        scrollableContainer = scrollableContainer.parentElement;
      }
      scrollableContainer = scrollableContainer ?? document.documentElement;

      const contentEl = scrollableContainer.firstElementChild as HTMLElement | null;
      if (scrollableContainer !== document.documentElement && contentEl) {
        contentEl.style.paddingBottom = `${keyboardHeight}px`;
        paddedScrollerRef.current = contentEl;
      }
      activePadOwnerId = padOwnerIdRef.current;

      const inputRect = containerRef.current?.getBoundingClientRect();
      if (inputRect) {
        const scrollerRect =
          scrollableContainer === document.documentElement
            ? { top: 0, bottom: window.innerHeight }
            : scrollableContainer.getBoundingClientRect();
        const visibleTop = scrollerRect.top;
        const visibleBottom = Math.min(scrollerRect.bottom, window.innerHeight - keyboardHeight);
        const margin = 16;

        if (inputRect.bottom + margin > visibleBottom || inputRect.top - margin < visibleTop) {
          const inputCenter = (inputRect.top + inputRect.bottom) / 2;
          const targetCenter = (visibleTop + visibleBottom) / 2;
          const delta = inputCenter - targetCenter;
          scrollableContainer.scrollBy({ top: delta, behavior: "smooth" });
        }
      }
    } else {
      if (!isMobile) {
        return;
      }
      if (!switchRef.current) {
        resetKeyboardStyles();
      }
      switchRef.current = false;
    }
    return () => resetKeyboardStyles();
  }, [isFocused, props.initialValue]);

  useEffect(() => {
    const keyboardHandler = (event: KeyboardEvent): void => {
      if (!isFocusedRef.current) {
        return;
      }
      if (event.key === "Escape") {
        blur();
      } else if (event.key === "Enter") {
        blur();
      } else if (event.key === "Backspace") {
        handleInput("⌫");
      } else if (
        event.key === "0" ||
        event.key === "1" ||
        event.key === "2" ||
        event.key === "3" ||
        event.key === "4" ||
        event.key === "5" ||
        event.key === "6" ||
        event.key === "7" ||
        event.key === "8" ||
        event.key === "9" ||
        (props.allowDot && event.key === ".") ||
        (props.allowNegative && event.key === "-")
      ) {
        handleInput(event.key);
      }
    };
    document.addEventListener("keydown", keyboardHandler);
    return () => {
      document.removeEventListener("keydown", keyboardHandler);
    };
  }, []);

  const maybeBlur = useCallback((target: HTMLElement | null): boolean => {
    if (target == null) {
      blur();
      return true;
    }
    let foundCurrentInput = true;
    let foundOtherInput: HTMLElement | null = null;
    while (target) {
      if (target.classList?.contains("keyboard-close")) {
        blur();
        return true;
      } else if (target === containerRef.current || target === keyboardRef.current) {
        foundCurrentInput = true;
        break;
      } else if (target !== containerRef.current && target.classList?.contains("input-number")) {
        foundOtherInput = target;
        break;
      } else if (target === document.body) {
        foundCurrentInput = false;
        break;
      }
      target = target.parentElement;
    }
    if (foundOtherInput) {
      blur();
      switchRef.current = true;
      const nextInput = foundOtherInput.querySelector(".input-number-child") as HTMLElement | null;
      if (nextInput) {
        nextInput.focus();
      }
      return true;
    } else if (!foundCurrentInput) {
      blur();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const documentClickHandler = (event: MouseEvent | TouchEvent): void => {
      if (isCalculatorOpenRef.current) {
        return;
      }
      onClickTarget.current = (event.target || event.currentTarget) as HTMLElement;
    };
    document.addEventListener("touchstart", documentClickHandler);
    document.addEventListener("mousedown", documentClickHandler);
    return () => {
      document.removeEventListener("touchstart", documentClickHandler);
      document.removeEventListener("mousedown", documentClickHandler);
    };
  }, []);

  return (
    <div ref={containerRef} className="input-number">
      <div
        className="flex items-center justify-center h-6 border rounded bg-background-default border-border-prominent input-number-child"
        style={
          props.autowidth ? { paddingLeft: "0.5rem", paddingRight: "0.5rem" } : { width: `${props.width ?? 4}rem` }
        }
        tabIndex={props.tabIndex ?? 0}
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={(event) => {
          setTimeout(() => {
            const target = (event.relatedTarget || onClickTarget.current) as HTMLElement | null;
            const result = maybeBlur(target);
            if (!result) {
              const currentTarget = event.currentTarget || event.target;
              event.preventDefault();
              (event.nativeEvent as Event).stopImmediatePropagation();
              if (currentTarget) {
                currentTarget.focus();
              }
            }
          }, 10);
        }}
        onClick={(e) => {
          e.currentTarget.focus();
        }}
        data-cy={`input-${StringUtils_dashcase(props.name)}-field`} data-testid={`input-${StringUtils_dashcase(props.name)}-field`} testID={`input-${StringUtils_dashcase(props.name)}-field`}
      >
        <div ref={inputRef} className="leading-none">
          {!value && !isFocused && props.placeholder ? (
            <span className="text-sm text-text-secondarysubtle text-ellipsis whitespace-nowrap">
              {props.placeholder}
            </span>
          ) : (
            <span
              className={`text-sm inline-block ${isFocused && !isTypingRef.current ? "bg-background-cardpurpleselected" : ""}`}
              style={{ padding: value ? "1px" : "0" }}
            >
              {value}
            </span>
          )}
        </div>
        {isFocused && (
          <div className="inline-block h-3 leading-none blinking bg-background-darkgray" style={{ width: "1px" }} />
        )}
        {props.showUnitInside && props.selectedUnit && props.value != null && (
          <div className="text-xs text-text-secondary"> {props.selectedUnit}</div>
        )}
        {props.after && props.after()}
      </div>
      {isFocused && isMobile && (
        <CustomKeyboard
          ref={keyboardRef}
          onInput={handleInput}
          inputRef={inputRef}
          keyboardAddon={props.keyboardAddon}
          onBlur={blur}
          onPlus={() => {
            const nextValue = props.onNext ? props.onNext(Number(value)) : Number(value) + (props.step ?? 1);
            const newValue = clamp(nextValue, props.min, props.max);
            valueRef.current = newValue != null ? newValue.toString() : "";
            setValue(newValue != null ? newValue.toString() : "");
            if (props.onInput) {
              props.onInput(newValue);
            }
          }}
          onMinus={() => {
            const prevValue = props.onPrev ? props.onPrev(Number(value)) : Number(value) - (props.step ?? 1);
            const newValue = clamp(prevValue, props.min, props.max);
            valueRef.current = newValue != null ? newValue.toString() : "";
            setValue(newValue != null ? newValue.toString() : "");
            if (props.onInput) {
              props.onInput(newValue);
            }
          }}
          allowDot={props.allowDot}
          allowNegative={props.allowNegative}
          isNegative={value[0] === "-"}
          withDot={value.includes(".")}
          enableCalculator={props.enableCalculator}
          onShowCalculator={() => {
            blur();
            setIsCalculatorOpen(true);
            if (props.selectedUnit && props.selectedUnit !== "%") {
              openCalculator({ unit: props.selectedUnit });
            }
          }}
          enableUnits={props.enableUnits}
          onChangeUnits={props.onChangeUnits}
          selectedUnit={props.selectedUnit}
        />
      )}
    </div>
  );
}

interface ICustomKeyboardProps {
  onInput: (value: string) => void;
  onBlur: () => void;
  onPlus: () => void;
  onMinus: () => void;
  allowDot?: boolean;
  allowNegative?: boolean;
  isNegative: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  withDot: boolean;
  keyboardAddon?: JSX.Element;

  enableCalculator?: boolean;
  onShowCalculator?: () => void;

  enableUnits?: (IUnit | IPercentageUnit)[];
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
  selectedUnit?: IUnit | IPercentageUnit;
}

const CustomKeyboard = forwardRef((props: ICustomKeyboardProps, ref: React.ForwardedRef<HTMLDivElement>) => {
  const containerRef = typeof window !== "undefined" ? window.document.querySelector("#keyboard") : undefined;

  const element = (
    <div ref={ref} id="keyboard-content" className="fixed bottom-0 left-0 z-50 w-full keyboard-shadow">
      <div className="safe-area-inset-bottom">
        <div className="flex items-center w-full gap-2 px-4 bg-background-subtle">
          <div className="flex-1">{props.keyboardAddon}</div>
          {props.enableCalculator && (
            <div className="py-2">
              <button
                data-cy="keyboard-rm-calculator" data-testid="keyboard-rm-calculator" testID="keyboard-rm-calculator"
                className="flex items-center justify-center w-24 px-2 py-1 border rounded keyboard-close border-border-cardpurple bg-background-cardpurple"
                onClick={props.onShowCalculator}
              >
                <span className="mr-2">RM</span>
                <span>
                  <IconCalculator size={14} />
                </span>
              </button>
            </div>
          )}
        </div>
        <div className="flex w-full gap-4 p-4 bg-background-default">
          <div className="grid flex-1 grid-cols-3 gap-2">
            {[
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              props.allowNegative ? "-" : "",
              "0",
              props.allowDot ? "." : "",
            ].map((key, i) => {
              if (key) {
                return (
                  <button
                    data-cy={`keyboard-button-${key}`} data-testid={`keyboard-button-${key}`} testID={`keyboard-button-${key}`}
                    key={key}
                    className="p-2 text-2xl bg-background-default active:bg-background-neutral touch-manipulation text-text-primary"
                    onClick={() => props.onInput(key)}
                  >
                    {key}
                  </button>
                );
              } else {
                return <div key={`empty-${i}`} />;
              }
            })}
          </div>
          <div className="w-24 mt-2">
            <div className="mb-4">
              <button
                className="flex items-center justify-center w-full pt-2 pb-1 border rounded touch-manipulation keyboard-close border-border-cardpurple bg-background-cardpurple"
                data-cy="keyboard-close" data-testid="keyboard-close" testID="keyboard-close"
                onClick={props.onBlur}
              >
                <IconKeyboardClose />
              </button>
            </div>
            <div className="flex gap-1">
              <div className="flex-1">
                <button
                  className="flex items-center justify-center w-full p-2 border rounded touch-manipulation rounded-e-none border-border-cardpurple bg-background-cardpurple text-icon-neutral"
                  data-cy="keyboard-minus" data-testid="keyboard-minus" testID="keyboard-minus"
                  onClick={props.onMinus}
                >
                  -
                </button>
              </div>
              <div className="flex-1">
                <button
                  className="flex items-center justify-center w-full p-2 border rounded touch-manipulation rounded-s-none border-border-cardpurple bg-background-cardpurple text-icon-neutral"
                  data-cy="keyboard-plus" data-testid="keyboard-plus" testID="keyboard-plus"
                  onClick={props.onPlus}
                >
                  +
                </button>
              </div>
            </div>
            {props.enableUnits && props.selectedUnit ? (
              <div className="flex items-center h-10 gap-2 mt-4">
                {props.enableUnits.map((unit) => (
                  <button
                    key={unit}
                    className={`flex text-icon-neutral touch-manipulation items-center  aspect-square justify-center flex-1 w-full border rounded ${unit === props.selectedUnit ? "border-border-prominent bg-background-cardpurpleselected" : " border-border-cardpurple bg-background-cardpurple"}`}
                    data-cy={`keyboard-unit-${unit}`} data-testid={`keyboard-unit-${unit}`} testID={`keyboard-unit-${unit}`}
                    onClick={() => {
                      if (props.onChangeUnits) {
                        props.onChangeUnits(unit);
                      }
                    }}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-10 mt-4"></div>
            )}
            <div className="mt-4">
              <button
                className="flex items-center justify-center w-full h-10 border rounded touch-manipulation border-border-cardpurple bg-background-cardpurple"
                data-cy={`keyboard-backspace`} data-testid={`keyboard-backspace`} testID={`keyboard-backspace`}
                onClick={() => props.onInput("⌫")}
              >
                <IconBackspace />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return containerRef ? createPortal(element, containerRef) : element;
});
