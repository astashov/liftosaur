import { JSX, RefObject, h } from "preact";
import { StringUtils } from "../utils/string";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { IconKeyboardClose } from "./icons/iconKeyboardClose";
import { MathUtils } from "../utils/math";
import { IPercentageUnit, IUnit } from "../types";
import { IconCalculator } from "./icons/iconCalculator";
import { Modal } from "./modal";
import { RepMaxCalculator } from "./repMaxCalculator";
import { createPortal, forwardRef } from "preact/compat";
import { Mobile } from "../../lambda/utils/mobile";
import { IconBackspace } from "./icons/iconBackspace";

interface IInputNumber2Props {
  name: string;
  placeholder?: string;
  value?: number;
  width?: number;
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
  allowDot?: boolean;
  allowNegative?: boolean;
  enableCalculator?: boolean;
  enableUnits?: (IUnit | IPercentageUnit)[];
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
  selectedUnit?: IUnit | IPercentageUnit;
}

function clamp(value: string | number, min?: number, max?: number): number | undefined {
  if (value === "") {
    return undefined;
  }
  const num = MathUtils.clamp(Number(value), min, max);
  if (isNaN(num)) {
    return MathUtils.clamp(0, min, max);
  }
  return num;
}

export function InputNumber2(props: IInputNumber2Props): JSX.Element {
  const [value, setValue] = useState(props.value?.toString() ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const inputRef = useRef<HTMLInputElement>();
  const containerRef = useRef<HTMLDivElement>();
  const valueRef = useRef(value);
  const keyboardRef = useRef<HTMLDivElement>();
  const switchRef = useRef(false);
  const onClickTarget = useRef<HTMLElement>();
  const isFocusedRef = useRef(isFocused);
  const isTypingRef = useRef(isTyping);
  const allowDotRef = useRef(!!props.allowDot);
  const allowNegativeRef = useRef(!!props.allowNegative);
  const isMobile = typeof window !== "undefined" && Mobile.isMobile(window.navigator?.userAgent || "");
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const isCalculatorOpenRef = useRef(isCalculatorOpen);
  const onBlurRef = useRef<((value: number | undefined) => void) | undefined>(props.onBlur);
  const onInputRef = useRef<((value: number | undefined) => void) | undefined>(props.onInput);
  useEffect(() => {
    onBlurRef.current = props.onBlur;
    onInputRef.current = props.onInput;
  }, [props.onBlur, props.onInput]);

  const maxLength = (props.max?.toString().length ?? 5) + (props.allowDot ? 3 : 0) + (props.allowNegative ? 1 : 0);

  useEffect(() => {
    valueRef.current = props.value?.toString() ?? "";
    setValue(props.value?.toString() ?? "");
  }, [props.value]);

  useEffect(() => {
    isFocusedRef.current = isFocused;
    allowDotRef.current = !!props.allowDot;
    allowNegativeRef.current = !!props.allowNegative;
    isCalculatorOpenRef.current = !!isCalculatorOpen;
  }, [isFocused, props.allowDot, props.allowNegative, isCalculatorOpen]);

  const handleInput = (key: string) => {
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
      if (allowDotRef.current && Number(newValue) !== 0 && !newValue.includes(".")) {
        newValue += key;
      }
    } else if (newValue.length < maxLength) {
      newValue += key;
    }
    setIsTyping(true);
    isTypingRef.current = true;
    valueRef.current = newValue;
    setValue(newValue);
    if (onInputRef.current) {
      const newValueNum = clamp(newValue, props.min, props.max);
      onInputRef.current(newValueNum);
    }
  };

  const blur = useCallback(() => {
    setIsFocused(false);
    setIsTyping(false);
    isTypingRef.current = false;
    let newValueNum = clamp(valueRef.current, props.min, props.max);
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
      const paddingBottom = keyboardRef.current?.clientHeight ?? 0;
      document.body.style.paddingBottom = `${paddingBottom}px`;

      document.querySelectorAll(".bottom-sticked").forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.bottom = `${paddingBottom}px`;
        }
      });

      let scrollableContainer = containerRef.current as HTMLElement | null;
      while (scrollableContainer && scrollableContainer.scrollHeight <= scrollableContainer.clientHeight) {
        scrollableContainer = scrollableContainer.parentElement;
      }
      scrollableContainer = scrollableContainer ?? document.documentElement;

      const elementTop = (containerRef.current?.getBoundingClientRect().top ?? 0) + scrollableContainer.scrollTop;
      const elementHeight = containerRef.current?.clientHeight ?? 0;
      const elementCenter = elementTop + elementHeight / 2;
      const scrollTop = scrollableContainer.scrollTop;
      const scrollBottom =
        scrollableContainer.clientHeight +
        scrollTop -
        (scrollableContainer === document.documentElement ? paddingBottom : 0);

      if (elementCenter > scrollBottom || elementCenter < scrollTop) {
        const top = elementCenter - scrollableContainer.clientHeight / 2;
        scrollableContainer.scrollTo({
          top: top,
          behavior: "smooth",
        });
      }
    } else {
      if (!isMobile) {
        return;
      }
      if (!switchRef.current) {
        document.body.style.paddingBottom = "0px";
        document.body.classList.remove("show-keyboard");
        document.querySelectorAll(".bottom-sticked").forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.bottom = "0px";
          }
        });
      }
      switchRef.current = false;
    }
  }, [isFocused, props.initialValue]);

  useEffect(() => {
    const keyboardHandler = (event: KeyboardEvent) => {
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
    const documentClickHandler = (event: MouseEvent | TouchEvent) => {
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
        className="flex items-center justify-center h-6 bg-white border rounded border-grayv3-200 input-number-child"
        style={{ width: `${props.width ?? 4}rem` }}
        tabIndex={props.tabIndex ?? 0}
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={(event) => {
          setTimeout(() => {
            let target = (event.relatedTarget || onClickTarget.current) as HTMLElement | null;
            const result = maybeBlur(target);
            if (!result) {
              const currentTarget = event.currentTarget || event.target;
              event.preventDefault();
              event.stopImmediatePropagation();
              if (currentTarget) {
                currentTarget.focus();
              }
            }
          }, 0);
        }}
        onClick={(e) => {
          e.currentTarget.focus();
        }}
        data-cy={`input-${StringUtils.dashcase(props.name)}-field`}
      >
        <div ref={inputRef}>
          {!value && !isFocused && props.placeholder ? (
            <span className="text-sm text-grayv3-300 text-ellipsis whitespace-nowrap">{props.placeholder}</span>
          ) : (
            <span
              className={`text-sm inline-block ${isFocused && !isTypingRef.current ? "bg-bluev3-300" : ""}`}
              style={{ padding: value ? "1px" : "0" }}
            >
              {value}
            </span>
          )}
        </div>
        {isFocused && (
          <div className="inline-block h-3 leading-none blinking bg-grayv3-main" style={{ width: "1px" }} />
        )}
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
          }}
          enableUnits={props.enableUnits}
          onChangeUnits={props.onChangeUnits}
          selectedUnit={props.selectedUnit}
        />
      )}
      {props.enableCalculator && isCalculatorOpen && props.selectedUnit && props.selectedUnit !== "%" && (
        <Modal zIndex={60} shouldShowClose={true} onClose={() => setIsCalculatorOpen(false)} isFullWidth={true}>
          <div style={{ minWidth: "80%" }} data-cy="modal-rep-max-calculator" className="modal-rep-max-calculator">
            <RepMaxCalculator
              backLabel="Back"
              unit={props.selectedUnit}
              onSelect={(weightValue) => {
                if (weightValue == null) {
                  valueRef.current = "";
                  setValue("");
                  if (props.onInput) {
                    props.onInput(undefined);
                  }
                } else {
                  const newValue = clamp(weightValue, props.min, props.max);
                  valueRef.current = newValue?.toString() ?? "";
                  setValue(newValue?.toString() ?? "");
                  if (props.onInput) {
                    props.onInput(newValue);
                  }
                }
                setIsCalculatorOpen(false);
              }}
            />
          </div>
        </Modal>
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
  inputRef: RefObject<HTMLInputElement>;
  withDot: boolean;
  keyboardAddon?: JSX.Element;

  enableCalculator?: boolean;
  onShowCalculator?: () => void;

  enableUnits?: (IUnit | IPercentageUnit)[];
  onChangeUnits?: (unit: IUnit | IPercentageUnit) => void;
  selectedUnit?: IUnit | IPercentageUnit;
}

const CustomKeyboard = forwardRef((props: ICustomKeyboardProps, ref: RefObject<HTMLDivElement>) => {
  return createPortal(
    <div
      ref={ref}
      id="keyboard-content"
      class="fixed z-50 bottom-0 left-0 w-full"
      style={{ boxShadow: "0 4px 30px 0 rgba(0, 0, 0, 0.25)" }}
    >
      <div className="safe-area-inset-bottom">
        <div className="flex items-center w-full gap-2 px-4 bg-purplev3-50">
          <div className="flex-1">{props.keyboardAddon}</div>
          {props.enableCalculator && (
            <div className="py-2">
              <button
                data-cy="keyboard-rm-calculator"
                className="flex items-center justify-center w-24 px-2 py-1 border rounded keyboard-close border-purplev3-200 bg-purplev3-100"
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
        <div className="flex w-full gap-4 p-4 bg-white">
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
            ].map((key) => {
              if (key) {
                return (
                  <button
                    data-cy={`keyboard-button-${key}`}
                    key={key}
                    className="p-2 text-2xl bg-white active:bg-gray-200 touch-manipulation"
                    onClick={() => props.onInput(key)}
                  >
                    {key}
                  </button>
                );
              } else {
                return <div key={key} />;
              }
            })}
          </div>
          <div className="w-24 mt-2">
            <div className="mb-4">
              <button
                className="flex items-center justify-center w-full pt-2 pb-1 border rounded touch-manipulation keyboard-close border-purplev3-200 bg-purplev3-100"
                data-cy="keyboard-close"
                onClick={props.onBlur}
              >
                <IconKeyboardClose />
              </button>
            </div>
            <div className="flex gap-1">
              <div className="flex-1">
                <button
                  className="flex items-center justify-center w-full p-2 border rounded touch-manipulation rounded-e-none border-purplev3-200 bg-purplev3-100"
                  data-cy="keyboard-minus"
                  onClick={props.onMinus}
                >
                  -
                </button>
              </div>
              <div className="flex-1">
                <button
                  className="flex items-center justify-center w-full p-2 border rounded touch-manipulation rounded-s-none border-purplev3-200 bg-purplev3-100"
                  data-cy="keyboard-plus"
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
                    className={`flex touch-manipulation items-center  aspect-square justify-center flex-1 w-full border rounded ${unit === props.selectedUnit ? "border-purplev3-300 bg-purplev3-200" : "border-purplev3-200 bg-purplev3-100"}`}
                    data-cy={`keyboard-unit-${unit}`}
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
                className="flex items-center justify-center w-full h-10 border rounded touch-manipulation border-purplev3-200 bg-purplev3-100"
                data-cy={`keyboard-backspace`}
                onClick={() => props.onInput("⌫")}
              >
                <IconBackspace />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.querySelector("#keyboard")!
  );
});
