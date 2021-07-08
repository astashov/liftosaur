import { ComponentChildren, h, JSX, Ref } from "preact";
import { forwardRef } from "preact/compat";
import { inputClassName } from "./input";

interface ILabelAndSelectProps extends JSX.HTMLAttributes<HTMLSelectElement> {
  identifier: string;
  label: string;
  children: ComponentChildren;
}

export const LabelAndSelect = forwardRef(
  (props: ILabelAndSelectProps, ref: Ref<HTMLSelectElement>): JSX.Element => {
    const { identifier, label, children, ...restProps } = props;
    const id = [props.id, identifier].filter((r) => r).join(" ");
    return (
      <div className="mb-4">
        <label data-cy={`${identifier}-label`} for={identifier} className="block text-sm font-bold">
          {label}
        </label>
        <select ref={ref} data-cy={`${identifier}-select`} id={id} className={inputClassName} {...restProps}>
          {children}
        </select>
      </div>
    );
  }
);
