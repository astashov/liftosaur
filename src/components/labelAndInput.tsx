import { h, JSX, Ref } from "preact";
import { forwardRef } from "preact/compat";
import { inputClassName } from "./input";

interface ILabelAndInputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  identifier: string;
  star?: boolean;
  label: string;
  errorMessage?: string;
  hint?: string;
}

export const LabelAndInput = forwardRef(
  (props: ILabelAndInputProps, ref: Ref<HTMLInputElement>): JSX.Element => {
    const { identifier, label, errorMessage, hint } = props;
    const id = [props.id, identifier].filter((r) => r).join(" ");
    return (
      <div className="mb-4">
        <label data-cy={`${identifier}-label`} for={identifier} className="block text-sm font-bold">
          {label}
          {props.star && <span className="text-redv2-main"> *</span>}
        </label>
        <input ref={ref} data-cy={`${identifier}-input`} id={id} className={inputClassName} type="text" {...props} />
        {hint && <div className="text-xs text-grayv2-main">{hint}</div>}
        {errorMessage && <div className="text-xs text-red-500">{errorMessage}</div>}
      </div>
    );
  }
);
