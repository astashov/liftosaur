import { useState } from "react";
import { View } from "react-native";
import { Weight } from "../models/weight";
import { IUnit } from "../types";
import { SendMessage } from "../utils/sendMessage";
import { Button } from "./button";
import { Input, IValidationError } from "./input";
import { LftText } from "./lftText";
import { IEither } from "../utils/types";

interface IRepMaxCalculatorProps {
  unit: IUnit;
  backLabel: string;
  onSelect: (weight?: number) => void;
}

export function RepMaxCalculator(props: IRepMaxCalculatorProps): JSX.Element {
  const [knownRepsValue, setKnownRepsValue] = useState<number>(5);
  const [knownRpeValue, setKnownRpeValue] = useState<number>(10);
  const [knownWeightValue, setKnownWeightValue] = useState<number>(200);
  const [targetRepsValue, setTargetRepsValue] = useState<number>(1);
  const [targetRpeValue, setTargetRpeValue] = useState<number>(10);

  function generateOnChange(
    type: "int" | "float",
    min: number,
    max: number,
    setter: (v: number) => void
  ): (e: IEither<string, Set<IValidationError>>) => void {
    return (e) => {
      if (e.success) {
        const value = e.data;
        const raw = type === "int" ? parseInt(value, 10) : parseFloat(value);
        const val = isNaN(raw) ? 1 : raw;
        setter(Math.min(Math.max(val, min), max));
      }
    };
  }

  const weight = Weight.calculateRepMax(
    knownRepsValue,
    knownRpeValue,
    knownWeightValue,
    targetRepsValue,
    targetRpeValue
  );

  return (
    <View>
      <LftText className="mb-4 text-xl font-bold text-center">Rep Max Calculator</LftText>
      <LftText className="mb-2">Enter the weight you lift for number of reps and RPE. For Rep Max, use 10 RPE.</LftText>
      <View className="flex flex-row items-center mb-4" style={{ gap: 8 }}>
        <View style={{ minWidth: 48 }}>
          <Input
            type="tel"
            label="Reps"
            data-cy="rep-max-calculator-known-reps"
            value={knownRepsValue}
            maxLength={2}
            min={1}
            max={24}
            changeHandler={generateOnChange("int", 1, 24, setKnownRepsValue)}
          />
        </View>
        <LftText>@</LftText>
        <View style={{ minWidth: 48 }}>
          <Input
            type={SendMessage.isIos() ? "number" : "tel"}
            label="RPE"
            value={knownRpeValue}
            maxLength={4}
            data-cy="rep-max-calculator-known-rpe"
            changeHandler={generateOnChange("float", 1, 10, setKnownRpeValue)}
            min={1}
            max={10}
            step={0.5}
          />
        </View>
        <LftText>x</LftText>
        <View style={{ minWidth: 80 }}>
          <Input
            type="number"
            label="Weight"
            data-cy="rep-max-calculator-known-weight"
            value={knownWeightValue}
            changeHandler={generateOnChange("float", 1, 9999, setKnownWeightValue)}
            maxLength={8}
            max={99999}
            min={0}
          />
        </View>
        <LftText>{props.unit}</LftText>
      </View>
      <LftText className="mb-2">Now enter the Reps & RPE you want to find out your weight for:</LftText>
      <View className="flex flex-row items-center mb-4" style={{ gap: 8 }}>
        <View style={{ minWidth: 64 }}>
          <Input
            type="tel"
            data-cy="rep-max-calculator-target-reps"
            value={targetRepsValue}
            label="Reps"
            changeHandler={generateOnChange("int", 1, 24, setTargetRepsValue)}
          />
        </View>
        <LftText>@</LftText>
        <View style={{ minWidth: 64 }}>
          <Input
            type={SendMessage.isIos() ? "number" : "tel"}
            data-cy="rep-max-calculator-target-rpe"
            label="RPE"
            value={targetRpeValue}
            changeHandler={generateOnChange("float", 1, 10, setTargetRpeValue)}
          />
        </View>
        <LftText>=</LftText>
        <LftText className="text-lg font-bold whitespace-no-wrap" data-cy="rep-max-calculator-target-weight">
          {weight} {props.unit}
        </LftText>
      </View>
      <View className="flex flex-row" style={{ gap: 8 }}>
        <View className="flex-1 text-center">
          <Button
            name="rep-max-calculator-back"
            kind="grayv2"
            onClick={() => props.onSelect()}
            data-cy="rep-max-calculator-back"
          >
            {props.backLabel}
          </Button>
        </View>
        <View className="flex-1 text-center">
          <Button
            name="rep-max-calculator-submit"
            kind="orange"
            data-cy="rep-max-calculator-submit"
            onClick={() => props.onSelect(weight)}
          >
            Use it!
          </Button>
        </View>
      </View>
    </View>
  );
}
