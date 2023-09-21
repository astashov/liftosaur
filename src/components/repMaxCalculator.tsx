import { JSX, h } from "preact";
import { useState } from "preact/hooks";
import { Weight } from "../models/weight";
import { IUnit } from "../types";
import { SendMessage } from "../utils/sendMessage";
import { Button } from "./button";
import { Input } from "./input";

interface IRepMaxCalculatorProps {
  unit: IUnit;
  backLabel: string;
  onSelect: (weight?: number) => void;
}

function calculateWeight(
  knownReps: number,
  knownRpe: number,
  knownWeight: number,
  targetReps: number,
  targetRpe: number
): number {
  const knownRpeMultiplier = Weight.rpeMultiplier(knownReps, knownRpe);
  const onerm = knownWeight / knownRpeMultiplier;
  const targetRpeMultiplier = Weight.rpeMultiplier(targetReps, targetRpe);
  return Math.round(onerm * targetRpeMultiplier);
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
  ): (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) => void {
    return (e: JSX.TargetedEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = e.target;
      if (target instanceof HTMLInputElement) {
        const value = target.value;
        const raw = type === "int" ? parseInt(value, 10) : parseFloat(value);
        const val = isNaN(raw) ? 1 : raw;
        setter(Math.min(Math.max(val, min), max));
      }
    };
  }

  const weight = calculateWeight(knownRepsValue, knownRpeValue, knownWeightValue, targetRepsValue, targetRpeValue);

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-center">Rep Max Calculator</h2>
      <p className="mb-2">Enter the weight you lift for number of reps and RPE. For Rep Max, use 10 RPE.</p>
      <div className="flex items-center mb-4" style={{ gap: "0.5rem" }}>
        <div style={{ minWidth: "3rem" }}>
          <Input
            type="tel"
            label="Reps"
            value={knownRepsValue}
            maxLength={2}
            min={1}
            max={24}
            onBlur={generateOnChange("int", 1, 24, setKnownRepsValue)}
          />
        </div>
        <div>@</div>
        <div style={{ minWidth: "3rem" }}>
          <Input
            type={SendMessage.isIos() ? "number" : "tel"}
            label="RPE"
            defaultValue="10"
            maxLength={4}
            onBlur={generateOnChange("float", 1, 10, setKnownRpeValue)}
            min={1}
            max={10}
            step={0.5}
          />
        </div>
        <div>x</div>
        <div style={{ minWidth: "5rem" }}>
          <Input
            type="number"
            label="Weight"
            defaultValue="200"
            onBlur={generateOnChange("float", 1, 9999, setKnownWeightValue)}
            maxLength={8}
            max={99999}
            min={0}
          />
        </div>
        <div>{props.unit}</div>
      </div>
      <p className="mb-2">Now enter the Reps & RPE you want to find out your weight for:</p>
      <div className="flex items-center mb-4" style={{ gap: "0.5rem" }}>
        <div style={{ minWidth: "4rem" }}>
          <Input type="tel" label="Reps" defaultValue="1" onBlur={generateOnChange("int", 1, 24, setTargetRepsValue)} />
        </div>
        <div>@</div>
        <div style={{ minWidth: "4rem" }}>
          <Input
            type={SendMessage.isIos() ? "number" : "tel"}
            label="RPE"
            defaultValue="10"
            onBlur={generateOnChange("float", 1, 10, setTargetRpeValue)}
          />
        </div>
        <div>=</div>
        <div className="text-lg font-bold whitespace-no-wrap">
          {weight} {props.unit}
        </div>
      </div>
      <div className="flex" style={{ gap: "0.5rem" }}>
        <div className="flex-1 text-center">
          <Button kind="grayv2" onClick={() => props.onSelect()}>
            {props.backLabel}
          </Button>
        </div>
        <div className="flex-1 text-center">
          <Button kind="orange" onClick={() => props.onSelect(weight)}>
            Use it!
          </Button>
        </div>
      </div>
    </div>
  );
}
