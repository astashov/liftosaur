/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { JSX } from "react";
import { useRef } from "react";
import { MathUtils } from "../utils/math";
import { StringUtils } from "../utils/string";
import { Input } from "./input";

interface IInputNumberProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "ref"> {
  value?: number;
  label?: string;
  step?: number;
  min?: number;
  max?: number;
  onUpdate: (value: number) => void;
}

export function InputNumber(props: IInputNumberProps): JSX.Element {
  const { value, label, step, min, max, onUpdate, ...rest } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const actualStep = step ?? 1;

  function getValue(): number | undefined {
    const inputValue = inputRef.current!.value || min;
    const v = inputValue != null ? Number(inputValue) : undefined;
    if (v != null && !isNaN(v)) {
      return MathUtils.clamp(v, min, max);
    }
    return undefined;
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div>
          <button
            className="w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-minus"
            data-cy={`input-${StringUtils.dashcase(props.label || "")}-minus`}
            style={{ userSelect: "none", touchAction: "manipulation" }}
            onClick={() => {
              const v = getValue();
              if (v != null) {
                onUpdate(MathUtils.clamp(v - actualStep, min, max));
              }
            }}
          >
            -
          </button>
        </div>
        <div className="flex items-center flex-1 gap-2">
          <div className="flex-1">
            <Input
              label={label}
              labelSize="xs"
              inputSize="sm"
              ref={inputRef}
              step="0.01"
              type="number"
              value={value}
              data-cy={`input-${StringUtils.dashcase(props.label || "")}-field`}
              onBlur={() => {
                const v = getValue();
                if (v != null) {
                  onUpdate(v);
                }
              }}
              {...(rest as any)}
            />
          </div>
        </div>
        <div>
          <button
            className="w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-plus"
            data-cy={`input-${StringUtils.dashcase(props.label || "")}-plus`}
            style={{ userSelect: "none", touchAction: "manipulation" }}
            onClick={() => {
              const v = getValue();
              if (v != null) {
                onUpdate(MathUtils.clamp(v + actualStep, min, max));
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
