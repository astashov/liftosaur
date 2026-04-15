import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { ObjectUtils_entries } from "../../utils/object";

interface IProps<T extends string> {
  values: Record<T, IFilterValue>;
  onSelect: (key: T) => void;
}

export type IFilterValue = { label: string; isSelected: boolean; disabledReason?: string };

export function ExercisePickerOptions<T extends string>(props: IProps<T>): JSX.Element {
  return (
    <View className="flex-row flex-wrap mt-2" style={{ gap: 16 }}>
      {ObjectUtils_entries(props.values).map(([key, value]) => {
        return (
          <View key={key} style={{ width: "47%" }}>
            <Pressable
              className={`items-center justify-center h-12 px-2 rounded-lg bg-background-subtle ${
                value.isSelected ? "border-text-purple" : "border-border-neutral"
              }`}
              style={{ borderWidth: value.isSelected ? 2 : 1 }}
              disabled={!!value.disabledReason}
              onPress={() => {
                props.onSelect(key);
              }}
            >
              <Text
                className={`text-center ${
                  value.disabledReason
                    ? "text-border-neutral"
                    : value.isSelected
                      ? "text-text-purple"
                      : "text-text-primary"
                }`}
              >
                {value.label}
              </Text>
            </Pressable>
            {value.disabledReason && <Text className="text-xs text-text-secondary">{value.disabledReason}</Text>}
          </View>
        );
      })}
    </View>
  );
}
