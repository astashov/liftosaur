import { JSX, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { IExerciseType, IPercentage, IPercentageUnit, ISettings, ISubscription, IUnit, IWeight } from "../types";
import { InputNumber2 } from "./inputNumber2";
import {
  Weight_evaluateWeight,
  Weight_is,
  Weight_build,
  Weight_increment,
  Weight_decrement,
  Weight_buildAny,
  Weight_calculatePlates,
  Weight_eq,
  Weight_formatOneSide,
} from "../models/weight";
import { IconBarbellSide } from "./icons/iconBarbellSide";
import { Tailwind } from "../utils/tailwindConfig";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { Equipment_getUnitOrDefaultForExerciseType } from "../models/equipment";

interface IInputWeight2Props {
  value: IWeight | IPercentage | undefined;
  name: string;
  max?: number;
  min?: number;
  autowidth?: boolean;
  width?: number;
  showUnitInside?: boolean;
  placeholder?: string;
  exerciseType?: IExerciseType;
  units?: (IUnit | IPercentageUnit)[];
  initialValue?: IWeight | IPercentage;
  addOn?: () => JSX.Element;
  settings: ISettings;
  after?: () => JSX.Element | undefined;
  onBlur?: (value: IWeight | IPercentage | undefined) => void;
  onInput?: (value: IWeight | IPercentage | undefined) => void;
  subscription?: ISubscription;
  tabIndex?: number;
}

export function InputWeight2(props: IInputWeight2Props): JSX.Element {
  const [unit, setUnit] = useState<IUnit | IPercentageUnit>(
    props.value?.unit ??
      props.initialValue?.unit ??
      Equipment_getUnitOrDefaultForExerciseType(props.settings, props.exerciseType)
  );
  const unitRef = useRef(unit);
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);
  const [value, setValue] = useState(props.value);
  const initialValue = value ?? props.initialValue;
  const evaluatedWeight =
    initialValue && props.exerciseType
      ? Weight_evaluateWeight(initialValue, props.exerciseType, props.settings)
      : undefined;

  return (
    <div>
      <InputNumber2
        width={props.width}
        tabIndex={props.tabIndex}
        placeholder={props.placeholder}
        after={props.after}
        autowidth={props.autowidth}
        allowDot={true}
        allowNegative={true}
        min={props.min}
        max={props.max}
        keyboardAddon={
          (props.subscription && Subscriptions_hasSubscription(props.subscription)) || props.addOn ? (
            <div className="py-2">
              {props.subscription &&
                props.exerciseType &&
                Subscriptions_hasSubscription(props.subscription) &&
                evaluatedWeight &&
                Weight_is(evaluatedWeight) && (
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
            const weight = current != null ? Weight_build(current, unit) : Weight_build(0, unit);
            const newWeight = Weight_increment(weight, props.settings, props.exerciseType);
            return newWeight.value;
          }
        }}
        onPrev={(current) => {
          if (unit === "%") {
            return current != null ? current - 1 : 0;
          } else {
            const weight = current != null ? Weight_build(current, unit) : Weight_build(0, unit);
            const newWeight = Weight_decrement(weight, props.settings, props.exerciseType);
            return newWeight.value;
          }
        }}
        value={props.value?.value}
        initialValue={props.initialValue?.value}
        name={props.name}
        enableUnits={props.units}
        selectedUnit={unit}
        showUnitInside={props.showUnitInside}
        onChangeUnits={(newUnit) => {
          setUnit(newUnit);
          const weight = props.value != null ? Weight_buildAny(props.value.value, newUnit) : undefined;
          setValue(weight);
          if (props.onInput) {
            props.onInput(weight);
          }
        }}
        enableCalculator={true}
        onBlur={(v) => {
          if (props.onBlur) {
            const weight = v != null ? Weight_buildAny(v, unitRef.current) : undefined;
            props.onBlur(weight);
          }
        }}
        onInput={(newValue) => {
          const weight = newValue != null ? Weight_buildAny(newValue, unitRef.current) : undefined;
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
  const { plates, totalWeight: weight } = Weight_calculatePlates(
    props.weight,
    props.settings,
    props.weight.unit,
    props.exerciseType
  );
  return (
    <div className="flex items-center w-full gap-1 text-xs text-text-secondary">
      <div>
        <IconBarbellSide size={13} color={Tailwind.colors().blue[400]} />
      </div>
      <div>
        <span>Plates: </span>
        <span className="break-all">
          <span
            className={`font-semibold ${Weight_eq(weight, props.weight) ? "text-text-primary" : "text-text-error"}`}
            data-cy="plates-list"
          >
            {plates.length > 0 ? Weight_formatOneSide(props.settings, plates, props.exerciseType) : "None"}
          </span>
        </span>
      </div>
    </div>
  );
}
