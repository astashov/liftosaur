import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { useModal } from "../navigation/ModalStateContext";

interface IInputSelectProps<T extends string> {
  name: string;
  label?: string;
  placeholder?: string;
  expandValue?: boolean;
  hint?: string;
  disabled?: boolean;
  value?: T;
  values?: [T, string][];
  onChange?: (v?: T) => void;
}

export function InputSelect<T extends string>(props: IInputSelectProps<T>): JSX.Element {
  if (props.label != null) {
    return (
      <View className="flex-row items-center gap-4">
        <View className={!props.expandValue ? "flex-1" : ""}>
          <Text className="text-sm">{props.label}</Text>
        </View>
        <View className="flex-1">
          <InputSelectValue {...props} />
        </View>
      </View>
    );
  } else {
    return <InputSelectValue {...props} />;
  }
}

export function InputSelectValue<T extends string>(props: IInputSelectProps<T>): JSX.Element {
  const selectedLabel = props.values?.find((v) => v[0] === props.value)?.[1];

  const openModal = useModal("inputSelectModal", (value) => {
    if (props.onChange) {
      props.onChange(value === "" ? undefined : (value as T));
    }
  });

  return (
    <Pressable
      data-cy={`select-${props.name}`} data-testid={`select-${props.name}`}
      testID={`select-${props.name}`}
      className="flex-row items-center w-full gap-2 p-2 border rounded bg-background-default border-border-neutral"
      onPress={() => {
        if (!props.disabled && props.values && props.values.length > 0) {
          openModal({
            name: props.name,
            values: props.values,
            hint: props.hint,
            selectedValue: props.value,
            placeholder: props.placeholder,
          });
        }
      }}
    >
      <View className="flex-1">
        {selectedLabel != null ? (
          <Text className="text-sm">{selectedLabel}</Text>
        ) : (
          <Text className="text-sm text-text-secondary">{props.placeholder}</Text>
        )}
      </View>
      <View>
        <IconArrowDown2 />
      </View>
    </Pressable>
  );
}
