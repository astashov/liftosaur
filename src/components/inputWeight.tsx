import { useState } from "react";
import { Weight } from "../models/weight";
import { IExerciseType, IPercentage, ISettings, IUnit, IWeight } from "../types";
import { IconCalculator } from "./icons/iconCalculator";
import { Input } from "./input";
import { LftModal } from "./modal";
import { RepMaxCalculator } from "./repMaxCalculator";
import { LftText } from "./lftText";
import { View, TouchableOpacity } from "react-native";
import RNPickerSelect from "react-native-picker-select";
import { IconArrowDown2 } from "./icons/iconArrowDown2";

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
  const [value, setValue] = useState(props.value);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const unit = value.unit;

  return (
    <View className="w-full">
      <View className="flex flex-row items-center gap-2">
        <View>
          <TouchableOpacity
            className="items-center justify-center w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-minus"
            data-cy="edit-weight-minus"
            onPress={() => {
              if (unit === "%") {
                const newValue = Weight.buildPct(Math.max(0, value.value - 1));
                setValue(newValue);
                props.onUpdate(newValue);
              } else {
                const newWeight = Weight.decrement(value, props.settings, props.exerciseType);
                setValue(newWeight);
                props.onUpdate(newWeight);
              }
            }}
          >
            <LftText className="text-xl font-bold leading-6">-</LftText>
          </TouchableOpacity>
        </View>
        <View className="flex flex-row items-center justify-center flex-1 gap-2">
          <View className="flex-1">
            <Input
              label={props.label}
              labelSize="xs"
              data-cy={props["data-cy"]}
              inputSize="sm"
              step="0.01"
              type="number"
              value={`${props.value.value}`}
              changeHandler={(v) => {
                if (v.success) {
                  const num = parseFloat(v.data);
                  if (num != null && !isNaN(num)) {
                    const newValue = unit === "%" ? Weight.buildPct(num) : Weight.build(num, value.unit);
                    setValue(newValue);
                    props.onUpdate(value);
                  }
                }
              }}
            />
          </View>
          <View className="flex-row items-center gap-2">
            <RNPickerSelect
              value={unit}
              onValueChange={(newUnit) => {
                if (newUnit != null) {
                  const newValue = Weight.build(value.value, newUnit);
                  setValue(newValue);
                  props.onUpdate(newValue);
                }
              }}
              items={["%", "lb", "kg"].map((u) => ({ label: u, value: u }))}
              Icon={() => <IconArrowDown2 />}
              placeholder={{}}
              style={{
                iconContainer: {
                  position: "static",
                  width: 13,
                },
                viewContainer: {
                  alignItems: "center",
                  flexDirection: "row",
                },
                inputWeb: {
                  textAlign: "right",
                },
                inputIOS: {
                  width: 16,
                },
                inputIOSContainer: {
                  flexDirection: "row",
                  gap: 4,
                  alignItems: "center",
                  pointerEvents: "none",
                },
              }}
            />
          </View>
        </View>
        {unit !== "%" && (
          <View>
            <TouchableOpacity
              className="items-center justify-center w-10 h-10 p-2 leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-calc"
              data-cy="edit-weight-calculator"
              onPress={() => {
                setIsCalculatorOpen(true);
              }}
            >
              <IconCalculator className="inline-block" size={16} />
            </TouchableOpacity>
          </View>
        )}
        <View>
          <TouchableOpacity
            className="items-center justify-center w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-plus"
            data-cy="edit-weight-plus"
            onPress={() => {
              if (unit === "%") {
                const newValue = Weight.buildPct(value.value + 1);
                setValue(newValue);
                props.onUpdate(newValue);
              } else {
                const newWeight = Weight.increment(value, props.settings, props.exerciseType);
                setValue(newWeight);
                props.onUpdate(newWeight);
              }
            }}
          >
            <LftText className="text-xl font-bold leading-6">+</LftText>
          </TouchableOpacity>
        </View>
      </View>
      {isCalculatorOpen && unit !== "%" && (
        <LftModal shouldShowClose={true} onClose={() => setIsCalculatorOpen(false)} isFullWidth={true}>
          <View data-cy="modal-rep-max-calculator">
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
          </View>
        </LftModal>
      )}
    </View>
  );
}
