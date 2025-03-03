import { JSX, h } from "preact";
import { useRef, useState } from "preact/hooks";
import { Weight } from "../models/weight";
import { IExerciseType, IPercentage, ISettings, IUnit, IWeight } from "../types";
import { IconCalculator } from "./icons/iconCalculator";
import { Input } from "./input";
import { Modal } from "./modal";
import { RepMaxCalculator } from "./repMaxCalculator";

interface IInputWeightProps {
  value: IWeight | IPercentage;
  label?: string;
  exerciseType?: IExerciseType;
  units?: (IUnit | "%")[];
  settings: ISettings;
  "data-cy"?: string;
  onUpdate: (weight: IWeight | IPercentage) => void;
}

export function InputWeight(props: IInputWeightProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>();
  const unitRef = useRef<HTMLSelectElement>();
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  function getValue(): IWeight | IPercentage | undefined {
    const inputValue = inputRef.current.value;
    const value = Number(inputValue);
    if (inputValue && !isNaN(value)) {
      const unit = unitRef.current.value as IUnit | "%";
      if (unit === "%") {
        return Weight.buildPct(value);
      } else {
        return Weight.build(value, unit);
      }
    }
    return undefined;
  }
  const unit = props.value.unit;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div>
          <button
            className="w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-minus"
            data-cy="edit-weight-minus"
            onClick={() => {
              const value = getValue();
              if (value) {
                if (value.unit === "%") {
                  props.onUpdate(Weight.buildPct(value.value));
                } else {
                  const newWeight = Weight.decrement(value, props.settings, props.exerciseType);
                  props.onUpdate(newWeight);
                }
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
              data-cy={props["data-cy"]}
              inputSize="sm"
              ref={inputRef}
              step="0.01"
              type="number"
              value={props.value.value}
              onBlur={() => {
                const value = getValue();
                if (value != null) {
                  props.onUpdate(value);
                }
              }}
            />
          </div>
          <div>
            <select
              ref={unitRef}
              data-cy="edit-weight-unit"
              onChange={() => {
                const value = getValue();
                if (value != null) {
                  props.onUpdate(value);
                }
              }}
            >
              {(["kg", "lb", "%"] as const)
                .filter((u) => props.units == null || props.units.indexOf(u) !== -1)
                .map((u) => {
                  return (
                    <option value={u} selected={unit === u}>
                      {u}
                    </option>
                  );
                })}
            </select>
          </div>
        </div>
        {unit !== "%" && (
          <div>
            <button
              className="w-10 h-10 p-2 leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-calc"
              data-cy="edit-weight-calculator"
              onClick={() => {
                setIsCalculatorOpen(true);
              }}
            >
              <IconCalculator className="inline-block" size={16} />
            </button>
          </div>
        )}
        <div>
          <button
            className="w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-plus"
            data-cy="edit-weight-plus"
            onClick={() => {
              const value = getValue();
              if (value) {
                if (value.unit === "%") {
                  const newValue = value.value + 1;
                  props.onUpdate(Weight.buildPct(newValue));
                } else {
                  const newWeight = Weight.increment(value, props.settings, props.exerciseType);
                  props.onUpdate(newWeight);
                }
              }
            }}
          >
            +
          </button>
        </div>
      </div>
      {isCalculatorOpen && unit !== "%" && (
        <Modal shouldShowClose={true} onClose={() => setIsCalculatorOpen(false)} isFullWidth={true}>
          <div style={{ minWidth: "80%" }} data-cy="modal-rep-max-calculator">
            <RepMaxCalculator
              backLabel="Back"
              unit={unit}
              onSelect={(weightValue) => {
                if (weightValue != null) {
                  props.onUpdate(Weight.build(weightValue, unit));
                }
                setIsCalculatorOpen(false);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
