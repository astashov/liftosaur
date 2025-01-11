/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { MathUtils } from "../utils/math";
import { StringUtils } from "../utils/string";
import { Input } from "./input";
import { LftText } from "./lftText";
import { TouchableOpacity, View } from "react-native";

interface IInputNumberProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "ref"> {
  value?: number;
  label?: string;
  step?: number;
  min?: number;
  max?: number;
  onUpdate: (value: number) => void;
}

export function InputNumber(props: IInputNumberProps): JSX.Element {
  const { label, step, min, max, onUpdate, ...rest } = props;
  const [value, setValue] = useState(props.value);
  const actualStep = step ?? 1;

  return (
    <View className="w-full">
      <View className="flex flex-row items-center gap-2">
        <View>
          <TouchableOpacity
            className="flex-row items-center justify-center w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-minus"
            data-cy={`input-${StringUtils.dashcase(props.label || "")}-minus`}
            onPress={() => {
              if (value != null) {
                const newValue = MathUtils.clamp(value - actualStep, min, max);
                setValue(newValue);
                onUpdate(newValue);
              }
            }}
          >
            <LftText className="text-xl font-bold leading-6">-</LftText>
          </TouchableOpacity>
        </View>
        <View className="flex flex-row items-center flex-1 gap-2">
          <View className="flex-1">
            <Input
              label={label}
              labelSize="xs"
              inputSize="sm"
              step="0.01"
              type="number"
              value={value}
              data-cy={`input-${StringUtils.dashcase(props.label || "")}-field`}
              changeHandler={(e) => {
                if (e.success) {
                  const data = Number(e.data);
                  if (data != null && !isNaN(data)) {
                    setValue(data);
                    onUpdate(data);
                  }
                }
              }}
              {...(rest as any)}
            />
          </View>
        </View>
        <View>
          <TouchableOpacity
            className="items-center justify-center w-10 h-10 p-2 text-xl font-bold leading-none border rounded-lg bg-purplev2-100 border-grayv2-200 nm-weight-plus"
            data-cy={`input-${StringUtils.dashcase(props.label || "")}-plus`}
            onPress={() => {
              if (value != null) {
                const newValue = MathUtils.clamp(value + actualStep, min, max);
                setValue(newValue);
                onUpdate(newValue);
              }
            }}
          >
            <LftText className="text-xl font-bold leading-6">+</LftText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
