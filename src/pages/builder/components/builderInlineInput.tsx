/* eslint-disable no-unused-expressions */
import { h, JSX } from "preact";
import { useRef } from "preact/hooks";

export interface IBuilderInlineInputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  style?: JSX.CSSProperties;
  minWidth?: number;
  onInputNumber?: (value: number) => void;
  onInputString?: (value: string) => void;
}

export function BuilderLinkInlineInput(props: IBuilderInlineInputProps): JSX.Element {
  return <BuilderInlineInput className="underline" {...props} />;
}

export function BuilderInlineInput(props: IBuilderInlineInputProps): JSX.Element {
  const { className, minWidth, style, onInput, ...otherProps } = props;
  const elRef = useRef<HTMLInputElement>(null);
  const length = Math.max(minWidth == null ? 0 : minWidth, `${props.value}`.length);

  return (
    <input
      ref={elRef}
      className={`min-w-0 font-bold border-none ${className}`}
      style={{ width: `${length}ch`, ...(style || {}) }}
      onInput={(e) => {
        if (e.target instanceof HTMLInputElement) {
          const value = e.target.value;
          const num = parseInt(value, 10);
          if (!Number.isNaN(num)) {
            props.onInputNumber?.(num);
          }
          props.onInputString?.(value);
        }
        if (onInput) {
          onInput.call(elRef.current, e);
        }
      }}
      {...otherProps}
    />
  );
}
