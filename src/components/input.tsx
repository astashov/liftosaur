import React, { JSX, Ref, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { UidFactory_generateUid } from "../utils/generator";
import { StringUtils_dashcase } from "../utils/string";
import { IEither } from "../utils/types";

export const inputClassName =
  "inline-block w-full px-4 text-base py-2 leading-normal bg-background-default border border-border-prominent rounded-lg appearance-none focus:outline-none focus:shadow-outline text-base";

export type IValidationError = "required" | "pattern-mismatch";

export interface IInputHandle {
  touch: () => void;
}

export interface IProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement> & React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "ref" | "autoCapitalize" | "autoCorrect"
  > {
  label?: string;
  identifier?: string;
  multiline?: number;
  changeType?: "onblur" | "oninput";
  isLabelOutside?: boolean;
  defaultValue?: number | string | readonly string[];
  inputSize?: "md" | "sm";
  labelSize?: "xs" | "sm";
  errorMessage?: string;
  patternMessage?: string;
  requiredMessage?: string;
  changeHandler?: (e: IEither<string, Set<IValidationError>>) => void;
  handleRef?: Ref<IInputHandle>;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
}

export function selectInputOnFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): boolean | undefined {
  const target = e.target;
  if (target instanceof HTMLInputElement) {
    const handleNumber = target.type === "number";
    if (handleNumber) {
      target.type = "text";
    }
    const value = (target as HTMLInputElement).value;
    target.setSelectionRange(0, value.length);
    if (handleNumber) {
      target.type = "number";
    }
    return false;
  }
  return undefined;
}

export const Input = forwardRef((props: IProps, ref: Ref<HTMLInputElement> | Ref<HTMLTextAreaElement>): JSX.Element => {
  const {
    inputSize,
    label,
    changeHandler,
    errorMessage,
    patternMessage,
    requiredMessage,
    changeType: changeTypeProp,
    isLabelOutside,
    labelSize: labelSizeProp,
    identifier: identifierProp,
    multiline,
    value: valueProp,
    defaultValue: _defaultValue,
    handleRef: _handleRef,
    autoCapitalize,
    autoCorrect,
    ...otherProps
  } = props;
  const autoCorrectStr = autoCorrect == null ? undefined : autoCorrect ? "on" : "off";
  const changeType = changeTypeProp || "onblur";
  const identifier = identifierProp || StringUtils_dashcase((label || UidFactory_generateUid(8))?.toLowerCase());
  const [validationErrors, setValidationErrors] = useState<Set<IValidationError>>(new Set());
  const [touched, setTouched] = useState(false);
  const size = inputSize || "md";

  const internalInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const setInputRef = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      internalInputRef.current = el;
      if (typeof ref === "function") {
        (ref as (instance: HTMLInputElement | HTMLTextAreaElement | null) => void)(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>).current = el;
      }
    },
    [ref]
  );

  useImperativeHandle(props.handleRef, () => ({
    touch: () => {
      setTouched(true);
      const el = internalInputRef.current;
      if (el instanceof HTMLInputElement) {
        validateTarget(el, "snapshot");
      }
    },
  }));

  const isControlled = valueProp !== undefined;
  const [localValue, setLocalValue] = useState(valueProp);
  useEffect(() => {
    if (isControlled) {
      setLocalValue(valueProp);
    }
  }, [valueProp, isControlled]);

  const validateTarget = useCallback(
    (target: HTMLInputElement, displayMode: "clear-only" | "snapshot") => {
      const errors = new Set<IValidationError>();
      if (target.validity.patternMismatch) {
        errors.add("pattern-mismatch");
      }
      if (target.validity.valueMissing) {
        errors.add("required");
      }
      if (displayMode === "snapshot") {
        setValidationErrors(errors);
      } else {
        setValidationErrors((prev) => {
          const next = new Set<IValidationError>();
          for (const err of prev) {
            if (errors.has(err)) {
              next.add(err);
            }
          }
          return next;
        });
      }
      if (changeHandler != null) {
        if (errors.size > 0) {
          changeHandler({ success: false, error: errors });
        } else {
          changeHandler({ success: true, data: target.value });
        }
      }
    },
    [changeHandler]
  );

  const onInputHandler = useCallback(
    (
      e:
        | React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
        | React.FormEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const target = e.target;
      if (target instanceof HTMLInputElement) {
        validateTarget(target, "clear-only");
      }
    },
    [validateTarget]
  );

  let className = "relative block w-full text-left border rounded-lg appearance-none ";
  if (errorMessage || (touched && validationErrors.size > 0)) {
    className += " border-text-error";
  } else {
    className += " border-form-inputstroke";
  }

  const errorMessages = [];
  if (errorMessage) {
    errorMessages.push(errorMessage);
  }
  if (touched) {
    for (const error of validationErrors) {
      if (error === "required") {
        errorMessages.push(requiredMessage);
      } else if (error === "pattern-mismatch") {
        errorMessages.push(patternMessage);
      }
    }
  }

  let containerClassName = "inline-block bg-background-default rounded-lg";
  if (className.indexOf("w-full") !== -1) {
    containerClassName += " w-full";
  }
  const labelSizeVal = labelSizeProp || "sm";
  return (
    <div className={containerClassName}>
      {label && isLabelOutside && (
        <div className={`leading-none ${labelSizeVal === "xs" ? "text-xs" : "text-sm"} text-text-secondary pb-1`}>
          {label}
        </div>
      )}
      <label
        data-cy={`${identifier}-label`} data-testid={`${identifier}-label`} testID={`${identifier}-label`}
        className={className}
        style={{
          minHeight: size === "md" ? (isLabelOutside ? "40px" : "48px") : isLabelOutside ? "32px" : "40px",
        }}
      >
        <div
          className={`relative ${isLabelOutside ? "mx-2" : "mx-4"} ${size === "md" ? "my-1" : ""}`}
          style={size !== "md" ? { marginTop: "1px", marginBottom: "1px" } : {}}
        >
          {label && !isLabelOutside && (
            <div
              className={`leading-none relative ${labelSizeVal === "xs" ? "text-xs" : "text-sm"} text-text-secondary`}
              style={{ top: "2px", left: "0" }}
            >
              {label}
            </div>
          )}
          <div className="relative flex" style={{ top: label ? "3px" : "8px", left: "0" }}>
            {multiline ? (
              <textarea
                data-cy={`${identifier}-input`} data-testid={`${identifier}-input`} testID={`${identifier}-input`}
                ref={setInputRef}
                value={isControlled ? localValue : undefined}
                defaultValue={!isControlled ? props.defaultValue : undefined}
                onChange={(e) => {
                  if (isControlled) {
                    setLocalValue(e.target.value);
                  }
                }}
                onBlur={(e) => {
                  setTouched(true);
                  const target = e.target;
                  if (target instanceof HTMLInputElement) {
                    validateTarget(target, "snapshot");
                  }
                }}
                onInput={changeType === "oninput" ? onInputHandler : undefined}
                onFocus={selectInputOnFocus}
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrectStr}
                className="flex-1 w-0 min-w-0 text-base border-none focus:outline-none bg-background-default"
                style={{ fontSize: size === "md" ? "16px" : "15px", height: `${multiline * 25}px` }}
                {...otherProps}
              />
            ) : (
              <input
                data-cy={`${identifier}-input`} data-testid={`${identifier}-input`} testID={`${identifier}-input`}
                ref={setInputRef}
                value={isControlled ? localValue : undefined}
                defaultValue={!isControlled ? props.defaultValue : undefined}
                onChange={(e) => {
                  if (isControlled) {
                    setLocalValue(e.target.value);
                  }
                }}
                onBlur={(e) => {
                  setTouched(true);
                  const target = e.target;
                  if (target instanceof HTMLInputElement) {
                    validateTarget(target, "snapshot");
                  }
                }}
                onInput={changeType === "oninput" ? onInputHandler : undefined}
                onFocus={selectInputOnFocus}
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrectStr}
                className="flex-1 w-0 min-w-0 text-base border-none focus:outline-none bg-background-default"
                style={{ height: "1.25rem", fontSize: size === "md" ? "16px" : "15px" }}
                {...otherProps}
              />
            )}
          </div>
        </div>
      </label>
      {errorMessages.map((message) => (
        <div className="text-xs text-left text-text-error" key={message}>
          {message}
        </div>
      ))}
    </div>
  );
});
