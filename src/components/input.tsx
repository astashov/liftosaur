import { h, JSX } from "preact";
import { forwardRef, Ref, useState, useCallback } from "preact/compat";
import { IEither } from "../utils/types";

export const inputClassName =
  "inline-block w-full px-4 py-2 leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline";

export type IValidationError = "required" | "pattern-mismatch";

export interface IProps extends JSX.HTMLAttributes<HTMLInputElement> {
  label: string;
  errorMessage?: string;
  patternMessage?: string;
  requiredMessage?: string;
  changeHandler?: (e: IEither<string, Set<IValidationError>>) => void;
}

export const Input = forwardRef(
  (props: IProps, ref: Ref<HTMLInputElement>): JSX.Element => {
    const { label, changeHandler, errorMessage, patternMessage, ...otherProps } = props;
    const [validationErrors, setValidationErrors] = useState<Set<IValidationError>>(new Set());

    const onFocusHandler = useCallback(
      (e: Event) => {
        const target = e.target;
        if (target instanceof HTMLInputElement) {
          const value = (target as HTMLInputElement).value;
          target.setSelectionRange(0, value.length);
          return false;
        }
        return undefined;
      },
      [props.onFocus]
    );

    const onBlurHandler = useCallback(
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

    let containerClassName = "inline-block";
    if (className.indexOf("w-full") !== -1) {
      containerClassName += " w-full";
    }
    return (
      <div className={containerClassName}>
        <label className={className} style={{ minHeight: "3.5rem" }}>
          <div className="relative mx-4 my-1">
            <div className="relative text-sm text-grayv2-700" style={{ top: "2px", left: "0" }}>
              {props.label}
            </div>
            <div className="relative flex" style={{ top: "2px", left: "0" }}>
              <input
                ref={ref}
                onBlur={onBlurHandler}
                onFocus={onFocusHandler}
                className="flex-1 border-none focus:outline-none"
                style={{ fontSize: "16px" }}
                {...otherProps}
              />
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
  }
);
