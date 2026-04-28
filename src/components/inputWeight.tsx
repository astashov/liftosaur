import { JSX, useEffect, useState } from "react";
import { View, Pressable, TextInput } from "react-native";
import { Text } from "./primitives/text";
import { Weight_buildPct, Weight_build, Weight_decrement, Weight_increment } from "../models/weight";
import { IExerciseType, IPercentage, ISettings, IUnit, IWeight } from "../types";
import { IconCalculator } from "./icons/iconCalculator";
import { useModal } from "../navigation/ModalStateContext";
import { StringUtils_dashcase } from "../utils/string";

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
  const [text, setText] = useState(String(props.value.value));
  const [unit, setUnit] = useState<IUnit | "%">(props.value.unit);
  const testId = props["data-cy"] || `input-${StringUtils_dashcase(props.label || "")}`;
  const availableUnits = props.units ?? (["kg", "lb", "%"] as const);

  useEffect(() => {
    setText(String(props.value.value));
    setUnit(props.value.unit);
  }, [props.value.value, props.value.unit]);

  function buildWeight(v: number, u: IUnit | "%"): IWeight | IPercentage {
    return u === "%" ? Weight_buildPct(v) : Weight_build(v, u);
  }

  function getValue(): IWeight | IPercentage | undefined {
    const v = Number(text);
    if (isNaN(v)) {
      return undefined;
    }
    return buildWeight(v, unit);
  }

  const openCalculator = useModal("repMaxCalculatorModal", (weightValue) => {
    if (weightValue != null && unit !== "%") {
      const w = Weight_build(weightValue, unit as IUnit);
      setText(String(w.value));
      props.onUpdate(w);
    }
  });

  return (
    <View className="w-full">
      {props.label && <Text className="mb-1 text-xs text-text-secondary">{props.label}</Text>}
      <View className="flex-row items-center gap-2">
        <Pressable
          className="items-center justify-center w-10 h-10 border rounded-lg bg-background-purpledark border-border-neutral"
          data-cy="edit-weight-minus" data-testid="edit-weight-minus"
          testID="edit-weight-minus"
          onPress={() => {
            const value = getValue();
            if (value) {
              if (value.unit === "%") {
                const newValue = Weight_buildPct(value.value - 1);
                setText(String(newValue.value));
                props.onUpdate(newValue);
              } else {
                const newWeight = Weight_decrement(value, props.settings, props.exerciseType);
                setText(String(newWeight.value));
                props.onUpdate(newWeight);
              }
            }
          }}
        >
          <Text className="text-xl font-bold leading-none">-</Text>
        </Pressable>
        <View className="flex-row items-center flex-1 gap-2">
          <View className="flex-1">
            <TextInput
              className="w-full px-4 py-2 text-base border rounded-lg bg-background-default border-border-prominent"
              keyboardType="numeric"
              value={text}
              data-cy={testId} data-testid={testId}
              testID={testId}
              onChangeText={setText}
              onBlur={() => {
                const value = getValue();
                if (value != null) {
                  props.onUpdate(value);
                }
              }}
              selectTextOnFocus
            />
          </View>
          <View className="flex-row gap-1">
            {availableUnits.map((u) => (
              <Pressable
                key={u}
                data-cy={`edit-weight-unit-${u}`} data-testid={`edit-weight-unit-${u}`}
                testID={`edit-weight-unit-${u}`}
                className={`px-2 py-1 border rounded ${u === unit ? "border-border-prominent bg-background-cardpurpleselected" : "border-border-neutral bg-background-default"}`}
                onPress={() => {
                  setUnit(u);
                  const v = Number(text);
                  if (!isNaN(v)) {
                    props.onUpdate(buildWeight(v, u));
                  }
                }}
              >
                <Text className="text-sm">{u}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {unit !== "%" && (
          <Pressable
            className="items-center justify-center w-10 h-10 border rounded-lg bg-background-purpledark border-border-neutral"
            data-cy="edit-weight-calculator" data-testid="edit-weight-calculator"
            testID="edit-weight-calculator"
            onPress={() => openCalculator({ unit: unit as IUnit })}
          >
            <IconCalculator size={16} />
          </Pressable>
        )}
        <Pressable
          className="items-center justify-center w-10 h-10 border rounded-lg bg-background-purpledark border-border-neutral"
          data-cy="edit-weight-plus" data-testid="edit-weight-plus"
          testID="edit-weight-plus"
          onPress={() => {
            const value = getValue();
            if (value) {
              if (value.unit === "%") {
                const newValue = Weight_buildPct(value.value + 1);
                setText(String(newValue.value));
                props.onUpdate(newValue);
              } else {
                const newWeight = Weight_increment(value, props.settings, props.exerciseType);
                setText(String(newWeight.value));
                props.onUpdate(newWeight);
              }
            }
          }}
        >
          <Text className="text-xl font-bold leading-none">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
