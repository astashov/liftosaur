import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Weight_calculateRepMax } from "../models/weight";
import { IUnit } from "../types";
import { Button } from "./button";
import { Input } from "./input";

interface IRepMaxCalculatorProps {
  unit: IUnit;
  backLabel: string;
  onSelect: (weight?: number) => void;
}

export function RepMaxCalculator(props: IRepMaxCalculatorProps): JSX.Element {
  const [knownReps, setKnownReps] = useState<string>("5");
  const [knownRpe, setKnownRpe] = useState<string>("10");
  const [knownWeight, setKnownWeight] = useState<string>("200");
  const [targetReps, setTargetReps] = useState<string>("1");
  const [targetRpe, setTargetRpe] = useState<string>("10");

  function parseAndClamp(raw: string, type: "int" | "float", min: number, max: number): number {
    const num = type === "int" ? parseInt(raw, 10) : parseFloat(raw);
    const val = isNaN(num) ? 1 : num;
    return Math.min(Math.max(val, min), max);
  }

  const weight = Weight_calculateRepMax(
    parseAndClamp(knownReps, "int", 1, 24),
    parseAndClamp(knownRpe, "float", 1, 10),
    parseAndClamp(knownWeight, "float", 1, 9999),
    parseAndClamp(targetReps, "int", 1, 24),
    parseAndClamp(targetRpe, "float", 1, 10)
  );

  return (
    <View>
      <Text className="mb-4 text-xl font-bold text-center">Rep Max Calculator</Text>
      <Text className="mb-2">Enter the weight you lift for number of reps and RPE. For Rep Max, use 10 RPE.</Text>
      <View className="flex-row items-center mb-4 gap-2">
        <View className="flex-1">
          <Input
            type="number"
            label="Reps"
            data-testid="rep-max-calculator-known-reps"
            testID="rep-max-calculator-known-reps"
            identifier="rep-max-calculator-known-reps"
            value={knownReps}
            maxLength={2}
            min={1}
            max={24}
            changeType="oninput"
            changeHandler={(e) => {
              if (e.success) {
                setKnownReps(e.data);
              }
            }}
          />
        </View>
        <Text>@</Text>
        <View className="flex-1">
          <Input
            type="number"
            label="RPE"
            value={knownRpe}
            maxLength={4}
            data-testid="rep-max-calculator-known-rpe"
            testID="rep-max-calculator-known-rpe"
            identifier="rep-max-calculator-known-rpe"
            min={1}
            max={10}
            step="0.5"
            changeType="oninput"
            changeHandler={(e) => {
              if (e.success) {
                setKnownRpe(e.data);
              }
            }}
          />
        </View>
        <Text>x</Text>
        <View className="flex-1">
          <Input
            type="number"
            label="Weight"
            data-testid="rep-max-calculator-known-weight"
            testID="rep-max-calculator-known-weight"
            identifier="rep-max-calculator-known-weight"
            value={knownWeight}
            maxLength={8}
            max={99999}
            min={0}
            changeType="oninput"
            changeHandler={(e) => {
              if (e.success) {
                setKnownWeight(e.data);
              }
            }}
          />
        </View>
        <Text>{props.unit}</Text>
      </View>
      <Text className="mb-2">Now enter the Reps & RPE you want to find out your weight for:</Text>
      <View className="flex-row items-center mb-4 gap-2">
        <View className="flex-1">
          <Input
            type="number"
            data-testid="rep-max-calculator-target-reps"
            testID="rep-max-calculator-target-reps"
            identifier="rep-max-calculator-target-reps"
            value={targetReps}
            label="Reps"
            min={1}
            max={24}
            changeType="oninput"
            changeHandler={(e) => {
              if (e.success) {
                setTargetReps(e.data);
              }
            }}
          />
        </View>
        <Text>@</Text>
        <View className="flex-1">
          <Input
            type="number"
            data-testid="rep-max-calculator-target-rpe"
            testID="rep-max-calculator-target-rpe"
            identifier="rep-max-calculator-target-rpe"
            label="RPE"
            value={targetRpe}
            min={1}
            max={10}
            step="0.5"
            changeType="oninput"
            changeHandler={(e) => {
              if (e.success) {
                setTargetRpe(e.data);
              }
            }}
          />
        </View>
        <Text>=</Text>
        <View
          className="flex-1"
          data-testid="rep-max-calculator-target-weight"
          testID="rep-max-calculator-target-weight"
        >
          <Text className="text-lg font-bold">
            {weight} {props.unit}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1 items-center">
          <Button
            name="rep-max-calculator-back"
            kind="grayv2"
            onClick={() => props.onSelect()}
            data-testid="rep-max-calculator-back"
            testID="rep-max-calculator-back"
          >
            {props.backLabel}
          </Button>
        </View>
        <View className="flex-1 items-center">
          <Button
            name="rep-max-calculator-submit"
            kind="purple"
            data-testid="rep-max-calculator-submit"
            testID="rep-max-calculator-submit"
            onClick={() => props.onSelect(weight)}
          >
            Use it!
          </Button>
        </View>
      </View>
    </View>
  );
}
