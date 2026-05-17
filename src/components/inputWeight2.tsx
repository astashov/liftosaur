import { JSX, memo, useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IExerciseType, IPercentage, IPercentageUnit, ISettings, ISubscription, IUnit, IWeight } from "../types";
import { InputNumber2, IInputCommitMode } from "./inputNumber2";
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
import { Tailwind_colors } from "../utils/tailwindConfig";
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
  inputCommitMode?: IInputCommitMode;
  inputDebounceMs?: number;
  "data-testid"?: string;
  testID?: string;
}

function InputWeight2Inner(props: IInputWeight2Props): JSX.Element {
  const [unit, setUnit] = useState<IUnit | IPercentageUnit>(
    props.value?.unit ??
      props.initialValue?.unit ??
      Equipment_getUnitOrDefaultForExerciseType(props.settings, props.exerciseType)
  );
  const unitRef = useRef(unit);
  unitRef.current = unit;
  const onInputPropRef = useRef(props.onInput);
  const onBlurPropRef = useRef(props.onBlur);
  const settingsRef = useRef(props.settings);
  const exerciseTypeRef = useRef(props.exerciseType);
  const commitModeRef = useRef<IInputCommitMode | undefined>(props.inputCommitMode);
  onInputPropRef.current = props.onInput;
  onBlurPropRef.current = props.onBlur;
  settingsRef.current = props.settings;
  exerciseTypeRef.current = props.exerciseType;
  commitModeRef.current = props.inputCommitMode;

  const [value, setValue] = useState(props.value);
  const draftValueRef = useRef<number | undefined>(props.value?.value);
  draftValueRef.current = value?.value;
  const initialValue = value ?? props.initialValue;
  const evaluatedWeight = useMemo(
    () =>
      initialValue && props.exerciseType
        ? Weight_evaluateWeight(initialValue, props.exerciseType, props.settings)
        : undefined,
    [initialValue, props.exerciseType, props.settings]
  );

  const onNext = useCallback((current: number | undefined): number => {
    const u = unitRef.current;
    if (u === "%") {
      return current != null ? current + 1 : 0;
    }
    const weight = current != null ? Weight_build(current, u) : Weight_build(0, u);
    const newWeight = Weight_increment(weight, settingsRef.current, exerciseTypeRef.current);
    return newWeight.value;
  }, []);

  const onPrev = useCallback((current: number | undefined): number => {
    const u = unitRef.current;
    if (u === "%") {
      return current != null ? current - 1 : 0;
    }
    const weight = current != null ? Weight_build(current, u) : Weight_build(0, u);
    const newWeight = Weight_decrement(weight, settingsRef.current, exerciseTypeRef.current);
    return newWeight.value;
  }, []);

  const onChangeUnits = useCallback((newUnit: IUnit | IPercentageUnit) => {
    setUnit(newUnit);
    const draft = draftValueRef.current;
    const weight = draft != null ? Weight_buildAny(draft, newUnit) : undefined;
    setValue(weight);
    if (commitModeRef.current !== "blur") {
      const cb = onInputPropRef.current;
      if (cb) {
        cb(weight);
      }
    }
  }, []);

  const onBlur = useCallback((v: number | undefined) => {
    draftValueRef.current = v;
    const weight = v != null ? Weight_buildAny(v, unitRef.current) : undefined;
    setValue(weight);
    const cb = onBlurPropRef.current;
    if (cb) {
      cb(weight);
    }
  }, []);

  const onInput = useCallback((newValue: number | undefined) => {
    draftValueRef.current = newValue;
    const weight = newValue != null ? Weight_buildAny(newValue, unitRef.current) : undefined;
    setValue(weight);
    const cb = onInputPropRef.current;
    if (cb) {
      cb(weight);
    }
  }, []);

  const onPreview = useCallback((newValue: number | undefined) => {
    draftValueRef.current = newValue;
    const weight = newValue != null ? Weight_buildAny(newValue, unitRef.current) : undefined;
    setValue(weight);
  }, []);

  const showPlates =
    props.subscription &&
    props.exerciseType &&
    Subscriptions_hasSubscription(props.subscription) &&
    evaluatedWeight &&
    Weight_is(evaluatedWeight);

  const keyboardAddon = useMemo(() => {
    if (!showPlates && !props.addOn) {
      return undefined;
    }
    return (
      <View className="py-2">
        {showPlates && (
          <PlatesCalculator
            weight={evaluatedWeight as IWeight}
            settings={props.settings}
            exerciseType={props.exerciseType!}
          />
        )}
        {props.addOn ? <View>{props.addOn()}</View> : undefined}
      </View>
    );
  }, [showPlates, evaluatedWeight, props.settings, props.exerciseType, props.addOn]);

  return (
    <View>
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
        keyboardAddon={keyboardAddon}
        onNext={onNext}
        onPrev={onPrev}
        value={props.value?.value}
        initialValue={props.initialValue?.value}
        name={props.name}
        enableUnits={props.units}
        selectedUnit={unit}
        showUnitInside={props.showUnitInside}
        onChangeUnits={onChangeUnits}
        enableCalculator={true}
        inputCommitMode={props.inputCommitMode}
        inputDebounceMs={props.inputDebounceMs}
        onBlur={onBlur}
        onInput={onInput}
        onPreview={onPreview}
      />
    </View>
  );
}

export const InputWeight2 = memo(InputWeight2Inner);

interface IPlatesCalculatorProps {
  weight: IWeight;
  settings: ISettings;
  exerciseType: IExerciseType;
}

const PlatesCalculator = memo(function PlatesCalculator(props: IPlatesCalculatorProps): JSX.Element {
  const { plates, totalWeight: weight } = Weight_calculatePlates(
    props.weight,
    props.settings,
    props.weight.unit,
    props.exerciseType
  );
  return (
    <View className="flex-row items-center w-full gap-1">
      <View>
        <IconBarbellSide size={13} color={Tailwind_colors().blue[400]} />
      </View>
      <View>
        <Text className="text-xs text-text-secondary">
          Plates:{" "}
          <Text
            className={`text-xs font-semibold ${Weight_eq(weight, props.weight) ? "text-text-primary" : "text-text-error"}`}
            data-testid="plates-list"
            testID="plates-list"
          >
            {plates.length > 0 ? Weight_formatOneSide(props.settings, plates, props.exerciseType) : "None"}
          </Text>
        </Text>
      </View>
    </View>
  );
});
