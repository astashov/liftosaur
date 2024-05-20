import { JSX, h } from "preact";
import { useRef } from "preact/hooks";
import { Weight } from "../../../models/weight";
import { IWeight, IPercentage, IEquipment, ISettings } from "../../../types";
import { MathUtils } from "../../../utils/math";

interface INumInputProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, "ref"> {
  value?: number;
  dimmed?: boolean;
  label?: string;
  step?: number;
  min?: number;
  max?: number;
  onUpdate: (value?: number) => void;
}

export function NumInput(props: INumInputProps): JSX.Element {
  const { label, step, min, max, onUpdate, ...rest } = props;
  const inputRef = useRef<HTMLInputElement>();
  const actualStep = step ?? 1;

  function getValue(): number | undefined {
    const inputValue = inputRef.current.value;
    const v = Number(inputValue);
    if (inputValue && !isNaN(v)) {
      return MathUtils.clamp(v, min, max);
    }
    return undefined;
  }

  return (
    <div className="w-full">
      <div className={`flex items-center gap-1 ${props.disabled ? "opacity-50" : ""}`}>
        <div>
          <button
            className="p-1 font-bold text-center border rounded border-grayv2-200 bg-grayv2-50"
            data-cy="num-input-minus"
            onClick={() => {
              const v = getValue() ?? props.min ?? 0;
              if (!props.disabled) {
                onUpdate(MathUtils.clamp(v - actualStep, min, max));
              }
            }}
          >
            -
          </button>
        </div>
        <div className="flex items-center flex-1 gap-2">
          <div className="flex-1">
            <input
              ref={inputRef}
              className={`w-full p-1 text-sm text-center border rounded border-grayv2-200 ${
                props.dimmed ? "text-grayv2-300" : ""
              }`}
              type="num"
              onInput={() => {
                const v = getValue();
                if (!props.disabled) {
                  onUpdate(v);
                }
              }}
              {...rest}
            />
          </div>
        </div>
        <div>
          <button
            className="p-1 font-bold text-center border rounded border-grayv2-200 bg-grayv2-50"
            data-cy="num-input-plus"
            onClick={() => {
              const v = getValue();
              if (!props.disabled && v != null) {
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

interface IWeightInputProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, "ref" | "value"> {
  value?: IWeight | IPercentage;
  label?: string;
  dimmed?: boolean;
  equipment?: IEquipment;
  settings: ISettings;
  onUpdate: (weight?: IWeight | IPercentage) => void;
}

export function WeightInput(props: IWeightInputProps): JSX.Element {
  const selectRef = useRef<HTMLSelectElement>();
  return (
    <div className="flex items-center w-full">
      <NumInput
        dimmed={props.dimmed}
        disabled={props.disabled}
        value={props.value?.value}
        onUpdate={(newValue) => {
          if (newValue == null) {
            props.onUpdate(newValue);
          } else if (selectRef.current.value === "%") {
            props.onUpdate(Weight.buildPct(newValue));
          } else {
            props.onUpdate(Weight.build(newValue, selectRef.current.value as "kg" | "lb"));
          }
        }}
      />
      <div className="ml-2">
        <select
          ref={selectRef}
          data-cy="edit-weight-unit"
          disabled={props.disabled}
          onChange={() => {
            if (props.value != null) {
              if (selectRef.current.value === "%") {
                props.onUpdate(Weight.buildPct(props.value.value));
              } else {
                props.onUpdate(Weight.build(props.value.value, selectRef.current.value as "kg" | "lb"));
              }
            }
          }}
        >
          {(props.settings.units === "lb" ? (["lb", "kg", "%"] as const) : (["kg", "lb", "%"] as const)).map((u) => {
            return (
              <option value={u} selected={props.value?.unit === u}>
                {u}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
