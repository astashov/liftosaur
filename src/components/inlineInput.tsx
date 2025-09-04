import { h, JSX } from "preact";
import { useRef } from "preact/hooks";

export interface IInlineInputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  style?: JSX.CSSProperties;
  minWidth?: number;
  onInputInt?: (value: number) => void;
  onInputFloat?: (value: number) => void;
  onInputString?: (value: string) => void;
}

export function LinkInlineInput(props: IInlineInputProps): JSX.Element {
  return <InlineInput className="underline" {...props} />;
}

export function InlineInput(props: IInlineInputProps): JSX.Element {
  const { className, minWidth, style, onInput, ...otherProps } = props;
  const elRef = useRef<HTMLInputElement>(null);
  const length = Math.max(minWidth == null ? 0 : minWidth, `${props.value}`.length + 1);

  return (
    <input
      ref={elRef}
      className={`min-w-0 font-bold border-none ${className}`}
      style={{ width: `${length}ch`, ...(style || {}) }}
      onInput={(e) => {
        if (e.target instanceof HTMLInputElement) {
          const value = e.target.value;
          const int = parseInt(value, 10);
          if (!Number.isNaN(int)) {
            props.onInputInt?.(int);
          }
          const float = parseFloat(value);
          if (!Number.isNaN(float)) {
            props.onInputFloat?.(float);
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
