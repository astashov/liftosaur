/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { JSX, Ref } from "react";
import { forwardRef, useState, useCallback } from "react";
import { UidFactory } from "../utils/generator";
import { StringUtils } from "../utils/string";
import { IEither } from "../utils/types";

export const inputClassName =
  "inline-block w-full px-4 text-base py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline text-base";

export type IValidationError = "required" | "pattern-mismatch";

export interface IProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement> | React.TextareaHTMLAttributes<HTMLTextAreaElement>, "ref"> {
  label?: string;
  identifier?: string;
  multiline?: number;
  changeType?: "onblur" | "oninput";
  defaultValue?: number | string;
  inputSize?: "md" | "sm";
  labelSize?: "xs" | "sm";
  errorMessage?: string;
  patternMessage?: string;
  requiredMessage?: string;
  max?: number | string;
  min?: number | string;
  step?: number | string;
  pattern?: string;
  type?: string;
  autofocus?: boolean;
  changeHandler?: (e: IEither<string, Set<IValidationError>>) => void;
}

export function selectInputOnFocus(e: React.FocusEvent): boolean | undefined {
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

export const Input = forwardRef((props: IProps, ref: Ref<HTMLInputElement | HTMLTextAreaElement>): JSX.Element => {
  const { inputSize, labelSize, label, changeHandler, errorMessage, patternMessage, ...otherProps } = props;
  const changeType = props.changeType || "onblur";
  const identifier = props.identifier || StringUtils.dashcase((label || UidFactory.generateUid(8))?.toLowerCase());
  const [validationErrors, setValidationErrors] = useState<Set<IValidationError>>(new Set());
  const size = inputSize || "md";

  const onInputHandler = useCallback(
    (e: React.UIEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement) {
        const errors = new Set<IValidationError>();
        if (target.validity.patternMismatch) {
          errors.add("pattern-mismatch");
        }
        if (target.validity.valueMissing) {
          errors.add("required");
        }
        setValidationErrors(errors);
        if (props.changeHandler != null) {
          if (errors.size > 0) {
            props.changeHandler({ success: false, error: errors });
          } else {
            const value = (e.target as HTMLInputElement).value;
            props.changeHandler({ success: true, data: value });
          }
        }
      }
    },
    [changeHandler]
  );

  let className = "relative block w-full text-left border rounded-lg appearance-none ";
  if (props.errorMessage || validationErrors.size > 0) {
    className += " border-redv2-main";
  } else {
    className += " border-grayv2-200";
  }

  const errorMessages = [];
  if (props.errorMessage) {
    errorMessages.push(props.errorMessage);
  }
  for (const error of validationErrors) {
    if (error === "required") {
      errorMessages.push(props.requiredMessage);
    } else if (error === "pattern-mismatch") {
      errorMessages.push(props.patternMessage);
    }
  }

  let containerClassName = "inline-block bg-white rounded-lg";
  if (className.indexOf("w-full") !== -1) {
    containerClassName += " w-full";
  }
  const theLabelSize = labelSize || "sm";
  return (
    <div className={containerClassName}>
      <label
        data-cy={`${identifier}-label`}
        className={className}
        style={{ minHeight: size === "md" ? "48px" : "40px" }}
      >
        <div
          className={`relative mx-4 ${size === "md" ? "my-1" : ""}`}
          style={size !== "md" ? { marginTop: "1px", marginBottom: "1px" } : {}}
        >
          {props.label && (
            <div
              className={`leading-none relative ${theLabelSize === "xs" ? "text-xs" : "text-sm"} text-grayv2-700`}
              style={{ top: "2px", left: "0" }}
            >
              {props.label}
            </div>
          )}
          <div className="relative flex" style={{ top: props.label ? "3px" : "8px", left: "0" }}>
            {props.multiline ? (
              <textarea
                data-cy={`${identifier}-input`}
                ref={ref as Ref<HTMLTextAreaElement>}
                onBlur={changeType === "onblur" ? onInputHandler : undefined}
                onInput={changeType === "oninput" ? onInputHandler : undefined}
                onFocus={selectInputOnFocus}
                className="flex-1 w-0 min-w-0 text-base border-none focus:outline-none"
                style={{ fontSize: size === "md" ? "16px" : "15px", height: `${props.multiline * 25}px` }}
                {...(otherProps as any)}
              />
            ) : (
              <input
                data-cy={`${identifier}-input`}
                ref={ref as Ref<HTMLInputElement>}
                onBlur={changeType === "onblur" ? onInputHandler : undefined}
                onInput={changeType === "oninput" ? onInputHandler : undefined}
                onFocus={selectInputOnFocus}
                className="flex-1 w-0 min-w-0 text-base border-none focus:outline-none"
                style={{ height: "1.25rem", fontSize: size === "md" ? "16px" : "15px" }}
                {...(otherProps as any)}
              />
            )}
          </div>
        </div>
      </label>
      {errorMessages.map((message) => (
        <div className="text-xs text-left text-redv2-main" key={message}>
          {message}
        </div>
      ))}
    </div>
  );
});
