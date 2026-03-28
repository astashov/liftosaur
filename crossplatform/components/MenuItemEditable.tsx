import React, { useState } from "react";
import type { JSX } from "react";
import { View, Text, TextInput, Switch, Pressable } from "react-native";

interface IBaseProps {
  name: string;
  subtitle?: JSX.Element;
}

interface IBooleanProps extends IBaseProps {
  type: "boolean";
  value: boolean;
  onChange: (v: boolean) => void;
}

interface ISelectProps extends IBaseProps {
  type: "select";
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}

interface ITextProps extends IBaseProps {
  type: "text";
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}

type IProps = IBooleanProps | ISelectProps | ITextProps;

export function MenuItemEditable(props: IProps): JSX.Element {
  if (props.type === "boolean") {
    return <MenuItemBoolean {...props} />;
  }
  if (props.type === "select") {
    return <MenuItemSelect {...props} />;
  }
  return <MenuItemText {...props} />;
}

function MenuItemBoolean(props: IBooleanProps): JSX.Element {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-border-neutral">
      <View className="flex-1 mr-3">
        <Text className="text-base text-text-primary">{props.name}</Text>
        {props.subtitle}
      </View>
      <Switch value={props.value} onValueChange={props.onChange} />
    </View>
  );
}

function MenuItemSelect(props: ISelectProps): JSX.Element {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-border-neutral">
      <Text className="text-base text-text-primary flex-shrink">{props.name}</Text>
      <View className="flex-row rounded-lg overflow-hidden">
        {props.options.map(([optValue, optLabel]) => {
          const isSelected = optValue === props.value;
          return (
            <Pressable
              key={optValue}
              className={`px-3 py-1.5 rounded-md ml-1 border ${
                isSelected
                  ? "bg-button-primarybackground border-button-primarybackground"
                  : "bg-transparent border-border-neutral"
              }`}
              onPress={() => props.onChange(optValue)}
            >
              <Text className={`text-sm font-medium ${isSelected ? "text-text-alwayswhite" : "text-text-primary"}`}>
                {optLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MenuItemText(props: ITextProps): JSX.Element {
  const [localValue, setLocalValue] = useState(props.value);

  return (
    <View className="flex-row justify-between items-center py-3 border-b border-border-neutral">
      <Text className="text-base text-text-primary mr-2">{props.name}</Text>
      <TextInput
        className="flex-1 text-right text-base text-text-link py-0"
        value={localValue}
        placeholder={props.placeholder}
        onChangeText={setLocalValue}
        onBlur={() => props.onChange(localValue)}
        returnKeyType="done"
      />
    </View>
  );
}
