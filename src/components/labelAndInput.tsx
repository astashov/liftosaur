import React, { JSX, Ref, forwardRef } from "react";
import { inputClassName } from "./input";

interface ILabelAndInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  identifier: string;
  star?: boolean;
  label: string;
  errorMessage?: string;
  hint?: string;
}

export const LabelAndInput = forwardRef((props: ILabelAndInputProps, ref: Ref<HTMLInputElement>): JSX.Element => {
  const { identifier, label, errorMessage, hint } = props;
  const id = [props.id, identifier].filter((r) => r).join(" ");
  return (
    <div className="mb-4">
      <label data-testid={`${identifier}-label`} htmlFor={identifier} className="block text-sm font-bold">
        {label}
        {props.star && <span className="text-text-error"> *</span>}
      </label>
      <input ref={ref} data-testid={`${identifier}-input`} id={id} className={inputClassName} type="text" {...props} />
      {hint && <div className="text-xs text-text-secondary">{hint}</div>}
      {errorMessage && <div className="text-xs text-text-error">{errorMessage}</div>}
    </div>
  );
});
