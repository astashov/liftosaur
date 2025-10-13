import { h, JSX, Ref } from "preact";
import { forwardRef, useState, useCallback } from "preact/compat";
import { IEither } from "../utils/types";

export const inputClassName =
  "inline-block w-full px-4 text-base py-2 leading-normal bg-background-default border border-border-prominent rounded-lg appearance-none focus:outline-none focus:shadow-outline text-base";

export type IValidationError = "required" | "pattern-mismatch";

export interface IProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, "ref"> {
  label?: string;
  identifier: string;
  changeType?: "onblur" | "oninput";
  errorMessage?: string;
  patternMessage?: string;
  requiredMessage?: string;
  changeHandler?: (e: IEither<string, Set<IValidationError>>) => void;
}

export function selectInputOnFocus(e: Event): boolean | undefined {
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

export const Input2 = forwardRef((props: IProps, ref: Ref<HTMLInputElement>): JSX.Element => {
  const { label, changeHandler, errorMessage, patternMessage, className: otherClassName, ...otherProps } = props;
  const changeType = props.changeType || "onblur";
  const identifier = props.identifier;
  const [validationErrors, setValidationErrors] = useState<Set<IValidationError>>(new Set());

  const onInputHandler = useCallback(
    (e: Event) => {
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

  let className = "relative block text-left border rounded-md appearance-none ";
  if (props.errorMessage || validationErrors.size > 0) {
    className += " border-text-error";
  } else {
    className += " border-form-inputstroke";
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

  return (
    <div className="w-full">
      {props.label && (
        <label id={identifier} className={`leading-none text-sm text-text-primary pb-1`}>
          {props.label}
        </label>
      )}
      <div className="relative flex">
        <input
          id={identifier}
          data-cy={`${identifier}-input`}
          ref={ref}
          onBlur={changeType === "onblur" ? onInputHandler : undefined}
          onInput={changeType === "oninput" ? onInputHandler : undefined}
          onFocus={selectInputOnFocus}
          className={`flex-1 w-0 min-w-0 p-2 text-sm border rounded-md focus:outline-none bg-form-inputbg ${otherClassName} ${errorMessages.length > 0 ? "border-text-error" : "border-form-inputstroke"}`}
          {...otherProps}
        />
      </div>
      {errorMessages.map((message) => (
        <div className="text-xs text-left text-text-error" key={message}>
          {message}
        </div>
      ))}
    </div>
  );
});
