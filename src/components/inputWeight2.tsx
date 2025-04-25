import { JSX, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { IExerciseType, IPercentage, IPercentageUnit, ISettings, ISubscription, IUnit, IWeight } from "../types";
import { InputNumber2 } from "./inputNumber2";
import { Weight } from "../models/weight";
import { IconBarbellSide } from "./icons/iconBarbellSide";
import { Tailwind } from "../utils/tailwindConfig";
import { Subscriptions } from "../utils/subscriptions";

interface IInputWeight2Props {
  value: IWeight | IPercentage | undefined;
  name: string;
  max?: number;
  min?: number;
  placeholder?: string;
  exerciseType?: IExerciseType;
  units?: (IUnit | IPercentageUnit)[];
  initialValue?: IWeight | IPercentage;
  addOn?: () => JSX.Element;
  settings: ISettings;
  onBlur?: (value: IWeight | IPercentage | undefined) => void;
  onInput?: (value: IWeight | IPercentage | undefined) => void;
  subscription?: ISubscription;
  tabIndex?: number;
}

export function InputWeight2(props: IInputWeight2Props): JSX.Element {
  const [unit, setUnit] = useState<IUnit | IPercentageUnit>(
    props.value?.unit ?? props.initialValue?.unit ?? props.settings.units
  );
  const unitRef = useRef(unit);
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);
  const [value, setValue] = useState(props.value);
  const initialValue = value ?? props.initialValue;
  const evaluatedWeight =
    initialValue && props.exerciseType
      ? Weight.evaluateWeight(initialValue, props.exerciseType, props.settings)
      : undefined;

  return (
    <div>
      <InputNumber2
        tabIndex={props.tabIndex}
        placeholder={props.placeholder}
        allowDot={true}
        allowNegative={true}
        min={props.min}
        max={props.max}
        keyboardAddon={
          ((props.subscription && Subscriptions.hasSubscription(props.subscription)) || props.addOn) &&
          props.exerciseType ? (
            <div className="py-2">
              {props.subscription &&
                Subscriptions.hasSubscription(props.subscription) &&
                evaluatedWeight &&
                Weight.is(evaluatedWeight) && (
                  <PlatesCalculator
                    weight={evaluatedWeight}
                    settings={props.settings}
                    exerciseType={props.exerciseType}
                  />
                )}
              {props.addOn ? <div>{props.addOn()}</div> : undefined}
            </div>
          ) : undefined
        }
        onNext={(current) => {
          if (unit === "%") {
            return current != null ? current + 1 : 0;
          } else {
            const weight = current != null ? Weight.build(current, unit) : Weight.build(0, unit);
            const newWeight = Weight.increment(weight, props.settings, props.exerciseType);
            return newWeight.value;
          }
        }}
        onPrev={(current) => {
          if (unit === "%") {
            return current != null ? current - 1 : 0;
          } else {
            const weight = current != null ? Weight.build(current, unit) : Weight.build(0, unit);
            const newWeight = Weight.decrement(weight, props.settings, props.exerciseType);
            return newWeight.value;
          }
        }}
        value={props.value?.value}
        initialValue={props.initialValue?.value}
        name={props.name}
        enableUnits={props.units}
        selectedUnit={unit}
        onChangeUnits={(newUnit) => {
          setUnit(newUnit);
          const weight = props.value != null ? Weight.buildAny(props.value.value, newUnit) : undefined;
          setValue(weight);
          if (props.onInput) {
            props.onInput(weight);
          }
        }}
        enableCalculator={true}
        onBlur={(value) => {
          if (props.onBlur) {
            const weight = value != null ? Weight.buildAny(value, unitRef.current) : undefined;
            props.onBlur(weight);
          }
        }}
        onInput={(newValue) => {
          const weight = newValue != null ? Weight.buildAny(newValue, unitRef.current) : undefined;
          setValue(weight);
          if (props.onInput) {
            props.onInput(weight);
          }
        }}
      />
    </div>
  );
}

interface IPlatesCalculatorProps {
  weight: IWeight;
  settings: ISettings;
  exerciseType: IExerciseType;
}

function PlatesCalculator(props: IPlatesCalculatorProps): JSX.Element {
  const { plates, totalWeight: weight } = Weight.calculatePlates(
    props.weight,
    props.settings,
    props.weight.unit,
    props.exerciseType
  );
  return (
    <div className="flex items-center w-full gap-1 text-xs text-grayv3-main">
      <div>
        <IconBarbellSide size={13} color={Tailwind.colors().bluev3.main} />
      </div>
      <div>
        <span>Plates: </span>
        <span className="break-all">
          <span
            className={`font-semibold ${Weight.eq(weight, props.weight) ? "text-blackv2" : "text-redv2-600"}`}
            data-cy="plates-list"
          >
            {plates.length > 0 ? Weight.formatOneSide(props.settings, plates, props.exerciseType) : "None"}
          </span>
        </span>
      </div>
    </div>
  );
}
