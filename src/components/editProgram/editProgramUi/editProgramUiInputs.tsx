import { JSX, h } from "preact";
import { useRef } from "preact/hooks";
import { Weight } from "../../../models/weight";
import { IWeight, IPercentage, IEquipment, ISettings, IUnit } from "../../../types";
import { MathUtils } from "../../../utils/math";

interface INumInputProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, "ref"> {
  name: string;
  value?: number;
  dimmed?: boolean;
  label?: string;
  step?: number;
  min?: number;
  max?: number;
  onUpdate: (value?: number) => void;
  onIncrement?: (value?: number) => void;
  onDecrement?: (value?: number) => void;
}

export function NumInput(props: INumInputProps): JSX.Element {
  const { label, step, min, max, onUpdate, ...rest } = props;
  const inputRef = useRef<HTMLInputElement>();
  const actualStep = step ?? 1;

  function getValue(): number | undefined {
    const inputValue = inputRef.current.value || "0";
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
            data-cy={`num-input-${props.name}-minus`}
            onClick={() => {
              const v = getValue() ?? props.min ?? 0;
              if (!props.disabled) {
                if (props.onDecrement) {
                  props.onDecrement(v);
                } else {
                  onUpdate(MathUtils.clamp(v - actualStep, min, max));
                }
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
              data-cy={`num-input-${props.name}-value`}
              className={`w-full p-1 text-sm text-center border rounded border-grayv2-200 ${
                props.dimmed ? "text-grayv2-300" : ""
              }`}
              type="num"
              onBlur={() => {
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
            data-cy={`num-input-${props.name}-plus`}
            onClick={() => {
              const v = getValue();
              if (!props.disabled && v != null) {
                if (props.onIncrement) {
                  props.onIncrement(v);
                } else {
                  onUpdate(MathUtils.clamp(v + actualStep, min, max));
                }
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
  name: string;
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
        name={`${props.name}-weight`}
        dimmed={props.dimmed}
        disabled={props.disabled}
        value={props.value?.value}
        onIncrement={(value) => {
          if (value != null) {
            const unit = selectRef.current.value as "%" | IUnit;
            if (unit === "%") {
              const newValue = Math.max(0, value + 1);
              props.onUpdate(Weight.buildPct(newValue));
            } else {
              const newWeight = Weight.increment(Weight.build(value, unit), props.settings, props.equipment);
              props.onUpdate(newWeight);
            }
          }
        }}
        onDecrement={(value) => {
          if (value != null) {
            const unit = selectRef.current.value as "%" | IUnit;
            if (unit === "%") {
              const newValue = Math.max(0, value - 1);
              props.onUpdate(Weight.buildPct(newValue));
            } else {
              const newWeight = Weight.decrement(Weight.build(value, unit), props.settings, props.equipment);
              props.onUpdate(newWeight);
            }
          }
        }}
        onUpdate={(newValue) => {
          if (newValue == null) {
            props.onUpdate(newValue);
          } else if (selectRef.current.value === "%") {
            props.onUpdate(Weight.buildPct(Math.max(0, newValue)));
          } else {
            props.onUpdate(Weight.build(Math.max(0, newValue), selectRef.current.value as "kg" | "lb"));
          }
        }}
      />
      <div className="ml-2">
        <select
          ref={selectRef}
          data-cy={`${props.name}-weight-unit`}
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
