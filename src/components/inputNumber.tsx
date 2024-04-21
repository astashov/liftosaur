import { JSX, h } from "preact";
import { useRef } from "preact/hooks";
import { MathUtils } from "../utils/math";
import { Input } from "./input";

interface IInputNumberProps {
  value: number;
  label?: string;
  step?: number;
  min?: number;
  max?: number;
  onUpdate: (value: number) => void;
}

export function InputNumber(props: IInputNumberProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>();
  const step = props.step ?? 1;

  function getValue(): number | undefined {
    const inputValue = inputRef.current.value;
    const value = Number(inputValue);
    if (inputValue && !isNaN(value)) {
      return MathUtils.clamp(value, props.min, props.max);
    }
    return undefined;
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div>
          <button
            className="w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-minus"
            data-cy="edit-weight-minus"
            onClick={() => {
              const value = getValue();
              if (value != null) {
                props.onUpdate(MathUtils.clamp(value - step, props.min, props.max));
              }
            }}
          >
            -
          </button>
        </div>
        <div className="flex items-center flex-1 gap-2">
          <div className="flex-1">
            <Input
              label={props.label}
              labelSize="xs"
              inputSize="sm"
              ref={inputRef}
              step="0.01"
              data-cy="edit-weight-input"
              type="number"
              value={props.value}
              onInput={() => {
                const value = getValue();
                if (value != null) {
                  props.onUpdate(value);
                }
              }}
            />
          </div>
        </div>
        <div>
          <button
            className="w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-plus"
            data-cy="edit-weight-plus"
            onClick={() => {
              const value = getValue();
              if (value != null) {
                props.onUpdate(MathUtils.clamp(value + step, props.min, props.max));
              }
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
