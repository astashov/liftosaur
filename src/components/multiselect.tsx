import { JSX, useState } from "react";
import { View, Pressable, TextInput, ScrollView } from "react-native";
import { Text } from "./primitives/text";
import { StringUtils_dashcase } from "../utils/string";

interface IMultiselectProps {
  readonly values: Readonly<string[]>;
  readonly label: string;
  readonly id: string;
  readonly initialSelectedValues?: Set<string>;
  readonly placeholder?: string;
  onChange: (values: Set<string>) => void;
}

export function Multiselect(props: IMultiselectProps): JSX.Element {
  const [selectedValues, setSelectedValues] = useState(props.initialSelectedValues || new Set<string>());
  const [showValuesList, setShowValuesList] = useState(false);
  const [filter, setFilter] = useState("");

  const valuesSet = new Set(props.values);
  const filteredValues = Array.from(valuesSet).filter(
    (v) => v.toLowerCase().includes(filter.toLowerCase()) && !selectedValues.has(v)
  );

  return (
    <View>
      {props.label ? (
        <View>
          <Text className="block text-sm font-bold">{props.label}</Text>
        </View>
      ) : null}
      <View className="relative z-20">
        <TextInput
          data-cy={`multiselect-${props.id}`}
          testID={`multiselect-${props.id}`}
          placeholder={props.placeholder}
          value={filter}
          className="px-4 py-2 text-base border rounded-lg bg-background-default border-border-prominent"
          onFocus={() => setShowValuesList(true)}
          onBlur={() => {
            setTimeout(() => setShowValuesList(false), 150);
          }}
          onChangeText={(value) => setFilter(value)}
        />
        {showValuesList && filteredValues.length > 0 && (
          <View
            className="absolute left-0 right-0 border rounded-lg shadow-sm bg-background-default border-border-neutral"
            style={{ top: "100%" }}
          >
            <ScrollView className="max-h-48" keyboardShouldPersistTaps="always" nestedScrollEnabled={true}>
              {filteredValues.map((value) => (
                <Pressable
                  key={value}
                  data-cy={`multiselect-option-${StringUtils_dashcase(value)}`}
                  testID={`multiselect-option-${StringUtils_dashcase(value)}`}
                  onPress={() => {
                    const newValues = new Set([...selectedValues, value]);
                    setSelectedValues(newValues);
                    setShowValuesList(false);
                    setFilter("");
                    props.onChange(newValues);
                  }}
                  className="px-4 py-2 border-b border-border-neutral"
                >
                  <Text className="text-base text-text-primary">{value}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      {selectedValues.size > 0 && (
        <View className="flex-row flex-wrap mt-1">
          {Array.from(selectedValues).map((sm) => (
            <Pressable
              key={sm}
              className="flex-row items-center px-2 py-1 mb-1 mr-1 rounded-full nm-multiselect bg-background-neutral"
              onPress={() => {
                const set = new Set(selectedValues);
                set.delete(sm);
                setSelectedValues(set);
                props.onChange(set);
              }}
            >
              <Text className="text-xs">{sm}</Text>
              <Text className="ml-1 text-xs">×</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
