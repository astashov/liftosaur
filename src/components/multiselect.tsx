import { useState, useRef } from "react";
import { View, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { StringUtils } from "../utils/string";
import { inputClassName } from "./input";
import { LftText } from "./lftText";

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
  const valuesSet = new Set(props.values);
  const input = useRef<TextInput>(null);
  const [showValuesList, setShowValuesList] = useState(false);
  const [filter, setFilter] = useState("");

  const filteredValues = Array.from(valuesSet).filter(
    (v) => v.toLowerCase().includes(filter.toLowerCase()) && !selectedValues.has(v)
  );

  return (
    <View>
      {showValuesList && (
        <TouchableOpacity
          className="fixed inset-0 z-10"
          onPress={() => {
            setShowValuesList(false);
          }}
        />
      )}
      {props.label && (
        <View>
          <LftText className="block text-sm font-bold">{props.label}</LftText>
        </View>
      )}
      <View className="relative">
        <TextInput
          className={inputClassName}
          ref={input}
          data-cy={`multiselect-${props.id}`}
          placeholder={props.placeholder}
          value={filter}
          onFocus={() => setShowValuesList(true)}
          onChangeText={(value) => {
            setFilter(value);
          }}
        />
        {showValuesList && filteredValues.length > 0 && (
          <ScrollView
            className="absolute z-20 overflow-y-auto bg-white border-t border-l border-r shadow-sm border-grayv2-400"
            style={{ top: 30, left: 0, width: 100, height: 100 }}
          >
            {filteredValues.map((value) => {
              return (
                <TouchableOpacity
                  data-cy={`multiselect-option-${StringUtils.dashcase(value)}`}
                  onPress={() => {
                    const newValues = new Set([...selectedValues, value]);
                    setSelectedValues(newValues);
                    setShowValuesList(false);
                    setFilter("");
                    props.onChange(newValues);
                  }}
                  className="relative z-30 block w-full px-4 py-2 text-left border-b cursor-pointer border-grayv2-400 hover:bg-grayv2-100"
                >
                  <LftText>{value}</LftText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
      <View className="flex flex-row flex-wrap mt-1">
        {Array.from(selectedValues).map((sm) => (
          <View className="flex flex-row items-center px-2 mb-1 mr-1 text-xs bg-gray-300 rounded-full">
            <LftText className="py-1 pl-1">{sm} </LftText>
            <TouchableOpacity
              className="p-1 nm-multiselect"
              onPress={(e) => {
                e.preventDefault();
                const set = new Set(selectedValues);
                set.delete(sm);
                setSelectedValues(set);
                props.onChange(set);
              }}
            >
              <LftText className="inline-block" style={{ transform: [{ rotate: "45deg" }] }}>
                +
              </LftText>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}
